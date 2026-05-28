import { PrismaClient } from '@prisma/client';

async function main() {
  const db = new PrismaClient();
  const required = ['uuid-ossp', 'pgcrypto', 'vector', 'pg_trgm'];

  const rows = await db.$queryRaw<{ extname: string }[]>`
    SELECT extname FROM pg_extension WHERE extname = ANY(${required})
  `;

  const found = rows.map((r) => r.extname);
  const missing = required.filter((e) => !found.includes(e));

  await db.$disconnect();

  if (missing.length) {
    console.error('MISSING EXTENSIONS:', missing.join(', '));
    console.error('Run the following as a PostgreSQL superuser:');
    missing.forEach((ext) => console.error(`  CREATE EXTENSION IF NOT EXISTS "${ext}";`));
    process.exit(1);
  }

  console.log('Extensions OK:', found.join(', '));
}

main();
