#!/bin/bash

echo "🚀 Starting Sora Video Studio..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run 'npm run setup' first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo "❌ Dependencies not installed. Please run 'npm run install:all' first."
    exit 1
fi

echo "✅ Starting backend and frontend servers..."
npm run dev

