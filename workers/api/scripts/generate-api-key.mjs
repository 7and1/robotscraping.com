import { createHash, randomUUID } from 'crypto';

const prefix = process.argv[2] || 'live';
const raw = `rs_${prefix}_${randomUUID().replace(/-/g, '')}`;
const hash = createHash('sha256').update(raw).digest('hex');

console.log(JSON.stringify({ key: raw, hash }, null, 2));
