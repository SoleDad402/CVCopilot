const express = require('express');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const msg = {
    to: email,
    from: process.env.SENDGRID_EMAIL_FROM,
    subject: 'Reset your password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2D3748; text-align: center;">Password Reset Request</h1>
        <p style="color: #4A5568; font-size: 16px; line-height: 1.5;">
          We received a request to reset your password. Click the button below to create a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #4299E1; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #718096; font-size: 14px;">This link will expire in 1 hour.</p>
        <p style="color: #718096; font-size: 14px;">
          If you did not request a password reset, you can safely ignore this email.
        </p>
        <p style="color: #718096; font-size: 14px;">
          If the button above doesn't work, copy and paste this link:
          <br/><a href="${resetUrl}" style="color: #4299E1;">${resetUrl}</a>
        </p>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('SendGrid error:', error);
    if (error.response) console.error(error.response.body);
    throw new Error('Failed to send password reset email');
  }
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone, personal_email, linkedin_url, github_url, location } = req.body;
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const { id: userId } = await User.create({ email, password, full_name, phone, personal_email, linkedin_url, github_url, location });
    const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const isValid = await User.verifyPassword(email, password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const user = await User.findByEmail(email);
    if (user.is_active === false) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact an administrator.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : '7d' }
    );
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.json({ message: 'If your email is registered, you will receive a password reset link' });

    const token = await User.generatePasswordResetToken(email);
    await sendPasswordResetEmail(email, token);
    res.json({ message: 'If your email is registered, you will receive a password reset link' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const success = await User.resetPassword(token, newPassword);
    if (success) {
      res.json({ message: 'Password reset successfully' });
    } else {
      res.status(400).json({ error: 'Invalid or expired reset token' });
    }
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.get('/verify', auth, async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);
    if (!user) return res.status(401).json({ error: 'Invalid user' });
    const { password, reset_token, reset_token_expires, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

module.exports = router;
