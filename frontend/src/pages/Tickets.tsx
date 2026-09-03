import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTickets, getCategories, getTeams, getUsers } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

function Badge({ value, type }: { value: string; type: string }) {
  return <span className={`badge badge-${value}`}>{value.replace('_', ' ')}</span>;
}

export default function Tickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [filters, setFilters] = useState({ status: '', priority: '', category_id: '', team_id: '', agent_id: '', search: '', sla_status: '' });
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const limit = 20;

  const load = () => {
    setLoading(true);
    const params = { ...filters, page, limit, sort, order };
    getTickets(params).then((d: any) => { setTickets(d.tickets); setTotal(d.total); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters, page, sort, order]);
  useEffect(() => {
    getCategories().then(setCategories);
    getTeams().then(setTeams);
    if (user?.role !== 'employee') getUsers({ role: 'agent' }).then((d: any) => setAgents(d.users || []));
  }, []);

  const setFilter = (k: string, v: string) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tickets</h1>
        <Link to="/tickets/create" className="btn btn-primary">+ New Ticket</Link>
      </div>

      <div className="filters">
        <input placeholder="Search tickets..." value={filters.search} onChange={e => setFilter('search', e.target.value)} style={{ minWidth: 200 }} />
        <select value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All Status</option>
          {['open','assigned','in_progress','waiting_for_user','resolved','closed','reopened','cancelled'].map(s =>
            <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
          <option value="">All Priority</option>
          {['critical','high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filters.category_id} onChange={e => setFilter('category_id', e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {user?.role !== 'employee' && (
          <>
            <select value={filters.team_id} onChange={e => setFilter('team_id', e.target.value)}>
              <option value="">All Teams</option>
              {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={filters.agent_id} onChange={e => setFilter('agent_id', e.target.value)}>
              <option value="">All Agents</option>
              {agents.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </>
        )}
        <select value={filters.sla_status} onChange={e => setFilter('sla_status', e.target.value)}>
          <option value="">All SLA</option>
          {['on_track','at_risk','breached'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select value={`${sort}:${order}`} onChange={e => { const [s,o] = e.target.value.split(':'); setSort(s); setOrder(o); }}>
          <option value="created_at:desc">Newest First</option>
          <option value="created_at:asc">Oldest First</option>
          <option value="priority:desc">Priority High-Low</option>
          <option value="due_date:asc">Due Date</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          {loading ? <div className="empty">Loading...</div> : tickets.length === 0 ? <div className="empty">No tickets found</div> : (
            <table>
              <thead><tr>
                <th>ID</th><th>Title</th><th>Status</th><th>Priority</th>
                <th>Category</th><th>Agent</th><th>SLA</th><th>Created</th>
              </tr></thead>
              <tbody>
                {tickets.map((t: any) => (
                  <tr key={t.id}>
                    <td><Link to={`/tickets/${t.id}`} style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.id.slice(0,8)}</Link></td>
                    <td><Link to={`/tickets/${t.id}`} style={{ fontWeight: 500 }}>{t.title}</Link></td>
                    <td><Badge value={t.status} type="status" /></td>
                    <td><Badge value={t.priority} type="priority" /></td>
                    <td>{t.category_name || '—'}</td>
                    <td>{t.agent_name || '—'}</td>
                    <td>{t.sla_status ? <Badge value={t.sla_status} type="sla" /> : '—'}</td>
                    <td>{format(new Date(t.created_at), 'MMM d, yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="pagination">
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{total} total</span>
        <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span style={{ fontSize: 13 }}>Page {page} of {Math.ceil(total / limit) || 1}</span>
        <button className="btn btn-outline btn-sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>
    </div>
  );
}
