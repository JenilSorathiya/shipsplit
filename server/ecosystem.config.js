// PM2 process manager configuration
// Usage: pm2 start ecosystem.config.js
// Docs:  https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name:        'shipsplit-api',
      script:      'server.js',
      cwd:         __dirname,

      // Clustering — use all CPU cores
      instances:   'max',
      exec_mode:   'cluster',

      // Auto-restart
      autorestart:    true,
      watch:          false,           // disable in production
      max_memory_restart: '512M',

      // Graceful restart
      kill_timeout:      5000,
      listen_timeout:    3000,
      wait_ready:        true,

      // Environment
      env_production: {
        NODE_ENV:    'production',
        PORT:        5000,
      },
      env_development: {
        NODE_ENV:    'development',
        PORT:        5000,
      },

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file:   './logs/pm2-out.log',
      error_file: './logs/pm2-err.log',
      merge_logs: true,

      // Zero-downtime reload
      exp_backoff_restart_delay: 100,
    },
  ],
};
