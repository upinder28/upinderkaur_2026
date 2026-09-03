import { calcSLADeadlines, getSLAStatus, SLA_RULES } from '../utils/sla';

describe('SLA Calculations', () => {
  const now = new Date('2024-01-01T10:00:00Z');

  test('critical SLA deadlines', () => {
    const sla = calcSLADeadlines('critical', now);
    expect(sla?.responseDeadline).toEqual(new Date('2024-01-01T10:15:00Z'));
    expect(sla?.resolutionDeadline).toEqual(new Date('2024-01-01T14:00:00Z'));
  });

  test('high SLA deadlines', () => {
    const sla = calcSLADeadlines('high', now);
    expect(sla?.responseDeadline).toEqual(new Date('2024-01-01T10:30:00Z'));
    expect(sla?.resolutionDeadline).toEqual(new Date('2024-01-01T18:00:00Z'));
  });

  test('medium SLA deadlines', () => {
    const sla = calcSLADeadlines('medium', now);
    expect(sla?.responseDeadline).toEqual(new Date('2024-01-01T12:00:00Z'));
    expect(sla?.resolutionDeadline).toEqual(new Date('2024-01-02T10:00:00Z'));
  });

  test('low SLA deadlines', () => {
    const sla = calcSLADeadlines('low', now);
    expect(sla?.responseDeadline).toEqual(new Date('2024-01-01T18:00:00Z'));
    expect(sla?.resolutionDeadline).toEqual(new Date('2024-01-04T10:00:00Z'));
  });

  test('unknown priority returns null', () => {
    expect(calcSLADeadlines('unknown', now)).toBeNull();
  });

  test('getSLAStatus - on_track', () => {
    const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    expect(getSLAStatus(deadline)).toBe('on_track');
  });

  test('getSLAStatus - at_risk (within 30 min)', () => {
    const deadline = new Date(Date.now() + 15 * 60 * 1000); // 15 min from now
    expect(getSLAStatus(deadline)).toBe('at_risk');
  });

  test('getSLAStatus - breached', () => {
    const deadline = new Date(Date.now() - 60 * 1000); // 1 min ago
    expect(getSLAStatus(deadline)).toBe('breached');
  });

  test('getSLAStatus with resolvedAt before deadline = on_track', () => {
    const deadline = new Date('2024-01-01T14:00:00Z');
    const resolvedAt = new Date('2024-01-01T12:00:00Z');
    expect(getSLAStatus(deadline, resolvedAt)).toBe('on_track');
  });

  test('getSLAStatus with resolvedAt after deadline = breached', () => {
    const deadline = new Date('2024-01-01T14:00:00Z');
    const resolvedAt = new Date('2024-01-01T16:00:00Z');
    expect(getSLAStatus(deadline, resolvedAt)).toBe('breached');
  });

  test('all priorities have rules defined', () => {
    ['critical','high','medium','low'].forEach(p => {
      expect(SLA_RULES[p]).toBeDefined();
      expect(SLA_RULES[p].responseMinutes).toBeGreaterThan(0);
      expect(SLA_RULES[p].resolutionMinutes).toBeGreaterThan(0);
    });
  });
});
