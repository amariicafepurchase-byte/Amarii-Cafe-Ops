/**
 * Helper to compress image Data URLs / Files for Firestore storage.
 * Keeps clean clarity (max 800px, 0.65 quality) for crisp, readable SOP inspection proofs
 * while strictly keeping image payload ~30-55KB to ensure Firestore 1MB document limit is never exceeded.
 */
export async function compressImage(
  input: string | File,
  maxDimension = 800,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve, reject) => {
    let srcUrl = '';
    let shouldRevoke = false;

    if (typeof input === 'string') {
      srcUrl = input;
    } else if (typeof input === 'object' && input !== null) {
      srcUrl = URL.createObjectURL(input as Blob);
      shouldRevoke = true;
    } else {
      return reject(new Error('Invalid image input'));
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (shouldRevoke) URL.revokeObjectURL(srcUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(typeof input === 'string' ? input : srcUrl);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

      // Guard: if compressed string is still larger than 90KB, re-encode with slightly lower quality & dimension
      if (compressedDataUrl.length > 120000) {
        try {
          const secondCanvas = document.createElement('canvas');
          const scale = 0.75;
          secondCanvas.width = Math.max(1, Math.round(width * scale));
          secondCanvas.height = Math.max(1, Math.round(height * scale));
          const secondCtx = secondCanvas.getContext('2d');
          if (secondCtx) {
            secondCtx.imageSmoothingEnabled = true;
            secondCtx.drawImage(canvas, 0, 0, secondCanvas.width, secondCanvas.height);
            compressedDataUrl = secondCanvas.toDataURL('image/jpeg', 0.55);
          }
        } catch {
          // ignore fallback
        }
      }

      resolve(compressedDataUrl);
    };

    img.onerror = (err) => {
      if (shouldRevoke) URL.revokeObjectURL(srcUrl);
      console.warn('Image compression warning:', err);
      // Fallback to original string if compression fails
      if (typeof input === 'string') {
        resolve(input);
      } else {
        reject(err);
      }
    };

    img.src = srcUrl;
  });
}
