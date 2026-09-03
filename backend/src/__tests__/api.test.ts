import request from 'supertest';
import app from '../index';

jest.mock('../db', () => ({
  pool: { query: jest.fn(), on: jest.fn() },
}));
jest.mock('../workers/notifWorker', () => ({
  notify: jest.fn(),
  startNotifWorker: jest.fn(),
  notifQueue: { add: jest.fn() },
}));
jest.mock('../utils/audit', () => ({ audit: jest.fn() }));

import { pool } from '../db';
const mockQuery = pool.query as jest.Mock;

describe('Auth API', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POST /api/auth/login - missing fields returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
  });

  test('POST /api/auth/login - invalid credentials returns 401', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Tickets API - Auth required', () => {
  test('GET /api/tickets without token returns 401', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(401);
  });

  test('POST /api/tickets without token returns 401', async () => {
    const res = await request(app).post('/api/tickets').send({ title: 'Test' });
    expect(res.status).toBe(401);
  });
});

describe('RBAC', () => {
  test('GET /api/audit-logs without token returns 401', async () => {
    const res = await request(app).get('/api/audit-logs');
    expect(res.status).toBe(401);
  });

  test('POST /api/teams without token returns 401', async () => {
    const res = await request(app).post('/api/teams').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });
});
