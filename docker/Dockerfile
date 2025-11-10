# Stage 1: Base image for building
FROM node:22-alpine AS base

# Install pnpm for efficient dependency management
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml to leverage Docker cache
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build the Next.js application
FROM base AS builder

# Copy all application files
COPY . .

# Build the Next.js application for production
RUN pnpm build

# Stage 3: Production image
FROM node:22-alpine AS runner

# Set environment variables for production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Set working directory
WORKDIR /app

# Copy only the necessary build output from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Expose the default Next.js port
EXPOSE 3000

# Command to run the Next.js application in production mode
CMD ["pnpm", "start"]
