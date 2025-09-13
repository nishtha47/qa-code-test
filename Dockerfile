# Use official Node.js runtime as base image
FROM node:18-bullseye-slim

# Set working directory
WORKDIR /app

# Install system dependencies for Playwright and headless operation
RUN apt-get update && apt-get install -y \
    curl wget gnupg ca-certificates fonts-liberation \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
    libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
    libxss1 libxtst6 lsb-release xdg-utils xvfb x11-utils x11-xserver-utils nginx \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production --prefer-offline --no-audit

# Install Playwright browsers
RUN npx playwright install --with-deps

# Copy project files
COPY . .

# Create necessary directories
RUN mkdir -p reports/screenshots reports/videos reports/extent allure-results src/features/support/reports \
    && chmod -R 755 reports src/features/support

# Copy NGINX config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Set environment variables
ENV HEADLESS=true
ENV NODE_ENV=production
ENV DISPLAY=:99
ENV CHROME_BIN=/usr/bin/google-chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# Expose ports
EXPOSE 3000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Container is healthy')" || exit 1

# Default command: run tests, generate Spark-style HTML report, and start NGINX
CMD sh -c "\
    npm run test:ci && \
    node generate-report.js && \
    cp -r reports/extent/* /usr/share/nginx/html && \
    nginx -g 'daemon off;' \
"

# Labels for better container management
LABEL maintainer="nishtha"
LABEL version="1.1.0"
LABEL description="Parabank Automation Testing Container"
LABEL project="cucumber-playwright-javascript"
