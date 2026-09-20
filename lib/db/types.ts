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
    PostgrestVersion: "14.5"
  }
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
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          landmark: string | null
          latitude: number | null
          longitude: number | null
          phone: string
          pincode: string
          recipient_name: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          phone: string
          pincode: string
          recipient_name: string
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string
          pincode?: string
          recipient_name?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          created_at: string
          cta_text: string | null
          cta_url: string | null
          ends_at: string | null
          headline: string | null
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          starts_at: string | null
          subheading: string | null
          target_audience: string
        }
        Insert: {
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          ends_at?: string | null
          headline?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          starts_at?: string | null
          subheading?: string | null
          target_audience?: string
        }
        Update: {
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          ends_at?: string | null
          headline?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          starts_at?: string | null
          subheading?: string | null
          target_audience?: string
        }
        Relationships: []
      }
      cart: {
        Row: {
          coupon_code: string | null
          created_at: string
          guest_token: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          guest_token?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          guest_token?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          personalization: Json
          product_id: string
          quantity: number
          unit_price_snapshot: number
          updated_at: string
          variant_id: string | null
          variant_ids: string[]
          vendor_id: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          personalization?: Json
          product_id: string
          quantity: number
          unit_price_snapshot: number
          updated_at?: string
          variant_id?: string | null
          variant_ids?: string[]
          vendor_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          personalization?: Json
          product_id?: string
          quantity?: number
          unit_price_snapshot?: number
          updated_at?: string
          variant_id?: string | null
          variant_ids?: string[]
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "cart"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          banner_url: string | null
          commission_rate: number | null
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          meta_description: string | null
          meta_title: string | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount_amount: number
          id: string
          order_id: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_amount: number
          id?: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          category_id: string | null
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_order_amount: number
          per_user_limit: number
          updated_at: string
          usage_limit: number | null
          used_count: number
          valid_from: string
          valid_until: string | null
          vendor_id: string | null
        }
        Insert: {
          category_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number
          per_user_limit?: number
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
          vendor_id?: string | null
        }
        Update: {
          category_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number
          per_user_limit?: number
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_contacts: {
        Row: {
          budget_max: number | null
          created_at: string
          gift_preferences: string | null
          id: string
          interests: string[]
          is_favorite: boolean
          name: string
          notes: string | null
          photo_url: string | null
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_max?: number | null
          created_at?: string
          gift_preferences?: string | null
          id?: string
          interests?: string[]
          is_favorite?: boolean
          name: string
          notes?: string | null
          photo_url?: string | null
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_max?: number | null
          created_at?: string
          gift_preferences?: string | null
          id?: string
          interests?: string[]
          is_favorite?: boolean
          name?: string
          notes?: string | null
          photo_url?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_events: {
        Row: {
          contact_id: string
          created_at: string
          event_date: string
          event_type: string
          id: string
          is_active: boolean
          is_recurring: boolean
          last_reminded_at: string | null
          notes: string | null
          reminder_days: number[]
          reminder_days_before: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          event_date: string
          event_type: string
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          last_reminded_at?: string | null
          notes?: string | null
          reminder_days?: number[]
          reminder_days_before?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          last_reminded_at?: string | null
          notes?: string | null
          reminder_days?: number[]
          reminder_days_before?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "diary_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_reminder_log: {
        Row: {
          channel: string
          days_before: number
          event_id: string
          id: string
          occurrence_date: string
          sent_at: string
          user_id: string
        }
        Insert: {
          channel: string
          days_before: number
          event_id: string
          id?: string
          occurrence_date: string
          sent_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          days_before?: number
          event_id?: string
          id?: string
          occurrence_date?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_reminder_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "diary_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_reminder_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_history: {
        Row: {
          amount: number | null
          contact_id: string | null
          event_type: string | null
          gift_name: string | null
          gifted_at: string
          id: string
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          product_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          contact_id?: string | null
          event_type?: string | null
          gift_name?: string | null
          gifted_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          product_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          contact_id?: string | null
          event_type?: string | null
          gift_name?: string | null
          gifted_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          product_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_history_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "diary_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_history_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_tokens: {
        Row: {
          expires_at: string
          provider: string
          token: string
          updated_at: string
        }
        Insert: {
          expires_at: string
          provider: string
          token: string
          updated_at?: string
        }
        Update: {
          expires_at?: string
          provider?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_ledger: {
        Row: {
          balance_after: number
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          order_id: string | null
          points: number
          type: string
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string | null
          points: number
          type: string
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          category: string
          created_at: string
          email_enabled: boolean
          id: string
          push_enabled: boolean
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          email_enabled?: boolean
          id?: string
          push_enabled?: boolean
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          email_enabled?: boolean
          id?: string
          push_enabled?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_read: boolean
          link_url: string | null
          message: string
          metadata: Json
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          message: string
          metadata?: Json
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          metadata?: Json
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_financials: {
        Row: {
          commission_amount: number
          commission_base: number
          commission_rate: number
          created_at: string
          order_item_id: string
          platform_funded_discount: number
          vendor_funded_discount: number
          vendor_payout: number
        }
        Insert: {
          commission_amount: number
          commission_base: number
          commission_rate: number
          created_at?: string
          order_item_id: string
          platform_funded_discount?: number
          vendor_funded_discount?: number
          vendor_payout: number
        }
        Update: {
          commission_amount?: number
          commission_base?: number
          commission_rate?: number
          created_at?: string
          order_item_id?: string
          platform_funded_discount?: number
          vendor_funded_discount?: number
          vendor_payout?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_financials_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          discount_amount: number
          fulfilment_status: string
          gst_amount: number
          gst_rate: number
          hsn_code: string | null
          id: string
          order_id: string
          personalization: Json
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          refunded_amount: number
          returned_quantity: number
          total_price: number
          unit_price: number
          variant_id: string | null
          variant_ids: string[]
          variant_label: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          fulfilment_status?: string
          gst_amount?: number
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          order_id: string
          personalization?: Json
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity: number
          refunded_amount?: number
          returned_quantity?: number
          total_price: number
          unit_price: number
          variant_id?: string | null
          variant_ids?: string[]
          variant_label?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          discount_amount?: number
          fulfilment_status?: string
          gst_amount?: number
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          order_id?: string
          personalization?: Json
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          refunded_amount?: number
          returned_quantity?: number
          total_price?: number
          unit_price?: number
          variant_id?: string | null
          variant_ids?: string[]
          variant_label?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          customer_id: string
          delivery_address: Json
          delivery_charge: number
          discount_amount: number
          gift_message: string | null
          gift_wrap_charge: number
          gift_wrap_selected: boolean
          gst_amount: number
          id: string
          idempotency_key: string | null
          notes: string | null
          order_number: string
          placed_at: string | null
          razorpay_order_id: string | null
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_id: string
          delivery_address: Json
          delivery_charge?: number
          discount_amount?: number
          gift_message?: string | null
          gift_wrap_charge?: number
          gift_wrap_selected?: boolean
          gst_amount?: number
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number: string
          placed_at?: string | null
          razorpay_order_id?: string | null
          status?: string
          subtotal: number
          total_amount: number
          updated_at?: string
        }
        Update: {
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_id?: string
          delivery_address?: Json
          delivery_charge?: number
          discount_amount?: number
          gift_message?: string | null
          gift_wrap_charge?: number
          gift_wrap_selected?: boolean
          gst_amount?: number
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number?: string
          placed_at?: string | null
          razorpay_order_id?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          captured_at: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          order_id: string
          payment_method: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          refund_id: string | null
          refund_reason: string | null
          refunded_at: string | null
          status: string
        }
        Insert: {
          amount: number
          captured_at?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          order_id: string
          payment_method?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          refund_id?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          captured_at?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          order_id?: string
          payment_method?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          refund_id?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          height: number | null
          id: string
          is_primary: boolean
          medium_url: string | null
          product_id: string
          sort_order: number
          storage_path: string | null
          thumb_url: string | null
          url: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          height?: number | null
          id?: string
          is_primary?: boolean
          medium_url?: string | null
          product_id: string
          sort_order?: number
          storage_path?: string | null
          thumb_url?: string | null
          url: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          height?: number | null
          id?: string
          is_primary?: boolean
          medium_url?: string | null
          product_id?: string
          sort_order?: number
          storage_path?: string | null
          thumb_url?: string | null
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_qna: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          asked_by: string | null
          created_at: string
          id: string
          is_published: boolean
          product_id: string
          question: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asked_by?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          product_id: string
          question: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asked_by?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          product_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_qna_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_qna_asked_by_fkey"
            columns: ["asked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_qna_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price_adjustment: number
          product_id: string
          sku: string | null
          stock_quantity: number
          value: string
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price_adjustment?: number
          product_id: string
          sku?: string | null
          stock_quantity?: number
          value: string
        }
        Update: {
          barcode?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price_adjustment?: number
          product_id?: string
          sku?: string | null
          stock_quantity?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          approved_at: string | null
          average_rating: number
          barcode: string | null
          base_price: number
          care_instructions: string | null
          category_id: string | null
          created_at: string
          description: string | null
          dimensions: Json | null
          gst_rate: number
          hsn_code: string | null
          id: string
          is_giftwrap_available: boolean
          is_in_house: boolean
          max_order_quantity: number | null
          meta_description: string | null
          meta_title: string | null
          min_order_quantity: number
          name: string
          occasion_tags: string[]
          personalization_options: Json
          recipient_tags: string[]
          rejection_reason: string | null
          review_count: number
          sale_price: number | null
          search_vector: unknown
          short_description: string | null
          sku: string | null
          slug: string
          status: string
          stock_quantity: number
          tags: string[]
          thumbnail_url: string | null
          total_sold: number
          updated_at: string
          vendor_id: string
          video_url: string | null
          view_count: number
          weight_grams: number | null
        }
        Insert: {
          approved_at?: string | null
          average_rating?: number
          barcode?: string | null
          base_price: number
          care_instructions?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          is_giftwrap_available?: boolean
          is_in_house?: boolean
          max_order_quantity?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_order_quantity?: number
          name: string
          occasion_tags?: string[]
          personalization_options?: Json
          recipient_tags?: string[]
          rejection_reason?: string | null
          review_count?: number
          sale_price?: number | null
          search_vector?: unknown
          short_description?: string | null
          sku?: string | null
          slug: string
          status?: string
          stock_quantity?: number
          tags?: string[]
          thumbnail_url?: string | null
          total_sold?: number
          updated_at?: string
          vendor_id: string
          video_url?: string | null
          view_count?: number
          weight_grams?: number | null
        }
        Update: {
          approved_at?: string | null
          average_rating?: number
          barcode?: string | null
          base_price?: number
          care_instructions?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          is_giftwrap_available?: boolean
          is_in_house?: boolean
          max_order_quantity?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_order_quantity?: number
          name?: string
          occasion_tags?: string[]
          personalization_options?: Json
          recipient_tags?: string[]
          rejection_reason?: string | null
          review_count?: number
          sale_price?: number | null
          search_vector?: unknown
          short_description?: string | null
          sku?: string | null
          slug?: string
          status?: string
          stock_quantity?: number
          tags?: string[]
          thumbnail_url?: string | null
          total_sold?: number
          updated_at?: string
          vendor_id?: string
          video_url?: string | null
          view_count?: number
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          helpful_count: number
          id: string
          images: Json
          is_verified_purchase: boolean
          order_item_id: string | null
          product_id: string
          rating: number
          reviewer_display_name: string | null
          title: string | null
          updated_at: string
          user_id: string
          vendor_response: string | null
          vendor_response_at: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          images?: Json
          is_verified_purchase?: boolean
          order_item_id?: string | null
          product_id: string
          rating: number
          reviewer_display_name?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          vendor_response?: string | null
          vendor_response_at?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          images?: Json
          is_verified_purchase?: boolean
          order_item_id?: string | null
          product_id?: string
          rating?: number
          reviewer_display_name?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          vendor_response?: string | null
          vendor_response_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      serviceability_cache: {
        Row: {
          checked_at: string
          courier_count: number
          delivery_pincode: string
          etd_days: number | null
          pickup_pincode: string
          serviceable: boolean
        }
        Insert: {
          checked_at?: string
          courier_count?: number
          delivery_pincode: string
          etd_days?: number | null
          pickup_pincode: string
          serviceable: boolean
        }
        Update: {
          checked_at?: string
          courier_count?: number
          delivery_pincode?: string
          etd_days?: number | null
          pickup_pincode?: string
          serviceable?: boolean
        }
        Relationships: []
      }
      shipment_events: {
        Row: {
          activity: string | null
          created_at: string
          id: string
          location: string | null
          occurred_at: string
          raw_status: string
          shipment_id: string
        }
        Insert: {
          activity?: string | null
          created_at?: string
          id?: string
          location?: string | null
          occurred_at: string
          raw_status: string
          shipment_id: string
        }
        Update: {
          activity?: string | null
          created_at?: string
          id?: string
          location?: string | null
          occurred_at?: string
          raw_status?: string
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          awb_number: string | null
          courier_name: string | null
          created_at: string
          delivered_at: string | null
          estimated_delivery: string | null
          id: string
          is_return: boolean
          last_event_at: string | null
          order_id: string
          package_breadth_cm: number | null
          package_height_cm: number | null
          package_length_cm: number | null
          package_weight_grams: number | null
          return_awb_number: string | null
          shipped_at: string | null
          shiprocket_order_id: string | null
          shiprocket_shipment_id: string | null
          status: string
          tracking_url: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          awb_number?: string | null
          courier_name?: string | null
          created_at?: string
          delivered_at?: string | null
          estimated_delivery?: string | null
          id?: string
          is_return?: boolean
          last_event_at?: string | null
          order_id: string
          package_breadth_cm?: number | null
          package_height_cm?: number | null
          package_length_cm?: number | null
          package_weight_grams?: number | null
          return_awb_number?: string | null
          shipped_at?: string | null
          shiprocket_order_id?: string | null
          shiprocket_shipment_id?: string | null
          status?: string
          tracking_url?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          awb_number?: string | null
          courier_name?: string | null
          created_at?: string
          delivered_at?: string | null
          estimated_delivery?: string | null
          id?: string
          is_return?: boolean
          last_event_at?: string | null
          order_id?: string
          package_breadth_cm?: number | null
          package_height_cm?: number | null
          package_length_cm?: number | null
          package_weight_grams?: number | null
          return_awb_number?: string | null
          shipped_at?: string | null
          shiprocket_order_id?: string | null
          shiprocket_shipment_id?: string | null
          status?: string
          tracking_url?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          anonymized_at: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          marketing_opt_in: boolean
          onesignal_player_id: string | null
          phone: string | null
          phone_verified: boolean
          referral_code: string | null
          referred_by: string | null
          role: string
          timezone: string
          updated_at: string
        }
        Insert: {
          anonymized_at?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email: string
          full_name: string
          gender?: string | null
          id: string
          is_active?: boolean
          last_login_at?: string | null
          marketing_opt_in?: boolean
          onesignal_player_id?: string | null
          phone?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          role?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          anonymized_at?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          marketing_opt_in?: boolean
          onesignal_player_id?: string | null
          phone?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          role?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_private: {
        Row: {
          bank_account_last4: string | null
          bank_account_name: string | null
          bank_account_number_encrypted: string | null
          bank_ifsc: string | null
          commission_rate: number | null
          created_at: string
          gstin: string | null
          legal_name: string | null
          pan: string | null
          razorpay_contact_id: string | null
          razorpay_fund_account_id: string | null
          rejection_reason: string | null
          shiprocket_pickup_location: string | null
          updated_at: string
          vendor_id: string
          warehouse_address: Json | null
        }
        Insert: {
          bank_account_last4?: string | null
          bank_account_name?: string | null
          bank_account_number_encrypted?: string | null
          bank_ifsc?: string | null
          commission_rate?: number | null
          created_at?: string
          gstin?: string | null
          legal_name?: string | null
          pan?: string | null
          razorpay_contact_id?: string | null
          razorpay_fund_account_id?: string | null
          rejection_reason?: string | null
          shiprocket_pickup_location?: string | null
          updated_at?: string
          vendor_id: string
          warehouse_address?: Json | null
        }
        Update: {
          bank_account_last4?: string | null
          bank_account_name?: string | null
          bank_account_number_encrypted?: string | null
          bank_ifsc?: string | null
          commission_rate?: number | null
          created_at?: string
          gstin?: string | null
          legal_name?: string | null
          pan?: string | null
          razorpay_contact_id?: string | null
          razorpay_fund_account_id?: string | null
          rejection_reason?: string | null
          shiprocket_pickup_location?: string | null
          updated_at?: string
          vendor_id?: string
          warehouse_address?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_private_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_settlements: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_url: string | null
          razorpay_transfer_id: string | null
          settled_at: string | null
          settlement_period_end: string | null
          settlement_period_start: string | null
          status: string
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_url?: string | null
          razorpay_transfer_id?: string | null
          settled_at?: string | null
          settlement_period_end?: string | null
          settlement_period_start?: string | null
          status?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_url?: string | null
          razorpay_transfer_id?: string | null
          settled_at?: string | null
          settlement_period_end?: string | null
          settlement_period_start?: string | null
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_settlements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          approved_at: string | null
          average_rating: number
          banner_url: string | null
          business_name: string
          business_type: string | null
          created_at: string
          description: string | null
          id: string
          is_featured: boolean
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          review_count: number
          short_description: string | null
          slug: string
          social_links: Json
          status: string
          support_email: string | null
          support_phone: string | null
          suspended_at: string | null
          total_sales: number
          updated_at: string
          user_id: string | null
          year_established: number | null
        }
        Insert: {
          approved_at?: string | null
          average_rating?: number
          banner_url?: string | null
          business_name: string
          business_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          review_count?: number
          short_description?: string | null
          slug: string
          social_links?: Json
          status?: string
          support_email?: string | null
          support_phone?: string | null
          suspended_at?: string | null
          total_sales?: number
          updated_at?: string
          user_id?: string | null
          year_established?: number | null
        }
        Update: {
          approved_at?: string | null
          average_rating?: number
          banner_url?: string | null
          business_name?: string
          business_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          review_count?: number
          short_description?: string | null
          slug?: string
          social_links?: Json
          status?: string
          support_email?: string | null
          support_phone?: string | null
          suspended_at?: string | null
          total_sales?: number
          updated_at?: string
          user_id?: string | null
          year_established?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          error: string | null
          event_type: string
          gateway_order_id: string | null
          id: string
          payment_id: string | null
          processed_at: string | null
          provider: string
          received_at: string
          result: string | null
          status: string
        }
        Insert: {
          error?: string | null
          event_type: string
          gateway_order_id?: string | null
          id: string
          payment_id?: string | null
          processed_at?: string | null
          provider?: string
          received_at?: string
          result?: string | null
          status?: string
        }
        Update: {
          error?: string | null
          event_type?: string
          gateway_order_id?: string | null
          id?: string
          payment_id?: string | null
          processed_at?: string | null
          provider?: string
          received_at?: string
          result?: string | null
          status?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anonymize_user: { Args: { p_user_id: string }; Returns: Json }
      apply_shipment_update: {
        Args: {
          p_awb: string
          p_etd: string
          p_events: Json
          p_new_status: string
          p_raw_status: string
        }
        Returns: Json
      }
      cancel_order_and_restock: {
        Args: { p_order_id: string; p_reason: string }
        Returns: Json
      }
      cancel_stale_unpaid_orders: {
        Args: { p_hours?: number }
        Returns: number
      }
      confirm_order_payment: {
        Args: {
          p_amount_paise: number
          p_method: string
          p_razorpay_order_id: string
          p_razorpay_payment_id: string
        }
        Returns: Json
      }
      current_user_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_service_role: { Args: never; Returns: boolean }
      is_vendor_owner: { Args: { target_vendor_id: string }; Returns: boolean }
      merge_guest_cart: {
        Args: { p_guest_token: string; p_user_id: string }
        Returns: undefined
      }
      order_visible_to_vendors: {
        Args: { target_order_id: string }
        Returns: boolean
      }
      own_vendor_id: { Args: never; Returns: string }
      owns_product: { Args: { target_product_id: string }; Returns: boolean }
      place_order: {
        Args: { p_customer_id: string; p_items: Json; p_order: Json }
        Returns: Json
      }
      purge_stale_guest_carts: { Args: { p_days?: number }; Returns: number }
      release_order_coupon: { Args: { p_order_id: string }; Returns: undefined }
      resolve_coupon: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      search_products: {
        Args: { search_query: string }
        Returns: {
          approved_at: string | null
          average_rating: number
          barcode: string | null
          base_price: number
          care_instructions: string | null
          category_id: string | null
          created_at: string
          description: string | null
          dimensions: Json | null
          gst_rate: number
          hsn_code: string | null
          id: string
          is_giftwrap_available: boolean
          is_in_house: boolean
          max_order_quantity: number | null
          meta_description: string | null
          meta_title: string | null
          min_order_quantity: number
          name: string
          occasion_tags: string[]
          personalization_options: Json
          recipient_tags: string[]
          rejection_reason: string | null
          review_count: number
          sale_price: number | null
          search_vector: unknown
          short_description: string | null
          sku: string | null
          slug: string
          status: string
          stock_quantity: number
          tags: string[]
          thumbnail_url: string | null
          total_sold: number
          updated_at: string
          vendor_id: string
          video_url: string | null
          view_count: number
          weight_grams: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      validate_coupon: {
        Args: { p_code: string; p_order_amount: number; p_vendor_id?: string }
        Returns: {
          coupon_id: string
          discount_type: string
          discount_value: number
          error_message: string
          is_valid: boolean
          max_discount_amount: number
        }[]
      }
      vendor_has_order_item: {
        Args: { target_order_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    Enums: {},
  },
} as const
