/** Tách transcript thành từng câu, giữ nhãn người nói (W:, M:, (A)...). */
export function splitSentences(text: string): { speaker: string | null; text: string }[] {
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\r/g, "");
  const out: { speaker: string | null; text: string }[] = [];
  // Mỗi lượt lời / đáp án bắt đầu bằng "W:", "M-Au:", "Woman:", "(A)" ...
  const turns = plain.split(/\n+|(?=\((?:A|B|C|D)\)\s)|(?=\b(?:[MW](?:-\w+)?|Man|Woman|Speaker\s?\d?)\s*:)/);
  for (const raw of turns) {
    const t = raw.trim();
    if (!t) continue;
    const m = /^((?:\((?:A|B|C|D)\))|(?:[MW](?:-\w+)?|Man|Woman|Speaker\s?\d?)\s*:)\s*/.exec(t);
    const speaker = m ? m[1].replace(/:$/, "") : null;
    const body = m ? t.slice(m[0].length) : t;
    const sentences = body.split(/(?<=[.!?])\s+(?=[A-Z"'])/);
    sentences.forEach((s, i) => {
      if (s.trim()) out.push({ speaker: i === 0 ? speaker : null, text: s.trim() });
    });
  }
  return out;
}
