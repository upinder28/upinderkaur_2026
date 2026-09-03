import api from './client';

// Auth
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data);
export const changePassword = (data: object) => api.post('/auth/change-password', data).then(r => r.data);

// Tickets
export const getTickets = (params?: object) => api.get('/tickets', { params }).then(r => r.data);
export const getTicket = (id: string) => api.get(`/tickets/${id}`).then(r => r.data);
export const createTicket = (data: object) => api.post('/tickets', data).then(r => r.data);
export const updateTicket = (id: string, data: object) => api.patch(`/tickets/${id}`, data).then(r => r.data);
export const assignTicket = (id: string, data: object) => api.post(`/tickets/${id}/assign`, data).then(r => r.data);
export const resolveTicket = (id: string, notes: string) => api.post(`/tickets/${id}/resolve`, { resolution_notes: notes }).then(r => r.data);
export const reopenTicket = (id: string) => api.post(`/tickets/${id}/reopen`).then(r => r.data);
export const closeTicket = (id: string) => api.post(`/tickets/${id}/close`).then(r => r.data);

// Comments
export const getComments = (ticketId: string) => api.get(`/tickets/${ticketId}/comments`).then(r => r.data);
export const addComment = (ticketId: string, content: string, is_internal = false) =>
  api.post(`/tickets/${ticketId}/comments`, { content, is_internal }).then(r => r.data);

// Attachments
export const getAttachments = (ticketId: string) => api.get(`/tickets/${ticketId}/attachments`).then(r => r.data);
export const uploadAttachment = (ticketId: string, file: File) => {
  const fd = new FormData(); fd.append('file', file);
  return api.post(`/tickets/${ticketId}/attachments`, fd).then(r => r.data);
};
export const downloadAttachment = (ticketId: string, fileId: string) =>
  api.get(`/tickets/${ticketId}/attachments/${fileId}/download`, { responseType: 'blob' }).then(r => r.data);

// Ticket history
export const getTicketHistory = (ticketId: string) => api.get(`/tickets/${ticketId}/history`).then(r => r.data);

// Users
export const getUsers = (params?: object) => api.get('/users', { params }).then(r => r.data);
export const getUser = (id: string) => api.get(`/users/${id}`).then(r => r.data);
export const createUser = (data: object) => api.post('/users', data).then(r => r.data);
export const updateUser = (id: string, data: object) => api.patch(`/users/${id}`, data).then(r => r.data);

// Teams
export const getTeams = () => api.get('/teams').then(r => r.data);
export const createTeam = (data: object) => api.post('/teams', data).then(r => r.data);
export const updateTeam = (id: string, data: object) => api.patch(`/teams/${id}`, data).then(r => r.data);
export const deleteTeam = (id: string) => api.delete(`/teams/${id}`).then(r => r.data);

// Categories
export const getCategories = () => api.get('/categories').then(r => r.data);
export const createCategory = (data: object) => api.post('/categories', data).then(r => r.data);
export const deleteCategory = (id: string) => api.delete(`/categories/${id}`).then(r => r.data);

// Dashboard & Reports
export const getDashboard = () => api.get('/dashboard').then(r => r.data);
export const getReports = (params?: object) => api.get('/dashboard/reports', { params }).then(r => r.data);

// Approvals
export const getApprovals = () => api.get('/approvals').then(r => r.data);
export const createApproval = (data: object) => api.post('/approvals', data).then(r => r.data);
export const approveRequest = (id: string, notes?: string) => api.post(`/approvals/${id}/approve`, { notes }).then(r => r.data);
export const rejectRequest = (id: string, reason: string) => api.post(`/approvals/${id}/reject`, { reason }).then(r => r.data);
export const getApprovalHistory = (id: string) => api.get(`/approvals/${id}/history`).then(r => r.data);

// Notifications
export const getNotifications = () => api.get('/notifications').then(r => r.data);
export const markRead = (id: string) => api.patch(`/notifications/${id}/read`).then(r => r.data);
export const markAllRead = () => api.patch('/notifications/read-all').then(r => r.data);

// Audit Logs
export const getAuditLogs = (params?: object) => api.get('/audit-logs', { params }).then(r => r.data);
