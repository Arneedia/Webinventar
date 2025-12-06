#!/usr/bin/env node
/**
 * Conditional Prisma client generation script.
 * Runs `prisma generate` only if DATABASE_URL is set,
 * otherwise skips with a warning (for Vercel builds where the env var may not be available at install time).
 */

const { execSync } = require('child_process');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.log('[prisma-generate] DATABASE_URL not set – skipping prisma generate (will be generated at build time if needed).');
  process.exit(0);
}

try {
  console.log('[prisma-generate] Running prisma generate...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('[prisma-generate] Prisma client generated successfully.');
} catch (error) {
  console.error('[prisma-generate] Failed to generate Prisma client:', error.message);
  process.exit(1);
}
