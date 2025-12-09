package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

//go:embed static/*
var staticFiles embed.FS

var (
	timelapsePath = getEnv("TIMELAPSE_PATH", "../.timelapse")
	githubOwner   = getEnv("GITHUB_OWNER", "Eric-Philippe")
	githubRepo    = getEnv("GITHUB_REPO", "meleedunumerique")
	githubBranch  = getEnv("GITHUB_BRANCH", "main")
	syncMutex     sync.Mutex
)

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func main() {
	port := getEnv("PORT", "8080")

	// Ensure data directory exists
	os.MkdirAll(filepath.Join(timelapsePath, "snapshots"), 0755)

	// Initial sync on startup (optional, can be disabled)
	if getEnv("SYNC_ON_STARTUP", "true") == "true" {
		log.Println("Performing initial sync from GitHub...")
		if err := syncFromGitHub(); err != nil {
			log.Printf("Warning: Initial sync failed: %v", err)
		}
	}

	// Background sync is optional - mainly rely on webhook from GitHub Actions
	if interval := getEnv("SYNC_INTERVAL", "0"); interval != "0" {
		go startBackgroundSync(interval)
	}

	// API routes
	http.HandleFunc("/api/", handleAPI)
	http.HandleFunc("/api/index", handleIndex)
	http.HandleFunc("/api/snapshots/", handleSnapshots)
	http.HandleFunc("/api/sync", handleSync)
	http.HandleFunc("/api/clear", handleClear)

	// Serve static files (React app)
	staticFS, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Printf("Warning: Could not load static files: %v", err)
	} else {
		http.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Try to serve the file
			path := r.URL.Path
			if path == "/" {
				path = "/index.html"
			}

			// Check if file exists in embedded FS
			f, err := staticFS.Open(strings.TrimPrefix(path, "/"))
			if err != nil {
				// File not found, serve index.html for SPA routing
				serveStaticFile(w, r, staticFS, "index.html")
				return
			}
			f.Close()

			// Serve the actual file
			serveStaticFile(w, r, staticFS, strings.TrimPrefix(path, "/"))
		}))
	}

	log.Printf("Starting timelapse server on port %s", port)
	log.Printf("GitHub source: %s/%s (branch: %s)", githubOwner, githubRepo, githubBranch)
	log.Printf("Local cache: %s", timelapsePath)
	log.Println("Serving frontend at / and API at /api/")
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// handleAPI returns API info
func handleAPI(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/" {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"name":    "Timelapse API",
		"version": "1.0.0",
		"github":  fmt.Sprintf("%s/%s", githubOwner, githubRepo),
		"routes": []string{
			"GET /api/index - Get timelapse index",
			"GET /api/snapshots/{hash} - List snapshot contents",
			"GET /api/snapshots/{hash}/{path...} - Get snapshot file",
			"POST /api/sync - Sync from GitHub",
			"POST /api/clear - Clear local cache and re-sync",
		},
	})
}

// serveStaticFile serves a file from the embedded filesystem
func serveStaticFile(w http.ResponseWriter, r *http.Request, fsys fs.FS, path string) {
	data, err := fs.ReadFile(fsys, path)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Set content type based on extension
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".html":
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
	case ".css":
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
	case ".js":
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
	case ".json":
		w.Header().Set("Content-Type", "application/json")
	case ".png":
		w.Header().Set("Content-Type", "image/png")
	case ".jpg", ".jpeg":
		w.Header().Set("Content-Type", "image/jpeg")
	case ".gif":
		w.Header().Set("Content-Type", "image/gif")
	case ".svg":
		w.Header().Set("Content-Type", "image/svg+xml")
	case ".ico":
		w.Header().Set("Content-Type", "image/x-icon")
	case ".woff":
		w.Header().Set("Content-Type", "font/woff")
	case ".woff2":
		w.Header().Set("Content-Type", "font/woff2")
	default:
		w.Header().Set("Content-Type", "application/octet-stream")
	}

	w.Write(data)
}

// handleSync triggers a sync from GitHub
func handleSync(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		return
	}

	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	log.Println("Manual sync triggered")
	if err := syncFromGitHub(); err != nil {
		log.Printf("Sync failed: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Sync completed",
	})
}

// handleClear clears the local cache and re-syncs from GitHub
func handleClear(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	log.Println("Cache clear triggered")

	syncMutex.Lock()
	// Remove snapshots directory
	snapshotsDir := filepath.Join(timelapsePath, "snapshots")
	if err := os.RemoveAll(snapshotsDir); err != nil {
		syncMutex.Unlock()
		log.Printf("Failed to clear snapshots: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Remove index.json
	indexPath := filepath.Join(timelapsePath, "index.json")
	os.Remove(indexPath) // Ignore error if doesn't exist

	// Recreate snapshots directory
	os.MkdirAll(snapshotsDir, 0755)
	syncMutex.Unlock()

	log.Println("Cache cleared, re-syncing...")

	// Re-sync from GitHub
	if err := syncFromGitHub(); err != nil {
		log.Printf("Re-sync failed: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("cache cleared but re-sync failed: %v", err),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Cache cleared and re-synced",
	})
}

// startBackgroundSync starts periodic syncing
func startBackgroundSync(intervalStr string) {
	minutes := 30 // default
	fmt.Sscanf(intervalStr, "%d", &minutes)
	if minutes < 1 {
		return
	}

	ticker := time.NewTicker(time.Duration(minutes) * time.Minute)
	log.Printf("Background sync enabled: every %d minutes", minutes)

	for range ticker.C {
		log.Println("Background sync starting...")
		if err := syncFromGitHub(); err != nil {
			log.Printf("Background sync failed: %v", err)
		} else {
			log.Println("Background sync completed")
		}
	}
}

// syncFromGitHub fetches the latest .timelapse data from GitHub
func syncFromGitHub() error {
	syncMutex.Lock()
	defer syncMutex.Unlock()

	// Fetch index.json
	indexURL := fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/%s/.timelapse/index.json",
		githubOwner, githubRepo, githubBranch)

	log.Printf("Fetching index from: %s", indexURL)
	indexData, err := fetchURL(indexURL)
	if err != nil {
		return fmt.Errorf("failed to fetch index.json: %w", err)
	}

	// Save index.json
	indexPath := filepath.Join(timelapsePath, "index.json")
	if err := os.WriteFile(indexPath, indexData, 0644); err != nil {
		return fmt.Errorf("failed to save index.json: %w", err)
	}
	log.Println("Saved index.json")

	// Parse index to get snapshot list (index.json is a direct array)
	var snapshots []struct {
		Hash string `json:"hash"`
	}
	if err := json.Unmarshal(indexData, &snapshots); err != nil {
		return fmt.Errorf("failed to parse index.json: %w", err)
	}

	log.Printf("Found %d snapshots to sync", len(snapshots))

	// Fetch each snapshot
	for _, snapshot := range snapshots {
		if err := syncSnapshot(snapshot.Hash); err != nil {
			log.Printf("Warning: Failed to sync snapshot %s: %v", snapshot.Hash, err)
			// Continue with other snapshots
		}
	}

	return nil
}

// syncSnapshot fetches a single snapshot from GitHub
func syncSnapshot(hash string) error {
	snapshotDir := filepath.Join(timelapsePath, "snapshots", hash)

	// Check if already exists
	if _, err := os.Stat(snapshotDir); err == nil {
		log.Printf("Snapshot %s already exists, skipping", hash)
		return nil
	}

	log.Printf("Fetching snapshot: %s", hash)

	// Use GitHub API to list directory contents
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/.timelapse/snapshots/%s?ref=%s",
		githubOwner, githubRepo, hash, githubBranch)

	resp, err := http.Get(apiURL)
	if err != nil {
		return fmt.Errorf("failed to list snapshot: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("GitHub API returned %d", resp.StatusCode)
	}

	var files []struct {
		Name        string `json:"name"`
		Path        string `json:"path"`
		DownloadURL string `json:"download_url"`
		Type        string `json:"type"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&files); err != nil {
		return fmt.Errorf("failed to decode file list: %w", err)
	}

	// Create snapshot directory
	if err := os.MkdirAll(snapshotDir, 0755); err != nil {
		return fmt.Errorf("failed to create snapshot dir: %w", err)
	}

	// Download each file
	for _, file := range files {
		if file.Type != "file" {
			continue
		}

		fileData, err := fetchURL(file.DownloadURL)
		if err != nil {
			log.Printf("Warning: Failed to download %s: %v", file.Name, err)
			continue
		}

		filePath := filepath.Join(snapshotDir, file.Name)
		if err := os.WriteFile(filePath, fileData, 0644); err != nil {
			log.Printf("Warning: Failed to save %s: %v", file.Name, err)
			continue
		}
	}

	log.Printf("Synced snapshot: %s (%d files)", hash, len(files))
	return nil
}

// fetchURL fetches content from a URL
func fetchURL(url string) ([]byte, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

// handleIndex returns the index.json content
func handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	indexPath := filepath.Join(timelapsePath, "index.json")
	data, err := os.ReadFile(indexPath)
	if err != nil {
		log.Printf("Error reading index.json: %v", err)
		http.Error(w, "Failed to read index", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Write(data)
}

// handleSnapshots handles requests to /api/snapshots/{hash}/...
func handleSnapshots(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Parse the path: /api/snapshots/{hash}/{optional-path}
	path := strings.TrimPrefix(r.URL.Path, "/api/snapshots/")
	if path == "" {
		// List all snapshots
		listSnapshots(w)
		return
	}

	parts := strings.SplitN(path, "/", 2)
	hash := parts[0]

	// Validate hash (prevent directory traversal)
	if strings.Contains(hash, "..") || strings.Contains(hash, "/") {
		http.Error(w, "Invalid hash", http.StatusBadRequest)
		return
	}

	snapshotDir := filepath.Join(timelapsePath, "snapshots", hash)

	// Check if snapshot exists
	if _, err := os.Stat(snapshotDir); os.IsNotExist(err) {
		http.Error(w, "Snapshot not found", http.StatusNotFound)
		return
	}

	if len(parts) == 1 || parts[1] == "" {
		// List contents of snapshot
		listSnapshotContents(w, snapshotDir, hash)
		return
	}

	// Serve specific file
	subPath := parts[1]
	// Prevent directory traversal
	if strings.Contains(subPath, "..") {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	filePath := filepath.Join(snapshotDir, subPath)
	serveFile(w, r, filePath)
}

// listSnapshots lists all available snapshot hashes
func listSnapshots(w http.ResponseWriter) {
	snapshotsDir := filepath.Join(timelapsePath, "snapshots")
	entries, err := os.ReadDir(snapshotsDir)
	if err != nil {
		log.Printf("Error reading snapshots dir: %v", err)
		http.Error(w, "Failed to list snapshots", http.StatusInternalServerError)
		return
	}

	var snapshots []string
	for _, entry := range entries {
		if entry.IsDir() {
			snapshots = append(snapshots, entry.Name())
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"snapshots": snapshots,
	})
}

// listSnapshotContents lists files in a snapshot directory recursively
func listSnapshotContents(w http.ResponseWriter, dir, hash string) {
	var files []string

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			relPath, _ := filepath.Rel(dir, path)
			files = append(files, relPath)
		}
		return nil
	})

	if err != nil {
		log.Printf("Error walking snapshot dir: %v", err)
		http.Error(w, "Failed to list snapshot contents", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"hash":  hash,
		"files": files,
	})
}

// serveFile serves a file with appropriate content type
func serveFile(w http.ResponseWriter, r *http.Request, filePath string) {
	file, err := os.Open(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "File not found", http.StatusNotFound)
		} else {
			http.Error(w, "Failed to open file", http.StatusInternalServerError)
		}
		return
	}
	defer file.Close()

	// Get file info for content type detection
	stat, err := file.Stat()
	if err != nil {
		http.Error(w, "Failed to get file info", http.StatusInternalServerError)
		return
	}

	if stat.IsDir() {
		http.Error(w, "Cannot serve directory", http.StatusBadRequest)
		return
	}

	// Set content type based on extension
	ext := strings.ToLower(filepath.Ext(filePath))
	switch ext {
	case ".json":
		w.Header().Set("Content-Type", "application/json")
	case ".html", ".htm":
		w.Header().Set("Content-Type", "text/html")
	case ".css":
		w.Header().Set("Content-Type", "text/css")
	case ".js":
		w.Header().Set("Content-Type", "application/javascript")
	case ".png":
		w.Header().Set("Content-Type", "image/png")
	case ".jpg", ".jpeg":
		w.Header().Set("Content-Type", "image/jpeg")
	case ".gif":
		w.Header().Set("Content-Type", "image/gif")
	case ".svg":
		w.Header().Set("Content-Type", "image/svg+xml")
	default:
		w.Header().Set("Content-Type", "application/octet-stream")
	}

	io.Copy(w, file)
}
