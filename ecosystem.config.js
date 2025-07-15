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
      // Restart policy
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
      // Kill timeout
      kill_timeout: 5000,
      // Graceful shutdown
      listen_timeout: 8000,
      // Environment variables
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
