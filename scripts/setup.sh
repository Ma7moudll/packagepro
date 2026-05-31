#!/bin/bash

# PackagePro Setup Script
# This script will set up the development environment

set -e  # Exit on error

echo "🚀 PackagePro Setup Script"
echo "=========================="
echo ""

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if Docker is running
echo "Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi
print_success "Docker is running"

# Step 1: Setup Backend Environment
echo ""
echo "📦 Step 1: Setting up Backend environment..."
cd backend

if [ ! -f .env ]; then
    print_info "Creating .env file from .env.development..."
    cp .env.development .env
    print_success ".env file created"
else
    print_info ".env file already exists"
fi

# Step 2: Install Backend Dependencies
echo ""
echo "📦 Step 2: Installing Backend dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Backend dependencies installed"
else
    print_info "Backend dependencies already installed"
fi

# Step 3: Start Docker Services
echo ""
echo "🐳 Step 3: Starting Docker services (PostgreSQL & Redis)..."
cd ..
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 10
print_success "Docker services started"

# Step 4: Setup Database
echo ""
echo "🗄️  Step 4: Setting up database..."
cd backend

# Generate Prisma Client
echo "Generating Prisma Client..."
npm run prisma:generate
print_success "Prisma Client generated"

# Run Migrations
echo "Running database migrations..."
npm run prisma:migrate || {
    print_error "Migration failed. This might be because the database already exists."
    print_info "Trying to push schema instead..."
    npx prisma db push
}
print_success "Database schema applied"

# Seed Database
echo "Seeding database with initial data..."
npm run prisma:seed || print_info "Seeding skipped (might already be seeded)"
print_success "Database setup complete"

# Step 5: Setup Frontend Environment
echo ""
echo "🎨 Step 5: Setting up Frontend environment..."
cd ../frontend

if [ ! -f .env.local ]; then
    print_info "Creating .env.local file..."
    cp .env.local.example .env.local
    print_success ".env.local file created"
else
    print_info ".env.local file already exists"
fi

# Step 6: Install Frontend Dependencies
echo ""
echo "📦 Step 6: Installing Frontend dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Frontend dependencies installed"
else
    print_info "Frontend dependencies already installed"
fi

# Final Steps
echo ""
echo "✨ Setup Complete!"
echo "=================="
echo ""
print_success "Backend is ready at: http://localhost:3000"
print_success "Frontend is ready at: http://localhost:3001"
echo ""
echo "To start the development servers:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo "To view the database:"
echo "    cd backend && npm run prisma:studio"
echo ""
print_info "Check PROJECT_REVIEW.md and ACTION_PLAN.md for next steps"
echo ""
