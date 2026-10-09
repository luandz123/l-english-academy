import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./useAuth";
import { useSound } from "./useSound";
import { toast } from "./use-toast";

export const XP_REWARDS = {
  PART2_CLUSTER_COMPLETE: 200,
  FULLTEST_SUBMIT: 50,
  QUIZ_MIN: 10,
  QUIZ_PER_CORRECT: 5,
} as const;

export interface Quest {
  id: string;
  title: string;
  description: string;
  icon: string;
  current: number;
  target: number;
  xpReward: number;
  claimed: boolean;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "listening" | "vocab" | "streak" | "level" | "special";
  target: number;
  current: number;
  xpReward: number;
  unlocked: boolean;
  claimed: boolean;
}

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar?: string;
  xp: number;
  streak: number;
  rank: number;
  isCurrentUser?: boolean;
}

export interface GamificationState {
  xp: number;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  claimedQuestsDate: string; // YYYY-MM-DD
  lastChestDate?: string; // YYYY-MM-DD
  questProgress: {
    dictation: number;
    vocab: number;
    streakDone: boolean;
  };
  totalStats: {
    dictationCount: number;
    vocabCount: number;
  };
  claimedQuestIds: string[];
  claimedBadgeIds: string[];
  streakShields: number;
}

export interface ChestReward {
  type: "xp" | "shield" | "boost";
  title: string;
  description: string;
  amount: number;
  icon: string;
}

export const getLevelInfo = (xp: number) => {
  const level = Math.floor(xp / 100) + 1;
  const currentLevelXp = xp % 100;
  const xpToNextLevel = 100 - currentLevelXp;
  
  let title = "Tập Sự TOEIC 🎯";
  let color = "text-indigo-400 bg-indigo-500/15 border-indigo-500/30";
  
  if (level >= 10) {
    title = "Huyền Thoại TOEIC 👑";
    color = "text-purple-400 bg-purple-500/15 border-purple-500/30";
  } else if (level >= 7) {
    title = "Bậc Thầy TOEIC 🌟";
    color = "text-amber-400 bg-amber-500/15 border-amber-500/30";
  } else if (level >= 4) {
    title = "Chiến Binh TOEIC ⚔️";
    color = "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
  } else {
    title = "Tập Sự TOEIC 🎯";
    color = "text-indigo-400 bg-indigo-500/15 border-indigo-500/30";
  }

  return {
    level,
    currentLevelXp,
    xpToNextLevel,
    progressPct: currentLevelXp,
    title,
    color,
  };
};

export const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};



export const useGamification = () => {
  const { user, profile } = useAuth();
  const { playSound } = useSound();
  const userId = user?.id || "guest";
  const STORAGE_KEY = `lenglish_gamification_v3_${userId}`;

  const [state, setState] = useState<GamificationState>(() => {
    const today = getTodayString();
    const yesterday = getYesterdayString();

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: GamificationState = JSON.parse(saved);
        if (parsed.claimedQuestsDate !== today) {
          let updatedStreak = parsed.streak;
          let shields = parsed.streakShields || 0;
          if (parsed.lastActiveDate !== today && parsed.lastActiveDate !== yesterday) {
            if (shields > 0) {
              shields -= 1; // Shield consumed!
              toast({
                title: "🛡️ THẺ BẢO VỆ STREAK ĐÃ KÍCH HOẠT!",
                description: "Chuỗi học tập của bạn được giữ an toàn!",
              });
            } else {
              updatedStreak = 0; // Streak broken
            }
          }
          return {
            ...parsed,
            streak: updatedStreak,
            streakShields: shields,
            claimedQuestsDate: today,
            questProgress: {
              dictation: 0,
              vocab: 0,
              streakDone: updatedStreak > 0,
            },
            claimedQuestIds: [],
          };
        }
        return parsed;
      }
    } catch (e) {
      console.error("Failed to load gamification state", e);
    }

    return {
      xp: 0,
      streak: 0,
      lastActiveDate: today,
      claimedQuestsDate: today,
      questProgress: {
        dictation: 0,
        vocab: 0,
        streakDone: false,
      },
      totalStats: {
        dictationCount: 0,
        vocabCount: 0,
      },
      claimedQuestIds: [],
      claimedBadgeIds: [],
      streakShields: 0,
    };
  });

  // Guest to User migration
  useEffect(() => {
    if (!user?.id) return;
    try {
      const USER_KEY = `lenglish_gamification_v3_${user.id}`;
      const GUEST_KEY = "lenglish_gamification_v3_guest";
      const guestRaw = localStorage.getItem(GUEST_KEY);
      if (guestRaw) {
        const userExistingRaw = localStorage.getItem(USER_KEY);
        if (!userExistingRaw) {
          // Key user chưa tồn tại -> sao chép dữ liệu guest sang key user
          localStorage.setItem(USER_KEY, guestRaw);
          try {
            const guestParsed: GamificationState = JSON.parse(guestRaw);
            setState(guestParsed);
          } catch {}
        }
        // Xóa key guest
        localStorage.removeItem(GUEST_KEY);
      }
    } catch (e) {
      console.error("Failed to migrate guest gamification data", e);
    }
  }, [user?.id]);

  // Save state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save gamification state", e);
    }
  }, [state, STORAGE_KEY]);

  // Daily Streak check-in
  const checkInStreak = useCallback(() => {
    const today = getTodayString();
    const yesterday = getYesterdayString();

    setState(prev => {
      if (prev.lastActiveDate === today) return prev;

      let newStreak = prev.streak;
      if (prev.lastActiveDate === yesterday) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }

      return {
        ...prev,
        streak: newStreak,
        lastActiveDate: today,
        questProgress: {
          ...prev.questProgress,
          streakDone: true,
        },
      };
    });
  }, []);

  // Add XP
  const addXp = useCallback((amount: number, reason?: string) => {
    setState(prev => {
      const newXp = prev.xp + amount;
      const oldLevel = Math.floor(prev.xp / 100) + 1;
      const newLevel = Math.floor(newXp / 100) + 1;

      if (newLevel > oldLevel) {
        try { playSound?.("correct"); } catch { /* ignore audio error */ }
        toast({
          title: `🎉 CHÚC MỪNG BẠN LÊN LEVEL ${newLevel}!`,
          description: `Danh hiệu: ${getLevelInfo(newXp).title}! Thưởng thêm +50 XP!`,
        });
      }

      return {
        ...prev,
        xp: newXp + (newLevel > oldLevel ? 50 : 0),
      };
    });

    checkInStreak();

    if (reason) {
      toast({
        title: `+${amount} XP ⚡`,
        description: reason,
      });
    }
  }, [checkInStreak, playSound]);

  // Dictation progress recording
  const recordDictationProgress = useCallback((count: number) => {
    setState(prev => ({
      ...prev,
      questProgress: {
        ...prev.questProgress,
        dictation: Math.min(5, prev.questProgress.dictation + count),
      },
      totalStats: {
        ...prev.totalStats,
        dictationCount: (prev.totalStats?.dictationCount || 0) + count,
      },
    }));
    checkInStreak();
  }, [checkInStreak]);

  // Vocab progress recording
  const recordVocabProgress = useCallback((count: number) => {
    setState(prev => ({
      ...prev,
      questProgress: {
        ...prev.questProgress,
        vocab: Math.min(5, prev.questProgress.vocab + count),
      },
      totalStats: {
        ...prev.totalStats,
        vocabCount: (prev.totalStats?.vocabCount || 0) + count,
      },
    }));
    checkInStreak();
  }, [checkInStreak]);

  // Claim Quest
  const claimQuest = useCallback((questId: string, xpReward?: number) => {
    if (state.claimedQuestIds.includes(questId)) return;

    const defaultRewardMap: Record<string, number> = {
      quest_streak: 10,
      quest_practice: 20,
      quest_dictation: 20,
      quest_vocab: 20,
    };
    const reward = xpReward ?? defaultRewardMap[questId] ?? 20;

    setState(prev => ({
      ...prev,
      xp: prev.xp + reward,
      claimedQuestIds: [...prev.claimedQuestIds, questId],
    }));

    try { playSound?.("correct"); } catch { /* ignore audio error */ }

    toast({
      title: `🎁 ĐÃ NHẬN +${reward} XP THƯỞNG!`,
      description: "Nhiệm vụ hoàn thành xuất sắc!",
    });
  }, [state.claimedQuestIds, playSound]);

  // Claim Badge
  const claimBadge = useCallback((badgeId: string, xpReward: number) => {
    if (state.claimedBadgeIds.includes(badgeId)) return;

    setState(prev => ({
      ...prev,
      xp: prev.xp + xpReward,
      claimedBadgeIds: [...prev.claimedBadgeIds, badgeId],
    }));

    try { playSound?.("correct"); } catch { /* ignore audio error */ }

    toast({
      title: `🏅 HUY HIỆU MỚI: +${xpReward} XP!`,
      description: "Thành tựu xuất sắc đã mở khóa!",
    });
  }, [state.claimedBadgeIds, playSound]);

  // Open Mystery Chest reward (strictly 1 time per day)
  const openChestReward = useCallback((): ChestReward | null => {
    const today = getTodayString();
    const lastDate = state.lastChestDate || (typeof window !== "undefined" ? localStorage.getItem("lenglish_last_chest_date") : null);

    if (lastDate === today) {
      toast({
        title: "🎁 Bạn đã mở rương hôm nay rồi!",
        description: "Mỗi ngày chỉ được mở 1 lần. Hãy quay lại vào ngày mai nhé!",
      });
      return null;
    }

    const rewards: ChestReward[] = [
      { type: "xp", amount: 100, title: "🎁 Rương Báu Hoàng Gia!", description: "+100 XP Thưởng Bất Ngờ!", icon: "Gift" },
      { type: "shield", amount: 1, title: "🛡️ Thẻ Bảo Vệ Streak!", description: "Bảo vệ chuỗi 1 ngày khi bận!", icon: "ShieldCheck" },
      { type: "boost", amount: 150, title: "⚡ Siêu Cấp Thần Tốc!", description: "+150 XP Thưởng Cực Lớn!", icon: "Zap" },
    ];

    const chosen = rewards[Math.floor(Math.random() * rewards.length)];

    if (chosen.type === "xp" || chosen.type === "boost") {
      addXp(chosen.amount);
    } else if (chosen.type === "shield") {
      setState(prev => ({
        ...prev,
        streakShields: (prev.streakShields || 0) + 1,
        lastChestDate: today,
      }));
      toast({
        title: "🛡️ NHẬN 1 THẺ BẢO VỆ STREAK!",
        description: "Tự động kích hoạt nếu bạn lỡ mất 1 ngày học.",
      });
    }

    setState(prev => ({
      ...prev,
      lastChestDate: today,
    }));

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("lenglish_last_chest_date", today);
      } catch (e) {
        console.error(e);
      }
    }

    return chosen;
  }, [addXp, state.lastChestDate]);

  // Computed Quests
  const quests: Quest[] = [
    {
      id: "quest_streak",
      title: "Đăng nhập hàng ngày (+10 XP)",
      description: "Đăng nhập vào bàn học và duy trì chuỗi học tập",
      icon: "Flame",
      current: 1,
      target: 1,
      xpReward: 10,
      claimed: state.claimedQuestIds.includes("quest_streak"),
    },
    {
      id: "quest_practice",
      title: "Làm 1 bài luyện nghe hoặc đề thi (+20 XP)",
      description: "Hoàn thành 1 bài nghe chép chính tả hoặc đề thi",
      icon: "Headphones",
      current: Math.min(1, state.questProgress.dictation),
      target: 1,
      xpReward: 20,
      claimed: state.claimedQuestIds.includes("quest_practice") || state.claimedQuestIds.includes("quest_dictation"),
    },
    {
      id: "quest_vocab",
      title: "Học 10 từ vựng TOEIC (+20 XP)",
      description: "Học 10 từ vựng trong kho từ vựng hoặc mini-game",
      icon: "Star",
      current: Math.min(10, state.questProgress.vocab),
      target: 10,
      xpReward: 20,
      claimed: state.claimedQuestIds.includes("quest_vocab"),
    },
  ];

  // Computed Badges / Achievements
  const levelInfo = getLevelInfo(state.xp);
  const badges: Badge[] = [
    {
      id: "badge_listening_master",
      title: "Thánh Nghe Điền Từ 🎧",
      description: "Luyện thành công 25 câu chép chính tả",
      icon: "Headphones",
      category: "listening",
      target: 25,
      current: Math.min(25, state.totalStats?.dictationCount || 0),
      xpReward: 100,
      unlocked: (state.totalStats?.dictationCount || 0) >= 25,
      claimed: state.claimedBadgeIds.includes("badge_listening_master"),
    },
    {
      id: "badge_vocab_master",
      title: "Bậc Thầy Từ Vựng 📚",
      description: "Thuộc 20 từ vựng TOEIC nâng cao",
      icon: "BookOpen",
      category: "vocab",
      target: 20,
      current: Math.min(20, state.totalStats?.vocabCount || 0),
      xpReward: 100,
      unlocked: (state.totalStats?.vocabCount || 0) >= 20,
      claimed: state.claimedBadgeIds.includes("badge_vocab_master"),
    },
    {
      id: "badge_streak_7",
      title: "Chiến Binh Kiên Trì 🔥",
      description: "Duy trì Streak liên tục 7 ngày",
      icon: "Flame",
      category: "streak",
      target: 7,
      current: Math.min(7, state.streak),
      xpReward: 150,
      unlocked: state.streak >= 7,
      claimed: state.claimedBadgeIds.includes("badge_streak_7"),
    },
    {
      id: "badge_level_5",
      title: "Siêu Cấp Thăng Tiến ⚡",
      description: "Đạt mốc Level 3 trong lộ trình",
      icon: "Trophy",
      category: "level",
      target: 3,
      current: Math.min(3, levelInfo.level),
      xpReward: 100,
      unlocked: levelInfo.level >= 3,
      claimed: state.claimedBadgeIds.includes("badge_level_5"),
    },
  ];

  // Dynamic Leaderboard Calculation
  const leaderboard: LeaderboardUser[] = useMemo(() => {
    const currentUserDisplayName = profile?.full_name || user?.user_metadata?.full_name || "Bạn";
    const currentUserAvatar = profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;

    const currentUserEntry: Omit<LeaderboardUser, "rank"> = {
      id: userId,
      name: `${currentUserDisplayName} (Bạn)`,
      avatar: currentUserAvatar,
      xp: state.xp,
      streak: state.streak,
      isCurrentUser: true,
    };

    const combined = [currentUserEntry];

    return combined.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [state.xp, state.streak, profile, user, userId]);

  const currentUserRank = useMemo(() => {
    return leaderboard.find(u => u.isCurrentUser)?.rank || 1;
  }, [leaderboard]);

  const leagueTitle = useMemo(() => {
    if (state.xp >= 500) return { name: "Giải Kim Cương 💎", color: "text-sky-500 bg-sky-50 border-sky-300" };
    if (state.xp >= 300) return { name: "Giải Vàng 🥇", color: "text-amber-500 bg-amber-50 border-amber-300" };
    if (state.xp >= 150) return { name: "Giải Bạc 🥈", color: "text-slate-600 bg-slate-100 border-slate-300" };
    return { name: "Giải Đồng 🥉", color: "text-orange-600 bg-orange-50 border-orange-300" };
  }, [state.xp]);

  return {
    xp: state.xp,
    streak: state.streak,
    streakShields: state.streakShields || 0,
    levelInfo,
    quests,
    badges,
    leaderboard,
    currentUserRank,
    leagueTitle,
    addXp,
    checkInStreak,
    recordDictationProgress,
    recordVocabProgress,
    claimQuest,
    claimBadge,
    openChestReward,
  };
};
