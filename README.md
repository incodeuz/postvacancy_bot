# Post Vacancy Bot

Telegram bot for posting job vacancies and services.

## Features

- 💼 Free job vacancy posting
- ⚙️ Paid service posting
- 📊 Admin panel with statistics
- 📢 Advertisement management
- 👥 User management

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file with your configuration:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_ID=your_admin_id
MONGODB_URI=your_mongodb_uri
PORT=7777
```

3. Run the bot:

### Development Mode

```bash
npm run dev
```

### Production Mode with PM2

```bash
# Start the bot
./start.sh start

# Check status
./start.sh status

# View logs
./start.sh logs

# Restart bot
./start.sh restart

# Stop bot
./start.sh stop

# Monitor bot
./start.sh monit
```

### Manual PM2 Commands

```bash
# Start with ecosystem config
pm2 start ecosystem.config.js --env production

# View logs
pm2 logs post-vacancy-bot

# Monitor
pm2 monit

# Restart
pm2 restart post-vacancy-bot

# Stop
pm2 stop post-vacancy-bot
```

## Admin Commands

- `/admin-panel` - Admin panel and statistics
- `/admin-help` - Admin help page
- `/rek` - List all advertisements
- `/new-rek` - Add new advertisement

## Advertisement Management

### Adding New Advertisement

1. Go to Admin Panel → Reklamalar
2. Click "➕ Yangi reklama qo'shish"
3. Follow the steps:
   - 🔗 Enter channel link
   - 📝 Enter advertisement description
   - ⏰ Enter duration in days
   - ✅ Confirm the advertisement

### Advertisement Steps

1. **Channel Link**: Enter the Telegram channel link where the ad will be posted
2. **Description**: Enter a brief description of the advertisement
3. **Duration**: Enter how many days the advertisement should run
4. **Confirmation**: Review and confirm the advertisement details

The advertisement will be automatically posted to the specified channel and will be removed when the duration expires.

## User Commands

- `/start` - Start the bot (requires phone number registration)
- `/help` - Show help information

## Error Fixes

- ✅ Fixed "phone number can be requested in private chats only" error
- ✅ Fixed "Invalid step" error in vacancy creation
- ✅ Improved advertisement creation process with proper steps
- ✅ Added proper error handling for group chat commands
- ✅ Fixed ETIMEDOUT network errors with improved connection handling
- ✅ Added automatic retry logic for bot connection failures
- ✅ Improved MongoDB connection with timeout and retry settings
- ✅ Added graceful shutdown handling
- ✅ Added health check endpoint at `/health`

## Network Error Solutions

The bot now includes improved error handling for common network issues:

- **ETIMEDOUT**: Automatic retry with exponential backoff
- **ECONNRESET**: Connection reset handling with reconnection
- **ENOTFOUND**: DNS resolution error handling
- **MongoDB timeouts**: Improved connection settings with retry logic

### Health Check

The bot provides a health check endpoint at `http://your-domain/health` that returns:

```json
{
  "status": "ok",
  "bot": true,
  "mongodb": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
