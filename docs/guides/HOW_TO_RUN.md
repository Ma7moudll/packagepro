# How to Run PackagePro 🚀

## ✅ Quick Steps

### 1. Install Dependencies (done ✅)
```bash
cd backend
npm install
```

### 2. Generate Prisma Client (done ✅)
```bash
npm run prisma:generate
```

### 3. Run the Server 🚀

#### Method 1: Using the startup script
```bash
cd /Users/mac/packagepro
./START_SERVER.sh
```

#### Method 2: Directly
```bash
cd backend
npm run dev
```

### 4. Test the System

Open a new terminal and test:

#### ✅ Health Check:
```bash
curl http://localhost:3000/health
```

#### ✅ API Info:
```bash
curl http://localhost:3000/api
```

#### ✅ Pricing Materials:
```bash
curl http://localhost:3000/api/pricing/materials
```

#### ✅ Register User:
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

## 📝 Notes

⚠️ **Database**: The system needs a database. You can:
- Use SQLite for a quick trial (edit `schema.prisma`)
- Or use PostgreSQL for production

⚠️ **Redis**: Optional - the system will work without it

⚠️ **External services**: Stripe, DHL, and SendGrid are optional for testing

## 🎯 Available Endpoints

After starting the server, you will find:

- `GET /health` - Health check
- `GET /api` - API info
- `GET /api/pricing/materials` - Materials list
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- ... and more than 60 other endpoints!

## 📚 For More Information

- `backend/QUICK_START.md` - The complete startup guide
- `TRY_IT.md` - The steps to try it out
- `docs/api/ENDPOINTS.md` - All the APIs

**Ready to start! 🎉**