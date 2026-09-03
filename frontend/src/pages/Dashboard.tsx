import { useEffect, useState } from 'react';
import { getDashboard } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Link } from 'react-router-dom';

const COLORS = ['#2563eb','#dc2626','#d97706','#16a34a'];

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getDashboard().then(setData).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="empty">Loading dashboard...</div>;
  if (!data) return <div className="empty">No data</div>;

  const role = user?.role;

  if (role === 'employee') return (
    <div>
      <div className="page-header"><h1 className="page-title">My Dashboard</h1>
        <Link to="/tickets/create" className="btn btn-primary">+ New Ticket</Link>
      </div>
      <div className="grid-stats">
        <div className="stat-card"><div className="stat-value">{data.total || 0}</div><div className="stat-label">Total Tickets</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--primary)' }}>{data.open_count || 0}</div><div className="stat-label">Open</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--success)' }}>{data.resolved_count || 0}</div><div className="stat-label">Resolved</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--warning)' }}>{data.waiting_count || 0}</div><div className="stat-label">Waiting</div></div>
      </div>
      <div className="card"><p style={{ color: 'var(--text-muted)' }}>View your tickets in the <Link to="/tickets">Tickets</Link> section.</p></div>
    </div>
  );

  if (role === 'agent') return (
    <div>
      <div className="page-header"><h1 className="page-title">Agent Dashboard</h1></div>
      <div className="grid-stats">
        <div className="stat-card"><div className="stat-value">{data.my_tickets || 0}</div><div className="stat-label">My Tickets</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--warning)' }}>{data.unassigned || 0}</div><div className="stat-label">Unassigned</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--danger)' }}>{data.high_priority || 0}</div><div className="stat-label">High Priority</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--danger)' }}>{data.sla_breached || 0}</div><div className="stat-label">SLA Breached</div></div>
      </div>
    </div>
  );

  if (role === 'manager') {
    const s = data.summary || {};
    return (
      <div>
        <div className="page-header"><h1 className="page-title">Manager Dashboard</h1>
          <Link to="/reports" className="btn btn-outline">View Reports</Link>
        </div>
        <div className="grid-stats">
          <div className="stat-card"><div className="stat-value">{s.total || 0}</div><div className="stat-label">Total Tickets</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--primary)' }}>{s.open_count || 0}</div><div className="stat-label">Open</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--success)' }}>{s.resolved_count || 0}</div><div className="stat-label">Resolved</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--danger)' }}>{s.sla_breached || 0}</div><div className="stat-label">SLA Breached</div></div>
          <div className="stat-card"><div className="stat-value">{s.avg_resolution_hours ? Number(s.avg_resolution_hours).toFixed(1) + 'h' : 'N/A'}</div><div className="stat-label">Avg Resolution</div></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <h3 style={{ marginBottom: 16, fontWeight: 600 }}>By Priority</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={data.byPriority || []} dataKey="count" nameKey="priority" cx="50%" cy="50%" outerRadius={70} label>
                {(data.byPriority || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Legend /><Tooltip /></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 16, fontWeight: 600 }}>By Team</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byTeam || []}><XAxis dataKey="name" /><YAxis /><Tooltip />
                <Bar dataKey="count" fill="#2563eb" /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // Admin
  const s = data.summary || {}, u = data.users || {}, sla = data.sla || {};
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Admin Dashboard</h1></div>
      <div className="grid-stats">
        <div className="stat-card"><div className="stat-value">{s.total_tickets || 0}</div><div className="stat-label">Total Tickets</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--primary)' }}>{s.open_tickets || 0}</div><div className="stat-label">Open Tickets</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--danger)' }}>{s.sla_breached || 0}</div><div className="stat-label">SLA Breached</div></div>
        <div className="stat-card"><div className="stat-value">{u.total_users || 0}</div><div className="stat-label">Total Users</div></div>
        <div className="stat-card"><div className="stat-value">{u.agents || 0}</div><div className="stat-label">Active Agents</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--success)' }}>{sla.compliant || 0}</div><div className="stat-label">SLA Compliant</div></div>
      </div>
    </div>
  );
}
