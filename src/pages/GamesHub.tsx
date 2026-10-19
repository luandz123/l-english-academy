import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import { 
  Gamepad2, 
  Rocket, 
  Swords, 
  Sparkles, 
  Flame, 
  Trophy, 
  Zap, 
  Users, 
  HelpCircle, 
  Volume2, 
  Shield, 
  BookOpen, 
  ArrowRight, 
  Bot,
  Search,
  Gift,
  ShoppingBag,
  Settings,
  LogOut,
  Home,
  LayoutGrid,
  Clock,
  Coins,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Menu,
  X,
  Target,
  Briefcase,
  DollarSign,
  Plane,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGamification } from '@/hooks/useGamification';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getHomepageShowcaseConfig,
  DEFAULT_ARCADE_SECTION,
  resolveGameAvatar,
  ARCADE_THEME_STYLES,
} from '@/services/homepageShowcaseService';
import { WordShooterTutorialModal } from '@/components/game/WordShooter/WordShooterTutorialModal';
import { WordShooterLeaderboardModal } from '@/components/game/WordShooter/WordShooterLeaderboardModal';
import { MysteryChestModal } from '@/components/MysteryChestModal';
import { DEFAULT_VOCAB_TOPICS } from '@/components/game/WordShooter/defaultVocabPacks';
import { getPlayerRank, formatRankInfo } from '@/services/wordShooterRankService';
import { cn } from '@/lib/utils';

export default function GamesHub() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { xp, streak } = useGamification();

  // Modals state
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isChestModalOpen, setIsChestModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [heroSlide, setHeroSlide] = useState(0);

  // Player Rank
  const playerRank = getPlayerRank();
  const rankInfo = formatRankInfo(playerRank);

  // Homepage / Arcade config from Supabase
  const { data: showcaseConfig } = useQuery({
    queryKey: ['homepage-showcase-config'],
    queryFn: () => getHomepageShowcaseConfig(),
  });
  const arcadeSection = showcaseConfig?.arcade_section || DEFAULT_ARCADE_SECTION;

  // Filter & sort games based on search & admin order
  const filteredGames = useMemo(() => {
    const list = [...arcadeSection.games].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (g) =>
        g.title.toLowerCase().includes(term) ||
        g.description.toLowerCase().includes(term) ||
        g.badge.toLowerCase().includes(term)
    );
  }, [arcadeSection.games, searchTerm]);

  // Display user info
  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Học Viên VIP';
  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || 'learner'}`;

  // Fake / simulated social activity feed
  const recentActivities = [
    { id: 1, name: 'John Amir', action: 'vừa mua vật phẩm', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=70&auto=format&fit=crop&q=80', online: false },
    { id: 2, name: 'Jeremy Ward', action: 'vừa thắng đấu hạng +1 ⭐', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=70&auto=format&fit=crop&q=80', online: false },
    { id: 3, name: 'Francos Br.', action: 'online', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=70&auto=format&fit=crop&q=80', online: true },
    { id: 4, name: 'Goo Abbas', action: 'vừa nạp 20 từ TOEIC', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=70&auto=format&fit=crop&q=80', online: true },
    { id: 5, name: 'Martin C', action: 'online', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=70&auto=format&fit=crop&q=80', online: true },
  ];

  // Quick topics icons
  const TOPIC_ICON_MAP: Record<string, { icon: any; color: string }> = {
    'toeic-basic': { icon: Target, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    'business': { icon: Briefcase, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    'hr': { icon: Users, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
    'finance': { icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    'travel': { icon: Plane, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
    'communication': { icon: MessageCircle, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
  };

  return (
    <StudentLayout>
      <div className="w-full max-w-[1600px] mx-auto space-y-6 select-none font-sans">
        {/* ===================================================================== */}
        {/* TOP HEADER BAR: SEARCH INPUT & XP/GOLD CURRENCY PILL                   */}
        {/* ===================================================================== */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search game input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm trò chơi, bộ từ vựng..."
              className="w-full bg-[#0c1427]/90 border border-slate-800/90 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 shadow-inner transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* XP & Currency Pill Badge + Quick Mystery Chest */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              onClick={() => setIsChestModalOpen(true)}
              title="Mở Rương May Mắn Hàng Ngày"
              className="px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Gift className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">Rương Quà</span>
            </button>

            <div className="px-4 py-2 rounded-2xl bg-[#0e172a] border border-slate-800/90 shadow-soft-xs flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-xs">
                🪙
              </span>
              <span className="text-xs font-black text-amber-300">
                {xp.toLocaleString()} XP
              </span>
              <span className="text-slate-600 font-bold">/</span>
              <span className="text-xs font-extrabold text-amber-400">
                {(xp * 5).toLocaleString()} Gold
              </span>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* TWO-COLUMN COCKPIT: MAIN GAME HUB + RIGHT STATS & SOCIAL SIDEBAR       */}
        {/* ===================================================================== */}
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          {/* MAIN COCKPIT SECTION */}
          <div className="flex-1 min-w-0 w-full space-y-6">

        {/* ===================================================================== */}
        {/* HERO LIQUID WAVE BANNER                                              */}
        {/* ===================================================================== */}
        <div className="relative overflow-hidden rounded-3xl border border-fuchsia-500/30 p-6 sm:p-9 md:p-10 shadow-[0_10px_35px_rgba(0,0,0,0.6)] bg-[#0d0722]">
          {/* Neon Swirl Background Waves */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-950/80 via-slate-950/80 to-blue-950/80 pointer-events-none" />
          
          {/* Glowing Silk Swirl Visuals */}
          <div className="absolute -top-16 -right-16 w-[420px] h-[420px] bg-gradient-to-br from-fuchsia-500/30 via-purple-600/20 to-cyan-400/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-16 -left-16 w-[360px] h-[360px] bg-gradient-to-tr from-cyan-500/30 via-indigo-600/20 to-pink-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Abstract Silk SVG Swirl Lines */}
          <svg
            className="absolute inset-0 w-full h-full opacity-40 pointer-events-none mix-blend-screen"
            preserveAspectRatio="none"
            viewBox="0 0 1000 300"
          >
            <path
              d="M0,150 C300,50 400,250 700,100 C850,20 950,200 1000,120 L1000,300 L0,300 Z"
              fill="url(#silkGradient)"
            />
            <defs>
              <linearGradient id="silkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d946ef" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
              </linearGradient>
            </defs>
          </svg>

          {/* Banner Content */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight uppercase font-display">
                {arcadeSection.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                {arcadeSection.description}
              </p>
            </div>

            <Button
              onClick={() => navigate('/games/word-shooter')}
              className="py-3 px-6 rounded-2xl font-black text-xs text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_20px_rgba(6,182,212,0.45)] inline-flex items-center gap-2 shrink-0 self-start md:self-auto cursor-pointer transition-all active:scale-95"
            >
              <span>{arcadeSection.view_all_text || "Vào đấu trường Game"}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Carousel Dots */}
          <div className="relative z-10 flex items-center justify-center gap-2 pt-6">
            <span
              onClick={() => setHeroSlide(0)}
              className={cn(
                "h-2 rounded-full transition-all cursor-pointer",
                heroSlide === 0 ? "w-6 bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]" : "w-2 bg-slate-600 hover:bg-slate-400"
              )}
            />
            <span
              onClick={() => setHeroSlide(1)}
              className={cn(
                "h-2 rounded-full transition-all cursor-pointer",
                heroSlide === 1 ? "w-6 bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]" : "w-2 bg-slate-600 hover:bg-slate-400"
              )}
            />
            <span
              onClick={() => setHeroSlide(2)}
              className={cn(
                "h-2 rounded-full transition-all cursor-pointer",
                heroSlide === 2 ? "w-6 bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]" : "w-2 bg-slate-600 hover:bg-slate-400"
              )}
            />
          </div>
        </div>

        {/* ===================================================================== */}
        {/* ROW 2: BENTO GRID 3 MAIN CARDS (WORD DEFENSE, SKY STRIKE, VOCAB PACKS)*/}
        {/* ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {filteredGames
            .filter((g) => g.is_active || !g.hide_when_inactive)
            .map((game) => {
              const avatarSrc = resolveGameAvatar(game.avatar_url);
              const theme = ARCADE_THEME_STYLES[game.theme_color || 'cyan'];

              if (!game.is_active) {
                return (
                  <div
                    key={game.id}
                    className="rounded-3xl border border-slate-700/80 bg-[#071329]/75 p-6 flex flex-col justify-between space-y-4 shadow-soft-xs opacity-75 grayscale-[20%]"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800/90 border border-slate-700 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                          <img src={avatarSrc} alt={game.title} className="w-full h-full object-contain drop-shadow opacity-75" />
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          🔒 TẠM BẢO TRÌ
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base sm:text-lg font-black text-slate-300 font-display">
                          {game.title}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium line-clamp-3 leading-relaxed">
                          {game.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">{game.footer_tag}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          toast({
                            title: `🔒 Trò chơi "${game.title}" đang tạm tắt`,
                            description: 'Game đang được bảo trì hoặc cập nhật tính năng mới. Vui lòng quay lại sau nhé!',
                          })
                        }
                        className="py-2 px-4 rounded-xl font-black text-xs text-slate-400 bg-slate-800 border border-slate-700 cursor-not-allowed h-9"
                      >
                        🔒 Tạm Khóa
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={game.id}
                  className={cn(
                    "group rounded-3xl border-2 bg-[#0c1626]/95 p-6 flex flex-col justify-between space-y-4 transition-all duration-300 shadow-2xl relative overflow-hidden",
                    theme.border,
                    theme.borderHover,
                    theme.shadowHover
                  )}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div
                        className={cn(
                          "w-16 h-16 rounded-2xl p-1.5 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0 border overflow-hidden",
                          theme.avatarBg,
                          theme.avatarBorder,
                          theme.avatarShadow
                        )}
                      >
                        <img
                          src={avatarSrc}
                          alt={game.title}
                          className="w-full h-full object-contain drop-shadow"
                        />
                      </div>
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                          theme.badgeBg,
                          theme.badgeText,
                          theme.badgeBorder
                        )}
                      >
                        {game.badge}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3
                        className={cn(
                          "text-base sm:text-lg font-black text-white transition-colors font-display leading-snug",
                          theme.titleHover
                        )}
                      >
                        {game.title}
                      </h3>
                      <p className="text-xs text-slate-300 font-medium line-clamp-3 leading-relaxed">
                        {game.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">{game.footer_tag}</span>
                    <button
                      type="button"
                      onClick={() => navigate(game.action_url)}
                      className={cn(
                        "py-2 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r inline-flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg",
                        theme.buttonGradient,
                        theme.buttonShadow
                      )}
                    >
                      <span>{game.action_text}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* ===================================================================== */}
        {/* ROW 3: BOTTOM 3-COLUMN LAUNCHPAD (SKY STRIKE, 4 MODES, 5 TOPICS)     */}
        {/* ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch pt-2">
          {/* COL A: SKY STRIKE HERO BOX (col-span-12 lg:col-span-4) */}
          <div className="lg:col-span-4 rounded-3xl border border-cyan-500/30 bg-[#0a1224]/90 p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚀</span>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  PHI CƠ DIỆT TỪ VỰNG
                </h3>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300 font-display">
                SKY STRIKE VOCAB
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Rèn luyện tốc độ gõ phím và phản xạ ghi nhớ từ vựng TOEIC đỉnh cao. Bắn hạ từ rơi tự do bằng tia Laser, kích hoạt phát âm chuẩn bản xứ!
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                onClick={() => navigate('/games/word-shooter')}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs py-5 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer active:scale-95"
              >
                <Rocket className="w-4 h-4 mr-2" />
                VÀO CHIẾN GAME NGAY
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsLeaderboardOpen(true)}
                  className="w-full border-amber-500/30 bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 font-bold text-xs py-4 rounded-xl cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  Bảng Xếp Hạng
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsTutorialOpen(true)}
                  className="w-full border-cyan-500/30 bg-slate-900/60 hover:bg-slate-800 text-cyan-300 font-bold text-xs py-4 rounded-xl cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                  Hướng Dẫn
                </Button>
              </div>
            </div>
          </div>

          {/* COL B: 4 CHẾ ĐỘ CHƠI SẴN SÀNG (col-span-12 lg:col-span-4) */}
          <div className="lg:col-span-4 rounded-3xl border border-slate-800 bg-[#0a1224]/90 p-5 sm:p-6 flex flex-col justify-between space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                4 Chế Độ Chơi Sẵn Sàng
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2.5 flex-1">
              {/* Mode 1: Solo */}
              <div
                onClick={() => navigate('/games/word-shooter')}
                className="p-3 rounded-2xl border border-border/80 bg-[#070e1c] hover:border-cyan-500/60 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-1.5">
                  <span className="text-xl">🚀</span>
                  <h4 className="text-xs sm:text-sm font-black text-white">1. Đấu Đơn</h4>
                  <p className="text-xs text-cyan-400 font-bold leading-tight">Vượt Wave + Săn Kỷ Lục</p>
                </div>
                <div className="pt-2 flex justify-end">
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* Mode 2: Casual */}
              <div
                onClick={() => navigate('/games/word-shooter')}
                className="p-3 rounded-2xl border border-border/80 bg-[#070e1c] hover:border-blue-500/60 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-1.5">
                  <span className="text-xl">⚔️</span>
                  <h4 className="text-xs sm:text-sm font-black text-white">2. Đấu Thường</h4>
                  <p className="text-xs text-blue-400 font-bold leading-tight">Giao hữu 1v1 - Không rank</p>
                </div>
                <div className="pt-2 flex justify-end">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* Mode 3: Ranked (Gold glowing) */}
              <div
                onClick={() => navigate('/games/word-shooter')}
                className="p-3 rounded-2xl border-2 border-amber-500/70 bg-gradient-to-b from-amber-950/30 to-[#070e1c] hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between shadow-[0_0_15px_rgba(245,158,11,0.2)] group"
              >
                <div className="space-y-1.5">
                  <span className="text-xl">👑</span>
                  <h4 className="text-xs font-black text-amber-300">4. Đấu Hạng</h4>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-black">
                    +1 RANK
                  </span>
                </div>
                <div className="pt-2 flex justify-end">
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </div>

          {/* COL C: 5 BỘ TỪ VỰNG CHUẨN THỰC CHIẾN (col-span-12 lg:col-span-4) */}
          <div className="lg:col-span-4 rounded-3xl border border-slate-800 bg-[#0a1224]/90 p-5 sm:p-6 flex flex-col justify-between space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                5 Bộ Từ Vựng Chuẩn Thực Chiến
              </h3>
            </div>

            {/* 6 Grid Tiles for Topics */}
            <div className="grid grid-cols-3 gap-2.5 flex-1">
              {DEFAULT_VOCAB_TOPICS.slice(0, 6).map((topic) => {
                const iconInfo = TOPIC_ICON_MAP[topic.id] || { icon: BookOpen, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
                const IconComponent = iconInfo.icon;

                return (
                  <div
                    key={topic.id}
                    onClick={() => navigate('/games/word-shooter')}
                    className="p-2.5 rounded-2xl bg-[#070e1c] border border-border/70 hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 group"
                  >
                    <div className={cn("w-8 h-8 rounded-xl border flex items-center justify-center text-sm group-hover:scale-110 transition-transform", iconInfo.color)}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-200 line-clamp-1">
                      {topic.name.replace(/^[0-9.]+\s*/, '')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. RIGHT SIDEBAR (USER PROFILE, RANK STATS & SOCIAL ACTIVITY FEED)       */}
      {/* ========================================================================= */}
      <aside className="w-full xl:w-[320px] 2xl:w-[340px] shrink-0 space-y-4">
        {/* User Profile Header */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-3xl bg-[#0b1222] border border-slate-800 shadow-xl">
          <div className="relative">
            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-cyan-400 via-indigo-500 to-fuchsia-500 shadow-md">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full rounded-full object-cover bg-slate-950"
              />
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black text-white truncate">{displayName}</h4>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Trạng thái: Trực tuyến</span>
            </div>
          </div>
        </div>

        {/* Gamification Stats Card */}
        <div className="p-4 rounded-3xl bg-[#0b1222] border border-slate-800 space-y-3.5 shadow-xl">
          {/* Rank info */}
          <div
            onClick={() => setIsLeaderboardOpen(true)}
            className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 cursor-pointer hover:bg-amber-500/20 transition-all shadow-md group"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
              {rankInfo.icon}
            </div>
            <div>
              <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                Hạng Liên Quân
              </span>
              <p className="text-sm font-black text-amber-200">
                {rankInfo.tierNameVi} {rankInfo.divisionRoman}
              </p>
            </div>
          </div>

          {/* XP & Streak details */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-base text-cyan-400">⚡</span>
                <span className="text-xs font-bold text-slate-300">KINH NGHIỆM</span>
              </div>
              <span className="text-sm font-black text-cyan-400">{xp.toLocaleString()} XP</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-base text-rose-400">🔥</span>
                <span className="text-xs font-bold text-slate-300">CHUỖI NGÀY HỌC</span>
              </div>
              <span className="text-sm font-black text-rose-400">{streak} ngày</span>
            </div>
          </div>
        </div>

        {/* Hoạt động gần đây (Recent Activities) */}
        <div className="space-y-3 p-4 rounded-3xl bg-[#0b1222] border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-black text-slate-200 tracking-wider uppercase">
              Hoạt động gần đây
            </h4>
            <span className="text-xs text-cyan-400 font-bold">5 bạn bè</span>
          </div>

          <div className="space-y-2.5">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={act.avatar}
                      alt={act.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700"
                    />
                    {act.online && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-slate-950" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-200 truncate">{act.name}</p>
                    <p className="text-xs text-slate-400 truncate">{act.action}</p>
                  </div>
                </div>
                {act.online ? (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    online
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">vừa xong</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Learning Wave Chart */}
        <div className="p-4 rounded-3xl bg-[#0b1222] border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wider">
              Nhịp Độ Học Tập Tuần
            </span>
            <span className="text-xs font-bold text-fuchsia-400">+15% tuần này</span>
          </div>

          {/* SVG Sine Wave Graph with Glowing Node */}
          <div className="relative py-2">
            <svg className="w-full h-14 overflow-visible" viewBox="0 0 280 50">
              <defs>
                <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
                  <stop offset="60%" stopColor="#d946ef" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="waveFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 10 40 C 45 42, 70 25, 100 32 C 130 38, 160 10, 190 18 C 220 25, 245 35, 270 28"
                fill="none"
                stroke="url(#waveGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M 10 40 C 45 42, 70 25, 100 32 C 130 38, 160 10, 190 18 C 220 25, 245 35, 270 28 L 270 50 L 10 50 Z"
                fill="url(#waveFill)"
              />
              {/* Highlight active glowing node on Wednesday/Today */}
              <circle cx="190" cy="18" r="5" fill="#f43f5e" className="animate-pulse" />
              <circle cx="190" cy="18" r="9" fill="#f43f5e" opacity="0.35" />
            </svg>

            {/* Days labels */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 pt-1">
              <span>Sat</span>
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span className="px-2 py-0.5 rounded-full bg-fuchsia-500 text-white font-black text-xs shadow-[0_0_10px_rgba(217,70,239,0.5)]">
                Wed
              </span>
              <span>Thu</span>
              <span>Fri</span>
            </div>
          </div>
        </div>
      </aside>
    </div>

    {/* ========================================================================= */}
    {/* MODALS                                                                   */}
    {/* ========================================================================= */}
    <WordShooterTutorialModal
      isOpen={isTutorialOpen}
      onClose={() => setIsTutorialOpen(false)}
      onComplete={() => navigate('/games/word-shooter')}
    />

    <WordShooterLeaderboardModal
      isOpen={isLeaderboardOpen}
      onClose={() => setIsLeaderboardOpen(false)}
    />

    <MysteryChestModal
      isOpen={isChestModalOpen}
      onClose={() => setIsChestModalOpen(false)}
    />
  </div>
</StudentLayout>
  );
}
