// Word Shooter Rank & Leaderboard Service (Liên Quân Mobile Style)

export type RankTier = 
  | 'bronze'      // Đồng (III, II, I) - 3 sao/bậc, Không trừ sao
  | 'silver'      // Bạc (III, II, I) - 3 sao/bậc
  | 'gold'        // Vàng (IV, III, II, I) - 4 sao/bậc
  | 'platinum'    // Bạch Kim (V, IV, III, II, I) - 4 sao/bậc
  | 'diamond'     // Kim Cương (V, IV, III, II, I) - 5 sao/bậc
  | 'veteran'     // Tinh Anh (V, IV, III, II, I) - 5 sao/bậc
  | 'master'      // Cao Thủ (Tích lũy sao không giới hạn)
  | 'grandmaster';// Chiến Tướng (Cao Thủ >= 50 sao)

export interface RankInfo {
  tier: RankTier;
  tierNameVi: string;
  division: number; // e.g. 1 for I, 2 for II, 3 for III...
  divisionRoman: string;
  stars: number; // current stars in this division
  maxStars: number; // stars needed to rank up
  badgeColor: string;
  badgeBorder: string;
  badgeBg: string;
  icon: string;
}

export interface PlayerRankData {
  tier: RankTier;
  division: number;
  stars: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winStreak: number;
  maxWinStreak: number;
  braveryPoints: number; // Điểm tinh thần / dũng khí (đủ 100 điểm = +1 sao bảo hộ)
  lastResult?: 'win' | 'loss';
  starsChanged?: number;
  promoted?: boolean;
  demoted?: boolean;
}

export interface LeaderboardEntry {
  id: string;
  rankPosition: number;
  name: string;
  avatar: string;
  tier: RankTier;
  tierNameVi: string;
  divisionRoman: string;
  stars: number;
  wins: number;
  winRate: number;
  isCurrentUser?: boolean;
}

// Tier Configurations
export const RANK_TIERS_CONFIG: Record<RankTier, {
  nameVi: string;
  divisions: number; // Number of divisions (e.g. 3 for III, II, I)
  starsPerDiv: number;
  icon: string;
  badgeColor: string;
  badgeBorder: string;
  badgeBg: string;
}> = {
  bronze: {
    nameVi: 'Đồng',
    divisions: 3,
    starsPerDiv: 3,
    icon: '🥉',
    badgeColor: 'text-amber-600',
    badgeBorder: 'border-amber-700/60',
    badgeBg: 'from-amber-950/60 to-yellow-950/40',
  },
  silver: {
    nameVi: 'Bạc',
    divisions: 3,
    starsPerDiv: 3,
    icon: '🥈',
    badgeColor: 'text-slate-300',
    badgeBorder: 'border-slate-400/60',
    badgeBg: 'from-slate-800/60 to-slate-900/40',
  },
  gold: {
    nameVi: 'Vàng',
    divisions: 4,
    starsPerDiv: 4,
    icon: '🥇',
    badgeColor: 'text-yellow-400',
    badgeBorder: 'border-yellow-500/70',
    badgeBg: 'from-yellow-950/60 to-amber-900/40',
  },
  platinum: {
    nameVi: 'Bạch Kim',
    divisions: 5,
    starsPerDiv: 4,
    icon: '💠',
    badgeColor: 'text-teal-300',
    badgeBorder: 'border-teal-400/70',
    badgeBg: 'from-teal-950/60 to-cyan-950/40',
  },
  diamond: {
    nameVi: 'Kim Cương',
    divisions: 5,
    starsPerDiv: 5,
    icon: '💎',
    badgeColor: 'text-cyan-300',
    badgeBorder: 'border-cyan-400/80',
    badgeBg: 'from-cyan-950/70 to-blue-950/50',
  },
  veteran: {
    nameVi: 'Tinh Anh',
    divisions: 5,
    starsPerDiv: 5,
    icon: '🔮',
    badgeColor: 'text-purple-300',
    badgeBorder: 'border-purple-400/80',
    badgeBg: 'from-purple-950/70 to-fuchsia-950/50',
  },
  master: {
    nameVi: 'Cao Thủ',
    divisions: 1,
    starsPerDiv: 50,
    icon: '👑',
    badgeColor: 'text-rose-400',
    badgeBorder: 'border-rose-500/80',
    badgeBg: 'from-rose-950/70 to-red-950/50',
  },
  grandmaster: {
    nameVi: 'Chiến Tướng',
    divisions: 1,
    starsPerDiv: 999,
    icon: '⚡',
    badgeColor: 'text-amber-300',
    badgeBorder: 'border-amber-400',
    badgeBg: 'from-amber-900/80 to-yellow-600/30',
  },
};

const ROMAN_NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V'];
const TIER_ORDER: RankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'veteran', 'master', 'grandmaster'];

const STORAGE_KEY = 'word_shooter_rank_v2';

export const getInitialPlayerRank = (): PlayerRankData => {
  return {
    tier: 'bronze',
    division: 3, // Đồng III
    stars: 1,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winStreak: 0,
    maxWinStreak: 0,
    braveryPoints: 0,
  };
};

export const getStoredPlayerRank = (): PlayerRankData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...getInitialPlayerRank(), ...parsed };
    }
  } catch (err) {
    console.error('Error loading rank data', err);
  }
  return getInitialPlayerRank();
};

export const getPlayerRank = getStoredPlayerRank;

export const savePlayerRank = (data: PlayerRankData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving rank data', err);
  }
};

export const formatRankInfo = (data: PlayerRankData): RankInfo => {
  const config = RANK_TIERS_CONFIG[data.tier] || RANK_TIERS_CONFIG.bronze;
  const isMasterOrAbove = data.tier === 'master' || data.tier === 'grandmaster';
  
  return {
    tier: data.tier,
    tierNameVi: config.nameVi,
    division: data.division,
    divisionRoman: isMasterOrAbove ? '' : ROMAN_NUMERALS[data.division] || '',
    stars: data.stars,
    maxStars: isMasterOrAbove ? 50 : config.starsPerDiv,
    badgeColor: config.badgeColor,
    badgeBorder: config.badgeBorder,
    badgeBg: config.badgeBg,
    icon: config.icon,
  };
};

// Process match result: Thắng +1 sao, Thua -1 sao (như Liên Quân Mobile)
export const processRankMatchResult = (isVictory: boolean): {
  previous: PlayerRankData;
  updated: PlayerRankData;
  starsChanged: number;
  promoted: boolean;
  demoted: boolean;
} => {
  const current = getStoredPlayerRank();
  const previous = { ...current };

  let tier = current.tier;
  let division = current.division;
  let stars = current.stars;
  let wins = current.wins;
  let losses = current.losses;
  let winStreak = current.winStreak;
  let maxWinStreak = current.maxWinStreak;
  let bravery = current.braveryPoints;
  let starsChanged = 0;
  let promoted = false;
  let demoted = false;

  const totalMatches = current.totalMatches + 1;
  const config = RANK_TIERS_CONFIG[tier];

  if (isVictory) {
    wins += 1;
    winStreak += 1;
    if (winStreak > maxWinStreak) maxWinStreak = winStreak;

    // Victory: +1 Star
    starsChanged = +1;
    stars += 1;

    // Bonus Bravery Points for Win Streak
    bravery += 25 + Math.min(winStreak * 5, 25);
    if (bravery >= 100) {
      bravery -= 100;
      stars += 1; // Bonus star from bravery
      starsChanged += 1;
    }

    // Check Promotion
    if (tier === 'master') {
      if (stars >= 50) {
        tier = 'grandmaster';
        promoted = true;
      }
    } else if (tier === 'grandmaster') {
      // Endless stars in Grandmaster!
    } else {
      if (stars > config.starsPerDiv) {
        // Promote division or tier!
        if (division > 1) {
          division -= 1; // e.g. III -> II -> I
          stars = 1;
          promoted = true;
        } else {
          // Promote to next Tier!
          const currentTierIdx = TIER_ORDER.indexOf(tier);
          if (currentTierIdx < TIER_ORDER.length - 1) {
            tier = TIER_ORDER[currentTierIdx + 1];
            const nextConfig = RANK_TIERS_CONFIG[tier];
            division = nextConfig.divisions; // start at lowest division of next tier (e.g. V or III)
            stars = 1;
            promoted = true;
          }
        }
      }
    }
  } else {
    // Loss
    losses += 1;
    winStreak = 0;

    // Bravery Shield Check: If player has >= 100 bravery, protect star!
    if (bravery >= 100) {
      bravery -= 100;
      starsChanged = 0; // Protected!
    } else if (tier === 'bronze') {
      // Bậc Đồng: Bảo hộ tân thủ, không trừ sao khi thua!
      starsChanged = 0;
    } else {
      starsChanged = -1;
      stars -= 1;

      if (stars < 0) {
        if (tier === 'grandmaster') {
          tier = 'master';
          stars = 49;
          demoted = true;
        } else if (tier === 'master') {
          // Drop to Tinh Anh I
          tier = 'veteran';
          division = 1;
          stars = RANK_TIERS_CONFIG.veteran.starsPerDiv - 1;
          demoted = true;
        } else {
          // Check demoting division
          if (division < config.divisions) {
            division += 1; // e.g. I -> II -> III
            stars = config.starsPerDiv - 1;
            demoted = true;
          } else {
            // Drop to previous Tier!
            const currentTierIdx = TIER_ORDER.indexOf(tier);
            if (currentTierIdx > 0) {
              tier = TIER_ORDER[currentTierIdx - 1];
              const prevConfig = RANK_TIERS_CONFIG[tier];
              division = 1; // Highest division of lower tier
              stars = prevConfig.starsPerDiv - 1;
              demoted = true;
            } else {
              stars = 0;
            }
          }
        }
      }
    }
  }

  const updated: PlayerRankData = {
    tier,
    division,
    stars: Math.max(0, stars),
    totalMatches,
    wins,
    losses,
    winStreak,
    maxWinStreak,
    braveryPoints: bravery,
    lastResult: isVictory ? 'win' : 'loss',
    starsChanged,
    promoted,
    demoted,
  };

  savePlayerRank(updated);

  return {
    previous,
    updated,
    starsChanged,
    promoted,
    demoted,
  };
};

// Seeded competitive Top Leaderboard
export const getLeaderboardData = (userRank: PlayerRankData, userName: string = 'Bạn'): LeaderboardEntry[] => {
  const userWinRate = userRank.totalMatches > 0 
    ? Math.round((userRank.wins / userRank.totalMatches) * 100) 
    : 100;

  const mockTopPlayers: Array<Omit<LeaderboardEntry, 'rankPosition'>> = [
    { id: 'top_1', name: 'ĐộcCôCầuBại ⚡', avatar: '🐉', tier: 'grandmaster', tierNameVi: 'Chiến Tướng', divisionRoman: '', stars: 86, wins: 242, winRate: 78 },
    { id: 'top_2', name: 'ThánhGõTOEIC 🚀', avatar: '🦅', tier: 'grandmaster', tierNameVi: 'Chiến Tướng', divisionRoman: '', stars: 74, wins: 198, winRate: 74 },
    { id: 'top_3', name: 'PháĐảoTừVựng 🔥', avatar: '🦁', tier: 'grandmaster', tierNameVi: 'Chiến Tướng', divisionRoman: '', stars: 62, wins: 185, winRate: 71 },
    { id: 'top_4', name: 'Minh Tuấn (850+)', avatar: '🐺', tier: 'master', tierNameVi: 'Cao Thủ', divisionRoman: '', stars: 42, wins: 140, winRate: 68 },
    { id: 'top_5', name: 'Phương Thảo 🌸', avatar: '🦊', tier: 'master', tierNameVi: 'Cao Thủ', divisionRoman: '', stars: 35, wins: 122, winRate: 66 },
    { id: 'top_6', name: 'AceHunter_99', avatar: '🐯', tier: 'master', tierNameVi: 'Cao Thủ', divisionRoman: '', stars: 28, wins: 110, winRate: 64 },
    { id: 'top_7', name: 'Hoàng Long ETS', avatar: '⚡', tier: 'veteran', tierNameVi: 'Tinh Anh', divisionRoman: 'I', stars: 4, wins: 95, winRate: 62 },
    { id: 'top_8', name: 'Thu Hương 990', avatar: '🐱', tier: 'veteran', tierNameVi: 'Tinh Anh', divisionRoman: 'II', stars: 3, wins: 88, winRate: 61 },
    { id: 'top_9', name: 'CyberPilot_VN', avatar: '🤖', tier: 'diamond', tierNameVi: 'Kim Cương', divisionRoman: 'I', stars: 4, wins: 76, winRate: 59 },
    { id: 'top_10', name: 'Bảo Nam TOEIC', avatar: '🎯', tier: 'diamond', tierNameVi: 'Kim Cương', divisionRoman: 'III', stars: 2, wins: 64, winRate: 57 },
  ];

  const userConfig = formatRankInfo(userRank);

  // Position calculation based on stars and tier order
  const getTierScore = (t: RankTier, stars: number) => {
    return TIER_ORDER.indexOf(t) * 100 + stars;
  };

  const userScore = getTierScore(userRank.tier, userRank.stars);
  let userPos = 11;
  for (let i = 0; i < mockTopPlayers.length; i++) {
    const pScore = getTierScore(mockTopPlayers[i].tier, mockTopPlayers[i].stars);
    if (userScore >= pScore) {
      userPos = i + 1;
      break;
    }
  }

  const userEntry: LeaderboardEntry = {
    id: 'user_current',
    rankPosition: userPos,
    name: userName || 'Bạn',
    avatar: '🚀',
    tier: userRank.tier,
    tierNameVi: userConfig.tierNameVi,
    divisionRoman: userConfig.divisionRoman,
    stars: userRank.stars,
    wins: userRank.wins,
    winRate: userWinRate,
    isCurrentUser: true,
  };

  const list: LeaderboardEntry[] = mockTopPlayers.map((p, idx) => ({
    ...p,
    rankPosition: idx + 1,
  }));

  // Insert user or append
  if (userPos <= 10) {
    list.splice(userPos - 1, 0, userEntry);
    return list.slice(0, 10).map((item, idx) => ({ ...item, rankPosition: idx + 1 }));
  } else {
    return [...list, userEntry];
  }
};

export interface MatchedRankedOpponent {
  name: string;
  avatar: string;
  tier: RankTier;
  tierNameVi: string;
  division: number;
  divisionRoman: string;
  stars: number;
  icon: string;
  winRate: number;
  totalMatches: number;
  botDelayMs: number;
  rankDeltaText: string;
}

const VIETNAMESE_OPPONENT_NAMES = [
  { name: 'Bảo Nam Ace', avatar: '⚡' },
  { name: 'Hải Đăng Pilot', avatar: '🚀' },
  { name: 'Thanh Thảo Sky', avatar: '🌸' },
  { name: 'Minh Triết TOEIC', avatar: '🎯' },
  { name: 'Quốc Huy Phím', avatar: '🔥' },
  { name: 'Khánh Linh Fox', avatar: '🦊' },
  { name: 'Việt Anh Flash', avatar: '⚡' },
  { name: 'Tuấn Kiệt Shadow', avatar: '🥷' },
  { name: 'Đức Anh Storm', avatar: '🌪️' },
  { name: 'Bảo Trâm Nova', avatar: '✨' },
  { name: 'Hoàng Long Aero', avatar: '🦅' },
  { name: 'Phúc Thịnh Pro', avatar: '🎮' },
  { name: 'Hữu Nghĩa Jet', avatar: '✈️' },
  { name: 'Quỳnh Như Viper', avatar: '🐍' },
  { name: 'Gia Huy Thunder', avatar: '⚡' },
  { name: 'Ánh Dương Falcon', avatar: '🦅' },
  { name: 'Hoàng Yến Blade', avatar: '⚔️' },
  { name: 'Trọng Nhân Swift', avatar: '🚀' },
  { name: 'Khánh An Falcon', avatar: '🎯' },
  { name: 'Thành Đạt Striker', avatar: '💥' },
];

// Precomputed linear rank ladder from lowest to highest division
const ALL_RANK_STEPS: Array<{ tier: RankTier; division: number }> = [];
TIER_ORDER.forEach((tier) => {
  const config = RANK_TIERS_CONFIG[tier];
  if (tier === 'master' || tier === 'grandmaster') {
    ALL_RANK_STEPS.push({ tier, division: 1 });
  } else {
    for (let d = config.divisions; d >= 1; d--) {
      ALL_RANK_STEPS.push({ tier, division: d });
    }
  }
});

/**
 * Generate a fair ranked opponent whose rank does not differ significantly from player's rank
 * (Chênh lệch rank tối đa 0 hoặc ±1 phân hạng/bậc, tuyệt đối không chênh lệch xa)
 */
export const generateFairRankedOpponent = (playerRank: PlayerRankData): MatchedRankedOpponent => {
  // Find current step on the ladder
  let playerStepIdx = ALL_RANK_STEPS.findIndex(
    (step) => step.tier === playerRank.tier && step.division === playerRank.division
  );
  if (playerStepIdx === -1) {
    playerStepIdx = 0; // fallback to Bronze III
  }

  // Delta: 0 (50%), +1 (25%), -1 (25%)
  const rand = Math.random();
  let stepDelta = 0;
  if (rand < 0.25) {
    stepDelta = -1;
  } else if (rand < 0.5) {
    stepDelta = 1;
  } else {
    stepDelta = 0;
  }

  let matchedStepIdx = playerStepIdx + stepDelta;
  if (matchedStepIdx < 0) matchedStepIdx = 0;
  if (matchedStepIdx >= ALL_RANK_STEPS.length) matchedStepIdx = ALL_RANK_STEPS.length - 1;

  const targetStep = ALL_RANK_STEPS[matchedStepIdx];
  const matchedTier = targetStep.tier;
  const targetDiv = targetStep.division;
  const matchedConfig = RANK_TIERS_CONFIG[matchedTier];
  const isMasterOrAbove = matchedTier === 'master' || matchedTier === 'grandmaster';
  
  // Fair stars count (random close to player's stars)
  const maxDivStars = matchedConfig.starsPerDiv;
  const matchedStars = Math.max(1, Math.min(maxDivStars, Math.floor(Math.random() * maxDivStars) + 1));
  
  // Realistic win rate close to 48-63%
  const winRate = Math.floor(Math.random() * 16) + 48;
  const totalMatches = Math.max(8, playerRank.totalMatches + Math.floor(Math.random() * 15) - 5);
  
  // Typing speed scaled properly with rank:
  // Bronze: 520-560ms | Silver: 450-480ms | Gold: 390-420ms | Platinum: 340-370ms | Diamond: 300-325ms | Veteran: 270-290ms | Master: 240-260ms
  let botDelayMs = 480;
  if (matchedTier === 'bronze') botDelayMs = 520 + Math.floor(Math.random() * 40);
  else if (matchedTier === 'silver') botDelayMs = 450 + Math.floor(Math.random() * 30);
  else if (matchedTier === 'gold') botDelayMs = 390 + Math.floor(Math.random() * 30);
  else if (matchedTier === 'platinum') botDelayMs = 340 + Math.floor(Math.random() * 30);
  else if (matchedTier === 'diamond') botDelayMs = 300 + Math.floor(Math.random() * 25);
  else if (matchedTier === 'veteran') botDelayMs = 270 + Math.floor(Math.random() * 20);
  else botDelayMs = 240 + Math.floor(Math.random() * 20);

  const profile = VIETNAMESE_OPPONENT_NAMES[Math.floor(Math.random() * VIETNAMESE_OPPONENT_NAMES.length)];
  
  let rankDeltaText = 'Cân bằng hoàn hảo • Cùng phân hạng';
  if (matchedStepIdx > playerStepIdx) {
    rankDeltaText = 'Thử thách nhẹ • Đối thủ cao hơn 1 phân hạng';
  } else if (matchedStepIdx < playerStepIdx) {
    rankDeltaText = 'Trình độ tương đương • Đối thủ thấp hơn 1 phân hạng';
  }

  return {
    name: profile.name,
    avatar: profile.avatar,
    tier: matchedTier,
    tierNameVi: matchedConfig.nameVi,
    division: targetDiv,
    divisionRoman: isMasterOrAbove ? '' : ROMAN_NUMERALS[targetDiv] || '',
    stars: matchedStars,
    icon: matchedConfig.icon,
    winRate,
    totalMatches,
    botDelayMs,
    rankDeltaText,
  };
};
