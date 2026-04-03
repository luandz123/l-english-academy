export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: number
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
        }
        Relationships: []
      }
      admin_student_notes: {
        Row: {
          admin_id: string
          content: string
          created_at: string | null
          id: number
          student_id: string
        }
        Insert: {
          admin_id: string
          content: string
          created_at?: string | null
          id?: number
          student_id: string
        }
        Update: {
          admin_id?: string
          content?: string
          created_at?: string | null
          id?: number
          student_id?: string
        }
        Relationships: []
      }
      answers: {
        Row: {
          answer_text: string
          display_order: number
          explanation: string | null
          id: number
          is_correct: boolean | null
          question_id: number | null
        }
        Insert: {
          answer_text: string
          display_order?: number
          explanation?: string | null
          id?: number
          is_correct?: boolean | null
          question_id?: number | null
        }
        Update: {
          answer_text?: string
          display_order?: number
          explanation?: string | null
          id?: number
          is_correct?: boolean | null
          question_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          course_type: string
          created_at: string | null
          description: string | null
          display_order: number | null
          duration_months: number | null
          id: number
          instructor: string | null
          is_active: boolean | null
          price: number | null
          subtitle: string | null
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          course_type: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_months?: number | null
          id?: number
          instructor?: string | null
          is_active?: boolean | null
          price?: number | null
          subtitle?: string | null
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          course_type?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_months?: number | null
          id?: number
          instructor?: string | null
          is_active?: boolean | null
          price?: number | null
          subtitle?: string | null
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: number
          enrolled_at: string | null
          expires_at: string | null
          id: number
          user_id: string
        }
        Insert: {
          course_id: number
          enrolled_at?: string | null
          expires_at?: string | null
          id?: number
          user_id: string
        }
        Update: {
          course_id?: number
          enrolled_at?: string | null
          expires_at?: string | null
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      full_test_sections: {
        Row: {
          id: number
          part_number: number
          quiz_id: number | null
          test_id: number | null
        }
        Insert: {
          id?: number
          part_number: number
          quiz_id?: number | null
          test_id?: number | null
        }
        Update: {
          id?: number
          part_number?: number
          quiz_id?: number | null
          test_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "full_test_sections_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "full_test_sections_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "full_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      full_tests: {
        Row: {
          category: string
          course_id: number | null
          created_at: string | null
          display_order: number
          id: number
          release_date: string | null
          title: string
          total_questions: number | null
        }
        Insert: {
          category?: string
          course_id?: number | null
          created_at?: string | null
          display_order?: number
          id?: number
          release_date?: string | null
          title: string
          total_questions?: number | null
        }
        Update: {
          category?: string
          course_id?: number | null
          created_at?: string | null
          display_order?: number
          id?: number
          release_date?: string | null
          title?: string
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "full_tests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_practices: {
        Row: {
          created_at: string | null
          display_order: number
          id: number
          lesson_id: number
          quiz_id: number | null
          title: string
          trigger_at_seconds: number
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          id?: number
          lesson_id: number
          quiz_id?: number | null
          title?: string
          trigger_at_seconds?: number
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: number
          lesson_id?: number
          quiz_id?: number | null
          title?: string
          trigger_at_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_practices_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_practices_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          display_order: number
          duration_seconds: number | null
          id: number
          is_live: boolean | null
          lesson_type: string
          live_time: string | null
          module_id: number | null
          title: string
          video_url: string | null
        }
        Insert: {
          display_order?: number
          duration_seconds?: number | null
          id?: number
          is_live?: boolean | null
          lesson_type?: string
          live_time?: string | null
          module_id?: number | null
          title: string
          video_url?: string | null
        }
        Update: {
          display_order?: number
          duration_seconds?: number | null
          id?: number
          is_live?: boolean | null
          lesson_type?: string
          live_time?: string | null
          module_id?: number | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          course_id: number | null
          created_at: string | null
          display_order: number
          file_type: string | null
          file_url: string
          id: number
          lesson_id: number | null
          quiz_id: number | null
          title: string
        }
        Insert: {
          course_id?: number | null
          created_at?: string | null
          display_order?: number
          file_type?: string | null
          file_url: string
          id?: number
          lesson_id?: number | null
          quiz_id?: number | null
          title: string
        }
        Update: {
          course_id?: number | null
          created_at?: string | null
          display_order?: number
          file_type?: string | null
          file_url?: string
          id?: number
          lesson_id?: number | null
          quiz_id?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: number | null
          description: string | null
          display_order: number
          id: number
          title: string
        }
        Insert: {
          course_id?: number | null
          description?: string | null
          display_order?: number
          id?: number
          title: string
        }
        Update: {
          course_id?: number | null
          description?: string | null
          display_order?: number
          id?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          audio_url: string | null
          display_order: number
          id: number
          image_url: string | null
          question_text: string
          question_type: string | null
          quiz_id: number | null
        }
        Insert: {
          audio_url?: string | null
          display_order?: number
          id?: number
          image_url?: string | null
          question_text: string
          question_type?: string | null
          quiz_id?: number | null
        }
        Update: {
          audio_url?: string | null
          display_order?: number
          id?: number
          image_url?: string | null
          question_text?: string
          question_type?: string | null
          quiz_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          display_order: number
          id: number
          module_id: number | null
          time_limit_seconds: number | null
          title: string
          total_questions: number
        }
        Insert: {
          display_order?: number
          id?: number
          module_id?: number | null
          time_limit_seconds?: number | null
          title: string
          total_questions?: number
        }
        Update: {
          display_order?: number
          id?: number
          module_id?: number | null
          time_limit_seconds?: number | null
          title?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_answers: {
        Row: {
          id: number
          is_correct: boolean | null
          question_id: number
          result_id: number
          selected_answer_id: number | null
        }
        Insert: {
          id?: number
          is_correct?: boolean | null
          question_id: number
          result_id: number
          selected_answer_id?: number | null
        }
        Update: {
          id?: number
          is_correct?: boolean | null
          question_id?: number
          result_id?: number
          selected_answer_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_selected_answer_id_fkey"
            columns: ["selected_answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string | null
          id: number
          lesson_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          lesson_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          lesson_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_full_test_results: {
        Row: {
          completed_at: string | null
          correct_answers: number | null
          id: number
          listening_score: number | null
          reading_score: number | null
          test_id: number
          time_spent_seconds: number | null
          total_score: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correct_answers?: number | null
          id?: number
          listening_score?: number | null
          reading_score?: number | null
          test_id: number
          time_spent_seconds?: number | null
          total_score?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correct_answers?: number | null
          id?: number
          listening_score?: number | null
          reading_score?: number | null
          test_id?: number
          time_spent_seconds?: number | null
          total_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_full_test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "full_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lesson_progress: {
        Row: {
          id: number
          is_completed: boolean | null
          last_watched_at: string | null
          lesson_id: number
          user_id: string
          watch_duration_seconds: number | null
        }
        Insert: {
          id?: number
          is_completed?: boolean | null
          last_watched_at?: string | null
          lesson_id: number
          user_id: string
          watch_duration_seconds?: number | null
        }
        Update: {
          id?: number
          is_completed?: boolean | null
          last_watched_at?: string | null
          lesson_id?: number
          user_id?: string
          watch_duration_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notes: {
        Row: {
          content: string
          created_at: string | null
          id: number
          lesson_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: number
          lesson_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: number
          lesson_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quiz_results: {
        Row: {
          completed_at: string | null
          correct_answers: number | null
          id: number
          quiz_id: number
          score: number | null
          time_spent_seconds: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correct_answers?: number | null
          id?: number
          quiz_id: number
          score?: number | null
          time_spent_seconds?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correct_answers?: number | null
          id?: number
          quiz_id?: number
          score?: number | null
          time_spent_seconds?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vocab_categories: {
        Row: {
          course_id: number | null
          display_order: number
          id: number
          title: string
        }
        Insert: {
          course_id?: number | null
          display_order?: number
          id?: number
          title: string
        }
        Update: {
          course_id?: number | null
          display_order?: number
          id?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_categories_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_questions: {
        Row: {
          audio_female_url: string | null
          audio_male_url: string | null
          definition_en: string | null
          definition_vi: string
          display_order: number
          example_sentence: string | null
          id: number
          image_url: string | null
          phonetic: string | null
          vocab_quiz_id: number | null
          word: string
          wrong_answer_1: string | null
          wrong_answer_2: string | null
          wrong_answer_3: string | null
        }
        Insert: {
          audio_female_url?: string | null
          audio_male_url?: string | null
          definition_en?: string | null
          definition_vi: string
          display_order?: number
          example_sentence?: string | null
          id?: number
          image_url?: string | null
          phonetic?: string | null
          vocab_quiz_id?: number | null
          word: string
          wrong_answer_1?: string | null
          wrong_answer_2?: string | null
          wrong_answer_3?: string | null
        }
        Update: {
          audio_female_url?: string | null
          audio_male_url?: string | null
          definition_en?: string | null
          definition_vi?: string
          display_order?: number
          example_sentence?: string | null
          id?: number
          image_url?: string | null
          phonetic?: string | null
          vocab_quiz_id?: number | null
          word?: string
          wrong_answer_1?: string | null
          wrong_answer_2?: string | null
          wrong_answer_3?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vocab_questions_vocab_quiz_id_fkey"
            columns: ["vocab_quiz_id"]
            isOneToOne: false
            referencedRelation: "vocab_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_quizzes: {
        Row: {
          category_id: number | null
          display_order: number
          id: number
          title: string
          total_questions: number
        }
        Insert: {
          category_id?: number | null
          display_order?: number
          id?: number
          title: string
          total_questions?: number
        }
        Update: {
          category_id?: number | null
          display_order?: number
          id?: number
          title?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "vocab_quizzes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vocab_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "student"],
    },
  },
} as const
