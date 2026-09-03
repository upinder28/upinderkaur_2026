import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser } from '../../api/services';
import { getTeams } from '../../api/services';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', team_id: '' });
  const limit = 20;

  const load = () => {
    getUsers({ search, role: roleFilter, page, limit }).then((d: any) => { setUsers(d.users); setTotal(d.total); });
  };

  useEffect(() => { load(); }, [search, roleFilter, page]);
  useEffect(() => { getTeams().then(setTeams); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('All fields required');
    try { await createUser(form); setShowCreate(false); setForm({ name: '', email: '', password: '', role: 'employee', team_id: '' }); load(); toast.success('User created'); }
    catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    try { await updateUser(editUser.id, { role: editUser.role, team_id: editUser.team_id, is_active: editUser.is_active }); setEditUser(null); load(); toast.success('Updated'); }
    catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Users ({total})</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add User</button>
      </div>

      <div className="filters">
        <input placeholder="Search name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ minWidth: 220 }} />
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          {['employee','agent','manager','admin'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Team</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td><span className="badge badge-open" style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                  <td>{teams.find(t => t.id === u.team_id)?.name || '—'}</td>
                  <td><span className={`badge ${u.is_active ? 'badge-resolved' : 'badge-cancelled'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => setEditUser({ ...u })}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pagination">
        <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span style={{ fontSize: 13 }}>Page {page} of {Math.ceil(total / limit) || 1}</span>
        <button className="btn btn-outline btn-sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Create User</h2>
            {[['Name', 'name', 'text'], ['Email', 'email', 'email'], ['Password', 'password', 'password']].map(([label, key, type]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {['employee','agent','manager','admin'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Team</label>
              <select value={form.team_id} onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))}>
                <option value="">No team</option>
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Edit User: {editUser.name}</h2>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select value={editUser.role} onChange={e => setEditUser((u: any) => ({ ...u, role: e.target.value }))}>
                {['employee','agent','manager','admin'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Team</label>
              <select value={editUser.team_id || ''} onChange={e => setEditUser((u: any) => ({ ...u, team_id: e.target.value }))}>
                <option value="">No team</option>
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={editUser.is_active} onChange={e => setEditUser((u: any) => ({ ...u, is_active: e.target.checked }))} style={{ width: 'auto' }} />
                Active
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleUpdate}>Save</button>
              <button className="btn btn-outline" onClick={() => setEditUser(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
