const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Admin: Get dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const stats = await User.getAdminStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// Admin: Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.getAllUsers();
    const safeUsers = users.map(user => {
      const { password, Password, reset_token, reset_token_expires, ...safeUser } = user;
      return safeUser;
    });
    res.json(safeUsers);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Admin: Update a user
router.put('/users/:userId', adminAuth, async (req, res) => {
  try {
    await User.updateUser(req.params.userId, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// Admin: Delete a user
router.delete('/users/:userId', adminAuth, async (req, res) => {
  try {
    await User.deleteUser(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// Admin: Get daily resume generations
router.get('/daily-generations', adminAuth, async (req, res) => {
  try {
    const dailyGenerations = await User.getDailyGenerations();
    res.json(dailyGenerations);
  } catch (error) {
    console.error('Error fetching daily resume generations:', error);
    res.status(500).json({ error: 'Failed to fetch daily resume generations.' });
  }
});

// Admin: Get user activity detail
router.get('/users/:userId/activity', adminAuth, async (req, res) => {
  try {
    const activity = await User.getUserActivity(req.params.userId);
    res.json(activity);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity.' });
  }
});

// Admin: Get all resume requests
router.get('/requests', adminAuth, async (req, res) => {
  try {
    const requests = await User.getAllResumeRequests();
    res.json(requests);
  } catch (error) {
    console.error('Error fetching all requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests.' });
  }
});

module.exports = router;
