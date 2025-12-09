import { useRef, useCallback } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

interface TouchHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

const SWIPE_THRESHOLD = 50; // minimum distance for a swipe

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
}: SwipeHandlers): TouchHandlers {
  const touchStartX = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;

      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX.current - touchEndX;

      if (Math.abs(diff) > SWIPE_THRESHOLD) {
        if (diff > 0 && onSwipeLeft) {
          // Swiped left -> go to next
          onSwipeLeft();
        } else if (diff < 0 && onSwipeRight) {
          // Swiped right -> go to previous
          onSwipeRight();
        }
      }

      touchStartX.current = null;
    },
    [onSwipeLeft, onSwipeRight]
  );

  return { onTouchStart, onTouchEnd };
}
