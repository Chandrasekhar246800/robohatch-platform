import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addDevotionalCategory() {
  try {
    const category = await prisma.category.create({
      data: {
        name: 'Devotional Items',
      },
    });
    console.log('✅ Created category:', category.name);
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log('✅ Category "Devotional Items" already exists');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

addDevotionalCategory();
