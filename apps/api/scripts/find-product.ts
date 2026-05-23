import 'dotenv/config';
import { prisma } from '../src/config/prisma';

const q = process.argv[2];
if (!q) {
  console.error('Usage: tsx scripts/find-product.ts "query"');
  process.exit(1);
}

(async () => {
  // Use case-insensitive raw query for compatibility across Prisma versions
  const raw = await prisma.$queryRaw`SELECT id, name, isActive FROM Product WHERE LOWER(name) LIKE ${'%' + q.toLowerCase() + '%'} LIMIT 50`;
  // raw is array of objects with id, name, isActive
  if (!raw || (Array.isArray(raw) && raw.length === 0)) {
    console.log('No products matched:', q);
    process.exit(0);
  }

  for (const row of raw as any[]) {
    const p = await prisma.product.findUnique({ where: { id: row.id }, include: { images: true } });
    if (!p) continue;
    console.log('---');
    console.log('id:', p.id);
    console.log('name:', p.name);
    console.log('isActive:', p.isActive);
    console.log('images:', p.images.map(i => i.url));
  }

  process.exit(0);
})();
