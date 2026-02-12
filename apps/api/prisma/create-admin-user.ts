import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Create admin user for RoboHatch platform
 * 
 * Credentials:
 * Email: Admin@robohatch.in
 * Password: Admin@123456789090
 */

async function createAdminUser() {
  console.log('🔐 Creating admin user...\n');

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'Admin@robohatch.in' }
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('   Email:', existingAdmin.email);
      console.log('   Role:', existingAdmin.role);
      console.log('\n✅ You can login with existing credentials');
      return;
    }

    // Hash password
    const password = 'Admin@123456789090';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: 'Admin@robohatch.in',
        password: hashedPassword,
        name: 'RoboHatch Admin',
        role: 'ADMIN'
      }
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('📋 Admin Details:');
    console.log('   Email:', admin.email);
    console.log('   Name:', admin.name);
    console.log('   Role:', admin.role);
    console.log('   Created:', admin.createdAt);
    console.log('\n🔑 Login Credentials:');
    console.log('   Email:    Admin@robohatch.in');
    console.log('   Password: Admin@123456789090');
    console.log('\n🌐 Login URL: http://localhost:3001/login');
    console.log('\n✅ Admin panel access after login:');
    console.log('   • Dashboard: http://localhost:3001/admin');
    console.log('   • Add Products: http://localhost:3001/admin/products/add');
    console.log('   • Categories: http://localhost:3001/admin/categories');

  } catch (error: any) {
    console.error('\n❌ Error creating admin user:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Database connection closed\n');
  }
}

createAdminUser();
