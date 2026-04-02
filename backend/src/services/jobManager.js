/**
 * Job Manager — Supabase-backed generation job tracking.
 *
 * Replaces the in-memory Map for tracking resume/cover letter generation
 * progress. Jobs persist across server restarts and support multi-instance.
 *
 * Falls back to in-memory Map if Supabase is unavailable.
 */
const { supabase, getSupabase } = require('../utils/supabaseClient');

const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

const JOB_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

// In-memory fallback (used when Supabase is unavailable)
const _memoryFallback = new Map();

function generateJobId() {
  return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Create a new generation job.
 */
async function createJob({ userId, type = 'resume', jobDescription, companyName, role, pipelineVersion }) {
  const id = generateJobId();
  const job = {
    id,
    user_id: userId,
    type,
    status: JOB_STATUS.PENDING,
    progress: 0,
    step_label: '',
    job_description: (jobDescription || '').substring(0, 10000),
    company_name: companyName || '',
    role: role || '',
    pipeline_version: pipelineVersion || 2,
    result: null,
    error: null,
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
  };

  try {
    const db = getSupabase();
    const { error } = await db.from('generation_jobs').insert(job);
    if (error) throw error;
  } catch (e) {
    console.warn('[JobManager] DB insert failed, using memory:', e.message);
    _memoryFallback.set(id, { ...job, _memory: true });
  }

  return id;
}

/**
 * Get a job by ID.
 */
async function getJob(jobId) {
  // Check memory first (for fallback jobs)
  if (_memoryFallback.has(jobId)) {
    return _memoryFallback.get(jobId);
  }

  try {
    const db = getSupabase();
    const { data, error } = await db.from('generation_jobs').select('*').eq('id', jobId).maybeSingle();
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[JobManager] DB get failed:', e.message);
    return null;
  }
}

/**
 * Update a job's fields.
 */
async function updateJob(jobId, updates) {
  // Update memory fallback if present
  if (_memoryFallback.has(jobId)) {
    const current = _memoryFallback.get(jobId);
    _memoryFallback.set(jobId, { ...current, ...updates });
    return;
  }

  try {
    const db = getSupabase();
    const { error } = await db.from('generation_jobs').update(updates).eq('id', jobId);
    if (error) throw error;
  } catch (e) {
    console.warn('[JobManager] DB update failed:', e.message);
  }
}

/**
 * Update job progress (called frequently during generation).
 */
async function updateProgress(jobId, progress, stepLabel) {
  await updateJob(jobId, { progress, step_label: stepLabel });
}

/**
 * Mark job as processing.
 */
async function markProcessing(jobId) {
  await updateJob(jobId, { status: JOB_STATUS.PROCESSING, started_at: new Date().toISOString() });
}

/**
 * Mark job as completed with result.
 */
async function markCompleted(jobId, result) {
  await updateJob(jobId, {
    status: JOB_STATUS.COMPLETED,
    completed_at: new Date().toISOString(),
    progress: 100,
    result,
  });
}

/**
 * Mark job as failed.
 */
async function markFailed(jobId, errorMessage) {
  await updateJob(jobId, {
    status: JOB_STATUS.FAILED,
    completed_at: new Date().toISOString(),
    error: errorMessage,
  });
}

/**
 * Clean up expired jobs (older than 30 minutes).
 */
async function cleanupExpired() {
  // Memory cleanup
  const now = Date.now();
  for (const [id, job] of _memoryFallback.entries()) {
    if (now - new Date(job.created_at).getTime() > JOB_EXPIRY_MS) {
      _memoryFallback.delete(id);
    }
  }

  // DB cleanup
  try {
    const db = getSupabase();
    const cutoff = new Date(now - JOB_EXPIRY_MS).toISOString();
    await db.from('generation_jobs').delete().lt('created_at', cutoff);
  } catch (e) {
    // Non-fatal
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpired, 5 * 60 * 1000);

module.exports = {
  JOB_STATUS,
  generateJobId,
  createJob,
  getJob,
  updateJob,
  updateProgress,
  markProcessing,
  markCompleted,
  markFailed,
  cleanupExpired,
};
