import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Check,
  RotateCcw,
  AlertCircle,
  Zap,
  ZapOff,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { compressImage } from '../utils/imageCompressor';
import { TaskMedia } from '../types';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (media: TaskMedia) => void;
  title?: string;
  subtitle?: string;
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Live Camera Verification',
  subtitle = 'Capture live inspection proof for cafe operations',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [supportsTorch, setSupportsTorch] = useState<boolean>(false);

  // Play subtle camera shutter sound with Web Audio API
  const playShutterSound = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // AudioContext blocked
    }
  }, []);

  // Stop active camera stream tracks
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      setStream(null);
    }
  }, [stream]);

  // Start camera stream with progressive fallbacks
  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      stopStream();
      setCameraError(null);
      setIsLoadingCamera(true);
      setTorchOn(false);
      setSupportsTorch(false);

      const getMedia =
        navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices) ||
        (navigator as any).getUserMedia?.bind(navigator) ||
        (navigator as any).webkitGetUserMedia?.bind(navigator) ||
        (navigator as any).mozGetUserMedia?.bind(navigator);

      if (!getMedia) {
        setCameraError(
          'Live stream not supported by browser. Tap below to capture with phone camera.'
        );
        setIsLoadingCamera(false);
        return;
      }

      // Check device count for flip button
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === 'videoinput');
          setHasMultipleCameras(videoDevices.length > 1);
        }
      } catch {
        // ignore
      }

      // Candidate constraint sets in order of preference
      const constraintCandidates: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: mode === 'user' ? 'user' : { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        {
          video: {
            facingMode: mode === 'user' ? 'user' : 'environment',
          },
          audio: false,
        },
        {
          video: true,
          audio: false,
        },
      ];

      let acquiredStream: MediaStream | null = null;
      let lastErr: unknown = null;

      for (const constraints of constraintCandidates) {
        try {
          acquiredStream = await getMedia(constraints);
          if (acquiredStream) break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (acquiredStream) {
        setStream(acquiredStream);

        const track = acquiredStream.getVideoTracks()[0];
        if (track) {
          try {
            const capabilities = (track.getCapabilities?.() || {}) as unknown as { torch?: boolean };
            if (capabilities.torch) {
              setSupportsTorch(true);
            }
          } catch {
            // ignore
          }
        }
      } else {
        const error = lastErr as Error;
        console.warn('Camera constraints failed:', error);
        if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
          setCameraError(
            'Camera permission is needed. Tap below to snap live photo directly.'
          );
        } else {
          setCameraError(
            'Live viewfinder initializing. Tap below to snap photo directly.'
          );
        }
        setIsLoadingCamera(false);
      }
    },
    [stopStream]
  );

  // Sync media stream with the video element once mounted
  useEffect(() => {
    if (!stream || !videoRef.current) return;

    const video = videoRef.current;
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.muted = true;

    let isMounted = true;

    const playVideo = async () => {
      try {
        await video.play();
        if (isMounted) setIsLoadingCamera(false);
      } catch (err) {
        console.warn('Video play attempt:', err);
        if (isMounted) setIsLoadingCamera(false);
      }
    };

    video.addEventListener('loadedmetadata', playVideo);
    video.addEventListener('canplay', playVideo);

    if (video.readyState >= 2) {
      playVideo();
    }

    const timer = setTimeout(() => {
      if (isMounted) {
        setIsLoadingCamera(false);
        playVideo();
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      video.removeEventListener('loadedmetadata', playVideo);
      video.removeEventListener('canplay', playVideo);
    };
  }, [stream]);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCameraError(null);
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedImage(null);
    }

    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, facingMode, stopStream]);

  // Flash torch toggle
  const handleToggleTorch = async () => {
    triggerHaptic('light');
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const newTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: newTorch }],
      });
      setTorchOn(newTorch);
    } catch {
      // Torch apply failed
    }
  };

  // Flip front/back camera
  const handleToggleFacingMode = () => {
    triggerHaptic('medium');
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  // Capture Snapshot from Video
  const handleTakeSnapshot = () => {
    triggerHaptic('shutter');
    playShutterSound();

    const video = videoRef.current;

    // If video is not emitting frames yet or error occurred, open native camera directly
    if (!video || !video.videoWidth || video.readyState < 2) {
      nativeCameraInputRef.current?.click();
      return;
    }

    const canvas = canvasRef.current || document.createElement('canvas');
    const maxDim = 1200;
    let vw = video.videoWidth || 1280;
    let vh = video.videoHeight || 720;
    if (vw > maxDim || vh > maxDim) {
      if (vw > vh) {
        vh = Math.round((vh * maxDim) / vw);
        vw = maxDim;
      } else {
        vw = Math.round((vw * maxDim) / vh);
        vh = maxDim;
      }
    }

    canvas.width = vw;
    canvas.height = vh;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Overlay real-time operational timestamp badge on the image itself
    ctx.restore();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const watermark = `AMARII CAFÉ VERIFIED • ${dateStr} ${timeStr}`;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(16, canvas.height - 44, ctx.measureText(watermark).width + 36, 32);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#10B981';
    ctx.fillText(watermark, 26, canvas.height - 23);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(dataUrl);
    stopStream();
  };

  // Confirm photo capture
  const handleConfirmPhoto = async () => {
    triggerHaptic('success');
    if (!capturedImage) return;
    const now = new Date();
    const fileName = `live_cam_${now.toISOString().replace(/[:.]/g, '-')}.jpg`;
    try {
      const compressed = await compressImage(capturedImage, 800, 0.65);
      const mediaItem: TaskMedia = {
        id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'photo',
        url: compressed,
        name: fileName,
        size: `${Math.round((compressed.length * 3) / 4 / 1024)} KB`,
        uploadedAt: new Date().toISOString(),
      };
      onCapture(mediaItem);
    } catch {
      const mediaItem: TaskMedia = {
        id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'photo',
        url: capturedImage,
        name: fileName,
        size: `${Math.round((capturedImage.length * 3) / 4 / 1024)} KB`,
        uploadedAt: new Date().toISOString(),
      };
      onCapture(mediaItem);
    }
    onClose();
  };

  // Retake photo
  const handleRetake = () => {
    triggerHaptic('medium');
    setCapturedImage(null);
    startCamera(facingMode);
  };

  // Direct Device Camera Shutter (Strictly hardware camera capture, NO gallery picker)
  const handleNativeCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic('shutter');
    try {
      const compressedDataUrl = await compressImage(file, 800, 0.65);
      const mediaItem: TaskMedia = {
        id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'photo',
        url: compressedDataUrl,
        name: file.name,
        size: `${Math.round((file.size || (compressedDataUrl.length * 3) / 4) / 1024)} KB`,
        uploadedAt: new Date().toISOString(),
      };
      onCapture(mediaItem);
      stopStream();
      onClose();
    } catch (err) {
      console.warn('Native capture compression fallback:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const mediaItem: TaskMedia = {
            id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            type: 'photo',
            url: dataUrl,
            name: file.name,
            size: `${Math.round((file.size || (dataUrl.length * 3) / 4) / 1024)} KB`,
            uploadedAt: new Date().toISOString(),
          };
          onCapture(mediaItem);
          stopStream();
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Camera Verification"
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <canvas ref={canvasRef} className="hidden" />

      {/* Direct Native Camera Shutter (Strictly camera capture, NO gallery picker) */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNativeCameraCapture}
        className="hidden"
      />

      {/* Camera Top Bar */}
      <div className="w-full max-w-xl flex items-center justify-between px-3 py-2 text-white">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#E05A47] text-white rounded-md shadow-sm">
            <Camera className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">{title}</h3>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            stopStream();
            onClose();
          }}
          className="p-2 bg-zinc-800 hover:bg-white hover:text-black text-white transition border border-zinc-700 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
          aria-label="Close camera"
        >
          <X className="w-5 h-5 stroke-[3]" />
        </button>
      </div>

      {/* Viewfinder Main Area */}
      <div className="relative w-full max-w-xl flex-1 flex items-center justify-center overflow-hidden my-2 border-2 border-zinc-800 bg-black rounded-xl shadow-2xl">
        {capturedImage ? (
          /* Captured Preview */
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <img
              src={capturedImage}
              alt="Captured proof"
              className="max-h-full max-w-full object-contain"
            />
            <div className="absolute top-3 left-3 bg-emerald-500 text-black px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md rounded-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Snapshot Captured</span>
            </div>
          </div>
        ) : (
          /* Clean Direct Camera UI - Only working green camera */
          <div className="p-8 text-center max-w-md text-white space-y-6">
            <div className="w-20 h-20 bg-emerald-500 text-black flex items-center justify-center mx-auto rounded-full shadow-2xl">
              <Camera className="w-10 h-10 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-lg font-black uppercase text-white tracking-wide">Live Camera Proof</h4>
              <p className="text-xs text-zinc-400 mt-1.5 font-bold uppercase">
                Tap the green button below to capture photo directly with your phone camera
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  nativeCameraInputRef.current?.click();
                }}
                className="w-full py-4.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-sm tracking-wider flex items-center justify-center gap-3 cursor-pointer shadow-2xl active:scale-95 transition rounded-xl"
              >
                <Camera className="w-6 h-6 stroke-[2.5]" />
                <span>📷 Open Phone Camera</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Camera Bottom Controls */}
      <div className="w-full max-w-xl px-4 py-3 flex items-center justify-between gap-3 text-white">
        {capturedImage ? (
          <div className="w-full flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-600 transition cursor-pointer min-h-[48px] rounded-xl"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Photo</span>
            </button>

            <button
              type="button"
              onClick={handleConfirmPhoto}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-emerald-400 transition cursor-pointer shadow-lg min-h-[48px] rounded-xl"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Attach Live Proof</span>
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center">
            {/* Working Direct Phone Camera Shutter */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                nativeCameraInputRef.current?.click();
              }}
              className="w-full py-3.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer rounded-xl active:scale-95 transition shadow-lg"
              title="Open Device Camera Directly"
            >
              <Camera className="w-5 h-5 stroke-[2.5]" />
              <span>📷 Capture with Phone Camera</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
