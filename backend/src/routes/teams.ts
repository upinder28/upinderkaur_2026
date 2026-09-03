import { Router } from 'express';
import { pool } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_, res) => {
  const { rows } = await pool.query(
    `SELECT t.*, COUNT(u.id)::int as member_count FROM teams t
     LEFT JOIN users u ON u.team_id=t.id GROUP BY t.id ORDER BY t.name`
  );
  res.json(rows);
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await pool.query(
      'INSERT INTO teams (name, description) VALUES ($1,$2) RETURNING *', [name, description]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const { rows } = await pool.query(
      'UPDATE teams SET name=COALESCE($1,name), description=COALESCE($2,description) WHERE id=$3 RETURNING *',
      [name, description, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  await pool.query('DELETE FROM teams WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.get('/:id/members', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role FROM users WHERE team_id=$1', [req.params.id]
  );
  res.json(rows);
});

export default router;
