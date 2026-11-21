import { useQuery } from "@tanstack/react-query";
import { extractLessonVocab } from "@/lib/api/vocabulary";
import { PART_NUMBER } from "@/data/listeningFlows";
import { getChoices } from "@/lib/listeningText";
import type { Part2Cluster } from "@/types/part2Coach";

/** Nội dung bài để tìm từ quan trọng: transcript (Part 3/4), câu hỏi và các lựa chọn. */
export function unitVocabText(unit: Part2Cluster): string {
  const parts: string[] = [];
  if (unit.part === "part3" || unit.part === "part4") {
    parts.push(unit.questions[0]?.transcriptText ?? "");
  }
  for (const q of unit.questions) {
    if (unit.part !== "part1") parts.push(q.questionText);
    for (const c of getChoices(q)) parts.push(c.text);
  }
  return parts.filter(Boolean).join("\n").slice(0, 8000);
}

/** Từ quan trọng của bài (bước Từ vựng, và để chọn ô điền ở bước Học từng câu). */
export function useLessonVocab(unit: Part2Cluster) {
  return useQuery({
    queryKey: ["listening-vocab", unit.id],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const part = unit.part ? PART_NUMBER[unit.part] : 2;
      const res = await extractLessonVocab({ text: unitVocabText(unit), part, limit: 10 });
      return res.items;
    },
  });
}
