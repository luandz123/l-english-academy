import React, { useState } from 'react';
import { Part2Cluster } from '@/types/part2Coach';
import { PART2_CLUSTERS, PART2_STEPS_META } from '@/data/part2CoachData';
import { Button } from '@/components/ui/button';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import {
  Zap,
  Headphones,
  FileCheck2,
  Layers,
  Sparkles,
  ArrowRight,
  Volume2,
  CheckCircle2,
  Search,
  Filter,
  Flame,
  ShieldCheck,
  Compass,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Part2HubViewProps {
  onSelectCluster: (cluster: Part2Cluster) => void;
}

export const Part2HubView: React.FC<Part2HubViewProps> = ({ onSelectCluster }) => {
  const { user } = useAuth();
  const [activeSourceTab, setActiveSourceTab] = useState<'all' | 'fulltest' | 'dictation'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStemType, setSelectedStemType] = useState<string>('all');
  const [isPlayingAudioTest, setIsPlayingAudioTest] = useState(false);
  const [audioTestSuccess, setAudioTestSuccess] = useState(false);

  const fulltestCount = PART2_CLUSTERS.filter((c) => c.sourceType === 'fulltest').length;
  const dictationCount = PART2_CLUSTERS.filter((c) => c.sourceType === 'dictation').length;

  const handleTestAudio = async () => {
    setIsPlayingAudioTest(true);
    setAudioTestSuccess(false);

    try {
      await soundAudioPlayer.speakText('Where was the company picnic? At a park next to a lake.', 0.95);
      setAudioTestSuccess(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlayingAudioTest(false);
    }
  };

  const getClusterProgress = (clusterId: string) => {
    try {
      const totalSteps = PART2_STEPS_META.length;
      const key = `lenglish_part2_progress_v1_${user?.id || 'guest'}_${clusterId}`;
      let raw = localStorage.getItem(key);
      if (!raw) {
        raw = localStorage.getItem(`lenglish_part2_cluster_${clusterId}_${user?.id || 'guest'}`);
      }
      if (!raw) return { completedCount: 0, isFinished: false, currentStep: 1 };
      const parsed = JSON.parse(raw);
      const completed = Array.isArray(parsed.completedSteps) ? parsed.completedSteps : [];
      const completedCount = completed.length;
      const isFinished =
        completed.includes(totalSteps) ||
        completedCount >= totalSteps ||
        !!parsed.hasReceivedClusterXp;

      return {
        completedCount,
        isFinished,
        currentStep: parsed.currentStep || 1
      };
    } catch {
      return { completedCount: 0, isFinished: false, currentStep: 1 };
    }
  };

  const filteredClusters = PART2_CLUSTERS.filter((cluster) => {
    // Filter by source
    if (activeSourceTab === 'fulltest' && cluster.sourceType !== 'fulltest') return false;
    if (activeSourceTab === 'dictation' && cluster.sourceType !== 'dictation') return false;

    // Filter by stem type
    if (selectedStemType !== 'all') {
      const hasStemType = cluster.questions.some(
        (q) => q.questionStem.type === selectedStemType
      );
      if (!hasStemType) return false;
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = cluster.title.toLowerCase().includes(q);
      const matchSource = cluster.testSource.toLowerCase().includes(q);
      const matchDesc = cluster.description.toLowerCase().includes(q);
      const matchStem = cluster.questions.some(
        (question) =>
          question.questionText.toLowerCase().includes(q) ||
          question.questionStem.text.toLowerCase().includes(q)
      );
      return matchTitle || matchSource || matchDesc || matchStem;
    }

    return true;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white p-6 sm:p-10 shadow-xl border border-indigo-700/30">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-wider text-amber-300">
            <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
            <span>Chế độ Huấn Luyện Độc Quyền</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Huấn Luyện Phản Xạ 8 Bước <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-purple-200 to-sky-300">
                TOEIC Part 2 (Hỏi &amp; Đáp)
              </span>
            </h1>
            <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-2xl font-medium">
              Không chỉ là làm đề trắc nghiệm thông thường! Hệ thống bẻ nhỏ câu hỏi theo <strong>Functional Chunks</strong>, ép não bộ <strong>bật nghĩa trong 1 giây</strong>, phản xạ câu gián tiếp, nhại giọng <strong>Shadowing nối âm</strong>, bóc trần cạm bẫy, <strong>thi thực chiến áp lực 5s</strong> và ngấm thụ động vô thức.
            </p>
          </div>

          {/* Quick Audio Tester Bar */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/30 flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5 text-purple-200" />
              </div>
              <div className="text-xs sm:text-sm">
                <p className="font-bold text-white">Kiểm tra loa &amp; âm thanh bài luyện</p>
                <p className="text-white/70 text-xs">
                  {audioTestSuccess
                    ? '✅ Âm thanh hoạt động bình thường! Chúc bạn học tốt.'
                    : 'Bấm nghe thử một câu ngắn để kiểm tra âm lượng thiết bị.'}
                </p>
              </div>
            </div>

            <Button
              onClick={handleTestAudio}
              disabled={isPlayingAudioTest}
              className="rounded-xl font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shrink-0 shadow-md"
            >
              {isPlayingAudioTest ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-900 animate-ping mr-2" />
                  Đang phát âm thanh...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1.5 fill-slate-950" />
                  Nghe Thử Âm Thanh
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 8-Step Method Infographic Grid */}
      <div className="bg-card border border-border rounded-3xl p-5 sm:p-7 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Quy trình 8 Bước Huấn Luyện Phản Xạ Chuẩn Khoa Học
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Mỗi cụm câu hỏi bạn sẽ lần lượt trải qua 8 bước hoàn chỉnh để khắc sâu phản xạ vào tiềm thức
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-2">
          {PART2_STEPS_META.map((step) => (
            <div
              key={step.id}
              className="p-3 rounded-2xl border border-border/80 bg-slate-50/50 dark:bg-zinc-900/50 space-y-1.5 flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Bước {step.id}
                </span>
                <p className="text-xs font-black text-foreground leading-snug line-clamp-2">
                  {step.name}
                </p>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 font-medium">
                {step.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Source Selector Tabs & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Source Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveSourceTab('all')}
              className={cn(
                'px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shrink-0 cursor-pointer border flex items-center gap-2',
                activeSourceTab === 'all'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              )}
            >
              <Layers className="w-4 h-4" />
              <span>Tất Cả Cụm Đề</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-white/20">
                {PART2_CLUSTERS.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSourceTab('fulltest')}
              className={cn(
                'px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shrink-0 cursor-pointer border flex items-center gap-2',
                activeSourceTab === 'fulltest'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              )}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Đề Thi Fulltest Thật (ETS)</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-white/20">
                {fulltestCount}
              </span>
            </button>

            <button
              onClick={() => setActiveSourceTab('dictation')}
              className={cn(
                'px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shrink-0 cursor-pointer border flex items-center gap-2',
                activeSourceTab === 'dictation'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              )}
            >
              <Headphones className="w-4 h-4" />
              <span>Luyện Nghe Điền Từ (Dictation)</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-white/20">
                {dictationCount}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px] md:max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo từ khóa, đề thi, câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Question Type Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-muted-foreground font-bold shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Dạng câu:
          </span>
          {[
            { id: 'all', label: 'Tất cả dạng' },
            { id: 'wh-question', label: 'Wh- Questions (Where/When/Who/Why)' },
            { id: 'yes-no', label: 'Yes/No Questions' },
            { id: 'request-offer', label: 'Đề nghị & Yêu cầu (Can/Could/Will)' },
            { id: 'choice-or', label: 'Lựa chọn (Would you like... Or)' },
            { id: 'tag-question', label: 'Câu hỏi đuôi (...right?)' },
            { id: 'statement', label: 'Câu trần thuật (Statement)' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedStemType(type.id)}
              className={cn(
                'px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all cursor-pointer border',
                selectedStemType === type.id
                  ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clusters Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClusters.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-card border border-border rounded-3xl p-8 space-y-3">
            <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <h4 className="text-lg font-black text-foreground">Không tìm thấy cụm bài phù hợp</h4>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Thử xóa bớt bộ lọc hoặc gõ từ khóa tìm kiếm khác để khám phá các cụm câu hỏi Part 2.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setActiveSourceTab('all');
                setSearchQuery('');
                setSelectedStemType('all');
              }}
              className="rounded-xl font-bold"
            >
              Xóa toàn bộ bộ lọc
            </Button>
          </div>
        ) : (
          filteredClusters.map((cluster) => {
            const isFulltest = cluster.sourceType === 'fulltest';
            const progress = getClusterProgress(cluster.id);
            return (
              <div
                key={cluster.id}
                onClick={() => onSelectCluster(cluster)}
                className="group p-5 sm:p-6 rounded-3xl border-2 border-border/80 bg-card hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-200 flex flex-col justify-between space-y-4 cursor-pointer relative overflow-hidden"
              >
                {/* Top Badge Info */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={cn(
                        'text-xs font-black uppercase px-2.5 py-1 rounded-lg border tracking-wider',
                        isFulltest
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400'
                      )}
                    >
                      {cluster.testSource}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {progress.isFinished ? (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành ✓
                        </span>
                      ) : progress.completedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                          <Flame className="w-3.5 h-3.5" /> Đã học {progress.completedCount}/{PART2_STEPS_META.length} bước
                        </span>
                      ) : null}

                      <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {cluster.difficulty}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-foreground group-hover:text-purple-600 transition-colors line-clamp-2">
                    {cluster.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground font-medium line-clamp-2 leading-relaxed">
                    {cluster.description}
                  </p>

                  {/* Progress Bar Indicator */}
                  <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        progress.isFinished ? "bg-emerald-500" : "bg-purple-600"
                      )}
                      style={{ width: `${Math.max(progress.completedCount > 0 ? 8 : 0, Math.round((progress.completedCount / PART2_STEPS_META.length) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Question Stem Badges Preview */}
                <div className="space-y-3 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {cluster.questions.map((q) => (
                      <span
                        key={q.id}
                        className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60"
                        title={q.questionText}
                      >
                        {q.questionStem.text.slice(0, 16)}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      <Headphones className="w-3.5 h-3.5 text-purple-600" />
                      {cluster.questions.length} câu hỏi
                    </span>

                    <span className="text-xs font-black text-purple-600 dark:text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {progress.isFinished
                        ? 'Ôn tập lại'
                        : progress.completedCount > 0
                        ? 'Tiếp tục'
                        : `Vào ${PART2_STEPS_META.length} bước`}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
