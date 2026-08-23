#!/bin/bash
# Local development server for CITAM Buruburu with Decap CMS
# Starts CMS local backend + static file server

set -e

PORT=8000
CMS_PORT=8081

echo "========================================"
echo " CITAM Buruburu — Local Dev Server"
echo "========================================"
echo ""

echo "Starting Decap CMS local backend on port $CMS_PORT..."
npx decap-server > /tmp/decap-server.log 2>&1 &
CMS_PID=$!
echo "  PID: $CMS_PID"
echo ""

sleep 2

echo "Starting static file server on http://localhost:$PORT"
echo ""
echo "========================================"
echo " OPEN THESE URLS:"
echo "========================================"
echo "  Site:      http://localhost:$PORT/"
echo "  Events:    http://localhost:$PORT/events.html"
echo "  CMS Admin: http://localhost:$PORT/admin/"
echo ""
echo "========================================"
echo " LOCAL CMS LOGIN:"
echo "========================================"
echo "  No credentials needed for local testing."
echo "  Just open http://localhost:$PORT/admin/ and start editing events."
echo ""
echo " Press Ctrl+C to stop both servers"
echo "========================================"
echo ""

cleanup() {
  echo ""
  echo "Stopping servers..."
  kill $CMS_PID 2>/dev/null || true
  wait $CMS_PID 2>/dev/null || true
  echo "Servers stopped."
  exit 0
}

trap cleanup INT TERM EXIT

python3 -m http.server $PORT
