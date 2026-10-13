import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Badge } from '../components';
import { money } from '../constants';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/dashboard').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="error">{err}</p>;
  if (!d) return <p>Loading…</p>;
  const s = d.stats;
  const cards = {
    EMPLOYEE: [['Total vouchers', s.total], ['Drafts', s.draft], ['Pending approval', s.pending], ['Approved', s.approved], ['Rejected', s.rejected], ['Total amount claimed', money(s.totalAmount)]],
    DIRECTOR: [['Pending approval', s.pending], ['Approved today', s.approvedToday], ['Rejected today', s.rejectedToday], ['Total pending amount', money(s.pendingAmount)]],
    ACCOUNTS: [['Total vouchers', s.total], ['Pending approval', s.pending], ['Approved', s.approved], ['Rejected', s.rejected], ['Total approved amount', money(s.totalApprovedAmount)]],
  }[d.role];
  const title = d.role === 'ACCOUNTS' ? 'Recent approved vouchers' : 'Recent activity';

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">
        {cards.map(([label, value]) => (
          <div className="stat" key={label}><span>{label}</span><b>{value}</b></div>
        ))}
      </div>
      <h2>{title}</h2>
      {d.recent.length === 0 ? <p className="muted">No vouchers to show yet.</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Voucher</th><th>Title</th>{d.role !== 'EMPLOYEE' && <th>Employee</th>}<th className="num">Amount</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>{d.recent.map((v) => (
            <tr key={v.id}>
              <td><Link to={`/vouchers/${v.id}`}>{v.voucher_number}</Link></td><td>{v.title}</td>
              {d.role !== 'EMPLOYEE' && <td>{v.employee_name}</td>}
              <td className="num">{money(v.amount)}</td><td><Badge status={v.status} /></td><td>{v.updated_at}</td>
            </tr>))}
          </tbody>
        </table></div>
      )}
    </>
  );
}
