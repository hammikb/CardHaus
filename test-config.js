const config = require('./next.config.ts');
const pattern = config.default.images.remotePatterns[0];
console.log('Hostname pattern:', pattern.hostname);
console.log('Valid wildcard pattern (**.supabase.co):', /^\*\*\.\w+\.\w+$/.test(pattern.hostname));
