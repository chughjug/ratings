# Quick Heroku Deployment

## Step 1: Login to Heroku
```bash
heroku login
```
This will open a browser window. Complete the authentication.

## Step 2: Deploy
```bash
./deploy.sh
```

## Alternative Manual Deployment

If the script doesn't work, follow these manual steps:

### 1. Initialize Git (if not done)
```bash
git init
git add .
git commit -m "Initial commit"
```

### 2. Create Heroku App
```bash
heroku create your-app-name
```

### 3. Set Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set CORS_ORIGIN=https://your-app-name.herokuapp.com
```

### 4. Build and Deploy
```bash
cd client && npm install && npm run build && cd ..
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### 5. Scale and Open
```bash
heroku ps:scale web=1
heroku open
```

## Troubleshooting

- If `git push heroku main` fails, try `git push heroku master`
- Check logs with `heroku logs --tail`
- Restart app with `heroku restart`

## Important Notes

- **Free tier limitations**: App sleeps after 30 minutes of inactivity
- **Database**: SQLite data will be lost on dyno restart
- **Upgrade**: Consider Hobby plan ($7/month) for production use
