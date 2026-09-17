# Production Deployment Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis (optional)
- Docker & Docker Compose (recommended)

## Production Setup

### 1. Environment Variables

Create a `.env.production` file:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/packagepro?schema=public

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# Redis (optional)
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

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
```

### 2. Database Setup

#### Using Docker Compose:

```bash
docker-compose up -d postgres
```

#### Manually:

```bash
# Create database
createdb packagepro

# Run migrations
cd backend
npm run prisma:migrate deploy

# Seed initial data
npm run prisma:seed
```

### 3. Build and run the Backend

#### Using Docker:

```bash
docker-compose up -d backend
```

#### Manually:

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

### 4. Build and run the Frontend

#### Using Docker:

```bash
docker-compose up -d frontend
```

#### Manually:

```bash
cd frontend

# Install dependencies
npm ci --production

# Build
npm run build

# Start
npm start
```

### 5. Using Full Docker Compose

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

Use a reverse proxy such as Nginx with Let's Encrypt:

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

Use a cron job:

```bash
0 2 * * * pg_dump -U packagepro packagepro | gzip > /backups/packagepro_$(date +\%Y\%m\%d).sql.gz
```

## Scaling

### Horizontal Scaling

- Use a load balancer (Nginx, AWS ELB)
- Run multiple Backend instances
- Use Redis for shared sessions

### Database Scaling

- Use connection pooling
- Set up read replicas for read-only access
- Consider sharding for large datasets

## Security Checklist

- ✅ Change all secrets in `.env`
- ✅ Enable HTTPS
- ✅ Set up a firewall
- ✅ Update dependencies regularly
- ✅ Set up rate limiting
- ✅ Review logs regularly
- ✅ Set up monitoring alerts

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

