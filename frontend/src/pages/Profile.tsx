import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../api/services';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return toast.error('Passwords do not match');
    if (form.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <div className="page-header"><h1 className="page-title">Profile</h1></div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Account Info</h3>
        {[['Name', user?.name], ['Email', user?.email], ['Role', user?.role]].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
            <span style={{ color: 'var(--text-muted)' }}>{k}</span>
            <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{v}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Change Password</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input type="password" value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Change Password'}</button>
        </form>
      </div>
    </div>
  );
}
