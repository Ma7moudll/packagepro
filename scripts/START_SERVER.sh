#!/bin/bash

echo "🚀 Starting PackagePro Backend Server..."
echo ""

cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Generate Prisma client if not done
if [ ! -d "node_modules/@prisma/client" ]; then
  echo "⚙️  Generating Prisma client..."
  npm run prisma:generate
fi

echo ""
echo "✨ Starting development server..."
echo "   Server will be available at: http://localhost:3000"
echo "   Health check: http://localhost:3000/health"
echo "   API info: http://localhost:3000/api"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

npm run dev
