# Sentry Integration Setup Guide

This document explains how to set up and configure Sentry error tracking for the Task Priority application.

## What is Sentry?

Sentry is an error monitoring and performance tracking service that helps you:
- Track JavaScript errors in production
- Monitor application performance
- Replay user sessions to reproduce bugs
- Get alerted when critical errors occur
- See detailed stack traces with source maps

## Features Enabled

Our Sentry integration includes:

✅ **Error Boundary Integration** - Catches React component errors
✅ **Browser Tracing** - Tracks page loads and navigation performance
✅ **Session Replay** - Records user sessions for debugging (with privacy protections)
✅ **Automatic Breadcrumbs** - Logs user actions (clicks, navigation, console)
✅ **Source Maps** - Shows original TypeScript source in stack traces
✅ **Privacy Controls** - Filters sensitive data before sending to Sentry

## Setup Instructions

### 1. Create a Sentry Account

1. Go to [https://sentry.io](https://sentry.io)
2. Sign up for a free account (includes 5,000 errors/month)
3. Create a new organization (or use existing)

### 2. Create a React Project

1. In Sentry dashboard, click **"Create Project"**
2. Select **"React"** as the platform
3. Choose an alert frequency (default is fine)
4. Give your project a name (e.g., "task-priority-frontend")
5. Click **"Create Project"**

### 3. Get Your DSN

After creating the project, Sentry will show you a DSN (Data Source Name).

Example DSN:
```
https://abc123def456@o123456.ingest.sentry.io/7891011
```

Copy this DSN - you'll need it for configuration.

Alternatively, find your DSN anytime:
1. Go to **Settings** → **Projects**
2. Select your project
3. Click **"Client Keys (DSN)"**

### 4. Configure Environment Variables

#### Local Development

1. Copy the example environment file:
   ```bash
   cd frontend
   cp .env.example .env.local
   ```

2. Edit `.env.local` and set your Sentry DSN:
   ```bash
   VITE_SENTRY_DSN=https://YOUR_DSN_HERE@o123.ingest.sentry.io/456
   VITE_SENTRY_ENVIRONMENT=development
   VITE_APP_VERSION=0.1.0
   ```

3. Restart your dev server:
   ```bash
   pnpm dev
   ```

#### Production Deployment

Set environment variables in your hosting platform:

**Vercel:**
```bash
vercel env add VITE_SENTRY_DSN
vercel env add VITE_SENTRY_ENVIRONMENT production
vercel env add VITE_APP_VERSION 1.0.0
```

**Netlify:**
```bash
netlify env:set VITE_SENTRY_DSN "https://..."
netlify env:set VITE_SENTRY_ENVIRONMENT "production"
netlify env:set VITE_APP_VERSION "1.0.0"
```

**Docker:**
```dockerfile
ENV VITE_SENTRY_DSN=https://...
ENV VITE_SENTRY_ENVIRONMENT=production
ENV VITE_APP_VERSION=1.0.0
```

### 5. Enable Source Maps (Optional but Recommended)

Source maps allow Sentry to show your original TypeScript code in stack traces.

1. Install Sentry Vite plugin:
   ```bash
   pnpm add -D @sentry/vite-plugin
   ```

2. Update `vite.config.ts`:
   ```typescript
   import { sentryVitePlugin } from '@sentry/vite-plugin';

   export default defineConfig({
     plugins: [
       react(),
       sentryVitePlugin({
         org: 'your-org-slug',
         project: 'task-priority-frontend',
         authToken: process.env.SENTRY_AUTH_TOKEN,
       }),
     ],
     build: {
       sourcemap: true, // Enable source maps
     },
   });
   ```

3. Get a Sentry auth token:
   - Go to **Settings** → **Auth Tokens**
   - Create a new token with `project:releases` scope
   - Add to `.env.local`: `SENTRY_AUTH_TOKEN=your-token-here`

## Testing the Integration

### Test Error Reporting

1. Start your dev server: `pnpm dev`
2. Open browser console
3. Trigger a test error:
   ```javascript
   throw new Error('Sentry test error');
   ```
4. Check Sentry dashboard → Issues
5. You should see the error appear within a few seconds

### Test Error Boundary

1. Create a component that throws an error:
   ```tsx
   function BuggyComponent() {
     throw new Error('Test error boundary');
   }
   ```
2. Render it in your app
3. Error boundary should catch it and report to Sentry

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SENTRY_DSN` | Yes* | - | Sentry project DSN. *Required to enable Sentry |
| `VITE_SENTRY_ENVIRONMENT` | No | `import.meta.env.MODE` | Environment name (development, staging, production) |
| `VITE_APP_VERSION` | No | `'unknown'` | App version for release tracking |

### Sample Rates

Configured in `frontend/src/main.tsx`:

```typescript
tracesSampleRate: 0.1,        // 10% of transactions (adjust based on traffic)
replaysSessionSampleRate: 0.1, // 10% of normal sessions
replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
```

**Adjust based on:**
- Traffic volume (higher traffic → lower sample rate)
- Sentry quota (free tier: 10k transactions/month)
- Budget (paid plans charge per transaction)

### Privacy Controls

Sensitive data is automatically filtered:
- Passwords removed from URLs
- Auth tokens removed from URLs
- API keys removed from URLs
- All text masked in session replays
- All media blocked in session replays

See `beforeSend` hook in `main.tsx` for details.

## Troubleshooting

### Errors Not Appearing in Sentry

**Check:**
1. ✅ `VITE_SENTRY_DSN` is set correctly
2. ✅ No firewall/ad-blocker blocking `sentry.io`
3. ✅ Dev server restarted after changing `.env.local`
4. ✅ Error occurs in browser (not during SSR/build)
5. ✅ Error not in `ignoreErrors` list (see `main.tsx`)

**Debug:**
```javascript
// In browser console
console.log(import.meta.env.VITE_SENTRY_DSN); // Should show your DSN
```

### Source Maps Not Working

**Check:**
1. ✅ `sourcemap: true` in `vite.config.ts`
2. ✅ `@sentry/vite-plugin` installed and configured
3. ✅ `SENTRY_AUTH_TOKEN` environment variable set
4. ✅ Build completes without errors

### Too Many Events

If you're hitting Sentry quota limits:

1. **Reduce sample rates** in `main.tsx`:
   ```typescript
   tracesSampleRate: 0.05, // 5% instead of 10%
   ```

2. **Add more ignored errors**:
   ```typescript
   ignoreErrors: [
     'ResizeObserver loop limit exceeded',
     'Non-Error promise rejection captured',
     // Add patterns for errors you don't care about
   ],
   ```

3. **Filter by environment**:
   - Only enable Sentry in production
   - Leave `VITE_SENTRY_DSN` empty in development

## Best Practices

### DO:
✅ Set meaningful error boundaries at route level
✅ Use `Sentry.captureMessage()` for important logs
✅ Add context with `Sentry.setContext()` and `Sentry.setTag()`
✅ Set user info with `Sentry.setUser()` (after authentication)
✅ Test error reporting in staging before production
✅ Monitor Sentry quota usage regularly

### DON'T:
❌ Don't commit `.env.local` to version control
❌ Don't set sample rate to 1.0 in production (quota issues)
❌ Don't send PII (Personally Identifiable Information)
❌ Don't ignore all errors (defeats the purpose)
❌ Don't forget to add release tags for version tracking

## Additional Resources

- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Vite Plugin](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/)
- [Sentry Best Practices](https://docs.sentry.io/product/best-practices/)
- [Pricing & Quotas](https://sentry.io/pricing/)

## Support

- **Sentry Issues:** [https://github.com/getsentry/sentry-javascript/issues](https://github.com/getsentry/sentry-javascript/issues)
- **Sentry Discord:** [https://discord.gg/sentry](https://discord.gg/sentry)
- **Project Issues:** Create an issue in this repository

---

**Last Updated:** 2025-10-27
**Sentry Version:** @sentry/react ^10.22.0
