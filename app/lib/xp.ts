// XP system constants and level calculations

export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3800, 5200];

export const LEVEL_NAMES = [
  'Newcomer',       // 1
  'Explorer',       // 2
  'Apprentice',     // 3
  'Builder',        // 4
  'Operator',       // 5
  'Strategist',     // 6
  'Architect',      // 7
  'Director',       // 8
  'Mogul',          // 9
  'Venture Master', // 10
];

export function getLevelForXp(totalXp: number): {
  level: number;
  name: string;
  xpToNext: number;
  progress: number;
} {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  const current = LEVEL_THRESHOLDS[level - 1] || 0;
  const next = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const range = next - current;
  return {
    level,
    name: LEVEL_NAMES[level - 1],
    xpToNext: Math.max(0, next - totalXp),
    progress: range > 0 ? Math.min(1, Math.max(0, (totalXp - current) / range)) : 1,
  };
}

export function calculateScenarioXp(score: number): number {
  return Math.max(10, Math.floor(50 * (score / 100)));
}

export const XP_REWARDS = {
  SCENARIO_HIGH_SCORE_BONUS: 25,
  PRODUCT_LISTED: 20,
  STORE_CREATED: 50,
  STORE_PUBLISHED: 75,
  ORDER_RECEIVED: 30,
  DAILY_LOGIN: 5,
} as const;
