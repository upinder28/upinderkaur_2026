import { Router } from 'express';
import { pool } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_, res) => {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY name');
  res.json(rows);
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await pool.query(
    'INSERT INTO categories (name, description) VALUES ($1,$2) RETURNING *', [name, description]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  await pool.query('DELETE FROM categories WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default router;
