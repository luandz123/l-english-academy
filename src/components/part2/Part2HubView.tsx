import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Part2Cluster } from '@/types/part2Coach';
import { PART2_CLUSTERS, PART2_STEPS_META } from '@/data/part2CoachData';
import { Button } from '@/components/ui/button';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import {
  Headphones,
  Sparkles,
  ArrowRight,
  Volume2,
  CheckCircle2,
  Search,
  RotateCcw,
  BookOpen,
  Mic,
  MessageSquare,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import iconReflex from '@/assets/icons/icon-reflex.webp';

interface Part2HubViewProps {
  onSelectCluster: (cluster: Part2Cluster) => void;
}

// Clean and sequential formatter for clusters without any source/trích từ text
export const getCleanClusterInfo = (cluster: Part2Cluster, index: number) => {
  const padIndex = String(index + 1).padStart(2, '0');
  
  // Format clean sequential title: Bài 01: Nơi chốn & Người phụ trách, Bài 02: Câu 1 – 5...
  let title = cluster.title;
  title = title
    .replace(/^Điền Từ Part 2 - Cụm \d+:\s*/i, '')
    .replace(/^Đề Thi Fulltest \d+:\s*/i, '')
    .trim();

  const formattedTitle = `Bài ${padIndex}: ${title}`;
  
  // Clean description removing any "Trích từ ..." prefix
  const cleanDescription = cluster.description
    .replace(/^Trích từ[^.]*\.\s*/i, '')
    .trim();

  return {
    sequentialNumber: index + 1,
    formattedTitle,
    cleanDescription,
  };
};

export const Part2HubView: React.FC<Part2HubViewProps> = ({ onSelectCluster }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Part Filter: Part 1 | Part 2 | Part 3 | Part 4 (Part 2 active by default)
  const [selectedPart, setSelectedPart] = useState<'part1' | 'part2' | 'part3' | 'part4'>('part2');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isPlayingAudioTest, setIsPlayingAudioTest] = useState(false);
  const [audioTestSuccess, setAudioTestSuccess] = useState(false);

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
      if (!raw) return { completedCount: 0, isFinished: false, currentStep: 1, completedSteps: [] };
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
        currentStep: parsed.currentStep || 1,
        completedSteps: completed
      };
    } catch {
      return { completedCount: 0, isFinished: false, currentStep: 1, completedSteps: [] };
    }
  };

  // 25 clusters indexed and sorted in strict sequential order 1 -> 25
  const orderedClusters = useMemo(() => {
    return PART2_CLUSTERS.map((c, idx) => ({
      ...c,
      info: getCleanClusterInfo(c, idx)
    }));
  }, []);

  const filteredClusters = useMemo(() => {
    if (!searchQuery.trim()) return orderedClusters;
    const q = searchQuery.toLowerCase();
    return orderedClusters.filter((c) => {
      const matchTitle = c.info.formattedTitle.toLowerCase().includes(q);
      const matchDesc = c.info.cleanDescription.toLowerCase().includes(q);
      const matchNumber = String(c.info.sequentialNumber).includes(q);
      const matchQuestion = c.questions.some((qu) => qu.questionText.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchNumber || matchQuestion;
    });
  }, [orderedClusters, searchQuery]);

  const totalQuestions = PART2_CLUSTERS.reduce((acc, c) => acc + c.questions.length, 0);
  const finishedClustersCount = PART2_CLUSTERS.filter((c) => getClusterProgress(c.id).isFinished).length;

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. Hero Showcase Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/90 via-[#09122a]/95 to-slate-900 border border-purple-500/30 p-6 sm:p-7 text-white shadow-[0_10px_35px_rgba(0,0,0,0.4)] backdrop-blur-md">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-black uppercase tracking-wider backdrop-blur-xs border border-purple-400/30">
              <img src={iconReflex} alt="" className="w-4 h-4 object-contain inline-block" />
              <span>Luyện Nghe Chia Nhỏ</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white font-display tracking-tight leading-snug">
              Luyện Nghe Theo Phương Pháp <span className="text-purple-400">Chia Nhỏ Và Độ Khó Tăng Dần</span>
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
              Chia nhỏ bài nghe thành từng cụm 5 câu • Rèn phản xạ nghe hiểu tức thì • Tăng dần độ khó từ cơ bản đến nâng cao.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2.5 shrink-0 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl text-xs font-bold text-white/90">
              <span className="text-purple-300">{PART2_CLUSTERS.length} bài luyện</span>
              <span>•</span>
              <span className="text-amber-300">{totalQuestions} câu</span>
              <span>•</span>
              <span className="text-emerald-400">{finishedClustersCount} xong</span>
            </div>

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
                  Nghe thử âm thanh
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Bộ lọc Part: Part 1 | Part 2 | Part 3 | Part 4 */}
      <div className="bg-card rounded-2xl border border-border/70 p-4 sm:p-5 shadow-soft-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Part Selection Pills */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-2xl shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedPart('part1')}
              className={cn(
                'px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5',
                selectedPart === 'part1'
                  ? 'bg-card text-purple-600 dark:text-purple-400 shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <BookOpen className="w-4 h-4" />
              <span>Part 1 (Mô tả tranh)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPart('part2')}
              className={cn(
                'px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2',
                selectedPart === 'part2'
                  ? 'bg-card text-purple-600 dark:text-purple-400 shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Part 2 (Hỏi &amp; Đáp)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-black">
                {PART2_CLUSTERS.length} bài
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPart('part3')}
              className={cn(
                'px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5',
                selectedPart === 'part3'
                  ? 'bg-card text-purple-600 dark:text-purple-400 shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Part 3 (Hội thoại)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPart('part4')}
              className={cn(
                'px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5',
                selectedPart === 'part4'
                  ? 'bg-card text-purple-600 dark:text-purple-400 shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Radio className="w-4 h-4" />
              <span>Part 4 (Bài nói)</span>
            </button>
          </div>

          {/* Quick Search */}
          {selectedPart === 'part2' && (
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm theo số bài, từ khóa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Render Content Based on Selected Part */}
      {selectedPart !== 'part2' ? (
        /* Part 1, 3, 4 Navigation Card */
        <div className="bg-card rounded-3xl border border-border/80 p-8 sm:p-12 text-center space-y-5 shadow-soft-sm max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-soft-xs">
            {selectedPart === 'part1' && <BookOpen className="w-8 h-8" />}
            {selectedPart === 'part3' && <MessageSquare className="w-8 h-8" />}
            {selectedPart === 'part4' && <Radio className="w-8 h-8" />}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-black text-foreground">
              {selectedPart === 'part1' && 'Khóa Luyện Nghe Điền Từ Part 1 (Mô Tả Tranh)'}
              {selectedPart === 'part3' && 'Khóa Luyện Nghe Điền Từ Part 3 (Hội Thoại Ngắn)'}
              {selectedPart === 'part4' && 'Khóa Luyện Nghe Điền Từ Part 4 (Bài Nói Ngắn)'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {selectedPart === 'part1' && 'Luyện nghe chép chính tả mô tả hình ảnh, hành động nhân vật và vị trí đồ vật trong đề thi TOEIC.'}
              {selectedPart === 'part3' && 'Bắt trọn ý chính, lượt thoại người nói và rèn phản xạ nắm bắt thông tin nhanh trong cuộc trò chuyện.'}
              {selectedPart === 'part4' && 'Bóc tách thông báo, quảng cáo, tin nhắn thoại ngắn với độ chính xác cao nhất.'}
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <Button
              onClick={() => navigate('/listening')}
              className="btn-3d btn-3d-blue h-11 px-6 rounded-2xl text-xs sm:text-sm font-extrabold cursor-pointer"
            >
              Vào danh sách khóa nghe <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedPart('part2')}
              className="h-11 px-5 rounded-2xl text-xs sm:text-sm font-bold border-border cursor-pointer"
            >
              Quay lại Part 2
            </Button>
          </div>
        </div>
      ) : (
        /* Part 2: 25 Units Ordered Sequentially (Bài 01 -> Bài 25) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClusters.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-card rounded-2xl p-6 space-y-2.5 shadow-soft-xs border border-border/70">
              <Headphones className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <h4 className="text-sm font-black text-foreground">Không tìm thấy bài luyện phù hợp</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Vui lòng kiểm tra lại từ khóa tìm kiếm.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="rounded-xl text-xs font-bold cursor-pointer"
              >
                Xóa tìm kiếm
              </Button>
            </div>
          ) : (
            filteredClusters.map((cluster) => {
              const progress = getClusterProgress(cluster.id);
              const isFinished = progress.isFinished;
              const remainingSteps = 7 - progress.completedCount;
              const padIndex = String(cluster.info.sequentialNumber).padStart(2, '0');

              return (
                <div
                  key={cluster.id}
                  onClick={() => onSelectCluster(cluster)}
                  className="group bg-card hover:bg-accent/30 rounded-2xl p-5 shadow-soft-sm hover:shadow-soft-md transition-all duration-200 flex flex-col justify-between space-y-4 cursor-pointer relative overflow-hidden active:scale-[0.99] border-0"
                >
                  {/* Top Row: Clean Self-explanatory Chips & Zeigarnik Progress Badge */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      {/* Clean Chip: Bài X • Y câu • Độ khó (No source info) */}
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300">
                        Bài {padIndex} • {cluster.questions.length} câu • {cluster.difficulty.includes('650') ? 'Nâng cao (650+)' : 'Cơ bản (500+)'}
                      </span>

                      {/* Zeigarnik Progress Status */}
                      {isFinished ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 7/7 bước
                        </span>
                      ) : progress.completedCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                          {progress.completedCount}/7 bước
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
                          0/7 bước
                        </span>
                      )}
                    </div>

                    {/* Sequential Title */}
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
                        {cluster.info.formattedTitle}
                      </h3>
                    </div>
                  </div>

                  {/* Zeigarnik Micro Progress Bars (7 Segments) */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((stepNum) => {
                        const isStepDone = progress.completedSteps.includes(stepNum);
                        const isCurrentStep = !isStepDone && progress.completedCount + 1 === stepNum;
                        return (
                          <div
                            key={stepNum}
                            className={cn(
                              'h-1.5 flex-1 rounded-full transition-all duration-200',
                              isStepDone
                                ? 'bg-emerald-500'
                                : isCurrentStep
                                ? 'bg-blue-600 animate-pulse'
                                : 'bg-muted'
                            )}
                            title={`Bước ${stepNum}`}
                          />
                        );
                      })}
                    </div>

                    {/* Action Row with Exact CTA Requirements */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {isFinished
                          ? 'Đã hoàn tất toàn bộ'
                          : progress.completedCount > 0
                          ? `Còn ${remainingSteps} bước để hoàn tất`
                          : 'Sẵn sàng bắt đầu'}
                      </span>

                      {/* CTA Buttons: "Vào luyện tập →" | "Tiếp tục học →" | "Đã xong (Luyện lại)" */}
                      <span className="font-black text-purple-600 dark:text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        {isFinished ? (
                          <>
                            <span>Đã xong (Luyện lại)</span>
                            <RotateCcw className="w-3 h-3 ml-0.5" />
                          </>
                        ) : progress.completedCount > 0 ? (
                          <>
                            <span>Tiếp tục học →</span>
                          </>
                        ) : (
                          <>
                            <span>Vào luyện tập →</span>
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
      )}
    </div>
  );
};

export default Part2HubView;
