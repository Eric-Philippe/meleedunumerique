export interface Snapshot {
  hash: string;
  message: string;
  author: string;
  date: string;
  folder: string;
  hasScreenshot: boolean;
}

export interface SnapshotContents {
  hash: string;
  files: string[];
}

export interface ApiInfo {
  name: string;
  version: string;
  github: string;
  routes: string[];
}
