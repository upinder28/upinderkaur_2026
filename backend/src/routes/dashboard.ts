import { Router } from 'express';
import { pool } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { id, role } = req.user!;

    if (role === 'employee') {
      const { rows } = await pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status NOT IN ('closed','resolved')) as open_count,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
          COUNT(*) FILTER (WHERE status = 'waiting_for_user') as waiting_count
         FROM tickets WHERE created_by = $1`,
        [id]
      );
      return res.json(rows[0]);
    }

    if (role === 'agent') {
      const { rows } = await pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE assigned_agent_id = $1) as my_tickets,
          COUNT(*) FILTER (WHERE assigned_agent_id IS NULL AND status = 'open') as unassigned,
          COUNT(*) FILTER (WHERE priority IN ('critical','high')) as high_priority,
          COUNT(*) FILTER (WHERE resolution_deadline < NOW() AND status NOT IN ('resolved','closed')) as sla_breached
         FROM tickets`,
        [id]
      );
      return res.json(rows[0]);
    }

    if (role === 'manager') {
      const [summary, byPriority, byTeam] = await Promise.all([
        pool.query(`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status NOT IN ('closed','resolved')) as open_count,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
          COUNT(*) FILTER (WHERE resolution_deadline < NOW() AND status NOT IN ('resolved','closed')) as sla_breached,
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_hours
         FROM tickets`),
        pool.query(`SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority`),
        pool.query(`SELECT tm.name, COUNT(t.id) as count FROM teams tm LEFT JOIN tickets t ON t.assigned_team_id = tm.id GROUP BY tm.id, tm.name`),
      ]);
      return res.json({ summary: summary.rows[0], byPriority: byPriority.rows, byTeam: byTeam.rows });
    }

    // admin
    const [summary, users, sla] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE status NOT IN ('closed','resolved')) as open_tickets,
        COUNT(*) FILTER (WHERE resolution_deadline < NOW() AND status NOT IN ('resolved','closed')) as sla_breached
        FROM tickets`),
      pool.query(`SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'agent') as agents,
        COUNT(*) FILTER (WHERE is_active = true) as active_users
        FROM users`),
      pool.query(`SELECT
        COUNT(*) FILTER (WHERE resolution_deadline >= NOW() OR status IN ('resolved','closed')) as compliant,
        COUNT(*) FILTER (WHERE resolution_deadline < NOW() AND status NOT IN ('resolved','closed')) as breached
        FROM tickets`),
    ]);
    res.json({ summary: summary.rows[0], users: users.rows[0], sla: sla.rows[0] });

  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reports', authenticate, async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const params: unknown[] = [];
    let dateFilter = '';
    if (from && to) {
      params.push(from, to);
      dateFilter = `AND created_at BETWEEN $1 AND $2`;
    }

    const [volume, priority, resolution] = await Promise.all([
      pool.query(`SELECT DATE(created_at) as date, COUNT(*) as count FROM tickets WHERE 1=1 ${dateFilter} GROUP BY DATE(created_at) ORDER BY date`, params),
      pool.query(`SELECT priority, COUNT(*) as count FROM tickets WHERE 1=1 ${dateFilter} GROUP BY priority`, params),
      pool.query(`SELECT priority, AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_hours FROM tickets WHERE resolved_at IS NOT NULL ${dateFilter} GROUP BY priority`, params),
    ]);

    res.json({ volume: volume.rows, priority: priority.rows, resolution: resolution.rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
