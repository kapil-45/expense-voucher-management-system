const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { wrap, httpError, publicUser } = require('../utils');

router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw httpError(400, 'Email and password are required');
  const [[user]] = await db.query('SELECT * FROM users WHERE email=?', [String(email).trim().toLowerCase()]);
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    throw httpError(401, 'Invalid email or password');
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
  res.json({ token, user: publicUser(user) });
}));

router.get('/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;
