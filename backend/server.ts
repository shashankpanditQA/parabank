import { createApp } from './app.js';
import { db, get } from './database/db.js';
import { seedDatabase } from '../seed/seed.js';
import { hashSecret } from './utils/ids.js';

const PORT = Number(process.env.PORT) || 4000;

// Seed automatically on first start (or when SEED_ON_START=true).
const hasData = get<{ c: number }>('SELECT COUNT(*) c FROM users')!.c > 0;
if (!hasData || process.env.SEED_ON_START === 'true') {
  const r = seedDatabase(db, { random: false, hash: hashSecret });
  console.log(`[seed] database seeded (seed ${r.seed})`);
}

createApp().listen(PORT, () => {
  console.log(`\n  ParaBank Pro running at http://localhost:${PORT}`);
  console.log(`  API docs:  http://localhost:${PORT}/api/docs`);
  console.log(`  Demo login: john / Demo@123   admin / Admin@123\n`);
});
