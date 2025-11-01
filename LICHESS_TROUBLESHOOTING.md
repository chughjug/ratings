# Lichess API 400 Error Troubleshooting

## Common Network Errors

### "Network error: Could not connect to Lichess API"

**Causes**:
- No internet connection
- Firewall blocking Lichess API
- Lichess API is down
- DNS resolution issues

**Solutions**:
1. **Check Internet**: Verify your connection
2. **Test Connectivity**: Run `node test-lichess-connectivity.js`
3. **Check Firewall**: Ensure `lichess.org` is not blocked
4. **Check DNS**: Try accessing https://lichess.org in browser
5. **Check Lichess Status**: Visit https://lichess.org/api/status

### "Network error: Connection to Lichess API timed out"

**Causes**:
- Slow network connection
- Lichess API overload
- Proxy/VPN issues

**Solutions**:
1. **Increase Timeout**: Edit timeout in `lichessSwissIntegration.js`
2. **Check Network**: Use faster connection
3. **Retry**: Wait and try again
4. **Check Proxy**: Verify proxy settings

### Test Connectivity

Run the connectivity test:
```bash
node test-lichess-connectivity.js
```

Expected output:
```
✅ Connected successfully
```

## Common Causes of 400 Bad Request

When you encounter a 400 error creating a Lichess Swiss tournament, check the following:

### 1. Missing or Invalid API Token

**Symptom**: Error message about authorization or token

**Solution**:
- Verify your Lichess API token starts with `lip_...`
- Ensure the token has `tournament:write` scope
- Generate a new token at: https://lichess.org/account/oauth/token/create

### 2. Invalid Team ID

**Symptom**: Error about team not found

**Solution**:
- Verify you're using the team **slug**, not ID (e.g., `coders` not `team-id-123`)
- Confirm you're a team leader (not just a member)
- Check the team URL: `https://lichess.org/team/YOUR-TEAM-SLUG`

### 3. Invalid Clock Settings

**Symptom**: Error about clock parameters

**Solution**:
- Ensure `clock.limit` and `clock.increment` are integers
- Limits are typically 60-3600 seconds
- Increments are typically 0-120 seconds
- Example: `{limit: 180, increment: 2}` for 3+2

### 4. Missing Required Parameters

**Symptom**: Generic 400 error

**Solution**: Verify all required fields:
- `teamId`: Valid team slug
- `name`: Tournament name (non-empty)
- `clock`: Valid clock object with limit and increment

### 5. Invalid Round Count

**Symptom**: Error about rounds

**Solution**:
- Swiss tournaments typically have 5-11 rounds
- Ensure `nbRounds` matches your tournament setup
- Lichess may have minimum/maximum limits

## Debugging Steps

### Enable Detailed Logging

The integration now logs detailed request/response info:

```javascript
console.log('[Lichess] Creating Swiss tournament with params:', params.toString());
console.log('[Lichess] API URL:', `${this.apiBaseUrl}/swiss/new`);
console.error('Error response:', error.response?.data);
console.error('Error status:', error.response?.status);
```

### Test with cURL

Test the Lichess API directly:

```bash
curl -X POST "https://lichess.org/api/swiss/new" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "teamId=your-team-slug" \
  --data-urlencode "name=Test Tournament" \
  --data-urlencode 'clock={"limit":180,"increment":2}' \
  --data-urlencode "variant=standard" \
  --data-urlencode "rated=true" \
  --data-urlencode "nbRounds=5"
```

### Check Server Logs

Look for detailed error messages in your server logs:

```javascript
// In server/routes/pairings.js or server logs
[Lichess] Creating Swiss tournament with params: teamId=...&name=...&clock=...
Error response: { error: "Specific error message from Lichess" }
```

## Common Error Messages

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "teamId: string required" | Missing teamId | Provide valid team slug |
| "Invalid token" | Token expired or invalid | Generate new token |
| "Not a team leader" | Insufficient permissions | Get promoted to team leader |
| "Clock limit must be between..." | Invalid time control | Adjust clock settings |
| "name too long" | Tournament name exceeds limit | Shorten name (< 100 chars) |

## Testing Checklist

Before creating a tournament:

- [ ] API token is valid and has correct scope
- [ ] Team slug is correct
- [ ] You are team leader
- [ ] Clock settings are valid integers
- [ ] Tournament name is not too long
- [ ] Round count is reasonable (5-11)
- [ ] Variant is valid ('standard', 'chess960', etc.)

## Getting Help

1. **Check Lichess API Docs**: https://lichess.org/api#tag/Swiss-tournaments
2. **Review Error Logs**: Look for specific Lichess error messages
3. **Test with cURL**: Verify API works outside your application
4. **Lichess Forums**: https://lichess.org/forum/lichess-feedback

## Rate Limits

Lichess API has rate limits:
- ~1 request per second
- Backoff on 429 errors
- Implement retries with exponential backoff

