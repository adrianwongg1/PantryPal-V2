export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      pantry_items: {
        Row: {
          category: string | null
          created_at: string
          expires_on: string | null
          id: string
          low_stock: boolean
          name: string
          needed_for_recipe_id: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["pantry_status"]
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          expires_on?: string | null
          id?: string
          low_stock?: boolean
          name: string
          needed_for_recipe_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["pantry_status"]
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          expires_on?: string | null
          id?: string
          low_stock?: boolean
          name?: string
          needed_for_recipe_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["pantry_status"]
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_items_needed_for_recipe_id_fkey"
            columns: ["needed_for_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pantry_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          cook_minutes: number
          cooked_count: number
          created_at: string
          cuisine: string | null
          diet_tags: Database["public"]["Enums"]["diet_tag"][]
          difficulty: Database["public"]["Enums"]["difficulty"]
          id: string
          image_path: string | null
          ingredients: Json
          last_cooked_at: string | null
          legacy_id: string | null
          meal_type: Database["public"]["Enums"]["meal_type"]
          model: string | null
          notes: string | null
          prep_minutes: number
          servings: number
          share_slug: string | null
          source: Database["public"]["Enums"]["recipe_source"]
          steps: Json
          summary: string | null
          tags: string[]
          title: string
          total_minutes: number | null
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          cook_minutes?: number
          cooked_count?: number
          created_at?: string
          cuisine?: string | null
          diet_tags?: Database["public"]["Enums"]["diet_tag"][]
          difficulty?: Database["public"]["Enums"]["difficulty"]
          id?: string
          image_path?: string | null
          ingredients?: Json
          last_cooked_at?: string | null
          legacy_id?: string | null
          meal_type: Database["public"]["Enums"]["meal_type"]
          model?: string | null
          notes?: string | null
          prep_minutes?: number
          servings?: number
          share_slug?: string | null
          source?: Database["public"]["Enums"]["recipe_source"]
          steps?: Json
          summary?: string | null
          tags?: string[]
          title: string
          total_minutes?: number | null
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          cook_minutes?: number
          cooked_count?: number
          created_at?: string
          cuisine?: string | null
          diet_tags?: Database["public"]["Enums"]["diet_tag"][]
          difficulty?: Database["public"]["Enums"]["difficulty"]
          id?: string
          image_path?: string | null
          ingredients?: Json
          last_cooked_at?: string | null
          legacy_id?: string | null
          meal_type?: Database["public"]["Enums"]["meal_type"]
          model?: string | null
          notes?: string | null
          prep_minutes?: number
          servings?: number
          share_slug?: string | null
          source?: Database["public"]["Enums"]["recipe_source"]
          steps?: Json
          summary?: string | null
          tags?: string[]
          title?: string
          total_minutes?: number | null
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "recipes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          allergies: string[]
          default_servings: number
          default_visibility: Database["public"]["Enums"]["visibility"]
          diets: Database["public"]["Enums"]["diet_tag"][]
          disliked_ingredients: string[]
          extra_notes: string | null
          max_total_minutes: number | null
          notify_expiring: boolean
          notify_weekly_plan: boolean
          preferred_cuisines: string[]
          spice_level: number
          theme: Database["public"]["Enums"]["theme_preference"]
          units: Database["public"]["Enums"]["units_system"]
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[]
          default_servings?: number
          default_visibility?: Database["public"]["Enums"]["visibility"]
          diets?: Database["public"]["Enums"]["diet_tag"][]
          disliked_ingredients?: string[]
          extra_notes?: string | null
          max_total_minutes?: number | null
          notify_expiring?: boolean
          notify_weekly_plan?: boolean
          preferred_cuisines?: string[]
          spice_level?: number
          theme?: Database["public"]["Enums"]["theme_preference"]
          units?: Database["public"]["Enums"]["units_system"]
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[]
          default_servings?: number
          default_visibility?: Database["public"]["Enums"]["visibility"]
          diets?: Database["public"]["Enums"]["diet_tag"][]
          disliked_ingredients?: string[]
          extra_notes?: string | null
          max_total_minutes?: number | null
          notify_expiring?: boolean
          notify_weekly_plan?: boolean
          preferred_cuisines?: string[]
          spice_level?: number
          theme?: Database["public"]["Enums"]["theme_preference"]
          units?: Database["public"]["Enums"]["units_system"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_own_account: { Args: never; Returns: undefined }
      get_shared_recipe: {
        Args: { p_slug: string }
        Returns: {
          author_display_name: string
          author_username: string
          cook_minutes: number
          created_at: string
          cuisine: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          id: string
          image_path: string
          ingredients: Json
          meal_type: Database["public"]["Enums"]["meal_type"]
          prep_minutes: number
          servings: number
          steps: Json
          summary: string
          tags: string[]
          title: string
          total_minutes: number
          updated_at: string
        }[]
      }
    }
    Enums: {
      diet_tag:
        | "vegetarian"
        | "vegan"
        | "pescatarian"
        | "halal"
        | "kosher"
        | "gluten_free"
        | "dairy_free"
        | "nut_free"
        | "low_carb"
        | "keto"
        | "paleo"
        | "low_sodium"
      difficulty: "easy" | "medium" | "hard"
      meal_type: "breakfast" | "lunch" | "dinner" | "snack" | "dessert"
      pantry_status: "have" | "need"
      recipe_source: "generated" | "manual" | "imported"
      theme_preference: "system" | "light" | "dark"
      units_system: "metric" | "imperial"
      visibility: "private" | "unlisted" | "public"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      diet_tag: [
        "vegetarian",
        "vegan",
        "pescatarian",
        "halal",
        "kosher",
        "gluten_free",
        "dairy_free",
        "nut_free",
        "low_carb",
        "keto",
        "paleo",
        "low_sodium",
      ],
      difficulty: ["easy", "medium", "hard"],
      meal_type: ["breakfast", "lunch", "dinner", "snack", "dessert"],
      pantry_status: ["have", "need"],
      recipe_source: ["generated", "manual", "imported"],
      theme_preference: ["system", "light", "dark"],
      units_system: ["metric", "imperial"],
      visibility: ["private", "unlisted", "public"],
    },
  },
} as const

