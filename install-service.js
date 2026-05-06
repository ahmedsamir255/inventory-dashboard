const Service = require('node-windows').Service;

const backend = new Service({
  name: 'Alsaif Backend',
  description: 'Alsaif Inventory Backend Server',
  script: 'C:\\Users\\User\\.verdent\\verdent-projects\\inventory-system\\server.js',
  nodeOptions: []
});

backend.on('install', () => { backend.start(); console.log('Backend service installed!'); });
backend.on('error', (e) => console.log('Error:', e));
backend.install();
