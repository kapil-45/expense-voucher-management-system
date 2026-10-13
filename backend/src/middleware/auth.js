const jwt = require('jsonwebtoken');
const db = require('../db');
const { wrap, httpError } = require('../utils');

exports.authenticate = wrap(async (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) throw httpError(401, 'Authentication required');
  let payload;
  try { payload = jwt.verify(h.slice(7), process.env.JWT_SECRET); }
  catch { throw httpError(401, 'Invalid or expired token'); }
  const [[user]] = await db.query('SELECT * FROM users WHERE id=?', [payload.id]);
  if (!user) throw httpError(401, 'User no longer exists');
  req.user = user;
  next();
});

exports.authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(httpError(403, 'You do not have permission to do this'));
