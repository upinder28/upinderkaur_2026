const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const hash = (p) => bcrypt.hash(p, 12);

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

  const { rows: [emp] } = await pool.query("SELECT id FROM users WHERE email='employee@itsm.com'");
  const { rows: [agent] } = await pool.query("SELECT id FROM users WHERE email='agent@itsm.com'");
  const { rows: [cat] } = await pool.query("SELECT id FROM categories WHERE name='Hardware'");

  if (emp && agent && cat) {
    await pool.query(`INSERT INTO tickets (title, description, category_id, priority, status, created_by, assigned_agent_id, assigned_team_id, response_deadline, resolution_deadline)
      VALUES
      ('Laptop not connecting to VPN', 'My laptop cannot connect to the company VPN since this morning.', $1, 'high', 'in_progress', $2, $3, '11111111-1111-1111-1111-111111111111', NOW() + INTERVAL '30 minutes', NOW() + INTERVAL '8 hours'),
      ('Software installation failing', 'Adobe Acrobat installation keeps failing with error code 1603.', $1, 'medium', 'open', $2, NULL, NULL, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '24 hours'),
      ('Laptop screen damaged', 'My laptop screen has a crack and is barely visible.', $1, 'critical', 'open', $2, NULL, '11111111-1111-1111-1111-111111111111', NOW() + INTERVAL '15 minutes', NOW() + INTERVAL '4 hours')`,
      [cat.id, emp.id, agent.id]
    );
  }

  console.log('Seed complete!');
  console.log('  admin@itsm.com / Admin@123');
  console.log('  manager@itsm.com / Manager@123');
  console.log('  agent@itsm.com / Agent@123');
  console.log('  employee@itsm.com / Employee@123');
  await pool.end();
}

seed().catch(console.error);
