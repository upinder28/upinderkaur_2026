import { useEffect, useState } from 'react';
import { getAuditLogs } from '../../api/services';
import { format } from 'date-fns';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ action: '', resource: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 50;

  const load = () => {
    setLoading(true);
    getAuditLogs({ ...filters, page, limit }).then((d: any) => { setLogs(d.logs); setTotal(d.total); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters, page]);

  const setFilter = (k: string, v: string) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Audit Logs ({total})</h1></div>

      <div className="filters">
        <select value={filters.action} onChange={e => setFilter('action', e.target.value)}>
          <option value="">All Actions</option>
          {['LOGIN','CREATE','UPDATE','ASSIGN','RESOLVE','REOPEN','CLOSE','APPROVE','REJECT','CREATE_USER','UPDATE_USER','CREATE_REQUEST'].map(a =>
            <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filters.resource} onChange={e => setFilter('resource', e.target.value)}>
          <option value="">All Resources</option>
          {['user','ticket','service_request','team','category'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={e => setFilter('from', e.target.value)} />
        <input type="date" value={filters.to} onChange={e => setFilter('to', e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <div className="empty">Loading...</div> : logs.length === 0 ? <div className="empty">No logs</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Resource</th><th>Resource ID</th></tr></thead>
              <tbody>
                {logs.map((l: any) => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{format(new Date(l.created_at), 'MMM d, HH:mm:ss')}</td>
                    <td>{l.user_name || '—'}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.user_email}</div></td>
                    <td><span className="badge badge-open">{l.action}</span></td>
                    <td>{l.resource}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{l.resource_id?.slice(0, 8) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pagination">
        <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span style={{ fontSize: 13 }}>Page {page} of {Math.ceil(total / limit) || 1}</span>
        <button className="btn btn-outline btn-sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>
    </div>
  );
}
