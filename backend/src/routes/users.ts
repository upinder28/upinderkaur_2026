import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { audit } from '../utils/audit';

const router = Router();

router.get('/', authenticate, authorize('admin','manager'), async (req, res) => {
  try {
    const { role, team_id, search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (role) { conditions.push(`role=$${p++}`); params.push(role); }
    if (team_id) { conditions.push(`team_id=$${p++}`); params.push(team_id); }
    if (search) { conditions.push(`(name ILIKE $${p} OR email ILIKE $${p})`); params.push(`%${search}%`); p++; }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);
    const countRes = await pool.query(`SELECT COUNT(*) FROM users ${where}`, params);
    const { rows } = await pool.query(
      `SELECT id, name, email, role, team_id, is_active, created_at FROM users ${where}
       ORDER BY created_at DESC LIMIT $${p++} OFFSET $${p++}`,
      [...params, Number(limit), offset]
    );
    res.json({ users: rows, total: Number(countRes.rows[0].count), page: Number(page), limit: Number(limit) });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  if (req.user!.role !== 'admin' && req.user!.id !== req.params.id)
    return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await pool.query(
    'SELECT id, name, email, role, team_id, is_active, created_at FROM users WHERE id=$1', [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.patch('/:id', authenticate, async (req, res) => {
  try {
    if (req.user!.role !== 'admin' && req.user!.id !== req.params.id)
      return res.status(403).json({ error: 'Forbidden' });
    const { rows: [old] } = await pool.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
    if (!old) return res.status(404).json({ error: 'Not found' });
    const adminFields = ['role','is_active','team_id'];
    const userFields = ['name'];
    const allowed = req.user!.role === 'admin' ? [...adminFields, ...userFields] : userFields;
    const updates: string[] = [];
    const vals: unknown[] = [];
    let p = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) { updates.push(`${key}=$${p++}`); vals.push(req.body[key]); }
    }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(',')} WHERE id=$${p} RETURNING id, name, email, role, team_id, is_active`, vals
    );
    await audit(req.user!.id, 'UPDATE_USER', 'user', req.params.id, old, req.body);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, email, password, role = 'employee', team_id } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already exists' });
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, team_id) VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, email, role, team_id`,
      [name, email, hash, role, team_id || null]
    );
    await audit(req.user!.id, 'CREATE_USER', 'user', rows[0].id, null, { name, email, role });
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

export default router;
