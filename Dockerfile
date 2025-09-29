# syntax=docker/dockerfile:1

# Base image
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# ---------- Development image ----------
FROM base AS dev
ENV NODE_ENV=development

# Install dependencies (including devDeps)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

EXPOSE 3000
# Use the dev script with file watching
CMD ["npm", "run", "dev"]

# ---------- Production image ----------
FROM base AS prod
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
