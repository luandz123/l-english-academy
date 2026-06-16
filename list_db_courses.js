import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];

async function main() {
  const url = `${supabaseUrl}/rest/v1/courses?select=*`;
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  console.log("Courses in DB:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
