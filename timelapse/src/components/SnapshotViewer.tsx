import { useRef, useEffect } from "react";
import "./SnapshotViewer.css";

interface SnapshotViewerProps {
  document: string;
  loading: boolean;
}

export function SnapshotViewer({ document, loading }: SnapshotViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && document) {
      const iframe = iframeRef.current;
      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;

      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(document);
        iframeDoc.close();
      }
    }
  }, [document]);

  return (
    <div className="snapshot-viewer">
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
    </div>
  );
}
