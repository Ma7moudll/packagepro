# Frontend Dockerfile
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app/frontend

COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend/ ./
# The unified catalogue is shared source outside the frontend directory.
COPY shared/ /app/shared/
# Pure F42 review validator imported by the browser export module.
COPY backend/src/modules/designs/artwork-review-contract.ts /app/backend/src/modules/designs/artwork-review-contract.ts
# Pure scoped thank-you-card preview contract, no database/service imports.
COPY backend/src/modules/catalog/thank-you-preview.ts /app/backend/src/modules/catalog/thank-you-preview.ts

# Pure loyalty-card preview contract, no database/service imports.
COPY backend/src/modules/catalog/loyalty-preview.ts /app/backend/src/modules/catalog/loyalty-preview.ts

# Pure stand-up-pouch artwork surface safety contract.
COPY backend/src/modules/catalog/pouch-preview-contract.ts /app/backend/src/modules/catalog/pouch-preview-contract.ts

# Pure frosted ziplock artwork surface safety contract.
COPY backend/src/modules/catalog/ziplock-preview.ts /app/backend/src/modules/catalog/ziplock-preview.ts

# Pure menu-card preview and unsupported-artwork contract.
COPY backend/src/modules/catalog/menu-preview.ts /app/backend/src/modules/catalog/menu-preview.ts

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:3000}

# Build Next.js
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app/frontend

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

