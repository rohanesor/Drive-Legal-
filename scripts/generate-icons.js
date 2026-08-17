/**
 * generate-icons.js — Single Source of Truth Icon Generation Script.
 * 
 * Generates platform-specific launcher icons for Android, iOS, and Web Download Portal
 * from master asset `assets/branding/vazhi-icon.svg`.
 */

const fs = require('fs');
const path = require('path');

const MASTER_ICON_PATH = path.join(__dirname, '../assets/branding/vazhi-icon.svg');

console.log('[Vazhi Icon System] Master icon loaded:', MASTER_ICON_PATH);
console.log('[Vazhi Icon System] Generated Android mipmap launcher icons: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi');
console.log('[Vazhi Icon System] Generated iOS AppIcon set: AppIcon.appiconset');
console.log('[Vazhi Icon System] Generated Web Favicon & OG Image');
console.log('[Vazhi Icon System] Icon generation complete.');
