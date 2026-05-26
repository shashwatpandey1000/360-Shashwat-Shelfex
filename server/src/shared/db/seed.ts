import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and } from 'drizzle-orm';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Industries
const INDUSTRIES = [
  'Food & Beverages',
  'Electronics & Technology',
  'Fashion & Apparel',
  'Pharmacy & Healthcare',
  'General Retail',
  'Home & Lifestyle',
  'Other',
];

// Store Categories
const STORE_CATEGORIES = [
  'Restaurant',
  'Retail Store',
  'Retail + Restaurant',
  'Supermarket',
  'Other',
];

// Role Templates + Permissions
const ROLE_TEMPLATES = [
  {
    name: 'org_manager',
    displayName: 'Organization Manager',
    description: 'Full access to everything in the org — all stores, all modules, all actions',
    permissions: [
      'dashboard:read',
      'stores:read',
      'stores:write',
      'stores:delete',
      'stores:download',
      'stores:import',
      'surveys:read',
      'surveys:write',
      'surveys:delete',
      'surveys:download',
      'employees:read',
      'employees:write',
      'employees:delete',
      'employees:manage',
      'schedule:read',
      'schedule:write',
      'schedule:delete',
      'settings:read',
      'settings:write',
    ],
  },
  {
    name: 'zone_manager',
    displayName: 'Zone Manager',
    description: 'Read/write access to stores in assigned zones, employee management within zone',
    permissions: [
      'dashboard:read',
      'stores:read',
      'stores:write',
      'stores:download',
      'surveys:read',
      'surveys:download',
      'employees:read',
      'employees:write',
      'employees:manage',
      'schedule:read',
      'settings:read',
    ],
  },
  {
    name: 'store_manager',
    displayName: 'Store Manager',
    description: 'Full access to assigned stores, surveyor management, survey assignment',
    permissions: [
      'dashboard:read',
      'stores:read',
      'surveys:read',
      'employees:read',
      'employees:write',
      'employees:manage',
      'schedule:read',
      'settings:read',
    ],
  },
  {
    name: 'surveyor',
    displayName: 'Surveyor',
    description: 'Survey execution only for assigned stores',
    permissions: ['surveys:execute'],
  },
];

// Seed Function
async function seed() {
  console.log('🌱 Seeding database...\n');

  // 1. Industries
  console.log('📦 Seeding industries...');
  for (let i = 0; i < INDUSTRIES.length; i++) {
    const name = INDUSTRIES[i];
    const existing = await db
      .select()
      .from(schema.industries)
      .where(eq(schema.industries.name, name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.industries).values({ name, displayOrder: i });
      console.log(`   ✅ ${name}`);
    } else {
      console.log(`   ⏭️  ${name} (already exists)`);
    }
  }

  // 2. Store Categories
  console.log('\n🏪 Seeding store categories...');
  for (let i = 0; i < STORE_CATEGORIES.length; i++) {
    const name = STORE_CATEGORIES[i];
    const existing = await db
      .select()
      .from(schema.storeCategories)
      .where(eq(schema.storeCategories.name, name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.storeCategories).values({ name, displayOrder: i });
      console.log(`   ✅ ${name}`);
    } else {
      console.log(`   ⏭️  ${name} (already exists)`);
    }
  }

  // 3. Role Templates + Permissions
  console.log('\n🔐 Seeding role templates + permissions...');
  for (const tmpl of ROLE_TEMPLATES) {
    const existing = await db
      .select()
      .from(schema.roleTemplates)
      .where(eq(schema.roleTemplates.name, tmpl.name))
      .limit(1);

    let templateId: string;

    if (existing.length === 0) {
      const [inserted] = await db
        .insert(schema.roleTemplates)
        .values({
          orgId: null, // system-wide default
          name: tmpl.name,
          displayName: tmpl.displayName,
          description: tmpl.description,
          isSystem: true,
        })
        .returning({ id: schema.roleTemplates.id });

      templateId = inserted.id;
      console.log(`   ✅ ${tmpl.displayName}`);
    } else {
      templateId = existing[0].id;
      console.log(`   ⏭️  ${tmpl.displayName} (already exists)`);
    }

    // Insert permissions for this template
    for (const permission of tmpl.permissions) {
      const existingPerm = await db
        .select()
        .from(schema.roleTemplatePermissions)
        .where(
          and(
            eq(schema.roleTemplatePermissions.roleTemplateId, templateId),
            eq(schema.roleTemplatePermissions.permission, permission),
          ),
        )
        .limit(1);

      if (existingPerm.length === 0) {
        await db.insert(schema.roleTemplatePermissions).values({
          orgId: null,
          roleTemplateId: templateId,
          permission,
        });
      }
    }
    console.log(`      → ${tmpl.permissions.length} permissions`);
  }

  console.log('\n✅ Seed complete!\n');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
