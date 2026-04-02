const { supabase, getSupabase } = require('../utils/supabaseClient');

const checkConfig = () => { getSupabase(); };

class JobApplication {
  // ── CRUD ────────────────────────────────────────────────────────────────

  static async create(userId, data) {
    checkConfig();
    const row = {
      user_id: userId,
      company_name: data.company_name,
      position: data.position,
      location: data.location || '',
      job_url: data.job_url || '',
      salary_range: data.salary_range || '',
      notes: data.notes || '',
      status: data.status || 'applied',
      applied_date: data.applied_date || new Date().toISOString().slice(0, 10),
    };
    if (data.resume_request_id) row.resume_request_id = data.resume_request_id;

    const { data: app, error } = await supabase
      .from('job_applications')
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(`Failed to create job application: ${error.message}`);

    // Auto-create first event
    await supabase.from('job_application_events').insert({
      application_id: app.id,
      event_type: 'status_change',
      to_status: app.status,
      comment: 'Application created',
    });

    return app;
  }

  static async getAll(userId) {
    checkConfig();
    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(`Failed to fetch applications: ${error.message}`);
    return data;
  }

  static async getById(userId, id) {
    checkConfig();
    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (error) throw new Error(`Application not found: ${error.message}`);
    return data;
  }

  static async update(userId, id, data) {
    checkConfig();
    const fields = {};
    const allowed = ['company_name', 'position', 'location', 'job_url', 'salary_range', 'notes', 'status', 'applied_date', 'pipeline_steps'];
    for (const key of allowed) {
      if (data[key] !== undefined) fields[key] = data[key];
    }
    fields.updated_at = new Date().toISOString();

    const { data: app, error } = await supabase
      .from('job_applications')
      .update(fields)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error(`Failed to update application: ${error.message}`);
    return app;
  }

  static async updateStatus(userId, id, newStatus, comment = '') {
    checkConfig();
    // Get current status
    const current = await this.getById(userId, id);
    const oldStatus = current.status;

    // Skip if status hasn't changed
    if (oldStatus === newStatus) return current;

    const { data: app, error } = await supabase
      .from('job_applications')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error(`Failed to update status: ${error.message}`);

    // Create status change event
    await supabase.from('job_application_events').insert({
      application_id: id,
      event_type: 'status_change',
      from_status: oldStatus,
      to_status: newStatus,
      comment: comment || `Status changed from ${oldStatus} to ${newStatus}`,
    });

    return app;
  }

  static async delete(userId, id) {
    checkConfig();
    const { error } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(`Failed to delete application: ${error.message}`);
  }

  // ── Events / Timeline ──────────────────────────────────────────────────

  static async getEvents(applicationId) {
    checkConfig();
    const { data, error } = await supabase
      .from('job_application_events')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Failed to fetch events: ${error.message}`);
    return data;
  }

  static async addComment(applicationId, comment) {
    checkConfig();
    const { data, error } = await supabase
      .from('job_application_events')
      .insert({
        application_id: applicationId,
        event_type: 'comment',
        comment,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to add comment: ${error.message}`);
    return data;
  }

  static async deleteEvent(eventId) {
    checkConfig();
    const { error } = await supabase
      .from('job_application_events')
      .delete()
      .eq('id', eventId);
    if (error) throw new Error(`Failed to delete event: ${error.message}`);
  }
}

module.exports = JobApplication;
