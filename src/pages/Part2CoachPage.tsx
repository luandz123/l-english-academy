import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import type { Part2Cluster } from '@/types/part2Coach';
import { LISTENING_UNITS, findListeningUnit, progressKeyOf } from '@/data/listeningUnits';
import { getFlow } from '@/data/listeningFlows';
import { Part2HubView, getCleanClusterInfo } from '@/components/part2/Part2HubView';
import { Part2Stepper } from '@/components/part2/Part2Stepper';
import { Part2Step3ReflexQ } from '@/components/part2/Part2Step3ReflexQ';
import { Part2Step4ReflexA } from '@/components/part2/Part2Step4ReflexA';
import { Part2ClusterSelector } from '@/components/part2/Part2ClusterSelector';
import { AttemptStep } from '@/components/listening/AttemptStep';
import { VocabStep } from '@/components/listening/VocabStep';
import { QuestionStudyStep } from '@/components/listening/QuestionStudyStep';
import { SentenceStudyStep } from '@/components/listening/SentenceStudyStep';
import { ShadowingStep, type ShadowItem } from '@/components/listening/ShadowingStep';
import { ReviewStep } from '@/components/listening/ReviewStep';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ArrowRight, CheckCircle2, Layers, ChevronLeft } from 'lucide-react';
import { useSound } from '@/hooks/useSound';
import { useAuth } from '@/hooks/useAuth';
import { useGamification, XP_REWARDS } from '@/hooks/useGamification';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import { useListeningStepProgress } from '@/hooks/useListeningStepProgress';
import { readAttempts, saveAttempt, type UnitAttempts } from '@/lib/listeningAttempts';
import { buildPassageSentences } from '@/lib/listeningText';

/** Câu để nhại theo ở mỗi Part (D17). */
function buildShadowItems(unit: Part2Cluster): ShadowItem[] {
  if (unit.part === 'part3' || unit.part === 'part4') {
    const q0 = unit.questions[0];
    return buildPassageSentences(q0?.transcriptText, q0?.passageTranslation).map((s, i) => ({
      key: s.key,
      text: s.text,
      translation: s.translation,
      label: s.speaker ?? `Câu ${i + 1}`,
      tab: String(i + 1),
    }));
  }
  if (unit.part === 'part1') {
    return unit.questions.map((q) => ({
      key: `${q.id}`,
      text: q.correctChoice.text,
      translation: q.correctChoice.translation,
      label: `Câu ${q.questionNumber} · Câu mô tả đúng (${q.correctChoice.letter})`,
      tab: `Câu ${q.questionNumber}`,
      imageUrl: q.imageUrl,
    }));
  }
  return unit.questions.flatMap((q) => [
    {
      key: `${q.id}-q`,
      text: q.questionText,
      translation: q.questionTranslation,
      label: `Câu ${q.questionNumber} · Câu hỏi`,
      tab: `${q.questionNumber}·Hỏi`,
    },
    {
      key: `${q.id}-a`,
      text: q.correctChoice.text,
      translation: q.correctChoice.translation,
      label: `Câu ${q.questionNumber} · Đáp án (${q.correctChoice.letter})`,
      tab: `${q.questionNumber}·Đáp`,
    },
  ]);
}

const Part2CoachPage: React.FC = () => {
  const { clusterId: paramClusterId, quizId } = useParams();
  const clusterId = paramClusterId || quizId;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { playSound } = useSound();
  const { user } = useAuth();
  const { addXp } = useGamification();

  const basePrefix = '/part2-coach';

  // Có mã bài trên URL thì mở bài đó, không thì hiện trang danh sách bài
  const [activeCluster, setActiveCluster] = useState<Part2Cluster | null>(() =>
    clusterId ? findListeningUnit(clusterId) ?? LISTENING_UNITS[0] : null,
  );
  const flow = useMemo(() => getFlow(activeCluster?.part), [activeCluster?.part]);
  const totalSteps = flow.length;

  const { getProgress, saveProgress, isLoaded: progressLoaded } = useListeningStepProgress();

  const stepParam = parseInt(searchParams.get('step') || '1', 10);
  const [currentStep, setCurrentStep] = useState<number>(stepParam >= 1 && stepParam <= totalSteps ? stepParam : 1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState<UnitAttempts>({});
  const [isClusterModalOpen, setIsClusterModalOpen] = useState(false);
  // Bước vừa xong: hiện thẻ chúc mừng ngắn + giới thiệu bước sau thay vì tự nhảy bước
  const [justCompletedStep, setJustCompletedStep] = useState<number | null>(null);

  const suggestedStepFor = (unit: Part2Cluster) => {
    const p = getProgress(unit);
    const unitFlow = getFlow(unit.part);
    if (p.completedSteps.length > 0) {
      return unitFlow.find((s) => !p.completedSteps.includes(s.id))?.id ?? 1;
    }
    return p.currentStep || 1;
  };

  // Mở bài: nạp tiến độ, kết quả làm thử và bước cần học
  useEffect(() => {
    if (!activeCluster) {
      setCompletedSteps(new Set());
      return;
    }
    const p = getProgress(activeCluster);
    const stepInUrl = parseInt(searchParams.get('step') || '', 10);
    const unitTotal = getFlow(activeCluster.part).length;
    const targetStep = stepInUrl >= 1 && stepInUrl <= unitTotal ? stepInUrl : suggestedStepFor(activeCluster);

    setCompletedSteps(new Set(p.completedSteps));
    setCurrentStep(targetStep);
    setAttempts(readAttempts(user?.id, progressKeyOf(activeCluster)));

    if (!stepInUrl || stepInUrl !== targetStep) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('step', String(targetStep));
        return next;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCluster?.id, user?.id]);

  // Tiến độ trên server về sau (máy khác đã học): gộp thêm các bước đã xong
  useEffect(() => {
    if (!activeCluster || !progressLoaded) return;
    const merged = getProgress(activeCluster).completedSteps;
    setCompletedSteps((prev) => (merged.every((s) => prev.has(s)) ? prev : new Set([...prev, ...merged])));
  }, [activeCluster, progressLoaded, getProgress]);

  // Đồng bộ bước theo URL
  useEffect(() => {
    const s = parseInt(searchParams.get('step') || '1', 10);
    if (s >= 1 && s <= totalSteps && s !== currentStep) setCurrentStep(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Đồng bộ bài theo URL; mã bài cũ của Part 3/4 (trước khi tách đoạn) chuyển sang đoạn đầu
  useEffect(() => {
    if (!clusterId) {
      setActiveCluster(null);
      return;
    }
    const found = findListeningUnit(clusterId);
    if (!found) return;
    setActiveCluster(found);
    if (found.id !== clusterId) navigate(`${basePrefix}/${found.id}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId]);

  useEffect(() => () => soundAudioPlayer.stop(), [activeCluster?.id]);

  const handleStepSelect = (stepId: number) => {
    soundAudioPlayer.stop();
    setCurrentStep(stepId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', String(stepId));
      return next;
    });
    if (activeCluster) void saveProgress(activeCluster, Array.from(completedSteps), stepId);
  };

  const openUnit = (unit: Part2Cluster) => {
    soundAudioPlayer.stop();
    setActiveCluster(unit);
    const target = suggestedStepFor(unit);
    setCompletedSteps(new Set(getProgress(unit).completedSteps));
    setCurrentStep(target);
    navigate(`${basePrefix}/${unit.id}?step=${target}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHub = () => {
    const part = activeCluster?.part || 'part2';
    soundAudioPlayer.stop();
    setActiveCluster(null);
    navigate(`${basePrefix}?part=${part}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepComplete = (stepId: number) => {
    playSound('correct');
    const nextCompleted = new Set([...completedSteps, stepId]);
    setCompletedSteps(nextCompleted);
    const nextStep = stepId < totalSteps ? stepId + 1 : stepId;
    if (activeCluster) void saveProgress(activeCluster, Array.from(nextCompleted), nextStep);
    if (stepId < totalSteps) {
      soundAudioPlayer.stop();
      setJustCompletedStep(stepId);
    }
  };

  const goToNextStepAfterComplete = () => {
    if (!justCompletedStep) return;
    const nextStep = justCompletedStep + 1;
    setJustCompletedStep(null);
    handleStepSelect(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishAll = () => {
    const nextCompleted = new Set([...completedSteps, totalSteps]);
    setCompletedSteps(nextCompleted);
    if (activeCluster) {
      const existing = getProgress(activeCluster);
      // Đã nhận ở máy này hoặc đã xong bài ở máy khác (server ghi completed_at) thì không cộng lại
      if (!existing.hasReceivedClusterXp && !existing.finishedOnServer) {
        addXp(XP_REWARDS.PART2_CLUSTER_COMPLETE, 'Hoàn thành bài luyện nghe từng bước!');
      }
      void saveProgress(activeCluster, Array.from(nextCompleted), totalSteps, { hasReceivedClusterXp: true });
    }
    setIsClusterModalOpen(true);
  };

  const recordAttempt = (mode: 'first' | 'final') => (r: { correct: number; total: number; at: number }) => {
    if (activeCluster) setAttempts(saveAttempt(user?.id, progressKeyOf(activeCluster), mode, r));
  };

  const activePart = activeCluster?.part ?? 'part2';
  const activePartClusters = useMemo(
    () => LISTENING_UNITS.filter((c) => (c.part ?? 'part2') === activePart),
    [activePart],
  );
  const activeClusterIndex = activeCluster ? activePartClusters.findIndex((c) => c.id === activeCluster.id) : 0;
  const cleanActiveTitle = activeCluster
    ? getCleanClusterInfo(activeCluster, activeClusterIndex >= 0 ? activeClusterIndex : 0).formattedTitle
    : '';
  const stepMeta = flow.find((s) => s.id === currentStep) ?? flow[0];
  const shadowItems = useMemo(() => (activeCluster ? buildShadowItems(activeCluster) : []), [activeCluster]);

  const renderStep = () => {
    if (!activeCluster) return null;
    const done = () => handleStepComplete(stepMeta.id);
    const nextName = flow[stepMeta.id]?.shortName;
    const props = { unit: activeCluster, howTo: stepMeta.howTo };
    switch (stepMeta.kind) {
      case 'attempt':
        return (
          <AttemptStep
            key={`${activeCluster.id}-attempt`}
            {...props}
            mode="first"
            onSubmitted={recordAttempt('first')}
            onComplete={done}
            completeLabel={nextName ? `Sang bước ${stepMeta.id + 1}: ${nextName}` : 'Xong bước này'}
          />
        );
      case 'vocab':
        return <VocabStep key={`${activeCluster.id}-vocab`} {...props} onComplete={done} />;
      case 'questions':
        return <QuestionStudyStep key={`${activeCluster.id}-q`} {...props} onComplete={done} />;
      case 'sentences':
        return <SentenceStudyStep key={`${activeCluster.id}-s`} {...props} onComplete={done} />;
      case 'reflexQ':
        return <Part2Step3ReflexQ questions={activeCluster.questions} onCompleteStep={done} />;
      case 'reflexA':
        return <Part2Step4ReflexA questions={activeCluster.questions} onCompleteStep={done} />;
      case 'shadowing':
        return <ShadowingStep key={`${activeCluster.id}-sh`} items={shadowItems} howTo={stepMeta.howTo} onComplete={done} />;
      case 'review':
        return (
          <ReviewStep
            key={`${activeCluster.id}-review`}
            {...props}
            firstResult={attempts.first}
            onSubmitted={recordAttempt('final')}
            onFinish={handleFinishAll}
          />
        );
      default:
        return null;
    }
  };

  return (
    <StudentLayout>
      <div className="pb-20 pt-2 px-3 sm:px-6 max-w-6xl mx-auto space-y-4 sm:space-y-5 font-sans">
        {!activeCluster ? (
          <Part2HubView onSelectCluster={openUnit} />
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {/* Thanh tiêu đề dính + các bước */}
            <div className="sticky top-16 z-30 bg-[#070e1c]/95 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3 sm:px-4 sm:py-3 shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToHub}
                    className="h-10 px-2 rounded-xl text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-1 font-bold text-xs"
                    title="Quay lại danh sách bài"
                    aria-label="Quay lại danh sách bài"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Danh sách bài</span>
                  </Button>
                  <div className="h-4 w-px bg-border shrink-0" />
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-foreground truncate">{cleanActiveTitle}</span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 text-xs font-black uppercase tracking-wider shrink-0 hidden md:inline">
                      {activeCluster.questions.length} câu
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClusterModalOpen(true)}
                  className="h-10 px-3 rounded-xl font-bold border-purple-800/60 text-purple-300 text-xs shrink-0"
                >
                  <Layers className="w-3.5 h-3.5 mr-1" />
                  Đổi bài
                </Button>
              </div>

              <Part2Stepper
                steps={flow}
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepSelect={handleStepSelect}
                clusterId={activeCluster.id}
              />
            </div>

            <div className="transition-all duration-200">{renderStep()}</div>

            {/* Thẻ "Xong bước" */}
            <Dialog open={justCompletedStep !== null} onOpenChange={(open) => !open && setJustCompletedStep(null)}>
              <DialogContent className="max-w-sm rounded-3xl text-center">
                {justCompletedStep !== null && (() => {
                  const doneMeta = flow[justCompletedStep - 1];
                  const nextMeta = flow[justCompletedStep];
                  return (
                    <>
                      <DialogHeader className="items-center space-y-3">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <DialogTitle className="text-lg font-black">
                          Xong bước {doneMeta.id}: {doneMeta.shortName}!
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                          Bạn đã đi được {completedSteps.size}/{totalSteps} bước của bài này.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="flex items-center gap-1" aria-hidden="true">
                        {flow.map((st) => (
                          <div
                            key={st.id}
                            className={cn('h-1.5 flex-1 rounded-full', completedSteps.has(st.id) ? 'bg-emerald-500' : 'bg-muted')}
                          />
                        ))}
                      </div>

                      {nextMeta && (
                        <div className="rounded-2xl bg-muted/50 border border-border/60 p-3 text-left space-y-1">
                          <p className="text-[11px] font-black uppercase tracking-wider text-cyan-400">
                            Tiếp theo · Bước {nextMeta.id}
                          </p>
                          <p className="text-sm font-black text-foreground">{nextMeta.name}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{nextMeta.howTo}</p>
                        </div>
                      )}

                      <div className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setJustCompletedStep(null)} className="h-11 flex-1 rounded-xl font-bold text-xs">
                          Ôn lại bước này
                        </Button>
                        <Button
                          onClick={goToNextStepAfterComplete}
                          className="h-11 flex-1 rounded-xl font-black text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                          autoFocus
                        >
                          Sang bước {nextMeta?.id} <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </DialogContent>
            </Dialog>

            <Part2ClusterSelector
              isOpen={isClusterModalOpen}
              onOpenChange={setIsClusterModalOpen}
              selectedClusterId={activeCluster.id}
              activePart={activeCluster.part ?? 'part2'}
              onSelectCluster={(cluster) => {
                setIsClusterModalOpen(false);
                openUnit(cluster);
              }}
            />
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default Part2CoachPage;
