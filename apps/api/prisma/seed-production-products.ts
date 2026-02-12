import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Production-Ready Product Seeder for RoboHatch
 * 
 * Run with: npx tsx prisma/seed-production-products.ts
 */

async function seedProductionProducts() {
  console.log('🌱 Starting production product seeding...\n');

  // Step 1: Create/verify categories
  console.log('📂 Step 1: Creating categories...');
  
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'keychains' },
      update: {},
      create: {
        name: 'Keychains',
        slug: 'keychains',
        description: 'Personalized and themed 3D printed keychains. Durable, lightweight, and customizable.',
        type: 'DEFAULT',
      }
    }),
    prisma.category.upsert({
      where: { slug: 'lamps' },
      update: {},
      create: {
        name: 'Lamps',
        slug: 'lamps',
        description: 'LED lamps with unique 3D printed designs. Perfect ambient lighting for any space.',
        type: 'DEFAULT',
      }
    }),
    prisma.category.upsert({
      where: { slug: 'anime-things' },
      update: {},
      create: {
        name: 'Anime Things',
        slug: 'anime-things',
        description: 'Anime-inspired figurines, accessories, and collectibles for true fans.',
        type: 'DEFAULT',
      }
    }),
    prisma.category.upsert({
      where: { slug: 'devotional-idols' },
      update: {},
      create: {
        name: 'Devotional Idols',
        slug: 'devotional-idols',
        description: 'Beautifully crafted deity idols and spiritual decorative items.',
        type: 'DEFAULT',
      }
    }),
    prisma.category.upsert({
      where: { slug: 'mobile-accessories' },
      update: {},
      create: {
        name: 'Mobile Accessories',
        slug: 'mobile-accessories',
        description: 'Phone stands, holders, and protective accessories with custom designs.',
        type: 'DEFAULT',
      }
    }),
  ]);

  console.log(`✅ Created/verified ${categories.length} categories\n`);

  // Step 2: Define production products
  console.log('🛍️  Step 2: Creating products...');
  
  const products = [
    // KEYCHAINS CATEGORY
    {
      name: 'Custom Name Keychain',
      description: 'Personalized 3D printed keychain with your name or text. Available in multiple vibrant colors. Made from high-quality PLA material - durable, lightweight, and eco-friendly. Perfect gift for friends, family, or corporate giveaways. Maximum 10 characters. Processing time: 2-3 business days.',
      price: 149,
      stock: 100,
      categorySlug: 'keychains',
      images: [
        'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=600',
      ]
    },
    {
      name: 'Superhero Logo Keychain',
      description: 'Premium quality superhero logo keychains featuring popular hero symbols. Detailed 3D printing with smooth finish. Available designs: Captain, Iron, Spider, Bat symbols. Great collectible for fans. Dimensions: 5cm x 4cm. Includes sturdy keyring attachment.',
      price: 199,
      stock: 75,
      categorySlug: 'keychains',
      images: [
        'https://images.unsplash.com/photo-1608889476518-738c9b1dcb8e?w=600',
      ]
    },
    {
      name: 'Bike/Car Model Keychain',
      description: 'Miniature 3D printed vehicle models as keychains. Popular models available: Royal Enfield, KTM Duke, BMW, Audi. Intricate details and realistic design. Perfect for automobile enthusiasts. Lightweight yet sturdy construction.',
      price: 249,
      stock: 50,
      categorySlug: 'keychains',
      images: [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
      ]
    },

    // LAMPS CATEGORY
    {
      name: 'Moon Lamp - 15cm Diameter',
      description: '3D printed moon lamp with realistic lunar surface texture. USB rechargeable with 8-12 hour battery life. Three color modes: warm white, cool white, and warm yellow. Touch control for easy operation. Includes wooden stand and USB charging cable. Perfect ambient lighting for bedrooms, living rooms, or as a night light. Makes an excellent gift.',
      price: 899,
      stock: 40,
      categorySlug: 'lamps',
      images: [
        'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=600',
      ]
    },
    {
      name: 'Lithophane Photo Lamp',
      description: 'Transform your cherished memories into a stunning lamp! Custom photo converted to 3D lithophane that glows beautifully when backlit with LED. Send us your photo after ordering. Perfect gift for anniversaries, birthdays, or special occasions. Includes LED base with USB power. Photo resolution requirements: minimum 1080p. Processing time: 4-5 business days.',
      price: 1299,
      stock: 25,
      categorySlug: 'lamps',
      images: [
        'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600',
      ]
    },
    {
      name: 'Geometric LED Lamp',
      description: 'Modern geometric design LED lamp with 3D printed shade. Creates stunning shadow patterns. Available in: hexagon, dodecahedron, and pyramid designs. Energy-efficient LED bulb included (3W warm white). Matte finish in black or white. Dimensions: 20cm height. Perfect for desks, shelves, or bedside tables.',
      price: 749,
      stock: 35,
      categorySlug: 'lamps',
      images: [
        'https://images.unsplash.com/photo-1507473885765-e6ed057f782f?w=600',
      ]
    },

    // ANIME THINGS CATEGORY
    {
      name: 'Anime Character Figurine - 12cm',
      description: 'Detailed 3D printed anime character figurine. Popular characters available (contact after ordering for character selection). Hand-finished with smooth surface. Height: 12cm. Sturdy base included. Perfect for desk decoration or collection display. Note: Unpainted version. Painting service available at additional cost.',
      price: 599,
      stock: 30,
      categorySlug: 'anime-things',
      images: [
        'https://images.unsplash.com/photo-1601814933824-fd0b574dd592?w=600',
      ]
    },
    {
      name: 'Anime Phone Stand',
      description: 'Unique anime-themed phone stand. Features popular anime character poses holding your phone. Compatible with all smartphones up to 6.7 inches. Adjustable viewing angle. Non-slip base. Available characters: mention preference after ordering. Dimensions: 10cm x 8cm base.',
      price: 349,
      stock: 60,
      categorySlug: 'anime-things',
      images: [
        'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=600',
      ]
    },

    // DEVOTIONAL IDOLS CATEGORY
    {
      name: 'Ganesha Idol - 15cm',
      description: 'Beautifully crafted Lord Ganesha idol with intricate details. 3D printed in eco-friendly PLA. Available in: natural white, gold finish, or hand-painted. Perfect for home temple, office desk, or as a spiritual gift. Height: 15cm. Smooth finish with fine detailing. Lightweight and durable.',
      price: 799,
      stock: 45,
      categorySlug: 'devotional-idols',
      images: [
        'https://images.unsplash.com/photo-1580461368021-64d5a37a5dae?w=600',
      ]
    },
    {
      name: 'Buddha Meditation Statue',
      description: 'Serene Buddha statue in meditation pose. Creates peaceful ambiance. Material: premium PLA with smooth matte finish. Available in: stone grey, bronze finish, or pure white. Height: 18cm. Perfect for meditation spaces, yoga studios, or home decor. Inspires tranquility and mindfulness.',
      price: 699,
      stock: 35,
      categorySlug: 'devotional-idols',
      images: [
        'https://images.unsplash.com/photo-1545495207-c8a5a8f21e91?w=600',
      ]
    },

    // MOBILE ACCESSORIES CATEGORY
    {
      name: 'Adjustable Phone Stand',
      description: 'Universal adjustable phone stand with multi-angle viewing. Compatible with all smartphones and small tablets (up to 10 inches). Sturdy construction with anti-slip base and phone rest. Foldable design for portability. Perfect for video calls, watching content, or desk use. Available colors: black, white, grey.',
      price: 299,
      stock: 80,
      categorySlug: 'mobile-accessories',
      images: [
        'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600',
      ]
    },
    {
      name: 'Cable Management Holder',
      description: 'Keep your charging cables organized! 3D printed cable holder with 4 slots. Adhesive backing for easy mounting on desk, wall, or bedside table. Prevents cable tangling and damage. Durable PLA construction. Dimensions: 10cm x 5cm. Available in multiple colors to match your setup.',
      price: 199,
      stock: 100,
      categorySlug: 'mobile-accessories',
      images: [
        'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=600',
      ]
    },
    {
      name: 'Headphone Stand/Holder',
      description: 'Premium headphone stand with cable management. Protects your headphones from damage and keeps desk tidy. Compatible with all headphone sizes. Weighted base for stability. Modern minimalist design. Height: 25cm. Cable wrap feature at base. Available in: matte black, metallic grey, or white.',
      price: 449,
      stock: 50,
      categorySlug: 'mobile-accessories',
      images: [
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600',
      ]
    },
  ];

  console.log(`📦 Processing ${products.length} products...\n`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const productData of products) {
    try {
      // Find category
      const category = categories.find(c => c.slug === productData.categorySlug);
      if (!category) {
        console.error(`❌ Category ${productData.categorySlug} not found for ${productData.name}`);
        skippedCount++;
        continue;
      }

      // Check if product already exists
      const existingProduct = await prisma.product.findFirst({
        where: { name: productData.name }
      });

      if (existingProduct) {
        console.log(`⏭️  Skipped (exists): ${productData.name}`);
        skippedCount++;
        continue;
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          name: productData.name,
          description: productData.description,
          price: productData.price,
          stock: productData.stock,
          isActive: true,
        }
      });

      // Link to category
      await prisma.productCategory.create({
        data: {
          productId: product.id,
          categoryId: category.id,
        }
      });

      // Add images
      for (let i = 0; i < productData.images.length; i++) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: productData.images[i],
            alt: `${productData.name} - Image ${i + 1}`,
            order: i,
          }
        });
      }

      console.log(`✅ Created: ${product.name} (₹${product.price}, stock: ${product.stock})`);
      createdCount++;

    } catch (error: any) {
      console.error(`❌ Failed to create ${productData.name}:`, error.message);
      skippedCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Seeding Complete!');
  console.log('='.repeat(60));
  console.log(`✅ Products created: ${createdCount}`);
  console.log(`⏭️  Products skipped: ${skippedCount}`);
  console.log(`📂 Categories: ${categories.length}`);
  console.log(`💰 Total inventory value: ₹${products.reduce((sum, p) => sum + (p.price * p.stock), 0).toLocaleString('en-IN')}`);
  console.log('='.repeat(60) + '\n');

  console.log('🔍 Quick verification:');
  const totalProducts = await prisma.product.count();
  const totalCategories = await prisma.category.count();
  console.log(`   Total products in DB: ${totalProducts}`);
  console.log(`   Total categories in DB: ${totalCategories}`);
  
  console.log('\n🚀 Next steps:');
  console.log('   1. Visit http://localhost:3000/products to see all products');
  console.log('   2. Test adding products to cart and checkout flow');
  console.log('   3. Replace Unsplash URLs with actual AWS S3 product images');
  console.log('   4. Update product descriptions with real specifications\n');
}

// Execute seeder
seedProductionProducts()
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('✅ Database connection closed\n');
  });
