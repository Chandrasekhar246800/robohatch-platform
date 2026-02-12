import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAdminEmail() {
  try {
    console.log('🔧 Updating admin email to lowercase...');
    
    // Find admin user with capital A
    const admin = await prisma.user.findFirst({
      where: {
        email: 'Admin@robohatch.in'
      }
    });
    
    if (!admin) {
      console.log('❌ Admin user with "Admin@robohatch.in" not found');
      
      // Check if lowercase already exists
      const lowerAdmin = await prisma.user.findFirst({
        where: {
          email: 'admin@robohatch.in'
        }
      });
      
      if (lowerAdmin) {
        console.log('✅ Admin user already has lowercase email: admin@robohatch.in');
      } else {
        console.log('⚠️  No admin user found with either case');
      }
      
      return;
    }
    
    console.log(`Found admin: ${admin.email} (ID: ${admin.id})`);
    
    // Update to lowercase
    const updated = await prisma.user.update({
      where: { id: admin.id },
      data: { email: 'admin@robohatch.in' }
    });
    
    console.log('✅ Admin email updated to:', updated.email);
    console.log('');
    console.log('You can now login with either:');
    console.log('  - admin@robohatch.in (lowercase)');
    console.log('  - Admin@robohatch.in (will be converted to lowercase)');
    console.log('  - ADMIN@robohatch.in (will be converted to lowercase)');
    console.log('');
    console.log('Password remains: Admin@123456789090');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminEmail();
