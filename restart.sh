#!/bin/bash

echo "🔄 Restarting post-vacancy-bot..."

# Stop the current process
pm2 stop post-vacancy-bot

# Wait a moment
sleep 5

# Delete the old process
pm2 delete post-vacancy-bot

# Wait a moment
sleep 3

# Start with new configuration
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Show status
pm2 status

echo "✅ Bot restarted successfully!"
echo "📊 Check logs with: pm2 logs post-vacancy-bot" 