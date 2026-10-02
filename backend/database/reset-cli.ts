/** CLI: `npm run seed` restores the canonical dataset (`npm run seed -- --random` for random data). */
import { db } from './db.js';
import { seedDatabase } from '../../seed/seed.js';
import { hashSecret } from '../utils/ids.js';

const random = process.argv.includes('--random');
const r = seedDatabase(db, { random, hash: hashSecret });
console.log(`Database seeded (${random ? 'random' : 'canonical'} seed ${r.seed}).`);
