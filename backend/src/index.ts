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
