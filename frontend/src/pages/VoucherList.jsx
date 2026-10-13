import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Badge } from '../components';
import { CATEGORIES, DEPARTMENTS, STATUS_LABEL, money } from '../constants';

const empty = { q: '', status: '', department: '', category: '', from: '', to: '', minAmount: '', maxAmount: '', sortBy: '', order: 'desc' };

export default function VoucherList({ title, status }) {
  const { user } = useAuth();
  const isEmp = user.role === 'EMPLOYEE';
  const [f, setF] = useState(empty);
  const [applied, setApplied] = useState(empty);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const p = new URLSearchParams();
    Object.entries({ ...applied, ...(status ? { status } : {}) }).forEach(([k, v]) => v && p.set(k, v));
    setErr('');
    api('/vouchers?' + p).then((r) => setRows(r.vouchers)).catch((e) => setErr(e.message));
  }, [applied, status]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const statuses = Object.keys(STATUS_LABEL).filter((s) => isEmp || s !== 'DRAFT');

  return (
    <>
      <div className="row between">
        <h1>{title || (isEmp ? 'My Vouchers' : 'All Vouchers')}</h1>
        {isEmp && <Link className="btn" to="/vouchers/new">Create voucher</Link>}
      </div>
      <form className="filters card" onSubmit={(e) => { e.preventDefault(); setApplied(f); }}>
        <label className="wide">Search<input placeholder="Voucher number, employee or title" value={f.q} onChange={set('q')} /></label>
        {!status && <label>Status<select value={f.status} onChange={set('status')}><option value="">All</option>{statuses.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>}
        <label>Department<select value={f.department} onChange={set('department')}><option value="">All</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></label>
        <label>Category<select value={f.category} onChange={set('category')}><option value="">All</option>{CATEGORIES.map((d) => <option key={d}>{d}</option>)}</select></label>
        <label>Expense from<input type="date" value={f.from} onChange={set('from')} /></label>
        <label>Expense to<input type="date" value={f.to} onChange={set('to')} /></label>
        <label>Min amount<input type="number" min="0" value={f.minAmount} onChange={set('minAmount')} /></label>
        <label>Max amount<input type="number" min="0" value={f.maxAmount} onChange={set('maxAmount')} /></label>
        <label>Sort by<select value={f.sortBy} onChange={set('sortBy')}>
          <option value="">Newest created</option><option value="date">Expense date</option><option value="amount">Amount</option>
          <option value="number">Voucher number</option><option value="status">Status</option>{!isEmp && <option value="employee">Employee</option>}
        </select></label>
        <label>Order<select value={f.order} onChange={set('order')}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
        <div className="row"><button>Apply filters</button><button type="button" className="ghost" onClick={() => { setF(empty); setApplied(empty); }}>Reset</button></div>
      </form>
      {err && <p className="error">{err}</p>}
      {!rows ? <p>Loading…</p> : rows.length === 0 ? <p className="muted">No vouchers match these filters.</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Voucher</th><th>Expense date</th>{!isEmp && <th>Employee</th>}<th>Department</th><th>Category</th><th>Title</th><th className="num">Amount</th><th>Status</th></tr></thead>
          <tbody>{rows.map((v) => (
            <tr key={v.id}>
              <td><Link to={`/vouchers/${v.id}`}>{v.voucher_number}</Link></td><td>{v.expense_date}</td>
              {!isEmp && <td>{v.employee_name}</td>}<td>{v.department}</td><td>{v.category || '-'}</td><td>{v.title}</td>
              <td className="num">{money(v.amount)}</td><td><Badge status={v.status} /></td>
            </tr>))}
          </tbody>
        </table></div>
      )}
    </>
  );
}
