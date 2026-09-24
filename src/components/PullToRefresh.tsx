import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const { isLightMode } = useTheme();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const THRESHOLD = 70; // px threshold to trigger refresh

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only initiate pull when scroll position is at the very top
      if (window.scrollY <= 2 && e.touches.length === 1) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      } else {
        isPullingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      // Only pull downwards from top
      if (diff > 0 && window.scrollY <= 2) {
        // Apply friction decay
        const distance = Math.min(diff * 0.45, 120);
        setPullDistance(distance);
        if (distance > 10 && e.cancelable) {
          // Prevent native overscroll browser bounce if possible
          // e.preventDefault();
        }
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current || isRefreshing) return;
      isPullingRef.current = false;

      if (pullDistance >= THRESHOLD) {
        setIsRefreshing(true);
        setPullDistance(THRESHOLD);

        try {
          await onRefresh();
        } catch (err) {
          console.error('Pull to refresh failed:', err);
        } finally {
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 600);
        }
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div className="relative w-full">
      {/* Pull Indicator Banner */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{ height: `${pullDistance}px` }}
          className={`overflow-hidden transition-all duration-150 flex items-center justify-center ${
            isLightMode
              ? 'bg-zinc-100 text-zinc-900 border-b border-zinc-200'
              : 'bg-[#111F17] text-[#DACBA9] border-b border-[#244332]'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider py-2">
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#E05A47]" />
                <span>Refreshing Cafe Tasks...</span>
              </>
            ) : pullDistance >= THRESHOLD ? (
              <>
                <RefreshCw
                  className="w-4 h-4 text-emerald-500 transition-transform duration-200"
                  style={{ transform: `rotate(${progress * 180}deg)` }}
                />
                <span className="text-emerald-500">Release to Refresh</span>
              </>
            ) : (
              <>
                <ArrowDown
                  className="w-4 h-4 text-zinc-400 transition-transform duration-200"
                  style={{ transform: `rotate(${progress * 180}deg)` }}
                />
                <span>Pull Down to Refresh</span>
              </>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
};
