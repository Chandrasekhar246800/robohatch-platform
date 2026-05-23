import 'dotenv/config';
import { prisma } from '../src/config/prisma';

(async () => {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database connection successful:', result);
    
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    const productCount = await prisma.product.count();
    console.log('Product count:', productCount);
    
    const orderCount = await prisma.order.count();
    console.log('Order count:', orderCount);
    
    process.exit(0);
  } catch (e) {
    console.error('Connection failed:', e.message);
    process.exit(1);
  }
})();
