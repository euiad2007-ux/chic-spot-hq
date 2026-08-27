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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          branch_id: string | null
          check_in: string | null
          check_out: string | null
          created_at: string
          id: string
          in_lat: number | null
          in_lng: number | null
          late_minutes: number
          minutes: number
          note: string | null
          out_lat: number | null
          out_lng: number | null
          overtime_minutes: number
          salon_id: string
          staff_id: string
          updated_at: string
          via: string | null
          work_date: string
        }
        Insert: {
          branch_id?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          in_lat?: number | null
          in_lng?: number | null
          late_minutes?: number
          minutes?: number
          note?: string | null
          out_lat?: number | null
          out_lng?: number | null
          overtime_minutes?: number
          salon_id: string
          staff_id: string
          updated_at?: string
          via?: string | null
          work_date: string
        }
        Update: {
          branch_id?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          in_lat?: number | null
          in_lng?: number | null
          late_minutes?: number
          minutes?: number
          note?: string | null
          out_lat?: number | null
          out_lng?: number | null
          overtime_minutes?: number
          salon_id?: string
          staff_id?: string
          updated_at?: string
          via?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_name: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          salon_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_name?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          salon_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_name?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          salon_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_services: {
        Row: {
          booking_id: string
          duration_min: number
          id: string
          price: number
          queue_no: number | null
          salon_id: string
          service_id: string
          sort_order: number
          staff_id: string | null
        }
        Insert: {
          booking_id: string
          duration_min?: number
          id?: string
          price?: number
          queue_no?: number | null
          salon_id: string
          service_id: string
          sort_order?: number
          staff_id?: string | null
        }
        Update: {
          booking_id?: string
          duration_min?: number
          id?: string
          price?: number
          queue_no?: number | null
          salon_id?: string
          service_id?: string
          sort_order?: number
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          branch_id: string | null
          branch_no: number
          code: string
          coupon_code: string | null
          coupon_discount: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          daily_no: number
          discount: number
          duration_min: number
          global_no: number
          hold_expires_at: string | null
          id: string
          notes: string | null
          pay_status: Database["public"]["Enums"]["pay_status"]
          payment_method: string | null
          price: number
          reminder_error: string | null
          reminder_sent_at: string | null
          salon_id: string
          staff_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          stock_deducted: boolean
          updated_at: string
          wallet_approved: boolean
          wallet_used: number
        }
        Insert: {
          booking_date: string
          branch_id?: string | null
          branch_no?: number
          code: string
          coupon_code?: string | null
          coupon_discount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          daily_no?: number
          discount?: number
          duration_min?: number
          global_no?: number
          hold_expires_at?: string | null
          id?: string
          notes?: string | null
          pay_status?: Database["public"]["Enums"]["pay_status"]
          payment_method?: string | null
          price?: number
          reminder_error?: string | null
          reminder_sent_at?: string | null
          salon_id: string
          staff_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          stock_deducted?: boolean
          updated_at?: string
          wallet_approved?: boolean
          wallet_used?: number
        }
        Update: {
          booking_date?: string
          branch_id?: string | null
          branch_no?: number
          code?: string
          coupon_code?: string | null
          coupon_discount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          daily_no?: number
          discount?: number
          duration_min?: number
          global_no?: number
          hold_expires_at?: string | null
          id?: string
          notes?: string | null
          pay_status?: Database["public"]["Enums"]["pay_status"]
          payment_method?: string | null
          price?: number
          reminder_error?: string | null
          reminder_sent_at?: string | null
          salon_id?: string
          staff_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          stock_deducted?: boolean
          updated_at?: string
          wallet_approved?: boolean
          wallet_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          email: string | null
          geofence_m: number
          hours: string | null
          id: string
          lat: number | null
          lng: number | null
          manager_staff_id: string | null
          maps_url: string | null
          name: string
          phone: string | null
          salon_id: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          email?: string | null
          geofence_m?: number
          hours?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          manager_staff_id?: string | null
          maps_url?: string | null
          name: string
          phone?: string | null
          salon_id: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          email?: string | null
          geofence_m?: number
          hours?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          manager_staff_id?: string | null
          maps_url?: string | null
          name?: string
          phone?: string | null
          salon_id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_manager_staff_id_fkey"
            columns: ["manager_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_shifts: {
        Row: {
          branch_id: string | null
          card_sales: number
          cash_expenses: number
          cash_sales: number
          closed_at: string | null
          closed_by: string | null
          counted_cash: number | null
          created_at: string
          difference: number | null
          expected_cash: number | null
          id: string
          note: string | null
          opened_at: string
          opened_by: string | null
          opening_float: number
          salon_id: string
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          card_sales?: number
          cash_expenses?: number
          cash_sales?: number
          closed_at?: string | null
          closed_by?: string | null
          counted_cash?: number | null
          created_at?: string
          difference?: number | null
          expected_cash?: number | null
          id?: string
          note?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_float?: number
          salon_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          card_sales?: number
          cash_expenses?: number
          cash_sales?: number
          closed_at?: string | null
          closed_by?: string | null
          counted_cash?: number | null
          created_at?: string
          difference?: number | null
          expected_cash?: number | null
          id?: string
          note?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_float?: number
          salon_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_shifts_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_accounts: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_system: boolean
          kind: string
          name: string
          note: string | null
          parent_code: string | null
          salon_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          kind: string
          name: string
          note?: string | null
          parent_code?: string | null
          salon_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          kind?: string
          name?: string
          note?: string | null
          parent_code?: string | null
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_accounts_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          amount: number
          coupon_id: string
          created_at: string
          customer_id: string | null
          id: string
          invoice_id: string | null
          salon_id: string
        }
        Insert: {
          amount?: number
          coupon_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          salon_id: string
        }
        Update: {
          amount?: number
          coupon_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          salon_id?: string
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
            foreignKeyName: "coupon_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          ends_at: string | null
          id: string
          kind: string
          max_uses: number | null
          min_total: number
          note: string | null
          salon_id: string
          starts_at: string | null
          updated_at: string
          used_count: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          ends_at?: string | null
          id?: string
          kind?: string
          max_uses?: number | null
          min_total?: number
          note?: string | null
          salon_id: string
          starts_at?: string | null
          updated_at?: string
          used_count?: number
          value?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          kind?: string
          max_uses?: number | null
          min_total?: number
          note?: string | null
          salon_id?: string
          starts_at?: string | null
          updated_at?: string
          used_count?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_note_items: {
        Row: {
          created_at: string
          credit_note_id: string
          id: string
          kind: string
          name: string
          qty: number
          ref_id: string | null
          salon_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          credit_note_id: string
          id?: string
          kind?: string
          name: string
          qty?: number
          ref_id?: string | null
          salon_id: string
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          credit_note_id?: string
          id?: string
          kind?: string
          name?: string
          qty?: number
          ref_id?: string | null
          salon_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_items_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          invoice_id: string | null
          invoice_number: string | null
          journal_entry_id: string | null
          number: string
          reason: string | null
          salon_id: string
          seq: number
          status: string
          subtotal: number
          total: number
          updated_at: string
          vat: number
          vat_rate: number
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          journal_entry_id?: string | null
          number: string
          reason?: string | null
          salon_id: string
          seq?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vat?: number
          vat_rate?: number
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          journal_entry_id?: string | null
          number?: string
          reason?: string | null
          salon_id?: string
          seq?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vat?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          gender: string | null
          id: string
          loyalty_points: number
          name: string
          notes: string | null
          phone: string
          referral_code: string | null
          referred_by: string | null
          salon_id: string
          total_spent: number
          updated_at: string
          user_id: string | null
          visits: number
          wallet_balance: number
          wallet_id: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          loyalty_points?: number
          name: string
          notes?: string | null
          phone: string
          referral_code?: string | null
          referred_by?: string | null
          salon_id: string
          total_spent?: number
          updated_at?: string
          user_id?: string | null
          visits?: number
          wallet_balance?: number
          wallet_id?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          loyalty_points?: number
          name?: string
          notes?: string | null
          phone?: string
          referral_code?: string | null
          referred_by?: string | null
          salon_id?: string
          total_spent?: number
          updated_at?: string
          user_id?: string | null
          visits?: number
          wallet_balance?: number
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      einvoice_submissions: {
        Row: {
          created_at: string
          created_by: string | null
          credit_note_id: string | null
          doc_number: string | null
          doc_type: string
          doc_uuid: string | null
          env: string
          error: string | null
          id: string
          invoice_hash: string | null
          invoice_id: string | null
          previous_hash: string | null
          qr: string | null
          response: Json | null
          salon_id: string
          status: string
          submitted_at: string | null
          updated_at: string
          xml: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credit_note_id?: string | null
          doc_number?: string | null
          doc_type?: string
          doc_uuid?: string | null
          env?: string
          error?: string | null
          id?: string
          invoice_hash?: string | null
          invoice_id?: string | null
          previous_hash?: string | null
          qr?: string | null
          response?: Json | null
          salon_id: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          xml?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credit_note_id?: string | null
          doc_number?: string | null
          doc_type?: string
          doc_uuid?: string | null
          env?: string
          error?: string | null
          id?: string
          invoice_hash?: string | null
          invoice_id?: string | null
          previous_hash?: string | null
          qr?: string | null
          response?: Json | null
          salon_id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          xml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "einvoice_submissions_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "einvoice_submissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "einvoice_submissions_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          created_by: string | null
          id: string
          method: string
          note: string | null
          salon_id: string
          shift_id: string | null
          spent_on: string
          updated_at: string
          vat_amount: number
          vendor: string | null
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          note?: string | null
          salon_id: string
          shift_id?: string | null
          spent_on?: string
          updated_at?: string
          vat_amount?: number
          vendor?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          note?: string | null
          salon_id?: string
          shift_id?: string | null
          spent_on?: string
          updated_at?: string
          vat_amount?: number
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_years: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_entry_id: string | null
          created_at: string
          end_date: string
          id: string
          net_profit: number
          note: string | null
          salon_id: string
          start_date: string
          status: string
          total_expenses: number
          total_revenue: number
          updated_at: string
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_entry_id?: string | null
          created_at?: string
          end_date: string
          id?: string
          net_profit?: number
          note?: string | null
          salon_id: string
          start_date: string
          status?: string
          total_expenses?: number
          total_revenue?: number
          updated_at?: string
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_entry_id?: string | null
          created_at?: string
          end_date?: string
          id?: string
          net_profit?: number
          note?: string | null
          salon_id?: string
          start_date?: string
          status?: string
          total_expenses?: number
          total_revenue?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_years_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          acquired_on: string
          branch_id: string | null
          category: string | null
          cost: number
          created_at: string
          created_by: string | null
          disposal_amount: number
          disposed_on: string | null
          id: string
          name: string
          note: string | null
          salon_id: string
          salvage_value: number
          status: string
          updated_at: string
          useful_life_months: number
        }
        Insert: {
          acquired_on?: string
          branch_id?: string | null
          category?: string | null
          cost?: number
          created_at?: string
          created_by?: string | null
          disposal_amount?: number
          disposed_on?: string | null
          id?: string
          name: string
          note?: string | null
          salon_id: string
          salvage_value?: number
          status?: string
          updated_at?: string
          useful_life_months?: number
        }
        Update: {
          acquired_on?: string
          branch_id?: string | null
          category?: string | null
          cost?: number
          created_at?: string
          created_by?: string | null
          disposal_amount?: number
          disposed_on?: string | null
          id?: string
          name?: string
          note?: string | null
          salon_id?: string
          salvage_value?: number
          status?: string
          updated_at?: string
          useful_life_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          branch_id: string | null
          cost_per_unit: number
          created_at: string
          id: string
          is_for_sale: boolean
          measure: string
          min_stock: number
          name: string
          sale_price: number
          salon_id: string
          size_per_unit: number
          sku: string | null
          stock: number
          supplier_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          cost_per_unit?: number
          created_at?: string
          id?: string
          is_for_sale?: boolean
          measure?: string
          min_stock?: number
          name: string
          sale_price?: number
          salon_id: string
          size_per_unit?: number
          sku?: string | null
          stock?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          cost_per_unit?: number
          created_at?: string
          id?: string
          is_for_sale?: boolean
          measure?: string
          min_stock?: number
          name?: string
          sale_price?: number
          salon_id?: string
          size_per_unit?: number
          sku?: string | null
          stock?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stocktake_lines: {
        Row: {
          cost_per_unit: number
          counted_qty: number
          created_at: string
          diff_qty: number
          id: string
          item_id: string
          salon_id: string
          stocktake_id: string
          system_qty: number
        }
        Insert: {
          cost_per_unit?: number
          counted_qty?: number
          created_at?: string
          diff_qty?: number
          id?: string
          item_id: string
          salon_id: string
          stocktake_id: string
          system_qty?: number
        }
        Update: {
          cost_per_unit?: number
          counted_qty?: number
          created_at?: string
          diff_qty?: number
          id?: string
          item_id?: string
          salon_id?: string
          stocktake_id?: string
          system_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stocktake_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stocktake_lines_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stocktake_lines_stocktake_id_fkey"
            columns: ["stocktake_id"]
            isOneToOne: false
            referencedRelation: "inventory_stocktakes"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stocktakes: {
        Row: {
          applied_at: string | null
          branch_id: string | null
          counted_on: string
          created_at: string
          created_by: string | null
          diff_qty: number
          diff_value: number
          id: string
          note: string | null
          salon_id: string
          status: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          branch_id?: string | null
          counted_on?: string
          created_at?: string
          created_by?: string | null
          diff_qty?: number
          diff_value?: number
          id?: string
          note?: string | null
          salon_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          branch_id?: string | null
          counted_on?: string
          created_at?: string
          created_by?: string | null
          diff_qty?: number
          diff_value?: number
          id?: string
          note?: string | null
          salon_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stocktakes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stocktakes_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          kind: string
          name: string
          qty: number
          ref_id: string | null
          salon_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          kind: string
          name: string
          qty?: number
          ref_id?: string | null
          salon_id: string
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          kind?: string
          name?: string
          qty?: number
          ref_id?: string | null
          salon_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          is_refund: boolean
          method: string
          salon_id: string
          shift_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          is_refund?: boolean
          method?: string
          salon_id: string
          shift_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          is_refund?: boolean
          method?: string
          salon_id?: string
          shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          booking_id: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount: number
          id: string
          number: string
          paid: number
          payment_method: string | null
          refunded_amount: number
          salon_id: string
          seq: number
          shift_id: string | null
          source: string
          status: Database["public"]["Enums"]["pay_status"]
          subtotal: number
          total: number
          updated_at: string
          vat: number
          void_reason: string | null
        }
        Insert: {
          booking_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          id?: string
          number: string
          paid?: number
          payment_method?: string | null
          refunded_amount?: number
          salon_id: string
          seq: number
          shift_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["pay_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vat?: number
          void_reason?: string | null
        }
        Update: {
          booking_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          id?: string
          number?: string
          paid?: number
          payment_method?: string | null
          refunded_amount?: number
          salon_id?: string
          seq?: number
          shift_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["pay_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vat?: number
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          branch_id: string | null
          created_at: string
          email: string | null
          id: string
          job_title: string | null
          kind: string
          name: string
          note: string | null
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          salon_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          job_title?: string | null
          kind?: string
          name: string
          note?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          salon_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          job_title?: string | null
          kind?: string
          name?: string
          note?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          salon_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          memo: string | null
          period: string
          salon_id: string
          source: string
          source_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_date: string
          id?: string
          memo?: string | null
          period: string
          salon_id: string
          source: string
          source_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          memo?: string | null
          period?: string
          salon_id?: string
          source?: string
          source_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_code: string
          account_name: string
          created_at: string
          credit: number
          debit: number
          entry_id: string
          id: string
          salon_id: string
        }
        Insert: {
          account_code: string
          account_name: string
          created_at?: string
          credit?: number
          debit?: number
          entry_id: string
          id?: string
          salon_id: string
        }
        Update: {
          account_code?: string
          account_name?: string
          created_at?: string
          credit?: number
          debit?: number
          entry_id?: string
          id?: string
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      leaves: {
        Row: {
          created_at: string
          days: number
          from_date: string
          id: string
          kind: string
          reason: string | null
          salon_id: string
          staff_id: string
          status: string
          to_date: string
        }
        Insert: {
          created_at?: string
          days?: number
          from_date: string
          id?: string
          kind?: string
          reason?: string | null
          salon_id: string
          staff_id: string
          status?: string
          to_date: string
        }
        Update: {
          created_at?: string
          days?: number
          from_date?: string
          id?: string
          kind?: string
          reason?: string | null
          salon_id?: string
          staff_id?: string
          status?: string
          to_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaves_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaves_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          invoice_id: string | null
          points: number
          reason: string | null
          salon_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          invoice_id?: string | null
          points: number
          reason?: string | null
          salon_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          invoice_id?: string | null
          points?: number
          reason?: string | null
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          body: string | null
          booking_id: string | null
          branch_id: string | null
          channel: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          error: string | null
          id: string
          invite_id: string | null
          kind: string
          meta: Json
          recipient: string | null
          salon_id: string
          scheduled_for: string | null
          sent_at: string | null
          staff_id: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          booking_id?: string | null
          branch_id?: string | null
          channel: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          error?: string | null
          id?: string
          invite_id?: string | null
          kind: string
          meta?: Json
          recipient?: string | null
          salon_id: string
          scheduled_for?: string | null
          sent_at?: string | null
          staff_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          booking_id?: string | null
          branch_id?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          error?: string | null
          id?: string
          invite_id?: string | null
          kind?: string
          meta?: Json
          recipient?: string | null
          salon_id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          staff_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "staff_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          allowances_amount: number
          base_amount: number
          bonus: number
          commission_amount: number
          created_at: string
          created_by: string | null
          deductions: number
          id: string
          net_amount: number
          note: string | null
          overtime_amount: number
          overtime_minutes: number
          paid_amount: number
          period: string
          salon_id: string
          staff_id: string
          status: string
          updated_at: string
          worked_minutes: number
        }
        Insert: {
          allowances_amount?: number
          base_amount?: number
          bonus?: number
          commission_amount?: number
          created_at?: string
          created_by?: string | null
          deductions?: number
          id?: string
          net_amount?: number
          note?: string | null
          overtime_amount?: number
          overtime_minutes?: number
          paid_amount?: number
          period: string
          salon_id: string
          staff_id: string
          status?: string
          updated_at?: string
          worked_minutes?: number
        }
        Update: {
          allowances_amount?: number
          base_amount?: number
          bonus?: number
          commission_amount?: number
          created_at?: string
          created_by?: string | null
          deductions?: number
          id?: string
          net_amount?: number
          note?: string | null
          overtime_amount?: number
          overtime_minutes?: number
          paid_amount?: number
          period?: string
          salon_id?: string
          staff_id?: string
          status?: string
          updated_at?: string
          worked_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "payslips_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_notifications: {
        Row: {
          body: string
          created_at: string
          due_at: string | null
          id: string
          kind: string
          meta: Json
          read_at: string | null
          salon_id: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          due_at?: string | null
          id?: string
          kind: string
          meta?: Json
          read_at?: string | null
          salon_id?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          due_at?: string | null
          id?: string
          kind?: string
          meta?: Json
          read_at?: string | null
          salon_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_notifications_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_plans: {
        Row: {
          code: string
          created_at: string
          enabled_modules: string[]
          features: string[]
          has_website: boolean
          id: string
          is_active: boolean
          max_branches: number
          max_customers: number
          max_invoices: number
          max_services: number
          max_staff: number
          name: string
          price_monthly: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          enabled_modules?: string[]
          features?: string[]
          has_website?: boolean
          id?: string
          is_active?: boolean
          max_branches?: number
          max_customers?: number
          max_invoices?: number
          max_services?: number
          max_staff?: number
          name: string
          price_monthly?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          enabled_modules?: string[]
          features?: string[]
          has_website?: boolean
          id?: string
          is_active?: boolean
          max_branches?: number
          max_customers?: number
          max_invoices?: number
          max_services?: number
          max_staff?: number
          name?: string
          price_monthly?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          account_number: string | null
          bank_account_name: string | null
          bank_name: string | null
          brand_name: string
          created_at: string
          email: string | null
          home: Json
          iban: string | null
          id: string
          phone: string | null
          socials: Json
          support_hours: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          account_number?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          brand_name?: string
          created_at?: string
          email?: string | null
          home?: Json
          iban?: string | null
          id?: string
          phone?: string | null
          socials?: Json
          support_hours?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          account_number?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          brand_name?: string
          created_at?: string
          email?: string | null
          home?: Json
          iban?: string | null
          id?: string
          phone?: string | null
          socials?: Json
          support_hours?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarding_tour_done_at: string | null
          onboarding_tour_state: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_tour_done_at?: string | null
          onboarding_tour_state?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_tour_done_at?: string | null
          onboarding_tour_state?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      salon_members: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id: string | null
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id?: string | null
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          salon_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_members_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_reviews: {
        Row: {
          booking_id: string | null
          branch_id: string | null
          comment: string | null
          created_at: string
          customer_id: string | null
          display_name: string | null
          id: string
          published: boolean
          rating: number
          salon_id: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          branch_id?: string | null
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          id?: string
          published?: boolean
          rating: number
          salon_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          branch_id?: string | null
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          id?: string
          published?: boolean
          rating?: number
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_reviews_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_reviews_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_settings: {
        Row: {
          booking: Json
          inventory: Json
          invoice: Json | null
          payroll: Json
          rewards: Json
          salon_id: string
          site: Json
          updated_at: string
        }
        Insert: {
          booking?: Json
          inventory?: Json
          invoice?: Json | null
          payroll?: Json
          rewards?: Json
          salon_id: string
          site?: Json
          updated_at?: string
        }
        Update: {
          booking?: Json
          inventory?: Json
          invoice?: Json | null
          payroll?: Json
          rewards?: Json
          salon_id?: string
          site?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_settings_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: true
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_verification: {
        Row: {
          account_holder: string | null
          bank_name: string | null
          created_at: string
          doc_expires_on: string | null
          doc_issued_on: string | null
          doc_kind: string
          doc_number: string | null
          files: Json
          iban: string | null
          legal_name: string | null
          national_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          salon_id: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          bank_name?: string | null
          created_at?: string
          doc_expires_on?: string | null
          doc_issued_on?: string | null
          doc_kind?: string
          doc_number?: string | null
          files?: Json
          iban?: string | null
          legal_name?: string | null
          national_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          salon_id: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          bank_name?: string | null
          created_at?: string
          doc_expires_on?: string | null
          doc_issued_on?: string | null
          doc_kind?: string
          doc_number?: string | null
          files?: Json
          iban?: string | null
          legal_name?: string | null
          national_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          salon_id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_verification_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: true
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salons: {
        Row: {
          admin_notes: string | null
          country: string
          created_at: string
          currency: string
          custom_domain: string | null
          domain_status: string
          expenses_include_vat: boolean
          id: string
          is_suspended: boolean
          name: string
          owner_id: string | null
          phone: string | null
          plan: string
          slug: string
          subscription_ends_at: string | null
          subscription_status: string
          tax_number: string | null
          trial_ends_at: string | null
          updated_at: string
          vat_number: string | null
          vat_pct: number
          vat_rate: number
        }
        Insert: {
          admin_notes?: string | null
          country?: string
          created_at?: string
          currency?: string
          custom_domain?: string | null
          domain_status?: string
          expenses_include_vat?: boolean
          id?: string
          is_suspended?: boolean
          name: string
          owner_id?: string | null
          phone?: string | null
          plan?: string
          slug: string
          subscription_ends_at?: string | null
          subscription_status?: string
          tax_number?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          vat_number?: string | null
          vat_pct?: number
          vat_rate?: number
        }
        Update: {
          admin_notes?: string | null
          country?: string
          created_at?: string
          currency?: string
          custom_domain?: string | null
          domain_status?: string
          expenses_include_vat?: boolean
          id?: string
          is_suspended?: boolean
          name?: string
          owner_id?: string | null
          phone?: string | null
          plan?: string
          slug?: string
          subscription_ends_at?: string | null
          subscription_status?: string
          tax_number?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          vat_number?: string | null
          vat_pct?: number
          vat_rate?: number
        }
        Relationships: []
      }
      service_materials: {
        Row: {
          id: string
          item_id: string
          qty: number
          salon_id: string
          service_id: string
        }
        Insert: {
          id?: string
          item_id: string
          qty?: number
          salon_id: string
          service_id: string
        }
        Update: {
          id?: string
          item_id?: string
          qty?: number
          salon_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_materials_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_materials_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_materials_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_staff: {
        Row: {
          id: string
          salon_id: string
          service_id: string
          staff_id: string
        }
        Insert: {
          id?: string
          salon_id: string
          service_id: string
          staff_id: string
        }
        Update: {
          id?: string
          salon_id?: string
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_staff_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_staff_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_staff_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          branch_id: string | null
          category: string | null
          cleanup_min: number
          created_at: string
          daily_capacity: number | null
          duration_min: number
          id: string
          name: string
          prep_min: number
          price: number
          salon_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          category?: string | null
          cleanup_min?: number
          created_at?: string
          daily_capacity?: number | null
          duration_min?: number
          id?: string
          name: string
          prep_min?: number
          price?: number
          salon_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          category?: string | null
          cleanup_min?: number
          created_at?: string
          daily_capacity?: number | null
          duration_min?: number
          id?: string
          name?: string
          prep_min?: number
          price?: number
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          active: boolean
          address: string | null
          allowances: Json
          annual_leave_days: number
          base_salary: number
          birth_date: string | null
          branch_id: string | null
          commission_pct: number
          contract_type: string | null
          created_at: string
          email: string | null
          emergency_name: string | null
          emergency_phone: string | null
          gender: string | null
          hire_date: string | null
          id: string
          job_title: string | null
          meta: Json
          name: string
          national_id: string | null
          nationality: string | null
          phone: string | null
          points: number
          role_label: string | null
          salon_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          allowances?: Json
          annual_leave_days?: number
          base_salary?: number
          birth_date?: string | null
          branch_id?: string | null
          commission_pct?: number
          contract_type?: string | null
          created_at?: string
          email?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          gender?: string | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          meta?: Json
          name: string
          national_id?: string | null
          nationality?: string | null
          phone?: string | null
          points?: number
          role_label?: string | null
          salon_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          allowances?: Json
          annual_leave_days?: number
          base_salary?: number
          birth_date?: string | null
          branch_id?: string | null
          commission_pct?: number
          contract_type?: string | null
          created_at?: string
          email?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          gender?: string | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          meta?: Json
          name?: string
          national_id?: string | null
          nationality?: string | null
          phone?: string | null
          points?: number
          role_label?: string | null
          salon_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          branch_id: string | null
          code: string
          created_at: string
          created_by: string | null
          email: string
          email_error: string | null
          email_sent_at: string | null
          expires_at: string
          id: string
          job_title: string | null
          name: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id: string
          staff_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          branch_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          email: string
          email_error?: string | null
          email_sent_at?: string | null
          expires_at?: string
          id?: string
          job_title?: string | null
          name: string
          role?: Database["public"]["Enums"]["app_role"]
          salon_id: string
          staff_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          branch_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          email?: string
          email_error?: string | null
          email_sent_at?: string | null
          expires_at?: string
          id?: string
          job_title?: string | null
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          salon_id?: string
          staff_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invites_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invites_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invites_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          booking_id: string | null
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          kind: Database["public"]["Enums"]["stock_move_type"]
          qty: number
          reason: string | null
          salon_id: string
          supplier_id: string | null
          unit_cost: number | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          kind: Database["public"]["Enums"]["stock_move_type"]
          qty: number
          reason?: string | null
          salon_id: string
          supplier_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          kind?: Database["public"]["Enums"]["stock_move_type"]
          qty?: number
          reason?: string | null
          salon_id?: string
          supplier_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          note: string | null
          paid: number
          period: string
          period_end: string
          period_start: string
          plan_code: string | null
          salon_id: string
          status: string
          total: number
          updated_at: string
          vat: number
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          note?: string | null
          paid?: number
          period: string
          period_end: string
          period_start: string
          plan_code?: string | null
          salon_id: string
          status?: string
          total?: number
          updated_at?: string
          vat?: number
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          note?: string | null
          paid?: number
          period?: string
          period_end?: string
          period_start?: string
          plan_code?: string | null
          salon_id?: string
          status?: string
          total?: number
          updated_at?: string
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          method: string
          note: string | null
          paid_at: string
          reference: string | null
          salon_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          note?: string | null
          paid_at?: string
          reference?: string | null
          salon_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          note?: string | null
          paid_at?: string
          reference?: string | null
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "subscription_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          salon_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          salon_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          created_at: string
          from_platform: boolean
          id: string
          salon_id: string
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          created_at?: string
          from_platform?: boolean
          id?: string
          salon_id: string
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          from_platform?: boolean
          id?: string
          salon_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          last_reply_at: string | null
          priority: string
          salon_id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_reply_at?: string | null
          priority?: string
          salon_id: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_reply_at?: string | null
          priority?: string
          salon_id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_topup_requests: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          method: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          salon_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          method?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          salon_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          method?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          salon_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_topup_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_topup_requests_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          invoice_id: string | null
          kind: Database["public"]["Enums"]["ledger_kind"]
          reason: string | null
          salon_id: string
        }
        Insert: {
          amount: number
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          invoice_id?: string | null
          kind: Database["public"]["Enums"]["ledger_kind"]
          reason?: string | null
          salon_id: string
        }
        Update: {
          amount?: number
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          invoice_id?: string | null
          kind?: Database["public"]["Enums"]["ledger_kind"]
          reason?: string | null
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      zatca_config: {
        Row: {
          binary_token: string | null
          common_name: string | null
          created_at: string
          enabled: boolean
          env: string
          last_hash: string | null
          last_submitted_at: string | null
          salon_id: string
          secret: string | null
          seller_name: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          binary_token?: string | null
          common_name?: string | null
          created_at?: string
          enabled?: boolean
          env?: string
          last_hash?: string | null
          last_submitted_at?: string | null
          salon_id: string
          secret?: string | null
          seller_name?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          binary_token?: string | null
          common_name?: string | null
          created_at?: string
          enabled?: boolean
          env?: string
          last_hash?: string | null
          last_submitted_at?: string | null
          salon_id?: string
          secret?: string | null
          seller_name?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zatca_config_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: true
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_staff_invite: { Args: { _code: string }; Returns: Json }
      apply_stocktake: { Args: { p_stocktake_id: string }; Returns: undefined }
      approve_wallet_topup: { Args: { _request: string }; Returns: Json }
      can_access_branch: {
        Args: { _branch: string; _salon: string; _uid: string }
        Returns: boolean
      }
      can_access_invoice_object: { Args: { _name: string }; Returns: boolean }
      can_manage_salon: {
        Args: { _salon: string; _uid: string }
        Returns: boolean
      }
      cancel_expired_holds: { Args: { _salon: string }; Returns: number }
      checkout_booking: {
        Args: {
          _booking: string
          _coupon?: string
          _loyalty_rate?: number
          _method?: string
          _referral_pct?: number
          _wallet_used?: number
        }
        Returns: Json
      }
      claim_platform_owner: { Args: never; Returns: boolean }
      close_fiscal_year: {
        Args: { _note?: string; _salon: string; _year: number }
        Returns: string
      }
      close_shift: {
        Args: { _counted: number; _note?: string; _shift: string }
        Returns: Json
      }
      create_journal_entry: {
        Args: { _date: string; _lines: Json; _memo: string; _salon: string }
        Returns: string
      }
      create_salon: {
        Args: { _name: string; _phone?: string; _slug: string }
        Returns: string
      }
      create_staff_invite: {
        Args: {
          _branch?: string
          _email: string
          _job_title?: string
          _name: string
          _salon: string
          _staff?: string
        }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          branch_id: string | null
          code: string
          created_at: string
          created_by: string | null
          email: string
          email_error: string | null
          email_sent_at: string | null
          expires_at: string
          id: string
          job_title: string | null
          name: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id: string
          staff_id: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "staff_invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_journal_entry: { Args: { _entry: string }; Returns: boolean }
      ensure_client_profile:
        | { Args: never; Returns: string }
        | { Args: { _salon?: string }; Returns: string }
      grant_platform_owner: { Args: { _email: string }; Returns: boolean }
      is_platform_owner: { Args: { _uid: string }; Returns: boolean }
      is_salon_customer: {
        Args: { _salon: string; _uid: string }
        Returns: boolean
      }
      is_salon_member: {
        Args: { _salon: string; _uid: string }
        Returns: boolean
      }
      is_salon_owner: {
        Args: { _salon: string; _uid: string }
        Returns: boolean
      }
      issue_credit_note: {
        Args: {
          _invoice: string
          _lines: Json
          _reason: string
          _salon: string
        }
        Returns: string
      }
      open_shift: {
        Args: { _branch: string; _opening_float?: number; _salon: string }
        Returns: string
      }
      platform_customers_overview: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          invoices_count: number
          last_visit: string
          loyalty_points: number
          name: string
          phone: string
          salon_id: string
          salon_name: string
          salons_count: number
          total_spent: number
          visits: number
          wallet_balance: number
        }[]
      }
      platform_salons_overview: {
        Args: never
        Returns: {
          admin_notes: string
          bookings_count: number
          branches_count: number
          created_at: string
          custom_domain: string
          customers_count: number
          domain_status: string
          gross_sales: number
          id: string
          invoices_count: number
          invoices_month: number
          is_suspended: boolean
          name: string
          open_tickets: number
          owner_email: string
          owner_name: string
          phone: string
          plan: string
          plan_name: string
          plan_price: number
          services_count: number
          slug: string
          staff_count: number
          sub_billed: number
          sub_due: number
          sub_paid: number
          subscription_ends_at: string
          subscription_status: string
          trial_ends_at: string
        }[]
      }
      platform_storage_overview: {
        Args: never
        Returns: {
          est_bytes: number
          rows_total: number
          salon_id: string
          salon_name: string
          tables: Json
        }[]
      }
      platform_table_sizes: {
        Args: never
        Returns: {
          row_estimate: number
          table_name: string
          total_bytes: number
        }[]
      }
      pos_checkout: {
        Args: {
          _branch: string
          _customer: string
          _discount?: number
          _items: Json
          _method?: string
          _salon: string
          _shift?: string
        }
        Returns: Json
      }
      post_accounting_period: {
        Args: { _from: string; _salon: string; _to: string }
        Returns: Json
      }
      post_depreciation: {
        Args: { _period: string; _salon: string }
        Returns: Json
      }
      public_salon_branches: {
        Args: { _salon: string }
        Returns: {
          address: string
          email: string
          hours: string
          id: string
          lat: number
          lng: number
          manager_name: string
          maps_url: string
          name: string
          phone: string
          whatsapp: string
        }[]
      }
      public_salon_lookup: {
        Args: { _domains?: string[]; _slug?: string }
        Returns: {
          custom_domain: string
          domain_status: string
          id: string
          name: string
          slug: string
        }[]
      }
      public_salon_rating: {
        Args: { _salon: string }
        Returns: {
          avg_rating: number
          review_count: number
        }[]
      }
      public_salon_reviews: {
        Args: { _limit?: number; _salon: string }
        Returns: {
          comment: string
          created_at: string
          display_name: string
          id: string
          rating: number
        }[]
      }
      public_salon_services: {
        Args: { _salon: string }
        Returns: {
          category: string
          duration_min: number
          id: string
          name: string
          price: number
        }[]
      }
      public_salon_site: { Args: { _salon: string }; Returns: Json }
      public_salon_team: {
        Args: { _salon: string }
        Returns: {
          id: string
          job_title: string
          name: string
          role_label: string
        }[]
      }
      record_einvoice_submission: {
        Args: {
          _credit_note: string
          _doc_number: string
          _doc_type: string
          _doc_uuid: string
          _env: string
          _error?: string
          _hash: string
          _invoice: string
          _qr: string
          _response?: Json
          _salon: string
          _status: string
          _xml: string
        }
        Returns: string
      }
      redeem_loyalty: {
        Args: { _customer: string; _points: number; _rate?: number }
        Returns: number
      }
      refresh_subscription_expiry_notifications: {
        Args: never
        Returns: number
      }
      reopen_fiscal_year: {
        Args: { _salon: string; _year: number }
        Returns: undefined
      }
      request_join_salon: {
        Args: {
          _job_title?: string
          _kind: string
          _name?: string
          _note?: string
          _phone?: string
          _salon: string
        }
        Returns: Json
      }
      review_join_request: {
        Args: { _approve: boolean; _branch?: string; _request: string }
        Returns: Json
      }
      salon_staff_directory: {
        Args: { _salon: string }
        Returns: {
          active: boolean
          branch_id: string
          id: string
          job_title: string
          name: string
          role_label: string
          salon_id: string
        }[]
      }
      seed_chart_accounts: { Args: { _salon: string }; Returns: number }
      submit_salon_review: {
        Args: {
          _booking: string
          _comment?: string
          _display_name?: string
          _rating: number
        }
        Returns: string
      }
      unpost_accounting_period: {
        Args: { _period: string; _salon: string }
        Returns: number
      }
      wallet_transfer: {
        Args: { _amount: number; _note?: string; _to_wallet: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "platform_owner"
        | "salon_owner"
        | "branch_manager"
        | "staff"
        | "client"
      booking_status:
        | "new"
        | "confirmed"
        | "checked_in"
        | "in_progress"
        | "completed"
        | "no_show"
        | "cancelled"
      ledger_kind:
        | "topup"
        | "spend"
        | "refund"
        | "transfer_in"
        | "transfer_out"
        | "referral"
        | "adjust"
      pay_status: "unpaid" | "partial" | "paid" | "refunded" | "void"
      stock_move_type: "purchase" | "consume" | "adjust" | "waste" | "return"
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
      app_role: [
        "platform_owner",
        "salon_owner",
        "branch_manager",
        "staff",
        "client",
      ],
      booking_status: [
        "new",
        "confirmed",
        "checked_in",
        "in_progress",
        "completed",
        "no_show",
        "cancelled",
      ],
      ledger_kind: [
        "topup",
        "spend",
        "refund",
        "transfer_in",
        "transfer_out",
        "referral",
        "adjust",
      ],
      pay_status: ["unpaid", "partial", "paid", "refunded", "void"],
      stock_move_type: ["purchase", "consume", "adjust", "waste", "return"],
    },
  },
} as const
