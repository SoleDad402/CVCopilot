const Airtable = require('airtable');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Initialize Airtable
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  console.warn('⚠️  WARNING: Airtable credentials not found. Database operations will fail.');
}

const base = process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID
  ? new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
  : null;

// Table names (can be overridden via env vars)
const TABLE_NAMES = {
  users: process.env.AIRTABLE_USERS_TABLE || 'Users',
  employment: process.env.AIRTABLE_EMPLOYMENT_TABLE || 'Employment History',
  education: process.env.AIRTABLE_EDUCATION_TABLE || 'Education',
  generations: process.env.AIRTABLE_GENERATIONS_TABLE || 'Resume Generations',
  requests: process.env.AIRTABLE_REQUESTS_TABLE || 'Resume Requests'
};

// Field names (can be overridden via env vars)
const FIELD_NAMES = {
  userId: process.env.AIRTABLE_USER_ID_FIELD || 'User',
  email: process.env.AIRTABLE_EMAIL_FIELD || 'Email',
  password: process.env.AIRTABLE_PASSWORD_FIELD || 'Password',
  fullName: process.env.AIRTABLE_FULL_NAME_FIELD || 'Full Name',
  phone: process.env.AIRTABLE_PHONE_FIELD || 'Phone',
  personalEmail: process.env.AIRTABLE_PERSONAL_EMAIL_FIELD || 'Personal Email',
  linkedinUrl: process.env.AIRTABLE_LINKEDIN_URL_FIELD || 'LinkedIn URL',
  githubUrl: process.env.AIRTABLE_GITHUB_URL_FIELD || 'GitHub URL',
  location: process.env.AIRTABLE_LOCATION_FIELD || 'Location',
  openaiModel: process.env.AIRTABLE_OPENAI_MODEL_FIELD || 'OpenAI Model',
  maxTokens: process.env.AIRTABLE_MAX_TOKENS_FIELD || 'Max Tokens',
  dailyGenerationLimit: process.env.AIRTABLE_DAILY_GENERATION_LIMIT_FIELD || 'Daily Generation Limit',
  resetToken: process.env.AIRTABLE_RESET_TOKEN_FIELD || 'Reset Token',
  resetTokenExpires: process.env.AIRTABLE_RESET_TOKEN_EXPIRES_FIELD || 'Reset Token Expires',
  createdAt: process.env.AIRTABLE_CREATED_AT_FIELD || 'Created At'
};

// Helper function to check if Airtable is configured
const checkAirtableConfig = () => {
  if (!base) {
    throw new Error('Airtable is not configured. Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables.');
  }
};

// Helper function to convert Airtable record to plain object
const recordToObject = (record) => {
  if (!record) return null;
  const obj = { id: record.id, ...record.fields };
  
  // Map Airtable field names to expected property names for backward compatibility
  // Also keep original Airtable field names for flexibility
  if (obj['Email']) obj.email = obj['Email'];
  if (obj['Password']) obj.password = obj['Password'];
  if (obj['Full Name']) obj.full_name = obj['Full Name'];
  if (obj['Phone']) obj.phone = obj['Phone'];
  if (obj['Personal Email']) obj.personal_email = obj['Personal Email'];
  if (obj['LinkedIn URL']) obj.linkedin_url = obj['LinkedIn URL'];
  if (obj['GitHub URL']) obj.github_url = obj['GitHub URL'];
  if (obj['Location']) obj.location = obj['Location'];
  if (obj['OpenAI Model']) obj.openai_model = obj['OpenAI Model'];
  if (obj['Max Tokens']) obj.max_tokens = obj['Max Tokens'];
  if (obj['Daily Generation Limit']) obj.daily_generation_limit = obj['Daily Generation Limit'];
  if (obj['Reset Token']) obj.reset_token = obj['Reset Token'];
  if (obj['Reset Token Expires']) {
    obj.reset_token_expires = obj['Reset Token Expires'];
  }
  if (obj['Is Admin']) obj.is_admin = obj['Is Admin'];
  if (obj['Created At']) {
    obj.created_at = obj['Created At'];
  }
  if (obj['Generation Date']) {
    obj.generation_date = obj['Generation Date'];
  }
  return obj;
};

// Helper function to convert array of records
const recordsToArray = (records) => {
  return records.map(recordToObject);
};

class User {
  static async create(userData) {
    checkAirtableConfig();
    
    const { email, password, full_name, phone, personal_email, linkedin_url, github_url, location, openai_model, max_tokens } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const fields = {
      'Email': email,
      'Password': hashedPassword,
      'Full Name': full_name,
      'Phone': phone || '',
      'Personal Email': personal_email || '',
      'LinkedIn URL': linkedin_url || '',
      'GitHub URL': github_url || '',
      'Location': location || '',
      'OpenAI Model': openai_model || 'gpt-4o',
      'Max Tokens': max_tokens || 30000,
      'Daily Generation Limit': 150
      // Note: 'Created At' is automatically managed by Airtable, don't set it manually
    };

    try {
      const records = await base(TABLE_NAMES.users).create([{ fields }]);
      return { id: records[0].id };
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    checkAirtableConfig();
    
    try {
      const records = await base(TABLE_NAMES.users)
        .select({ filterByFormula: `{Email} = "${email.replace(/"/g, '\\"')}"`, maxRecords: 1 })
        .firstPage();
      
      if (records.length === 0) return null;
      return recordToObject(records[0]);
    } catch (error) {
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  static async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    if (!user) return false;
    return bcrypt.compare(password, user.Password || user.password);
  }

  static async updateProfile(userId, userData) {
    const { full_name, phone, personal_email, linkedin_url, github_url, location, openai_model, max_tokens } = userData;
    
    const fields = {};
    if (full_name !== undefined) fields['Full Name'] = full_name;
    if (phone !== undefined) fields['Phone'] = phone;
    if (personal_email !== undefined) fields['Personal Email'] = personal_email;
    if (linkedin_url !== undefined) fields['LinkedIn URL'] = linkedin_url;
    if (github_url !== undefined) fields['GitHub URL'] = github_url;
    if (location !== undefined) fields['Location'] = location;
    if (openai_model !== undefined) fields['OpenAI Model'] = openai_model;
    if (max_tokens !== undefined) fields['Max Tokens'] = max_tokens;

    try {
      await base(TABLE_NAMES.users).update([{ id: userId, fields }]);
      return true;
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  static async generatePasswordResetToken(email) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    try {
      const user = await this.findByEmail(email);
      if (!user) throw new Error('User not found');

      await base(TABLE_NAMES.users).update([{
        id: user.id,
        fields: {
          'Reset Token': token,
          'Reset Token Expires': expires.toISOString()
        }
      }]);
      return token;
    } catch (error) {
      throw new Error(`Failed to generate reset token: ${error.message}`);
    }
  }

  static async resetPassword(token, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    try {
      const records = await base(TABLE_NAMES.users)
        .select({
          filterByFormula: `AND({Reset Token} = "${token}", {Reset Token Expires} > NOW())`,
          maxRecords: 1
        })
        .firstPage();

      if (records.length === 0) return false;

      await base(TABLE_NAMES.users).update([{
        id: records[0].id,
        fields: {
          'Password': hashedPassword,
          'Reset Token': null,
          'Reset Token Expires': null
        }
      }]);
      return true;
    } catch (error) {
      throw new Error(`Failed to reset password: ${error.message}`);
    }
  }

  static async addEmploymentHistory(userId, employmentData) {
    const { company_name, location, position, start_date, end_date, is_current } = employmentData;

    const fields = {
      [FIELD_NAMES.userId]: [userId], // Link field - Airtable API requires array even for single records
      'Company Name': company_name,
      'Location': location || '',
      'Position': position,
      'Start Date': start_date,
      'End Date': end_date || '',
      'Is Current': is_current || false
    };

    try {
      const records = await base(TABLE_NAMES.employment).create([{ fields }]);
      return records[0].id;
    } catch (error) {
      throw new Error(`Failed to add employment history: ${error.message}`);
    }
  }

  static async getEmploymentHistory(userId) {
    try {
      // Fetch all records and filter in JavaScript for linked fields
      // This is more reliable than Airtable formulas for linked record arrays
      const allRecords = await base(TABLE_NAMES.employment)
        .select()
        .all();
      
      // Filter records where userId matches the User linked field
      // Since "Allow linking to multiple records" is OFF, the field contains a single record ID (string)
      const filteredRecords = allRecords.filter(record => {
        const userField = record.fields[FIELD_NAMES.userId];
        if (!userField) return false;
        // Handle both single record (string) and array formats
        if (Array.isArray(userField)) {
          return userField.some(id => id === userId);
        }
        return userField === userId;
      });
      
      const rows = recordsToArray(filteredRecords);
      
      // Sort by parsed date, handling various date formats
      const sortedRows = rows.sort((a, b) => {
        const dateA = this.parseDateString(a['Start Date'] || a.start_date);
        const dateB = this.parseDateString(b['Start Date'] || b.start_date);
        return dateB - dateA; // DESC order (newest first)
      });
      
      return sortedRows;
    } catch (error) {
      throw new Error(`Failed to get employment history: ${error.message}`);
    }
  }

  static async updateEmploymentHistory(employmentId, employmentData) {
    const { company_name, location, position, start_date, end_date, is_current } = employmentData;

    const fields = {};
    if (company_name !== undefined) fields['Company Name'] = company_name;
    if (location !== undefined) fields['Location'] = location;
    if (position !== undefined) fields['Position'] = position;
    if (start_date !== undefined) fields['Start Date'] = start_date;
    if (end_date !== undefined) fields['End Date'] = end_date;
    if (is_current !== undefined) fields['Is Current'] = is_current;

    try {
      await base(TABLE_NAMES.employment).update([{ id: employmentId, fields }]);
      return true;
    } catch (error) {
      throw new Error(`Failed to update employment history: ${error.message}`);
    }
  }

  static async deleteEmploymentHistory(employmentId) {
    try {
      await base(TABLE_NAMES.employment).destroy([employmentId]);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete employment history: ${error.message}`);
    }
  }

  static async addEducation(userId, educationData) {
    const {
      school_name,
      location,
      degree,
      field_of_study,
      start_date,
      end_date,
      is_current,
      gpa
    } = educationData;

    const fields = {
      [FIELD_NAMES.userId]: [userId], // Link field - Airtable API requires array even for single records
      'School Name': school_name,
      'Location': location || '',
      'Degree': degree,
      'Field of Study': field_of_study || '',
      'Start Date': start_date,
      'End Date': end_date || '',
      'Is Current': is_current || false,
      'GPA': gpa || ''
    };

    try {
      const records = await base(TABLE_NAMES.education).create([{ fields }]);
      return records[0].id;
    } catch (error) {
      throw new Error(`Failed to add education: ${error.message}`);
    }
  }

  static async getEducation(userId) {
    try {
      // Fetch all records and filter in JavaScript for linked fields
      const allRecords = await base(TABLE_NAMES.education)
        .select()
        .all();
      
      // Filter records where userId is in the User ID linked field
      const filteredRecords = allRecords.filter(record => {
        const userIds = record.fields[FIELD_NAMES.userId] || [];
        return Array.isArray(userIds) && userIds.some(id => id === userId);
      });
      
      const rows = recordsToArray(filteredRecords);
      
      // Sort by parsed date, handling various date formats
      const sortedRows = rows.sort((a, b) => {
        const dateA = this.parseDateString(a['Start Date'] || a.start_date);
        const dateB = this.parseDateString(b['Start Date'] || b.start_date);
        return dateB - dateA; // DESC order (newest first)
      });
      
      return sortedRows;
    } catch (error) {
      throw new Error(`Failed to get education: ${error.message}`);
    }
  }

  static async updateEducation(educationId, educationData) {
    const {
      school_name,
      location,
      degree,
      field_of_study,
      start_date,
      end_date,
      is_current,
      gpa
    } = educationData;

    const fields = {};
    if (school_name !== undefined) fields['School Name'] = school_name;
    if (location !== undefined) fields['Location'] = location;
    if (degree !== undefined) fields['Degree'] = degree;
    if (field_of_study !== undefined) fields['Field of Study'] = field_of_study;
    if (start_date !== undefined) fields['Start Date'] = start_date;
    if (end_date !== undefined) fields['End Date'] = end_date;
    if (is_current !== undefined) fields['Is Current'] = is_current;
    if (gpa !== undefined) fields['GPA'] = gpa;

    try {
      await base(TABLE_NAMES.education).update([{ id: educationId, fields }]);
      return true;
    } catch (error) {
      throw new Error(`Failed to update education: ${error.message}`);
    }
  }

  static async deleteEducation(educationId) {
    try {
      await base(TABLE_NAMES.education).destroy([educationId]);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete education: ${error.message}`);
    }
  }

  static async updateOpenAISettings(userId, openai_model, max_tokens) {
    const fields = {
      'OpenAI Model': openai_model,
      'Max Tokens': max_tokens
    };

    try {
      await base(TABLE_NAMES.users).update([{ id: userId, fields }]);
      return true;
    } catch (error) {
      throw new Error(`Failed to update OpenAI settings: ${error.message}`);
    }
  }

  static async trackResumeGeneration(userId) {
    const todayCST = await this.getTodayCST();

    try {
      // Check if record exists for today
      const existingRecords = await base(TABLE_NAMES.generations)
        .select({
          filterByFormula: `AND({${FIELD_NAMES.userId}} = "${userId}", {Generation Date} = "${todayCST}")`,
          maxRecords: 1
        })
        .firstPage();

      if (existingRecords.length > 0) {
        // Update existing record
        const currentCount = existingRecords[0].fields['Count'] || 0;
        await base(TABLE_NAMES.generations).update([{
          id: existingRecords[0].id,
          fields: { 'Count': currentCount + 1 }
        }]);
      } else {
        // Create new record
        await base(TABLE_NAMES.generations).create([{
          fields: {
            [FIELD_NAMES.userId]: [userId], // Airtable API requires array even for single records
            'Generation Date': todayCST,
            'Count': 1
            // Note: 'Created At' is automatically managed by Airtable
          }
        }]);
      }
      return true;
    } catch (error) {
      throw new Error(`Failed to track resume generation: ${error.message}`);
    }
  }

  static async addResumeRequest(userId, requestData) {
    const { company_name, role, job_description, docx_file, pdf_file } = requestData;
    
    // Format date for Airtable (YYYY-MM-DD format for date fields)
    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // Get YYYY-MM-DD format
    
    const fields = {
      [FIELD_NAMES.userId]: [userId], // Airtable API requires array even for single records
      'Company Name': company_name || '',
      'Role': role || '',
      'Job Description': job_description || '',
      'Created At': dateString // Explicitly set creation date in YYYY-MM-DD format
    };

    // Add file attachments if provided
    // Airtable attachment format: [{ url: '...', filename: '...' }]
    if (docx_file) {
      fields['DOCX File'] = Array.isArray(docx_file) ? docx_file : [docx_file];
    }
    if (pdf_file) {
      fields['PDF File'] = Array.isArray(pdf_file) ? pdf_file : [pdf_file];
    }

    try {
      const records = await base(TABLE_NAMES.requests).create([{ fields }]);
      return records[0].id;
    } catch (error) {
      throw new Error(`Failed to add resume request: ${error.message}`);
    }
  }

  static async addCoverLetterRequest(userId, requestData) {
    const { company_name, role, job_description, docx_file, pdf_file } = requestData;
    
    // Format date for Airtable (YYYY-MM-DD format for date fields)
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    
    const fields = {
      [FIELD_NAMES.userId]: [userId],
      'Company Name': company_name || '',
      'Role': role || '',
      'Job Description': job_description || '',
      'Created At': dateString
    };

    // Add file attachments if provided
    if (docx_file) {
      fields['DOCX File'] = Array.isArray(docx_file) ? docx_file : [docx_file];
    }
    if (pdf_file) {
      fields['PDF File'] = Array.isArray(pdf_file) ? pdf_file : [pdf_file];
    }

    try {
      // Use the same requests table for now, or create a separate cover letters table
      const records = await base(TABLE_NAMES.requests).create([{ fields }]);
      return records[0].id;
    } catch (error) {
      throw new Error(`Failed to add cover letter request: ${error.message}`);
    }
  }

  static async getResumeRequests(userId) {
    try {
      // Fetch all records and filter in JavaScript for linked fields
      const allRecords = await base(TABLE_NAMES.requests)
        .select()
        .all();
      
      // Filter records where userId is in the User ID linked field
      const filteredRecords = allRecords.filter(record => {
        const userIds = record.fields[FIELD_NAMES.userId] || [];
        return Array.isArray(userIds) && userIds.some(id => id === userId);
      });
      
      const rows = recordsToArray(filteredRecords);
      
      // Sort by Created At descending
      rows.sort((a, b) => {
        const dateA = new Date(a['Created At'] || a.created_at || 0);
        const dateB = new Date(b['Created At'] || b.created_at || 0);
        return dateB - dateA;
      });
      
      // Transform to match expected format
      // Airtable attachment fields return arrays like [{ url: '...', filename: '...' }]
      return rows.map(row => {
        const docxFile = row['DOCX File'] || row.docx_file;
        const pdfFile = row['PDF File'] || row.pdf_file;
        
        // Extract URL from attachment array (Airtable format)
        const getAttachmentUrl = (attachment) => {
          if (!attachment) return null;
          if (Array.isArray(attachment) && attachment.length > 0) {
            return attachment[0].url || null;
          }
          if (typeof attachment === 'object' && attachment.url) {
            return attachment.url;
          }
          return null;
        };
        
        return {
          id: row.id,
          company_name: row['Company Name'] || row.company_name,
          role: row['Role'] || row.role,
          job_description: row['Job Description'] || row.job_description,
          docx_url: getAttachmentUrl(docxFile),
          pdf_url: getAttachmentUrl(pdfFile),
          created_at: row['Created At'] || row.created_at
        };
      });
    } catch (error) {
      throw new Error(`Failed to get resume requests: ${error.message}`);
    }
  }

  static async getAllUsers() {
    try {
      const userRecords = await base(TABLE_NAMES.users)
        .select({ sort: [{ field: 'Created At', direction: 'desc' }] })
        .all();
      
      const users = recordsToArray(userRecords);
      
      // Get generation counts for each user
      const generationRecords = await base(TABLE_NAMES.generations)
        .select()
        .all();
      
      const generationCounts = {};
      generationRecords.forEach(record => {
        const userField = record.fields[FIELD_NAMES.userId];
        // Handle both single record (string) and array formats
        const userId = Array.isArray(userField) ? userField[0] : userField;
        if (userId) {
          generationCounts[userId] = (generationCounts[userId] || 0) + (record.fields['Count'] || 0);
        }
      });
      
      return users.map(user => ({
        ...user,
        total_generations: generationCounts[user.id] || 0
      }));
    } catch (error) {
      throw new Error(`Failed to get all users: ${error.message}`);
    }
  }

  static async getDailyGenerationCount(userId) {
    const todayCST = await this.getTodayCST();
    
    try {
      const records = await base(TABLE_NAMES.generations)
        .select({
          filterByFormula: `AND({${FIELD_NAMES.userId}} = "${userId}", {Generation Date} = "${todayCST}")`,
          maxRecords: 1
        })
        .firstPage();
      
      if (records.length === 0) return 0;
      return records[0].fields['Count'] || 0;
    } catch (error) {
      throw new Error(`Failed to get daily generation count: ${error.message}`);
    }
  }

  static async getTodayCST() {
    const options = {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(new Date());

    const year = parts.find(part => part.type === 'year').value;
    const month = parts.find(part => part.type === 'month').value;
    const day = parts.find(part => part.type === 'day').value;

    return `${year}-${month}-${day}`;
  }

  static parseDateString(dateString) {
    if (!dateString) return 0;
    
    // Handle various date formats
    const dateStr = dateString.trim();
    
    // Month name patterns (e.g., "Oct 2018", "June 2024", "January 2020")
    const monthNamePattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i;
    const monthNameMatch = dateStr.match(monthNamePattern);
    
    if (monthNameMatch) {
      const monthName = monthNameMatch[1];
      const year = parseInt(monthNameMatch[2]);
      
      const monthMap = {
        'jan': 0, 'january': 0,
        'feb': 1, 'february': 1,
        'mar': 2, 'march': 2,
        'apr': 3, 'april': 3,
        'may': 4,
        'jun': 5, 'june': 5,
        'jul': 6, 'july': 6,
        'aug': 7, 'august': 7,
        'sep': 8, 'september': 8,
        'oct': 9, 'october': 9,
        'nov': 10, 'november': 10,
        'dec': 11, 'december': 11
      };
      
      const month = monthMap[monthName.toLowerCase()];
      if (month !== undefined) {
        return new Date(year, month, 1).getTime();
      }
    }
    
    // MM/YYYY or MM-YYYY format
    const slashPattern = /^(\d{1,2})[\/\-](\d{4})$/;
    const slashMatch = dateStr.match(slashPattern);
    if (slashMatch) {
      const month = parseInt(slashMatch[1]) - 1; // JavaScript months are 0-indexed
      const year = parseInt(slashMatch[2]);
      return new Date(year, month, 1).getTime();
    }
    
    // YYYY-MM format
    const isoPattern = /^(\d{4})-(\d{1,2})$/;
    const isoMatch = dateStr.match(isoPattern);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1; // JavaScript months are 0-indexed
      return new Date(year, month, 1).getTime();
    }
    
    // YYYY format only
    const yearPattern = /^(\d{4})$/;
    const yearMatch = dateStr.match(yearPattern);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      return new Date(year, 0, 1).getTime();
    }
    
    // Try to parse as a standard date string
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.getTime();
    }
    
    // If all else fails, return 0 (will sort to the beginning)
    return 0;
  }

  static async updateUser(userId, userData) {
    const fields = {};
    if (userData.full_name !== undefined) fields['Full Name'] = userData.full_name;
    if (userData.email !== undefined) fields['Email'] = userData.email;
    if (userData.phone !== undefined) fields['Phone'] = userData.phone;
    if (userData.location !== undefined) fields['Location'] = userData.location;
    if (userData.openai_model !== undefined) fields['OpenAI Model'] = userData.openai_model;
    if (userData.max_tokens !== undefined) fields['Max Tokens'] = userData.max_tokens;
    if (userData.daily_generation_limit !== undefined) fields['Daily Generation Limit'] = userData.daily_generation_limit;
    if (userData.is_admin !== undefined) fields['Is Admin'] = userData.is_admin;

    try {
      await base(TABLE_NAMES.users).update([{ id: userId, fields }]);
      return true;
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  static async deleteUser(userId) {
    try {
      await base(TABLE_NAMES.users).destroy([userId]);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  static async getAllResumeRequests() {
    try {
      const allRecords = await base(TABLE_NAMES.requests)
        .select({ sort: [{ field: 'Created At', direction: 'desc' }] })
        .all();

      const rows = recordsToArray(allRecords);

      // Get user emails
      const userIds = [...new Set(rows.map(r => {
        const userField = r['User'] || r[FIELD_NAMES.userId];
        return Array.isArray(userField) ? userField[0] : userField;
      }).filter(Boolean))];

      const userMap = {};
      for (const userId of userIds) {
        try {
          const userRecord = await base(TABLE_NAMES.users).find(userId);
          userMap[userId] = userRecord.fields['Email'];
        } catch (err) {
          userMap[userId] = 'Unknown';
        }
      }

      return rows.map(row => {
        const userField = row['User'] || row[FIELD_NAMES.userId];
        const userId = Array.isArray(userField) ? userField[0] : userField;

        const getAttachmentUrl = (attachment) => {
          if (!attachment) return null;
          if (Array.isArray(attachment) && attachment.length > 0) return attachment[0].url || null;
          if (typeof attachment === 'object' && attachment.url) return attachment.url;
          return null;
        };

        return {
          id: row.id,
          user_id: userId,
          email: userMap[userId] || 'Unknown',
          company_name: row['Company Name'] || row.company_name || '',
          role: row['Role'] || row.role || '',
          job_description: row['Job Description'] || row.job_description || '',
          docx_url: getAttachmentUrl(row['DOCX File'] || row.docx_file),
          pdf_url: getAttachmentUrl(row['PDF File'] || row.pdf_file),
          created_at: row['Created At'] || row.created_at || ''
        };
      });
    } catch (error) {
      throw new Error(`Failed to get all resume requests: ${error.message}`);
    }
  }

  static async getAdminStats() {
    try {
      const todayCST = await this.getTodayCST();
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch all tables in parallel
      const [userRecords, generationRecords, requestRecords] = await Promise.all([
        base(TABLE_NAMES.users).select().all(),
        base(TABLE_NAMES.generations).select().all(),
        base(TABLE_NAMES.requests).select().all(),
      ]);

      const totalUsers = userRecords.length;
      const users = recordsToArray(userRecords);

      // ── Generation analytics ──
      let totalGenerations = 0;
      let todayGenerations = 0;
      const activeUserIds = new Set();
      const generationsByDate = {};       // { 'YYYY-MM-DD': totalCount }
      const generationsByUser = {};       // { userId: totalCount }
      const modelDistribution = {};       // { model: userCount }

      generationRecords.forEach(record => {
        const count = record.fields['Count'] || 0;
        const date = record.fields['Generation Date'] || '';
        const userField = record.fields[FIELD_NAMES.userId];
        const userId = Array.isArray(userField) ? userField[0] : userField;

        totalGenerations += count;
        if (date === todayCST) todayGenerations += count;
        if (userId) {
          activeUserIds.add(userId);
          generationsByUser[userId] = (generationsByUser[userId] || 0) + count;
        }
        if (date) {
          generationsByDate[date] = (generationsByDate[date] || 0) + count;
        }
      });

      // Model distribution from user records
      users.forEach(u => {
        const model = u.openai_model || u['OpenAI Model'] || 'gpt-4o';
        modelDistribution[model] = (modelDistribution[model] || 0) + 1;
      });

      // ── Request analytics ──
      const totalRequests = requestRecords.length;
      let weekRequests = 0;
      let monthRequests = 0;
      const companyFrequency = {};        // { company: count }
      const roleFrequency = {};           // { role: count }
      const requestsByDate = {};          // { 'YYYY-MM-DD': count }
      const requestsByUser = {};          // { userId: count }
      let withDocx = 0;
      let withPdf = 0;

      requestRecords.forEach(record => {
        const createdAt = record.fields['Created At'];
        const company = record.fields['Company Name'] || '';
        const role = record.fields['Role'] || '';
        const userField = record.fields[FIELD_NAMES.userId];
        const userId = Array.isArray(userField) ? userField[0] : userField;

        if (createdAt) {
          const d = new Date(createdAt);
          if (d >= weekAgo) weekRequests++;
          if (d >= monthAgo) monthRequests++;
          const dateKey = createdAt.slice(0, 10);
          requestsByDate[dateKey] = (requestsByDate[dateKey] || 0) + 1;
        }
        if (company) companyFrequency[company] = (companyFrequency[company] || 0) + 1;
        if (role) roleFrequency[role] = (roleFrequency[role] || 0) + 1;
        if (userId) requestsByUser[userId] = (requestsByUser[userId] || 0) + 1;

        const docxFile = record.fields['DOCX File'];
        const pdfFile = record.fields['PDF File'];
        if (docxFile && (Array.isArray(docxFile) ? docxFile.length > 0 : true)) withDocx++;
        if (pdfFile && (Array.isArray(pdfFile) ? pdfFile.length > 0 : true)) withPdf++;
      });

      // ── Top users (by generations) ──
      const userEmailMap = {};
      const userNameMap = {};
      users.forEach(u => {
        userEmailMap[u.id] = u.email || u.Email || 'Unknown';
        userNameMap[u.id] = u.full_name || u['Full Name'] || '';
      });

      const topUsersByGenerations = Object.entries(generationsByUser)
        .map(([userId, count]) => ({
          userId,
          email: userEmailMap[userId] || 'Unknown',
          full_name: userNameMap[userId] || '',
          generations: count,
          requests: requestsByUser[userId] || 0,
        }))
        .sort((a, b) => b.generations - a.generations)
        .slice(0, 15);

      // ── Top companies ──
      const topCompanies = Object.entries(companyFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, count]) => ({ name, count }));

      // ── Top roles ──
      const topRoles = Object.entries(roleFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, count]) => ({ name, count }));

      // ── Generation trend (last 30 days) ──
      const generationTrend = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().slice(0, 10);
        generationTrend.push({
          date: dateStr,
          generations: generationsByDate[dateStr] || 0,
          requests: requestsByDate[dateStr] || 0,
        });
      }

      // ── User registration trend (last 30 days) ──
      const registrationsByDate = {};
      users.forEach(u => {
        const ca = u.created_at || u['Created At'];
        if (ca) {
          const dateKey = ca.slice(0, 10);
          registrationsByDate[dateKey] = (registrationsByDate[dateKey] || 0) + 1;
        }
      });
      const registrationTrend = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().slice(0, 10);
        registrationTrend.push({
          date: dateStr,
          count: registrationsByDate[dateStr] || 0,
        });
      }

      // ── Day-of-week distribution (from generations) ──
      const dayOfWeekDist = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      Object.entries(generationsByDate).forEach(([dateStr, count]) => {
        const d = new Date(dateStr + 'T12:00:00');
        if (!isNaN(d.getTime())) {
          dayOfWeekDist[dayNames[d.getDay()]] += count;
        }
      });

      // ── Average generations per user ──
      const avgGenerationsPerUser = activeUserIds.size > 0
        ? Math.round(totalGenerations / activeUserIds.size * 10) / 10
        : 0;

      // ── File output rate ──
      const docxRate = totalRequests > 0 ? Math.round((withDocx / totalRequests) * 100) : 0;
      const pdfRate = totalRequests > 0 ? Math.round((withPdf / totalRequests) * 100) : 0;

      return {
        // Core stats
        totalUsers,
        totalGenerations,
        todayGenerations,
        totalRequests,
        weekRequests,
        monthRequests,
        activeUsers: activeUserIds.size,
        avgGenerationsPerUser,

        // File stats
        withDocx,
        withPdf,
        docxRate,
        pdfRate,

        // Distributions
        modelDistribution,
        dayOfWeekDist,

        // Trends (30 days)
        generationTrend,
        registrationTrend,

        // Top lists
        topUsersByGenerations,
        topCompanies,
        topRoles,
      };
    } catch (error) {
      throw new Error(`Failed to get admin stats: ${error.message}`);
    }
  }

  static async getUserActivity(userId) {
    try {
      // Get user info
      const userRecord = await base(TABLE_NAMES.users).find(userId);
      const user = recordToObject(userRecord);

      // Get user's generations
      const allGens = await base(TABLE_NAMES.generations).select().all();
      const userGens = allGens.filter(r => {
        const uf = r.fields[FIELD_NAMES.userId];
        const uid = Array.isArray(uf) ? uf[0] : uf;
        return uid === userId;
      });

      const generationHistory = userGens.map(r => ({
        date: r.fields['Generation Date'] || '',
        count: r.fields['Count'] || 0,
      })).sort((a, b) => b.date.localeCompare(a.date));

      let totalGenerations = 0;
      generationHistory.forEach(g => totalGenerations += g.count);

      // Get user's requests
      const allReqs = await base(TABLE_NAMES.requests).select().all();
      const userReqs = allReqs.filter(r => {
        const uf = r.fields[FIELD_NAMES.userId] || [];
        return Array.isArray(uf) && uf.some(id => id === userId);
      });

      const getAttachmentUrl = (attachment) => {
        if (!attachment) return null;
        if (Array.isArray(attachment) && attachment.length > 0) return attachment[0].url || null;
        if (typeof attachment === 'object' && attachment.url) return attachment.url;
        return null;
      };

      const requests = recordsToArray(userReqs)
        .map(row => ({
          id: row.id,
          company_name: row['Company Name'] || row.company_name || '',
          role: row['Role'] || row.role || '',
          created_at: row['Created At'] || row.created_at || '',
          docx_url: getAttachmentUrl(row['DOCX File'] || row.docx_file),
          pdf_url: getAttachmentUrl(row['PDF File'] || row.pdf_file),
        }))
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

      // Company breakdown for this user
      const companies = {};
      requests.forEach(r => {
        if (r.company_name) companies[r.company_name] = (companies[r.company_name] || 0) + 1;
      });

      return {
        user: {
          id: user.id,
          email: user.email || user.Email,
          full_name: user.full_name || user['Full Name'] || '',
          location: user.location || user.Location || '',
          openai_model: user.openai_model || user['OpenAI Model'] || 'gpt-4o',
          max_tokens: user.max_tokens || user['Max Tokens'] || 30000,
          daily_generation_limit: user.daily_generation_limit || user['Daily Generation Limit'] || 150,
          is_admin: user.is_admin || user['Is Admin'] || false,
          created_at: user.created_at || user['Created At'] || '',
        },
        totalGenerations,
        totalRequests: requests.length,
        generationHistory,
        requests,
        companyBreakdown: Object.entries(companies)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
      };
    } catch (error) {
      throw new Error(`Failed to get user activity: ${error.message}`);
    }
  }

  static async getDailyGenerations() {
    try {
      const records = await base(TABLE_NAMES.generations)
        .select({
          sort: [{ field: 'Generation Date', direction: 'desc' }, { field: FIELD_NAMES.userId, direction: 'asc' }]
        })
        .all();
      
      const rows = recordsToArray(records);
      
      // Get user emails for each generation
      // Handle both single record (string) and array formats
      const userIds = [...new Set(rows.map(r => {
        const userField = r[FIELD_NAMES.userId];
        return Array.isArray(userField) ? userField[0] : userField;
      }).filter(Boolean))];
      const userMap = {};
      
      for (const userId of userIds) {
        try {
          const userRecord = await base(TABLE_NAMES.users).find(userId);
          userMap[userId] = userRecord.fields['Email'];
        } catch (err) {
          userMap[userId] = 'Unknown';
        }
      }
      
      return rows.map(row => {
        const userField = row[FIELD_NAMES.userId];
        const userId = Array.isArray(userField) ? userField[0] : userField;
        return {
          user_id: userId || row.user_id,
          email: userMap[userId || row.user_id] || 'Unknown',
          generation_date: row['Generation Date'] || row.generation_date,
          count: row['Count'] || row.count
        };
      });
    } catch (error) {
      throw new Error(`Failed to get daily generations: ${error.message}`);
    }
  }
}

module.exports = User;
