import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    console.log('\n🔍 Checking for admin user...\n');
    
    const admin = await prisma.user.findUnique({
      where: { email: 'Admin@robohatch.in' }
    });
    
    if (admin) {
      console.log('✅ Admin user EXISTS in database');
      console.log('   Email:', admin.email);
      console.log('   Name:', admin.name || 'Not set');
      console.log('   Role:', admin.role);
      console.log('   Created:', admin.createdAt);
      console.log('\n✅ You can login with:');
      console.log('   Email: Admin@robohatch.in');
      console.log('   Password: Admin@123456789090');
      console.log('\n🌐 Login at: http://localhost:3001/login');
    } else {
      console.log('❌ Admin user NOT found in database');
      console.log('\n💡 To create admin user, run:');
      console.log('   npx tsx prisma/create-admin-user.ts');
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
