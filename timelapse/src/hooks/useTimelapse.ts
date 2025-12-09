import { useState, useEffect, useCallback } from "react";
import type { Snapshot, SnapshotContents } from "../types";
import { api } from "../services/api";

interface UseTimelapseReturn {
  snapshots: Snapshot[];
  currentIndex: number;
  currentSnapshot: Snapshot | null;
  currentContents: SnapshotContents | null;
  currentDocument: string;
  loading: boolean;
  error: string | null;
  goToSnapshot: (index: number) => void;
  goNext: () => void;
  goPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function useTimelapse(): UseTimelapseReturn {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentContents, setCurrentContents] =
    useState<SnapshotContents | null>(null);
  const [currentDocument, setCurrentDocument] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial index
  useEffect(() => {
    const fetchIndex = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getIndex();
        // Sort by date descending (newest first)
        const sorted = [...data].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setSnapshots(sorted);
        setCurrentIndex(0);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load snapshots"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchIndex();
  }, []);

  // Fetch snapshot contents when current index changes
  useEffect(() => {
    const fetchContents = async () => {
      if (snapshots.length === 0) return;

      const snapshot = snapshots[currentIndex];
      if (!snapshot) return;

      try {
        setLoading(true);
        setError(null);

        // Get snapshot file list
        const contents = await api.getSnapshotContents(snapshot.hash);
        setCurrentContents(contents);

        // Build the document for rendering
        const doc = await api.buildSnapshotDocument(
          snapshot.hash,
          snapshot.folder,
          contents.files
        );
        setCurrentDocument(doc);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load snapshot"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchContents();
  }, [snapshots, currentIndex]);

  const goToSnapshot = useCallback(
    (index: number) => {
      if (index >= 0 && index < snapshots.length) {
        setCurrentIndex(index);
      }
    },
    [snapshots.length]
  );

  const goNext = useCallback(() => {
    if (currentIndex < snapshots.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, snapshots.length]);

  const goPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  return {
    snapshots,
    currentIndex,
    currentSnapshot: snapshots[currentIndex] || null,
    currentContents,
    currentDocument,
    loading,
    error,
    goToSnapshot,
    goNext,
    goPrevious,
    hasNext: currentIndex < snapshots.length - 1,
    hasPrevious: currentIndex > 0,
  };
}
