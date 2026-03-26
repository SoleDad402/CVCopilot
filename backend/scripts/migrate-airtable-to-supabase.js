/**
 * Migration script: Airtable → Supabase
 *
 * Usage:
 *   cd backend
 *   node scripts/migrate-airtable-to-supabase.js
 *
 * Requires both Airtable and Supabase credentials in .env
 */

require('dotenv').config();
const Airtable = require('airtable');
const { createClient } = require('@supabase/supabase-js');

// ── Config ──────────────────────────────────────────────────────────────────
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TABLES = {
  users: 'Users',
  employment: 'Employment History',
  education: 'Education',
  requests: 'Resume Requests',
};

// Map old Airtable record IDs → new Supabase UUIDs
const userIdMap = {};

// ── Helpers ─────────────────────────────────────────────────────────────────
async function fetchAll(tableName) {
  const records = [];
  await base(tableName).select().eachPage((page, next) => {
    records.push(...page);
    next();
  });
  return records;
}

function log(msg) {
  console.log(`[migrate] ${msg}`);
}

// ── Migrate Users ───────────────────────────────────────────────────────────
async function migrateUsers() {
  log('Fetching users from Airtable...');
  const records = await fetchAll(TABLES.users);
  log(`Found ${records.length} users`);

  for (const record of records) {
    const f = record.fields;
    const row = {
      email: f['Email'] || '',
      password: f['Password'] || '',
      full_name: f['Full Name'] || '',
      phone: f['Phone'] || '',
      personal_email: f['Personal Email'] || '',
      linkedin_url: f['LinkedIn URL'] || '',
      github_url: f['GitHub URL'] || '',
      location: f['Location'] || '',
      openai_model: f['OpenAI Model'] || 'gpt-4o',
      max_tokens: f['Max Tokens'] || 30000,
      daily_generation_limit: f['Daily Generation Limit'] || 150,
      is_admin: f['Is Admin'] || false,
      reset_token: f['Reset Token'] || null,
      reset_token_expires: f['Reset Token Expires'] || null,
      created_at: f['Created At'] || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('users')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      console.error(`  ERROR inserting user ${row.email}:`, error.message);
      continue;
    }

    userIdMap[record.id] = data.id;
    log(`  User: ${row.email} → ${data.id}`);
  }

  log(`Migrated ${Object.keys(userIdMap).length} users\n`);
}

// ── Migrate Employment History ──────────────────────────────────────────────
async function migrateEmployment() {
  log('Fetching employment history from Airtable...');
  const records = await fetchAll(TABLES.employment);
  log(`Found ${records.length} employment records`);

  let migrated = 0;
  for (const record of records) {
    const f = record.fields;
    const userField = f['User'];
    const oldUserId = Array.isArray(userField) ? userField[0] : userField;
    const newUserId = userIdMap[oldUserId];

    if (!newUserId) {
      console.error(`  SKIP employment record ${record.id}: no matching user for ${oldUserId}`);
      continue;
    }

    const row = {
      user_id: newUserId,
      company_name: f['Company Name'] || '',
      location: f['Location'] || '',
      position: f['Position'] || '',
      start_date: f['Start Date'] || '',
      end_date: f['End Date'] || '',
      is_current: f['Is Current'] || false,
      description: f['Description'] || '',
    };

    const { error } = await supabase.from('employment_history').insert(row);
    if (error) {
      console.error(`  ERROR inserting employment:`, error.message);
      continue;
    }
    migrated++;
  }

  log(`Migrated ${migrated} employment records\n`);
}

// ── Migrate Education ───────────────────────────────────────────────────────
async function migrateEducation() {
  log('Fetching education from Airtable...');
  const records = await fetchAll(TABLES.education);
  log(`Found ${records.length} education records`);

  let migrated = 0;
  for (const record of records) {
    const f = record.fields;
    const userField = f['User'];
    const oldUserId = Array.isArray(userField) ? userField[0] : userField;
    const newUserId = userIdMap[oldUserId];

    if (!newUserId) {
      console.error(`  SKIP education record ${record.id}: no matching user for ${oldUserId}`);
      continue;
    }

    const row = {
      user_id: newUserId,
      school_name: f['School Name'] || '',
      location: f['Location'] || '',
      degree: f['Degree'] || '',
      field_of_study: f['Field of Study'] || '',
      start_date: f['Start Date'] || '',
      end_date: f['End Date'] || '',
      is_current: f['Is Current'] || false,
      gpa: f['GPA'] || '',
    };

    const { error } = await supabase.from('education').insert(row);
    if (error) {
      console.error(`  ERROR inserting education:`, error.message);
      continue;
    }
    migrated++;
  }

  log(`Migrated ${migrated} education records\n`);
}

// ── Migrate Resume Requests ─────────────────────────────────────────────────
async function migrateRequests() {
  log('Fetching resume requests from Airtable...');
  const records = await fetchAll(TABLES.requests);
  log(`Found ${records.length} request records`);

  let migrated = 0;
  for (const record of records) {
    const f = record.fields;
    const userField = f['User'];
    const oldUserId = Array.isArray(userField) ? userField[0] : userField;
    const newUserId = userIdMap[oldUserId];

    if (!newUserId) {
      console.error(`  SKIP request record ${record.id}: no matching user for ${oldUserId}`);
      continue;
    }

    // Extract URLs from Airtable attachment arrays
    const docxFile = f['DOCX File'];
    const pdfFile = f['PDF File'];
    const docxUrl = Array.isArray(docxFile) && docxFile.length > 0 ? docxFile[0].url : null;
    const pdfUrl = Array.isArray(pdfFile) && pdfFile.length > 0 ? pdfFile[0].url : null;

    const row = {
      user_id: newUserId,
      company_name: f['Company Name'] || '',
      role: f['Role'] || '',
      job_description: f['Job Description'] || '',
      docx_url: docxUrl,
      pdf_url: pdfUrl,
      created_at: f['Created At'] || new Date().toISOString(),
    };

    const { error } = await supabase.from('resume_requests').insert(row);
    if (error) {
      console.error(`  ERROR inserting request:`, error.message);
      continue;
    }
    migrated++;
  }

  log(`Migrated ${migrated} request records\n`);
}

// ── Run ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('========================================');
  console.log('  Airtable → Supabase Migration');
  console.log('========================================\n');

  try {
    await migrateUsers();
    await migrateEmployment();
    await migrateEducation();
    await migrateRequests();

    console.log('========================================');
    console.log('  Migration complete!');
    console.log(`  Users: ${Object.keys(userIdMap).length}`);
    console.log('========================================');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();
