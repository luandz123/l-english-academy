import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];

async function main() {
  const url = `${supabaseUrl}/rest/v1/full_tests?course_id=eq.11&select=*,full_test_sections(part_number,quizzes(total_questions))`;
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  console.log("Tests in Course 11:");
  for (const t of data) {
    const totalQs = t.full_test_sections?.reduce((sum, s) => sum + (s.quizzes?.total_questions || 0), 0) || 0;
    console.log(`- ID: ${t.id}, Title: "${t.title}", Total Questions: ${totalQs}`);
  }
}

main().catch(console.error);
