export const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Management', 'Accounts'];
export const CATEGORIES = ['Travel', 'Meals', 'Accommodation', 'Office Supplies', 'Software', 'Training', 'Client Entertainment', 'Other'];
export const STATUS_LABEL = { DRAFT: 'Draft', PENDING: 'Pending Approval', APPROVED: 'Approved', REJECTED: 'Rejected' };
export const money = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
