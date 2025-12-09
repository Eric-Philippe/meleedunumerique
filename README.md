# meleedunumerique

## Timelapse API

A lightweight Go API for serving timelapse snapshot data.

## Routes

| Method | Endpoint                   | Description                              |
| ------ | -------------------------- | ---------------------------------------- |
| GET    | `/`                        | API info and available routes            |
| GET    | `/index`                   | Returns the timelapse index.json content |
| GET    | `/snapshots/`              | Lists all available snapshot hashes      |
| GET    | `/snapshots/{hash}`        | Lists all files in a specific snapshot   |
| GET    | `/snapshots/{hash}/{path}` | Returns the content of a specific file   |

## Environment Variables

| Variable         | Default      | Description                     |
| ---------------- | ------------ | ------------------------------- |
| `PORT`           | `8080`       | Port to listen on               |
| `TIMELAPSE_PATH` | `.timelapse` | Path to the timelapse directory |

## Running Locally

```bash
# From the repository root
cd api
go run main.go

# Or with custom path
TIMELAPSE_PATH=../.timelapse go run main.go
```

## Docker

### Build

```bash
docker build -t timelapse-api .
```

### Run

```bash
# Mount the .timelapse directory
docker run -p 8080:8080 -v $(pwd)/../.timelapse:/data -e TIMELAPSE_PATH=/data timelapse-api
```

## Example Usage

```bash
# Get API info
curl http://localhost:8080/

# Get timelapse index
curl http://localhost:8080/index

# List all snapshots
curl http://localhost:8080/snapshots/

# List files in a snapshot
curl http://localhost:8080/snapshots/f22718c

# Get a specific file (e.g., screenshot)
curl http://localhost:8080/snapshots/f22718c/screenshot.png --output screenshot.png

# Get HTML file from snapshot
curl http://localhost:8080/snapshots/f22718c/website_test/index.html
```

## Snapshot content structure

`.timelapse/` contains snapshot data organized by commit hash:

```
.timelapse/
├── index.json
├── snapshots/
│   ├── f22718c/
│   │   ├── screenshot.png
│   │   └── target/
│   │       ├── index.html
│   │       ├── script.js
│   │       └── styles.css
│   └── a1b2c3d/
│       ├── screenshot.png
│       └── target/
│           ├── index.html
│           ├── script.js
│           └── styles.css
```

`index.json` contains metadata about snapshots for quick access.
`capture.js` is used to capture snapshots from the target website during sync (GitHub Action).

## GitHub Action

timelapse.yml
.timelapse.json

## Deployment

Dockerfile
.dockerignore
