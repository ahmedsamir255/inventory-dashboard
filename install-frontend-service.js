const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Alsaif Frontend',
  description: 'Alsaif Inventory Frontend Server',
  script: path.resolve('frontend-server.mjs'),
  nodeOptions: []
});

svc.on('install', () => { svc.start(); console.log('Frontend service installed and started!'); });
svc.on('error', e => console.log('Error:', e));
svc.install();