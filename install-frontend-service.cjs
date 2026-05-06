const Service = require('node-windows').Service;
const path = require('path');
const svc = new Service({
  name: 'Alsaif Frontend',
  description: 'Alsaif Inventory Frontend Server',
  script: path.join('C:\\Users\\User\\.verdent\\verdent-projects\\inventory-system\\frontend-server.mjs'),
  nodeOptions: []
});
svc.on('install', () => { svc.start(); console.log('Frontend service installed!'); });
svc.on('error', e => console.log('Error:', e));
svc.install();