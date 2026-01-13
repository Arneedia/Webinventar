#!/usr/bin/env node
/**
 * Production Start Script
 * Lädt Umgebungsvariablen aus .env.local vor dem Start
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Lade .env.local manuell
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log('✓ Lade Umgebungsvariablen aus .env.local');
  require('dotenv').config({ path: envLocalPath });
} else {
  console.warn('⚠ Warnung: .env.local nicht gefunden');
}

// Lade auch .env falls vorhanden
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('✓ Lade Umgebungsvariablen aus .env');
  require('dotenv').config({ path: envPath });
}

console.log('\nUmgebungsvariablen:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- DATABASE_URL vorhanden:', !!process.env.DATABASE_URL);
console.log('- POSTGRES_URL vorhanden:', !!process.env.POSTGRES_URL);
console.log('');

// Starte Next.js mit den geladenen Umgebungsvariablen
const nextStart = spawn('npm', ['run', 'start:next'], {
  stdio: 'inherit',
  env: { ...process.env },
  shell: true
});

nextStart.on('error', (error) => {
  console.error('Fehler beim Starten:', error);
  process.exit(1);
});

nextStart.on('exit', (code) => {
  process.exit(code || 0);
});
