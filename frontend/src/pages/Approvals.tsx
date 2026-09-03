import { useEffect, useState } from 'react';
import { getApprovals, approveRequest, rejectRequest, createApproval } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending_manager: 'badge-open', pending_it: 'badge-assigned',
    approved: 'badge-resolved', rejected: 'badge-cancelled', completed: 'badge-closed'
  };
  return <span className={`badge ${colors[status] || ''}`}>{status.replace('_', ' ')}</span>;
}

export default function Approvals() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [rejectId, setRejectId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const isApprover = ['manager','admin'].includes(user?.role || '');

  const load = () => getApprovals().then(setRequests).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    try { await approveRequest(id); load(); toast.success('Approved'); }
    catch { toast.error('Failed'); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return toast.error('Reason required');
    try { await rejectRequest(rejectId, rejectReason); setRejectId(''); setRejectReason(''); load(); toast.success('Rejected'); }
    catch { toast.error('Failed'); }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error('Title required');
    try { await createApproval(form); setShowCreate(false); setForm({ title: '', description: '' }); load(); toast.success('Request submitted'); }
    catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isApprover ? 'Approval Requests' : 'My Service Requests'}</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Request</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <div className="empty">Loading...</div> : requests.length === 0 ? <div className="empty">No requests</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Requester</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {requests.map((r: any) => (
                  <tr key={r.id}>
                    <td><strong>{r.title}</strong>{r.description && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.description}</div>}</td>
                    <td>{r.requester_name}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{format(new Date(r.created_at), 'MMM d, yyyy')}</td>
                    <td>
                      {isApprover && (r.status === 'pending_manager' || r.status === 'pending_it') && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-success btn-sm" onClick={() => handleApprove(r.id)}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setRejectId(r.id)}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">New Service Request</h2>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Access to production database" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Why do you need this?" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleCreate}>Submit Request</button>
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {rejectId && (
        <div className="modal-overlay" onClick={() => setRejectId('')}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Reject Request</h2>
            <div className="form-group">
              <label className="form-label">Reason *</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Explain why this request is rejected..." />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-danger" onClick={handleReject}>Reject</button>
              <button className="btn btn-outline" onClick={() => setRejectId('')}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
