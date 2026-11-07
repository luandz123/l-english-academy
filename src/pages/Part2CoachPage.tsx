import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import { Part2Cluster, Part2StepId } from '@/types/part2Coach';
import { PART2_CLUSTERS, PART2_STEPS_META } from '@/data/part2CoachData';
import { Part2HubView, getCleanClusterInfo } from '@/components/part2/Part2HubView';
import { Part2Stepper } from '@/components/part2/Part2Stepper';
import { Part2Step1Diagnostic } from '@/components/part2/Part2Step1Diagnostic';
import { Part2Step2Chunks } from '@/components/part2/Part2Step2Chunks';
import { Part2Step3ReflexQ } from '@/components/part2/Part2Step3ReflexQ';
import { Part2Step4ReflexA } from '@/components/part2/Part2Step4ReflexA';
import { Part2Step5Shadowing } from '@/components/part2/Part2Step5Shadowing';
import { Part2Step7ExamMode } from '@/components/part2/Part2Step7ExamMode';
import { Part2Step8LoopPlayer } from '@/components/part2/Part2Step8LoopPlayer';
import { Part2ClusterSelector } from '@/components/part2/Part2ClusterSelector';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ArrowRight, CheckCircle2, Layers, ChevronLeft } from 'lucide-react';
import { useSound } from '@/hooks/useSound';
import { useAuth } from '@/hooks/useAuth';
import { useGamification, XP_REWARDS } from '@/hooks/useGamification';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import { useListeningStepProgress } from '@/hooks/useListeningStepProgress';

const Part2CoachPage: React.FC = () => {
  const { clusterId: paramClusterId, quizId, courseId } = useParams();
  const clusterId = paramClusterId || quizId;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { playSound } = useSound();
  const { user } = useAuth();
  const { addXp } = useGamification();

  const basePrefix = '/part2-coach';

  // If clusterId is specified in URL, open that cluster. If not, show Hub.
  const [activeCluster, setActiveCluster] = useState<Part2Cluster | null>(() => {
    if (clusterId) {
      return PART2_CLUSTERS.find((c) => c.id === clusterId) || PART2_CLUSTERS[0];
    }
    return null;
  });

  const { getProgress, saveProgress, isLoaded: progressLoaded } = useListeningStepProgress();

  const loadClusterProgress = (_userId: string | undefined, cId: string) => {
    const p = getProgress(cId);
    if (p.updatedAt === 0 && p.completedSteps.length === 0) return null;
    return {
      completedSteps: p.completedSteps as Part2StepId[],
      currentStep: p.currentStep as Part2StepId,
      hasReceivedClusterXp: p.hasReceivedClusterXp,
      finishedOnServer: p.finishedOnServer,
    };
  };

  const saveClusterProgress = (
    _userId: string | undefined,
    cId: string,
    completed: Part2StepId[],
    step: Part2StepId,
    hasReceivedXp?: boolean
  ) => saveProgress(cId, completed, step, { hasReceivedClusterXp: hasReceivedXp });

  const stepParam = parseInt(searchParams.get('step') || '1', 10);
  const initialStep = (stepParam >= 1 && stepParam <= 7 ? stepParam : 1) as Part2StepId;

  const [currentStep, setCurrentStep] = useState<Part2StepId>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<Part2StepId>>(new Set());
  const [step1Diagnostics, setStep1Diagnostics] = useState<Record<number, { guess: 'A' | 'B' | 'C'; rating: number }>>({});
  const [isClusterModalOpen, setIsClusterModalOpen] = useState(false);
  // Bước vừa xong: hiện thẻ chúc mừng ngắn + giới thiệu bước sau thay vì tự nhảy bước
  const [justCompletedStep, setJustCompletedStep] = useState<Part2StepId | null>(null);

  // Load saved progress for active cluster
  useEffect(() => {
    if (!activeCluster?.id) {
      setCompletedSteps(new Set());
      return;
    }
    const saved = loadClusterProgress(user?.id, activeCluster.id);
    const stepInUrl = parseInt(searchParams.get('step') || '', 10);
    const completedSet = new Set(saved?.completedSteps || []);
    const suggestedStep = (PART2_STEPS_META.find((s) => !completedSet.has(s.id))?.id || 1) as Part2StepId;

    let targetStep: Part2StepId;
    if (stepInUrl >= 1 && stepInUrl <= PART2_STEPS_META.length) {
      targetStep = stepInUrl as Part2StepId;
    } else if (saved?.completedSteps && saved.completedSteps.length > 0) {
      targetStep = suggestedStep;
    } else {
      targetStep = saved?.currentStep || 1;
    }

    setCompletedSteps(completedSet);
    setCurrentStep(targetStep);

    if (!stepInUrl || stepInUrl !== targetStep) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('step', String(targetStep));
        return next;
      }, { replace: true });
    }
  }, [activeCluster?.id, user?.id]);

  // Tiến độ trên server về sau (máy khác đã học): gộp thêm các bước đã xong
  useEffect(() => {
    if (!activeCluster?.id || !progressLoaded) return;
    const merged = getProgress(activeCluster.id).completedSteps as Part2StepId[];
    setCompletedSteps((prev) => {
      if (merged.every((s) => prev.has(s))) return prev;
      return new Set([...prev, ...merged]);
    });
  }, [activeCluster?.id, progressLoaded, getProgress]);

  // Sync step from URL searchParams
  useEffect(() => {
    const s = parseInt(searchParams.get('step') || '1', 10);
    if (s >= 1 && s <= 7 && s !== currentStep) {
      setCurrentStep(s as Part2StepId);
    }
  }, [searchParams]);

  // Sync with URL clusterId
  useEffect(() => {
    if (clusterId) {
      const found = PART2_CLUSTERS.find((c) => c.id === clusterId);
      if (found) {
        setActiveCluster(found);
      }
    } else {
      setActiveCluster(null);
    }
  }, [clusterId]);

  // Clean audio on unmount or cluster switch
  useEffect(() => {
    return () => {
      soundAudioPlayer.stop();
    };
  }, [activeCluster?.id]);

  const handleStepSelect = (stepId: Part2StepId) => {
    soundAudioPlayer.stop();
    setCurrentStep(stepId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', String(stepId));
      return next;
    });
    if (activeCluster?.id) {
      saveClusterProgress(user?.id, activeCluster.id, Array.from(completedSteps), stepId);
    }
  };

  const handleSelectClusterFromHub = (cluster: Part2Cluster) => {
    soundAudioPlayer.stop();
    setActiveCluster(cluster);
    setStep1Diagnostics({});
    const saved = loadClusterProgress(user?.id, cluster.id);
    const completedSet = new Set(saved?.completedSteps || []);
    const suggestedStep = (PART2_STEPS_META.find((s) => !completedSet.has(s.id))?.id || 1) as Part2StepId;
    const targetStep = (saved?.completedSteps && saved.completedSteps.length > 0)
      ? suggestedStep
      : (saved?.currentStep || 1);
    setCompletedSteps(completedSet);
    setCurrentStep(targetStep);
    navigate(`${basePrefix}/${cluster.id}?step=${targetStep}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHub = () => {
    soundAudioPlayer.stop();
    setActiveCluster(null);
    navigate(basePrefix);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepComplete = (stepId: Part2StepId) => {
    playSound('correct');
    const nextCompleted = new Set([...completedSteps, stepId]);
    setCompletedSteps(nextCompleted);

    const nextStep = (stepId < 7 ? stepId + 1 : stepId) as Part2StepId;
    if (activeCluster?.id) {
      saveClusterProgress(user?.id, activeCluster.id, Array.from(nextCompleted), nextStep);
    }

    if (stepId < 7) {
      soundAudioPlayer.stop();
      setJustCompletedStep(stepId);
    }
  };

  const goToNextStepAfterComplete = () => {
    if (!justCompletedStep) return;
    const nextStep = (justCompletedStep + 1) as Part2StepId;
    setJustCompletedStep(null);
    handleStepSelect(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishAll = () => {
    const nextCompleted = new Set([...completedSteps, 7 as Part2StepId]);
    setCompletedSteps(nextCompleted);
    if (activeCluster?.id) {
      const existing = loadClusterProgress(user?.id, activeCluster.id);
      // Đã nhận ở máy này hoặc đã xong bài ở máy khác (server ghi completed_at) thì không cộng lại
      const alreadyClaimed = existing?.hasReceivedClusterXp || existing?.finishedOnServer;
      if (!alreadyClaimed) {
        addXp(XP_REWARDS.PART2_CLUSTER_COMPLETE, "Hoàn thành bài luyện nghe từng bước!");
      }
      saveClusterProgress(user?.id, activeCluster.id, Array.from(nextCompleted), 7, true);
    }
    setIsClusterModalOpen(true);
  };

  const activeClusterIndex = activeCluster ? PART2_CLUSTERS.findIndex(c => c.id === activeCluster.id) : 0;
  const cleanActiveTitle = activeCluster ? getCleanClusterInfo(activeCluster, activeClusterIndex >= 0 ? activeClusterIndex : 0).formattedTitle : '';

  return (
    <StudentLayout>
      <div className="pb-20 pt-2 px-3 sm:px-6 max-w-6xl mx-auto space-y-4 sm:space-y-5 font-sans">
        {/* If no cluster selected: show Hub View */}
        {!activeCluster ? (
          <Part2HubView onSelectCluster={handleSelectClusterFromHub} />
        ) : (
          /* Bài đang học: 7 bước */
          <div className="space-y-4 sm:space-y-5">
            {/* Sticky Compact 1-Row Header & Slim Dot Stepper */}
            <div className="sticky top-16 z-30 bg-[#070e1c]/95 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3 sm:px-4 sm:py-3 shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToHub}
                    className="h-8 px-2 rounded-xl text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-1 font-bold text-xs cursor-pointer"
                    title="Quay lại danh sách bài"
                    aria-label="Quay lại danh sách bài"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Danh sách bài</span>
                  </Button>

                  <div className="h-4 w-px bg-border shrink-0" />

                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-foreground truncate">
                      {cleanActiveTitle}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-xs font-black uppercase tracking-wider shrink-0 hidden md:inline">
                      {activeCluster.questions.length} câu
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClusterModalOpen(true)}
                  className="h-8 px-3 rounded-xl font-bold border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 hover:bg-purple-50 text-xs shrink-0 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 mr-1" />
                  Đổi bài ({activeCluster.questions.length} câu)
                </Button>
              </div>

              {/* Stepper Dot Line */}
              <Part2Stepper
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepSelect={handleStepSelect}
                clusterId={activeCluster.id}
              />
            </div>

            {/* Step Content Render Area */}
            <div className="transition-all duration-200">
              {currentStep === 1 && (
                <Part2Step1Diagnostic
                  questions={activeCluster.questions}
                  onCompleteStep={() => handleStepComplete(1)}
                  onSaveDiagnostics={setStep1Diagnostics}
                />
              )}

              {currentStep === 2 && (
                <Part2Step2Chunks
                  questions={activeCluster.questions}
                  onCompleteStep={() => handleStepComplete(2)}
                />
              )}

              {currentStep === 3 && (
                <Part2Step3ReflexQ
                  questions={activeCluster.questions}
                  onCompleteStep={() => handleStepComplete(3)}
                />
              )}

              {currentStep === 4 && (
                <Part2Step4ReflexA
                  questions={activeCluster.questions}
                  onCompleteStep={() => handleStepComplete(4)}
                />
              )}

              {currentStep === 5 && (
                <Part2Step5Shadowing
                  questions={activeCluster.questions}
                  onCompleteStep={() => handleStepComplete(5)}
                />
              )}

              {currentStep === 6 && (
                <Part2Step7ExamMode
                  questions={activeCluster.questions}
                  step1Diagnostics={step1Diagnostics}
                  onCompleteStep={() => handleStepComplete(6)}
                />
              )}

              {currentStep === 7 && (
                <Part2Step8LoopPlayer
                  questions={activeCluster.questions}
                  onFinishAllSteps={handleFinishAll}
                />
              )}
            </div>

            {/* Global Minimal Shortcut Indicator Bar (Phong cách Bàn học) */}
            <div className="hidden md:flex items-center justify-center gap-3 py-2 text-[11px] text-muted-foreground/80 font-medium">
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Space</kbd>
                Phát / Dừng
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">R</kbd>
                Nghe lại
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">← / →</kbd>
                Đổi câu
              </span>
            </div>

            {/* Thẻ "Xong bước" */}
            <Dialog open={justCompletedStep !== null} onOpenChange={(open) => !open && setJustCompletedStep(null)}>
              <DialogContent className="max-w-sm rounded-3xl text-center">
                {justCompletedStep !== null && (() => {
                  const doneMeta = PART2_STEPS_META[justCompletedStep - 1];
                  const nextMeta = PART2_STEPS_META[justCompletedStep];
                  const doneCount = completedSteps.size;
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
                          Bạn đã đi được {doneCount}/{PART2_STEPS_META.length} bước của bài này.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="flex items-center gap-1" aria-hidden="true">
                        {PART2_STEPS_META.map((st) => (
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
                        <Button
                          variant="outline"
                          onClick={() => setJustCompletedStep(null)}
                          className="h-11 flex-1 rounded-xl font-bold text-xs"
                        >
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

            {/* Cluster Selection Modal */}
            <Part2ClusterSelector
              isOpen={isClusterModalOpen}
              onOpenChange={setIsClusterModalOpen}
              selectedClusterId={activeCluster.id}
              onSelectCluster={(cluster) => {
                soundAudioPlayer.stop();
                setActiveCluster(cluster);
                const saved = loadClusterProgress(user?.id, cluster.id);
                const nextStep = saved?.currentStep || 1;
                setCompletedSteps(new Set(saved?.completedSteps || []));
                setCurrentStep(nextStep);
                setStep1Diagnostics({});
                setIsClusterModalOpen(false);
                navigate(`${basePrefix}/${cluster.id}?step=${nextStep}`);
              }}
            />
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default Part2CoachPage;
