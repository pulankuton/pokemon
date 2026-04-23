module.exports = {
  apps: [{
    name: 'pokemon-server',
    script: './server/server.js',
    cwd: '/opt/pokemon',
    instances: 1,           // Worker Threads が並列化するので PM2 は 1 プロセス
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
      // NUM_WORKERS は server.js 内で os.cpus().length を自動取得
    },
    max_memory_restart: '4G',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/pokemon/error.log',
    out_file: '/var/log/pokemon/out.log',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 3000
  }]
};
