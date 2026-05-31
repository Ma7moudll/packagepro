# Backend Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./
RUN npm ci

# Generate Prisma Client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app/backend

COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend/ ./

# Generate Prisma Client again for build
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app/backend

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy necessary files
COPY --from=builder --chown=nodejs:nodejs /app/backend/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/backend/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/backend/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/backend/prisma ./prisma

# Generate Prisma Client for production
RUN npx prisma generate

USER nodejs

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0

# Start the server
CMD ["node", "dist/index.js"]

