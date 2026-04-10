#!/usr/bin/env opt/render/project/src/backend/render-build.sh

# Exit on error
set -o errexit

# Install dependencies
npm install

# Install the browser for Puppeteer
# This is required on Render's native Linux environment
echo "Installing Puppeteer browser..."
npx puppeteer install
