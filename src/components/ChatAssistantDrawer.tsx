import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Bot,
  X,
  Mic,
  MicOff,
  Languages,
  Volume2,
  VolumeX,
  Radio,
  AlertCircle,
  Square,
  Sparkles,
  Check,
  FileText,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Table,
  Layers,
  ArrowDownToLine,
} from 'lucide-react';
import { ChatMessage, TaskItem, ReportCardData } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth, isHemenDas } from '../context/AuthContext';
import {
  exportReportAsPdf,
  exportReportAsExcel,
  exportReportAsDoc,
} from '../utils/reportExport';
import { triggerHaptic } from '../utils/haptics';

export interface IndianLanguageOption {
  code: string;
  name: string;
  nativeLabel: string;
  scriptPrompt: string;
  flag: string;
}

export const INDIAN_LANGUAGES: IndianLanguageOption[] = [
  { code: 'hi-IN', name: 'Hindi', nativeLabel: 'हिंदी / Hinglish', scriptPrompt: 'बोलिए: किचन का काम हो गया', flag: '🇮🇳' },
  { code: 'en-IN', name: 'English (India)', nativeLabel: 'Indian English', scriptPrompt: 'Speak: What is the shift status?', flag: '🌐' },
  { code: 'mr-IN', name: 'Marathi', nativeLabel: 'मराठी', scriptPrompt: 'बोला: किचनचे काम झाले का?', flag: '🚩' },
  { code: 'bn-IN', name: 'Bengali', nativeLabel: 'বাংলা', scriptPrompt: 'বলুন: সব কাজ শেষ হয়েছে', flag: '🇧🇩' },
  { code: 'ta-IN', name: 'Tamil', nativeLabel: 'தமிழ்', scriptPrompt: 'பேசுங்கள்: வேலை முடிந்தது', flag: '🏛️' },
  { code: 'te-IN', name: 'Telugu', nativeLabel: 'తెలుగు', scriptPrompt: 'మాట్లాడండి: పని పూర్తయింది', flag: '🌿' },
  { code: 'gu-IN', name: 'Gujarati', nativeLabel: 'ગુજરાતી', scriptPrompt: 'બોલો: કામ પૂરું થઈ ગયું', flag: '🪔' },
  { code: 'kn-IN', name: 'Kannada', nativeLabel: 'ಕನ್ನಡ', scriptPrompt: 'ಮಾತನಾಡಿ: ಕೆಲಸ ಮುಗಿದಿದೆ', flag: '🪙' },
  { code: 'ml-IN', name: 'Malayalam', nativeLabel: 'മലയാളം', scriptPrompt: 'സംസാരിക്കുക: ജോലി കഴിഞ്ഞു', flag: '🌴' },
  { code: 'pa-IN', name: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', scriptPrompt: 'ਬੋਲੋ: ਕੰਮ ਹੋ ਗਿਆ ਜੀ', flag: '🌾' },
  { code: 'ur-IN', name: 'Urdu', nativeLabel: 'اردو', scriptPrompt: 'فرمائیے: کام مکمل ہو گیا', flag: '🌙' },
  { code: 'or-IN', name: 'Odia', nativeLabel: 'ଓଡ଼ିଆ', scriptPrompt: 'କହନ୍ତୁ: କାମ ହୋଇଗଲା', flag: '🌊' },
];

interface ChatAssistantDrawerProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => Promise<void>;
  isLoading: boolean;
  tasks: TaskItem[];
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

export const ChatAssistantDrawer: React.FC<ChatAssistantDrawerProps> = ({
  messages,
  onSendMessage,
  isLoading,
  tasks,
  isOpen: isOpenProp,
  onClose: onCloseProp,
  onOpen: onOpenProp,
  isOpenExternal,
  onCloseExternal,
}) => {
  const { isLightMode } = useTheme();
  const { currentUser } = useAuth();
  const isHemen = isHemenDas(currentUser);
  const isManagement = isHemen || currentUser?.role === 'manager' || currentUser?.role === 'admin' || currentUser?.department === 'Management';

  const [input, setInput] = useState('');
  const [isOpenLocal, setIsOpenLocal] = useState(false);
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [liveInterim, setLiveInterim] = useState('');
  const [selectedLang, setSelectedLang] = useState<string>('hi-IN');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  // Voice Output (Speech Synthesis) State
  const [isSpeechOutputEnabled, setIsSpeechOutputEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 1-Click Report Download States (Detailed for Hemen only, Normal for Management)
  const [reportTier, setReportTier] = useState<'detailed' | 'normal'>(isHemen ? 'detailed' : 'normal');
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [downloadSuccessFeedback, setDownloadSuccessFeedback] = useState<string | null>(null);

  const handleDownloadReport = async (format: 'pdf' | 'xls' | 'doc', forcedTier?: 'detailed' | 'normal') => {
    triggerHaptic('medium');
    setDownloadingFormat(format);
    setDownloadSuccessFeedback(null);
    const tierToUse = isHemen ? (forcedTier || reportTier) : 'normal';
    try {
      if (format === 'pdf') {
        await exportReportAsPdf(tasks, {
          outlet: currentUser?.outlet || 'Amarii Cafe Kothrud',
          managerName: currentUser?.name || (isHemen ? 'Hemen Das (Owner & General Manager)' : 'Management'),
          stationFilter: 'All Stations',
          reportType: tierToUse,
          isHemenDas: isHemen,
        });
        setDownloadSuccessFeedback(`✓ ${tierToUse === 'detailed' ? 'Master Detail PDF' : 'Shift Summary PDF'} Downloaded!`);
      } else if (format === 'xls') {
        exportReportAsExcel(tasks, {
          outlet: currentUser?.outlet || 'Amarii Cafe Kothrud',
          managerName: currentUser?.name || (isHemen ? 'Hemen Das' : 'Management'),
          stationFilter: 'All Stations',
          reportType: tierToUse,
          isHemenDas: isHemen,
        });
        setDownloadSuccessFeedback(`✓ ${tierToUse === 'detailed' ? 'Master Detail Excel (.xls)' : 'Summary Excel (.xls)'} Downloaded!`);
      } else if (format === 'doc') {
        exportReportAsDoc(tasks, {
          outlet: currentUser?.outlet || 'Amarii Cafe Kothrud',
          managerName: currentUser?.name || (isHemen ? 'Hemen Das' : 'Management'),
          stationFilter: 'All Stations',
          reportType: tierToUse,
          isHemenDas: isHemen,
        });
        setDownloadSuccessFeedback(`✓ ${tierToUse === 'detailed' ? 'Master Detail Word (.doc)' : 'Summary Word (.doc)'} Downloaded!`);
      }
      triggerHaptic('success');
      setTimeout(() => setDownloadSuccessFeedback(null), 3500);
    } catch (err: any) {
      console.error('Report download error:', err);
      setDownloadSuccessFeedback('Download failed. Please try again.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);

  // Determine effective open state from props or local state
  const effectiveIsOpenProp = isOpenProp !== undefined ? isOpenProp : isOpenExternal;
  const effectiveOnClose = onCloseProp || onCloseExternal;
  const effectiveOnOpen = onOpenProp;
  const isOpen = effectiveIsOpenProp !== undefined ? effectiveIsOpenProp : isOpenLocal;

  const currentLangObj = INDIAN_LANGUAGES.find((l) => l.code === selectedLang) || INDIAN_LANGUAGES[0];

  const handleCloseDrawer = () => {
    // Stop listening & speaking if active
    stopVoiceRecognition();
    stopSpeaking();
    if (effectiveOnClose) {
      effectiveOnClose();
    }
    setIsOpenLocal(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, liveInterim]);

  // Clean stop for recognition
  const stopVoiceRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        console.warn('Recognition abort warning:', err);
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setLiveInterim('');
  }, []);

  // Text-To-Speech (Assistant Voice Audio Output)
  const speakText = useCallback(
    (text: string, langCode: string) => {
      if (!isSpeechOutputEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }
      try {
        window.speechSynthesis.cancel();
        // Remove markdown symbols or asterisks for clean speech
        const cleanText = text.replace(/[*_#`~[\]]/g, '').trim();
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = langCode;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e);
          setIsSpeaking(false);
        };

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const matchingVoice =
            voices.find((v) => v.lang === langCode) ||
            voices.find((v) => Boolean(v.lang && v.lang.startsWith(langCode.split('-')[0]))) ||
            voices.find((v) => Boolean(v.lang && v.lang.includes('IN')));
          if (matchingVoice) {
            utterance.voice = matchingVoice;
          }
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis call warning:', err);
        setIsSpeaking(false);
      }
    },
    [isSpeechOutputEnabled]
  );

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Speak new assistant messages if voice response is enabled
  useEffect(() => {
    if (!isSpeechOutputEnabled || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.sender === 'assistant' && lastMsg.id !== lastSpokenMessageIdRef.current) {
      lastSpokenMessageIdRef.current = lastMsg.id;
      speakText(lastMsg.text, selectedLang);
    }
  }, [messages, isSpeechOutputEnabled, selectedLang, speakText]);

  // Teardown speech synthesis and recognition on unmount
  useEffect(() => {
    return () => {
      stopVoiceRecognition();
      stopSpeaking();
    };
  }, [stopVoiceRecognition]);

  // Toggle voice recognition
  const toggleListening = () => {
    setVoiceNotice(null);

    // If currently listening, stop cleanly
    if (isListening) {
      stopVoiceRecognition();
      return;
    }

    // Check for browser support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice('Voice recognition is supported in Google Chrome, Edge, and Android mobile browsers.');
      return;
    }

    try {
      // Abort any existing instance first
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = selectedLang;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setLiveInterim('');
        setVoiceNotice(null);
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalText += item[0].transcript;
          } else {
            interimText += item[0].transcript;
          }
        }

        if (finalText) {
          const combined = finalText.trim();
          setInput((prev) => (prev ? `${prev.trim()} ${combined}` : combined));
          setLiveInterim('');
        } else if (interimText) {
          setLiveInterim(interimText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed') {
          setVoiceNotice('Microphone permission blocked. Please allow mic permissions in your browser bar.');
        } else if (event.error === 'no-speech') {
          setVoiceNotice('No voice detected. Please speak into your microphone and try again.');
        } else if (event.error === 'audio-capture') {
          setVoiceNotice('No microphone found on this device.');
        } else if (event.error !== 'aborted') {
          setVoiceNotice(`Voice input notice: ${event.error}`);
        }
        setIsListening(false);
        setLiveInterim('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setLiveInterim('');
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Speech recognition start failed:', err);
      setVoiceNotice(`Unable to activate microphone: ${err?.message || 'Check browser permissions'}`);
      setIsListening(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    setInput('');
    setLiveInterim('');
    stopVoiceRecognition();
    await onSendMessage(msg);
  };

  const handleQuickCommand = async (cmd: string) => {
    stopVoiceRecognition();
    await onSendMessage(cmd);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ops Assistant Chat with All Indian Languages & Voice Mode"
      className={`fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-5 sm:right-5 z-50 sm:max-w-md sm:w-[440px] border-t-4 sm:border-2 border-[#E05A47] flex flex-col h-[85vh] sm:h-[560px] shadow-2xl overflow-hidden rounded-t-2xl sm:rounded-none animate-in slide-in-from-bottom-5 duration-200 ${
        isLightMode ? 'bg-white text-zinc-900' : 'bg-[#16281E] text-[#F7F4EB]'
      }`}
    >
      {/* Mobile Drag Indicator */}
      <div
        className={`w-12 h-1 rounded-full mx-auto mt-2.5 sm:hidden ${
          isLightMode ? 'bg-zinc-300' : 'bg-[#244332]'
        }`}
      />

      {/* Chat Header */}
      <div
        className={`px-3 sm:px-4 py-2.5 border-b flex items-center justify-between gap-2 ${
          isLightMode
            ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
            : 'bg-[#111F17] border-b-2 border-[#244332] text-white'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-[#E05A47] text-white rounded shrink-0 shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4
                className={`text-xs font-black uppercase tracking-tight truncate leading-none ${
                  isLightMode ? 'text-zinc-950' : 'text-white'
                }`}
              >
                Amarii AI Assistant
              </h4>
              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-600/30 text-emerald-400 font-bold border border-emerald-500/40 rounded">
                All Indian Langs
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <button
                type="button"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="text-[10px] font-bold text-[#E05A47] hover:underline flex items-center gap-1 cursor-pointer"
                title="Change input language"
              >
                <span>{currentLangObj.flag}</span>
                <span className="truncate max-w-[120px]">{currentLangObj.nativeLabel}</span>
                <span className="text-[8px] opacity-70">▼</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls: Audio Toggle & Close */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Voice Response Speaker Toggle */}
          <button
            type="button"
            onClick={() => {
              if (isSpeaking) {
                stopSpeaking();
              } else {
                setIsSpeechOutputEnabled(!isSpeechOutputEnabled);
              }
            }}
            className={`p-1.5 rounded transition cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
              isSpeechOutputEnabled
                ? 'bg-emerald-600 text-white'
                : isLightMode
                ? 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                : 'bg-[#244332] text-zinc-300 hover:text-white'
            }`}
            title={isSpeechOutputEnabled ? 'Voice reply ON (Tap to mute)' : 'Turn voice reply ON'}
          >
            {isSpeaking ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current animate-pulse text-amber-300" />
                <span className="text-[9px] hidden sm:inline">Stop</span>
              </>
            ) : isSpeechOutputEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span className="text-[9px] hidden sm:inline">Voice ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 opacity-60" />
                <span className="text-[9px] hidden sm:inline opacity-80">Mute</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCloseDrawer}
            className={`p-1.5 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center rounded ${
              isLightMode
                ? 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200'
                : 'text-zinc-400 hover:text-white hover:bg-[#244332]'
            }`}
            aria-label="Close chat"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Language Selector Dropdown Banner */}
      {isLangMenuOpen && (
        <div
          className={`p-2.5 border-b shadow-inner z-20 max-h-48 overflow-y-auto ${
            isLightMode ? 'bg-zinc-200/90 border-zinc-300' : 'bg-[#101c15] border-[#244332]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
              Select Voice & Input Language:
            </span>
            <button
              type="button"
              onClick={() => setIsLangMenuOpen(false)}
              className="text-[10px] text-[#E05A47] font-bold cursor-pointer hover:underline"
            >
              Done
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {INDIAN_LANGUAGES.map((lang) => {
              const isSelected = lang.code === selectedLang;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setSelectedLang(lang.code);
                    setIsLangMenuOpen(false);
                    if (isListening) {
                      stopVoiceRecognition();
                    }
                  }}
                  className={`text-left p-1.5 rounded text-[11px] font-semibold flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#E05A47] text-white shadow-xs'
                      : isLightMode
                      ? 'bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-300'
                      : 'bg-[#16281E] hover:bg-[#244332] text-zinc-200 border border-[#244332]'
                  }`}
                >
                  <span className="truncate">
                    {lang.flag} {lang.nativeLabel}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Voice notice / error banner */}
      {voiceNotice && (
        <div className="px-3 py-1.5 bg-amber-500/20 border-b border-amber-500/40 text-amber-200 text-[10px] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>{voiceNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceNotice(null)}
            className="text-amber-300 hover:text-white font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Live Recording Active Pill */}
      {isListening && (
        <div className="px-3 py-2 bg-red-950/80 border-b border-red-700/60 flex items-center justify-between gap-2 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-[11px] font-bold text-red-200">
              Listening in {currentLangObj.name} ({currentLangObj.nativeLabel})... Speak now!
            </span>
          </div>
          <button
            type="button"
            onClick={stopVoiceRecognition}
            className="text-[10px] px-2 py-0.5 bg-red-700 hover:bg-red-600 text-white font-bold rounded cursor-pointer"
          >
            Stop Mic
          </button>
        </div>
      )}

      {/* Quick Command Chips (All Major Indian Languages, Ops & Reports) */}
      <div
        className={`px-3 py-2 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px] font-bold ${
          isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-[#132219] border-[#244332]'
        }`}
      >
        <button
          type="button"
          onClick={() => handleDownloadReport('pdf')}
          className="whitespace-nowrap px-2.5 py-1 bg-red-600 text-white hover:bg-red-500 transition cursor-pointer min-h-[28px] rounded font-black flex items-center gap-1 shadow-xs"
          title="1-Click Download PDF Report"
        >
          <FileText className="w-3 h-3" />
          <span>📄 PDF Report</span>
        </button>
        <button
          type="button"
          onClick={() => handleDownloadReport('xls')}
          className="whitespace-nowrap px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-500 transition cursor-pointer min-h-[28px] rounded font-black flex items-center gap-1 shadow-xs"
          title="1-Click Download Excel Sheet (.xls)"
        >
          <FileSpreadsheet className="w-3 h-3" />
          <span>📊 Excel (.xls)</span>
        </button>
        <button
          type="button"
          onClick={() => handleDownloadReport('doc')}
          className="whitespace-nowrap px-2.5 py-1 bg-blue-600 text-white hover:bg-blue-500 transition cursor-pointer min-h-[28px] rounded font-black flex items-center gap-1 shadow-xs"
          title="1-Click Download Word Document (.doc)"
        >
          <FileText className="w-3 h-3" />
          <span>📝 Word (.doc)</span>
        </button>
        <button
          type="button"
          onClick={() => handleQuickCommand('kya chal raha hai?')}
          className="whitespace-nowrap px-2.5 py-1 bg-[#E05A47] text-white hover:bg-[#D44A35] transition cursor-pointer min-h-[28px] rounded font-black"
        >
          🇮🇳 क्या चल रहा है?
        </button>
        <button
          type="button"
          onClick={() => handleQuickCommand('kay challay?')}
          className={`whitespace-nowrap px-2.5 py-1 transition cursor-pointer min-h-[28px] rounded ${
            isLightMode
              ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900 border border-zinc-300'
              : 'bg-[#244332] text-white hover:bg-[#315742]'
          }`}
        >
          🚩 काय चाललंय?
        </button>
        <button
          type="button"
          onClick={() => handleQuickCommand('Kitchen ke urgent tasks ho gaye')}
          className={`whitespace-nowrap px-2.5 py-1 transition cursor-pointer min-h-[28px] rounded ${
            isLightMode
              ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900 border border-zinc-300'
              : 'bg-[#244332] text-[#EDE8DC] hover:text-white'
          }`}
        >
          👨‍🍳 किचन काम हो गया
        </button>
        <button
          type="button"
          onClick={() => handleQuickCommand('Bar machine clean zala')}
          className={`whitespace-nowrap px-2.5 py-1 transition cursor-pointer min-h-[28px] rounded ${
            isLightMode
              ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900 border border-zinc-300'
              : 'bg-[#244332] text-[#EDE8DC] hover:text-white'
          }`}
        >
          ☕ Bar clean zala
        </button>
        <button
          type="button"
          onClick={() => handleQuickCommand('Shift status and pending summary')}
          className={`whitespace-nowrap px-2.5 py-1 transition cursor-pointer min-h-[28px] rounded ${
            isLightMode
              ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900 border border-zinc-300'
              : 'bg-[#244332] text-[#EDE8DC] hover:text-white'
          }`}
        >
          📊 Shift Status
        </button>
      </div>

      {/* Message List */}
      <div
        className={`flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 modal-scroll-area ${
          isLightMode ? 'bg-zinc-50' : 'bg-[#132219]'
        }`}
      >
        {messages.map((m) => {
          const isAssistant = m.sender === 'assistant';
          const hasReportIntent =
            Boolean(m.reportData) ||
            (isAssistant &&
              (m.text.toLowerCase().includes('report') ||
                m.text.toLowerCase().includes('pdf') ||
                m.text.toLowerCase().includes('excel') ||
                m.text.toLowerCase().includes('xls') ||
                m.text.toLowerCase().includes('.doc') ||
                m.text.toLowerCase().includes('word') ||
                m.text.toLowerCase().includes('रिपोर्ट')));

          const completedCount = tasks.filter((t) => t.completed).length;
          const totalCount = tasks.length;
          const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          const urgentCount = tasks.filter((t) => t.priority === 'urgent').length;

          return (
            <div
              key={m.id}
              className={`flex gap-2 text-xs leading-relaxed ${
                m.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {isAssistant && (
                <div className="w-6 h-6 bg-[#E05A47] text-white flex items-center justify-center flex-shrink-0 text-[10px] font-black rounded shadow-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`p-3 max-w-[90%] sm:max-w-[85%] rounded-lg ${
                  m.sender === 'user'
                    ? 'bg-[#E05A47] text-white font-semibold shadow-md'
                    : isLightMode
                    ? 'bg-white text-zinc-900 border border-zinc-300 shadow-xs'
                    : 'bg-[#16281E] text-[#F7F4EB] border border-[#244332] shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>

                {/* 1-Click Professional Download Report Card */}
                {hasReportIntent && (
                  <div className="mt-3 p-2.5 sm:p-3 bg-[#0D1812] border border-[#244332] rounded text-white shadow-inner">
                    <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-[#244332]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="p-1 bg-[#E05A47] text-white rounded shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-[11px] font-black uppercase text-white tracking-tight truncate leading-tight">
                            {isHemen && reportTier === 'detailed'
                              ? '👑 Hemen Das Master Detail Audit Report'
                              : m.reportData?.title || 'Amarii Café Shift Summary Report'}
                          </h5>
                          <p className="text-[9px] text-[#DACBA9] font-medium truncate">
                            {completedCount}/{totalCount} Completed ({rate}% Rate) &bull; {urgentCount} Urgent
                          </p>
                        </div>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 border ${
                        isHemen
                          ? 'bg-amber-950 text-amber-300 border-amber-500'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      }`}>
                        {isHemen ? (reportTier === 'detailed' ? '👑 HEMEN DETAIL' : 'SUMMARY') : 'MGMT SUMMARY'}
                      </span>
                    </div>

                    {/* Tier selector for Hemen Das */}
                    {isHemen && (
                      <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 pb-1 border-b border-[#1d3829] text-[9px]">
                        <span className="text-[#DACBA9] font-bold">Report Format Tier:</span>
                        <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded border border-[#244332]">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setReportTier('detailed');
                            }}
                            className={`px-1.5 py-0.5 rounded font-black uppercase tracking-tight transition cursor-pointer ${
                              reportTier === 'detailed'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            👑 Detail Audit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setReportTier('normal');
                            }}
                            className={`px-1.5 py-0.5 rounded font-black uppercase tracking-tight transition cursor-pointer ${
                              reportTier === 'normal'
                                ? 'bg-[#E05A47] text-white shadow-xs'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            Summary
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 3 Dedicated 1-Click Download Buttons */}
                    <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                      {/* 1. PDF */}
                      <button
                        type="button"
                        onClick={() => handleDownloadReport('pdf')}
                        disabled={downloadingFormat === 'pdf'}
                        className="px-1.5 py-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-tight rounded flex flex-col items-center justify-center gap-1 shadow-sm transition cursor-pointer disabled:opacity-50"
                        title="Download Professional PDF (.pdf)"
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span>{downloadingFormat === 'pdf' ? '...' : 'PDF (.pdf)'}</span>
                      </button>

                      {/* 2. Excel (.xls) */}
                      <button
                        type="button"
                        onClick={() => handleDownloadReport('xls')}
                        disabled={downloadingFormat === 'xls'}
                        className="px-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-tight rounded flex flex-col items-center justify-center gap-1 shadow-sm transition cursor-pointer disabled:opacity-50"
                        title="Download Excel Sheet (.xls)"
                      >
                        <FileSpreadsheet className="w-4 h-4 shrink-0" />
                        <span>{downloadingFormat === 'xls' ? '...' : 'Excel (.xls)'}</span>
                      </button>

                      {/* 3. Word (.doc) */}
                      <button
                        type="button"
                        onClick={() => handleDownloadReport('doc')}
                        disabled={downloadingFormat === 'doc'}
                        className="px-1.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-tight rounded flex flex-col items-center justify-center gap-1 shadow-sm transition cursor-pointer disabled:opacity-50"
                        title="Download Word Document (.doc)"
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span>{downloadingFormat === 'doc' ? '...' : 'Word (.doc)'}</span>
                      </button>
                    </div>

                    {downloadSuccessFeedback && (
                      <div className="mt-2 text-center text-[10px] font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-600 py-1 rounded animate-in fade-in">
                        {downloadSuccessFeedback}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 mt-1.5">
                  {isAssistant && (
                    <button
                      type="button"
                      onClick={() => speakText(m.text, selectedLang)}
                      className="text-[9px] opacity-70 hover:opacity-100 flex items-center gap-1 cursor-pointer text-[#E05A47]"
                      title="Read this aloud"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Speak</span>
                    </button>
                  )}
                  <span
                    className={`block text-[9px] font-mono ml-auto ${
                      m.sender === 'user'
                        ? 'text-white/80 text-right'
                        : isLightMode
                        ? 'text-zinc-500'
                        : 'text-zinc-400'
                    }`}
                  >
                    {new Date(m.timestamp).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div
            className={`flex gap-2 items-center text-xs p-2.5 w-fit rounded border shadow-xs ${
              isLightMode
                ? 'bg-white text-zinc-800 border-zinc-300'
                : 'bg-[#16281E] text-zinc-300 border-[#244332]'
            }`}
          >
            <div className="w-3 h-3 border-2 border-[#E05A47] border-t-transparent rounded-full animate-spin" />
            <span className="font-bold uppercase tracking-wider text-[10px]">
              Amarii AI Soch Raha Hai...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Real-time Interim Voice Speech Transcription Preview */}
      {liveInterim && (
        <div
          className={`px-3 py-1.5 text-xs font-mono border-t flex items-center gap-2 ${
            isLightMode ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-amber-950/40 text-amber-200 border-amber-900/60'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
          <span className="opacity-80 italic truncate">{liveInterim}...</span>
        </div>
      )}

      {/* Chat Input with Safe Area */}
      <form
        onSubmit={handleSubmit}
        className={`p-2.5 sm:p-3 border-t flex items-center gap-2 safe-bottom ${
          isLightMode
            ? 'bg-zinc-100 border-zinc-300'
            : 'bg-[#111F17] border-[#244332]'
        }`}
      >
        <input
          type="text"
          id="ops-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`${currentLangObj.scriptPrompt} (or type in any Indian language)...`}
          className={`flex-1 text-xs px-3 py-2.5 outline-none font-medium min-h-[42px] rounded border ${
            isLightMode
              ? 'bg-white text-zinc-900 border-zinc-300 focus:border-[#E05A47] placeholder:text-zinc-400'
              : 'bg-[#16281E] text-white border-[#244332] focus:border-[#E05A47] placeholder:text-zinc-500'
          }`}
          disabled={isLoading}
        />

        {/* Mic voice button with pulsating active state */}
        <button
          type="button"
          onClick={toggleListening}
          className={`p-2.5 rounded transition cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center relative shadow-xs ${
            isListening
              ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-400 ring-offset-1 animate-pulse'
              : isLightMode
              ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800 border border-zinc-300'
              : 'bg-[#244332] hover:bg-[#315742] text-white'
          }`}
          title={isListening ? 'Stop listening' : `Speak in ${currentLangObj.name} (${currentLangObj.nativeLabel})`}
        >
          {isListening ? (
            <MicOff className="w-4 h-4 text-white" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2.5 bg-[#E05A47] hover:bg-[#D44A35] text-white disabled:opacity-30 transition cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center rounded shadow-xs"
          aria-label="Send message"
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
        </button>
      </form>
    </div>
  );
};
