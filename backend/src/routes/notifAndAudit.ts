import { Router } from 'express';
import { pool } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const notifRouter = Router();

notifRouter.get('/', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, [req.user!.id]
  );
  res.json(rows);
});

notifRouter.patch('/read-all', authenticate, async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user!.id]);
  res.json({ message: 'All marked read' });
});

notifRouter.patch('/:id/read', authenticate, async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user!.id]);
  res.json({ message: 'Marked read' });
});

export { notifRouter };

// Audit logs
const auditRouter = Router();

auditRouter.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { action, resource, user_id, from, to, page = '1', limit = '50' } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (action) { conditions.push(`al.action=$${p++}`); params.push(action); }
    if (resource) { conditions.push(`al.resource=$${p++}`); params.push(resource); }
    if (user_id) { conditions.push(`al.user_id=$${p++}`); params.push(user_id); }
    if (from) { conditions.push(`al.created_at>=$${p++}`); params.push(from); }
    if (to) { conditions.push(`al.created_at<=$${p++}`); params.push(to); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);
    const countRes = await pool.query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params);
    const { rows } = await pool.query(
      `SELECT al.*, u.name as user_name, u.email as user_email FROM audit_logs al
       LEFT JOIN users u ON al.user_id=u.id ${where}
       ORDER BY al.created_at DESC LIMIT $${p++} OFFSET $${p++}`,
      [...params, Number(limit), offset]
    );
    res.json({ logs: rows, total: Number(countRes.rows[0].count), page: Number(page), limit: Number(limit) });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

export { auditRouter };
