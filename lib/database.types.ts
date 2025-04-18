export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: number
          event_name: string
          website_id: string
          message: string | null
          created_at: string
        }
        Insert: {
          id?: number
          event_name: string
          website_id: string
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          event_name?: string
          website_id?: string
          message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          domain: string | null
          id: number
          page: string | null
          visitor_id: string | null
          session_id: string | null
          device_type: string | null
          os: string | null
          country: string | null
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: number
          page?: string | null
          visitor_id?: string | null
          session_id?: string | null
          device_type?: string | null
          os?: string | null
          country?: string | null
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: number
          page?: string | null
          visitor_id?: string | null
          session_id?: string | null
          device_type?: string | null
          os?: string | null
          country?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          api: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          api?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          api?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      visits: {
        Row: {
          created_at: string
          id: number
          source: string | null
          website_id: string | null
          visitor_id: string | null
          session_id: string | null
          device_type: string | null
          os: string | null
          country: string | null
          screen_width: number | null
          screen_height: number | null
          language: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          source?: string | null
          website_id?: string | null
          visitor_id?: string | null
          session_id?: string | null
          device_type?: string | null
          os?: string | null
          country?: string | null
          screen_width?: number | null
          screen_height?: number | null
          language?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          source?: string | null
          website_id?: string | null
          visitor_id?: string | null
          session_id?: string | null
          device_type?: string | null
          os?: string | null
          country?: string | null
          screen_width?: number | null
          screen_height?: number | null
          language?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
        }
        Relationships: []
      }
      daily_stats: {
        Row: {
          id: number
          domain: string
          date: string
          visits: number
          unique_visitors: number
          page_views: number
          created_at: string
        }
        Insert: {
          id?: number
          domain: string
          date: string
          visits?: number
          unique_visitors?: number
          page_views?: number
          created_at?: string
        }
        Update: {
          id?: number
          domain?: string
          date?: string
          visits?: number
          unique_visitors?: number
          page_views?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
