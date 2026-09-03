import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTicket, getCategories, getTeams } from '../api/services';
import toast from 'react-hot-toast';

export default function CreateTicket() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', category_id: '', priority: 'medium', assigned_team_id: '' });
  const [categories, setCategories] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { getCategories().then(setCategories); getTeams().then(setTeams); }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return toast.error('Title and description required');
    setLoading(true);
    try {
      const ticket = await createTicket(form);
      toast.success('Ticket created!');
      navigate(`/tickets/${ticket.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create ticket');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header"><h1 className="page-title">Create New Ticket</h1></div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Brief description of the issue" required />
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Detailed description, steps to reproduce, error messages..." rows={5} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                <option value="">Select category</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Assign to Team (optional)</label>
            <select value={form.assigned_team_id} onChange={e => set('assigned_team_id', e.target.value)}>
              <option value="">No team</option>
              {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Ticket'}</button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/tickets')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
