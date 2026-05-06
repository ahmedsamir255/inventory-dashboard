module.exports = {
  apps: [
    {
      name: "alsaif-backend",
      script: "server.js",
      cwd: "C:/Users/User/.verdent/verdent-projects/inventory-system",
      watch: false,
      autorestart: true
    },
    {
      name: "alsaif-frontend",
      script: "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js",
      args: "run dev -- --port 3003 --host",
      cwd: "C:/Users/User/.verdent/verdent-projects/inventory-system",
      watch: false,
      autorestart: true
    }
  ]
}
