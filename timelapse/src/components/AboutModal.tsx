import "./AboutModal.css";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="about-overlay" onClick={onClose}>
      <div className="about-modal" onClick={(e) => e.stopPropagation()}>
        <button className="about-close" onClick={onClose} aria-label="Close">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="about-content">
          <div className="about-logo">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 8V12L15 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
            </svg>
          </div>

          <h2>Timelapse - FULLY GENERATED RIGHT NOW</h2>
          <p className="about-subtitle">Website Time Machine</p>

          <div className="about-description">
            <p>
              Travel through time and witness the evolution of websites. Each
              snapshot captures a moment in the development journey.
            </p>
          </div>

          <div className="about-features">
            <div className="feature">
              <span className="feature-icon">📸</span>
              <span>View snapshots</span>
            </div>
            <div className="feature">
              <span className="feature-icon">⏪</span>
              <span>Navigate history</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🎯</span>
              <span>Track changes</span>
            </div>
          </div>

          <div className="about-footer">
            <p>Built with ❤️</p>
          </div>
        </div>
      </div>
    </div>
  );
}
