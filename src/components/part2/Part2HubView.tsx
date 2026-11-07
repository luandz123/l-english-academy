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
import { useListeningStepProgress } from '@/hooks/useListeningStepProgress';
import iconReflex from '@/assets/icons/icon-reflex.webp';

interface Part2HubViewProps {
  onSelectCluster: (cluster: Part2Cluster) => void;
}

const STEM_TAGS: Array<[RegExp, string]> = [
  [/\(Where\)/, 'Where'],
  [/\(Who\)/, 'Who'],
  [/\(When\)/, 'When'],
  [/\(Why\)/, 'Why'],
  [/\(What\)/, 'What'],
  [/\(How\)/, 'How'],
  [/\(Which\)/, 'Which'],
  [/Giờ giấc/, 'What time'],
  [/Khoảng thời gian/, 'How long'],
  [/Tần suất/, 'How often'],
  [/Số lượng/, 'How much/many'],
  [/Mời|Lựa chọn \(Or\)/, 'Lời mời / Or'],
  [/Yêu cầu/, 'Đề nghị'],
  [/Yes\/No/, 'Yes/No'],
  [/Đuôi/, 'Câu đuôi'],
  [/trần thuật/i, 'Câu trần thuật'],
];

/** Các dạng câu hỏi có trong bài, để người học biết bài luyện gì (vd. "Where · Who · Câu trần thuật"). */
export const getClusterQuestionTypes = (cluster: Part2Cluster): string[] => {
  const tags: string[] = [];
  for (const q of cluster.questions) {
    const label = q.questionStem?.label ?? '';
    const tag = STEM_TAGS.find(([re]) => re.test(label))?.[1];
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
};

// Tên bài: "Bài 02: Where · Why · Câu trần thuật"; nguồn và phạm vi câu tách riêng
// (bài 2–6 lấy từ bài điền từ, bài 7+ từ đề Fulltest nên số câu có thể trùng nhau giữa các nguồn)
export const getCleanClusterInfo = (cluster: Part2Cluster, index: number) => {
  const padIndex = String(index + 1).padStart(2, '0');

  const fulltest = cluster.title.match(/^Đề Thi Fulltest (\d+):\s*(.*)$/i);
  const dictation = cluster.title.match(/^Điền Từ Part 2 - Cụm \d+:\s*(.*)$/i);
  const rest = (fulltest?.[2] ?? dictation?.[1] ?? cluster.title).trim();
  const isRangeOnly = /^Câu \d+\s*[–-]\s*\d+$/i.test(rest);

  const types = getClusterQuestionTypes(cluster);
  const topic = isRangeOnly ? types.slice(0, 3).join(' · ') || rest : rest;
  const formattedTitle = `Bài ${padIndex}: ${topic}`;

  const sourceName = fulltest ? `Đề Fulltest ${fulltest[1]}` : 'Bài nghe điền từ';
  const sourceLabel = isRangeOnly ? `${sourceName} · ${rest}` : sourceName;

  // Clean description removing any "Trích từ ..." prefix
  const cleanDescription = cluster.description
    .replace(/^Trích từ[^.]*\.\s*/i, '')
    .trim();

  return {
    sequentialNumber: index + 1,
    formattedTitle,
    sourceLabel,
    questionTypes: types,
    cleanDescription,
  };
};

export const Part2HubView: React.FC<Part2HubViewProps> = ({ onSelectCluster }) => {
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

  const { getProgress } = useListeningStepProgress();
  const getClusterProgress = (clusterId: string) => {
    const p = getProgress(clusterId);
    return {
      completedCount: p.completedSteps.length,
      isFinished: p.isFinished,
      currentStep: p.currentStep,
      completedSteps: p.completedSteps,
      updatedAt: p.updatedAt,
    };
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
  const progressById = useMemo(
    () => Object.fromEntries(PART2_CLUSTERS.map((c) => [c.id, getClusterProgress(c.id)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getProgress]
  );
  const finishedClustersCount = PART2_CLUSTERS.filter((c) => progressById[c.id]?.isFinished).length;
  const overallPercent = Math.round((finishedClustersCount / Math.max(1, PART2_CLUSTERS.length)) * 100);

  // "Học tiếp": bài đang dở được mở gần nhất; nếu chưa có thì bài đầu tiên chưa xong
  const resumeCluster = useMemo(() => {
    const inProgress = orderedClusters
      .filter((c) => {
        const p = progressById[c.id];
        return p && !p.isFinished && p.completedCount > 0;
      })
      .sort((x, y) => (progressById[y.id]?.updatedAt ?? 0) - (progressById[x.id]?.updatedAt ?? 0));
    return inProgress[0] ?? orderedClusters.find((c) => !progressById[c.id]?.isFinished) ?? null;
  }, [orderedClusters, progressById]);
  const resumeProgress = resumeCluster ? progressById[resumeCluster.id] : null;
  const resumeStepMeta = resumeProgress
    ? PART2_STEPS_META.find((st) => !resumeProgress.completedSteps.includes(st.id)) ?? PART2_STEPS_META[0]
    : PART2_STEPS_META[0];
  const recommendedId = orderedClusters.find((c) => !progressById[c.id]?.isFinished)?.id;
  const minQ = Math.min(...PART2_CLUSTERS.map((c) => c.questions.length));
  const maxQ = Math.max(...PART2_CLUSTERS.map((c) => c.questions.length));

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. Giới thiệu ngắn + Học tiếp */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/90 via-[#09122a]/95 to-slate-900 border border-purple-500/30 p-5 sm:p-7 text-white shadow-[0_10px_35px_rgba(0,0,0,0.4)] backdrop-blur-md">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-2.5 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-black uppercase tracking-wider border border-purple-400/30">
              <img src={iconReflex} alt="" className="w-4 h-4 object-contain inline-block" />
              <span>TOEIC Part 2 · Hỏi &amp; Đáp</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight leading-tight">
              Luyện Nghe <span className="text-purple-400">Từng Bước</span>
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
              Mỗi bài {minQ === maxQ ? minQ : `${minQ}–${maxQ}`} câu hỏi – đáp, học qua 7 bước ngắn. Độ khó tăng dần từ cơ bản đến nâng cao.
            </p>

            {/* Lộ trình 7 bước: người mới nhìn là biết sẽ làm gì */}
            <ol className="flex flex-wrap gap-1.5 pt-1" aria-label="7 bước của mỗi bài">
              {PART2_STEPS_META.map((st) => (
                <li
                  key={st.id}
                  title={st.description}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/10 pl-1 pr-2.5 py-0.5 text-[11px] font-bold text-slate-200"
                >
                  <span className="w-4.5 h-4.5 min-w-[18px] rounded-full bg-purple-500/40 text-white text-[10px] font-black flex items-center justify-center">
                    {st.id}
                  </span>
                  {st.shortName}
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col gap-3 w-full lg:w-72">
            {/* Tiến độ chung */}
            <div className="rounded-2xl bg-white/10 border border-white/15 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-200">Đã xong {finishedClustersCount}/{PART2_CLUSTERS.length} bài</span>
                <span className="text-slate-400">{totalQuestions} câu</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </div>

            {resumeCluster && (
              <Button
                onClick={() => onSelectCluster(resumeCluster)}
                className="h-12 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm justify-between px-4 cursor-pointer"
              >
                <span className="flex flex-col items-start leading-tight min-w-0">
                  <span>{resumeProgress && resumeProgress.completedCount > 0 ? 'Học tiếp' : 'Bắt đầu học'}</span>
                  <span className="text-[11px] font-bold text-slate-900/70 truncate max-w-[200px]">
                    Bài {String(resumeCluster.info.sequentialNumber).padStart(2, '0')} · Bước {resumeStepMeta.id}: {resumeStepMeta.shortName}
                  </span>
                </span>
                <ArrowRight className="w-5 h-5 shrink-0" />
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleTestAudio}
              disabled={isPlayingAudioTest}
              className={cn(
                'rounded-xl font-bold text-xs transition-all cursor-pointer h-10 px-3.5',
                audioTestSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
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
                  Kiểm tra loa trước khi học
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
                'px-3 sm:px-4 min-h-10 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5',
                selectedPart === 'part1'
                  ? 'bg-card text-purple-600 dark:text-purple-400 shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <BookOpen className="w-4 h-4" />
              <span className="whitespace-nowrap">Part 1<span className="hidden sm:inline"> (Mô tả tranh)</span></span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPart('part2')}
              className={cn(
                'px-3 sm:px-4 min-h-10 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2',
                selectedPart === 'part2'
                  ? 'bg-card text-purple-600 dark:text-purple-400 shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="whitespace-nowrap">Part 2<span className="hidden sm:inline"> (Hỏi &amp; Đáp)</span></span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-black">
                {PART2_CLUSTERS.length} bài
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPart('part3')}
              className={cn(
                'px-3 sm:px-4 min-h-10 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5',
                selectedPart === 'part3'
                  ? 'bg-card text-purple-600 dark:text-purple-400 shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="whitespace-nowrap">Part 3<span className="hidden sm:inline"> (Hội thoại)</span></span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPart('part4')}
              className={cn(
                'px-3 sm:px-4 min-h-10 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5',
                selectedPart === 'part4'
                  ? 'bg-card text-purple-600 dark:text-purple-400 shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Radio className="w-4 h-4" />
              <span className="whitespace-nowrap">Part 4<span className="hidden sm:inline"> (Bài nói)</span></span>
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
              const progress = progressById[cluster.id] ?? { completedCount: 0, isFinished: false, completedSteps: [] as number[] };
              const isFinished = progress.isFinished;
              const isStarted = !isFinished && progress.completedCount > 0;
              const isRecommended = !isFinished && !isStarted && cluster.id === recommendedId;
              const totalSteps = PART2_STEPS_META.length;

              return (
                <button
                  type="button"
                  key={cluster.id}
                  onClick={() => onSelectCluster(cluster)}
                  className={cn(
                    'group text-left bg-card hover:bg-accent/30 rounded-2xl p-4 sm:p-5 shadow-soft-sm hover:shadow-soft-md transition-all duration-200 flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden active:scale-[0.99] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60',
                    isFinished
                      ? 'border-emerald-500/30'
                      : isStarted
                      ? 'border-blue-500/40'
                      : isRecommended
                      ? 'border-amber-400/50'
                      : 'border-transparent'
                  )}
                >
                  <div className="space-y-2 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-muted-foreground truncate">{cluster.info.sourceLabel}</span>
                      {isFinished ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành
                        </span>
                      ) : isStarted ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full shrink-0">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          Đang học {progress.completedCount}/{totalSteps}
                        </span>
                      ) : isRecommended ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full shrink-0">
                          <Sparkles className="w-3.5 h-3.5" /> Nên học tiếp
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-sm sm:text-base font-extrabold text-foreground group-hover:text-purple-400 transition-colors line-clamp-2">
                      {cluster.info.formattedTitle}
                    </h3>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300">
                        {cluster.questions.length} câu
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                        {cluster.difficulty}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/50 w-full">
                    <div className="flex items-center gap-1" aria-hidden="true">
                      {PART2_STEPS_META.map((st) => {
                        const isStepDone = progress.completedSteps.includes(st.id);
                        return (
                          <div
                            key={st.id}
                            className={cn('h-1.5 flex-1 rounded-full', isStepDone ? 'bg-emerald-500' : 'bg-muted')}
                          />
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {isFinished
                          ? 'Đã xong cả 7 bước'
                          : isStarted
                          ? `Còn ${totalSteps - progress.completedCount} bước`
                          : 'Chưa học · 7 bước'}
                      </span>
                      <span className="font-black text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        {isFinished ? (
                          <>
                            Luyện lại <RotateCcw className="w-3 h-3 ml-0.5" />
                          </>
                        ) : isStarted ? (
                          'Học tiếp →'
                        ) : (
                          'Bắt đầu →'
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Part2HubView;
