import { useEffect, useState } from 'react';
import { getNotifications, markRead, markAllRead } from '../api/services';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Notifications() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => getNotifications().then(setNotifs).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleRead = async (id: string) => {
    await markRead(id); load();
  };

  const handleReadAll = async () => {
    await markAllRead(); load(); toast.success('All marked as read');
  };

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 className="page-title">Notifications {unread > 0 && <span className="badge badge-critical" style={{ fontSize: 12 }}>{unread}</span>}</h1>
        {unread > 0 && <button className="btn btn-outline btn-sm" onClick={handleReadAll}>Mark all read</button>}
      </div>

      {loading ? <div className="empty">Loading...</div> : notifs.length === 0 ? (
        <div className="empty">No notifications</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {notifs.map((n: any) => (
            <div key={n.id} style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
              background: n.is_read ? 'transparent' : '#eff6ff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
            }}>
              <div>
                <div style={{ fontWeight: n.is_read ? 400 : 600 }}>{n.message}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                  {format(new Date(n.created_at), 'MMM d, yyyy HH:mm')}
                </div>
              </div>
              {!n.is_read && (
                <button className="btn btn-outline btn-sm" onClick={() => handleRead(n.id)}>Mark read</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
