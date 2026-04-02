const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// GET /api/profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);
    const employmentHistory = await User.getEmploymentHistory(user.id);
    const education = await User.getEducation(user.id);

    // Return all user fields (Supabase select('*') already returns everything)
    const { password, reset_token, reset_token_expires, ...cleanUser } = user;

    const cleanEmploymentHistory = employmentHistory.map(item => ({
      id: item.id,
      company_name: item.company_name || '',
      location: item.location || '',
      position: item.position || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      is_current: item.is_current || false,
      description: item.description || '',
    }));

    const cleanEducation = education.map(item => ({
      id: item.id,
      school_name: item.school_name || '',
      location: item.location || '',
      degree: item.degree || '',
      field_of_study: item.field_of_study || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      is_current: item.is_current || false,
      gpa: item.gpa || '',
      description: item.description || '',
    }));

    res.json({
      user: cleanUser,
      employmentHistory: cleanEmploymentHistory,
      education: cleanEducation,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/profile
router.put('/', auth, async (req, res) => {
  try {
    await User.updateProfile(req.user.id, req.body);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// --- Employment History ---

router.post('/employment', auth, async (req, res) => {
  try {
    const employmentId = await User.addEmploymentHistory(req.user.id, req.body);
    res.status(201).json({ id: employmentId });
  } catch (error) {
    console.error('Employment history add error:', error);
    res.status(500).json({ error: 'Failed to add employment history' });
  }
});

router.put('/employment/:id', auth, async (req, res) => {
  try {
    await User.updateEmploymentHistory(req.params.id, req.body);
    res.json({ message: 'Employment history updated successfully' });
  } catch (error) {
    console.error('Employment history update error:', error);
    res.status(500).json({ error: 'Failed to update employment history' });
  }
});

router.delete('/employment/:id', auth, async (req, res) => {
  try {
    await User.deleteEmploymentHistory(req.params.id);
    res.json({ message: 'Employment history deleted successfully' });
  } catch (error) {
    console.error('Employment history delete error:', error);
    res.status(500).json({ error: 'Failed to delete employment history' });
  }
});

// --- Education ---

router.post('/education', auth, async (req, res) => {
  try {
    const educationId = await User.addEducation(req.user.id, req.body);
    res.status(201).json({ id: educationId });
  } catch (error) {
    console.error('Education add error:', error);
    res.status(500).json({ error: 'Failed to add education' });
  }
});

router.get('/education', auth, async (req, res) => {
  try {
    const education = await User.getEducation(req.user.id);
    res.json(education);
  } catch (error) {
    console.error('Education fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch education' });
  }
});

router.put('/education/:id', auth, async (req, res) => {
  try {
    await User.updateEducation(req.params.id, req.body);
    res.json({ message: 'Education updated successfully' });
  } catch (error) {
    console.error('Education update error:', error);
    res.status(500).json({ error: 'Failed to update education' });
  }
});

router.delete('/education/:id', auth, async (req, res) => {
  try {
    await User.deleteEducation(req.params.id);
    res.json({ message: 'Education deleted successfully' });
  } catch (error) {
    console.error('Education delete error:', error);
    res.status(500).json({ error: 'Failed to delete education' });
  }
});

// --- History ---

router.get('/history', auth, async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);
    if (!user) return res.status(401).json({ error: 'Invalid user' });

    const history = await User.getResumeRequests(user.id);
    const grouped = history.reduce((acc, item) => {
      const dateKey = (item.created_at || '').slice(0, 10);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(item);
      return acc;
    }, {});

    res.json({ history: grouped });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
