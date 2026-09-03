import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { pool } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { calcSLADeadlines, getSLAStatus } from '../utils/sla';
import { audit } from '../utils/audit';
import { notify } from '../workers/notifWorker';

const router = Router();

const storage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || './uploads',
  filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});

const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.log', '.zip', '.docx', '.xlsx'];

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 10485760 },
  fileFilter: (req, file, cb) => cb(null, allowedTypes.includes(path.extname(file.originalname).toLowerCase())),
});


// GET /tickets
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, priority, category_id, team_id, agent_id, creator_id, search, sla_status,
      page = '1', limit = '20', sort = 'created_at', order = 'desc' } = req.query as Record<string, string>;

    const user = req.user!;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (user.role === 'employee') { conditions.push(`t.created_by = $${p++}`); params.push(user.id); }
    if (user.role === 'agent') {
      const p1 = p++; const p2 = p++;
      conditions.push(`(t.assigned_agent_id = $${p1} OR t.assigned_team_id = (SELECT team_id FROM users WHERE id = $${p2}))`);
      params.push(user.id, user.id);
    }

    if (status)      { conditions.push(`t.status = $${p++}`);           params.push(status); }
    if (priority)    { conditions.push(`t.priority = $${p++}`);          params.push(priority); }
    if (category_id) { conditions.push(`t.category_id = $${p++}`);       params.push(category_id); }
    if (team_id)     { conditions.push(`t.assigned_team_id = $${p++}`);  params.push(team_id); }
    if (agent_id)    { conditions.push(`t.assigned_agent_id = $${p++}`); params.push(agent_id); }
    if (creator_id)  { conditions.push(`t.created_by = $${p++}`);        params.push(creator_id); }
    if (search) {
      conditions.push(`(t.title ILIKE $${p} OR t.description ILIKE $${p} OR t.id::text ILIKE $${p})`);
      params.push(`%${search}%`); p++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const safeCols = ['created_at', 'updated_at', 'priority', 'status', 'due_date'];
    const sortCol = safeCols.includes(sort) ? sort : 'created_at';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';
    const offset = (Number(page) - 1) * Number(limit);

    const countResult = await pool.query(`SELECT COUNT(*) FROM tickets t ${where}`, params);

    const { rows } = await pool.query(
      `SELECT t.*, u.name AS creator_name, a.name AS agent_name, tm.name AS team_name, c.name AS category_name
       FROM tickets t
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN users a ON t.assigned_agent_id = a.id
       LEFT JOIN teams tm ON t.assigned_team_id = tm.id
       LEFT JOIN categories c ON t.category_id = c.id
       ${where} ORDER BY t.${sortCol} ${sortDir}
       LIMIT $${p++} OFFSET $${p++}`,
      [...params, Number(limit), offset]
    );

    const tickets = rows.map(t => ({
      ...t,
      sla_status: t.resolution_deadline ? getSLAStatus(new Date(t.resolution_deadline), t.resolved_at) : null,
    }));

    if (sla_status) {
      const filtered = tickets.filter(t => t.sla_status === sla_status);
      return res.json({ tickets: filtered, total: filtered.length, page: Number(page), limit: Number(limit) });
    }

    res.json({ tickets, total: Number(countResult.rows[0].count), page: Number(page), limit: Number(limit) });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /tickets
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, category_id, priority = 'medium', assigned_team_id } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Title and description are required' });

    const sla = calcSLADeadlines(priority, new Date());

    const { rows } = await pool.query(
      `INSERT INTO tickets (title, description, category_id, priority, created_by, assigned_team_id, response_deadline, resolution_deadline, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, description, category_id || null, priority, req.user!.id, assigned_team_id || null,
        sla?.responseDeadline, sla?.resolutionDeadline, sla?.resolutionDeadline]
    );

    await audit(req.user!.id, 'CREATE', 'ticket', rows[0].id, null, { title, priority });
    await notify(req.user!.id, 'ticket_created', `Ticket "${title}" has been created`, rows[0].id);

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /tickets/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, u.name AS creator_name, a.name AS agent_name, tm.name AS team_name, c.name AS category_name
       FROM tickets t
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN users a ON t.assigned_agent_id = a.id
       LEFT JOIN teams tm ON t.assigned_team_id = tm.id
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Ticket not found' });

    const ticket = rows[0];
    if (req.user!.role === 'employee' && ticket.created_by !== req.user!.id)
      return res.status(403).json({ error: 'Forbidden' });

    ticket.sla_status = ticket.resolution_deadline
      ? getSLAStatus(new Date(ticket.resolution_deadline), ticket.resolved_at) : null;

    res.json(ticket);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});


// PATCH /tickets/:id
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { rows: [existing] } = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });

    const user = req.user!;
    if (user.role === 'employee' && existing.created_by !== user.id)
      return res.status(403).json({ error: 'Forbidden' });

    const allowed = user.role === 'employee'
      ? ['description']
      : ['title', 'description', 'category_id', 'priority', 'status', 'assigned_team_id', 'assigned_agent_id', 'due_date'];

    const updates: string[] = [];
    const values: unknown[] = [];
    let p = 1;

    for (const field of allowed) {
      if (req.body[field] !== undefined) { updates.push(`${field} = $${p++}`); values.push(req.body[field]); }
    }

    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

    updates.push(`updated_at = NOW()`);
    if (req.body.status === 'resolved') updates.push(`resolved_at = NOW()`);

    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`, values
    );

    await audit(user.id, 'UPDATE', 'ticket', req.params.id, existing, req.body);
    if (req.body.status) await notify(existing.created_by, 'status_change', `Your ticket status changed to: ${req.body.status}`, req.params.id);

    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /tickets/:id/assign
router.post('/:id/assign', authenticate, authorize('agent', 'manager', 'admin'), async (req, res) => {
  try {
    const { agent_id, team_id } = req.body;
    const { rows: [existing] } = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });

    const { rows } = await pool.query(
      `UPDATE tickets SET assigned_agent_id = $1, assigned_team_id = $2, status = 'assigned', updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [agent_id || existing.assigned_agent_id, team_id || existing.assigned_team_id, req.params.id]
    );

    await pool.query(
      `INSERT INTO ticket_history (ticket_id, changed_by, field, old_value, new_value) VALUES ($1,$2,'assignment',$3,$4)`,
      [req.params.id, req.user!.id,
        JSON.stringify({ agent: existing.assigned_agent_id, team: existing.assigned_team_id }),
        JSON.stringify({ agent: agent_id, team: team_id })]
    );

    if (agent_id) await notify(agent_id, 'ticket_assigned', `A ticket has been assigned to you`, req.params.id);
    await audit(req.user!.id, 'ASSIGN', 'ticket', req.params.id, existing, { agent_id, team_id });

    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /tickets/:id/resolve
router.post('/:id/resolve', authenticate, authorize('agent', 'manager', 'admin'), async (req, res) => {
  try {
    const { resolution_notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE tickets SET status = 'resolved', resolved_at = NOW(), resolution_notes = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [resolution_notes, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Ticket not found' });

    await notify(rows[0].created_by, 'ticket_resolved', `Your ticket has been resolved`, req.params.id);
    await audit(req.user!.id, 'RESOLVE', 'ticket', req.params.id);

    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /tickets/:id/reopen
router.post('/:id/reopen', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE tickets SET status = 'reopened', resolved_at = NULL, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Ticket not found' });

    await audit(req.user!.id, 'REOPEN', 'ticket', req.params.id);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /tickets/:id/close
router.post('/:id/close', authenticate, async (req, res) => {
  try {
    const { rows: [ticket] } = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (req.user!.role === 'employee' && ticket.created_by !== req.user!.id)
      return res.status(403).json({ error: 'Forbidden' });

    const { rows } = await pool.query(
      `UPDATE tickets SET status = 'closed', updated_at = NOW() WHERE id = $1 RETURNING *`, [req.params.id]
    );

    await audit(req.user!.id, 'CLOSE', 'ticket', req.params.id);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /tickets/:id/comments
router.get('/:id/comments', authenticate, async (req, res) => {
  try {
    const isStaff = ['agent', 'manager', 'admin'].includes(req.user!.role);
    const { rows } = await pool.query(
      `SELECT tc.*, u.name AS author_name FROM ticket_comments tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.ticket_id = $1 ${isStaff ? '' : 'AND tc.is_internal = false'}
       ORDER BY tc.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /tickets/:id/comments
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { content, is_internal = false } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    if (is_internal && req.user!.role === 'employee')
      return res.status(403).json({ error: 'Employees cannot post internal notes' });

    const { rows } = await pool.query(
      `INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, req.user!.id, content, is_internal]
    );

    await pool.query(`UPDATE tickets SET updated_at = NOW() WHERE id = $1`, [req.params.id]);

    const { rows: [t] } = await pool.query('SELECT created_by FROM tickets WHERE id = $1', [req.params.id]);
    if (t?.created_by && t.created_by !== req.user!.id)
      await notify(t.created_by, 'new_comment', `Someone commented on your ticket`, req.params.id);

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /tickets/:id/attachments
router.post('/:id/attachments', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { rows } = await pool.query(
      `INSERT INTO ticket_attachments (ticket_id, uploaded_by, filename, original_name, mime_type, size)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, req.user!.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /tickets/:id/attachments
router.get('/:id/attachments', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ta.*, u.name AS uploader_name FROM ticket_attachments ta
     JOIN users u ON ta.uploaded_by = u.id WHERE ta.ticket_id = $1`,
    [req.params.id]
  );
  res.json(rows);
});


// GET /tickets/:id/attachments/:fileId/download
router.get('/:id/attachments/:fileId/download', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ta.*, t.created_by AS ticket_creator FROM ticket_attachments ta
       JOIN tickets t ON ta.ticket_id = t.id WHERE ta.id = $1 AND ta.ticket_id = $2`,
      [req.params.fileId, req.params.id]
    );
    const attachment = rows[0];
    if (!attachment) return res.status(404).json({ error: 'Not found' });

    if (req.user!.role === 'employee' && attachment.ticket_creator !== req.user!.id)
      return res.status(403).json({ error: 'Forbidden' });

    res.download(path.join(process.env.UPLOAD_DIR || './uploads', attachment.filename), attachment.original_name);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /tickets/:id/history
router.get('/:id/history', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT th.*, u.name AS changed_by_name FROM ticket_history th
     JOIN users u ON th.changed_by = u.id WHERE th.ticket_id = $1 ORDER BY th.created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});


export default router;
