/**
 * Global Haptic Feedback Utility for Amarii Cafe Ops Android / Touch UI
 * Employs navigator.vibrate with distinct patterns for micro-interactions
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' | 'shutter';

export const triggerHaptic = (type: HapticType = 'light'): void => {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) {
    return;
  }

  try {
    switch (type) {
      case 'light':
      case 'selection':
        navigator.vibrate(12); // subtle tap (12ms)
        break;
      case 'medium':
        navigator.vibrate(25); // standard button press (25ms)
        break;
      case 'heavy':
        navigator.vibrate(45); // elevated FAB or toggle (45ms)
        break;
      case 'shutter':
        navigator.vibrate([15, 30, 25]); // camera double-click feel
        break;
      case 'success':
        navigator.vibrate([15, 40, 30]); // affirmative double tap
        break;
      case 'warning':
        navigator.vibrate([30, 50, 30, 50]); // warning pulse
        break;
      case 'error':
        navigator.vibrate([50, 70, 50, 70, 80]); // alert buzz
        break;
      default:
        navigator.vibrate(15);
    }
  } catch {
    // Vibration API blocked or unsupported on desktop
  }
};
