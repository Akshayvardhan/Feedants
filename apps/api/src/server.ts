import dotenv from 'dotenv';
import path from 'node:path';
import mongoose from 'mongoose';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../../../.env') });

const port = Number(process.env.PORT || 4000);
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/feedants';

async function start() {
  const { app } = await import('./app');
  const { seedCompetition } = await import('./seed');
  await mongoose.connect(uri);
  await seedCompetition();
  app.locals.databaseReady = true;
  app.listen(port, () => console.log(`Feedants API listening on http://localhost:${port}`));
}

start().catch((error) => { console.error('Unable to start API', error); process.exit(1); });
