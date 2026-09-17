# Quick Start Guide - PackagePro

## Quick Setup Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up the Database

#### Option 1: Use SQLite (for quick testing)

Edit `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

Then run:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

#### Option 2: Use PostgreSQL (for production)

1. Ensure PostgreSQL is installed
2. Create a database:
```sql
CREATE DATABASE packagepro;
```

3. Update `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/packagepro?schema=public"
```

4. Run:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 3. Set Up Redis (optional for testing)

Redis is optional for testing. The system will work without Redis but some features may not function:
- Sessions
- Background Jobs
- Caching

To install Redis:
```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

### 4. Configure the .env File

Copy `env.example` to `.env`:
```bash
cp env.example .env
```

Update the required values (you can leave most of them empty for testing).

### 5. Start the Server

```bash
npm run dev
```

The server will run at: `http://localhost:3000`

### 6. Test the System

#### Health Check:
```bash
curl http://localhost:3000/health
```

#### Test API:
```bash
curl http://localhost:3000/api
```

#### Register a New Account:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 7. Start Frontend (optional)

```bash
cd ../frontend
npm install
npm run dev
```

Frontend will run at: `http://localhost:3001`

## Notes

- Some features require external services (Stripe, DHL, SendGrid) - you can leave them empty for testing
- Redis is optional - the system will work without it
- For quick testing, use SQLite instead of PostgreSQL

## Common Issues

### Database Connection Error
- Ensure PostgreSQL is running or use SQLite
- Check `DATABASE_URL` in `.env`

### Redis Error
- You can stop Redis - the system will work without it (some features may not function)

### Port 3000 Error
- Change `PORT` in `.env` to a different number
