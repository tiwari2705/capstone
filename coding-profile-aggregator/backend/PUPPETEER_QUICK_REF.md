# Puppeteer GFG Scraper - Quick Reference

## Test Commands

```bash
# Test GFG scraping
node test-fetchers.js geeksforgeeks your_username

# Test all platforms
node test-fetchers.js leetcode neal_wu
node test-fetchers.js codeforces tourist
node test-fetchers.js geeksforgeeks your_username
```

## Expected Output (Success)

```
=== TESTING GEEKSFORGEEKS ===
Username: your_username

Testing community API...
✗ Community API error: Request failed with status code 400

Testing Puppeteer scraping...
[GFG Browser] Launched new browser instance
[GFG Scraper] Fetching profile for your_username...
[GFG Scraper] Navigating to https://www.geeksforgeeks.org/user/your_username/...
[GFG Scraper] Extracted: { codingScore: 1234, problemsSolved: 150 }
[GFG Cache] Stored for your_username
[GFG Scraper] ✓ Success: { codingScore: 1234, problemsSolved: 150, scrapedAt: '...' }

✓ Puppeteer scraping success:
  Coding Score: 1234
  Problems Solved: 150
  Scraped At: 2026-04-03T...
```

## Key Files

- `src/services/gfgScraper.js` - Puppeteer scraper (NEW)
- `src/services/statsService.js` - Uses gfgScraper (MODIFIED)
- `src/index.js` - Browser cleanup (MODIFIED)
- `test-fetchers.js` - Test script (MODIFIED)

## Performance

| Scenario | Time |
|----------|------|
| First request (cold) | 3-5 seconds |
| Browser reused | 1-2 seconds |
| Cached (< 5 min) | <100ms |

## Cache

- **Type:** In-memory Map
- **TTL:** 5 minutes
- **Invalidation:** Automatic
- **Manual clear:** Restart server or use `skipCache: true`

## Troubleshooting

### Browser won't launch
```bash
# Reinstall Chromium
node node_modules/puppeteer/install.js
```

### Timeout errors
Increase timeout in `gfgScraper.js`:
```javascript
timeout: 30000 // 30 seconds
```

### No data extracted
GFG changed HTML structure. Update selectors in `page.evaluate()`.

### Memory leak
Check browser closes on shutdown:
```
[Server] Shutting down gracefully...
[GFG Browser] Closed browser instance
```

## Migration Steps

1. ✅ Install puppeteer (already done)
2. ⏳ Restart backend
3. ⏳ Test: `node test-fetchers.js geeksforgeeks username`
4. ⏳ Delete old GFG profiles
5. ⏳ Re-add and verify GFG profile
6. ⏳ Check dashboard for real data

## Dependencies

```json
{
  "puppeteer": "^24.40.0",
  "puppeteer-extra": "^3.3.6",
  "puppeteer-extra-plugin-stealth": "^2.11.2"
}
```

## API Usage

```javascript
const { scrapeGFGProfile, fetchGFGStatsWithRetry } = require('./services/gfgScraper');

// Basic usage
const stats = await scrapeGFGProfile('username');
// Returns: { codingScore: 1234, problemsSolved: 150, scrapedAt: '...' }

// With retry
const stats = await fetchGFGStatsWithRetry('username', 2);

// Skip cache
const stats = await scrapeGFGProfile('username', { skipCache: true });

// Custom timeout
const stats = await scrapeGFGProfile('username', { timeout: 30000 });
```

## Logs to Watch

**Success:**
```
[GFG] ✓ Puppeteer success: { problems_solved: 150, score: 1234 }
[Stats] ✓ geeksforgeeks/@username: 150 problems, score=1234
```

**Failure:**
```
[GFG] ✗ Puppeteer scraping failed: Navigation timeout
[Stats] ✗ geeksforgeeks/@username fetch failed
```

**Cache Hit:**
```
[GFG Cache] Hit for username (age: 45s)
```

## Resource Usage

- **Memory:** ~150MB (browser + page)
- **CPU:** Low (idle when not scraping)
- **Disk:** ~300MB (Chromium binary)

## Production Deployment

### Docker
```dockerfile
RUN apt-get install -y chromium fonts-liberation libnss3
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Heroku
```bash
heroku buildpacks:add jontewks/puppeteer
```

### Environment Variables
```bash
# Optional: Use system Chrome instead of bundled Chromium
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

## Monitoring

Add to your monitoring:
- Browser launch failures
- Scrape duration > 10s
- Cache hit rate < 50%
- Memory usage > 500MB

## Support

If issues persist:
1. Share test script output
2. Share backend logs during verification
3. Share GFG username (for testing)
4. Check if profile is public
