#!/bin/bash

echo "Starting Social Tennis..."

# Go to client folder (same as cd /d "%~dp0client")
cd "$(dirname "$0")/client" || exit

# Start dev server
npm run dev &

# Wait a few seconds
sleep 3

# Open browser
open http://localhost:5173