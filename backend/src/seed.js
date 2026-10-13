require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const users = [
  ['Dana Director', 'director@example.com', 'DIRECTOR', null, 'Management'],
  ['Alex Accounts', 'accounts@example.com', 'ACCOUNTS', null, 'Accounts'],
  ['Emma Employee', 'employee1@example.com', 'EMPLOYEE', 'EMP001', 'Engineering'],
  ['Ravi Employee', 'employee2@example.com', 'EMPLOYEE', 'EMP002', 'Sales'],
];

(async () => {
  const hash = await bcrypt.hash('Password@123', 10);
  for (const [name, email, role, code, dept] of users) {
    await db.query(
      'INSERT IGNORE INTO users (name,email,password_hash,role,employee_code,department) VALUES (?,?,?,?,?,?)',
      [name, email, hash, role, code, dept]
    );
  }
  console.log('Seeded demo users (password for all: Password@123)');
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
