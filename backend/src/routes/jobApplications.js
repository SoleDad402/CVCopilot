const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const JobApplication = require('../models/JobApplication');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);
    const apps = await JobApplication.getAll(user.id);
    res.json(apps);
  } catch (error) {
    console.error('Error fetching job applications:', error);
    res.status(500).json({ error: 'Failed to fetch job applications' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);
    const app = await JobApplication.getById(user.id, req.params.id);
    const events = await JobApplication.getEvents(req.params.id);
    res.json({ ...app, events });
  } catch (error) {
    console.error('Error fetching job application:', error);
    res.status(500).json({ error: 'Failed to fetch job application' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);
    const app = await JobApplication.create(user.id, req.body);
    res.status(201).json(app);
  } catch (error) {
    console.error('Error creating job application:', error);
    res.status(500).json({ error: 'Failed to create job application' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);
    const app = await JobApplication.update(user.id, req.params.id, req.body);
    res.json(app);
  } catch (error) {
    console.error('Error updating job application:', error);
    res.status(500).json({ error: 'Failed to update job application' });
  }
});

router.put('/:id/status', auth, async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);
    const { status, comment } = req.body;
    const app = await JobApplication.updateStatus(user.id, req.params.id, status, comment);
    res.json(app);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);
    await JobApplication.delete(user.id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting job application:', error);
    res.status(500).json({ error: 'Failed to delete job application' });
  }
});

router.post('/:id/events', auth, async (req, res) => {
  try {
    const event = await JobApplication.addComment(req.params.id, req.body.comment);
    res.status(201).json(event);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.delete('/:appId/events/:eventId', auth, async (req, res) => {
  try {
    await JobApplication.deleteEvent(req.params.eventId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
