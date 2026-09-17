# 🚀 Deployment Guide - PackagePro

## Overview

This guide explains how to deploy PackagePro to different environments.

---

## 📋 Prerequisites

### For production
- ✅ Node.js 20+
- ✅ PostgreSQL 15+
- ✅ Redis 7+
- ✅ Docker & Docker Compose (optional)
- ✅ Domain name with an SSL certificate
- ✅ CDN (CloudFlare R2 or AWS S3)

### External services
- ✅ Stripe Account (for payments)
- ✅ SendGrid Account (for email)
- ✅ Sentry Account (for monitoring)
- ✅ DHL API Access (for shipping)

---

## 🐳 Deploying with Docker

### 1. Set Up Environment Variables

```bash
# Create a .env file for production
cp backend/env.example backend/.env.production

# Adjust the values:
# - DATABASE_URL
# - JWT_SECRET (use a strong value)
# - STRIPE_SECRET_KEY
# - SENDGRID_API_KEY
# - Etc...
```

### 2. Build Docker Images

```bash
# Build the Backend
docker build -t packagepro-backend:latest -f backend/Dockerfile .

# Build the Frontend
docker build -t packagepro-frontend:latest -f frontend/Dockerfile .
```

### 3. Run with Docker Compose

```bash
# Create docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Apply Database Migrations

```bash
docker exec -it packagepro-backend npx prisma migrate deploy
docker exec -it packagepro-backend npx prisma db seed
```

---

## ☁️ Deploying on AWS

### Architecture
```
┌─────────────────┐
│   CloudFront    │ ← CDN
└────────┬────────┘
         │
    ┌────┴────┐
    │   ALB   │ ← Load Balancer
    └────┬────┘
         │
    ┌────┴────────────────┐
    │                     │
┌───▼────┐         ┌─────▼──┐
│  ECS   │         │  ECS   │
│Backend │         │Frontend│
└───┬────┘         └────────┘
    │
┌───▼────┐
│  RDS   │ ← PostgreSQL
└────────┘
    │
┌───▼────┐
│ElastiCache│ ← Redis
└────────┘
```

### 1. Set Up RDS (PostgreSQL)

```bash
# Create an RDS instance
aws rds create-db-instance \
  --db-instance-identifier packagepro-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username packagepro \
  --master-user-password <strong-password> \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name packagepro-subnet-group
```

### 2. Set Up ElastiCache (Redis)

```bash
# Create a Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id packagepro-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxx
```

### 3. Set Up ECS

```bash
# Create an ECS cluster
aws ecs create-cluster --cluster-name packagepro-cluster

# Create task definitions
aws ecs register-task-definition --cli-input-json file://backend-task-def.json
aws ecs register-task-definition --cli-input-json file://frontend-task-def.json

# Create services
aws ecs create-service \
  --cluster packagepro-cluster \
  --service-name packagepro-backend \
  --task-definition packagepro-backend:1 \
  --desired-count 2 \
  --load-balancers targetGroupArn=arn:aws:...,containerName=backend,containerPort=3000
```

### 4. Set Up S3 for Files

```bash
# Create an S3 bucket
aws s3 mb s3://packagepro-files

# Set up CORS
aws s3api put-bucket-cors \
  --bucket packagepro-files \
  --cors-configuration file://s3-cors.json
```

---

## 🌐 Deploying on Vercel (Frontend only)

### 1. Install the Vercel CLI

```bash
npm install -g vercel
```

### 2. Deploy

```bash
cd frontend
vercel --prod
```

### 3. Set Up Environment Variables

In the Vercel Dashboard:
- `NEXT_PUBLIC_API_URL`: URL of the Backend
- `NEXTAUTH_URL`: URL of the Frontend
- `NEXTAUTH_SECRET`: Strong secret key

---

## 🔧 Deploying on a VPS (Ubuntu)

### 1. Set Up the Server

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2
```

### 2. Set Up PostgreSQL

```bash
sudo -u postgres psql

CREATE DATABASE packagepro;
CREATE USER packagepro WITH PASSWORD 'strong-password';
GRANT ALL PRIVILEGES ON DATABASE packagepro TO packagepro;
\q
```

### 3. Upload the Code

```bash
# Clone the project
git clone https://github.com/your-repo/packagepro.git
cd packagepro

# Backend
cd backend
npm install
cp env.example .env
# Edit .env
npm run prisma:generate
npm run prisma:migrate
npm run build

# Frontend
cd ../frontend
npm install
npm run build
```

### 4. Run with PM2

```bash
# Backend
cd backend
pm2 start npm --name "packagepro-backend" -- start

# Frontend
cd frontend
pm2 start npm --name "packagepro-frontend" -- start

# Save the configuration
pm2 save
pm2 startup
```

### 5. Set Up Nginx

```nginx
# /etc/nginx/sites-available/packagepro

# Backend
server {
    listen 80;
    server_name api.packagepro.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name packagepro.com www.packagepro.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/packagepro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Set Up SSL (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get an SSL certificate
sudo certbot --nginx -d packagepro.com -d www.packagepro.com -d api.packagepro.com

# Automatic renewal
sudo certbot renew --dry-run
```

---

## 📊 Monitoring & Logging

### 1. Set Up Sentry

```bash
# Backend
npm install @sentry/node @sentry/profiling-node

# Frontend
# Sentry is already present
```

In `.env`:
```
SENTRY_DSN=your-sentry-dsn
```

### 2. Set Up Logging

```bash
# Create a Logs folder
mkdir -p /var/log/packagepro

# Set up log rotation
sudo nano /etc/logrotate.d/packagepro
```

```
/var/log/packagepro/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 3. Set Up Monitoring

```bash
# Install monitoring tools
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions (already present)

The file `.github/workflows/ci.yml` contains:
- ✅ Automated testing
- ✅ Linting
- ✅ Building
- ✅ Security scanning

### Add Deployment

Add to `.github/workflows/ci.yml`:

```yaml
deploy:
  name: Deploy to Production
  needs: [backend-test, frontend-test]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  
  steps:
    - name: Deploy to Server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/packagepro
          git pull origin main
          cd backend && npm install && npm run build
          cd ../frontend && npm install && npm run build
          pm2 restart all
```

---

## 🔐 Security Checklist

Before deploying, make sure to:

- [ ] Change all Secrets and Passwords
- [ ] Enable HTTPS
- [ ] Set up a Firewall
- [ ] Update Dependencies
- [ ] Enable Rate Limiting
- [ ] Set up automatic Backup
- [ ] Enable Monitoring
- [ ] Review Environment Variables
- [ ] Configure CORS correctly
- [ ] Enable Security Headers

---

## 📦 Backup Strategy

### Database Backup

```bash
# Daily backup
0 2 * * * pg_dump -U packagepro packagepro | gzip > /backups/packagepro-$(date +\%Y\%m\%d).sql.gz

# Keep the last 30 backups
find /backups -name "packagepro-*.sql.gz" -mtime +30 -delete
```

### Files Backup

```bash
# Backup uploaded files
0 3 * * * tar -czf /backups/files-$(date +\%Y\%m\%d).tar.gz /var/www/packagepro/uploads
```

---

## 🆘 Troubleshooting

### Backend is not working

```bash
# Check the Logs
pm2 logs packagepro-backend

# Restart
pm2 restart packagepro-backend

# Check the database
psql -U packagepro -d packagepro -c "SELECT 1"
```

### Frontend is not working

```bash
# Check the Logs
pm2 logs packagepro-frontend

# Rebuild
cd frontend
npm run build
pm2 restart packagepro-frontend
```

### Database Issues

```bash
# Check the connection
psql -U packagepro -d packagepro

# Re-apply Migrations
cd backend
npm run prisma:migrate deploy
```

---

## 📞 Support

For help with deployment:
- Review `PROJECT_REVIEW.md`
- Review `ACTION_PLAN.md`
- Check the Logs in `/var/log/packagepro`

---

**Note:** This guide covers the basic scenarios. You may need to customize it for your environment.