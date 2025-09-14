# Use official Node.js runtime as base image
FROM node:18-bullseye-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for Playwright and headless browsers
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl unzip gnupg ca-certificates git sudo xvfb x11-utils x11-xserver-utils \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
    libexpat1 libfontconfig1 libgcc1 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 \
    libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 libgbm1 libdrm2 \
    libxkbcommon0 libatspi2.0-0 fonts-liberation fonts-dejavu-core \
    fonts-freefont-ttf fonts-noto-color-emoji nginx \
    && rm -rf /var/lib/apt/lists/*

# Optional: Install Google Chrome (skip if Playwright Chromium is enough)
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-linux-signing-key.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/google-linux-signing-key.gpg arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" \
       > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r testuser && useradd -r -g testuser -G audio,video testuser \
    && mkdir -p /home/testuser && chown -R testuser:testuser /home/testuser /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --prefer-offline --no-audit \
    && npm audit fix --force || true \
    && npm cache clean --force

# Install Playwright browsers
RUN npx playwright install --with-deps chromium firefox webkit

# Copy project files
COPY . .

# Prepare directories
RUN mkdir -p reports/screenshots reports/videos reports/extent reports/html-report allure-results /tmp/playwright-cache \
    && chmod -R 755 reports /tmp/playwright-cache \
    && chown -R testuser:testuser reports /tmp/playwright-cache /app

# Copy NGINX config if exists
COPY nginx/default.conf /etc/nginx/conf.d/default.conf || echo "NGINX config not found, using default"

# Environment variables
ENV HEADLESS=true \
    NODE_ENV=production \
    DISPLAY=:99 \
    CHROME_BIN=/usr/bin/google-chrome \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome \
    PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-cache \
    CI=true

# Install multiple-cucumber-html-reporter globally
RUN npm install -g multiple-cucumber-html-reporter

# Expose ports
EXPOSE 3000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Container is healthy')" || exit 1

# Startup script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
echo "Starting virtual display..."\n\
Xvfb :99 -screen 0 1920x1080x24 -ac &\n\
export DISPLAY=:99\n\
sleep 2\n\
\n\
echo "Running UI & API tests..."\n\
xvfb-run -a npm run test:ci || echo "Tests completed with some failures"\n\
\n\
# Generate HTML reports if JSON files exist\n\
if ls reports/*.json 1> /dev/null 2>&1; then\n\
    npx multiple-cucumber-html-reporter \\\n\
        --reportName "Parabank Automation Report" \\\n\
        --jsonDir reports \\\n\
        --reportPath reports/html-report \\\n\
        --displayDuration \\\n\
        --openReport false || echo "HTML report generation completed with warnings"\n\
fi\n\
\n\
# Copy reports to nginx\n\
mkdir -p /usr/share/nginx/html/reports\n\
cp -r reports/* /usr/share/nginx/html/reports/ 2>/dev/null || echo "No reports to copy"\n\
\n\
# Start nginx\n\
nginx -g "daemon off;"\n\
' > /app/start.sh && chmod +x /app/start.sh

# Switch to non-root user
USER testuser

# Default command
CMD ["/app/start.sh"]

# Labels
LABEL maintainer="nishtha" \
      version="1.2.2" \
      description="Parabank Automation Testing Container with Jenkins & Playwright" \
      project="cucumber-playwright-javascript"
