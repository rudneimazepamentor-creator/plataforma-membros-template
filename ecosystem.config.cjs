// PM2: pm2 start ecosystem.config.cjs
// Ajuste APP_DIR (ou exporte a variável de ambiente) para o diretório onde o projeto está instalado.
const APP_DIR = process.env.APP_DIR || __dirname;

module.exports = {
  apps: [{
    name: 'plataforma-membros',
    script: 'server/index.js',
    cwd: APP_DIR,
    node_args: '--experimental-vm-modules',
    env: {
      NODE_ENV: 'production',
      PORT: 3004,
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    error_file: `${APP_DIR}/logs/error.log`,
    out_file: `${APP_DIR}/logs/out.log`,
    merge_logs: true,
    time: true,
  }],
};
