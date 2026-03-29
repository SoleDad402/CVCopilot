const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // service_role key bypasses RLS

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  WARNING: Supabase credentials not found. Database operations will fail.');
  console.warn('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const checkConfig = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
};

class User {
  // ── Auth & Profile ──────────────────────────────────────────────────────

  static async create(userData) {
    checkConfig();
    const { email, password, full_name, phone, personal_email, linkedin_url, github_url, location } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        full_name: full_name || '',
        phone: phone || '',
        personal_email: personal_email || '',
        linkedin_url: linkedin_url || '',
        github_url: github_url || '',
        location: location || '',
        daily_generation_limit: 10,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return { id: data.id };
  }

  static async findByEmail(email) {
    checkConfig();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw new Error(`Failed to find user: ${error.message}`);
    return data;
  }

  static async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    if (!user) return false;
    return bcrypt.compare(password, user.password);
  }

  static async updateProfile(userId, userData) {
    checkConfig();
    const fields = {};
    if (userData.full_name !== undefined) fields.full_name = userData.full_name;
    if (userData.phone !== undefined) fields.phone = userData.phone;
    if (userData.personal_email !== undefined) fields.personal_email = userData.personal_email;
    if (userData.linkedin_url !== undefined) fields.linkedin_url = userData.linkedin_url;
    if (userData.github_url !== undefined) fields.github_url = userData.github_url;
    if (userData.location !== undefined) fields.location = userData.location;
    const { error } = await supabase.from('users').update(fields).eq('id', userId);
    if (error) throw new Error(`Failed to update profile: ${error.message}`);
    return true;
  }

  static async generatePasswordResetToken(email) {
    checkConfig();
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000).toISOString();

    const user = await this.findByEmail(email);
    if (!user) throw new Error('User not found');

    const { error } = await supabase
      .from('users')
      .update({ reset_token: token, reset_token_expires: expires })
      .eq('id', user.id);

    if (error) throw new Error(`Failed to generate reset token: ${error.message}`);
    return token;
  }

  static async resetPassword(token, newPassword) {
    checkConfig();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('reset_token', token)
      .gt('reset_token_expires', new Date().toISOString())
      .maybeSingle();

    if (error) throw new Error(`Failed to reset password: ${error.message}`);
    if (!data) return false;

    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword, reset_token: null, reset_token_expires: null })
      .eq('id', data.id);

    if (updateError) throw new Error(`Failed to reset password: ${updateError.message}`);
    return true;
  }

  // ── Employment History ──────────────────────────────────────────────────

  static async addEmploymentHistory(userId, employmentData) {
    checkConfig();
    const { company_name, location, position, start_date, end_date, is_current } = employmentData;

    const { data, error } = await supabase
      .from('employment_history')
      .insert({
        user_id: userId,
        company_name,
        location: location || '',
        position,
        start_date: start_date || '',
        end_date: end_date || '',
        is_current: is_current || false,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to add employment history: ${error.message}`);
    return data.id;
  }

  static async getEmploymentHistory(userId) {
    checkConfig();
    const { data, error } = await supabase
      .from('employment_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get employment history: ${error.message}`);

    // Sort by parsed start_date for consistency
    return (data || []).sort((a, b) => {
      return this.parseDateString(b.start_date) - this.parseDateString(a.start_date);
    });
  }

  static async updateEmploymentHistory(employmentId, employmentData) {
    checkConfig();
    const fields = {};
    if (employmentData.company_name !== undefined) fields.company_name = employmentData.company_name;
    if (employmentData.location !== undefined) fields.location = employmentData.location;
    if (employmentData.position !== undefined) fields.position = employmentData.position;
    if (employmentData.start_date !== undefined) fields.start_date = employmentData.start_date;
    if (employmentData.end_date !== undefined) fields.end_date = employmentData.end_date;
    if (employmentData.is_current !== undefined) fields.is_current = employmentData.is_current;

    const { error } = await supabase.from('employment_history').update(fields).eq('id', employmentId);
    if (error) throw new Error(`Failed to update employment history: ${error.message}`);
    return true;
  }

  static async deleteEmploymentHistory(employmentId) {
    checkConfig();
    const { error } = await supabase.from('employment_history').delete().eq('id', employmentId);
    if (error) throw new Error(`Failed to delete employment history: ${error.message}`);
    return true;
  }

  // ── Education ───────────────────────────────────────────────────────────

  static async addEducation(userId, educationData) {
    checkConfig();
    const { school_name, location, degree, field_of_study, start_date, end_date, is_current, gpa } = educationData;

    const { data, error } = await supabase
      .from('education')
      .insert({
        user_id: userId,
        school_name,
        location: location || '',
        degree,
        field_of_study: field_of_study || '',
        start_date: start_date || '',
        end_date: end_date || '',
        is_current: is_current || false,
        gpa: gpa || '',
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to add education: ${error.message}`);
    return data.id;
  }

  static async getEducation(userId) {
    checkConfig();
    const { data, error } = await supabase
      .from('education')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get education: ${error.message}`);

    return (data || []).sort((a, b) => {
      return this.parseDateString(b.start_date) - this.parseDateString(a.start_date);
    });
  }

  static async updateEducation(educationId, educationData) {
    checkConfig();
    const fields = {};
    if (educationData.school_name !== undefined) fields.school_name = educationData.school_name;
    if (educationData.location !== undefined) fields.location = educationData.location;
    if (educationData.degree !== undefined) fields.degree = educationData.degree;
    if (educationData.field_of_study !== undefined) fields.field_of_study = educationData.field_of_study;
    if (educationData.start_date !== undefined) fields.start_date = educationData.start_date;
    if (educationData.end_date !== undefined) fields.end_date = educationData.end_date;
    if (educationData.is_current !== undefined) fields.is_current = educationData.is_current;
    if (educationData.gpa !== undefined) fields.gpa = educationData.gpa;

    const { error } = await supabase.from('education').update(fields).eq('id', educationId);
    if (error) throw new Error(`Failed to update education: ${error.message}`);
    return true;
  }

  static async deleteEducation(educationId) {
    checkConfig();
    const { error } = await supabase.from('education').delete().eq('id', educationId);
    if (error) throw new Error(`Failed to delete education: ${error.message}`);
    return true;
  }

  // ── Resume Requests ─────────────────────────────────────────────────────

  static async addResumeRequest(userId, requestData) {
    checkConfig();
    const { company_name, role, job_description, docx_file, pdf_file } = requestData;

    // For Supabase, file URLs are stored as plain strings
    const docxUrl = docx_file
      ? (Array.isArray(docx_file) ? docx_file[0]?.url : docx_file?.url) || docx_file
      : null;
    const pdfUrl = pdf_file
      ? (Array.isArray(pdf_file) ? pdf_file[0]?.url : pdf_file?.url) || pdf_file
      : null;

    const { data, error } = await supabase
      .from('resume_requests')
      .insert({
        user_id: userId,
        company_name: company_name || '',
        role: role || '',
        job_description: job_description || '',
        docx_url: docxUrl,
        pdf_url: pdfUrl,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to add resume request: ${error.message}`);
    return data.id;
  }

  static async addCoverLetterRequest(userId, requestData) {
    // Same table, same logic
    return this.addResumeRequest(userId, requestData);
  }

  static async getResumeRequests(userId) {
    checkConfig();
    const { data, error } = await supabase
      .from('resume_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get resume requests: ${error.message}`);

    return (data || []).map(row => ({
      id: row.id,
      company_name: row.company_name,
      role: row.role,
      job_description: row.job_description,
      docx_url: row.docx_url,
      pdf_url: row.pdf_url,
      created_at: row.created_at ? row.created_at.slice(0, 10) : '',
    }));
  }

  // ── Admin Methods ───────────────────────────────────────────────────────

  static async getAllUsers() {
    checkConfig();
    const [usersRes, requestsRes] = await Promise.all([
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('resume_requests').select('user_id'),
    ]);

    if (usersRes.error) throw new Error(`Failed to get all users: ${usersRes.error.message}`);

    // Count requests per user
    const requestCounts = {};
    (requestsRes.data || []).forEach(r => {
      requestCounts[r.user_id] = (requestCounts[r.user_id] || 0) + 1;
    });

    return (usersRes.data || []).map(user => ({
      ...user,
      total_generations: requestCounts[user.id] || 0,
    }));
  }

  static async getDailyGenerationCount(userId) {
    checkConfig();
    const todayCST = await this.getTodayCST();

    const { count, error } = await supabase
      .from('resume_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${todayCST}T00:00:00`)
      .lt('created_at', `${todayCST}T23:59:59.999`);

    if (error) throw new Error(`Failed to get daily generation count: ${error.message}`);
    return count || 0;
  }

  static async updateUser(userId, userData) {
    checkConfig();
    const fields = {};
    if (userData.full_name !== undefined) fields.full_name = userData.full_name;
    if (userData.email !== undefined) fields.email = userData.email;
    if (userData.phone !== undefined) fields.phone = userData.phone;
    if (userData.location !== undefined) fields.location = userData.location;
    if (userData.daily_generation_limit !== undefined) fields.daily_generation_limit = userData.daily_generation_limit;
    if (userData.is_admin !== undefined) fields.is_admin = userData.is_admin;

    const { error } = await supabase.from('users').update(fields).eq('id', userId);
    if (error) throw new Error(`Failed to update user: ${error.message}`);
    return true;
  }

  static async deleteUser(userId) {
    checkConfig();
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw new Error(`Failed to delete user: ${error.message}`);
    return true;
  }

  static async getAllResumeRequests() {
    checkConfig();
    // Join with users to get emails
    const { data, error } = await supabase
      .from('resume_requests')
      .select('*, users(email)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get all resume requests: ${error.message}`);

    return (data || []).map(row => ({
      id: row.id,
      user_id: row.user_id,
      email: row.users?.email || 'Unknown',
      company_name: row.company_name || '',
      role: row.role || '',
      job_description: row.job_description || '',
      docx_url: row.docx_url,
      pdf_url: row.pdf_url,
      created_at: row.created_at ? row.created_at.slice(0, 10) : '',
    }));
  }

  static async getAdminStats() {
    checkConfig();
    const todayCST = await this.getTodayCST();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [usersRes, requestsRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('resume_requests').select('*'),
    ]);

    if (usersRes.error) throw new Error(`Failed to get admin stats: ${usersRes.error.message}`);

    const users = usersRes.data || [];
    const requests = requestsRes.data || [];
    const totalUsers = users.length;
    const totalRequests = requests.length;

    // Request analytics
    let todayRequests = 0, weekRequests = 0, monthRequests = 0;
    const activeUserIds = new Set();
    const companyFrequency = {}, roleFrequency = {}, requestsByDate = {}, requestsByUser = {};
    let withDocx = 0, withPdf = 0;

    requests.forEach(r => {
      const ca = r.created_at || '';
      const dateKey = ca.slice(0, 10);
      if (dateKey === todayCST) todayRequests++;
      if (ca >= weekAgo) weekRequests++;
      if (ca >= monthAgo) monthRequests++;
      if (dateKey) requestsByDate[dateKey] = (requestsByDate[dateKey] || 0) + 1;

      if (r.company_name) companyFrequency[r.company_name] = (companyFrequency[r.company_name] || 0) + 1;
      if (r.role) roleFrequency[r.role] = (roleFrequency[r.role] || 0) + 1;
      if (r.user_id) {
        activeUserIds.add(r.user_id);
        requestsByUser[r.user_id] = (requestsByUser[r.user_id] || 0) + 1;
      }
      if (r.docx_url) withDocx++;
      if (r.pdf_url) withPdf++;
    });

    // Top users
    const userEmailMap = {}, userNameMap = {};
    users.forEach(u => { userEmailMap[u.id] = u.email; userNameMap[u.id] = u.full_name || ''; });

    const topUsersByGenerations = Object.entries(requestsByUser)
      .map(([userId, count]) => ({ userId, email: userEmailMap[userId] || 'Unknown', full_name: userNameMap[userId] || '', generations: count, requests: count }))
      .sort((a, b) => b.generations - a.generations)
      .slice(0, 15);

    const topCompanies = Object.entries(companyFrequency).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, count]) => ({ name, count }));
    const topRoles = Object.entries(roleFrequency).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, count]) => ({ name, count }));

    // 30-day trends
    const generationTrend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      generationTrend.push({ date: dateStr, generations: requestsByDate[dateStr] || 0, requests: requestsByDate[dateStr] || 0 });
    }

    const registrationsByDate = {};
    users.forEach(u => { if (u.created_at) { const dk = u.created_at.slice(0, 10); registrationsByDate[dk] = (registrationsByDate[dk] || 0) + 1; } });
    const registrationTrend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      registrationTrend.push({ date: dateStr, count: registrationsByDate[dateStr] || 0 });
    }

    // Day of week
    const dayOfWeekDist = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    Object.entries(requestsByDate).forEach(([dateStr, count]) => {
      const d = new Date(dateStr + 'T12:00:00');
      if (!isNaN(d.getTime())) dayOfWeekDist[dayNames[d.getDay()]] += count;
    });

    const avgGenerationsPerUser = activeUserIds.size > 0 ? Math.round(totalRequests / activeUserIds.size * 10) / 10 : 0;
    const docxRate = totalRequests > 0 ? Math.round((withDocx / totalRequests) * 100) : 0;
    const pdfRate = totalRequests > 0 ? Math.round((withPdf / totalRequests) * 100) : 0;

    return {
      totalUsers, totalGenerations: totalRequests, todayGenerations: todayRequests,
      totalRequests, weekRequests, monthRequests, activeUsers: activeUserIds.size, avgGenerationsPerUser,
      withDocx, withPdf, docxRate, pdfRate,
      dayOfWeekDist, generationTrend, registrationTrend,
      topUsersByGenerations, topCompanies, topRoles,
    };
  }

  static async getUserActivity(userId) {
    checkConfig();
    const [userRes, requestsRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('resume_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    if (userRes.error) throw new Error(`Failed to get user activity: ${userRes.error.message}`);

    const user = userRes.data;
    const requests = (requestsRes.data || []).map(row => ({
      id: row.id,
      company_name: row.company_name || '',
      role: row.role || '',
      created_at: row.created_at ? row.created_at.slice(0, 10) : '',
      docx_url: row.docx_url,
      pdf_url: row.pdf_url,
    }));

    // Generation history (group by date)
    const byDate = {};
    requests.forEach(r => {
      if (r.created_at) byDate[r.created_at] = (byDate[r.created_at] || 0) + 1;
    });
    const generationHistory = Object.entries(byDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Company breakdown
    const companies = {};
    requests.forEach(r => { if (r.company_name) companies[r.company_name] = (companies[r.company_name] || 0) + 1; });

    return {
      user: {
        id: user.id, email: user.email, full_name: user.full_name || '',
        location: user.location || '', daily_generation_limit: user.daily_generation_limit || 10,
        is_admin: user.is_admin || false, created_at: user.created_at || '',
      },
      totalGenerations: requests.length,
      totalRequests: requests.length,
      generationHistory,
      requests,
      companyBreakdown: Object.entries(companies).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    };
  }

  static async getDailyGenerations() {
    checkConfig();
    const { data: requests, error: reqErr } = await supabase.from('resume_requests').select('user_id, created_at');
    const { data: users } = await supabase.from('users').select('id, email');

    if (reqErr) throw new Error(`Failed to get daily generations: ${reqErr.message}`);

    const userMap = {};
    (users || []).forEach(u => { userMap[u.id] = u.email; });

    const grouped = {};
    (requests || []).forEach(r => {
      const dateKey = (r.created_at || '').slice(0, 10);
      if (r.user_id && dateKey) {
        const key = `${r.user_id}|${dateKey}`;
        if (!grouped[key]) grouped[key] = { user_id: r.user_id, email: userMap[r.user_id] || 'Unknown', generation_date: dateKey, count: 0 };
        grouped[key].count++;
      }
    });

    return Object.values(grouped).sort((a, b) => {
      const dc = b.generation_date.localeCompare(a.generation_date);
      return dc !== 0 ? dc : a.email.localeCompare(b.email);
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  static async getTodayCST() {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
  }

  static parseDateString(dateString) {
    if (!dateString) return 0;
    const dateStr = dateString.trim();

    // Month name patterns
    const monthNamePattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i;
    const match = dateStr.match(monthNamePattern);
    if (match) {
      const monthMap = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };
      const m = monthMap[match[1].toLowerCase()];
      if (m !== undefined) return new Date(parseInt(match[2]), m, 1).getTime();
    }

    // MM/YYYY or MM-YYYY
    const slashMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (slashMatch) return new Date(parseInt(slashMatch[2]), parseInt(slashMatch[1]) - 1, 1).getTime();

    // YYYY-MM
    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})$/);
    if (isoMatch) return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, 1).getTime();

    // YYYY
    const yearMatch = dateStr.match(/^(\d{4})$/);
    if (yearMatch) return new Date(parseInt(yearMatch[1]), 0, 1).getTime();

    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
}

module.exports = User;
