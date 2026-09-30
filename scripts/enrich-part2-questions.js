/**
 * Script enrich-part2-questions.js
 * Sử dụng để tự động dùng AI (Google Gemini hoặc OpenAI) phân tích và bóc tách các câu hỏi Part 2
 * trong Supabase thành định dạng 7 bước chuẩn sư phạm (Functional Chunks, 1s Reflex, Shadowing Connected Speech, Traps).
 *
 * Chạy lệnh:
 *   node scripts/enrich-part2-questions.js --quizId=125
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);

if (!urlMatch || !keyMatch) {
  console.error('Không tìm thấy thông tin Supabase trong .env');
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function main() {
  const quizId = process.argv.find((arg) => arg.startsWith('--quizId='))?.split('=')[1] || '125';
  console.log(`Đang tải dữ liệu Quiz ID: ${quizId}...`);

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question_text, audio_url, translation, explanation, answers(*)')
    .eq('quiz_id', Number(quizId))
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Lỗi khi lấy dữ liệu câu hỏi:', error);
    return;
  }

  console.log(`Tìm thấy ${questions.length} câu hỏi Part 2.`);
  console.log('Script này có thể kết nối với Gemini API hoặc trích xuất script trực tiếp từ answers.explanation.');
}

main().catch(console.error);
