#!/bin/bash

# Post Vacancy Bot PM2 Management Script

echo "🤖 Post Vacancy Bot Management Script"
echo "====================================="

case "$1" in
  "start")
    echo "🚀 Starting bot with PM2..."
    pm2 start ecosystem.config.js --env production
    echo "✅ Bot started successfully!"
    ;;
  "stop")
    echo "🛑 Stopping bot..."
    pm2 stop post-vacancy-bot
    echo "✅ Bot stopped!"
    ;;
  "restart")
    echo "🔄 Restarting bot..."
    pm2 restart post-vacancy-bot
    echo "✅ Bot restarted!"
    ;;
  "logs")
    echo "📋 Showing bot logs..."
    pm2 logs post-vacancy-bot --lines 50
    ;;
  "status")
    echo "📊 Bot status:"
    pm2 status
    ;;
  "monit")
    echo "📈 Opening PM2 monitor..."
    pm2 monit
    ;;
  "delete")
    echo "🗑️ Deleting bot from PM2..."
    pm2 delete post-vacancy-bot
    echo "✅ Bot deleted from PM2!"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs|status|monit|delete}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the bot with PM2"
    echo "  stop    - Stop the bot"
    echo "  restart - Restart the bot"
    echo "  logs    - Show bot logs"
    echo "  status  - Show PM2 status"
    echo "  monit   - Open PM2 monitor"
    echo "  delete  - Delete bot from PM2"
    exit 1
    ;;
esac 