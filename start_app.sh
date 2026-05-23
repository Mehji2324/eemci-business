#!/bin/bash

# Navigate to the project directory
cd "$(dirname "$0")"

echo "🚀 Starting EEMCI Platform..."

# Start containers in the background
podman-compose up -d

# Wait a few seconds for the server to be ready
echo "⏳ Waiting for the server to start..."
sleep 2

# Open the project in the default browser
echo "🌐 Opening the application..."
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:5001
elif command -v open > /dev/null; then
    open http://localhost:5001
else
    echo "Please open http://localhost:5001 in your browser."
fi

echo "✅ Done!"
