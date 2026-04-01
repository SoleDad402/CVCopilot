-- ============================================================================
-- CVCopilot Supabase Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================================

-- ── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  full_name   TEXT DEFAULT '',
  phone       TEXT DEFAULT '',
  personal_email TEXT DEFAULT '',
  linkedin_url TEXT DEFAULT '',
  github_url  TEXT DEFAULT '',
  location    TEXT DEFAULT '',
  daily_generation_limit INT DEFAULT 10,
  is_active   BOOLEAN DEFAULT TRUE,
  is_admin    BOOLEAN DEFAULT FALSE,
  reset_token TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ── Employment History ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employment_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  location    TEXT DEFAULT '',
  position    TEXT NOT NULL,
  start_date  TEXT DEFAULT '',
  end_date    TEXT DEFAULT '',
  is_current  BOOLEAN DEFAULT FALSE,
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employment_user ON employment_history(user_id);

-- ── Education ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS education (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  location    TEXT DEFAULT '',
  degree      TEXT NOT NULL,
  field_of_study TEXT DEFAULT '',
  start_date  TEXT DEFAULT '',
  end_date    TEXT DEFAULT '',
  is_current  BOOLEAN DEFAULT FALSE,
  gpa         TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_education_user ON education(user_id);

-- ── Resume Requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resume_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT DEFAULT '',
  role        TEXT DEFAULT '',
  job_description TEXT DEFAULT '',
  docx_url    TEXT,
  pdf_url     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_user ON resume_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_created ON resume_requests(created_at DESC);

-- ── Job Applications (Tracker) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_applications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  position    TEXT NOT NULL,
  location    TEXT DEFAULT '',
  job_url     TEXT DEFAULT '',
  salary_range TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'applied',
  applied_date DATE DEFAULT CURRENT_DATE,
  resume_request_id UUID REFERENCES resume_requests(id) ON DELETE SET NULL,
  pipeline_steps JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_apps_user ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_apps_status ON job_applications(user_id, status);

-- ── Job Application Events (Timeline) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_application_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL DEFAULT 'comment',
  from_status     TEXT,
  to_status       TEXT,
  comment         TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_events_app ON job_application_events(application_id);

-- ── Enable Row Level Security (optional but recommended) ────────────────────
-- Uncomment these if you want RLS. For now, we use service_role key server-side
-- which bypasses RLS, so these are informational.
--
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE employment_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE education ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE resume_requests ENABLE ROW LEVEL SECURITY;
