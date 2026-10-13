import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, fileUrl } from '../api';
import { useAuth } from '../auth';
import { FieldError } from '../components';
import { CATEGORIES, DEPARTMENTS } from '../constants';

export default function VoucherForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, refresh } = useAuth();
  const [vid, setVid] = useState(id); // set after first save so retries update instead of duplicating
  const [f, setF] = useState({ department: user.department || '', expense_date: '', title: '', category: '', amount: '', description: '' });
  const [file, setFile] = useState(null);
  const [saved, setSaved] = useState(user.signature_path);
  const [errs, setErrs] = useState({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api('/vouchers/' + id).then(({ voucher: v }) => {
      if (v.status !== 'DRAFT') return nav('/vouchers/' + id, { replace: true });
      setF({ department: v.department, expense_date: v.expense_date, title: v.title, category: v.category || '', amount: v.amount, description: v.description || '' });
      setSaved(v.employee_signature || user.signature_path);
    }).catch((e) => setMsg(e.message));
  }, [id]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function check(submit) {
    const e = {};
    if (!f.department) e.department = 'Department is required';
    if (!f.title.trim()) e.title = 'Expense title is required';
    if (!f.expense_date) e.expense_date = 'Expense date is required';
    if (f.amount === '') e.amount = 'Amount is required';
    else if (!(Number(f.amount) > 0)) e.amount = 'Amount must be greater than zero';
    if (submit && !file && !saved) e.signature = 'Employee signature is required before submission';
    setErrs(e);
    return !Object.keys(e).length;
  }

  async function save(submit) {
    setMsg('');
    if (!check(submit)) return;
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('signature', file);
      const { voucher: v } = await api(vid ? '/vouchers/' + vid : '/vouchers', { method: vid ? 'PUT' : 'POST', form: fd });
      setVid(v.id);
      if (file) { await refresh(); setFile(null); setSaved(v.employee_signature); }
      if (submit) await api(`/vouchers/${v.id}/submit`, { method: 'POST' });
      nav('/vouchers/' + v.id);
    } catch (e) {
      setErrs(e.errors || {});
      setMsg(e.message);
    } finally { setBusy(false); }
  }

  return (
    <>
      <h1>{id ? 'Edit draft voucher' : 'Create voucher'}</h1>
      <div className="card form">
        <label>Department *<select value={f.department} onChange={set('department')}><option value="">Select department</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select><FieldError msg={errs.department} /></label>
        <label>Expense date *<input type="date" value={f.expense_date} onChange={set('expense_date')} /><FieldError msg={errs.expense_date} /></label>
        <label className="wide">Expense title *<input value={f.title} onChange={set('title')} maxLength={200} /><FieldError msg={errs.title} /></label>
        <label>Expense category<select value={f.category} onChange={set('category')}><option value="">Select category</option>{CATEGORIES.map((d) => <option key={d}>{d}</option>)}</select></label>
        <label>Amount (₹) *<input type="number" min="0" step="0.01" value={f.amount} onChange={set('amount')} /><FieldError msg={errs.amount} /></label>
        <label className="wide">Description<textarea rows="4" value={f.description} onChange={set('description')} /></label>
        <label className="wide">Your signature (image, max 2 MB){!saved && ' *'}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setFile(e.target.files[0] || null)} />
          <FieldError msg={errs.signature} />
          {file ? <img className="sig" src={URL.createObjectURL(file)} alt="New signature preview" />
            : saved ? <span className="muted small">Saved signature will be used:<br /><img className="sig" src={fileUrl(saved)} alt="Saved signature" /></span> : null}
        </label>
        {msg && <p className="error wide">{msg}</p>}
        <div className="row wide">
          <button disabled={busy} onClick={() => save(false)}>Save draft</button>
          <button disabled={busy} className="primary" onClick={() => save(true)}>Save and submit for approval</button>
          <button type="button" className="ghost" onClick={() => nav(-1)}>Cancel</button>
        </div>
      </div>
    </>
  );
}
