const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbRun, dbAll } = require('../config/database');
const { signToken, authenticateToken } = require('../middleware/auth');

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'student', department = 'General' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = uuidv4();

    // Enforce allowed roles (default to student if invalid role passed from public register)
    const sanitizedRole = ['admin', 'faculty', 'student'].includes(role) ? role : 'student';

    await dbRun(
      `INSERT INTO users (id, name, email, password_hash, role, department) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, name.trim(), email.toLowerCase().trim(), passwordHash, sanitizedRole, department]
    );

    const user = { id: userId, name, email: email.toLowerCase().trim(), role: sanitizedRole, department };
    const token = signToken(user);

    res.status(201).json({
      message: 'Account created successfully.',
      user,
      token
    });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Server error registering user.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department
    };
    const token = signToken(safeUser);

    res.json({
      message: 'Login successful.',
      user: safeUser,
      token
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Server error logging in.' });
  }
});

// Fast Quick-Login Switcher for Demo / Evaluation
router.post('/demo-login', async (req, res) => {
  try {
    const { role } = req.body; // 'admin', 'student', 'faculty'
    const targetEmail = role === 'admin' 
      ? 'admin@campus.edu' 
      : role === 'faculty' 
        ? 'faculty@campus.edu' 
        : 'student@campus.edu';

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [targetEmail]);
    if (!user) {
      return res.status(404).json({ error: `Demo user for role ${role} not found. Please run database seed.` });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department
    };
    const token = signToken(safeUser);

    res.json({
      message: `Switched to ${user.name} (${user.role}).`,
      user: safeUser,
      token
    });
  } catch (err) {
    console.error('Error in demo login:', err);
    res.status(500).json({ error: 'Server error during demo login.' });
  }
});

// Get current profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT id, name, email, role, department, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Error fetching me:', err);
    res.status(500).json({ error: 'Server error fetching user profile.' });
  }
});

// List all users (Admin only)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    const users = await dbAll('SELECT id, name, email, role, department, created_at FROM users ORDER BY name ASC');
    res.json({ users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error fetching users list.' });
  }
});

module.exports = router;
