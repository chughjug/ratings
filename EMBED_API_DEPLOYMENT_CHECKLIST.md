# Embeddable API - Heroku Deployment Checklist

## Pre-Deployment

- [ ] Code committed to git
- [ ] All tests pass locally
- [ ] Documentation reviewed
- [ ] API endpoint tested locally

## Deployment Steps

### 1. Push to Heroku

```bash
# Add all changes
git add .

# Commit changes
git commit -m "Add embeddable tournament API endpoint"

# Push to Heroku
git push heroku main
```

### 2. Verify Deployment

```bash
# Check deployment status
heroku releases --tail

# Check app is running
heroku ps

# View logs
heroku logs --tail
```

### 3. Test the Endpoint

```bash
# Get your app URL
heroku apps:info

# Test the embed endpoint
curl https://YOUR-APP-NAME.herokuapp.com/api/tournaments/YOUR-TOURNAMENT-ID/embed
```

Expected response: JSON object with tournament data

### 4. Test CORS

Open browser console on any website and run:

```javascript
fetch('https://YOUR-APP-NAME.herokuapp.com/api/tournaments/YOUR-TOURNAMENT-ID/embed')
  .then(res => res.json())
  .then(data => console.log('Success!', data))
  .catch(err => console.error('Error:', err));
```

Expected: Should log tournament data without CORS errors

## Post-Deployment

### Verify Features

- [ ] Endpoint returns JSON data
- [ ] CORS headers are present
- [ ] OPTIONS requests work
- [ ] Data includes all required fields
- [ ] Organization branding included (if applicable)
- [ ] Statistics are accurate

### Test Integration

- [ ] Test with real tournament ID
- [ ] Test on external website
- [ ] Test in iframe
- [ ] Test with fetch from different domain
- [ ] Check browser console for errors

### Documentation

- [ ] Update API documentation with Heroku URL
- [ ] Share endpoint URL with partners
- [ ] Update any integration guides
- [ ] Add to developer documentation

## Troubleshooting

### If Endpoint Returns 404

1. Check URL format: `/api/tournaments/:id/embed`
2. Verify tournament ID exists
3. Check Heroku logs for errors

### If CORS Errors

1. Verify `Access-Control-Allow-Origin: *` header
2. Check browser console for specific error
3. Test with curl to isolate issue
4. Verify preflight OPTIONS requests work

### If Data is Incomplete

1. Check database has complete data
2. Review server logs for SQL errors
3. Test with different tournament
4. Check for null values in database

### If Response is Slow

1. Check Heroku dyno resources
2. Review query performance
3. Consider adding indexes
4. Monitor Heroku metrics

## Monitoring

### Logs

```bash
# View real-time logs
heroku logs --tail

# View specific process
heroku logs --ps web

# Search logs
heroku logs --tail | grep "embed"
```

### Metrics

```bash
# Check app metrics
heroku ps

# Check dyno utilization
heroku ps:exec

# View add-ons
heroku addons
```

## Production Checklist

- [ ] Endpoint deployed successfully
- [ ] CORS working from multiple domains
- [ ] Rate limiting configured
- [ ] Error handling tested
- [ ] Documentation complete
- [ ] Integration examples work
- [ ] Partners notified of endpoint

## Quick Reference

### Endpoint URL Format

```
Production: https://YOUR-APP-NAME.herokuapp.com/api/tournaments/:id/embed
Local:       http://localhost:5000/api/tournaments/:id/embed
```

### Test Tournament ID

Get a tournament ID from your database:
```bash
heroku pg:psql
SELECT id FROM tournaments WHERE is_public = 1 LIMIT 1;
```

### Common Commands

```bash
# View configuration
heroku config

# Check app status
heroku apps:info

# Restart app
heroku restart

# Scale dynos
heroku ps:scale web=1

# Open app
heroku open
```

## Support Resources

- Server logs: `heroku logs --tail`
- Database: `heroku pg:psql`
- Metrics: Heroku Dashboard
- Documentation: See guide files
- Issues: Check Heroku logs

