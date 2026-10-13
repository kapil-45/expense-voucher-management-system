const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { wrap } = require('../utils');

const RECENT = `SELECT v.id, v.voucher_number, v.title, v.amount, v.status, v.updated_at, v.approval_date, u.name AS employee_name
  FROM vouchers v JOIN users u ON u.id = v.user_id`;

router.get('/', authenticate, wrap(async (req, res) => {
  const u = req.user;
  let stats, recent;
  if (u.role === 'EMPLOYEE') {
    [[stats]] = await db.query(
      `SELECT COUNT(*) AS total,
        COALESCE(SUM(status='DRAFT'),0) AS draft, COALESCE(SUM(status='PENDING'),0) AS pending,
        COALESCE(SUM(status='APPROVED'),0) AS approved, COALESCE(SUM(status='REJECTED'),0) AS rejected,
        COALESCE(SUM(amount),0) AS totalAmount
       FROM vouchers WHERE user_id = ?`, [u.id]);
    [recent] = await db.query(`${RECENT} WHERE v.user_id = ? ORDER BY v.updated_at DESC LIMIT 8`, [u.id]);
  } else if (u.role === 'DIRECTOR') {
    [[stats]] = await db.query(
      `SELECT COALESCE(SUM(status='PENDING'),0) AS pending,
        COALESCE(SUM(status='APPROVED' AND DATE(decided_at)=CURDATE()),0) AS approvedToday,
        COALESCE(SUM(status='REJECTED' AND DATE(decided_at)=CURDATE()),0) AS rejectedToday,
        COALESCE(SUM(CASE WHEN status='PENDING' THEN amount ELSE 0 END),0) AS pendingAmount
       FROM vouchers`);
    [recent] = await db.query(`${RECENT} WHERE v.status <> 'DRAFT' ORDER BY v.updated_at DESC LIMIT 8`);
  } else {
    [[stats]] = await db.query(
      `SELECT COUNT(*) AS total,
        COALESCE(SUM(status='PENDING'),0) AS pending, COALESCE(SUM(status='APPROVED'),0) AS approved,
        COALESCE(SUM(status='REJECTED'),0) AS rejected,
        COALESCE(SUM(CASE WHEN status='APPROVED' THEN amount ELSE 0 END),0) AS totalApprovedAmount
       FROM vouchers WHERE status <> 'DRAFT'`);
    [recent] = await db.query(`${RECENT} WHERE v.status = 'APPROVED' ORDER BY v.approval_date DESC LIMIT 8`);
  }
  res.json({ role: u.role, stats, recent });
}));

module.exports = router;
