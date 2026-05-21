const fs = require('fs');
let content = fs.readFileSync('src/integrations/supabase/types.ts', 'utf8');

// Insert category_id to courses table
content = content.replace(/(\s+)subtitle: string \| null\n(\s+)thumbnail_url/g, '$1subtitle: string | null\n$1category_id: number | null\n$2thumbnail_url');
content = content.replace(/(\s+)subtitle\?: string \| null\n(\s+)thumbnail_url/g, '$1subtitle?: string | null\n$1category_id?: number | null\n$2thumbnail_url');

// Define course_categories table
const courseCategoriesStr = `      course_categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: number
          is_active: boolean | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
`;

// Insert after answers table
content = content.replace(/(\s+)courses: \{/g, '\n' + courseCategoriesStr + '$1courses: {');

fs.writeFileSync('src/integrations/supabase/types.ts', content);
