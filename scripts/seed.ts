/**
 * EvidentIS Database Seed Script
 * Creates demo data for development and testing
 * 
 * Usage: SEED_DEMO_DATA=true npm run db:seed
 * WARNING: Never run in production!
 */

import { Pool } from 'pg';
import { createHash, randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEMO_PASSWORD = 'EvidentIS2026Demo!';
const SALT_ROUNDS = 10;

const INDIAN_STATE_CODES = [
  'AP', 'AR', 'AS', 'BR', 'CT', 'GA', 'GJ', 'HR', 'HP', 'JH',
  'KA', 'KL', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL', 'OD', 'PB',
  'RJ', 'SK', 'TN', 'TG', 'TR', 'UP', 'UK', 'WB', 'DL', 'JK',
  'LA', 'CH', 'PY', 'AN', 'DH', 'LD'
];

const CLAUSE_TYPES = [
  'indemnification', 'limitation_of_liability', 'termination_for_convenience',
  'termination_for_cause', 'confidentiality', 'non_compete', 'non_solicitation',
  'intellectual_property', 'governing_law', 'arbitration', 'jury_waiver',
  'class_action_waiver', 'force_majeure', 'assignment', 'notice_requirements',
  'amendment', 'severability', 'entire_agreement', 'warranty_disclaimer',
  'data_privacy', 'insurance_requirements', 'compliance_with_laws', 'audit_rights',
  'most_favored_nation'
];

// ============================================================================
// DEMO DATA DEFINITIONS
// ============================================================================

interface DemoTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  barState: string;
}

interface DemoAttorney {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  role: string;
  practiceGroup?: string;
  barNumber?: string;
  barState?: string;
}

interface DemoMatter {
  id: string;
  tenantId: string;
  matterCode: string;
  matterName: string;
  matterType: string;
  clientName: string;
  counterpartyName?: string;
  governingLawState: string;
  status: string;
  priority: string;
  healthScore: number;
  dealValuePaise?: number;
}

// ============================================================================
// SEED DATA
// ============================================================================

const demoTenants: DemoTenant[] = [
  { id: randomUUID(), name: 'Sharma & Associates LLP', slug: 'sharma-associates', plan: 'professional', barState: 'MH' },
  { id: randomUUID(), name: 'Delhi Corporate Law Group', slug: 'delhi-corporate', plan: 'growth', barState: 'DL' },
  { id: randomUUID(), name: 'Bengaluru Legal Counsel', slug: 'bengaluru-legal', plan: 'starter', barState: 'KA' },
];

function createDemoAttorneys(tenants: DemoTenant[]): DemoAttorney[] {
  const attorneys: DemoAttorney[] = [];
  
  tenants.forEach(tenant => {
    // Admin
    attorneys.push({
      id: randomUUID(),
      tenantId: tenant.id,
      email: `admin@${tenant.slug}.com`,
      displayName: 'Admin User',
      role: 'admin',
      practiceGroup: 'Administration',
    });
    
    // Partner
    attorneys.push({
      id: randomUUID(),
      tenantId: tenant.id,
      email: `partner@${tenant.slug}.com`,
      displayName: 'Senior Partner',
      role: 'partner',
      practiceGroup: 'Corporate',
      barNumber: `${tenant.barState}123456`,
      barState: tenant.barState,
    });
    
    // Associates
    ['corporate', 'litigation', 'intellectual_property'].forEach((group, i) => {
      attorneys.push({
        id: randomUUID(),
        tenantId: tenant.id,
        email: `${group}.associate@${tenant.slug}.com`,
        displayName: `${group.charAt(0).toUpperCase() + group.slice(1)} Associate`,
        role: 'advocate',
        practiceGroup: group.charAt(0).toUpperCase() + group.slice(1),
        barNumber: `${tenant.barState}${100000 + i}`,
        barState: tenant.barState,
      });
    });
    
    // Paralegal
    attorneys.push({
      id: randomUUID(),
      tenantId: tenant.id,
      email: `paralegal@${tenant.slug}.com`,
      displayName: 'Paralegal Staff',
      role: 'paralegal',
      practiceGroup: 'Corporate',
    });
  });
  
  return attorneys;
}

function createDemoMatters(tenants: DemoTenant[], attorneys: DemoAttorney[]): DemoMatter[] {
  const matters: DemoMatter[] = [];
  
  const matterTemplates = [
    { name: 'TechCorp Acquisition', type: 'merger_acquisition', client: 'TechCorp Industries', counterparty: 'InnovateSoft LLC', value: 5000000000 },
    { name: 'CloudService SaaS Agreement', type: 'commercial_contract', client: 'CloudService Inc', counterparty: 'DataPro Systems', value: 120000000 },
    { name: 'Downtown Office Lease', type: 'real_estate', client: 'Metro Properties', counterparty: 'Building Partners', value: 2500000000 },
    { name: 'Patent Dispute - Widget Tech', type: 'litigation', client: 'Widget Technologies', counterparty: 'CompetitorCo', value: 1000000000 },
    { name: 'Software License Negotiation', type: 'intellectual_property', client: 'SoftDev Corp', counterparty: 'Enterprise Systems', value: 50000000 },
    { name: 'Executive Employment Package', type: 'labour_employment', client: 'FinanceGroup', counterparty: null, value: 5000000 },
    { name: 'FDA Compliance Review', type: 'regulatory_compliance', client: 'PharmaCo', counterparty: null, value: null },
    { name: 'Series B Financing', type: 'merger_acquisition', client: 'StartupXYZ', counterparty: 'Venture Capital Partners', value: 25000000000 },
    { name: 'Distribution Agreement - APAC', type: 'commercial_contract', client: 'GlobalDistrib', counterparty: 'APAC Partners', value: 80000000 },
    { name: 'Data Center Lease', type: 'real_estate', client: 'DataHost Inc', counterparty: 'Industrial Properties', value: 1500000000 },
  ];
  
  const statuses = ['open', 'open', 'open', 'under_review', 'closed'];
  const priorities = ['normal', 'normal', 'high', 'urgent', 'low'];
  
  tenants.forEach((tenant, ti) => {
    matterTemplates.forEach((template, mi) => {
      const state = INDIAN_STATE_CODES[(ti * 10 + mi) % INDIAN_STATE_CODES.length];
      
      matters.push({
        id: randomUUID(),
        tenantId: tenant.id,
        matterCode: `M-2026-${String(ti * 100 + mi + 1).padStart(3, '0')}`,
        matterName: template.name,
        matterType: template.type,
        clientName: template.client,
        counterpartyName: template.counterparty || undefined,
        governingLawState: state,
        status: statuses[mi % statuses.length],
        priority: priorities[mi % priorities.length],
        healthScore: 60 + Math.floor(Math.random() * 40),
        dealValuePaise: template.value || undefined,
      });
    });
  });
  
  return matters;
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedTenants(pool: Pool, tenants: DemoTenant[]): Promise<DemoTenant[]> {
  console.log('  Seeding tenants...');
  const seededTenants: DemoTenant[] = [];
  
  for (const tenant of tenants) {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO tenants (id, name, slug, plan, bar_state, subscription_status, created_at)
        VALUES ($1, $2, $3, $4, $5, 'active', NOW())
       ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name,
           plan = EXCLUDED.plan,
           bar_state = EXCLUDED.bar_state,
           subscription_status = EXCLUDED.subscription_status
       RETURNING id`,
      [tenant.id, tenant.name, tenant.slug, tenant.plan, tenant.barState]
    );

    seededTenants.push({
      ...tenant,
      id: result.rows[0].id,
    });
  }
  
  console.log(`    ✓ Created ${tenants.length} tenants`);
  return seededTenants;
}

async function seedAttorneys(pool: Pool, attorneys: DemoAttorney[]): Promise<DemoAttorney[]> {
  console.log('  Seeding attorneys...');
  const seededAttorneys: DemoAttorney[] = [];
  
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
  
  for (const attorney of attorneys) {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO attorneys (
        id, tenant_id, email, display_name, role, practice_group,
        bar_number, bar_state, bar_council_enrollment_number, bar_council_state,
        password_hash, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $7, $8, $9, 'active', NOW())
      ON CONFLICT (tenant_id, email) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          role = EXCLUDED.role,
          practice_group = EXCLUDED.practice_group,
          bar_number = EXCLUDED.bar_number,
          bar_state = EXCLUDED.bar_state,
          bar_council_enrollment_number = EXCLUDED.bar_council_enrollment_number,
          bar_council_state = EXCLUDED.bar_council_state,
          status = EXCLUDED.status
      RETURNING id`,
      [
        attorney.id, attorney.tenantId, attorney.email, attorney.displayName,
        attorney.role, attorney.practiceGroup, attorney.barNumber,
        attorney.barState, passwordHash
      ]
    );

    seededAttorneys.push({
      ...attorney,
      id: result.rows[0].id,
    });
  }
  
  console.log(`    ✓ Created ${attorneys.length} attorneys`);
  console.log(`    ℹ Demo password: ${DEMO_PASSWORD}`);
  return seededAttorneys;
}

async function seedMatters(pool: Pool, matters: DemoMatter[], attorneys: DemoAttorney[]): Promise<void> {
  console.log('  Seeding matters...');
  
  for (const matter of matters) {
    const leadAttorney = attorneys.find(a => a.tenantId === matter.tenantId && a.role === 'partner');
    const creator = attorneys.find(a => a.tenantId === matter.tenantId && a.role === 'admin');
    
    await pool.query(
      `INSERT INTO matters (
        id, tenant_id, matter_code, matter_name, matter_type, client_name,
        counterparty_name, governing_law_state, status, priority, health_score,
        deal_value_paise, deal_value_cents, lead_advocate_id, lead_attorney_id, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $13, $13, $14, NOW(), NOW())
      ON CONFLICT DO NOTHING`,
      [
        matter.id, matter.tenantId, matter.matterCode, matter.matterName,
        matter.matterType, matter.clientName, matter.counterpartyName,
        matter.governingLawState, matter.status, matter.priority, matter.healthScore,
        matter.dealValuePaise, leadAttorney?.id, creator?.id
      ]
    );
  }
  
  console.log(`    ✓ Created ${matters.length} matters`);
}

async function seedPlaybooks(pool: Pool, tenants: DemoTenant[], attorneys: DemoAttorney[]): Promise<void> {
  console.log('  Seeding playbooks...');
  
  const playbookTemplates = [
    {
      name: 'M&A Standard Playbook',
      practiceArea: 'merger_acquisition',
      description: 'Standard due diligence and negotiation playbook for M&A transactions',
      rules: [
        { ruleId: 'r001', clauseType: 'indemnification', condition: 'missing', severity: 'high', description: 'Indemnification clause is required' },
        { ruleId: 'r002', clauseType: 'limitation_of_liability', condition: 'missing', severity: 'high', description: 'Liability cap must be specified' },
      ],
    },
    {
      name: 'Commercial Contracts',
      practiceArea: 'commercial_contract',
      description: 'Standard terms for commercial agreements',
      rules: [
        { ruleId: 'r003', clauseType: 'governing_law', condition: 'missing', severity: 'medium', description: 'Governing law must be specified' },
        { ruleId: 'r004', clauseType: 'termination_for_cause', condition: 'missing', severity: 'medium', description: 'Termination provisions required' },
      ],
    },
    {
      name: 'Employment Agreements',
      practiceArea: 'labour_employment',
      description: 'Compliance-focused playbook for employment matters',
      rules: [
        { ruleId: 'r005', clauseType: 'confidentiality', condition: 'missing', severity: 'high', description: 'Confidentiality clause is required' },
      ],
    },
    {
      name: 'IP Licensing',
      practiceArea: 'intellectual_property',
      description: 'Intellectual property licensing standards',
      rules: [
        { ruleId: 'r006', clauseType: 'intellectual_property', condition: 'missing', severity: 'high', description: 'IP ownership and license terms must be defined' },
      ],
    },
  ];
  
  let count = 0;
  for (const tenant of tenants) {
    const admin = attorneys.find((attorney) => attorney.tenantId === tenant.id && attorney.role === 'admin');

    for (const template of playbookTemplates) {
      const existing = await pool.query<{ id: string }>(
        `SELECT id FROM playbooks WHERE tenant_id = $1 AND name = $2 LIMIT 1`,
        [tenant.id, template.name]
      );

      if (existing.rows[0]) {
        await pool.query(
          `UPDATE playbooks
           SET description = $3,
               practice_area = $4,
               rules = $5::jsonb,
               is_active = true
           WHERE id = $1 AND tenant_id = $2`,
          [existing.rows[0].id, tenant.id, template.description, template.practiceArea, JSON.stringify(template.rules)]
        );
      } else {
        await pool.query(
          `INSERT INTO playbooks (id, tenant_id, name, description, practice_area, rules, is_active, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, true, $7, NOW())`,
          [randomUUID(), tenant.id, template.name, template.description, template.practiceArea, JSON.stringify(template.rules), admin?.id ?? null]
        );
      }

      count++;
    }
  }
  
  console.log(`    ✓ Upserted ${count} playbooks with rules`);
}

async function seedObligations(pool: Pool, matters: DemoMatter[], attorneys: DemoAttorney[]): Promise<void> {
  console.log('  Seeding obligations...');
  
  const obligationTemplates = [
    { description: 'Execute final agreement', daysFromNow: 30, status: 'pending' },
    { description: 'Deliver closing documents', daysFromNow: 45, status: 'pending' },
    { description: 'Complete due diligence review', daysFromNow: -5, status: 'overdue' },
    { description: 'Submit regulatory filing', daysFromNow: 15, status: 'in_progress' },
    { description: 'Obtain board approval', daysFromNow: 7, status: 'pending' },
  ];
  
  let count = 0;
  for (const matter of matters.slice(0, 15)) {
    const assignee = attorneys.find(a => a.tenantId === matter.tenantId && a.role === 'advocate');
    const creator = attorneys.find(a => a.tenantId === matter.tenantId && a.role === 'admin');
    
    const template = obligationTemplates[count % obligationTemplates.length];
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + template.daysFromNow);

    const existingDocument = await pool.query<{ id: string }>(
      `SELECT id FROM documents WHERE tenant_id = $1 AND matter_id = $2 ORDER BY created_at ASC LIMIT 1`,
      [matter.tenantId, matter.id]
    );

    let documentId = existingDocument.rows[0]?.id;
    if (!documentId) {
      documentId = randomUUID();
      const sourceName = `${matter.matterCode}-seed-document.txt`;
      const sha256 = createHash('sha256')
        .update(`${matter.id}:${template.description}:${sourceName}`)
        .digest('hex');

      await pool.query(
        `INSERT INTO documents (
          id, tenant_id, matter_id, source_name, mime_type, doc_type, sha256, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'text/plain', 'contract', $5, $6, NOW(), NOW())
        ON CONFLICT DO NOTHING`,
        [documentId, matter.tenantId, matter.id, sourceName, sha256, creator?.id || assignee?.id || null]
      );
    }
    
    await pool.query(
      `INSERT INTO obligations (
        id, tenant_id, document_id, matter_id, obligation_type, description, responsible_party,
        deadline, status, completed_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'milestone', $5, 'client', $6, $7, $8, NOW(), NOW())
      ON CONFLICT DO NOTHING`,
      [
        randomUUID(), matter.tenantId, documentId, matter.id, template.description,
        deadline.toISOString(), template.status, assignee?.id || null
      ]
    );
    
    count++;
  }
  
  console.log(`    ✓ Created ${count} obligations`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║        EvidentIS Demo Data Seeding            ║');
  console.log('╚═══════════════════════════════════════════╝\n');
  
  // Safety check
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO_DATA !== 'true') {
    console.error('❌ ERROR: Cannot seed demo data in production!');
    console.error('   Set SEED_DEMO_DATA=true to override (not recommended)');
    process.exit(1);
  }
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    console.log('📊 Generating demo data...\n');

    console.log('💾 Inserting into database...\n');

    const seededTenants = await seedTenants(pool, demoTenants);
    const attorneys = createDemoAttorneys(seededTenants);
    const seededAttorneys = await seedAttorneys(pool, attorneys);
    const matters = createDemoMatters(seededTenants, seededAttorneys);

    await seedMatters(pool, matters, seededAttorneys);
    await seedPlaybooks(pool, seededTenants, seededAttorneys);
    await seedObligations(pool, matters, seededAttorneys);
    
    console.log('\n✅ Demo data seeded successfully!\n');
    
    console.log('📝 Demo Login Credentials:');
    console.log('   ─────────────────────────');
    seededTenants.forEach(tenant => {
      console.log(`\n   ${tenant.name} (${tenant.slug})`);
      console.log(`   • Admin: admin@${tenant.slug}.com`);
      console.log(`   • Partner: partner@${tenant.slug}.com`);
      console.log(`   • Password: ${DEMO_PASSWORD}`);
    });
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
main();

export { main as seedDatabase };
