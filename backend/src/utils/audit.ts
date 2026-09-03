import { pool } from '../db';

export async function audit(
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  oldVal?: unknown,
  newVal?: unknown,
  meta?: unknown
) {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, resource, resource_id, old_value, new_value, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [userId, action, resource, resourceId,
      oldVal ? JSON.stringify(oldVal) : null,
      newVal ? JSON.stringify(newVal) : null,
      meta ? JSON.stringify(meta) : null]
  );
}
