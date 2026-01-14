module.exports = {
  apps: [
    {
      name: 'polywoly-backend',
      script: 'dist/api/index.js',
      cwd: '/Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday Life/AI/PolyWolyTroly/polymarket-whale-tracker',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        API_PORT: '3002'
      },
      // Restart on crash
      restart_delay: 1000,
      // Max restarts in 15 minutes before giving up
      max_restarts: 10,
      min_uptime: '10s',
      // Log configuration
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
    {
      name: 'polywoly-frontend',
      script: 'npm',
      args: 'run dev -- --host',
      cwd: '/Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday Life/AI/PolyWolyTroly/polymarket-whale-tracker/frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'development'
      },
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: './logs/pm2-frontend-error.log',
      out_file: './logs/pm2-frontend-out.log',
      merge_logs: true,
      time: true,
    }
  ]
};
