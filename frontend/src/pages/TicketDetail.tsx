import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTicket, getComments, addComment, getAttachments, uploadAttachment,
  getTicketHistory, assignTicket, resolveTicket, reopenTicket, closeTicket,
  updateTicket, getUsers, getTeams, downloadAttachment
} from '../api/services';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function Badge({ value }: { value: string }) {
  return <span className={`badge badge-${value}`}>{value.replace(/_/g, ' ')}</span>;
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  const [showResolve, setShowResolve] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignData, setAssignData] = useState({ agent_id: '', team_id: '' });
  const [newStatus, setNewStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const role = user?.role;
  const isStaff = ['agent','manager','admin'].includes(role || '');

  const reload = () => {
    if (!id) return;
    Promise.all([
      getTicket(id).then(setTicket),
      getComments(id).then(setComments),
      getAttachments(id).then(setAttachments),
      getTicketHistory(id).then(setHistory),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    if (isStaff) {
      getUsers({ role: 'agent' }).then((d: any) => setAgents(d.users || []));
      getTeams().then(setTeams);
    }
  }, [id]);

  const submitComment = async () => {
    if (!comment.trim()) return;
    try { await addComment(id!, comment, isInternal); setComment(''); reload(); toast.success('Comment added'); }
    catch { toast.error('Failed to add comment'); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { await uploadAttachment(id!, file); reload(); toast.success('File uploaded'); }
    catch { toast.error('Upload failed'); }
  };

  const handleDownload = async (att: any) => {
    try {
      const blob = await downloadAttachment(id!, att.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = att.original_name; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const handleAssign = async () => {
    try { await assignTicket(id!, assignData); setShowAssign(false); reload(); toast.success('Assigned'); }
    catch { toast.error('Assign failed'); }
  };

  const handleResolve = async () => {
    try { await resolveTicket(id!, resolveNotes); setShowResolve(false); reload(); toast.success('Resolved'); }
    catch { toast.error('Failed'); }
  };

  const handleStatusChange = async () => {
    if (!newStatus) return;
    try { await updateTicket(id!, { status: newStatus }); setNewStatus(''); reload(); toast.success('Status updated'); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <div className="empty">Loading...</div>;
  if (!ticket) return <div className="empty">Ticket not found</div>;

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/tickets')} style={{ marginBottom: 8 }}>← Back</button>
          <h1 className="page-title">{ticket.title}</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
            #{ticket.id.slice(0,8)} · Created {format(new Date(ticket.created_at), 'MMM d, yyyy HH:mm')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isStaff && <button className="btn btn-outline btn-sm" onClick={() => setShowAssign(true)}>Assign</button>}
          {isStaff && ticket.status !== 'resolved' && ticket.status !== 'closed' &&
            <button className="btn btn-success btn-sm" onClick={() => setShowResolve(true)}>Resolve</button>}
          {ticket.status === 'resolved' && (role === 'employee' ? ticket.created_by === user?.id : true) &&
            <button className="btn btn-outline btn-sm" onClick={() => { reopenTicket(id!).then(reload); toast.success('Reopened'); }}>Reopen</button>}
          {ticket.status === 'resolved' && role === 'employee' && ticket.created_by === user?.id &&
            <button className="btn btn-outline btn-sm" onClick={() => { closeTicket(id!).then(reload); toast.success('Closed'); }}>Close</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div>
          {/* Description */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Description</h3>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{ticket.description}</p>
            {ticket.resolution_notes && (
              <div style={{ marginTop: 16, padding: 12, background: '#dcfce7', borderRadius: 'var(--radius)' }}>
                <strong>Resolution:</strong> {ticket.resolution_notes}
              </div>
            )}
          </div>

          {/* Status change for staff */}
          {isStaff && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Change Status</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ flex: 1 }}>
                  <option value="">Select status...</option>
                  {['open','assigned','in_progress','waiting_for_user','resolved','closed','cancelled'].map(s =>
                    <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={handleStatusChange} disabled={!newStatus}>Update</button>
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Comments ({comments.length})</h3>
            {comments.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No comments yet.</p>}
            {comments.map((c: any) => (
              <div key={c.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>{c.author_name}</strong>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {c.is_internal && <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Internal</span>}
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{format(new Date(c.created_at), 'MMM d, HH:mm')}</span>
                  </div>
                </div>
                <p style={{ whiteSpace: 'pre-wrap' }}>{c.content}</p>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." rows={3} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                {isStaff && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} style={{ width: 'auto' }} />
                    Internal note
                  </label>
                )}
                <button className="btn btn-primary btn-sm" onClick={submitComment} disabled={!comment.trim()}>Post Comment</button>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Attachments ({attachments.length})</h3>
            {attachments.map((a: any) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{a.original_name} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({Math.round(a.size / 1024)}KB)</span></span>
                <button className="btn btn-outline btn-sm" onClick={() => handleDownload(a)}>Download</button>
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                📎 Attach File <input type="file" hidden onChange={handleFile} />
              </label>
            </div>
          </div>

          {/* History */}
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Activity History</h3>
            {history.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No history yet.</p>}
            {history.map((h: any) => (
              <div key={h.id} style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{format(new Date(h.created_at), 'MMM d, HH:mm')}</span>
                <span><strong>{h.changed_by_name}</strong> changed <strong>{h.field}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar metadata */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Details</h3>
            {[
              ['Status', <Badge value={ticket.status} />],
              ['Priority', <Badge value={ticket.priority} />],
              ['SLA', ticket.sla_status ? <Badge value={ticket.sla_status} /> : '—'],
              ['Category', ticket.category_name || '—'],
              ['Created by', ticket.creator_name],
              ['Assigned to', ticket.agent_name || '—'],
              ['Team', ticket.team_name || '—'],
              ['Due Date', ticket.due_date ? format(new Date(ticket.due_date), 'MMM d, yyyy HH:mm') : '—'],
              ['Response SLA', ticket.response_deadline ? format(new Date(ticket.response_deadline), 'MMM d HH:mm') : '—'],
              ['Resolution SLA', ticket.resolution_deadline ? format(new Date(ticket.resolution_deadline), 'MMM d HH:mm') : '—'],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{value as any}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssign && (
        <div className="modal-overlay" onClick={() => setShowAssign(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Assign Ticket</h2>
            <div className="form-group">
              <label className="form-label">Agent</label>
              <select value={assignData.agent_id} onChange={e => setAssignData(d => ({ ...d, agent_id: e.target.value }))}>
                <option value="">Unassigned</option>
                {agents.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Team</label>
              <select value={assignData.team_id} onChange={e => setAssignData(d => ({ ...d, team_id: e.target.value }))}>
                <option value="">No team</option>
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleAssign}>Assign</button>
              <button className="btn btn-outline" onClick={() => setShowAssign(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolve && (
        <div className="modal-overlay" onClick={() => setShowResolve(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Resolve Ticket</h2>
            <div className="form-group">
              <label className="form-label">Resolution Notes</label>
              <textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} rows={4} placeholder="Describe how the issue was resolved..." />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-success" onClick={handleResolve}>Mark Resolved</button>
              <button className="btn btn-outline" onClick={() => setShowResolve(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
