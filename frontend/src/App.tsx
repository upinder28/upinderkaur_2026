import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import CreateTicket from './pages/CreateTicket';
import TicketDetail from './pages/TicketDetail';
import Approvals from './pages/Approvals';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import AdminUsers from './pages/admin/Users';
import AdminTeams from './pages/admin/Teams';
import AdminSettings from './pages/admin/Settings';
import AuditLogs from './pages/admin/AuditLogs';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><Layout><Tickets /></Layout></ProtectedRoute>} />
          <Route path="/tickets/create" element={<ProtectedRoute><Layout><CreateTicket /></Layout></ProtectedRoute>} />
          <Route path="/tickets/:id" element={<ProtectedRoute><Layout><TicketDetail /></Layout></ProtectedRoute>} />
          <Route path="/approvals" element={<ProtectedRoute><Layout><Approvals /></Layout></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={['manager','admin']}><Layout><Reports /></Layout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><Layout><AdminUsers /></Layout></ProtectedRoute>} />
          <Route path="/admin/teams" element={<ProtectedRoute roles={['admin']}><Layout><AdminTeams /></Layout></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><Layout><AdminSettings /></Layout></ProtectedRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedRoute roles={['admin']}><Layout><AuditLogs /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
