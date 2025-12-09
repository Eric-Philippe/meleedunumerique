import { useState } from "react";
import type { Snapshot } from "../types";
import { api } from "../services/api";
import { parseCommitMessage } from "../utils/parseCommitMessage";
import "./Timeline.css";

interface TimelineProps {
  snapshots: Snapshot[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onAboutClick: () => void;
}

export function Timeline({
  snapshots,
  currentIndex,
  onSelect,
  onAboutClick,
}: TimelineProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const truncateText = (text: string, maxLength = 25) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        className={`timeline-toggle ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle timeline"
      >
        <svg
          width="24"
          height="24"
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
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span className="toggle-label">
          {snapshots.length > 0
            ? `${snapshots.length - currentIndex}/${snapshots.length}`
            : "..."}
        </span>
      </button>

      {/* Timeline Panel */}
      <div className={`timeline-panel ${isOpen ? "open" : ""}`}>
        <div className="timeline-header">
          <div className="timeline-header-left">
            <h2>Timeline</h2>
            <span className="timeline-sort-hint">
              Du plus récent au plus ancien
            </span>
          </div>
          <button className="about-btn" onClick={onAboutClick}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M12 16V12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="8" r="1" fill="currentColor" />
            </svg>
          </button>
        </div>

        <div className="timeline-list">
          {snapshots.map((snapshot, index) => {
            const parsed = parseCommitMessage(snapshot.message);
            // Oldest snapshot is #1, newest is #N (snapshots are sorted newest first)
            const iterationNum = snapshots.length - index;
            return (
              <button
                key={snapshot.hash}
                className={`timeline-item ${
                  index === currentIndex ? "active" : ""
                }`}
                onClick={() => {
                  onSelect(index);
                  setIsOpen(false);
                }}
              >
                <div className="timeline-iteration">#{iterationNum}</div>
                <div className="timeline-thumb">
                  {snapshot.hasScreenshot ? (
                    <img
                      src={api.getScreenshotUrl(snapshot.hash)}
                      alt={`Snapshot ${snapshot.hash}`}
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        target.parentElement?.classList.add("thumb-error");
                      }}
                    />
                  ) : (
                    <div className="thumb-placeholder">
                      <span>{snapshot.hash.slice(0, 3)}</span>
                    </div>
                  )}
                </div>
                <div className="timeline-info">
                  <div className="timeline-classe">{parsed.classe}</div>
                  <div className="timeline-name">
                    {truncateText(parsed.name)}
                  </div>
                  <div className="timeline-content">
                    {truncateText(parsed.content, 30)}
                  </div>
                  <div className="timeline-meta">
                    <span className="timeline-date">
                      {formatDate(snapshot.date)}
                    </span>
                    <span className="timeline-time">
                      {formatTime(snapshot.date)}
                    </span>
                  </div>
                </div>
                {index === currentIndex && (
                  <div className="timeline-current-indicator" />
                )}
              </button>
            );
          })}
        </div>

        {snapshots.length === 0 && (
          <div className="timeline-empty">
            <p>No snapshots available</p>
          </div>
        )}
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div className="timeline-backdrop" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
