# Use official Node.js runtime as base image
FROM node:18-bullseye-slim

# Set working directory
WORKDIR /app

# Install system dependencies for Playwright, Jenkins, and headless operation
RUN apt-get update && apt-get install -y \
    # Basic system tools
    curl wget gnupg ca-certificates fonts-liberation sudo git \
    # Playwright browser dependencies
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
    libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
    libxss1 libxtst6 lsb-release xdg-utils \
    # Virtual display and GUI support
    xvfb x11-utils x11-xserver-utils \
    # Additional dependencies for Jenkins compatibility
    libgbm1 libxkbcommon0 libatspi2.0-0 \
    # Web server
    nginx \
    # Additional fonts for better rendering
    fonts-dejavu-core fonts-freefont-ttf fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome with proper error handling
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-linux-signing-key.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/google-linux-signing-key.gpg arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for running tests (Jenkins compatibility)
RUN groupadd -r testuser && useradd -r -g testuser -G audio,video testuser \
    && mkdir -p /home/testuser && chown -R testuser:testuser /home/testuser

# Copy package files
COPY package*.json ./

# Install Node.js dependencies with audit fix
RUN npm ci --prefer-offline --no-audit \
    && npm audit fix --force || true \
    && npm cache clean --force

# Install Playwright browsers and system dependencies
RUN npx playwright install --with-deps chromium firefox webkit || true \
    && npx playwright install-deps || true

# Copy project files
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p \
    reports/screenshots \
    reports/videos \
    reports/extent \
    reports/html-report \
    allure-results \
    src/features/support/reports \
    /tmp/playwright-cache \
    && chmod -R 755 reports src/features/support /tmp/playwright-cache \
    && chown -R testuser:testuser reports src/features/support /tmp/playwright-cache /app

# Copy NGINX config (if exists)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf || echo "NGINX config not found, using default"

# Set environment variables
ENV HEADLESS=true
ENV NODE_ENV=production
ENV DISPLAY=:99
ENV CHROME_BIN=/usr/bin/google-chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
ENV PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-cache
ENV CI=true

# Install multiple-cucumber-html-reporter if not in package.json
RUN npm list multiple-cucumber-html-reporter || npm install multiple-cucumber-html-reporter

# Expose ports
EXPOSE 3000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Container is healthy')" || exit 1

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Start virtual display\n\
Xvfb :99 -screen 0 1920x1080x24 -ac &\n\
export DISPLAY=:99\n\
\n\
# Wait for display to be ready\n\
sleep 2\n\
\n\
echo "Starting test execution..."\n\
\n\
# Run tests with proper error handling\n\
npm run test:ci || {\n\
    echo "Tests completed with some failures, generating reports..."\n\
}\n\
\n\
# Generate reports\n\
if [ -f "generate-report.js" ]; then\n\
    node generate-report.js || echo "Custom report generation failed"\n\
fi\n\
\n\
# Generate HTML reports if json files exist\n\
if [ -f "reports/*.json" ]; then\n\
    npx multiple-cucumber-html-reporter \\\n\
        --reportName "Parabank Automation Report" \\\n\
        --jsonDir reports \\\n\
        --reportPath reports/html-report \\\n\
        --displayDuration \\\n\
        --openReport false || echo "HTML report generation completed with warnings"\n\
fi\n\
\n\
# Copy reports to nginx directory\n\
cp -r reports/* /usr/share/nginx/html/ 2>/dev/null || echo "No reports to copy"\n\
\n\
# Start nginx\n\
nginx -g "daemon off;"\n\
' > /app/start.sh && chmod +x /app/start.sh

# Switch to non-root user for security
USER testuser

# Default command: run the startup script
CMD ["/app/start.sh"]

# Labels for better container management
LABEL maintainer="nishtha"
LABEL version="1.2.0"
LABEL description="Parabank Automation Testing Container with Jenkins Compatibility"
LABEL project="cucumber-playwright-javascript"