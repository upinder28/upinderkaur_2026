import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Ticket, PlusCircle, CheckSquare, Bell,
  Users, UsersRound, Settings, FileText, LogOut, ShieldCheck, BarChart2
} from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">🛠 ITSM Platform</div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard"><LayoutDashboard size={16} /> Dashboard</NavLink>
          <NavLink to="/tickets"><Ticket size={16} /> Tickets</NavLink>
          <NavLink to="/tickets/create"><PlusCircle size={16} /> New Ticket</NavLink>
          {(role === 'manager' || role === 'admin') && (
            <NavLink to="/approvals"><CheckSquare size={16} /> Approvals</NavLink>
          )}
          {role === 'employee' && (
            <NavLink to="/approvals"><CheckSquare size={16} /> My Requests</NavLink>
          )}
          <NavLink to="/notifications"><Bell size={16} /> Notifications</NavLink>
          {(role === 'manager' || role === 'admin') && (
            <NavLink to="/reports"><BarChart2 size={16} /> Reports</NavLink>
          )}
          {role === 'admin' && (
            <>
              <div className="nav-section">Admin</div>
              <NavLink to="/admin/users"><Users size={16} /> Users</NavLink>
              <NavLink to="/admin/teams"><UsersRound size={16} /> Teams</NavLink>
              <NavLink to="/admin/settings"><Settings size={16} /> Settings</NavLink>
              <NavLink to="/admin/audit-logs"><ShieldCheck size={16} /> Audit Logs</NavLink>
            </>
          )}
          <NavLink to="/profile"><FileText size={16} /> Profile</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
            <strong style={{ color: '#fff' }}>{user?.name}</strong><br />
            <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
          </div>
          <button className="btn btn-outline btn-sm" style={{ color: '#94a3b8', borderColor: '#334155', width: '100%' }} onClick={handleLogout}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>
      <div className="main">
        <div className="page">{children}</div>
      </div>
    </div>
  );
}
