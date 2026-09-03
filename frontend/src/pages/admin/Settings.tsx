import { useEffect, useState } from 'react';
import { getCategories, createCategory, deleteCategory } from '../../api/services';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', description: '' });

  const load = () => getCategories().then(setCategories);
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name required');
    try { await createCategory(form); setForm({ name: '', description: '' }); load(); toast.success('Category created'); }
    catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try { await deleteCategory(id); load(); toast.success('Deleted'); }
    catch { toast.error('Failed'); }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header"><h1 className="page-title">Settings</h1></div>

      <div className="card">
        <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Ticket Categories</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Category name" style={{ flex: 1 }} />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" style={{ flex: 2 }} />
          <button type="submit" className="btn btn-primary">Add</button>
        </form>
        {categories.map((c: any) => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <strong>{c.name}</strong>
              {c.description && <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 8 }}>{c.description}</span>}
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 12 }}>SLA Rules</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Priority</th><th>Response SLA</th><th>Resolution SLA</th></tr></thead>
            <tbody>
              {[['Critical','15 min','4 hours'],['High','30 min','8 hours'],['Medium','2 hours','24 hours'],['Low','8 hours','72 hours']].map(([p,r,res]) => (
                <tr key={p}><td><span className={`badge badge-${p.toLowerCase()}`}>{p}</span></td><td>{r}</td><td>{res}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
