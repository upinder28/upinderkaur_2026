import { useEffect, useState } from 'react';
import { getTeams, createTeam, updateTeam, deleteTeam } from '../../api/services';
import toast from 'react-hot-toast';

export default function AdminTeams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editTeam, setEditTeam] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const load = () => getTeams().then(setTeams);
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    try { await createTeam(form); setShowCreate(false); setForm({ name: '', description: '' }); load(); toast.success('Team created'); }
    catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleUpdate = async () => {
    if (!editTeam) return;
    try { await updateTeam(editTeam.id, { name: editTeam.name, description: editTeam.description }); setEditTeam(null); load(); toast.success('Updated'); }
    catch { toast.error('Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this team?')) return;
    try { await deleteTeam(id); load(); toast.success('Deleted'); }
    catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Teams</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Team</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {teams.map((t: any) => (
          <div key={t.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontWeight: 600 }}>{t.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{t.description || 'No description'}</p>
                <p style={{ marginTop: 8, fontSize: 13 }}><strong>{t.member_count}</strong> members</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditTeam({ ...t })}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Create Team</h2>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Network Team" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editTeam && (
        <div className="modal-overlay" onClick={() => setEditTeam(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Edit Team</h2>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input value={editTeam.name} onChange={e => setEditTeam((t: any) => ({ ...t, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea value={editTeam.description || ''} onChange={e => setEditTeam((t: any) => ({ ...t, description: e.target.value }))} rows={2} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleUpdate}>Save</button>
              <button className="btn btn-outline" onClick={() => setEditTeam(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
