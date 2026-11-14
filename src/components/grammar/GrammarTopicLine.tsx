import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpenCheck } from "lucide-react";
import { getQuestionTopic } from "@/lib/api/grammar";

/** Dòng "Chủ điểm: Câu bị động · Xem bài học" ở phần giải thích câu Part 5/6 (chỉ hiện khi câu có chủ điểm). */
export const GrammarTopicLine: React.FC<{ questionId: number; part?: number | null; className?: string }> = ({ questionId, part, className }) => {
  const [topic, setTopic] = useState<{ slug: string; name: string } | null>(null);
  const eligible = part === 5 || part === 6 || part === null || part === undefined;
  useEffect(() => {
    if (!eligible) return;
    let alive = true;
    void getQuestionTopic(questionId).then((t) => alive && setTopic(t));
    return () => {
      alive = false;
    };
  }, [questionId, eligible]);
  if (!topic) return null;
  return (
    <p className={className ?? "text-xs text-slate-300 flex flex-wrap items-center gap-1.5"}>
      <BookOpenCheck className="w-3.5 h-3.5 text-cyan-400" />
      <span>
        Chủ điểm: <b className="text-white">{topic.name}</b>
      </span>
      <span className="text-slate-600">·</span>
      <Link to={`/grammar/${topic.slug}`} className="text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center min-h-[32px]">
        Xem bài học
      </Link>
    </p>
  );
};
