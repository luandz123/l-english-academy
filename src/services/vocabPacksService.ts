import { supabase } from '@/integrations/supabase/client';
import { VocabTopic, VocabWord } from '@/components/game/WordShooter/types';
import { DEFAULT_VOCAB_TOPICS } from '@/components/game/WordShooter/defaultVocabPacks';
import { TOEIC_600_MASTER_PACK, TOEIC_THEMATIC_PACKS, TOEIC_600_ALL_WORDS } from '@/data/toeic600Data';

export { TOEIC_600_MASTER_PACK, TOEIC_THEMATIC_PACKS, TOEIC_600_ALL_WORDS };

export const VOCAB_PACKS_STORAGE_KEY = 'game_vocab_packs';
export const VOCAB_PACKS_UPDATED_EVENT = 'vocab-packs-updated';

/**
 * Ensure 5 core TOEIC packs are always present
 */
export function ensureToeicPacksIncluded(packs: VocabTopic[]): VocabTopic[] {
  const result = [...packs];
  for (const defaultPack of DEFAULT_VOCAB_TOPICS) {
    if (!result.some((p) => p.id === defaultPack.id)) {
      result.push(defaultPack);
    }
  }
  return result;
}

/**
 * Load all vocabulary topics
 * Priority: Supabase platform_settings -> localStorage cache -> DEFAULT_VOCAB_TOPICS
 */
export async function getVocabPacks(): Promise<VocabTopic[]> {
  // 1. Try fetching from Supabase platform_settings
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'game_vocab_packs')
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = ensureToeicPacksIncluded(parsed);
        localStorage.setItem(VOCAB_PACKS_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.warn('[vocabPacksService] Could not fetch from Supabase, falling back to local cache:', err);
  }

  // 2. Fallback to localStorage cache
  try {
    const cached = localStorage.getItem(VOCAB_PACKS_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return ensureToeicPacksIncluded(parsed);
      }
    }
  } catch (err) {
    console.warn('[vocabPacksService] Could not parse local cache:', err);
  }

  // 3. Fallback to built-in default packs
  return DEFAULT_VOCAB_TOPICS;
}

/**
 * Synchronous local read for instant render before async fetch finishes
 */
export function getCachedVocabPacks(): VocabTopic[] {
  try {
    const cached = localStorage.getItem(VOCAB_PACKS_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return ensureToeicPacksIncluded(parsed);
      }
    }
  } catch {
    // Ignore error
  }
  return DEFAULT_VOCAB_TOPICS;
}

/**
 * Save vocabulary topics to both Supabase and localStorage
 */
export async function saveVocabPacks(packs: VocabTopic[]): Promise<{ success: boolean; error?: string }> {
  const jsonString = JSON.stringify(packs);

  // 1. Save locally first for instant responsiveness
  try {
    localStorage.setItem(VOCAB_PACKS_STORAGE_KEY, jsonString);
    window.dispatchEvent(new CustomEvent(VOCAB_PACKS_UPDATED_EVENT, { detail: packs }));
  } catch (err) {
    console.warn('[vocabPacksService] Could not write to localStorage:', err);
  }

  // 2. Persist to Supabase platform_settings
  try {
    const { data: existing } = await supabase
      .from('platform_settings')
      .select('key')
      .eq('key', 'game_vocab_packs')
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          value: jsonString,
          updated_at: new Date().toISOString(),
        })
        .eq('key', 'game_vocab_packs');

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('platform_settings')
        .insert({
          key: 'game_vocab_packs',
          value: jsonString,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    }

    return { success: true };
  } catch (err: any) {
    console.error('[vocabPacksService] Failed to save to Supabase:', err);
    return {
      success: false,
      error: err.message || 'Lỗi lưu dữ liệu lên Supabase',
    };
  }
}

/**
 * Reset vocabulary topics to original default packs
 */
export async function resetVocabPacksToDefault(): Promise<{ success: boolean; error?: string }> {
  return await saveVocabPacks(DEFAULT_VOCAB_TOPICS);
}

/**
 * Parse bulk text input into VocabWord items
 * Supported formats:
 * - word - nghĩa - phiên âm
 * - word : nghĩa : phiên âm
 * - word | nghĩa | phiên âm
 * - word \t nghĩa \t phiên âm
 * - word, nghĩa, phiên âm
 */
export function parseBulkWordsText(rawText: string): VocabWord[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const words: VocabWord[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Ignore comment or header lines
    if (line.startsWith('#') || line.startsWith('//')) continue;

    // Detect separator: Tab, Pipe, Colon, Hyphen, Comma
    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes('|')) {
      parts = line.split('|');
    } else if (line.includes(' - ') || line.includes(' — ') || line.includes(' – ')) {
      parts = line.split(/\s*[-—–]\s*/);
    } else if (line.includes(':')) {
      parts = line.split(':');
    } else if (line.includes(';')) {
      parts = line.split(';');
    } else if (line.includes(',')) {
      parts = line.split(',');
    } else {
      // Single word without definition
      const w = line.trim();
      if (w) {
        words.push({
          id: `w_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          word: w.toLowerCase(),
          definition_vi: '',
          phonetic: '',
        });
      }
      continue;
    }

    const cleanParts = parts.map((p) => p.trim()).filter(Boolean);
    if (cleanParts.length === 0) continue;

    const word = cleanParts[0].toLowerCase();
    let definition = cleanParts[1] || '';
    let phonetic = cleanParts[2] || '';

    // If part 2 looks like a phonetic (e.g. /.../ or [...]) and part 3 is definition
    if (cleanParts[1]?.startsWith('/') || cleanParts[1]?.startsWith('[')) {
      phonetic = cleanParts[1];
      definition = cleanParts[2] || '';
    }

    if (word) {
      words.push({
        id: `w_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        word,
        definition_vi: definition,
        phonetic: phonetic.startsWith('/') ? phonetic : phonetic ? `/${phonetic}/` : '',
      });
    }
  }

  return words;
}
