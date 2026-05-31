# Production Deployment Guide

## المتطلبات الأساسية

- Node.js 20+
- PostgreSQL 15+
- Redis (اختياري)
- Docker & Docker Compose (موصى به)

## إعداد الإنتاج

### 1. Environment Variables

قم بإنشاء ملف `.env.production`:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/packagepro?schema=public

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# Redis (اختياري)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true

# Server
PORT=3000
NODE_ENV=production
HOST=0.0.0.0

# Frontend
FRONTEND_URL=https://your-domain.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# DHL Express
DHL_API_KEY=your-dhl-api-key
DHL_API_SECRET=your-dhl-secret
DHL_ACCOUNT_NUMBER=your-account-number

# Email Service
EMAIL_PROVIDER=sendgrid # or 'ses'
SENDGRID_API_KEY=your-sendgrid-key
AWS_SES_REGION=us-east-1

# File Storage
STORAGE_PROVIDER=s3 # or 'r2'
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=packagepro-uploads
AWS_REGION=us-east-1

# Exchange Rate API
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4

# Monitoring (اختياري)
SENTRY_DSN=your-sentry-dsn
```

### 2. Database Setup

#### باستخدام Docker Compose:

```bash
docker-compose up -d postgres
```

#### يدوياً:

```bash
# Create database
createdb packagepro

# Run migrations
cd backend
npm run prisma:migrate deploy

# Seed initial data
npm run prisma:seed
```

### 3. بناء وتشغيل Backend

#### باستخدام Docker:

```bash
docker-compose up -d backend
```

#### يدوياً:

```bash
cd backend

# Install dependencies
npm ci --production

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npx prisma migrate deploy

# Build
npm run build

# Start
npm start
```

### 4. بناء وتشغيل Frontend

#### باستخدام Docker:

```bash
docker-compose up -d frontend
```

#### يدوياً:

```bash
cd frontend

# Install dependencies
npm ci --production

# Build
npm run build

# Start
npm start
```

### 5. استخدام Docker Compose الكامل

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Monitoring & Logging

### Health Checks

- Backend: `http://localhost:3000/health`
- Frontend: `http://localhost:3001`

### Logs

```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# All logs
docker-compose logs -f
```

## SSL/HTTPS

استخدم reverse proxy مثل Nginx مع Let's Encrypt:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Backup Strategy

### Database Backup

```bash
# Daily backup script
pg_dump -U packagepro packagepro > backup_$(date +%Y%m%d).sql

# Restore
psql -U packagepro packagepro < backup_20241128.sql
```

### Automated Backups

استخدم cron job:

```bash
0 2 * * * pg_dump -U packagepro packagepro | gzip > /backups/packagepro_$(date +\%Y\%m\%d).sql.gz
```

## Scaling

### Horizontal Scaling

- استخدم load balancer (Nginx, AWS ELB)
- قم بتشغيل عدة instances من Backend
- استخدم Redis للـ sessions المشتركة

### Database Scaling

- استخدم connection pooling
- قم بإعداد read replicas للقراءة فقط
- فكر في sharding للبيانات الكبيرة

## Security Checklist

- ✅ قم بتغيير جميع secrets في `.env`
- ✅ قم بتفعيل HTTPS
- ✅ قم بإعداد firewall
- ✅ قم بتحديث dependencies بانتظام
- ✅ قم بإعداد rate limiting
- ✅ قم بمراجعة logs بانتظام
- ✅ قم بإعداد monitoring alerts

## Troubleshooting

### Database Connection Issues

```bash
# Check connection
psql -U packagepro -h localhost -d packagepro

# Check migrations
cd backend
npx prisma migrate status
```

### Redis Issues

```bash
# Test Redis connection
redis-cli ping
```

### Build Issues

```bash
# Clear cache and rebuild
rm -rf node_modules
npm ci
npm run build
```

