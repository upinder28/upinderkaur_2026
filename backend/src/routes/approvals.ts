import { Router } from 'express';
import { pool } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { audit } from '../utils/audit';
import { notify } from '../workers/notifWorker';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    let query = `SELECT sr.*, u.name as requester_name, t.title as ticket_title
                 FROM service_requests sr
                 JOIN users u ON sr.created_by=u.id
                 LEFT JOIN tickets t ON sr.ticket_id=t.id`;
    const params: unknown[] = [];
    if (user.role === 'employee') {
      query += ' WHERE sr.created_by=$1';
      params.push(user.id);
    } else if (user.role === 'manager') {
      query += ' WHERE sr.status=\'pending_manager\'';
    }
    query += ' ORDER BY sr.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, ticket_id } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const { rows } = await pool.query(
      `INSERT INTO service_requests (title, description, ticket_id, created_by, status)
       VALUES ($1,$2,$3,$4,'pending_manager') RETURNING *`,
      [title, description, ticket_id || null, req.user!.id]
    );
    const managers = await pool.query("SELECT id FROM users WHERE role='manager'");
    for (const m of managers.rows)
      await notify(m.id, 'approval_request', `New approval request: ${title}`, ticket_id);
    await audit(req.user!.id, 'CREATE_REQUEST', 'service_request', rows[0].id);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/approve', authenticate, authorize('manager','admin'), async (req, res) => {
  try {
    const { notes } = req.body;
    const { rows: [sr] } = await pool.query('SELECT * FROM service_requests WHERE id=$1', [req.params.id]);
    if (!sr) return res.status(404).json({ error: 'Not found' });
    const newStatus = sr.status === 'pending_manager' ? 'pending_it' : 'approved';
    const { rows } = await pool.query(
      `UPDATE service_requests SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [newStatus, req.params.id]
    );
    await pool.query(
      `INSERT INTO approvals (request_id, approver_id, decision, notes) VALUES ($1,$2,'approved',$3)`,
      [req.params.id, req.user!.id, notes]
    );
    await notify(sr.created_by, 'approval_update', `Your request was approved (${newStatus})`, sr.ticket_id);
    await audit(req.user!.id, 'APPROVE', 'service_request', req.params.id);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/reject', authenticate, authorize('manager','admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Rejection reason required' });
    const { rows: [sr] } = await pool.query('SELECT * FROM service_requests WHERE id=$1', [req.params.id]);
    if (!sr) return res.status(404).json({ error: 'Not found' });
    const { rows } = await pool.query(
      `UPDATE service_requests SET status='rejected', updated_at=NOW() WHERE id=$1 RETURNING *`, [req.params.id]
    );
    await pool.query(
      `INSERT INTO approvals (request_id, approver_id, decision, notes) VALUES ($1,$2,'rejected',$3)`,
      [req.params.id, req.user!.id, reason]
    );
    await notify(sr.created_by, 'approval_rejected', `Your request was rejected: ${reason}`, sr.ticket_id);
    await audit(req.user!.id, 'REJECT', 'service_request', req.params.id, null, { reason });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id/history', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.*, u.name as approver_name FROM approvals a
     JOIN users u ON a.approver_id=u.id WHERE a.request_id=$1 ORDER BY a.created_at ASC`,
    [req.params.id]
  );
  res.json(rows);
});

export default router;
