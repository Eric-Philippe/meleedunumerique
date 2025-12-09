import { useState, useEffect } from "react";
import "./SwipeHint.css";

const HINT_STORAGE_KEY = "timelapse_swipe_hint_shown";

export function SwipeHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if hint was already shown
    const wasShown = localStorage.getItem(HINT_STORAGE_KEY);
    if (!wasShown) {
      // Show hint after a short delay
      const timer = setTimeout(() => {
        setShow(true);
      }, 1500);

      // Auto-hide after 4 seconds
      const hideTimer = setTimeout(() => {
        setShow(false);
        localStorage.setItem(HINT_STORAGE_KEY, "true");
      }, 5500);

      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(HINT_STORAGE_KEY, "true");
  };

  if (!show) return null;

  return (
    <div className="swipe-hint" onClick={handleDismiss}>
      <div className="swipe-hint-content">
        <div className="swipe-arrows">
          <svg
            className="arrow-left"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="swipe-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 8C18 8 19 9.5 19 12C19 14.5 18 16 18 16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M6 8C6 8 5 9.5 5 12C5 14.5 6 16 6 16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <rect
                x="8"
                y="6"
                width="8"
                height="12"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <svg
            className="arrow-right"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M9 18L15 12L9 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p>Swiper gauche/droite pour naviguer</p>
      </div>
    </div>
  );
}
