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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      account_squads: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          squad_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          squad_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          squad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_squads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_squads_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_name: string | null
          client_id: string
          created_at: string
          health_score: number | null
          id: string
          niche_id: string | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          sales_channel_id: string | null
          squad_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["client_status"] | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          client_id: string
          created_at?: string
          health_score?: number | null
          id?: string
          niche_id?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          sales_channel_id?: string | null
          squad_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          client_id?: string
          created_at?: string
          health_score?: number | null
          id?: string
          niche_id?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          sales_channel_id?: string | null
          squad_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      client_public_access: {
        Row: {
          client_id: string
          created_at: string
          expires_at: string | null
          id: string
          token: string
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          token?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_public_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sales_channels: {
        Row: {
          client_id: string
          sales_channel_id: string
        }
        Insert: {
          client_id: string
          sales_channel_id: string
        }
        Update: {
          client_id?: string
          sales_channel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_sales_channels_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sales_channels_sales_channel_id_fkey"
            columns: ["sales_channel_id"]
            isOneToOne: false
            referencedRelation: "sales_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          cnpj_cpf: string | null
          contact_name: string | null
          contact_whatsapp: string | null
          corporate_email: string | null
          country: string | null
          created_at: string
          end_date_expected: string | null
          extra_comments: string | null
          health_score: number | null
          id: string
          lead_id: string | null
          name: string
          niche_id: string | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          sales_channels: string[] | null
          scope_details: string | null
          segment: string | null
          squad_id: string | null
          start_date: string
          state: string | null
          status: Database["public"]["Enums"]["client_status"] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj_cpf?: string | null
          contact_name?: string | null
          contact_whatsapp?: string | null
          corporate_email?: string | null
          country?: string | null
          created_at?: string
          end_date_expected?: string | null
          extra_comments?: string | null
          health_score?: number | null
          id?: string
          lead_id?: string | null
          name: string
          niche_id?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          sales_channels?: string[] | null
          scope_details?: string | null
          segment?: string | null
          squad_id?: string | null
          start_date?: string
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj_cpf?: string | null
          contact_name?: string | null
          contact_whatsapp?: string | null
          corporate_email?: string | null
          country?: string | null
          created_at?: string
          end_date_expected?: string | null
          extra_comments?: string | null
          health_score?: number | null
          id?: string
          lead_id?: string | null
          name?: string
          niche_id?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          sales_channels?: string[] | null
          scope_details?: string | null
          segment?: string | null
          squad_id?: string | null
          start_date?: string
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      company_events: {
        Row: {
          created_at: string
          date: string
          id: string
          name: string
          repeat_annually: boolean | null
          type: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          name: string
          repeat_annually?: boolean | null
          type: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name?: string
          repeat_annually?: boolean | null
          type?: string
        }
        Relationships: []
      }
      content_comments: {
        Row: {
          author_name: string | null
          content: string
          created_at: string
          id: string
          is_internal: boolean | null
          post_id: string
          user_id: string | null
        }
        Insert: {
          author_name?: string | null
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          post_id: string
          user_id?: string | null
        }
        Update: {
          author_name?: string | null
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_posts: {
        Row: {
          caption: string | null
          client_id: string
          created_at: string
          created_by: string | null
          funnel_stage: Database["public"]["Enums"]["funnel_stage"] | null
          id: string
          media_urls: string[] | null
          scheduled_at: string
          status: Database["public"]["Enums"]["content_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          funnel_stage?: Database["public"]["Enums"]["funnel_stage"] | null
          id?: string
          media_urls?: string[] | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["content_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          funnel_stage?: Database["public"]["Enums"]["funnel_stage"] | null
          id?: string
          media_urls?: string[] | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["content_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          account_id: string | null
          auto_renewal: boolean | null
          client_id: string
          contract_number: string | null
          created_at: string
          id: string
          monthly_value: number | null
          payment_day: number | null
          payment_method: string | null
          renewal_date: string | null
          start_date: string
          status: string | null
          total_value: number | null
          type: Database["public"]["Enums"]["contract_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          auto_renewal?: boolean | null
          client_id: string
          contract_number?: string | null
          created_at?: string
          id?: string
          monthly_value?: number | null
          payment_day?: number | null
          payment_method?: string | null
          renewal_date?: string | null
          start_date?: string
          status?: string | null
          total_value?: number | null
          type?: Database["public"]["Enums"]["contract_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          auto_renewal?: boolean | null
          client_id?: string
          contract_number?: string | null
          created_at?: string
          id?: string
          monthly_value?: number | null
          payment_day?: number | null
          payment_method?: string | null
          renewal_date?: string | null
          start_date?: string
          status?: string | null
          total_value?: number | null
          type?: Database["public"]["Enums"]["contract_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_types: {
        Row: {
          created_at: string | null
          id: string
          is_custom: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_custom?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_custom?: boolean | null
          name?: string
        }
        Relationships: []
      }
      funnel_types: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      lead_sales_channels: {
        Row: {
          lead_id: string
          sales_channel_id: string
        }
        Insert: {
          lead_id: string
          sales_channel_id: string
        }
        Update: {
          lead_id?: string
          sales_channel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_sales_channels_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_sales_channels_sales_channel_id_fkey"
            columns: ["sales_channel_id"]
            isOneToOne: false
            referencedRelation: "sales_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stage_history: {
        Row: {
          entered_at: string
          exited_at: string | null
          id: string
          lead_id: string
          stage: string
        }
        Insert: {
          entered_at?: string
          exited_at?: string | null
          id?: string
          lead_id: string
          stage: string
        }
        Update: {
          entered_at?: string
          exited_at?: string | null
          id?: string
          lead_id?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          converted_at: string | null
          created_at: string | null
          email: string | null
          expected_close_date: string | null
          funnel_stage: string | null
          funnel_type_id: string | null
          id: string
          last_contact_at: string | null
          monthly_revenue_range: string | null
          mrr_months: number | null
          name: string
          niche_id: string | null
          notes: string | null
          one_time_revenue: number | null
          origin: string | null
          phone: string | null
          position: number | null
          recurring_revenue: number | null
          responsible_id: string | null
        }
        Insert: {
          company?: string | null
          converted_at?: string | null
          created_at?: string | null
          email?: string | null
          expected_close_date?: string | null
          funnel_stage?: string | null
          funnel_type_id?: string | null
          id?: string
          last_contact_at?: string | null
          monthly_revenue_range?: string | null
          mrr_months?: number | null
          name: string
          niche_id?: string | null
          notes?: string | null
          one_time_revenue?: number | null
          origin?: string | null
          phone?: string | null
          position?: number | null
          recurring_revenue?: number | null
          responsible_id?: string | null
        }
        Update: {
          company?: string | null
          converted_at?: string | null
          created_at?: string | null
          email?: string | null
          expected_close_date?: string | null
          funnel_stage?: string | null
          funnel_type_id?: string | null
          id?: string
          last_contact_at?: string | null
          monthly_revenue_range?: string | null
          mrr_months?: number | null
          name?: string
          niche_id?: string | null
          notes?: string | null
          one_time_revenue?: number | null
          origin?: string | null
          phone?: string | null
          position?: number | null
          recurring_revenue?: number | null
          responsible_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_funnel_type_id_fkey"
            columns: ["funnel_type_id"]
            isOneToOne: false
            referencedRelation: "funnel_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      niches: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          full_name: string
          function: Database["public"]["Enums"]["user_function"]
          id: string
          squad_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          full_name: string
          function?: Database["public"]["Enums"]["user_function"]
          id: string
          squad_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          full_name?: string
          function?: Database["public"]["Enums"]["user_function"]
          id?: string
          squad_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      project_deliveries: {
        Row: {
          client_id: string
          created_at: string | null
          current_count: number
          id: string
          month: number
          target_count: number
          title: string
          updated_at: string | null
          year: number
        }
        Insert: {
          client_id: string
          created_at?: string | null
          current_count?: number
          id?: string
          month: number
          target_count?: number
          title: string
          updated_at?: string | null
          year: number
        }
        Update: {
          client_id?: string
          created_at?: string | null
          current_count?: number
          id?: string
          month?: number
          target_count?: number
          title?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_deliveries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_channels: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      special_projects: {
        Row: {
          client_id: string | null
          color: string | null
          created_at: string
          description: string | null
          end_date: string
          id: string
          name: string
          squad_id: string | null
          start_date: string
        }
        Insert: {
          client_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          squad_id?: string | null
          start_date: string
        }
        Update: {
          client_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          squad_id?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_projects_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          leader_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          leader_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      task_activity: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          task_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          task_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          task_id: string
          user_id: string
        }
        Insert: {
          task_id: string
          user_id: string
        }
        Update: {
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          content_type: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          task_id: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          task_id: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          task_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          id: string
          task_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          id?: string
          task_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_history_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          tag_id: string
          task_id: string
        }
        Insert: {
          tag_id: string
          task_id: string
        }
        Update: {
          tag_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          account_id: string | null
          actual_minutes: number | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          deliverable_type_id: string | null
          description: string | null
          estimated_minutes: number | null
          id: string
          position: number | null
          priority: Database["public"]["Enums"]["task_priority"]
          sku_reference: string | null
          stage: Database["public"]["Enums"]["task_stage"]
          time_tracked_seconds: number | null
          timer_started_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          actual_minutes?: number | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          deliverable_type_id?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          position?: number | null
          priority?: Database["public"]["Enums"]["task_priority"]
          sku_reference?: string | null
          stage?: Database["public"]["Enums"]["task_stage"]
          time_tracked_seconds?: number | null
          timer_started_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          actual_minutes?: number | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          deliverable_type_id?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          position?: number | null
          priority?: Database["public"]["Enums"]["task_priority"]
          sku_reference?: string | null
          stage?: Database["public"]["Enums"]["task_stage"]
          time_tracked_seconds?: number | null
          timer_started_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deliverable_type_id_fkey"
            columns: ["deliverable_type_id"]
            isOneToOne: false
            referencedRelation: "deliverable_types"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "leader" | "collaborator"
      client_status: "active" | "inactive" | "churn"
      content_status:
        | "internally_approved"
        | "client_approved"
        | "internal_changes_requested"
        | "client_changes_requested"
        | "pending_internal_approval"
      contract_type: "recurring" | "one-off"
      employment_type: "CLT" | "PJ" | "Estágio"
      funnel_stage: "attraction" | "education" | "conversion"
      risk_level: "low" | "medium" | "high"
      task_priority: "low" | "medium" | "high"
      task_stage: "todo" | "doing" | "review" | "done"
      user_function:
        | "Designer"
        | "Copywriter"
        | "Gestor de Tráfego"
        | "Redator"
        | "Desenvolvedor"
        | "Administrador"
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
      app_role: ["admin", "leader", "collaborator"],
      client_status: ["active", "inactive", "churn"],
      content_status: [
        "internally_approved",
        "client_approved",
        "internal_changes_requested",
        "client_changes_requested",
        "pending_internal_approval",
      ],
      contract_type: ["recurring", "one-off"],
      employment_type: ["CLT", "PJ", "Estágio"],
      funnel_stage: ["attraction", "education", "conversion"],
      risk_level: ["low", "medium", "high"],
      task_priority: ["low", "medium", "high"],
      task_stage: ["todo", "doing", "review", "done"],
      user_function: [
        "Designer",
        "Copywriter",
        "Gestor de Tráfego",
        "Redator",
        "Desenvolvedor",
        "Administrador",
      ],
    },
  },
} as const
