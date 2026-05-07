# syntax=docker/dockerfile:1.7

# --- deps stage: install only production deps ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# --- runtime stage ---
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=5001
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure the leads data dir exists and is writable by the non-root user.
# In compose this is a bind/named volume; the chown lets the `node` user write to it.
RUN mkdir -p /app/data && chown -R node:node /app

USER node
EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "index.js"]
