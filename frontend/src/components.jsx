import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './auth';
import { STATUS_LABEL } from './constants';

export function Protected({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

const NAV = {
  EMPLOYEE: [['/', 'Dashboard'], ['/vouchers', 'My Vouchers'], ['/vouchers/new', 'Create Voucher']],
  DIRECTOR: [['/', 'Dashboard'], ['/pending', 'Pending Approvals'], ['/vouchers', 'All Vouchers']],
  ACCOUNTS: [['/', 'Dashboard'], ['/vouchers', 'All Vouchers']],
};
const ROLE = { EMPLOYEE: 'Employee', DIRECTOR: 'Director', ACCOUNTS: 'Accounts' };

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="nav no-print">
        <strong className="brand">Expense Vouchers</strong>
        <nav>
          {NAV[user.role].map(([to, label]) => (
            <NavLink key={to} to={to} end>{label}</NavLink>
          ))}
        </nav>
        <div className="who">
          <span>{user.name} ({ROLE[user.role]})</span>
          <button className="ghost" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="page"><Outlet /></main>
    </>
  );
}

export const Badge = ({ status }) => <span className={`badge ${status}`}>{STATUS_LABEL[status]}</span>;
export const FieldError = ({ msg }) => (msg ? <small className="error">{msg}</small> : null);
