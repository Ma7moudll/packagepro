# 🚀 Running PackagePro Backend

## Quick Steps

### 1. Install Dependencies (done ✅)
```bash
npm install
```

### 2. Generate Prisma Client (done ✅)
```bash
npm run prisma:generate
```

### 3. Start the Server
```bash
npm run dev
```

The server will run at: **http://localhost:3000**

## Quick Test

### In a new terminal:

```bash
# Health Check
curl http://localhost:3000/health

# API Info
curl http://localhost:3000/api

# Materials
curl http://localhost:3000/api/pricing/materials
```

## Available Files

- `src/index.ts` - Main server
- `QUICK_START.md` - Comprehensive guide
- `env.example` - Example environment file

## Notes

- **Database**: Requires PostgreSQL or SQLite
- **Redis**: Optional - the system will work without it
- **Port**: Default 3000 (can be changed in .env)

**Ready to go! 🎉**
