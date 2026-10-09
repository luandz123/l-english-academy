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
  Play,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import iconReflex from '@/assets/icons/icon-reflex.webp';
import iconDictation from '@/assets/icons/icon-dictation-3d.webp';
import iconFulltest from '@/assets/icons/icon-fulltest-3d.webp';

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
      const key = `lenglish_part2_progress_v2_${user?.id || 'guest'}_${clusterId}`;
      let raw = localStorage.getItem(key);
      if (!raw) {
        raw = localStorage.getItem(`lenglish_part2_progress_v1_${user?.id || 'guest'}_${clusterId}`);
      }
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
    if (activeSourceTab === 'fulltest' && cluster.sourceType !== 'fulltest') return false;
    if (activeSourceTab === 'dictation' && cluster.sourceType !== 'dictation') return false;

    if (selectedStemType !== 'all') {
      const hasStemType = cluster.questions.some(
        (q) => q.questionStem.type === selectedStemType
      );
      if (!hasStemType) return false;
    }

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

  // Calculate overall stats
  const totalQuestions = PART2_CLUSTERS.reduce((acc, c) => acc + c.questions.length, 0);
  const finishedClustersCount = PART2_CLUSTERS.filter((c) => getClusterProgress(c.id).isFinished).length;

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. Hero Showcase Banner - Đồng điệu với Trang Chủ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/90 via-[#09122a]/95 to-slate-900 border border-purple-500/30 p-6 sm:p-7 text-white shadow-[0_10px_35px_rgba(0,0,0,0.4)] backdrop-blur-md">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          {/* Left Title & Summary */}
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-black uppercase tracking-wider backdrop-blur-xs border border-purple-400/30">
              <img src={iconReflex} alt="" className="w-4 h-4 object-contain inline-block" />
              <span>Quy trình 7 bước Part 2</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white font-display tracking-tight leading-snug">
              Huấn Luyện Phản Xạ Nghe <span className="text-purple-400">TOEIC Part 2</span>
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
              Bẻ nhỏ Functional Chunks • Phản xạ Hỏi &amp; Đáp • Shadowing 2 lượt chuẩn xác • Luyện đề tự do kiểu Full Test.
            </p>
          </div>

          {/* Right Stats & Audio Tester */}
          <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2.5 shrink-0 w-full sm:w-auto">
            {/* Quick Stats Pill */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl text-xs font-bold text-white/90">
              <span className="text-purple-300">{PART2_CLUSTERS.length} cụm</span>
              <span>•</span>
              <span className="text-amber-300">{totalQuestions} câu</span>
              <span>•</span>
              <span className="text-emerald-400">{finishedClustersCount} xong</span>
            </div>

            {/* Compact Audio Tester Button */}
            <Button
              size="sm"
              onClick={handleTestAudio}
              disabled={isPlayingAudioTest}
              className={cn(
                'rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer h-9 px-3.5',
                audioTestSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md'
              )}
            >
              {isPlayingAudioTest ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping mr-1.5" />
                  Đang phát...
                </>
              ) : audioTestSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-white" />
                  Loa tốt
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 mr-1 text-purple-300" />
                  Nghe thử loa
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Compact 7-Step Workflow Strip (Gọn gàng thay vì box to tướng) */}
      <div className="bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl p-3 sm:px-4 sm:py-3 shadow-soft-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Lộ trình 7 bước huấn luyện
          </span>
          <span className="text-muted-foreground text-[11px] hidden sm:inline">
            Tự động theo từng câu
          </span>
        </div>

        {/* 7-Step Badges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 text-xs">
          {PART2_STEPS_META.map((step) => (
            <div
              key={step.id}
              className="px-2 py-1.5 rounded-xl border border-border/60 bg-muted/30 flex items-center gap-1.5 min-w-0"
              title={`${step.name} - ${step.subtitle}`}
            >
              <span className="w-4 h-4 rounded-md bg-purple-600/15 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black text-[10px] shrink-0">
                {step.id}
              </span>
              <span className="font-bold text-foreground truncate text-[11px]">
                {step.shortName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Toolbar: Source Tabs, Filter & Search (Gọn gàng trong 1 hàng trên desktop) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Source Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-2xl overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveSourceTab('all')}
              className={cn(
                'px-3 py-1.5 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5',
                activeSourceTab === 'all'
                  ? 'bg-card text-foreground shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tất cả</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
                {PART2_CLUSTERS.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSourceTab('fulltest')}
              className={cn(
                'px-3 py-1.5 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5',
                activeSourceTab === 'fulltest'
                  ? 'bg-card text-indigo-600 dark:text-indigo-400 shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FileCheck2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Đề ETS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
                {fulltestCount}
              </span>
            </button>

            <button
              onClick={() => setActiveSourceTab('dictation')}
              className={cn(
                'px-3 py-1.5 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5',
                activeSourceTab === 'dictation'
                  ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Headphones className="w-3.5 h-3.5 text-emerald-500" />
              <span>Dictation</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
                {dictationCount}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm cụm đề, câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        {/* Stem Type Filter Horizontal Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-muted-foreground font-bold shrink-0 flex items-center gap-1 text-[11px] mr-1">
            <Filter className="w-3 h-3" />
            Dạng:
          </span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'wh-question', label: 'Wh- Questions' },
            { id: 'yes-no', label: 'Yes/No' },
            { id: 'request-offer', label: 'Yêu cầu (Can/Could)' },
            { id: 'choice-or', label: 'Lựa chọn (Or)' },
            { id: 'tag-question', label: 'Câu hỏi đuôi' },
            { id: 'statement', label: 'Trần thuật' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedStemType(type.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer text-[11px]',
                selectedStemType === type.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Clusters Grid - Chuẩn phong cách CourseCard của Trang Chủ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClusters.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-card border border-border rounded-2xl p-6 space-y-2.5 shadow-soft-xs">
            <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <h4 className="text-sm font-black text-foreground">Không tìm thấy cụm bài</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Thử xóa bớt bộ lọc hoặc gõ từ khóa khác để tìm kiếm.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveSourceTab('all');
                setSearchQuery('');
                setSelectedStemType('all');
              }}
              className="rounded-xl text-xs font-bold cursor-pointer"
            >
              Xóa bộ lọc
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
                className="group p-4 sm:p-5 rounded-2xl border border-border/70 bg-card hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200 flex flex-col justify-between space-y-3.5 cursor-pointer relative overflow-hidden active:scale-[0.99]"
              >
                {/* Header Row: Badge nguồn + Trạng thái */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-[10px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider',
                        isFulltest
                          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      )}
                    >
                      {cluster.testSource}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {progress.isFinished ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Đã xong
                        </span>
                      ) : progress.completedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Flame className="w-3 h-3" /> {progress.completedCount}/{PART2_STEPS_META.length}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {cluster.difficulty}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm sm:text-base font-extrabold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
                    {cluster.title}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {cluster.description}
                  </p>

                  {/* Progress Line */}
                  <div className="w-full bg-muted/60 h-1 rounded-full overflow-hidden mt-1.5">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        progress.isFinished
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600'
                      )}
                      style={{
                        width: `${Math.max(
                          progress.completedCount > 0 ? 10 : 0,
                          Math.round((progress.completedCount / PART2_STEPS_META.length) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Question Stem Badges Preview */}
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-1 flex-wrap">
                    {cluster.questions.slice(0, 4).map((q) => (
                      <span
                        key={q.id}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/15"
                      >
                        {q.questionStem.text.slice(0, 14)}
                      </span>
                    ))}
                    {cluster.questions.length > 4 && (
                      <span className="text-[10px] font-bold text-muted-foreground">
                        +{cluster.questions.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Action Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      <Headphones className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      {cluster.questions.length} câu
                    </span>

                    <span className="text-xs font-black text-purple-600 dark:text-purple-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      {progress.isFinished ? (
                        <>
                          <span>Luyện lại</span>
                          <RotateCcw className="w-3 h-3" />
                        </>
                      ) : progress.completedCount > 0 ? (
                        <>
                          <span>Tiếp tục</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>Vào học</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
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
