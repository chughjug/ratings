# Iframe Embedding Setup

Your Chess Tournament Director application has been configured to allow embedding in iframes.

## Changes Made

### 1. Security Headers Configuration (`server/index.js`)

The following changes were made to enable iframe embedding:

- **Added `frame-ancestors: ["*"]`** to the Content-Security-Policy - This allows the site to be embedded in iframes from any origin
- **Disabled `frameguard`** in helmet - This prevents the `X-Frame-Options` header from being set to `DENY` or `SAMEORIGIN`
- **Removed X-Frame-Options header** - Modern browsers use CSP `frame-ancestors` instead

### 2. Technical Details

The configuration uses:
- **Content-Security-Policy (CSP)**: Modern approach to frame embedding
  - `frame-ancestors *` allows embedding from any origin
- **No X-Frame-Options header**: Prevents older header from conflicting with CSP

## Testing

### Local Testing

1. Open `test-iframe-embedding.html` in your browser
2. The page will automatically test embedding `http://localhost:5000`
3. You should see the application load successfully in the iframe

### Production Testing (Heroku)

1. Deploy the changes to Heroku
2. Open the test file and enter your Heroku URL
3. Example: `https://your-app.herokuapp.com`

## Embedding Your Site

To embed your site in an iframe, use:

```html
<iframe 
  src="https://your-app.herokuapp.com" 
  width="100%" 
  height="600px"
  frameborder="0">
</iframe>
```

## Security Considerations

### Current Configuration: Open Embedding

The current configuration allows embedding from **any origin** (`frame-ancestors *`). This is ideal for:
- Public websites
- Widget-like integrations
- Maximum flexibility

### Restricting Embedding (Optional)

If you want to restrict embedding to specific domains, modify `server/index.js`:

```javascript
frameAncestors: [
  "'self'",
  "https://specific-domain.com",
  "https://another-domain.com"
]
```

Or for your Heroku domain only:

```javascript
frameAncestors: [
  "'self'",
  "https://your-app.herokuapp.com"
]
```

## Browser Compatibility

- **Modern browsers** (Chrome, Firefox, Safari, Edge): Use CSP `frame-ancestors`
- **Older browsers**: May still check `X-Frame-Options`, which is now removed

## Verification

To verify the headers are set correctly:

```bash
curl -I http://localhost:5000 | grep -i "frame\|csp"
```

You should see:
- `Content-Security-Policy: ...frame-ancestors *;...`
- **No** `X-Frame-Options: DENY` or `X-Frame-Options: SAMEORIGIN`

## Troubleshooting

### Iframe Still Not Working

1. **Check browser console** for CSP violations
2. **Verify headers** using the curl command above
3. **Clear browser cache** - Old headers may be cached
4. **Check deployment** - Make sure changes are deployed to Heroku

### Mixed Content Issues

If embedding HTTPS content in an HTTP page:
- Modern browsers will block this
- Make sure both the parent page and embedded page use the same protocol (both HTTP or both HTTPS)

## Deployment

After making these changes, deploy to Heroku:

```bash
git add .
git commit -m "Enable iframe embedding"
git push heroku main
```

## References

- [MDN: X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
- [MDN: CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors)
- [Helmet.js Documentation](https://helmetjs.github.io/)
