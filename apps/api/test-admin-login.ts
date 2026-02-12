import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testAdminLogin() {
  try {
    console.log('🔍 Testing admin login...\n');

    const email = 'Admin@robohatch.in';
    const password = 'Admin@123456789090';

    // Find admin user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error('❌ Admin user NOT found with email:', email);
      process.exit(1);
    }

    console.log('✅ Admin user found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    console.log('   Password Hash:', user.password.substring(0, 30) + '...');
    console.log('');

    // Test password comparison
    console.log('🔐 Testing password comparison...');
    console.log('   Password to test:', password);
    console.log('');

    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
      console.log('✅ PASSWORD MATCH! Login should work.');
      console.log('');
      console.log('🎯 Login credentials:');
      console.log('   Email: Admin@robohatch.in');
      console.log('   Password: Admin@123456789090');
      console.log('');
      console.log('🌐 Login at: http://localhost:3001/login');
    } else {
      console.log('❌ PASSWORD MISMATCH!');
      console.log('');
      console.log('The stored password hash does not match the expected password.');
      console.log('This explains the 401 error.');
      console.log('');
      console.log('🔧 Fix options:');
      console.log('1. Re-create admin user with correct password');
      console.log('2. Check if password was hashed with different bcrypt rounds');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminLogin();
