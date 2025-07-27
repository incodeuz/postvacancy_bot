# Troubleshooting Guide

## ESOCKETTIMEDOUT Error Fix

The `ESOCKETTIMEDOUT` error occurs when the bot cannot establish or maintain a connection with the Telegram API. This has been fixed with the following improvements:

### ✅ What Was Fixed:

1. **Increased Timeout Values:**

   - Polling timeout: 30s → 60s
   - Request timeout: 30s → 60s
   - Connect timeout: 30s → 60s
   - Read timeout: 30s → 60s

2. **Enhanced Retry Logic:**

   - Exponential backoff retry strategy
   - Maximum retries increased from 5 to 10
   - Better error handling for network issues

3. **Improved Connection Management:**

   - Keep-alive connections enabled
   - Better socket management
   - Connection pooling improvements

4. **Robust Error Recovery:**
   - Automatic reconnection on network errors
   - Health check monitoring every minute
   - Graceful handling of disconnections

### 🚀 How to Apply the Fix:

1. **Restart the bot with new configuration:**

   ```bash
   ./restart.sh
   ```

2. **Monitor the bot status:**

   ```bash
   ./monitor.sh
   ```

3. **Check logs for any remaining issues:**
   ```bash
   pm2 logs post-vacancy-bot
   ```

### 🔍 Monitoring Commands:

```bash
# Check bot status
pm2 status post-vacancy-bot

# View recent logs
pm2 logs post-vacancy-bot --lines 50

# Monitor in real-time
pm2 logs post-vacancy-bot --follow

# Check health endpoint
curl http://localhost:7777/health
```

### 🛠️ Additional Troubleshooting:

#### If the error persists:

1. **Check network connectivity:**

   ```bash
   ping api.telegram.org
   ```

2. **Verify bot token:**

   - Ensure `TELEGRAM_BOT_TOKEN` is correct in environment
   - Check if bot is not blocked by Telegram

3. **Check server resources:**

   ```bash
   # Memory usage
   free -h

   # CPU usage
   top

   # Disk space
   df -h
   ```

4. **Restart with clean state:**
   ```bash
   pm2 delete post-vacancy-bot
   pm2 start ecosystem.config.js
   pm2 save
   ```

#### Common Issues and Solutions:

1. **High Memory Usage:**

   - The bot now has memory limits configured
   - Restart if memory usage exceeds 1GB

2. **Database Connection Issues:**

   - MongoDB connection now has automatic reconnection
   - Check MongoDB Atlas status if using cloud database

3. **Rate Limiting:**
   - Bot now has built-in delays between retries
   - Respects Telegram API rate limits

### 📊 Health Check Endpoints:

- **Main health check:** `http://localhost:7777/health`
- **Bot status:** Check PM2 status
- **Database status:** Included in health check

### 🔄 Automatic Recovery:

The bot now includes:

- ✅ Automatic restart on crashes
- ✅ Network error recovery
- ✅ Database reconnection
- ✅ Health monitoring
- ✅ Exponential backoff retries

### 📞 Support:

If issues persist after applying these fixes:

1. Check the logs: `pm2 logs post-vacancy-bot`
2. Monitor the health endpoint
3. Contact support with specific error messages

---

**Note:** The bot is now much more resilient to network issues and should handle `ESOCKETTIMEDOUT` errors gracefully with automatic recovery.
