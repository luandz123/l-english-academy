import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./useAuth";
import { useSound } from "./useSound";
import { toast } from "./use-toast";

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
  
  let title = "Tân Thủ TOEIC";
  let color = "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400";
  
  if (level >= 10) {
    title = "Huyền Thoại TOEIC 👑";
    color = "text-purple-600 bg-purple-50 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400";
  } else if (level >= 7) {
    title = "Bậc Thầy TOEIC 🌟";
    color = "text-amber-600 bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400";
  } else if (level >= 4) {
    title = "Chiến Binh TOEIC ⚔️";
    color = "text-emerald-600 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400";
  } else if (level >= 2) {
    title = "Tập Sự TOEIC 🎯";
    color = "text-indigo-600 bg-indigo-50 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-400";
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

const getTodayString = () => new Date().toISOString().split("T")[0];

const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
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
      xp: 220,
      streak: 4,
      lastActiveDate: today,
      claimedQuestsDate: today,
      questProgress: {
        dictation: 3,
        vocab: 4,
        streakDone: true,
      },
      totalStats: {
        dictationCount: 15,
        vocabCount: 18,
      },
      claimedQuestIds: [],
      claimedBadgeIds: [],
      streakShields: 1,
    };
  });

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
  const claimQuest = useCallback((questId: string, xpReward: number) => {
    if (state.claimedQuestIds.includes(questId)) return;

    setState(prev => ({
      ...prev,
      xp: prev.xp + xpReward,
      claimedQuestIds: [...prev.claimedQuestIds, questId],
    }));

    try { playSound?.("correct"); } catch { /* ignore audio error */ }

    toast({
      title: `🎁 ĐÃ NHẬN +${xpReward} XP THƯỞNG!`,
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

  // Open Mystery Chest reward
  const openChestReward = useCallback((): ChestReward => {
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
      }));
      toast({
        title: "🛡️ NHẬN 1 THẺ BẢO VỆ STREAK!",
        description: "Tự động kích hoạt nếu bạn lỡ mất 1 ngày học.",
      });
    }

    return chosen;
  }, [addXp]);

  // Computed Quests
  const quests: Quest[] = [
    {
      id: "quest_dictation",
      title: "Chiến Binh Chép Chính Tả 🎧",
      description: "Hoàn thành 5 câu luyện nghe Dictation",
      icon: "Headphones",
      current: state.questProgress.dictation,
      target: 5,
      xpReward: 50,
      claimed: state.claimedQuestIds.includes("quest_dictation"),
    },
    {
      id: "quest_vocab",
      title: "Bậc Thầy Từ Vựng 📚",
      description: "Luyện 5 từ vựng trong kho Flashcard",
      icon: "Star",
      current: state.questProgress.vocab,
      target: 5,
      xpReward: 30,
      claimed: state.claimedQuestIds.includes("quest_vocab"),
    },
    {
      id: "quest_streak",
      title: "Giữ Vững Ngọn Lửa 🔥",
      description: "Đăng nhập và hoàn thành 1 bài học bất kỳ hôm nay",
      icon: "Flame",
      current: state.questProgress.streakDone ? 1 : 0,
      target: 1,
      xpReward: 20,
      claimed: state.claimedQuestIds.includes("quest_streak"),
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
