import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample materials
  const materials = await Promise.all([
    prisma.material.upsert({
      where: { code: 'COATED_250' },
      update: {},
      create: {
        code: 'COATED_250',
        name: 'Coated Paper 250gsm',
        unitPrice: 0.0025,
        currency: 'USD',
        metadata: {
          weight: 250,
          finish: 'coated',
          unit: 'gsm',
        },
      },
    }),
    prisma.material.upsert({
      where: { code: 'UNCOATED_200' },
      update: {},
      create: {
        code: 'UNCOATED_200',
        name: 'Uncoated Paper 200gsm',
        unitPrice: 0.002,
        currency: 'USD',
        metadata: {
          weight: 200,
          finish: 'uncoated',
          unit: 'gsm',
        },
      },
    }),
    prisma.material.upsert({
      where: { code: 'CORRUGATED_E' },
      update: {},
      create: {
        code: 'CORRUGATED_E',
        name: 'Corrugated Board E-Flute',
        unitPrice: 0.005,
        currency: 'USD',
        metadata: {
          flute: 'E',
          thickness: '1.5mm',
        },
      },
    }),
  ]);

  console.log(`Created ${materials.length} materials`);

  // Create sample pricing rules
  const pricingRules = await Promise.all([
    prisma.pricingRule.upsert({
      where: { id: 'default-margin' },
      update: {},
      create: {
        id: 'default-margin',
        productType: 'box',
        ruleType: 'margin',
        value: 0.35, // 35% margin
        isActive: true,
      },
    }),
    prisma.pricingRule.upsert({
      where: { id: 'bag-margin' },
      update: {},
      create: {
        id: 'bag-margin',
        productType: 'bag',
        ruleType: 'margin',
        value: 0.30, // 30% margin
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${pricingRules.length} pricing rules`);

  // Create sample vendor (for testing)
  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@example.com' },
    update: {},
    create: {
      email: 'vendor@example.com',
      passwordHash: '$2b$10$rFqKq6xqQxQxQxQxQxQxQeQxQxQxQxQxQxQxQxQxQxQxQxQxQxQ', // password: vendor123
      role: 'VENDOR',
      firstName: 'Test',
      lastName: 'Vendor',
      emailVerified: true,
    },
  });

  const vendor = await prisma.vendor.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      companyName: 'Test Printing Co.',
      address: '123 Industrial St',
      city: 'Cairo',
      country: 'Egypt',
      postalCode: '11511',
      latitude: 30.0444,
      longitude: 31.2357,
      phone: '+20 123 456 7890',
      email: 'vendor@example.com',
      isActive: true,
      qualityRating: 4.5,
      averageLeadTime: 5,
      minOrderQuantity: 100,
    },
  });

  console.log('Created sample vendor:', vendor.companyName);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
