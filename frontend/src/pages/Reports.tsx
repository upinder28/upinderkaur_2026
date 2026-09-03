import { useEffect, useState } from 'react';
import { getReports } from '../api/services';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { format, subDays } from 'date-fns';

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getReports({ from, to }).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Reports</h1></div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 160 }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: 160 }} />
          </div>
          <button className="btn btn-primary" onClick={load}>Apply</button>
        </div>
      </div>

      {loading ? <div className="empty">Loading...</div> : !data ? null : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Ticket Volume Over Time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.volume || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={d => format(new Date(d), 'MMM d')} />
                <YAxis /><Tooltip /><Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Tickets by Priority</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.priority || []}>
                <XAxis dataKey="priority" /><YAxis /><Tooltip />
                <Bar dataKey="count" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Average Resolution Time by Priority (hours)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.resolution || []}>
                <XAxis dataKey="priority" /><YAxis /><Tooltip />
                <Bar dataKey="avg_hours" fill="#16a34a" name="Avg Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
