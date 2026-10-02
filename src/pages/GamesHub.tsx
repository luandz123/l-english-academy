import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import { 
  Gamepad2, 
  Rocket, 
  Castle, 
  Puzzle, 
  Swords, 
  Car, 
  Sparkles, 
  Flame, 
  Trophy, 
  Zap, 
  Users, 
  Star, 
  Clock, 
  ChevronRight, 
  ShieldCheck,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGamification } from '@/hooks/useGamification';
import { cn } from '@/lib/utils';

interface GameItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  category: 'vocab' | 'grammar' | 'speed' | 'pvp';
  icon: string;
  iconBg: string;
  description: string;
  tags: string[];
  route?: string;
  isAvailable: boolean;
  playerCount?: string;
  difficulty?: string;
}

const GAMES_LIST: GameItem[] = [
  {
    id: 'word-shooter',
    title: 'Phi Cơ Diệt Từ Vựng',
    subtitle: 'Sky Strike Vocab 2.0',
    badge: 'HOT • NÂNG CẤP 2.0',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    category: 'vocab',
    icon: '🚀',
    iconBg: 'from-blue-600 to-cyan-600',
    description: 'Lái chiến đấu cơ bắn nổ từ vựng đang rơi bằng cách gõ phím. Tích hợp đọc phát âm chuẩn TTS, popup nghĩa nổ, vật phẩm hồi máu, đóng băng và chế độ Đấu Online 2 người!',
    tags: ['Từ vựng phản xạ', 'Đấu Online PvP', 'Audio TTS', 'Vật phẩm đặc biệt'],
    route: '/games/word-shooter',
    isAvailable: true,
    playerCount: '2.5k+ lượt chơi',
    difficulty: 'Dễ • Vừa • Khó',
  },
  {
    id: 'word-defense',
    title: 'Word Defense: Cuộc Chiến Khu Vườn',
    subtitle: 'Plants vs. Zombies Vocab Defense',
    badge: 'MỚI RA MẮT • PVZ STYLE',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    category: 'vocab',
    icon: '🌻',
    iconBg: 'from-emerald-600 to-green-700',
    description: 'Bảo vệ khu vườn 5 làn trước quái vật bằng cách gõ từ vựng triệu hồi Đậu Thần, Băng Tiễn, Quả Óc Chó, Bom Anh Đào. Gõ giải mã Khiên quái, Mặt Trời và Đấu PvP 2 người!',
    tags: ['Thủ thành PvZ', 'Gõ phím triệu hồi', 'Khắc chế Khiên', 'Đấu Online 2 người'],
    route: '/games/word-defense',
    isAvailable: true,
    playerCount: '1.8k+ lượt chơi',
    difficulty: 'Dễ • Vừa • Khó',
  },
  {
    id: 'word-match-blitz',
    title: 'Nối Từ Siêu Tốc',
    subtitle: 'Word Match Blitz',
    badge: 'SẮP RA MẮT',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    category: 'speed',
    icon: '🧩',
    iconBg: 'from-emerald-600 to-teal-600',
    description: 'Thử thách nối từ tiếng Anh với nghĩa tiếng Việt tương ứng dưới áp lực đếm ngược 60 giây. Càng nhanh combo càng bùng nổ điểm số!',
    tags: ['Nối từ', 'Tốc độ 60s', 'Ghi nhớ nhanh'],
    isAvailable: false,
    playerCount: 'Đang phát triển',
    difficulty: 'Nhanh tay lẹ mắt',
  },
  {
    id: 'grammar-arena',
    title: 'Đấu Trường Ngữ Pháp',
    subtitle: 'Grammar Duel 1v1',
    badge: 'SẮP RA MẮT',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    category: 'pvp',
    icon: '⚔️',
    iconBg: 'from-rose-600 to-orange-600',
    description: 'Võ đài tranh tài trực tiếp giữa 2 học viên: Giải nhanh các câu hỏi ngữ pháp TOEIC/IELTS để tích luỹ sát thương đánh bại đối thủ.',
    tags: ['Đấu 1v1 Realtime', 'Ngữ pháp TOEIC', 'Leo Rank'],
    isAvailable: false,
    playerCount: 'Đang phát triển',
    difficulty: 'Đấu trí 1v1',
  },
  {
    id: 'spelling-racer',
    title: 'Đua Xe Chính Tả',
    subtitle: 'Nitro Spelling Racer',
    badge: 'SẮP RA MẮT',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    category: 'speed',
    icon: '🏎️',
    iconBg: 'from-amber-600 to-red-600',
    description: 'Lái siêu xe đua tốc độ bằng cách nghe phát âm và gõ chính xác chính tả từ vựng để kích hoạt Nitro tăng tốc về đích.',
    tags: ['Nghe chính tả', 'Đua xe Nitro', 'WPM Challenge'],
    isAvailable: false,
    playerCount: 'Đang phát triển',
    difficulty: 'Nghe & Gõ nhanh',
  }
];

export default function GamesHub() {
  const navigate = useNavigate();
  const { xp, streak, levelInfo } = useGamification();
  const [activeFilter, setActiveFilter] = useState<'all' | 'vocab' | 'grammar' | 'speed' | 'pvp'>('all');

  const filteredGames = GAMES_LIST.filter((game) => {
    if (activeFilter === 'all') return true;
    return game.category === activeFilter;
  });

  const featuredGame = GAMES_LIST[0]; // Phi cơ diệt từ vựng

  return (
    <StudentLayout>
      <div className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-8 select-none">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-b from-card via-card/95 to-background p-6 md:p-10 shadow-soft-sm">
          {/* Ambient lighting */}
          <div className="absolute top-0 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black tracking-wider uppercase">
                <Gamepad2 className="w-4 h-4 text-primary animate-pulse" />
                L-English Game Arcade Center
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
                KHU TRÒ CHƠI HỌC TẬP <br />
                <span className="text-gradient">
                  GAMIFIED LEARNING ZONE
                </span>
              </h1>

              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Biến những giờ học từ vựng và ngữ pháp khô khan thành những trận chiến gay cấn. Rèn luyện phản xạ siêu tốc, tranh tài leo bảng xếp hạng cùng bạn bè!
              </p>
            </div>

            {/* User Gamification Stats Summary Card */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 p-4 rounded-2xl bg-card border border-border/80 shadow-soft-sm shrink-0 w-full sm:w-auto md:min-w-[200px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-lg">
                  ⚡
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kinh nghiệm</span>
                  <p className="text-base font-black text-amber-600 dark:text-amber-400">{xp.toLocaleString()} XP</p>
                </div>
              </div>

              <div className="h-px bg-border/60 hidden sm:block md:block" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold text-lg">
                  🔥
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chuỗi ngày học</span>
                  <p className="text-base font-black text-rose-600 dark:text-rose-400">{streak} ngày liên tiếp</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 mt-8 pt-6 border-t border-border/70 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'Tất cả trò chơi', icon: Gamepad2 },
              { id: 'vocab', label: 'Từ vựng & Phản xạ', icon: Rocket },
              { id: 'grammar', label: 'Ngữ pháp TOEIC', icon: Castle },
              { id: 'speed', label: 'Tốc độ & WPM', icon: Zap },
              { id: 'pvp', label: 'Đấu đối kháng 1v1', icon: Swords },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap shadow-sm select-none cursor-pointer active:scale-95",
                    isSelected
                      ? "bg-primary text-primary-foreground font-black shadow-soft-sm"
                      : "bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Featured Big Card: Phi Cơ Diệt Từ Vựng */}
        {activeFilter === 'all' || activeFilter === 'vocab' ? (
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/5 via-card to-purple-500/5 p-6 md:p-8 backdrop-blur-md shadow-soft-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/30">
                    {featuredGame.badge}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                    {featuredGame.playerCount}
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-foreground flex items-center gap-3">
                    <span className="text-3xl">{featuredGame.icon}</span>
                    <span>{featuredGame.title}</span>
                  </h2>
                  <p className="text-xs font-bold text-primary tracking-wider uppercase font-mono mt-0.5">
                    {featuredGame.subtitle}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {featuredGame.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {featuredGame.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-muted/60 border border-border/60 text-xs font-medium text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Play Button */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
                <Button
                  onClick={() => navigate('/games/word-shooter')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm px-8 py-6 rounded-2xl shadow-soft-sm transition-all duration-120 active:scale-95 cursor-pointer"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  VÀO CHƠI NGAY
                </Button>

                <p className="text-xs text-muted-foreground text-center font-medium">
                  Hỗ trợ cả Solo &amp; Đấu Realtime 2 người
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Other Games List (Available & Coming Soon) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Tất Cả Trò Chơi ({filteredGames.length})
            </h2>
            <span className="text-xs text-muted-foreground font-bold">
              Đang tiếp tục phát triển thêm các trò chơi mới
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGames.map((game) => {
              return (
                <div
                  key={game.id}
                  className={cn(
                    "relative p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between select-none shadow-soft-sm",
                    game.isAvailable
                      ? "bg-card border-border/80 hover:border-primary/60 hover:shadow-soft-md hover:-translate-y-1 cursor-pointer"
                      : "bg-muted/30 border-border/50 opacity-80"
                  )}
                  onClick={() => {
                    if (game.isAvailable && game.route) {
                      navigate(game.route);
                    }
                  }}
                >
                  <div className="space-y-3">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/70 flex items-center justify-center text-2xl shadow-soft-xs">
                        {game.icon}
                      </div>

                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border",
                          game.badgeColor || "bg-muted text-muted-foreground border-border/60"
                        )}
                      >
                        {game.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-foreground tracking-tight">
                        {game.title}
                      </h3>
                      <p className="text-xs font-bold text-muted-foreground">
                        {game.subtitle}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {game.description}
                    </p>
                  </div>

                  {/* Bottom details & action */}
                  <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-medium text-muted-foreground uppercase block tracking-wider">Trạng thái</span>
                      <span className="text-xs font-bold text-foreground">
                        {game.playerCount}
                      </span>
                    </div>

                    {game.isAvailable ? (
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-soft-xs active:scale-95"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (game.route) navigate(game.route);
                        }}
                      >
                        Chơi ngay
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    ) : (
                      <span className="px-3 py-1 rounded-xl bg-muted/60 text-muted-foreground border border-border/60 text-xs font-bold">
                        Đang làm
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
