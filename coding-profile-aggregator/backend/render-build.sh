#!/usr/bin/env bash

# Exit on error
set -o errexit

# Install dependencies
npm install

# Install the browser for Puppeteer
# This is required on Render's native Linux environment
echo "Installing Puppeteer browser..."
npx puppeteer install
