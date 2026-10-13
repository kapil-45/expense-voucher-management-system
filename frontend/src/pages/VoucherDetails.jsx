import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fileUrl } from '../api';
import { useAuth } from '../auth';
import { Badge, FieldError } from '../components';
import { money } from '../constants';

const Item = ({ label, children }) => <div className="item"><span>{label}</span><div>{children || '-'}</div></div>;

export default function VoucherDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, refresh } = useAuth();
  const [v, setV] = useState(null);
  const [err, setErr] = useState('');
  const [errs, setErrs] = useState({});
  const [reason, setReason] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api('/vouchers/' + id).then((r) => setV(r.voucher)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  async function act(fn) {
    setErr(''); setErrs({}); setBusy(true);
    try { await fn(); } catch (e) { setErr(e.message); setErrs(e.errors || {}); } finally { setBusy(false); }
  }
  const submit = () => act(async () => { await api(`/vouchers/${id}/submit`, { method: 'POST' }); await load(); });
  const remove = () => { if (window.confirm('Delete this draft voucher?')) act(async () => { await api('/vouchers/' + id, { method: 'DELETE' }); nav('/vouchers'); }); };
  const approve = () => act(async () => {
    if (!file && !user.signature_path) throw Object.assign(new Error('Validation failed'), { errors: { signature: 'Director signature is required for approval' } });
    const fd = new FormData();
    if (file) fd.append('signature', file);
    await api(`/vouchers/${id}/approve`, { method: 'POST', form: fd });
    await refresh(); setFile(null); await load();
  });
  const reject = () => act(async () => {
    if (!reason.trim()) throw Object.assign(new Error('Validation failed'), { errors: { reason: 'Rejection reason is required' } });
    await api(`/vouchers/${id}/reject`, { method: 'POST', body: { reason } });
    await load();
  });

  if (!v) return err ? <p className="error">{err}</p> : <p>Loading…</p>;
  const sig = (p, label) => (p ? <img className="sig" src={fileUrl(p)} alt={label} /> : null);

  return (
    <>
      <div className="row between no-print">
        <Link to="/vouchers">&larr; Back to vouchers</Link>
        <button className="ghost" onClick={() => window.print()}>Print voucher</button>
      </div>
      <div className="card voucher">
        <div className="row between">
          <h1>{v.voucher_number}</h1><Badge status={v.status} />
        </div>
        {v.status === 'REJECTED' && <div className="notice reject"><b>Rejected:</b> {v.rejection_reason}</div>}

        <h2>Expense</h2>
        <div className="grid">
          <Item label="Voucher date">{v.voucher_date}</Item><Item label="Expense date">{v.expense_date}</Item>
          <Item label="Department">{v.department}</Item><Item label="Category">{v.category}</Item>
          <Item label="Title">{v.title}</Item><Item label="Amount"><b>{money(v.amount)}</b></Item>
          <div className="item wide"><span>Description</span><div>{v.description || '-'}</div></div>
        </div>

        <h2>Employee</h2>
        <div className="grid">
          <Item label="Name">{v.employee_name}</Item><Item label="Employee ID">{v.employee_code}</Item>
          <Item label="Signature">{sig(v.employee_signature, 'Employee signature')}</Item>
        </div>

        <h2>Approval</h2>
        <div className="grid">
          <Item label="Status"><Badge status={v.status} /></Item><Item label="Reviewed by">{v.director_name}</Item>
          <Item label="Approval date">{v.approval_date}</Item><Item label="Director signature">{sig(v.director_signature, 'Director signature')}</Item>
          {v.status === 'REJECTED' && <Item label="Rejection reason">{v.rejection_reason}</Item>}
        </div>

        <h2>Audit</h2>
        <div className="grid"><Item label="Created">{v.created_at}</Item><Item label="Last updated">{v.updated_at}</Item></div>
      </div>

      {err && <p className="error">{err}</p>}

      {user.role === 'EMPLOYEE' && v.status === 'DRAFT' && (
        <div className="row no-print">
          <Link className="btn" to={`/vouchers/${v.id}/edit`}>Edit draft</Link>
          <button className="primary" disabled={busy} onClick={submit}>Submit for approval</button>
          <button className="danger" disabled={busy} onClick={remove}>Delete draft</button>
          <FieldError msg={errs.signature} />
        </div>
      )}

      {user.role === 'DIRECTOR' && v.status === 'PENDING' && (
        <div className="card decision no-print">
          <h2>Review this voucher</h2>
          <div className="form">
            <div>
              <label>Your signature (image){!user.signature_path && ' *'}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setFile(e.target.files[0] || null)} />
              </label>
              <FieldError msg={errs.signature} />
              {!file && user.signature_path && <span className="muted small">Saved signature will be used:<br /><img className="sig" src={fileUrl(user.signature_path)} alt="Saved signature" /></span>}
              <div className="row"><button className="primary" disabled={busy} onClick={approve}>Approve voucher</button></div>
            </div>
            <div>
              <label>Rejection reason<textarea rows="3" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
              <FieldError msg={errs.reason} />
              <div className="row"><button className="danger" disabled={busy} onClick={reject}>Reject voucher</button></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
