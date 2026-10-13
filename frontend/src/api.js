const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const fileUrl = (p) => (p ? BASE + p : null);

export async function api(path, { method = 'GET', body, form } = {}) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  let data;
  if (form) data = form;
  else if (body) { headers['Content-Type'] = 'application/json'; data = JSON.stringify(body); }
  const res = await fetch(BASE + '/api' + path, { method, headers, body: data });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) { localStorage.removeItem('token'); window.location.href = '/login'; }
    throw Object.assign(new Error(json.message || 'Request failed'), { errors: json.errors });
  }
  return json;
}
