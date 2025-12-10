import { useRef, useEffect } from "react";
import "./SnapshotViewer.css";

interface SnapshotViewerProps {
  document: string;
  loading: boolean;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}

export function SnapshotViewer({
  document,
  loading,
  onTouchStart,
  onTouchEnd,
}: SnapshotViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeWrapperRef = useRef<HTMLDivElement>(null);
  const touchOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (iframeRef.current && document) {
      const iframe = iframeRef.current;
      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;

      if (iframeDoc) {
        // Clear all previous styles before loading new document
        const existingStyles = iframeDoc.querySelectorAll("style");
        existingStyles.forEach((style) => style.remove());

        iframeDoc.open();
        iframeDoc.write(document);
        iframeDoc.close();

        // Add touch event listeners to the iframe document
        if (onTouchStart && onTouchEnd) {
          iframeDoc.addEventListener("touchstart", (e: TouchEvent) => {
            // Convert native touch event to React-like event
            const syntheticEvent = {
              touches: e.touches,
              changedTouches: e.changedTouches,
            } as unknown as React.TouchEvent;
            onTouchStart(syntheticEvent);
          });

          iframeDoc.addEventListener("touchend", (e: TouchEvent) => {
            const syntheticEvent = {
              changedTouches: e.changedTouches,
            } as unknown as React.TouchEvent;
            onTouchEnd(syntheticEvent);
          });
        }
      }
    }
  }, [document, onTouchStart, onTouchEnd]);

  // Ensure touch overlay also captures events as fallback
  useEffect(() => {
    const overlay = touchOverlayRef.current;
    if (!overlay || !onTouchStart || !onTouchEnd) return;

    overlay.addEventListener("touchstart", (e: TouchEvent) => {
      const syntheticEvent = {
        touches: e.touches,
        changedTouches: e.changedTouches,
      } as unknown as React.TouchEvent;
      onTouchStart(syntheticEvent);
    });

    overlay.addEventListener("touchend", (e: TouchEvent) => {
      const syntheticEvent = {
        changedTouches: e.changedTouches,
      } as unknown as React.TouchEvent;
      onTouchEnd(syntheticEvent);
    });
  }, [onTouchStart, onTouchEnd]);

  return (
    <div className="snapshot-viewer" ref={iframeWrapperRef}>
      {loading && (
        <div className="snapshot-loading">
          <div className="loading-spinner"></div>
          <span>Loading snapshot...</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="snapshot-iframe"
        title="Snapshot Preview"
        sandbox="allow-scripts allow-same-origin"
      />
      <div className="snapshot-touch-overlay" ref={touchOverlayRef} />
    </div>
  );
}
