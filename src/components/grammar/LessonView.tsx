import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Volume2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { soundAudioPlayer } from "@/services/soundAudioPlayer";
import { SECTION_LABELS, getGrammarTopic, type Formula, type Lesson, type LessonSection } from "@/lib/api/grammar";

const SpeakButton: React.FC<{ text: string }> = ({ text }) => (
  <button
    type="button"
    onClick={() => void soundAudioPlayer.speakText(text)}
    className="w-9 h-9 shrink-0 rounded-lg border border-slate-700 text-cyan-300 flex items-center justify-center hover:bg-slate-800"
    aria-label="Nghe ví dụ"
  >
    <Volume2 className="w-4 h-4" />
  </button>
);

const Section: React.FC<{ id: LessonSection; highlight?: boolean; children: React.ReactNode }> = ({ id, highlight, children }) => (
  <section
    id={`lesson-${id}`}
    className={cn(
      "p-4 sm:p-5 rounded-2xl border bg-[#070e1c]/80 space-y-3 scroll-mt-24",
      highlight ? "border-cyan-400/60 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]" : "border-slate-800",
    )}
  >
    <h3 className="text-sm font-extrabold uppercase tracking-wider text-cyan-300">{SECTION_LABELS[id]}</h3>
    {children}
  </section>
);

/** Bài học theo các phần cố định (G01). `only` = chỉ hiện một phần (cửa sổ "Xem lại phần này"). */
export const LessonView: React.FC<{ lesson: Lesson; only?: LessonSection | null }> = ({ lesson, only }) => {
  const show = (s: LessonSection) => !only || only === s;
  return (
    <div className="space-y-4">
      {show("when_to_use") && lesson.when_to_use && (
        <Section id="when_to_use">
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{lesson.when_to_use}</p>
        </Section>
      )}
      {show("structure") && lesson.structure && (
        <Section id="structure">
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{lesson.structure}</p>
        </Section>
      )}
      {show("examples") && !!lesson.examples?.length && (
        <Section id="examples">
          <ul className="space-y-2.5">
            {lesson.examples.map((e, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <SpeakButton text={e.en} />
                <div className="min-w-0 pt-1">
                  <p className="text-sm text-white">{e.en}</p>
                  {e.vi && <p className="text-xs text-slate-400">{e.vi}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {show("mistakes") && !!lesson.mistakes?.length && (
        <Section id="mistakes">
          <ul className="space-y-3">
            {lesson.mistakes.map((m, i) => (
              <li key={i} className="grid sm:grid-cols-2 gap-2">
                <p className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 text-sm text-rose-200 flex gap-2">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" /> {m.wrong}
                </p>
                <p className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-sm text-emerald-200 flex gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {m.right}
                </p>
                {m.note && <p className="sm:col-span-2 text-xs text-slate-400">{m.note}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {show("signals") && !!lesson.signals?.length && (
        <Section id="signals">
          <ul className="space-y-1.5">
            {lesson.signals.map((s, i) => (
              <li key={i} className="text-sm text-slate-200 flex gap-2">
                <span className="text-cyan-400">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
};

/** Một công thức (G02): cấu trúc rút gọn, khi dùng, ví dụ có nút nghe. */
export const FormulaCard: React.FC<{ formula: Formula; action?: React.ReactNode }> = ({ formula, action }) => (
  <div className="p-4 rounded-2xl border border-slate-800 bg-[#070e1c]/80 space-y-2">
    <div className="flex items-start justify-between gap-3">
      <p className="font-mono text-sm sm:text-base font-bold text-cyan-200 break-words">{formula.pattern}</p>
      {action}
    </div>
    <p className="text-sm text-slate-300">{formula.usage}</p>
    {formula.examples.map((e, i) => (
      <div key={i} className="flex items-start gap-2">
        <SpeakButton text={e.en} />
        <div className="min-w-0 pt-1">
          <p className="text-sm text-white">{e.en}</p>
          {e.vi && <p className="text-xs text-slate-400">{e.vi}</p>}
        </div>
      </div>
    ))}
  </div>
);

/** Cửa sổ nổi "Xem lại phần này trong bài học" — không rời bài tập. */
export const LessonSectionDialog: React.FC<{ slug: string | null; section: LessonSection | null; onClose: () => void }> = ({
  slug,
  section,
  onClose,
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ["grammar-topic", slug],
    queryFn: () => getGrammarTopic(slug!),
    enabled: !!slug,
  });
  return (
    <Dialog open={!!slug} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.name ?? "Bài học"}</DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : data.lesson ? (
          <LessonView lesson={data.lesson} only={section && data.lesson[section] ? section : null} />
        ) : (
          <p className="text-sm text-slate-400">Chủ điểm này chưa có bài học.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

/** Cửa sổ nổi "Xem lại công thức" trong phiên ôn. */
export const FormulaDialog: React.FC<{ title: string | null; formulas: Formula[]; onClose: () => void }> = ({ title, formulas, onClose }) => (
  <Dialog open={!!title} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Công thức · {title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        {formulas.length ? formulas.map((f) => <FormulaCard key={f.id} formula={f} />) : <p className="text-sm text-slate-400">Chủ điểm này chưa có công thức.</p>}
      </div>
    </DialogContent>
  </Dialog>
);
