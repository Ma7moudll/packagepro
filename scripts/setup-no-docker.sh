#!/bin/bash

# PackagePro Setup Script (Without Docker)
# This script sets up the development environment without requiring Docker

set -e  # Exit on error

echo "🚀 PackagePro Setup Script (No Docker)"
echo "========================================"
echo ""

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}📦 $1${NC}"
}

# Step 1: Setup Backend Environment
echo ""
print_step "Step 1: Setting up Backend environment..."
cd backend

if [ ! -f .env ]; then
    print_info "Creating .env file from .env.development..."
    cp .env.development .env
    print_success ".env file created"
    
    print_info "⚠️  IMPORTANT: Please update the following in backend/.env:"
    echo "   - DATABASE_URL (if using external PostgreSQL)"
    echo "   - REDIS_URL (if using external Redis)"
    echo "   - JWT_SECRET (use a strong secret)"
else
    print_info ".env file already exists"
fi

# Step 2: Install Backend Dependencies
echo ""
print_step "Step 2: Installing Backend dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Backend dependencies installed"
else
    print_info "Backend dependencies already installed (skipping)"
fi

# Step 3: Setup Database (if available)
echo ""
print_step "Step 3: Setting up database..."

# Check if PostgreSQL is available
if command -v psql &> /dev/null; then
    print_info "PostgreSQL found. Attempting to setup database..."
    
    # Generate Prisma Client
    echo "Generating Prisma Client..."
    npm run prisma:generate
    print_success "Prisma Client generated"
    
    # Try to run migrations
    echo "Running database migrations..."
    if npm run prisma:migrate 2>/dev/null; then
        print_success "Database migrations applied"
        
        # Try to seed
        echo "Seeding database..."
        if npm run prisma:seed 2>/dev/null; then
            print_success "Database seeded"
        else
            print_info "Seeding skipped (may need manual setup)"
        fi
    else
        print_error "Migration failed. Please ensure PostgreSQL is running and DATABASE_URL is correct."
        print_info "You can manually run: cd backend && npm run prisma:migrate"
    fi
else
    print_error "PostgreSQL not found!"
    echo ""
    print_info "Please install PostgreSQL or start Docker:"
    echo "   Option 1: Install PostgreSQL locally"
    echo "     brew install postgresql@15"
    echo "     brew services start postgresql@15"
    echo ""
    echo "   Option 2: Use Docker"
    echo "     docker-compose up -d postgres redis"
    echo ""
    print_info "Then run: cd backend && npm run prisma:migrate"
fi

# Step 4: Setup Frontend Environment
echo ""
print_step "Step 4: Setting up Frontend environment..."
cd ../frontend

if [ ! -f .env.local ]; then
    print_info "Creating .env.local file..."
    cp .env.local.example .env.local
    print_success ".env.local file created"
else
    print_info ".env.local file already exists"
fi

# Step 5: Install Frontend Dependencies
echo ""
print_step "Step 5: Installing Frontend dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Frontend dependencies installed"
else
    print_info "Frontend dependencies already installed (skipping)"
fi

# Final Steps
echo ""
echo "✨ Setup Complete!"
echo "=================="
echo ""

# Check if database is ready
cd ../backend
if npm run prisma:generate &>/dev/null; then
    print_success "Database is ready!"
    echo ""
    print_info "To start the development servers:"
    echo ""
    echo "  Terminal 1 (Backend):"
    echo "    cd backend && npm run dev"
    echo ""
    echo "  Terminal 2 (Frontend):"
    echo "    cd frontend && npm run dev"
    echo ""
    print_success "Backend will be at: http://localhost:3000"
    print_success "Frontend will be at: http://localhost:3001"
else
    print_error "Database not ready!"
    echo ""
    print_info "Next steps:"
    echo "  1. Ensure PostgreSQL is running"
    echo "  2. Update backend/.env with correct DATABASE_URL"
    echo "  3. Run: cd backend && npm run prisma:migrate"
    echo "  4. Run: cd backend && npm run prisma:seed"
    echo ""
    print_info "Then start the servers:"
    echo "  Terminal 1: cd backend && npm run dev"
    echo "  Terminal 2: cd frontend && npm run dev"
fi

echo ""
print_info "To view the database:"
echo "    cd backend && npm run prisma:studio"
echo ""
print_info "Check PROJECT_REVIEW.md and ACTION_PLAN.md for next steps"
echo ""
