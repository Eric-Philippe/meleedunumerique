import type { Snapshot, SnapshotContents } from "../types";

// In production (same origin), use /api, in dev use the full URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const api = {
  /**
   * Fetch the index of all snapshots
   */
  async getIndex(): Promise<Snapshot[]> {
    const response = await fetch(`${API_BASE_URL}/index`);
    if (!response.ok) {
      throw new Error(`Failed to fetch index: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Fetch the list of files in a specific snapshot
   */
  async getSnapshotContents(hash: string): Promise<SnapshotContents> {
    const response = await fetch(`${API_BASE_URL}/snapshots/${hash}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch snapshot contents: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Get the URL for a specific file in a snapshot
   */
  getSnapshotFileUrl(hash: string, filePath: string): string {
    return `${API_BASE_URL}/snapshots/${hash}/${filePath}`;
  },

  /**
   * Get the screenshot URL for a snapshot (if available)
   */
  getScreenshotUrl(hash: string): string {
    return `${API_BASE_URL}/snapshots/${hash}/screenshot.png`;
  },

  /**
   * Fetch file content as text
   */
  async getFileContent(hash: string, filePath: string): Promise<string> {
    const response = await fetch(
      `${API_BASE_URL}/snapshots/${hash}/${filePath}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }
    return response.text();
  },

  /**
   * Build a complete HTML document from snapshot files
   * This combines HTML, CSS, and JS into a single document for iframe rendering
   */
  async buildSnapshotDocument(
    hash: string,
    folder: string,
    files: string[]
  ): Promise<string> {
    const htmlFile = files.find(
      (f) => f.endsWith("index.html") && f.startsWith(folder + "/")
    );
    const cssFiles = files.filter(
      (f) => f.endsWith(".css") && f.startsWith(folder + "/")
    );
    const jsFiles = files.filter(
      (f) => f.endsWith(".js") && f.startsWith(folder + "/")
    );

    let htmlContent = "";
    if (htmlFile) {
      htmlContent = await this.getFileContent(hash, htmlFile);
    }

    // If no HTML file found, create a basic structure
    if (!htmlContent) {
      htmlContent = "<!DOCTYPE html><html><head></head><body></body></html>";
    }

    // Inject base tag to handle relative asset paths
    const baseUrl = `${API_BASE_URL}/snapshots/${hash}/${folder}/`;
    const baseTag = `<base href="${baseUrl}">`;

    // Insert base tag after <head>
    if (htmlContent.includes("<head>")) {
      htmlContent = htmlContent.replace("<head>", `<head>\n    ${baseTag}`);
    } else if (htmlContent.includes("<head ")) {
      htmlContent = htmlContent.replace(
        /<head([^>]*)>/,
        `<head$1>\n    ${baseTag}`
      );
    } else {
      // Add head with base tag
      htmlContent = htmlContent.replace(
        "<html>",
        `<html>\n<head>\n    ${baseTag}\n</head>`
      );
    }

    // Load external CSS files and inject them inline
    for (const cssFile of cssFiles) {
      const cssContent = await this.getFileContent(hash, cssFile);
      const styleTag = `<style data-file="${cssFile}">\n${cssContent}\n</style>`;

      if (htmlContent.includes("</head>")) {
        htmlContent = htmlContent.replace("</head>", `${styleTag}\n</head>`);
      }
    }

    // Load external JS files and inject them inline
    for (const jsFile of jsFiles) {
      // Skip if already referenced in the HTML
      const fileName = jsFile.split("/").pop();
      if (htmlContent.includes(fileName || "")) {
        continue;
      }

      const jsContent = await this.getFileContent(hash, jsFile);
      const scriptTag = `<script data-file="${jsFile}">\n${jsContent}\n</script>`;

      if (htmlContent.includes("</body>")) {
        htmlContent = htmlContent.replace("</body>", `${scriptTag}\n</body>`);
      }
    }

    return htmlContent;
  },
};
