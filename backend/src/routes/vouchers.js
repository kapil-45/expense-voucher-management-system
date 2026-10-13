const router = require('express').Router();
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { wrap, httpError } = require('../utils');

router.use(authenticate);

const BASE = `SELECT v.*, u.name AS employee_name, u.employee_code, d.name AS director_name
  FROM vouchers v JOIN users u ON u.id = v.user_id LEFT JOIN users d ON d.id = v.director_id`;
const fileOf = (req) => (req.file ? `/uploads/${req.file.filename}` : null);

// Employees see only their own vouchers; Director/Accounts see all submitted vouchers (never other people's drafts)
const scope = (user) =>
  user.role === 'EMPLOYEE'
    ? { sql: 'v.user_id = ?', params: [user.id] }
    : { sql: "v.status <> 'DRAFT'", params: [] };

async function load(id, user) {
  const s = scope(user);
  const [[v]] = await db.query(`${BASE} WHERE v.id = ? AND ${s.sql}`, [id, ...s.params]);
  if (!v) throw httpError(404, 'Voucher not found');
  return v;
}

function validate(b) {
  const e = {};
  if (!String(b.department || '').trim()) e.department = 'Department is required';
  if (!String(b.title || '').trim()) e.title = 'Expense title is required';
  if (!b.expense_date || isNaN(Date.parse(b.expense_date))) e.expense_date = 'A valid expense date is required';
  if (b.amount === undefined || b.amount === null || b.amount === '') e.amount = 'Amount is required';
  else if (!(Number(b.amount) > 0)) e.amount = 'Amount must be greater than zero';
  if (Object.keys(e).length) throw httpError(400, 'Validation failed', e);
}

const fields = (b) => ({
  department: String(b.department).trim(),
  title: String(b.title).trim(),
  category: String(b.category || '').trim() || null,
  description: String(b.description || '').trim() || null,
  expense_date: b.expense_date,
  amount: Number(b.amount),
});

// List with search / filter / sort
router.get('/', wrap(async (req, res) => {
  const q = req.query;
  const s = scope(req.user);
  const where = [s.sql];
  const p = [...s.params];
  if (q.q) {
    where.push('(v.voucher_number LIKE ? OR u.name LIKE ? OR v.title LIKE ?)');
    const like = `%${q.q}%`;
    p.push(like, like, like);
  }
  if (q.status) { where.push('v.status = ?'); p.push(q.status); }
  if (q.department) { where.push('v.department = ?'); p.push(q.department); }
  if (q.category) { where.push('v.category = ?'); p.push(q.category); }
  if (q.from) { where.push('v.expense_date >= ?'); p.push(q.from); }
  if (q.to) { where.push('v.expense_date <= ?'); p.push(q.to); }
  if (q.minAmount) { where.push('v.amount >= ?'); p.push(Number(q.minAmount)); }
  if (q.maxAmount) { where.push('v.amount <= ?'); p.push(Number(q.maxAmount)); }
  const sorts = { date: 'v.expense_date', amount: 'v.amount', number: 'v.voucher_number',
    status: 'v.status', employee: 'u.name', updated: 'v.updated_at' };
  const col = sorts[q.sortBy] || 'v.created_at';
  const dir = q.order === 'asc' ? 'ASC' : 'DESC';
  const [vouchers] = await db.query(`${BASE} WHERE ${where.join(' AND ')} ORDER BY ${col} ${dir}, v.id DESC`, p);
  res.json({ vouchers });
}));

router.get('/:id', wrap(async (req, res) => res.json({ voucher: await load(req.params.id, req.user) })));

// Employee: create (always starts as Draft, number auto-generated)
router.post('/', authorize('EMPLOYEE'), upload.single('signature'), wrap(async (req, res) => {
  validate(req.body);
  const f = fields(req.body);
  const sig = fileOf(req);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const year = new Date().getFullYear();
    await conn.query(
      'INSERT INTO voucher_sequences (year, last_no) VALUES (?, 1) ON DUPLICATE KEY UPDATE last_no = last_no + 1', [year]);
    const [[{ last_no }]] = await conn.query('SELECT last_no FROM voucher_sequences WHERE year = ?', [year]);
    const number = `EV-${year}-${String(last_no).padStart(5, '0')}`;
    const [r] = await conn.query(
      `INSERT INTO vouchers (voucher_number,user_id,voucher_date,expense_date,department,title,category,description,amount,status,employee_signature)
       VALUES (?,?,CURDATE(),?,?,?,?,?,?,'DRAFT',?)`,
      [number, req.user.id, f.expense_date, f.department, f.title, f.category, f.description, f.amount, sig]);
    if (sig) await conn.query('UPDATE users SET signature_path=? WHERE id=?', [sig, req.user.id]);
    await conn.commit();
    res.status(201).json({ voucher: await load(r.insertId, req.user) });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

// Employee: edit draft only
router.put('/:id', authorize('EMPLOYEE'), upload.single('signature'), wrap(async (req, res) => {
  const v = await load(req.params.id, req.user);
  if (v.status !== 'DRAFT') throw httpError(403, 'Only draft vouchers can be edited');
  validate(req.body);
  const f = fields(req.body);
  const sig = fileOf(req) || v.employee_signature;
  await db.query(
    `UPDATE vouchers SET expense_date=?,department=?,title=?,category=?,description=?,amount=?,employee_signature=? WHERE id=?`,
    [f.expense_date, f.department, f.title, f.category, f.description, f.amount, sig, v.id]);
  if (req.file) await db.query('UPDATE users SET signature_path=? WHERE id=?', [sig, req.user.id]);
  res.json({ voucher: await load(v.id, req.user) });
}));

// Employee: delete draft only
router.delete('/:id', authorize('EMPLOYEE'), wrap(async (req, res) => {
  const v = await load(req.params.id, req.user);
  if (v.status !== 'DRAFT') throw httpError(403, 'Only draft vouchers can be deleted');
  await db.query('DELETE FROM vouchers WHERE id=?', [v.id]);
  res.json({ message: 'Voucher deleted' });
}));

// Employee: submit (Draft -> Pending Approval)
router.post('/:id/submit', authorize('EMPLOYEE'), wrap(async (req, res) => {
  const v = await load(req.params.id, req.user);
  if (v.status !== 'DRAFT') throw httpError(403, 'Only draft vouchers can be submitted');
  validate(v);
  const sig = v.employee_signature || req.user.signature_path;
  if (!sig) throw httpError(400, 'Validation failed', { signature: 'Employee signature is required before submission' });
  await db.query("UPDATE vouchers SET status='PENDING', employee_signature=? WHERE id=?", [sig, v.id]);
  res.json({ voucher: await load(v.id, req.user) });
}));

// Director: approve (signature uploaded now, or the saved one)
router.post('/:id/approve', authorize('DIRECTOR'), upload.single('signature'), wrap(async (req, res) => {
  const v = await load(req.params.id, req.user);
  if (v.status !== 'PENDING') throw httpError(409, 'Only pending vouchers can be approved');
  const sig = fileOf(req) || req.user.signature_path;
  if (!sig) throw httpError(400, 'Validation failed', { signature: 'Director signature is required for approval' });
  if (req.file) await db.query('UPDATE users SET signature_path=? WHERE id=?', [sig, req.user.id]);
  await db.query(
    "UPDATE vouchers SET status='APPROVED', director_signature=?, director_id=?, approval_date=NOW(), decided_at=NOW() WHERE id=?",
    [sig, req.user.id, v.id]);
  res.json({ voucher: await load(v.id, req.user) });
}));

// Director: reject (reason mandatory)
router.post('/:id/reject', authorize('DIRECTOR'), wrap(async (req, res) => {
  const v = await load(req.params.id, req.user);
  if (v.status !== 'PENDING') throw httpError(409, 'Only pending vouchers can be rejected');
  const reason = String((req.body || {}).reason || '').trim();
  if (!reason) throw httpError(400, 'Validation failed', { reason: 'Rejection reason is required' });
  await db.query(
    "UPDATE vouchers SET status='REJECTED', rejection_reason=?, director_id=?, decided_at=NOW() WHERE id=?",
    [reason, req.user.id, v.id]);
  res.json({ voucher: await load(v.id, req.user) });
}));

module.exports = router;
