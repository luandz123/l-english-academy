import type { Part2Cluster } from "@/types/part2Coach";
import { PART2_CLUSTERS } from "./part2CoachData";

/**
 * Danh sách bài của "Luyện nghe từng bước" (D17).
 * Part 3/4: mỗi bài là một đoạn audio (3 câu hỏi); bài cũ gồm 2–3 đoạn được tách theo file audio.
 */
export interface ListeningUnit extends Part2Cluster {
  /** Mã bài cũ (trước khi tách đoạn) để mở lại link cũ */
  parentId?: string;
}

const RANGE_IN_ID = /-q\d+-q\d+$/;
const RANGE_IN_TITLE = /Câu\s*\d+\s*[–-]\s*\d+/;

function splitByAudio(cluster: Part2Cluster): ListeningUnit[] {
  const groups: Part2Cluster["questions"][] = [];
  const byAudio = new Map<string, Part2Cluster["questions"]>();
  for (const q of cluster.questions) {
    const key = q.audioUrl || `q${q.id}`;
    let g = byAudio.get(key);
    if (!g) {
      g = [];
      byAudio.set(key, g);
      groups.push(g);
    }
    g.push(q);
  }
  if (groups.length <= 1) return [cluster];
  return groups.map((questions) => {
    const first = questions[0].questionNumber;
    const last = questions[questions.length - 1].questionNumber;
    const range = `-q${first}-q${last}`;
    return {
      ...cluster,
      id: RANGE_IN_ID.test(cluster.id) ? cluster.id.replace(RANGE_IN_ID, range) : `${cluster.id}${range}`,
      parentId: cluster.id,
      title: cluster.title.replace(RANGE_IN_TITLE, `Câu ${first} – ${last}`),
      description: cluster.description.replace(/·\s*\d+\s*câu/, `· ${questions.length} câu`),
      questions,
    };
  });
}

export function buildListeningUnits(clusters: Part2Cluster[]): ListeningUnit[] {
  return clusters.flatMap((c) => (c.part === "part3" || c.part === "part4" ? splitByAudio(c) : [c]));
}

export const LISTENING_UNITS: ListeningUnit[] = buildListeningUnits(PART2_CLUSTERS);

const UNIT_BY_ID = new Map(LISTENING_UNITS.map((u) => [u.id, u]));

/** Tìm bài theo mã; mã bài cũ (Part 3/4 trước khi tách) mở đoạn đầu tiên của bài đó. */
export function findListeningUnit(id: string | undefined): ListeningUnit | undefined {
  if (!id) return undefined;
  return UNIT_BY_ID.get(id) ?? LISTENING_UNITS.find((u) => u.parentId === id);
}

/**
 * Khóa lưu tiến độ trên server. Part 1 đổi hẳn nội dung bước nên dùng khóa mới ("v2-");
 * Part 2 giữ khóa cũ (các bước cũ quy đổi được, xem `normalizeLegacySteps`);
 * Part 3/4 là bài mới sau khi tách đoạn.
 */
export function progressKeyOf(unit: Pick<Part2Cluster, "id" | "part">): string {
  return unit.part === "part1" ? `v2-${unit.id}` : unit.id;
}

/**
 * Part 2 trước D17 có 7 bước: 1 Nghe thử, 2 Cụm từ, 3 Hiểu câu hỏi, 4 Bật câu đáp, 5 Nhại theo,
 * 6 Làm thử đề, 7 Nghe lặp. Nay 6 bước, bước 6 "Làm lại & nghe lặp" gộp bước 6–7 cũ.
 */
export function normalizeLegacySteps(part: Part2Cluster["part"], steps: number[], totalSteps: number): number[] {
  const mapped = part === "part2" || !part ? steps.map((s) => (s === 7 ? 6 : s)) : steps;
  return Array.from(new Set(mapped.filter((s) => s >= 1 && s <= totalSteps))).sort((a, b) => a - b);
}
