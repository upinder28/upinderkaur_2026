import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
dotenv.config();

import authRoutes from './routes/auth';
import ticketRoutes from './routes/tickets';
import userRoutes from './routes/users';
import teamRoutes from './routes/teams';
import approvalRoutes from './routes/approvals';
import dashboardRoutes from './routes/dashboard';
import categoryRoutes from './routes/categories';
import { notifRouter, auditRouter } from './routes/notifAndAudit';
import { startNotifWorker } from './workers/notifWorker';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth/login', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', notifRouter);
app.use('/api/audit-logs', auditRouter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.get('/api/migrate', async (_, res) => {
  try {
    const { pool } = await import('./db');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) UNIQUE NOT NULL, description TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('employee','agent','manager','admin')), team_id UUID REFERENCES teams(id) ON DELETE SET NULL, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS categories (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) UNIQUE NOT NULL, description TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS tickets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title VARCHAR(500) NOT NULL, description TEXT NOT NULL, category_id UUID REFERENCES categories(id) ON DELETE SET NULL, priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')), status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','waiting_for_user','resolved','closed','reopened','cancelled')), created_by UUID NOT NULL REFERENCES users(id), assigned_team_id UUID REFERENCES teams(id) ON DELETE SET NULL, assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL, response_deadline TIMESTAMPTZ, resolution_deadline TIMESTAMPTZ, due_date TIMESTAMPTZ, resolved_at TIMESTAMPTZ, resolution_notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
      CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
      CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
      CREATE INDEX IF NOT EXISTS idx_tickets_assigned_agent ON tickets(assigned_agent_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_assigned_team ON tickets(assigned_team_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_resolution_deadline ON tickets(resolution_deadline);
      CREATE TABLE IF NOT EXISTS ticket_comments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id), content TEXT NOT NULL, is_internal BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE INDEX IF NOT EXISTS idx_comments_ticket ON ticket_comments(ticket_id);
      CREATE TABLE IF NOT EXISTS ticket_attachments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE, uploaded_by UUID NOT NULL REFERENCES users(id), filename VARCHAR(255) NOT NULL, original_name VARCHAR(255) NOT NULL, mime_type VARCHAR(100), size INTEGER, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS ticket_history (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE, changed_by UUID NOT NULL REFERENCES users(id), field VARCHAR(100) NOT NULL, old_value TEXT, new_value TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE INDEX IF NOT EXISTS idx_history_ticket ON ticket_history(ticket_id);
      CREATE TABLE IF NOT EXISTS service_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title VARCHAR(500) NOT NULL, description TEXT, ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL, created_by UUID NOT NULL REFERENCES users(id), status VARCHAR(50) NOT NULL DEFAULT 'pending_manager' CHECK (status IN ('pending_manager','pending_it','approved','rejected','completed')), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS approvals (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE, approver_id UUID NOT NULL REFERENCES users(id), decision VARCHAR(50) NOT NULL CHECK (decision IN ('approved','rejected')), notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS notifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, type VARCHAR(100) NOT NULL, message TEXT NOT NULL, ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL, is_read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
      CREATE TABLE IF NOT EXISTS audit_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE SET NULL, action VARCHAR(100) NOT NULL, resource VARCHAR(100) NOT NULL, resource_id VARCHAR(255), old_value JSONB, new_value JSONB, metadata JSONB, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    `);
    res.json({ status: 'Migration complete' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/seed', async (_, res) => {
  try {
    const { pool } = await import('./db');
    const bcrypt = await import('bcryptjs');
    const hash = (p: string) => bcrypt.hash(p, 12);
    await pool.query(`INSERT INTO teams (id, name, description) VALUES
      ('11111111-1111-1111-1111-111111111111', 'IT Support', 'General IT support team'),
      ('22222222-2222-2222-2222-222222222222', 'Network Team', 'Network and infrastructure'),
      ('33333333-3333-3333-3333-333333333333', 'Security Team', 'Security operations')
      ON CONFLICT DO NOTHING`);
    await pool.query(`INSERT INTO categories (name, description) VALUES
      ('Hardware', 'Hardware issues and requests'),
      ('Software', 'Software installation and issues'),
      ('Network', 'Network connectivity issues'),
      ('Access', 'Access and permissions requests'),
      ('Security', 'Security incidents')
      ON CONFLICT DO NOTHING`);
    const users = [
      { name: 'Admin User', email: 'admin@itsm.com', password: 'Admin@123', role: 'admin', team: null },
      { name: 'Manager User', email: 'manager@itsm.com', password: 'Manager@123', role: 'manager', team: '11111111-1111-1111-1111-111111111111' },
      { name: 'Agent User', email: 'agent@itsm.com', password: 'Agent@123', role: 'agent', team: '11111111-1111-1111-1111-111111111111' },
      { name: 'Employee User', email: 'employee@itsm.com', password: 'Employee@123', role: 'employee', team: null },
    ];
    for (const u of users) {
      const h = await hash(u.password);
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, team_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING`,
        [u.name, u.email, h, u.role, u.team]
      );
    }
    res.json({ status: 'Seed complete', users: ['admin@itsm.com / Admin@123', 'manager@itsm.com / Manager@123', 'agent@itsm.com / Agent@123', 'employee@itsm.com / Employee@123'] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.get('/ready', async (_, res) => {
  try {
    const { pool } = await import('./db');
    await pool.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  startNotifWorker();
}

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
