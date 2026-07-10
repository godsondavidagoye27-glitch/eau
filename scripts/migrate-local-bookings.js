#!/usr/bin/env node
// Merge local bookings from data/local-bookings.json into data/site-data.json
// Usage: node scripts/migrate-local-bookings.js

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const siteDataPath = path.join(repoRoot, 'data', 'site-data.json');
const localPath = path.join(repoRoot, 'data', 'local-bookings.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read JSON', filePath, err.message);
    process.exit(1);
  }
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

const site = readJson(siteDataPath);
if (!site) {
  console.error('Site data not found at', siteDataPath);
  process.exit(1);
}

const local = readJson(localPath);
if (!local) {
  console.log('No local-bookings.json found at', localPath);
  console.log('Nothing to migrate. If you have browser local bookings, export them to data/local-bookings.json first.');
  process.exit(0);
}

site.bookings = site.bookings || [];

// Normalize local as array
const localBookings = Array.isArray(local) ? local : (local.bookings || []);
if (!localBookings.length) {
  console.log('No bookings found in local-bookings.json');
  process.exit(0);
}

// Merge by generated id or timestamp - avoid duplicates by JSON string match
const existingSet = new Set(site.bookings.map(b => JSON.stringify(b)));
let added = 0;
for (const b of localBookings) {
  const key = JSON.stringify(b);
  if (!existingSet.has(key)) {
    site.bookings.push(b);
    existingSet.add(key);
    added++;
  }
}

if (added > 0) {
  writeJson(siteDataPath, site);
  console.log(`Migrated ${added} bookings into data/site-data.json`);
  // Optionally backup local file
  const backup = localPath + '.bak';
  fs.renameSync(localPath, backup);
  console.log(`Renamed original local-file to ${backup}`);
} else {
  console.log('No new bookings to migrate.');
}
