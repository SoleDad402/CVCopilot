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
    const { company_name, location, position, start_date, end_date, is_current, description } = employmentData;
    
    const fields = {
      [FIELD_NAMES.userId]: [userId], // Link field - Airtable API requires array even for single records
      'Company Name': company_name,
      'Location': location || '',
      'Position': position,
      'Start Date': start_date,
      'End Date': end_date || '',
      'Is Current': is_current || false,
      'Description': description || ''
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
    const { company_name, location, position, start_date, end_date, is_current, description } = employmentData;
    
    const fields = {};
    if (company_name !== undefined) fields['Company Name'] = company_name;
    if (location !== undefined) fields['Location'] = location;
    if (position !== undefined) fields['Position'] = position;
    if (start_date !== undefined) fields['Start Date'] = start_date;
    if (end_date !== undefined) fields['End Date'] = end_date;
    if (is_current !== undefined) fields['Is Current'] = is_current;
    if (description !== undefined) fields['Description'] = description;

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
      gpa, 
      description 
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
      'GPA': gpa || '',
      'Description': description || ''
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
      gpa, 
      description 
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
    if (description !== undefined) fields['Description'] = description;

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
    
    const fields = {
      [FIELD_NAMES.userId]: [userId], // Airtable API requires array even for single records
      'Company Name': company_name || '',
      'Role': role || '',
      'Job Description': job_description || ''
      // Note: 'Created At' is automatically managed by Airtable
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
      return rows.map(row => ({
        id: row.id,
        company_name: row['Company Name'] || row.company_name,
        role: row['Role'] || row.role,
        job_description: row['Job Description'] || row.job_description,
        docx_path: row['DOCX File'] || row.docx_path, // Will be attachment array
        pdf_path: row['PDF File'] || row.pdf_path, // Will be attachment array
        created_at: row['Created At'] || row.created_at
      }));
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
