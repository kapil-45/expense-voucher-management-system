const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const httpError = (status, message, errors) => Object.assign(new Error(message), { status, errors });
const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  employee_code: u.employee_code, department: u.department, signature_path: u.signature_path,
});
module.exports = { wrap, httpError, publicUser };
