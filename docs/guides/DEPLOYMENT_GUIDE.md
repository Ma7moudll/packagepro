# 🚀 دليل النشر - PackagePro Deployment Guide

## نظرة عامة

هذا الدليل يشرح كيفية نشر PackagePro على بيئات مختلفة.

---

## 📋 المتطلبات الأساسية

### للإنتاج
- ✅ Node.js 20+
- ✅ PostgreSQL 15+
- ✅ Redis 7+
- ✅ Docker & Docker Compose (اختياري)
- ✅ Domain name مع SSL certificate
- ✅ CDN (CloudFlare R2 أو AWS S3)

### الخدمات الخارجية
- ✅ Stripe Account (للمدفوعات)
- ✅ SendGrid Account (للبريد الإلكتروني)
- ✅ Sentry Account (للمراقبة)
- ✅ DHL API Access (للشحن)

---

## 🐳 النشر باستخدام Docker

### 1. إعداد Environment Variables

```bash
# إنشاء ملف .env للإنتاج
cp backend/env.example backend/.env.production

# تعديل القيم:
# - DATABASE_URL
# - JWT_SECRET (استخدم قيمة قوية)
# - STRIPE_SECRET_KEY
# - SENDGRID_API_KEY
# - إلخ...
```

### 2. بناء Docker Images

```bash
# بناء Backend
docker build -t packagepro-backend:latest -f backend/Dockerfile .

# بناء Frontend
docker build -t packagepro-frontend:latest -f frontend/Dockerfile .
```

### 3. تشغيل باستخدام Docker Compose

```bash
# إنشاء docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d
```

### 4. تطبيق Database Migrations

```bash
docker exec -it packagepro-backend npx prisma migrate deploy
docker exec -it packagepro-backend npx prisma db seed
```

---

## ☁️ النشر على AWS

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

### 1. إعداد RDS (PostgreSQL)

```bash
# إنشاء RDS instance
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

### 2. إعداد ElastiCache (Redis)

```bash
# إنشاء Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id packagepro-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxx
```

### 3. إعداد ECS

```bash
# إنشاء ECS cluster
aws ecs create-cluster --cluster-name packagepro-cluster

# إنشاء task definitions
aws ecs register-task-definition --cli-input-json file://backend-task-def.json
aws ecs register-task-definition --cli-input-json file://frontend-task-def.json

# إنشاء services
aws ecs create-service \
  --cluster packagepro-cluster \
  --service-name packagepro-backend \
  --task-definition packagepro-backend:1 \
  --desired-count 2 \
  --load-balancers targetGroupArn=arn:aws:...,containerName=backend,containerPort=3000
```

### 4. إعداد S3 للملفات

```bash
# إنشاء S3 bucket
aws s3 mb s3://packagepro-files

# إعداد CORS
aws s3api put-bucket-cors \
  --bucket packagepro-files \
  --cors-configuration file://s3-cors.json
```

---

## 🌐 النشر على Vercel (Frontend فقط)

### 1. تثبيت Vercel CLI

```bash
npm install -g vercel
```

### 2. النشر

```bash
cd frontend
vercel --prod
```

### 3. إعداد Environment Variables

في Vercel Dashboard:
- `NEXT_PUBLIC_API_URL`: URL للـ Backend
- `NEXTAUTH_URL`: URL للـ Frontend
- `NEXTAUTH_SECRET`: Secret key قوي

---

## 🔧 النشر على VPS (Ubuntu)

### 1. إعداد السيرفر

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# تثبيت PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# تثبيت Redis
sudo apt install -y redis-server

# تثبيت Nginx
sudo apt install -y nginx

# تثبيت PM2
sudo npm install -g pm2
```

### 2. إعداد PostgreSQL

```bash
sudo -u postgres psql

CREATE DATABASE packagepro;
CREATE USER packagepro WITH PASSWORD 'strong-password';
GRANT ALL PRIVILEGES ON DATABASE packagepro TO packagepro;
\q
```

### 3. رفع الكود

```bash
# استنساخ المشروع
git clone https://github.com/your-repo/packagepro.git
cd packagepro

# Backend
cd backend
npm install
cp env.example .env
# عدّل .env
npm run prisma:generate
npm run prisma:migrate
npm run build

# Frontend
cd ../frontend
npm install
npm run build
```

### 4. تشغيل باستخدام PM2

```bash
# Backend
cd backend
pm2 start npm --name "packagepro-backend" -- start

# Frontend
cd frontend
pm2 start npm --name "packagepro-frontend" -- start

# حفظ التكوين
pm2 save
pm2 startup
```

### 5. إعداد Nginx

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
# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/packagepro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. إعداد SSL (Let's Encrypt)

```bash
# تثبيت Certbot
sudo apt install -y certbot python3-certbot-nginx

# الحصول على SSL certificate
sudo certbot --nginx -d packagepro.com -d www.packagepro.com -d api.packagepro.com

# التجديد التلقائي
sudo certbot renew --dry-run
```

---

## 📊 Monitoring & Logging

### 1. إعداد Sentry

```bash
# Backend
npm install @sentry/node @sentry/profiling-node

# Frontend
# Sentry موجود بالفعل
```

في `.env`:
```
SENTRY_DSN=your-sentry-dsn
```

### 2. إعداد Logging

```bash
# إنشاء مجلد Logs
mkdir -p /var/log/packagepro

# إعداد Log rotation
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

### 3. إعداد Monitoring

```bash
# تثبيت monitoring tools
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions (موجود بالفعل)

الملف `.github/workflows/ci.yml` يحتوي على:
- ✅ Automated testing
- ✅ Linting
- ✅ Building
- ✅ Security scanning

### إضافة Deployment

أضف إلى `.github/workflows/ci.yml`:

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

قبل النشر، تأكد من:

- [ ] تغيير جميع Secrets و Passwords
- [ ] تفعيل HTTPS
- [ ] إعداد Firewall
- [ ] تحديث Dependencies
- [ ] تفعيل Rate Limiting
- [ ] إعداد Backup التلقائي
- [ ] تفعيل Monitoring
- [ ] مراجعة Environment Variables
- [ ] إعداد CORS بشكل صحيح
- [ ] تفعيل Security Headers

---

## 📦 Backup Strategy

### Database Backup

```bash
# Backup يومي
0 2 * * * pg_dump -U packagepro packagepro | gzip > /backups/packagepro-$(date +\%Y\%m\%d).sql.gz

# الاحتفاظ بآخر 30 backup
find /backups -name "packagepro-*.sql.gz" -mtime +30 -delete
```

### Files Backup

```bash
# Backup الملفات المرفوعة
0 3 * * * tar -czf /backups/files-$(date +\%Y\%m\%d).tar.gz /var/www/packagepro/uploads
```

---

## 🆘 Troubleshooting

### Backend لا يعمل

```bash
# التحقق من Logs
pm2 logs packagepro-backend

# إعادة التشغيل
pm2 restart packagepro-backend

# التحقق من قاعدة البيانات
psql -U packagepro -d packagepro -c "SELECT 1"
```

### Frontend لا يعمل

```bash
# التحقق من Logs
pm2 logs packagepro-frontend

# إعادة البناء
cd frontend
npm run build
pm2 restart packagepro-frontend
```

### Database Issues

```bash
# التحقق من الاتصال
psql -U packagepro -d packagepro

# إعادة تطبيق Migrations
cd backend
npm run prisma:migrate deploy
```

---

## 📞 الدعم

للمساعدة في النشر:
- راجع `PROJECT_REVIEW.md`
- راجع `ACTION_PLAN.md`
- تحقق من Logs في `/var/log/packagepro`

---

**ملاحظة:** هذا الدليل يغطي السيناريوهات الأساسية. قد تحتاج إلى تخصيص حسب بيئتك.
