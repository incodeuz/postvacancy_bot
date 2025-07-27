#!/bin/bash

echo "🔍 Post Vacancy Bot Monitoring"
echo "=============================="

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status post-vacancy-bot

echo ""
echo "📋 Recent Logs (last 20 lines):"
pm2 logs post-vacancy-bot --lines 20 --nostream

echo ""
echo "🔍 Health Check:"
curl -s http://localhost:7777/health | jq . 2>/dev/null || echo "Health endpoint not responding"

echo ""
echo "💾 Memory Usage:"
pm2 monit --nostream | grep post-vacancy-bot || echo "Memory info not available"

echo ""
echo "📈 Process Info:"
ps aux | grep "node.*index.js" | grep -v grep || echo "Process not found" 