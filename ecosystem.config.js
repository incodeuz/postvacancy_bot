module.exports = {
  apps: [
    {
      name: "post-vacancy-bot",
      script: "index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 7777,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      // Enhanced restart policy for better stability
      min_uptime: "30s", // Increased from 10s
      max_restarts: 20, // Increased from 10
      restart_delay: 10000, // Increased from 4000
      // Kill timeout
      kill_timeout: 10000, // Increased from 5000
      // Graceful shutdown
      listen_timeout: 15000, // Increased from 8000
      // Additional stability settings
      node_args: "--max-old-space-size=1024", // Memory limit
      // Crash detection
      crash_log_file: "./logs/crash.log",
      // Environment variables
      env_production: {
        NODE_ENV: "production",
      },
      // Log rotation
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      // Process monitoring
      pmx: true,
    },
  ],
};
