export const SLA_RULES = {
  critical: { responseMinutes: 15,  resolutionMinutes: 240  }, 
  high:     { responseMinutes: 30,  resolutionMinutes: 480  }, 
  medium:   { responseMinutes: 120, resolutionMinutes: 1440 },
  low:      { responseMinutes: 480, resolutionMinutes: 4320 }, 
} as Record<string, { responseMinutes: number; resolutionMinutes: number }>;


export function calcSLADeadlines(priority: string, createdAt: Date) {
  const rule = SLA_RULES[priority.toLowerCase()];

  if (!rule) return null;

  const responseDeadline = new Date(createdAt.getTime() + rule.responseMinutes * 60 * 1000);
  const resolutionDeadline = new Date(createdAt.getTime() + rule.resolutionMinutes * 60 * 1000);

  return { responseDeadline, resolutionDeadline };
}

export function getSLAStatus(
  deadline: Date,
  resolvedAt?: Date | null
): 'on_track' | 'at_risk' | 'breached' {

  const checkTime = resolvedAt ?? new Date();

  const millisRemaining = deadline.getTime() - checkTime.getTime();

  if (millisRemaining < 0) {
    return 'breached'; // Deadline already passed
  }

  if (millisRemaining < 30 * 60 * 1000) {
    return 'at_risk'; // Less than 30 minutes left
  }

  return 'on_track';
}
