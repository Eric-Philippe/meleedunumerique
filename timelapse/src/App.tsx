import { useState } from "react";
import { useTimelapse } from "./hooks/useTimelapse";
import { useSwipe } from "./hooks/useSwipe";
import { SnapshotViewer } from "./components/SnapshotViewer";
import { Timeline } from "./components/Timeline";
import { AboutModal } from "./components/AboutModal";
import { SwipeHint } from "./components/SwipeHint";
import { parseCommitMessage } from "./utils/parseCommitMessage";
import "./App.css";

function App() {
  const {
    snapshots,
    currentIndex,
    currentSnapshot,
    currentDocument,
    loading,
    error,
    goToSnapshot,
    goNext,
    goPrevious,
    hasNext,
    hasPrevious,
  } = useTimelapse();

  const [showAbout, setShowAbout] = useState(false);

  // Swipe navigation for mobile
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => hasNext && goNext(),
    onSwipeRight: () => hasPrevious && goPrevious(),
  });

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" && hasPrevious) {
      goPrevious();
    } else if (e.key === "ArrowRight" && hasNext) {
      goNext();
    }
  };

  return (
    <div
      className="app"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onTouchStart={swipeHandlers.onTouchStart}
      onTouchEnd={swipeHandlers.onTouchEnd}
    >
      {/* Error State */}
      {error && (
        <div className="app-error">
          <div className="error-icon">⚠️</div>
          <h2>Oops!</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Réessayer</button>
        </div>
      )}

      {/* Empty State */}
      {!error && !loading && snapshots.length === 0 && (
        <div className="app-empty">
          <div className="empty-icon">📸</div>
          <h2>Pas encore de captures</h2>
          <p>En attente de la première capture du site...</p>
        </div>
      )}

      {/* Main Content */}
      {!error && snapshots.length > 0 && (
        <>
          {/* Snapshot Viewer */}
          <SnapshotViewer
            document={currentDocument}
            loading={loading}
            onTouchStart={swipeHandlers.onTouchStart}
            onTouchEnd={swipeHandlers.onTouchEnd}
          />

          {/* Navigation Arrows (desktop) */}
          <div className="nav-arrows">
            <button
              className="nav-arrow nav-prev"
              onClick={goPrevious}
              disabled={!hasPrevious}
              aria-label="Previous snapshot"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="nav-arrow nav-next"
              onClick={goNext}
              disabled={!hasNext}
              aria-label="Prochaine capture"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Current Snapshot Info (bottom overlay) */}
          {currentSnapshot &&
            (() => {
              const parsed = parseCommitMessage(currentSnapshot.message);
              // Oldest snapshot is #1, newest is #N (snapshots are sorted newest first)
              const iterationNum = snapshots.length - currentIndex;
              return (
                <div className="snapshot-info">
                  <div className="info-main">
                    <span className="info-iteration">#{iterationNum}</span>
                    <span className="info-classe">{parsed.classe}</span>
                    <span className="info-name">{parsed.name}</span>
                  </div>
                  <div className="info-content">{parsed.content}</div>
                </div>
              );
            })()}

          {/* Progress Bar */}
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((currentIndex + 1) / snapshots.length) * 100}%`,
              }}
            />
          </div>
        </>
      )}

      {/* Timeline */}
      <Timeline
        snapshots={snapshots}
        currentIndex={currentIndex}
        onSelect={goToSnapshot}
        onAboutClick={() => setShowAbout(true)}
      />

      {/* About Modal */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      {/* Swipe Hint (mobile only, shown once) */}
      {snapshots.length > 1 && <SwipeHint />}
    </div>
  );
}

export default App;
