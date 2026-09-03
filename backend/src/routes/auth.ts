import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { authenticate } from '../middleware/auth';
import { audit } from '../utils/audit';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1 AND is_active=true', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    await audit(user.id, 'LOGIN', 'user', user.id);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'employee' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role`,
      [name, email, hash, role]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/me', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, team_id, created_at FROM users WHERE id=$1', [req.user!.id]
  );
  res.json(rows[0]);
});

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user!.id]);
    if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash)))
      return res.status(400).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user!.id]);
    res.json({ message: 'Password updated' });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

export default router;
