import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Client } = require(path.resolve("backend/node_modules/pg"));

const DEFAULT_SCRATCH_DIR =
  "C:\\Users\\lenovo\\.gemini\\antigravity\\brain\\beae4ac4-fba9-4c1f-b1c0-8f32215b87a0\\scratch";
const INPUT_PATH =
  process.env.DAUENGLISH_GRAMMAR_IN ||
  path.join(DEFAULT_SCRATCH_DIR, "dauenglish-grammar-all.json");
const DRY_RUN = process.argv.includes("--dry-run");
const AUDIT = process.argv.includes("--audit");

const CONTRACTION_DISTRACTORS = {
  "don't": ["doesn't", "didn't", "haven't", "isn't"],
  "doesn't": ["don't", "didn't", "hasn't", "isn't"],
  "didn't": ["don't", "doesn't", "hadn't", "wasn't"],
  "isn't": ["aren't", "wasn't", "doesn't", "hasn't"],
  "aren't": ["isn't", "weren't", "don't", "haven't"],
  "wasn't": ["weren't", "isn't", "didn't", "hadn't"],
  "weren't": ["wasn't", "aren't", "didn't", "hadn't"],
  "hasn't": ["haven't", "hadn't", "doesn't", "isn't"],
  "haven't": ["hasn't", "hadn't", "don't", "aren't"],
  "hadn't": ["hasn't", "haven't", "didn't", "wasn't"],
  "won't": ["wouldn't", "don't", "didn't", "can't"],
  "wouldn't": ["won't", "shouldn't", "couldn't", "didn't"],
  "can't": ["couldn't", "won't", "don't", "shouldn't"],
  "couldn't": ["can't", "wouldn't", "shouldn't", "didn't"],
  "shouldn't": ["wouldn't", "couldn't", "mustn't", "don't"],
  "mustn't": ["shouldn't", "don't have to", "can't", "wouldn't"],
  its: ["it's", "their", "it", "theirs"],
  "it's": ["its", "their", "they're", "it"],
  their: ["theirs", "they're", "there", "them"],
  "they're": ["their", "there", "theirs", "them"],
  your: ["you're", "yours", "you", "yourself"],
  "you're": ["your", "yours", "you", "yourself"],
  whose: ["who's", "whom", "which", "who"],
  "who's": ["whose", "whom", "which", "who"],
};

const FUNCTION_WORDS = new Set([
  "its", "his", "her", "hers", "our", "ours", "your", "yours", "their", "theirs", "my", "mine",
  "this", "that", "these", "those", "some", "any", "each", "every", "both", "either", "neither",
  "much", "many", "few", "little", "less", "least", "more", "most",
  "who", "whom", "whose", "which", "what", "where", "when", "why", "how",
  "in", "on", "at", "by", "for", "with", "from", "to", "of", "into", "onto", "upon",
  "about", "above", "below", "under", "over", "between", "among", "through", "during",
  "before", "after", "since", "until", "while", "although", "though", "because",
  "unless", "whereas", "whether", "however", "therefore", "moreover", "furthermore",
  "nevertheless", "nonetheless", "besides", "instead", "otherwise",
]);

// Map each L-English grammar_topic slug to ordered dautoeic.vn lesson IDs
const TOPIC_TO_LESSON_IDS = {
  "cac-thi-co-ban": [4, 2, 52, 53, 1, 55, 16, 63],
  "thi-hoan-thanh": [3, 54, 62],
  "tu-loai": [7, 8, 56],
  "danh-tu-mao-tu": [56, 58, 59],
  "dai-tu": [57],
  "hoa-hop-chu-ngu-dong-tu": [11, 9, 10],
  "cau-bi-dong": [20, 18, 19, 17],
  "danh-dong-tu-dong-tu-nguyen-mau": [13, 14, 12],
  "phan-tu-lam-tinh-tu": [60],
  "so-sanh": [32, 33, 31, 66],
  "gioi-tu": [6],
  "lien-tu-trang-tu-lien-ket": [5, 23, 24, 67],
  "tu-noi-chen-cau-part-6": [5, 23, 67],
  "menh-de-quan-he": [21, 22],
  "cau-dieu-kien": [27, 28, 26, 25],
  "menh-de-danh-tu-cau-gian-tiep": [61, 29, 30],
  "dao-ngu-cau-nhan-manh": [34, 35],
  "gia-dinh-cau-truc-trang-trong": [64, 65, 15],
};

// [base, past, pp, s3, ing]
const IRREGULAR_VERBS = [
  ["be", "was", "been", "is", "being"],
  ["have", "had", "had", "has", "having"],
  ["do", "did", "done", "does", "doing"],
  ["make", "made", "made", "makes", "making"],
  ["go", "went", "gone", "goes", "going"],
  ["say", "said", "said", "says", "saying"],
  ["get", "got", "gotten", "gets", "getting"],
  ["see", "saw", "seen", "sees", "seeing"],
  ["come", "came", "come", "comes", "coming"],
  ["take", "took", "taken", "takes", "taking"],
  ["give", "gave", "given", "gives", "giving"],
  ["know", "knew", "known", "knows", "knowing"],
  ["find", "found", "found", "finds", "finding"],
  ["tell", "told", "told", "tells", "telling"],
  ["think", "thought", "thought", "thinks", "thinking"],
  ["leave", "left", "left", "leaves", "leaving"],
  ["write", "wrote", "written", "writes", "writing"],
  ["send", "sent", "sent", "sends", "sending"],
  ["buy", "bought", "bought", "buys", "buying"],
  ["bring", "brought", "brought", "brings", "bringing"],
  ["meet", "met", "met", "meets", "meeting"],
  ["speak", "spoke", "spoken", "speaks", "speaking"],
  ["pay", "paid", "paid", "pays", "paying"],
  ["put", "put", "put", "puts", "putting"],
  ["run", "ran", "run", "runs", "running"],
  ["set", "set", "set", "sets", "setting"],
  ["show", "showed", "shown", "shows", "showing"],
  ["win", "won", "won", "wins", "winning"],
  ["begin", "began", "begun", "begins", "beginning"],
  ["break", "broke", "broken", "breaks", "breaking"],
  ["choose", "chose", "chosen", "chooses", "choosing"],
  ["fall", "fell", "fallen", "falls", "falling"],
  ["feel", "felt", "felt", "feels", "feeling"],
  ["grow", "grew", "grown", "grows", "growing"],
  ["hold", "held", "held", "holds", "holding"],
  ["keep", "kept", "kept", "keeps", "keeping"],
  ["lead", "led", "led", "leads", "leading"],
  ["lose", "lost", "lost", "loses", "losing"],
  ["mean", "meant", "meant", "means", "meaning"],
  ["read", "read", "read", "reads", "reading"],
  ["rise", "rose", "risen", "rises", "rising"],
  ["sell", "sold", "sold", "sells", "selling"],
  ["spend", "spent", "spent", "spends", "spending"],
  ["stand", "stood", "stood", "stands", "standing"],
  ["understand", "understood", "understood", "understands", "understanding"],
  ["build", "built", "built", "builds", "building"],
  ["catch", "caught", "caught", "catches", "catching"],
  ["deal", "dealt", "dealt", "deals", "dealing"],
  ["seek", "sought", "sought", "seeks", "seeking"],
  ["ring", "rang", "rung", "rings", "ringing"],
  ["forget", "forgot", "forgotten", "forgets", "forgetting"],
  ["hear", "heard", "heard", "hears", "hearing"],
  ["cost", "cost", "cost", "costs", "costing"],
  ["cut", "cut", "cut", "cuts", "cutting"],
  ["let", "let", "let", "lets", "letting"],
  ["teach", "taught", "taught", "teaches", "teaching"],
  ["wear", "wore", "worn", "wears", "wearing"],
  ["lie", "lay", "lain", "lies", "lying"],
];

const VERB_BY_FORM = new Map();
for (const [base, past, pp, s3, ing] of IRREGULAR_VERBS) {
  const forms = { base, past, pp, s3, ing };
  for (const f of [base, past, pp, s3, ing]) {
    if (!VERB_BY_FORM.has(f)) VERB_BY_FORM.set(f, forms);
  }
}

const PRONOUN_GROUPS = [
  ["i", "me", "my", "mine", "myself"],
  ["you", "your", "yours", "yourself", "yourselves"],
  ["he", "him", "his", "himself"],
  ["she", "her", "hers", "herself"],
  ["it", "its", "itself"],
  ["we", "us", "our", "ours", "ourselves"],
  ["they", "them", "their", "theirs", "themselves"],
];

const QUANTIFIER_POOL = [
  "many",
  "much",
  "several",
  "few",
  "a few",
  "little",
  "a little",
  "each",
  "every",
  "all",
  "most",
  "some",
  "any",
  "a number of",
  "the number of",
  "plenty of",
];

const CONNECTOR_GROUPS = [
  ["although", "even though", "though", "whereas", "while", "despite", "in spite of", "because of", "due to"],
  ["because", "since", "as", "because of", "due to", "owing to", "although", "despite"],
  ["so that", "in order that", "in order to", "so as to", "because of", "despite"],
  ["as soon as", "by the time", "until", "before", "after", "when", "while", "once", "since"],
  ["in", "on", "at", "by", "for", "during", "within", "since", "until", "from"],
  ["who", "whom", "whose", "which", "that", "where", "when", "what"],
  ["and", "but", "or", "so", "yet", "nor", "however", "therefore"],
  ["whether", "what", "that", "why", "how", "where", "whoever", "whatever"],
];

const MODAL_POOL = ["should", "ought to", "must", "have to", "has to", "can", "could", "may", "might"];

const CONJ_56_FAMILIES = [
  ["apply", "application", "applicant", "applicable"],
  ["employ", "employment", "employer", "employee", "employed"],
  ["produce", "production", "product", "producer", "productive", "productively"],
  ["manage", "management", "manager", "managerial"],
  ["attend", "attendance", "attendee", "attentive", "attentively"],
  ["invest", "investment", "investor", "invested"],
  ["inform", "information", "informative", "informatively"],
  ["revise", "revision", "revisions", "revised"],
  ["approve", "approval", "approved", "approving"],
  ["propose", "proposal", "proposed", "proposing"],
  ["decide", "decision", "decisive", "decisively"],
  ["inspire", "inspiration", "inspiring", "inspired"],
  ["satisfy", "satisfaction", "satisfactory", "satisfied", "satisfying"],
  ["prepare", "preparation", "prepared", "preparatory"],
  ["procure", "procurement", "procured", "procuring"],
  ["equip", "equipment", "equipped", "equipping"],
  ["compete", "competition", "competitor", "competitive", "competitively"],
  ["maintain", "maintenance", "maintained", "maintaining"],
  ["perform", "performance", "performer", "performing"],
  ["expand", "expansion", "expansive", "expanded"],
  ["submit", "submission", "submitted", "submitting"],
  ["require", "requirement", "required", "requiring"],
  ["announce", "announcement", "announced", "announcing"],
  ["appoint", "appointment", "appointed", "appointing"],
  ["agree", "agreement", "agreeable", "agreed"],
  ["confident", "confidence", "confidently", "confide"],
  ["efficient", "efficiency", "efficiently"],
  ["significant", "significance", "significantly"],
  ["frequent", "frequency", "frequently"],
  ["recent", "recency", "recently"],
  ["previous", "previously"],
  ["current", "currently", "currency"],
  ["annual", "annually"],
  ["careful", "care", "carefully", "careless"],
  ["quick", "quickly", "quickness"],
  ["rapid", "rapidity", "rapidly"],
  ["complete", "completion", "completely", "completed"],
  ["effective", "effect", "effectively", "effectiveness"],
  ["reliable", "rely", "reliability", "reliably"],
  ["financial", "finance", "financially"],
  ["confidential", "confidentiality", "confidentially"],
  ["qualified", "qualify", "qualification", "qualifications"],
  ["successful", "succeed", "success", "successfully"],
  ["responsible", "responsibility", "responsibly"],
  ["recommend", "recommendation", "recommended", "recommending"],
  ["present", "presentation", "presenter", "presented"],
  ["install", "installation", "installed", "installing"],
  ["operate", "operation", "operator", "operational", "operated"],
  ["negotiate", "negotiation", "negotiator", "negotiated"],
  ["deliver", "delivery", "delivered", "delivering"],
  ["promote", "promotion", "promoter", "promoted"],
];

const WORD_TO_FAMILY = new Map();
for (const fam of CONJ_56_FAMILIES) {
  for (const w of fam) {
    WORD_TO_FAMILY.set(w.toLowerCase(), fam);
  }
}

function loadEnv() {
  const env = {};
  if (!fs.existsSync(".env")) return env;
  const text = fs.readFileSync(".env", "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) {
      env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

function wordKey(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(val, maxLen) {
  if (!val) return null;
  const clean = String(val).replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean;
}

function hashCode(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function matchCase(target, candidate) {
  if (!candidate || !target) return candidate;
  const trimmed = candidate.trim();
  if (/^[A-Z]/.test(target) && !/^[A-Z]/.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  if (/^[a-z]/.test(target) && /^[A-Z]/.test(trimmed) && !/^I(?:\b|\s)/.test(trimmed)) {
    return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  }
  return trimmed;
}

function guessRegularVerbForms(raw) {
  const w = raw.toLowerCase();
  if (VERB_BY_FORM.has(w)) {
    return VERB_BY_FORM.get(w);
  }

  let base = w;
  if (w.endsWith("ied") && w.length > 4) {
    base = `${w.slice(0, -3)}y`;
  } else if (w.endsWith("ies") && w.length > 4) {
    base = `${w.slice(0, -3)}y`;
  } else if (w.endsWith("ying") && w.length > 5) {
    base = `${w.slice(0, -4)}ie`;
  } else if (/(?:pp|tt|nn|mm|gg|bb|dd|rr)ed$/.test(w)) {
    base = w.slice(0, -3);
  } else if (/(?:pp|tt|nn|mm|gg|bb|dd|rr)ing$/.test(w)) {
    base = w.slice(0, -4);
  } else if (w.endsWith("ed") && w.length > 4) {
    const stem = w.slice(0, -2);
    base = /(?:at|iv|iz|ag|is|ot|uc|us|ev|nc|rg|du|ur|gu|su|tu|lv|rv)$/.test(stem)
      ? `${stem}e`
      : stem;
  } else if (w.endsWith("es") && w.length > 4 && /(?:sh|ch|ss|x|z|o)es$/.test(w)) {
    base = w.slice(0, -2);
  } else if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) {
    base = w.slice(0, -1);
  } else if (w.endsWith("ing") && w.length > 5) {
    const stem = w.slice(0, -3);
    base = /(?:at|iv|iz|ag|ud|ak|ok|ad|id|ut|rv|lv|nc|du)$/.test(stem) ? `${stem}e` : stem;
  }

  if (VERB_BY_FORM.has(base)) {
    return VERB_BY_FORM.get(base);
  }

  const past = base.endsWith("e")
    ? `${base}d`
    : /[^aeiou]y$/.test(base)
      ? `${base.slice(0, -1)}ied`
      : /^(?:plan|stop|drop|ship|submit|prefer|occur|refer|ban|log)$/.test(base)
        ? `${base}${base.slice(-1)}ed`
        : `${base}ed`;

  const s3 = /[^aeiou]y$/.test(base)
    ? `${base.slice(0, -1)}ies`
    : /(?:s|sh|ch|x|z|o)$/.test(base)
      ? `${base}es`
      : `${base}s`;

  const ing = base.endsWith("ie")
    ? `${base.slice(0, -2)}ying`
    : base.endsWith("e") && !base.endsWith("ee")
      ? `${base.slice(0, -1)}ing`
      : /^(?:plan|stop|drop|ship|submit|prefer|occur|refer|ban|log|run|sit|set|get|put|cut)$/.test(base)
        ? `${base}${base.slice(-1)}ing`
        : `${base}ing`;

  return { base, past, pp: past, s3, ing };
}

function deriveMorphDistractors(word) {
  const lower = word.toLowerCase().trim();
  const out = [];

  if (CONTRACTION_DISTRACTORS[lower]) {
    return CONTRACTION_DISTRACTORS[lower];
  }

  if (WORD_TO_FAMILY.has(lower)) {
    for (const candidate of WORD_TO_FAMILY.get(lower)) {
      if (candidate.toLowerCase() !== lower) out.push(candidate);
    }
  }

  // Never tack English suffixes onto contractions, hyphenated tokens, multi-word phrases, or function words
  if (!/^[a-z]{2,}$/.test(lower) || FUNCTION_WORDS.has(lower)) {
    return Array.from(new Set(out.filter((x) => x && x.toLowerCase() !== lower)));
  }

  if (lower.endsWith("ly") && lower.length > 4) {
    const adj = lower.endsWith("ily")
      ? `${lower.slice(0, -3)}y`
      : lower.endsWith("ally") && !lower.endsWith("cally")
        ? lower.slice(0, -2)
        : lower.slice(0, -2);
    out.push(adj, `${adj}ness`, `${adj}ing`);
  } else if (lower.endsWith("tion") && lower.length > 6) {
    const base = lower.slice(0, -4);
    out.push(`${base}te`, `${base}tive`, `${base}tively`);
  } else if (lower.endsWith("ment") && lower.length > 6) {
    const base = lower.slice(0, -4);
    out.push(base, `${base}ed`, `${base}ing`);
  } else if (lower.endsWith("al") && lower.length > 4) {
    out.push(`${lower}ly`, `${lower}ize`, `${lower}ity`);
  } else if (lower.endsWith("ive") && lower.length > 5) {
    out.push(`${lower}ly`, `${lower}ness`, lower.slice(0, -3));
  } else if (lower.endsWith("ous") && lower.length > 5) {
    out.push(`${lower}ly`, `${lower}ness`, lower.slice(0, -3));
  } else if (lower.endsWith("ing") && lower.length > 5) {
    const vf = guessRegularVerbForms(lower);
    out.push(vf.past, vf.base, vf.s3);
  } else if (lower.endsWith("ed") && lower.length > 4) {
    const vf = guessRegularVerbForms(lower);
    out.push(vf.ing, vf.base, vf.s3);
  } else {
    const vf = guessRegularVerbForms(lower);
    out.push(vf.past, vf.ing, vf.s3, `${lower}ly`, `${lower}tion`);
  }

  return Array.from(new Set(out.filter((x) => x && x.toLowerCase() !== lower)));
}

function finalizeOptions(correctRaw, candidatePool, seedKey) {
  const correct = String(correctRaw).replace(/\s+/g, " ").trim();
  const seen = new Set([correct.toLowerCase()]);
  const distractors = [];

  for (const raw of candidatePool) {
    if (!raw) continue;
    const styled = matchCase(correct, String(raw).replace(/\s+/g, " ").trim());
    const key = styled.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    distractors.push(styled);
    if (distractors.length === 3) break;
  }

  if (distractors.length < 3) {
    return null;
  }

  const all = [correct, ...distractors];
  const answerIdx = hashCode(seedKey) % 4;
  if (answerIdx !== 0) {
    const tmp = all[0];
    all[0] = all[answerIdx];
    all[answerIdx] = tmp;
  }
  return { options: all, answerIndex: answerIdx };
}

function replaceAtSpan(sentence, index, length) {
  const before = sentence.slice(0, index);
  const after = sentence.slice(index + length);
  return `${before}___${after}`.replace(/\s+/g, " ").trim();
}

function findWordRegexMatch(sentence, pattern) {
  const m = pattern.exec(sentence);
  if (!m) return null;
  return {
    text: m[0],
    index: m.index,
    length: m[0].length,
    groups: m,
  };
}

function findIrregularPastMatch(sentence) {
  const pastWords = IRREGULAR_VERBS.map((v) => v[1]).filter((w) => w !== "was");
  const rx = new RegExp(`\\b(${pastWords.join("|")})\\b`);
  return findWordRegexMatch(sentence, rx);
}

function buildVerbTenseDistractors(lessonId, phrase) {
  const lower = phrase.toLowerCase().trim();
  if (CONTRACTION_DISTRACTORS[lower]) {
    return CONTRACTION_DISTRACTORS[lower];
  }
  const words = lower.split(/\s+/);
  const lastWord = words[words.length - 1];
  if (!/^[a-z]{2,}$/.test(lastWord)) {
    return [];
  }
  const vf = guessRegularVerbForms(lastWord);

  if (lessonId === 2) {
    if (lower === "was" || lower === "were") {
      return lower === "was"
        ? ["is", "has been", "will be", "were"]
        : ["are", "have been", "will be", "was"];
    }
    return [`has ${vf.pp}`, `will ${vf.base}`, `is ${vf.ing}`, vf.base, vf.s3];
  }
  if (lessonId === 3) {
    return [vf.past, `will ${vf.base}`, `is ${vf.ing}`, `are ${vf.ing}`, vf.base];
  }
  if (lessonId === 4) {
    return [vf.ing, vf.past, `will ${vf.base}`, `has ${vf.pp}`, vf.base === lower ? vf.s3 : vf.base];
  }
  if (lessonId === 1) {
    return [vf.past, `has ${vf.pp}`, `is ${vf.ing}`, vf.s3, `had ${vf.pp}`];
  }
  if (lessonId === 52) {
    return [vf.past, vf.s3, `has ${vf.pp}`, `will ${vf.base}`, vf.base];
  }
  if (lessonId === 53) {
    return [vf.past, `had ${vf.pp}`, `has ${vf.pp}`, `will be ${vf.ing}`, vf.s3];
  }
  if (lessonId === 54) {
    return [`has ${vf.pp}`, `will have ${vf.pp}`, `was ${vf.ing}`, vf.past, vf.s3];
  }
  if (lessonId === 62) {
    return [`has ${vf.pp}`, `was ${vf.ing}`, `will ${vf.base}`, vf.past, `is ${vf.ing}`];
  }
  return [vf.base, vf.past, vf.ing, `will ${vf.base}`, `has ${vf.pp}`];
}

function matchExampleTarget(lesson, sentence) {
  const id = lesson.id;

  // Lesson 55: Be going to
  if (id === 55) {
    const m = findWordRegexMatch(sentence, /\b(going to)\b/i);
    if (m) return { match: m, pool: ["go to", "gone to", "went to", "will to"] };
  }

  // Lesson 1: Will + V1
  if (id === 1) {
    const m = findWordRegexMatch(sentence, /\b(?:will(?:\s+not)?|won't)\s+([a-z]+)\b/i);
    if (m) return { match: m, pool: buildVerbTenseDistractors(1, m.text) };
  }

  // Lesson 2: Past Simple
  if (id === 2) {
    const didM = findWordRegexMatch(sentence, /\b(?:did(?:\s+not)?|didn't)\s+([a-z]+)\b/i);
    if (didM) {
      const vf = guessRegularVerbForms(didM.groups[1]);
      return {
        match: {
          text: didM.groups[1],
          index: didM.index + didM.text.lastIndexOf(didM.groups[1]),
          length: didM.groups[1].length,
        },
        pool: [vf.past, vf.ing, `to ${vf.base}`, vf.s3],
      };
    }
    const edM = findWordRegexMatch(sentence, /\b[a-z]{3,}ed\b/);
    if (edM && !/\b(?:assigned|updated|detailed|qualified)\b/i.test(edM.text)) {
      return { match: edM, pool: buildVerbTenseDistractors(2, edM.text) };
    }
    const irrM = findIrregularPastMatch(sentence);
    if (irrM) return { match: irrM, pool: buildVerbTenseDistractors(2, irrM.text) };
  }

  // Lesson 3: Present Perfect
  if (id === 3) {
    const m = findWordRegexMatch(
      sentence,
      /\b(?:have|has)(?:\s+not|\s+never|\s+already|\s+just)?\s+([a-z]+)\b/i
    );
    if (m) return { match: m, pool: buildVerbTenseDistractors(3, m.text) };
  }

  // Lesson 4: Present Simple
  if (id === 4) {
    const m = findWordRegexMatch(
      sentence,
      /\b(?:always|usually|often|sometimes|rarely|never|generally|typically)\s+([a-z]+)\b|\b[a-z]+(?:es|ies|s)\b(?=\s+(?:its|the|a|an|every|to|on|at|in|with|all)\b)/
    );
    if (m) {
      const targetText = m.groups[1] || m.text;
      const offset = m.groups[1] ? m.text.lastIndexOf(m.groups[1]) : 0;
      return {
        match: { text: targetText, index: m.index + offset, length: targetText.length },
        pool: buildVerbTenseDistractors(4, targetText),
      };
    }
  }

  // Lesson 52: Present Continuous
  if (id === 52) {
    const m = findWordRegexMatch(
      sentence,
      /\b(?:am|is|are)(?:\s+not)?(?:\s+currently|\s+now|\s+presently)?\s+([a-z]+ing)\b/i
    );
    if (m) {
      const ingWord = m.groups[1];
      const vf = guessRegularVerbForms(ingWord);
      return {
        match: m,
        pool: [vf.past, vf.s3, `has ${vf.pp}`, `will ${vf.base}`],
      };
    }
  }

  // Lesson 53: Past Continuous
  if (id === 53) {
    const m = findWordRegexMatch(sentence, /\b(?:was|were)(?:\s+not)?\s+([a-z]+ing)\b/i);
    if (m) return { match: m, pool: buildVerbTenseDistractors(53, m.text) };
  }

  // Lesson 54: Past Perfect
  if (id === 54) {
    const m = findWordRegexMatch(
      sentence,
      /\bhad(?:\s+not|n't|\s+already|\s+just)?\s+(?:been\s+)?([a-z]+)\b/i
    );
    if (m) return { match: m, pool: buildVerbTenseDistractors(54, m.text) };
  }

  // Lesson 62: Present Perfect Continuous
  if (id === 62) {
    const m = findWordRegexMatch(sentence, /\b(?:have|has)(?:\s+not)?\s+been\s+([a-z]+ing)\b/i);
    if (m) return { match: m, pool: buildVerbTenseDistractors(62, m.text) };
  }

  // Modals: 15, 16, 17, 63
  if ([15, 16, 17, 63].includes(id)) {
    const haveM = findWordRegexMatch(
      sentence,
      /\b(?:should|ought\s+to|must|could|may|might)\s+have\s+([a-z]+)\b/i
    );
    if (haveM) {
      const vf = guessRegularVerbForms(haveM.groups[1]);
      return {
        match: {
          text: haveM.groups[1],
          index: haveM.index + haveM.text.lastIndexOf(haveM.groups[1]),
          length: haveM.groups[1].length,
        },
        pool: [vf.base, vf.ing, `to ${vf.base}`, vf.s3],
      };
    }
    const modM = findWordRegexMatch(
      sentence,
      /\b(?:should|must|can|could|may|might|have\s+to|has\s+to|had\s+to)(?:\s+not)?\s+(?!be\b|have\b)([a-z]+)\b/i
    );
    if (modM) {
      const verb = modM.groups[1];
      const vf = guessRegularVerbForms(verb);
      return {
        match: {
          text: verb,
          index: modM.index + modM.text.lastIndexOf(verb),
          length: verb.length,
        },
        pool: [vf.ing, `to ${vf.base}`, vf.past, vf.s3],
      };
    }
    const modalWord = findWordRegexMatch(
      sentence,
      /\b(?:Should|should|Ought to|ought to|Must|must|Have to|have to|Has to|has to|Can|can|Could|could|May|may|Might|might)\b/
    );
    if (modalWord) {
      return {
        match: modalWord,
        pool: MODAL_POOL.filter((x) => x.toLowerCase() !== modalWord.text.toLowerCase()),
      };
    }
  }

  // Passive voice: 18, 19, 20
  if ([18, 19, 20].includes(id)) {
    const m = findWordRegexMatch(
      sentence,
      /\b(?:must\s+be|should\s+be|can\s+be|could\s+be|may\s+be|might\s+be|will\s+be|has\s+been|have\s+been|had\s+been|is|are|was|were)(?:\s+currently|\s+regularly|\s+already)?\s+([a-z]+(?:ed|en|wn|nt|pt|lt|de|ne|un|ld|id|ht))\b/i
    );
    if (m) {
      const pp = m.groups[1];
      const vf = guessRegularVerbForms(pp);
      const isModal = /must|should|can|could|may|might|will/i.test(m.text);
      const isPerf = /has|have|had/i.test(m.text);
      const distractors = isModal
        ? [`must ${vf.base}`, `be ${vf.ing}`, vf.past, `must have ${vf.ing}`]
        : isPerf
          ? [`has ${vf.pp}`, `is ${vf.ing}`, `had ${vf.ing}`, vf.past]
          : [vf.s3, `is ${vf.ing}`, `has ${vf.pp}`, vf.ing];
      return { match: m, pool: distractors };
    }
  }

  // Conditionals: 25, 26, 27, 28
  if ([25, 26, 27, 28].includes(id)) {
    const c3 = findWordRegexMatch(sentence, /\b(?:would|could|might)\s+(?:not\s+)?have\s+([a-z]+)\b/i);
    if (c3) {
      const vf = guessRegularVerbForms(c3.groups[1]);
      return {
        match: c3,
        pool: [`would ${vf.base}`, `will have ${vf.pp}`, `had ${vf.pp}`, `will ${vf.base}`],
      };
    }
    const c2 = findWordRegexMatch(sentence, /\bwould\s+(?:not\s+)?([a-z]+)\b/i);
    if (c2) {
      const vf = guessRegularVerbForms(c2.groups[1]);
      return {
        match: c2,
        pool: [`will ${vf.base}`, `would have ${vf.pp}`, vf.past, `had ${vf.pp}`],
      };
    }
    const hadM = findWordRegexMatch(sentence, /\bhad\s+([a-z]+)\b/i);
    if (hadM) {
      const vf = guessRegularVerbForms(hadM.groups[1]);
      return {
        match: hadM,
        pool: [vf.past, `have ${vf.pp}`, `would ${vf.base}`, `will ${vf.base}`],
      };
    }
    const ifClauseVerb = findWordRegexMatch(sentence, /\bif\s+[a-z\s,]+?\b(were)\b/i);
    if (ifClauseVerb) {
      const wIdx = sentence.toLowerCase().indexOf("were", ifClauseVerb.index);
      return {
        match: { text: "were", index: wIdx, length: 4 },
        pool: ["am", "is", "will be", "had been"],
      };
    }
    const willM = findWordRegexMatch(sentence, /\bwill\s+(?:not\s+)?([a-z]+)\b/i);
    if (willM) {
      const vf = guessRegularVerbForms(willM.groups[1]);
      return {
        match: willM,
        pool: [`would ${vf.base}`, `would have ${vf.pp}`, vf.past, `is ${vf.ing}`],
      };
    }
  }

  // Lesson 34: Conditional Inversion
  if (id === 34) {
    const lead = findWordRegexMatch(sentence, /^(Should|Had|Were)\b/);
    if (lead) {
      const map = {
        Should: ["Were", "Did", "Have", "Will"],
        Had: ["Did", "Should", "Were", "If had"],
        Were: ["Was", "Did", "Had", "Are"],
      };
      return { match: lead, pool: map[lead.text] };
    }
  }

  // Lesson 35: Negative Inversion
  if (id === 35) {
    const auxM = findWordRegexMatch(
      sentence,
      /\b(?:Not only|Never|Seldom|Rarely|Hardly|Scarcely|No sooner|Little|Only when|Only after|Under no circumstances|In no way)\s+(did|does|do|have|has|had|will|can|should|was|were)\b/i
    );
    if (auxM) {
      const aux = auxM.groups[1];
      const auxIdx = auxM.index + auxM.text.lastIndexOf(aux);
      const pool = ["did", "do", "have", "had", "was", "were", "will"].filter(
        (x) => x !== aux.toLowerCase()
      );
      return { match: { text: aux, index: auxIdx, length: aux.length }, pool };
    }
  }

  // Lesson 57: Pronouns
  if (id === 57) {
    const tokens = Array.from(sentence.matchAll(/\b[A-Za-z]+\b/g));
    for (const tok of tokens) {
      const low = tok[0].toLowerCase();
      const grp = PRONOUN_GROUPS.find((g) => g.includes(low));
      if (grp && tok.index > 0) {
        return {
          match: { text: tok[0], index: tok.index, length: tok[0].length },
          pool: grp.filter((p) => p !== low),
        };
      }
    }
  }

  // Lesson 58: Articles
  if (id === 58) {
    const anM = findWordRegexMatch(sentence, /\ban\s+[a-z]+\b/i);
    if (anM) {
      return {
        match: { text: anM.text.slice(0, 2), index: anM.index, length: 2 },
        pool: ["a", "the", "many", "few"],
      };
    }
    const aM = findWordRegexMatch(sentence, /\b(a|the)\b(?=\s+[a-z]+)/i);
    if (aM) {
      return {
        match: aM,
        pool: aM.text.toLowerCase() === "a" ? ["an", "some", "many", "these"] : ["a", "an", "these", "every"],
      };
    }
  }

  // Lesson 59: Quantifiers
  if (id === 59) {
    const rx = new RegExp(`\\b(${QUANTIFIER_POOL.join("|")})\\b`, "i");
    const m = findWordRegexMatch(sentence, rx);
    if (m) {
      const low = m.text.toLowerCase();
      const alt =
        low === "many" || low === "several" || low === "a few" || low === "few"
          ? ["much", "little", "a little", "every", "the number of"]
          : low === "much" || low === "little" || low === "a little"
            ? ["many", "several", "a few", "both"]
            : QUANTIFIER_POOL;
      return { match: m, pool: alt.filter((x) => x !== low) };
    }
  }

  // Lesson 60: Participle adjectives
  if (id === 60) {
    const m = findWordRegexMatch(
      sentence,
      /\b(attached|enclosed|revised|updated|proposed|qualified|experienced|satisfied|satisfying|promising|challenging|demanding|leading|presiding|remaining|existing|growing|disappointed|disappointing|surprised|surprising|interested|interesting|concerned|confusing|confused|excited|exciting)\b/i
    );
    if (m) {
      const low = m.text.toLowerCase();
      const root = low.replace(/(?:ing|ed|d)$/, "");
      const opposite = low.endsWith("ing") ? `${root}ed` : `${root}ing`;
      const vf = guessRegularVerbForms(low);
      return {
        match: m,
        pool: [opposite, vf.base, vf.s3, `${root}edly`, `${vf.base}ment`].filter(
          (x) => x !== low && x.length > 2
        ),
      };
    }
  }

  // Lesson 56, 7, 8: Word forms / Adv / Adj
  if ([56, 7, 8].includes(id)) {
    const tokens = Array.from(sentence.matchAll(/\b[A-Za-z]{4,}\b/g));
    for (const tok of tokens) {
      const low = tok[0].toLowerCase();
      if (id === 7 && low.endsWith("ly")) {
        return {
          match: { text: tok[0], index: tok.index, length: tok[0].length },
          pool: deriveMorphDistractors(tok[0]),
        };
      }
      if (WORD_TO_FAMILY.has(low)) {
        const fam = WORD_TO_FAMILY.get(low);
        const filtered = fam.filter((x) => x.toLowerCase() !== low);
        if (filtered.length >= 3) {
          return {
            match: { text: tok[0], index: tok.index, length: tok[0].length },
            pool: filtered,
          };
        }
      }
      if (
        (id === 8 && /(?:ing|ive|al|ous|ful|less|able|ible|ent|ant|ic|ed)$/.test(low)) ||
        (id === 56 && /(?:tion|ment|ness|ity|ance|ence|ship|er|or|ee|al)$/.test(low))
      ) {
        const morphs = deriveMorphDistractors(tok[0]);
        if (morphs.length >= 3) {
          return {
            match: { text: tok[0], index: tok.index, length: tok[0].length },
            pool: morphs,
          };
        }
      }
    }
  }

  // Lesson 12, 13, 14: Gerunds & Infinitives
  if ([12, 13, 14].includes(id)) {
    if (id === 13 || id === 12) {
      const toV = findWordRegexMatch(sentence, /\bto\s+([a-z]{3,})\b/i);
      if (toV && !/\bto\s+(?:the|a|an|our|their|my|your|this|that|date)\b/i.test(toV.text)) {
        const vf = guessRegularVerbForms(toV.groups[1]);
        return {
          match: toV,
          pool: [vf.ing, vf.base, vf.past, `for ${vf.ing}`],
        };
      }
    }
    const ingM = findWordRegexMatch(sentence, /\b([a-z]{3,}ing)\b/i);
    if (ingM) {
      const vf = guessRegularVerbForms(ingM.groups[1]);
      return {
        match: ingM,
        pool: [`to ${vf.base}`, vf.base, vf.past, vf.s3],
      };
    }
  }

  // Lesson 64: Causatives
  if (id === 64) {
    const haveObjV = findWordRegexMatch(
      sentence,
      /\b(?:had|have|has|made|make|let|got|get)\s+(?:the\s+)?[a-z]+\s+(to\s+[a-z]+|[a-z]+)\b/i
    );
    if (haveObjV) {
      const vPart = haveObjV.groups[1];
      const vIdx = haveObjV.index + haveObjV.text.lastIndexOf(vPart);
      const vf = guessRegularVerbForms(vPart.replace(/^to\s+/i, ""));
      const isTo = /^to\s+/i.test(vPart);
      return {
        match: { text: vPart, index: vIdx, length: vPart.length },
        pool: isTo
          ? [vf.base, vf.ing, vf.s3, `for ${vf.ing}`]
          : [`to ${vf.base}`, vf.ing, vf.s3, `will ${vf.base}`],
      };
    }
  }

  // Lesson 65: Subjunctive
  if (id === 65) {
    const thatSV = findWordRegexMatch(
      sentence,
      /\bthat\s+(?:the\s+[a-z]+|[a-z]+)\s+([a-z]+)\b/i
    );
    if (thatSV) {
      const vPart = thatSV.groups[1];
      const vIdx = thatSV.index + thatSV.text.lastIndexOf(vPart);
      const vf = guessRegularVerbForms(vPart);
      return {
        match: { text: vPart, index: vIdx, length: vPart.length },
        pool: [vf.s3, vf.ing, `to ${vf.base}`, vf.past],
      };
    }
  }

  // Lesson 31, 32, 33, 66: Comparisons
  if ([31, 32, 33, 66].includes(id)) {
    if (id === 66) {
      const dbl = findWordRegexMatch(sentence, /\b[Tt]he\s+(?:more\s+[a-z]+|[a-z]+er)\b/);
      if (dbl) {
        const adj = dbl.text.replace(/^[Tt]he\s+/, "");
        return {
          match: dbl,
          pool: [adj, `The ${adj.replace(/^more\s+/i, "most ").replace(/er$/, "est")}`, `More ${adj.replace(/^more\s+/i, "")}`, `As ${adj}`],
        };
      }
    }
    if (id === 32) {
      const sup = findWordRegexMatch(sentence, /\bthe\s+(?:most\s+[a-z]+|[a-z]+est)\b/i);
      if (sup) {
        const bare = sup.text.replace(/^the\s+/i, "");
        const comp = bare.startsWith("most ") ? bare.replace(/^most /, "more ") : bare.replace(/est$/, "er");
        const pos = bare.replace(/^most /, "").replace(/est$/, "");
        return { match: sup, pool: [comp, bare, pos, `more ${pos}`] };
      }
    }
    if (id === 33) {
      const comp = findWordRegexMatch(sentence, /\b(?:more\s+[a-z]+|[a-z]{3,}er)\s+than\b/i);
      if (comp) {
        const adjPhrase = comp.text.replace(/\s+than$/i, "");
        const baseAdj = adjPhrase.replace(/^more\s+/i, "").replace(/er$/, "");
        return {
          match: { text: adjPhrase, index: comp.index, length: adjPhrase.length },
          pool: [`most ${baseAdj}`, `the most ${baseAdj}`, baseAdj, `${baseAdj}ly`],
        };
      }
    }
    if (id === 31) {
      const eq = findWordRegexMatch(sentence, /\bas\s+([a-z]+)\s+as\b/i);
      if (eq) {
        return {
          match: { text: "as", index: eq.index, length: 2 },
          pool: ["so", "than", "more", "like"],
        };
      }
    }
  }

  // Lesson 9, 10, 11: SVA
  if ([9, 10, 11].includes(id)) {
    const m = findWordRegexMatch(
      sentence,
      /\b(is|are|was|were|has|have|wasn't|weren't|doesn't|don't)\b/
    );
    if (m) {
      const swap = {
        is: ["are", "were", "being", "to be"],
        are: ["is", "was", "being", "to be"],
        was: ["were", "are", "being", "to be"],
        were: ["was", "is", "being", "to be"],
        has: ["have", "having", "are", "were"],
        have: ["has", "having", "is", "was"],
        "doesn't": ["don't", "weren't", "aren't", "not"],
        "don't": ["doesn't", "wasn't", "isn't", "not"],
      };
      return { match: m, pool: swap[m.text] || ["is", "are", "was", "were"] };
    }
  }

  // Connectors / Relatives / Prepositions / Reported: 5, 6, 21, 22, 23, 24, 29, 30, 61, 67
  for (const grp of CONNECTOR_GROUPS) {
    const sorted = [...grp].sort((a, b) => b.length - a.length);
    const rx = new RegExp(`\\b(${sorted.map((x) => x.replace(/\s+/g, "\\s+")).join("|")})\\b`, "i");
    const m = findWordRegexMatch(sentence, rx);
    if (m) {
      const low = m.text.toLowerCase();
      return {
        match: m,
        pool: grp.filter((g) => g !== low && !low.includes(g)),
      };
    }
  }

  // Generic fallback: pick any family word, adverb, or finite/nonfinite verb in sentence
  const words = Array.from(sentence.matchAll(/\b[A-Za-z]{4,}\b/g));
  for (const w of words) {
    const morphs = deriveMorphDistractors(w[0]);
    if (morphs.length >= 3) {
      return {
        match: { text: w[0], index: w.index, length: w[0].length },
        pool: morphs,
      };
    }
  }

  return null;
}

function buildExampleExercises(lesson, levelPool, topicCounter) {
  const concept = lesson.sections.find((s) => s.type === "concept")?.body || "";
  const formulaSec = lesson.sections.find((s) => s.type === "formula");
  const formulaHint = formulaSec?.subSections?.[0]
    ? `${formulaSec.subSections[0].label}: ${formulaSec.subSections[0].pattern}`
    : "";
  const sentences = lesson.sections.find((s) => s.type === "examples")?.sentences || [];
  const exercises = [];

  for (let i = 0; i < sentences.length; i += 1) {
    const sentence = String(sentences[i]).replace(/\s+/g, " ").trim();
    if (!sentence) continue;

    const hit = matchExampleTarget(lesson, sentence);
    if (!hit) continue;

    const prompt = replaceAtSpan(sentence, hit.match.index, hit.match.length);
    if (!prompt.includes("___")) continue;

    const optPack = finalizeOptions(
      hit.match.text,
      hit.pool,
      `ex:${lesson.id}:${i}:${sentence}`
    );
    if (!optPack) continue;

    const level = levelPool[topicCounter.n % 3];
    topicCounter.n += 1;

    const explanationLines = [
      `[Dạng: ${lesson.title}]`,
      `• Câu hoàn chỉnh: ${sentence}`,
      concept ? `• Điểm ngữ pháp: ${truncateText(concept, 240)}` : null,
      formulaHint ? `• Công thức: ${formulaHint}` : null,
    ].filter(Boolean);

    exercises.push({
      kind: "choice",
      level,
      prompt,
      options: optPack.options,
      answerIndex: optPack.answerIndex,
      acceptedAnswers: [],
      explanation: explanationLines.join("\n"),
      lessonSection: lesson.sections.some((s) => s.type === "indicators") && i % 3 === 2
        ? "signals"
        : "examples",
    });
  }

  return exercises;
}

function cleanNoteSentence(text) {
  return String(text || "")
    .replace(/\s*\('[^']*'\s+is\s+[^)]*\)\s*/g, " ")
    .replace(/\s*\([^)]*unnecessary[^)]*\)\s*/gi, " ")
    .replace(/\s*\(meaning:[^)]*\)\s*/gi, " ")
    .split(" / ")[0]
    .replace(/\s+/g, " ")
    .trim();
}

function reconstructCorrectFromDots(rawWrong, rawCorrect) {
  const wrongClean = cleanNoteSentence(rawWrong);
  const corrClean = cleanNoteSentence(rawCorrect);

  if (corrClean.includes("=") && wrongClean.includes("=")) {
    return null; // Conceptual definition note like "Must not = not necessary", not a sentence blank
  }

  // Case 1: "...tail" -> align first non-ellipsis words inside rawWrong
  if (corrClean.startsWith("...") && !corrClean.endsWith("...")) {
    const fragment = corrClean.replace(/^\.{3}\s*/, "").trim();
    const fragWords = fragment.split(/\s+/);
    const ww = wrongClean.split(/\s+/);
    const anchor = fragWords[0]?.toLowerCase().replace(/[.,!?]+$/, "");
    const idx = ww.findIndex((w) => w.toLowerCase().replace(/[.,!?]+$/, "") === anchor);
    if (idx > 0) {
      return [...ww.slice(0, idx), fragment].join(" ");
    }
    if (fragWords.length === 2 && ww.includes("Monday.") && fragment.toLowerCase() === "on monday.") {
      return wrongClean.replace(/\bat Monday\b/i, "on Monday");
    }
    // Check last anchor word (e.g. "...not so reliable AS the original." or "...on Monday.")
    const tailAnchor = fragWords[fragWords.length - 1]?.toLowerCase().replace(/[.,!?]+$/, "");
    const tailIdx = ww.findIndex((w) => w.toLowerCase().replace(/[.,!?]+$/, "") === tailAnchor);
    if (tailIdx >= fragWords.length - 1) {
      const prefixLen = Math.max(0, tailIdx - fragWords.length + 1);
      return [...ww.slice(0, prefixLen), fragment.replace(/\bAS\b/g, "as")].join(" ");
    }
  }

  // Case 2: "head..." -> align last word before "..." inside rawWrong and append remaining wrong suffix
  if (corrClean.endsWith("...") && !corrClean.startsWith("...")) {
    const head = corrClean.replace(/\.{3}$/, "").trim();
    const hw = head.split(/\s+/);
    const ww = wrongClean.split(/\s+/);
    const lastWord = hw[hw.length - 1]?.toLowerCase().replace(/[.,!?]+$/, "");
    const idx = ww.findIndex((w, pos) => pos >= hw.length - 2 && w.toLowerCase().replace(/[.,!?]+$/, "") === lastWord);
    if (idx >= 0 && idx + 1 < ww.length) {
      const origPunct = ww[idx].match(/[,.;!?]+$/)?.[0] || "";
      const fixedHead = [...hw.slice(0, -1), hw[hw.length - 1].replace(/[,.;!?]+$/, "") + origPunct];
      return [...fixedHead, ...ww.slice(idx + 1)].join(" ");
    }
    if (
      idx === -1 &&
      hw.length === 2 &&
      ww[0] === hw[0] &&
      /^(?:have|has|had|am|is|are|was|were|will|did)$/i.test(ww[1]) &&
      ww.length > 3
    ) {
      return [...hw, ...ww.slice(3)].join(" ");
    }
    if (hw.length < 3) {
      return null;
    }
    return head;
  }

  // Case 3: "...mid..." -> swap mismatched verb/token inside rawWrong
  if (corrClean.startsWith("...") && corrClean.endsWith("...")) {
    const mid = corrClean.replace(/^\.{3}\s*|\s*\.{3}$/g, "").trim();
    const mw = mid.split(/\s+/);
    const ww = wrongClean.split(/\s+/);
    const anchor = mw[0]?.toLowerCase();
    const idx = ww.findIndex((w) => w.toLowerCase() === anchor);
    if (idx >= 0) {
      const replaceLen = mw.length;
      if (mw[mw.length - 1] === "installed") {
        return wrongClean.replace(/\binstall\b/, "installed");
      }
      if (mw[mw.length - 1] === "completed") {
        return wrongClean.replace(/\bcomplete\b/, "completed");
      }
      return [...ww.slice(0, idx), ...mw, ...ww.slice(idx + replaceLen)].join(" ");
    }
    return wrongClean;
  }

  // Case 4: rawCorrect dropped final object words that still exist in rawWrong (e.g. "She doesn't usually attend." vs "She don't usually attend the briefing.")
  const cw = corrClean.split(/\s+/);
  const ww = wrongClean.split(/\s+/);
  const cLast = cw[cw.length - 1]?.toLowerCase().replace(/[.,!?]+$/, "");
  const wMatchIdx = ww.findIndex((w, idx) => idx > 0 && idx < ww.length - 1 && w.toLowerCase().replace(/[.,!?]+$/, "") === cLast);
  if (wMatchIdx > 0 && cw.length < ww.length) {
    const cleanHead = [...cw.slice(0, -1), cw[cw.length - 1].replace(/[.,!?]+$/, "")];
    return [...cleanHead, ...ww.slice(wMatchIdx + 1)].join(" ");
  }

  // Case 4b: "I will go / I am going to the office tomorrow." vs "I will going to the office tomorrow."
  const wAtLast = ww[cw.length - 1]?.toLowerCase() || "";
  if (
    !/[.!?]$/.test(corrClean) &&
    cw.length < ww.length &&
    cLast &&
    (wAtLast.startsWith(cLast) || cLast.startsWith(wAtLast))
  ) {
    return [...cw, ...ww.slice(cw.length)].join(" ");
  }

  return corrClean;
}

function buildNoteExercises(lesson, levelPool, topicCounter) {
  const items = lesson.sections.find((s) => s.type === "note")?.items || [];
  const exercises = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const rawWrong = String(item.wrong || "").trim();
    const rawCorrect = String(item.correct || "").trim();
    const noteText = String(item.explanation || "").trim();

    const cleanCorrect = reconstructCorrectFromDots(rawWrong, rawCorrect);
    if (!cleanCorrect || cleanCorrect.includes("...")) continue;

    const wrongClean = cleanNoteSentence(rawWrong);
    const cw = cleanCorrect.split(/\s+/);
    const ww = wrongClean.split(/\s+/);

    let p = 0;
    while (p < cw.length && p < ww.length && cw[p] === ww[p]) p += 1;
    let s = 0;
    while (
      s < cw.length - p &&
      s < ww.length - p &&
      cw[cw.length - 1 - s] === ww[ww.length - 1 - s]
    ) {
      s += 1;
    }

    let prompt = "";
    let correctSpan = "";
    let pool = [];

    const cDiffCount = cw.length - p - s;
    const wDiffCount = ww.length - p - s;

    // Only use raw diff if it isolates a crisp 1-3 word window and isn't purely punctuation
    const punctuationOnly =
      cDiffCount === 1 &&
      wDiffCount === 1 &&
      cw[p].replace(/[,.;!?]/g, "") === ww[p].replace(/[,.;!?]/g, "");

    if (!punctuationOnly && (p > 0 || s > 0) && cDiffCount >= 1 && cDiffCount <= 3 && wDiffCount <= 3) {
      let cEnd = cw.length - s;
      let wEnd = ww.length - s;
      if (cEnd <= p && p > 0) p -= 1;
      if (wEnd <= p && p > 0) p -= 1;
      const rawSpan = cw.slice(p, cEnd).join(" ");
      correctSpan = rawSpan.replace(/[.,!?]+$/, "");
      const wrongSpan = ww.slice(p, wEnd).join(" ").replace(/[.,!?]+$/, "");
      const punct = rawSpan.match(/[.,!?]+$/)?.[0] || "";
      prompt = [...cw.slice(0, p), `___${punct}`, ...cw.slice(cEnd)].join(" ");

      const basePool = [
        wrongSpan,
        ...deriveMorphDistractors(correctSpan),
        ...buildVerbTenseDistractors(lesson.id, correctSpan),
      ];
      const hit = matchExampleTarget(lesson, cleanCorrect);
      if (hit) {
        basePool.push(...hit.pool);
      }
      pool = basePool;
    } else {
      const hit = matchExampleTarget(lesson, cleanCorrect);
      if (!hit) continue;
      prompt = replaceAtSpan(cleanCorrect, hit.match.index, hit.match.length);
      correctSpan = hit.match.text;
      pool = hit.pool;
    }

    if (!prompt.includes("___") || !correctSpan || prompt.split(/\s+/).length < 3) continue;
    const optPack = finalizeOptions(
      correctSpan,
      pool,
      `note:${lesson.id}:${i}:${cleanCorrect}`
    );
    if (!optPack) continue;

    const level = levelPool[topicCounter.n % 3];
    topicCounter.n += 1;

    exercises.push({
      kind: "choice",
      level,
      prompt,
      options: optPack.options,
      answerIndex: optPack.answerIndex,
      acceptedAnswers: [],
      explanation: [
        `[Dạng: ${lesson.title} — Lỗi thường gặp]`,
        noteText,
        `• Câu đúng: ${rawCorrect}`,
        `• Câu sai: ${rawWrong}`,
      ]
        .filter(Boolean)
        .join("\n"),
      lessonSection: "mistakes",
    });
  }

  return exercises;
}

function buildDauEnglishQuestionExercise(q, level) {
  const prompt = String(q.question_text || "")
    .replace(/_{2,}|-{3,}/g, "___")
    .replace(/\s+/g, " ")
    .trim();
  const options = [q.option_a, q.option_b, q.option_c, q.option_d].map((o) =>
    String(o || "").trim()
  );
  const answerIndex = { A: 0, B: 1, C: 2, D: 3 }[String(q.correct_answer || "").toUpperCase()];

  if (
    !prompt.includes("___") ||
    options.some((o) => !o) ||
    new Set(options).size !== options.length ||
    !(answerIndex >= 0 && answerIndex < 4)
  ) {
    return null;
  }

  let vocabLines = "";
  try {
    const parsedVocab = JSON.parse(q.vocabulary || "{}");
    const list = parsedVocab?.vocabulary || [];
    if (list.length > 0) {
      vocabLines = list
        .slice(0, 4)
        .map((v) => `${v.word} (${v.pos || "?"}): ${v.meaning_vi || ""}`)
        .join("; ");
    }
  } catch {
    vocabLines = "";
  }

  const explanation = [
    `[Dạng: ${q.subtopic_title || "Danh từ"}]`,
    q.explanation_vi || "",
    q.translation_vi ? `• Dịch nghĩa: ${q.translation_vi}` : null,
    vocabLines ? `• Từ vựng: ${vocabLines}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    kind: "choice",
    level,
    prompt,
    options,
    answerIndex,
    acceptedAnswers: [],
    explanation,
    lessonSection: "structure",
  };
}

function extractVocabEntries(rawData) {
  const byKey = new Map();

  // 1. From dauenglish.com nouns questions vocabulary JSON
  for (const rows of Object.values(rawData.questionsByTopic || {})) {
    if (!Array.isArray(rows)) continue;
    for (const q of rows) {
      if (!q?.vocabulary) continue;
      let parsed;
      try {
        parsed = typeof q.vocabulary === "string" ? JSON.parse(q.vocabulary) : q.vocabulary;
      } catch {
        continue;
      }
      for (const item of parsed?.vocabulary || []) {
        const word = truncateText(item.word, 60);
        const key = wordKey(word);
        if (!word || !key) continue;
        if (!byKey.has(key)) {
          byKey.set(key, {
            word,
            wordKey: key,
            phonetic: truncateText(item.ipa_us || item.ipa_uk, 80),
            definitionVi: truncateText(item.meaning_vi, 300),
            definitionEn: truncateText(
              item.pos ? `(${item.pos}${item.cefr ? `, ${item.cefr}` : ""})` : null,
              300
            ),
            example: truncateText(item.example_en, 400),
            source: "grammar",
          });
        }
        for (const wf of item.word_family || []) {
          const fw = truncateText(wf.word, 60);
          const fk = wordKey(fw);
          if (!fw || !fk || byKey.has(fk)) continue;
          byKey.set(fk, {
            word: fw,
            wordKey: fk,
            phonetic: null,
            definitionVi: truncateText(wf.vi, 300),
            definitionEn: truncateText(wf.pos ? `(${wf.pos})` : null, 300),
            example: null,
            source: "grammar",
          });
        }
      }
    }
  }

  // 2. From dautoeic.vn Lesson 56 word-family conjugation tables
  for (const lesson of rawData.dautoeicLessons || []) {
    if (lesson.id !== 56) continue;
    for (const sec of lesson.sections || []) {
      if (sec.type !== "conjugation") continue;
      for (const tbl of sec.tables || []) {
        const headers = tbl.headers || [];
        for (const row of tbl.rows || []) {
          for (let c = 0; c < row.length; c += 1) {
            const cell = String(row[c] || "");
            const role = headers[c] || "Word family";
            const parts = cell.split("/").map((p) => p.trim());
            for (const p of parts) {
              const word = truncateText(p, 60);
              const key = wordKey(word);
              if (!word || !key || byKey.has(key)) continue;
              byKey.set(key, {
                word,
                wordKey: key,
                phonetic: null,
                definitionVi: null,
                definitionEn: truncateText(`${role} (word family: ${row[0]})`, 300),
                example: null,
                source: "grammar",
              });
            }
          }
        }
      }
    }
  }

  return Array.from(byKey.values());
}

function buildGrammarPayloads(rawData) {
  const lessonById = new Map((rawData.dautoeicLessons || []).map((l) => [l.id, l]));
  const levelPool = ["basic", "intermediate", "advanced"];
  const topicPayloads = [];

  for (const [slug, lessonIds] of Object.entries(TOPIC_TO_LESSON_IDS)) {
    const formulas = [];
    const exercises = [];
    const counter = { n: 0 };

    for (const lessonId of lessonIds) {
      const lesson = lessonById.get(lessonId);
      if (!lesson) {
        throw new Error(`Missing crawled dautoeic lesson id=${lessonId} for topic ${slug}`);
      }
      const formulaSec = lesson.sections.find((s) => s.type === "formula");
      const examples = (lesson.sections.find((s) => s.type === "examples")?.sentences || [])
        .slice(0, 2)
        .map((en) => ({ en, vi: "" }));

      for (const sub of formulaSec?.subSections || []) {
        if (!sub?.pattern || !sub?.label) continue;
        formulas.push({
          pattern: sub.pattern.trim(),
          usage: `[Đậu TOEIC · ${lesson.title}] ${sub.label.trim()}`,
          examples,
        });
      }

      exercises.push(...buildNoteExercises(lesson, levelPool, counter));
      exercises.push(...buildExampleExercises(lesson, levelPool, counter));
    }

    // Add dauenglish.com nouns questions cleanly
    const nounsRows = rawData.questionsByTopic?.nouns || [];
    for (let i = 0; i < nounsRows.length; i += 1) {
      const q = nounsRows[i];
      const targetSlug = q.subtopic_slug === "nouns-al-ive" ? "tu-loai" : "danh-tu-mao-tu";
      if (targetSlug !== slug) continue;
      const ex = buildDauEnglishQuestionExercise(q, levelPool[counter.n % 3]);
      if (ex) {
        counter.n += 1;
        exercises.push(ex);
      }
    }

    topicPayloads.push({ slug, formulas, exercises });
  }

  // Validate every generated exercise against L-English grammar_exercises rules
  for (const tp of topicPayloads) {
    tp.exercises.forEach((x, idx) => {
      const where = `${tp.slug} #${idx + 1}`;
      if (x.kind !== "choice") throw new Error(`${where}: invalid kind ${x.kind}`);
      if (!["basic", "intermediate", "advanced"].includes(x.level)) {
        throw new Error(`${where}: invalid level ${x.level}`);
      }
      if (!x.prompt.includes("___")) throw new Error(`${where}: missing ___ in "${x.prompt}"`);
      if (x.options.length !== 4 || new Set(x.options.map((o) => o.toLowerCase())).size !== 4) {
        throw new Error(`${where}: invalid options ${JSON.stringify(x.options)}`);
      }
      if (!(x.answerIndex >= 0 && x.answerIndex < 4)) {
        throw new Error(`${where}: invalid answerIndex ${x.answerIndex}`);
      }
      if (!x.explanation.startsWith("[Dạng:")) {
        throw new Error(`${where}: missing [Dạng: prefix in explanation`);
      }
    });
  }

  return {
    topicPayloads,
    vocabEntries: extractVocabEntries(rawData),
  };
}

async function ensureSchemaAndSeed(client, starterTopics) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "grammar_topics" (
      "id" SERIAL NOT NULL,
      "slug" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "group_name" TEXT NOT NULL,
      "level" TEXT NOT NULL DEFAULT 'intermediate',
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "summary" TEXT,
      "hidden" BOOLEAN NOT NULL DEFAULT false,
      "video_url" TEXT,
      "lesson" JSONB,
      "toeic_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "roadmap_labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "grammar_topics_pkey" PRIMARY KEY ("id")
    );
    CREATE TABLE IF NOT EXISTS "grammar_formulas" (
      "id" SERIAL NOT NULL,
      "topic_id" INTEGER NOT NULL,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "pattern" TEXT NOT NULL,
      "usage" TEXT NOT NULL,
      "examples" JSONB NOT NULL DEFAULT '[]',
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "grammar_formulas_pkey" PRIMARY KEY ("id")
    );
    CREATE TABLE IF NOT EXISTS "grammar_exercises" (
      "id" SERIAL NOT NULL,
      "topic_id" INTEGER NOT NULL,
      "kind" TEXT NOT NULL,
      "level" TEXT NOT NULL DEFAULT 'intermediate',
      "prompt" TEXT NOT NULL,
      "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "answer_index" INTEGER,
      "accepted_answers" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "explanation" TEXT,
      "lesson_section" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "grammar_exercises_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "grammar_topics_slug_key" ON "grammar_topics"("slug");
    CREATE INDEX IF NOT EXISTS "idx_grammar_formulas_topic" ON "grammar_formulas"("topic_id");
    CREATE INDEX IF NOT EXISTS "idx_grammar_exercises_topic" ON "grammar_exercises"("topic_id", "level", "active");
  `);

  for (const t of starterTopics) {
    await client.query(
      `INSERT INTO "grammar_topics" ("slug", "name", "group_name", "level", "sort_order", "summary", "lesson", "toeic_categories", "roadmap_labels", "updated_at")
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::text[], $9::text[], NOW())
       ON CONFLICT ("slug") DO NOTHING`,
      [
        t.slug,
        t.name,
        t.group_name,
        t.level,
        t.sort_order,
        t.summary,
        JSON.stringify(t.lesson),
        t.toeic_categories || [],
        t.roadmap_labels || [],
      ]
    );

    const tidRes = await client.query(`SELECT id FROM "grammar_topics" WHERE "slug" = $1`, [t.slug]);
    const topicId = tidRes.rows[0].id;

    const hasFormulas = await client.query(
      `SELECT 1 FROM "grammar_formulas" WHERE "topic_id" = $1 LIMIT 1`,
      [topicId]
    );
    if (hasFormulas.rows.length === 0) {
      for (let i = 0; i < (t.formulas || []).length; i += 1) {
        const f = t.formulas[i];
        await client.query(
          `INSERT INTO "grammar_formulas" ("topic_id", "sort_order", "pattern", "usage", "examples", "updated_at")
           VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
          [topicId, i, f.pattern, f.usage, JSON.stringify((f.examples || []).filter((e) => e.en))]
        );
      }
    }

    const hasExercises = await client.query(
      `SELECT 1 FROM "grammar_exercises" WHERE "topic_id" = $1 AND ("explanation" IS NULL OR "explanation" NOT LIKE '[Dạng:%') LIMIT 1`,
      [topicId]
    );
    if (hasExercises.rows.length === 0) {
      for (const x of t.exercises || []) {
        await client.query(
          `INSERT INTO "grammar_exercises" ("topic_id", "kind", "level", "prompt", "options", "answer_index", "accepted_answers", "explanation", "lesson_section", "active", "updated_at")
           VALUES ($1, $2, $3, $4, $5::text[], $6::int, $7::text[], $8, $9, true, NOW())`,
          [
            topicId,
            x.kind,
            x.level,
            x.prompt,
            x.options || [],
            x.answer_index ?? null,
            x.accepted_answers || [],
            x.explanation || null,
            x.lesson_section || null,
          ]
        );
      }
    }
  }
}

async function importToDatabase(label, connectionString, starterTopics, payloads) {
  console.log(`\n=== Importing grammar to ${label} ===`);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query("BEGIN");
    await ensureSchemaAndSeed(client, starterTopics);

    const topicsRes = await client.query(`SELECT id, slug FROM "grammar_topics"`);
    const topicIdBySlug = new Map(topicsRes.rows.map((r) => [r.slug, r.id]));

    let addedFormulas = 0;
    let insertedExercises = 0;

    for (const tp of payloads.topicPayloads) {
      const topicId = topicIdBySlug.get(tp.slug);
      if (!topicId) {
        throw new Error(`Topic slug not found in ${label}: ${tp.slug}`);
      }

      const existingFormulas = await client.query(
        `SELECT pattern, sort_order FROM "grammar_formulas" WHERE "topic_id" = $1`,
        [topicId]
      );
      const patternSet = new Set(existingFormulas.rows.map((r) => r.pattern.trim()));
      let maxSort = existingFormulas.rows.reduce(
        (m, r) => Math.max(m, Number(r.sort_order) || 0),
        -1
      );

      for (const f of tp.formulas) {
        if (patternSet.has(f.pattern)) continue;
        patternSet.add(f.pattern);
        maxSort += 1;
        await client.query(
          `INSERT INTO "grammar_formulas" ("topic_id", "sort_order", "pattern", "usage", "examples", "updated_at")
           VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
          [topicId, maxSort, f.pattern, f.usage, JSON.stringify(f.examples)]
        );
        addedFormulas += 1;
      }

      // Idempotent replace strictly for imported rows ([Dạng:...) without touching starter rows
      await client.query(
        `DELETE FROM "grammar_exercises" WHERE "topic_id" = $1 AND "explanation" LIKE '[Dạng:%'`,
        [topicId]
      );

      for (const ex of tp.exercises) {
        await client.query(
          `INSERT INTO "grammar_exercises" ("topic_id", "kind", "level", "prompt", "options", "answer_index", "accepted_answers", "explanation", "lesson_section", "active", "updated_at")
           VALUES ($1, $2, $3, $4, $5::text[], $6::int, $7::text[], $8, $9, true, NOW())`,
          [
            topicId,
            ex.kind,
            ex.level,
            ex.prompt,
            ex.options,
            ex.answerIndex,
            ex.acceptedAnswers,
            ex.explanation,
            ex.lessonSection,
          ]
        );
        insertedExercises += 1;
      }
    }

    // Upsert vocab_entries on DBs that have it (Neon)
    let insertedVocab = 0;
    const hasVocabTable = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vocab_entries'`
    );
    if (hasVocabTable.rows.length > 0 && payloads.vocabEntries.length > 0) {
      const orderRes = await client.query(
        `SELECT COALESCE(MAX(display_order), 0)::int AS max_order FROM vocab_entries`
      );
      let nextOrder = Number(orderRes.rows[0].max_order) + 1;
      for (const v of payloads.vocabEntries) {
        const res = await client.query(
          `INSERT INTO vocab_entries (word, word_key, phonetic, definition_vi, definition_en, example, source, display_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (word_key) DO NOTHING`,
          [v.word, v.wordKey, v.phonetic, v.definitionVi, v.definitionEn, v.example, v.source, nextOrder]
        );
        if (res.rowCount > 0) {
          insertedVocab += 1;
          nextOrder += 1;
        }
      }
    }

    await client.query("COMMIT");

    const summaryRes = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM grammar_topics) AS topics,
        (SELECT COUNT(*)::int FROM grammar_formulas) AS formulas,
        (SELECT COUNT(*)::int FROM grammar_exercises) AS exercises,
        (SELECT COUNT(*)::int FROM grammar_exercises WHERE explanation LIKE '[Dạng:%') AS imported_exercises,
        (SELECT COUNT(*)::int FROM grammar_exercises WHERE level = 'basic') AS basic_cnt,
        (SELECT COUNT(*)::int FROM grammar_exercises WHERE level = 'intermediate') AS intermediate_cnt,
        (SELECT COUNT(*)::int FROM grammar_exercises WHERE level = 'advanced') AS advanced_cnt
    `);
    const perTopicRes = await client.query(`
      SELECT gt.slug, COUNT(ge.id)::int AS total
      FROM grammar_topics gt
      LEFT JOIN grammar_exercises ge ON ge.topic_id = gt.id
      GROUP BY gt.slug, gt.sort_order
      ORDER BY gt.sort_order ASC
    `);

    console.log(
      `  Added formulas: ${addedFormulas}, Inserted imported exercises: ${insertedExercises}, Inserted vocab_entries: ${insertedVocab}`
    );
    console.log(`  DB Totals (${label}):`, summaryRes.rows[0]);
    console.log(
      "  Per topic totals:",
      perTopicRes.rows.map((r) => `${r.slug}:${r.total}`).join(", ")
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Input file not found: ${INPUT_PATH}`);
  }
  const rawData = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));
  const starterTopics = [
    ...require(path.resolve("backend/prisma/data/grammar/topics-1.cjs")),
    ...require(path.resolve("backend/prisma/data/grammar/topics-2.cjs")),
    ...require(path.resolve("backend/prisma/data/grammar/topics-3.cjs")),
  ];

  const payloads = buildGrammarPayloads(rawData);
  const totalEx = payloads.topicPayloads.reduce((s, tp) => s + tp.exercises.length, 0);
  const totalForm = payloads.topicPayloads.reduce((s, tp) => s + tp.formulas.length, 0);
  console.log(
    `Prepared ${payloads.topicPayloads.length} topics, ${totalForm} formula items, ${totalEx} exercises, ${payloads.vocabEntries.length} vocab entries.`
  );

  if (DRY_RUN) {
    for (const tp of payloads.topicPayloads) {
      console.log(`  [DRY RUN] ${tp.slug}: +${tp.formulas.length} formulas, +${tp.exercises.length} exercises`);
    }
    if (AUDIT) {
      const allEx = payloads.topicPayloads.flatMap((tp) =>
        tp.exercises.map((ex) => ({ slug: tp.slug, ...ex }))
      );
      const byLevel = { basic: 0, intermediate: 0, advanced: 0 };
      for (const ex of allEx) byLevel[ex.level] = (byLevel[ex.level] || 0) + 1;
      const shortPrompts = allEx.filter((e) => e.prompt.split(/\s+/).length < 4);
      const longOpts = allEx.filter((e) =>
        e.options.some((o) => o.split(/\s+/).length > 4)
      );
      const weirdOpts = allEx.filter((e) =>
        e.options.some((o) =>
          /'(?:ed|ing|ly|s|tion)|inged|eding|lyed|beed|haveed|[.;!?]$|^[,.;!?]|\.\.\./i.test(o)
        )
      );
      console.log("Audit summary:", {
        total: allEx.length,
        byLevel,
        shortPrompts: shortPrompts.length,
        longOpts: longOpts.length,
        weirdOpts: weirdOpts.length,
      });
      if (shortPrompts.length) {
        console.log("Short prompts:", shortPrompts.slice(0, 10).map((e) => [e.slug, e.prompt, e.options, e.explanation]));
      }
      if (longOpts.length) {
        console.log("Long options:", longOpts.slice(0, 10).map((e) => [e.slug, e.prompt, e.options]));
      }
      if (weirdOpts.length) {
        console.log("Weird options:", weirdOpts.slice(0, 15).map((e) => [e.slug, e.prompt, e.options]));
      }
    }
    console.log("Dry run sample:", JSON.stringify(payloads.topicPayloads[0].exercises.slice(0, 3), null, 2));
    return;
  }

  const env = loadEnv();
  const targets = [
    ["NEON", env.DATABASE_URL],
    ["SUPABASE_POOLER", env.SUPABASE_POOLER_UR],
  ];

  for (const [label, url] of targets) {
    if (!url) {
      console.warn(`Skipping ${label}: connection string not found in .env`);
      continue;
    }
    await importToDatabase(label, url, starterTopics, payloads);
  }
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
