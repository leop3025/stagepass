import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: 'file:./dev.db' }),
});

try {
  const rows = await prisma.user.findMany();
  console.log('count', rows.length);
} catch (e) {
  console.error('ERR', e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
