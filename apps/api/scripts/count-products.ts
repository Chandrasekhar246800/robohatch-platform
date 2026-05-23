import 'dotenv/config';
import { prisma } from '../src/config/prisma';

(async () => {
  const c = await prisma.product.count();
  console.log('product count:', c);
  const sample = await prisma.product.findMany({ take: 10, include: { images: true } });
  console.log('sample:', sample.map(p => ({ id: p.id, name: p.name, isActive: p.isActive, images: p.images.map(i=>i.url) })));
  process.exit(0);
})();
