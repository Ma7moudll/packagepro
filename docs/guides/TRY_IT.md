# Try PackagePro - Try It! 🚀

## Quick Start Steps

### 1. Install Dependencies ✅
Installed successfully!

### 2. Generate Prisma Client ✅
Generated successfully!

### 3. Run the Server

#### Quick method:
```bash
cd backend
npm run dev
```

The server will run on: `http://localhost:3000`

### 4. Test the System

Open a new terminal and test:

#### a) Test the Health Check:
```bash
curl http://localhost:3000/health
```

#### b) Test API Info:
```bash
curl http://localhost:3000/api
```

#### c) Test Pricing:
```bash
curl http://localhost:3000/api/pricing/materials
```

#### d) Register a new account:
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

#### e) Log in:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Important Notes

⚠️ **Database**: 
- The system needs a database (PostgreSQL or SQLite)
- You can edit `prisma/schema.prisma` to use SQLite for a quick trial

⚠️ **Redis**: 
- Optional - the system will run without it (some features may not work)

⚠️ **External services**:
- Stripe, DHL, and SendGrid are optional for testing
- The system will work without them, but some features will be limited

## Next Steps

1. **Run the server**: `cd backend && npm run dev`
2. **Test the Health Check**: open `http://localhost:3000/health` in your browser
3. **Try the APIs**: use curl or Postman

## Expected Issues

### Database error
- Edit `DATABASE_URL` in `.env` or use SQLite

### Redis error
- No problem! The system will work without Redis

### Port 3000 is in use
- Change PORT in `.env` to another number

## Helpful Files

- `backend/test-api.js` - A simple test script
- `backend/QUICK_START.md` - The complete startup guide

**Ready to start! 🎉**