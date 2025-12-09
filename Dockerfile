# =============================================================================
# Multi-stage Dockerfile for "Mêlée du Numérique Timelapse" application
# Stage 1: Build React frontend
# Stage 2: Build Go API with embedded frontend
# Stage 3: Minimal runtime image
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build the React frontend
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/timelapse

# Copy package files first for better layer caching
COPY timelapse/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY timelapse/ ./

# Build the production bundle
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Build the Go API with embedded static files
# -----------------------------------------------------------------------------
FROM golang:1.23-alpine AS api-builder

WORKDIR /app

# Install git (needed for go modules that reference git repos)
RUN apk add --no-cache git

# Copy API source code
COPY api/*.go ./

# Create static directory and copy built frontend
COPY --from=frontend-builder /app/timelapse/dist ./static/

# Build the Go binary
# CGO_ENABLED=0 for static binary, -ldflags for smaller binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /timelapse-server .

# -----------------------------------------------------------------------------
# Stage 3: Minimal runtime image
# -----------------------------------------------------------------------------
FROM alpine:3.19

# Add ca-certificates for HTTPS requests (GitHub API)
# Add tzdata for timezone support
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy the binary from builder
COPY --from=api-builder /timelapse-server .

# Create data directory for snapshots
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/index || exit 1

# Environment variables with defaults
ENV PORT=8080 \
    GIN_MODE=release

# Run the server
ENTRYPOINT ["./timelapse-server"]
