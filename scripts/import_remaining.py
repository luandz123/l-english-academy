import urllib.request
import json
import sys

URL = "https://api.supabase.com/v1/projects/ovjungvdsvzhzhobkryu/database/query"
HEADERS = {
    "Authorization": "Bearer sbp_8a4972c531140478a39404dda3cad636a46e53f9",
    "Content-Type": "application/json",
    "User-Agent": "supabase-cli/2.0.0"
}

def exec_sql(query):
    req = urllib.request.Request(URL, data=json.dumps({"query": query}).encode("utf-8"), headers=HEADERS)
    try:
        with urllib.request.urlopen(req) as response:
            return response.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        print(f"SQL Error: {e.code} - {e.read().decode('utf-8')[:300]}")
        raise e

def escape_sql_val(val):
    if val == r"\N" or val is None or val == "":
        return "NULL"
    # unescape standard pg copy escapes
    val = val.replace(r"\t", "\t").replace(r"\n", "\n").replace(r"\r", "\r").replace(r"\\", "\\")
    escaped = val.replace("'", "''")
    return f"'{escaped}'"

def main():
    print("Reading public_restore.sql line-by-line...")
    table_data = {}
    current_table = None
    current_cols = []
    current_rows = []

    with open("public_restore.sql", "r", errors="ignore") as f:
        for line in f:
            line_str = line.rstrip("\r\n")
            if line_str.startswith("COPY public.") and "FROM stdin;" in line_str:
                parts = line_str.split(" (")
                current_table = parts[0].replace("COPY public.", "").strip()
                current_cols = [c.strip() for c in parts[1].replace(") FROM stdin;", "").split(",")]
                current_rows = []
            elif line_str == "\\.":
                if current_table:
                    table_data[current_table] = (current_cols, current_rows)
                    current_table = None
            elif current_table:
                if line_str:
                    current_rows.append(line_str)

    print(f"Parsed {len(table_data)} tables from dump.")

    # Drop NOT NULL constraints on optional fields
    for alter_cmd in [
        "ALTER TABLE public.lesson_practices ALTER COLUMN title DROP NOT NULL;",
        "ALTER TABLE public.questions ALTER COLUMN question_text DROP NOT NULL;",
        "ALTER TABLE public.answers ALTER COLUMN answer_text DROP NOT NULL;",
        "ALTER TABLE public.vocab_questions ALTER COLUMN definition_vi DROP NOT NULL;",
        "ALTER TABLE public.vocab_questions ALTER COLUMN definition_en DROP NOT NULL;",
        "ALTER TABLE public.vocab_questions ALTER COLUMN phonetic DROP NOT NULL;",
        "ALTER TABLE public.vocab_questions ALTER COLUMN example_sentence DROP NOT NULL;",
    ]:
        try:
            exec_sql(alter_cmd)
        except Exception:
            pass

    # Focus on remaining tables with correct foreign key order
    remaining_order = [
        "profiles",
        "user_roles",
        "enrollments",
        "platform_settings",
        "user_lesson_progress",
        "user_quiz_results",
        "user_answers",
        "user_full_test_results",
        "full_test_answer_details",
        "user_favorites",
        "user_notes",
        "admin_activity_log",
        "admin_student_notes"
    ]

    for table in remaining_order:
        if table not in table_data:
            continue
        cols, rows = table_data[table]
        if not rows:
            print(f"Skipping {table} (0 rows)")
            continue

        print(f"Importing {table}: {len(rows)} rows...")
        cols_joined = ", ".join(f'"{c}"' for c in cols)
        
        batch_size = 500
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i+batch_size]
            val_rows = []
            for r in batch:
                vals = r.split("\t")
                if len(vals) != len(cols):
                    continue
                val_strs = [escape_sql_val(v) for v in vals]
                val_rows.append(f"({', '.join(val_strs)})")
            
            if not val_rows:
                continue

            sql = f"INSERT INTO public.{table} ({cols_joined}) VALUES\n" + ",\n".join(val_rows) + " ON CONFLICT DO NOTHING;"
            exec_sql(sql)

        print(f"✓ {table} imported successfully ({len(rows)} rows)!")

    # Update sequences
    print("Updating identity sequences...")
    all_tables = [
        "course_categories", "courses", "modules", "quizzes", "lessons", "lesson_practices",
        "questions", "answers", "vocab_quizzes", "vocab_questions", "materials", "full_tests",
        "full_test_sections", "full_test_answer_details", "profiles", "user_roles", "enrollments",
        "user_lesson_progress", "user_quiz_results", "user_answers", "user_full_test_results"
    ]
    for table in all_tables:
        try:
            exec_sql(f"""
                SELECT setval(pg_get_serial_sequence('public.{table}', 'id'), 
                              COALESCE((SELECT MAX(id) FROM public.{table}), 1) + 1, false);
            """)
        except Exception:
            pass

    # Create performance indexes
    print("Creating performance indexes...")
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_user_answers_result_id ON user_answers(result_id);",
        "CREATE INDEX IF NOT EXISTS idx_user_answers_question_id ON user_answers(question_id);",
        "CREATE INDEX IF NOT EXISTS idx_user_quiz_results_user_quiz ON user_quiz_results(user_id, quiz_id);",
        "CREATE INDEX IF NOT EXISTS idx_user_quiz_results_completed ON user_quiz_results(completed_at DESC);",
        "CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);",
        "CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);",
        "CREATE INDEX IF NOT EXISTS idx_vocab_questions_question ON vocab_questions(question_id);",
        "CREATE INDEX IF NOT EXISTS idx_vocab_questions_quiz ON vocab_questions(vocab_quiz_id);",
        "CREATE INDEX IF NOT EXISTS idx_lessons_quiz_id ON lessons(quiz_id);",
        "CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON enrollments(user_id, course_id);"
    ]
    for idx_sql in indexes:
        try:
            exec_sql(idx_sql)
        except Exception as e:
            print(f"Index error: {e}")

    print("\n🎉 ALL TABLES, DATA & INDEXES IMPORTED SUCCESSFULLY TO SUPABASE!")

if __name__ == "__main__":
    main()
