/**
 * Helper to compress image Data URLs / Files for Firestore storage.
 * Keeps high-resolution clarity (max 1400px, 0.88 quality) for crisp, readable SOP inspection proofs.
 */
export async function compressImage(
  input: string | File,
  maxDimension = 1400,
  quality = 0.88
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

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
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
