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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          changed_fields: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          summary: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          changed_fields?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          summary?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          changed_fields?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          summary?: string | null
        }
        Relationships: []
      }
      checklist_template_items: {
        Row: {
          category: string
          created_at: string
          id: string
          is_required: boolean
          item_name: string
          sort_order: number
          template_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_required?: boolean
          item_name: string
          sort_order?: number
          template_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_required?: boolean
          item_name?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
          vehicle_category: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
          vehicle_category?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
          vehicle_category?: string | null
        }
        Relationships: []
      }
      contract_checklist_photos: {
        Row: {
          caption: string | null
          checklist_id: string
          created_at: string
          created_by: string | null
          id: string
          photo_url: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          checklist_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          photo_url: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          checklist_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          photo_url?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_checklist_photos_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "contract_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_checklists: {
        Row: {
          category: string
          checklist_type: string
          condition: string
          contract_id: string
          created_at: string
          id: string
          is_required: boolean
          item_name: string
          notes: string | null
          photo_url: string | null
          sort_order: number
          template_item_id: string | null
        }
        Insert: {
          category?: string
          checklist_type: string
          condition?: string
          contract_id: string
          created_at?: string
          id?: string
          is_required?: boolean
          item_name: string
          notes?: string | null
          photo_url?: string | null
          sort_order?: number
          template_item_id?: string | null
        }
        Update: {
          category?: string
          checklist_type?: string
          condition?: string
          contract_id?: string
          created_at?: string
          id?: string
          is_required?: boolean
          item_name?: string
          notes?: string | null
          photo_url?: string | null
          sort_order?: number
          template_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_checklists_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_checklists_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_bi_hari_pakai"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_checklists_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_bi_pendapatan"
            referencedColumns: ["contract_id"]
          },
        ]
      }
      contract_extensions: {
        Row: {
          additional_amount: number
          approved_by: string | null
          contract_id: string
          created_at: string
          id: string
          new_end_date: string
          previous_end_date: string
        }
        Insert: {
          additional_amount?: number
          approved_by?: string | null
          contract_id: string
          created_at?: string
          id?: string
          new_end_date: string
          previous_end_date: string
        }
        Update: {
          additional_amount?: number
          approved_by?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          new_end_date?: string
          previous_end_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_extensions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_extensions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_bi_hari_pakai"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_extensions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_bi_pendapatan"
            referencedColumns: ["contract_id"]
          },
        ]
      }
      contract_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          contract_id: string
          id: string
          new_status: Database["public"]["Enums"]["contract_status"]
          previous_status: Database["public"]["Enums"]["contract_status"] | null
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          contract_id: string
          id?: string
          new_status: Database["public"]["Enums"]["contract_status"]
          previous_status?:
            | Database["public"]["Enums"]["contract_status"]
            | null
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          contract_id?: string
          id?: string
          new_status?: Database["public"]["Enums"]["contract_status"]
          previous_status?:
            | Database["public"]["Enums"]["contract_status"]
            | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_status_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_status_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_bi_hari_pakai"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_status_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_bi_pendapatan"
            referencedColumns: ["contract_id"]
          },
        ]
      }
      contracts: {
        Row: {
          actual_return_date: string | null
          additional_charges: number
          approved_by: string | null
          base_rate: number
          contract_number: string
          created_at: string
          created_by: string | null
          deposit_amount: number
          discount_amount: number
          document_url: string | null
          document_version: number
          driver_option: string
          duration_qty: number
          end_date: string
          fuel_level_end: string | null
          fuel_level_start: string | null
          id: string
          late_fee_per_day: number
          odometer_end: number | null
          odometer_start: number | null
          override_at: string | null
          override_by: string | null
          override_reason: string | null
          override_type: string | null
          pickup_location: string | null
          pricing_snapshot_at: string | null
          rental_type: Database["public"]["Enums"]["rental_type"]
          renter_id: string
          return_location: string | null
          signed_at: string | null
          snapshot_daily_rate: number | null
          snapshot_deposit_amount: number | null
          snapshot_monthly_rate: number | null
          snapshot_weekly_rate: number | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          subtotal: number
          terms_notes: string | null
          total_amount: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          actual_return_date?: string | null
          additional_charges?: number
          approved_by?: string | null
          base_rate?: number
          contract_number?: string
          created_at?: string
          created_by?: string | null
          deposit_amount?: number
          discount_amount?: number
          document_url?: string | null
          document_version?: number
          driver_option?: string
          duration_qty?: number
          end_date: string
          fuel_level_end?: string | null
          fuel_level_start?: string | null
          id?: string
          late_fee_per_day?: number
          odometer_end?: number | null
          odometer_start?: number | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          override_type?: string | null
          pickup_location?: string | null
          pricing_snapshot_at?: string | null
          rental_type?: Database["public"]["Enums"]["rental_type"]
          renter_id: string
          return_location?: string | null
          signed_at?: string | null
          snapshot_daily_rate?: number | null
          snapshot_deposit_amount?: number | null
          snapshot_monthly_rate?: number | null
          snapshot_weekly_rate?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          subtotal?: number
          terms_notes?: string | null
          total_amount?: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          actual_return_date?: string | null
          additional_charges?: number
          approved_by?: string | null
          base_rate?: number
          contract_number?: string
          created_at?: string
          created_by?: string | null
          deposit_amount?: number
          discount_amount?: number
          document_url?: string | null
          document_version?: number
          driver_option?: string
          duration_qty?: number
          end_date?: string
          fuel_level_end?: string | null
          fuel_level_start?: string | null
          id?: string
          late_fee_per_day?: number
          odometer_end?: number | null
          odometer_start?: number | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          override_type?: string | null
          pickup_location?: string | null
          pricing_snapshot_at?: string | null
          rental_type?: Database["public"]["Enums"]["rental_type"]
          renter_id?: string
          return_location?: string | null
          signed_at?: string | null
          snapshot_daily_rate?: number | null
          snapshot_deposit_amount?: number | null
          snapshot_monthly_rate?: number | null
          snapshot_weekly_rate?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          subtotal?: number
          terms_notes?: string | null
          total_amount?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_internal"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_deductions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          deduction_type: string
          deposit_id: string
          description: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          outstanding_payment_id: string | null
          photo_url: string | null
          reason: string
          workshop_invoice_url: string | null
          workshop_name: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          deduction_type?: string
          deposit_id: string
          description?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          outstanding_payment_id?: string | null
          photo_url?: string | null
          reason: string
          workshop_invoice_url?: string | null
          workshop_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          deduction_type?: string
          deposit_id?: string
          description?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          outstanding_payment_id?: string | null
          photo_url?: string | null
          reason?: string
          workshop_invoice_url?: string | null
          workshop_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposit_deductions_deposit_id_fkey"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_deductions_outstanding_payment_id_fkey"
            columns: ["outstanding_payment_id"]
            isOneToOne: false
            referencedRelation: "outstanding_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_deductions_outstanding_payment_id_fkey"
            columns: ["outstanding_payment_id"]
            isOneToOne: false
            referencedRelation: "v_bi_umur_piutang"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          forfeited_reason: string | null
          handled_by: string | null
          held_until: string | null
          id: string
          notes: string | null
          proof_url: string | null
          received_date: string | null
          received_method: string | null
          refund_account_holder: string | null
          refund_account_number: string | null
          refund_amount: number | null
          refund_bank_name: string | null
          refund_date: string | null
          refund_method: string | null
          refund_proof_url: string | null
          renter_id: string
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          contract_id: string
          created_at?: string
          forfeited_reason?: string | null
          handled_by?: string | null
          held_until?: string | null
          id?: string
          notes?: string | null
          proof_url?: string | null
          received_date?: string | null
          received_method?: string | null
          refund_account_holder?: string | null
          refund_account_number?: string | null
          refund_amount?: number | null
          refund_bank_name?: string | null
          refund_date?: string | null
          refund_method?: string | null
          refund_proof_url?: string | null
          renter_id: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          forfeited_reason?: string | null
          handled_by?: string | null
          held_until?: string | null
          id?: string
          notes?: string | null
          proof_url?: string | null
          received_date?: string | null
          received_method?: string | null
          refund_account_holder?: string | null
          refund_account_number?: string | null
          refund_amount?: number | null
          refund_bank_name?: string | null
          refund_date?: string | null
          refund_method?: string | null
          refund_proof_url?: string | null
          renter_id?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "v_bi_hari_pakai"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "deposits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "v_bi_pendapatan"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "deposits_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          file_url: string
          id: string
          invoice_date: string
          invoice_number: string
          maintenance_record_id: string
          notes: string | null
          updated_at: string
          workshop_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          file_url: string
          id?: string
          invoice_date: string
          invoice_number: string
          maintenance_record_id: string
          notes?: string | null
          updated_at?: string
          workshop_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          file_url?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          maintenance_record_id?: string
          notes?: string | null
          updated_at?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_invoices_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_invoices_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_items: {
        Row: {
          id: string
          item_name: string
          maintenance_record_id: string
          qty: number
          unit_cost: number
        }
        Insert: {
          id?: string
          item_name: string
          maintenance_record_id: string
          qty?: number
          unit_cost?: number
        }
        Update: {
          id?: string
          item_name?: string
          maintenance_record_id?: string
          qty?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_items_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          cancel_reason: string | null
          category: string
          completed_date: string | null
          contract_id: string | null
          cost: number
          created_at: string
          created_by: string | null
          description: string | null
          forced_by: string | null
          forced_reason: string | null
          id: string
          invoice_pending: boolean
          maintenance_type: string
          mechanic_notes: string | null
          next_service_odometer: number | null
          notes: string | null
          odometer: number | null
          scheduled_date: string
          started_at: string | null
          status: Database["public"]["Enums"]["maintenance_status"]
          subtype: string | null
          updated_at: string
          vehicle_id: string
          workshop_id: string | null
          workshop_name: string | null
        }
        Insert: {
          cancel_reason?: string | null
          category?: string
          completed_date?: string | null
          contract_id?: string | null
          cost?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          forced_by?: string | null
          forced_reason?: string | null
          id?: string
          invoice_pending?: boolean
          maintenance_type?: string
          mechanic_notes?: string | null
          next_service_odometer?: number | null
          notes?: string | null
          odometer?: number | null
          scheduled_date: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          subtype?: string | null
          updated_at?: string
          vehicle_id: string
          workshop_id?: string | null
          workshop_name?: string | null
        }
        Update: {
          cancel_reason?: string | null
          category?: string
          completed_date?: string | null
          contract_id?: string | null
          cost?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          forced_by?: string | null
          forced_reason?: string | null
          id?: string
          invoice_pending?: boolean
          maintenance_type?: string
          mechanic_notes?: string | null
          next_service_odometer?: number | null
          notes?: string | null
          odometer?: number | null
          scheduled_date?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          subtype?: string | null
          updated_at?: string
          vehicle_id?: string
          workshop_id?: string | null
          workshop_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_bi_hari_pakai"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "maintenance_records_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_bi_pendapatan"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_internal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_settings: {
        Row: {
          id: boolean
          oil_interval_km: number
          oil_warning_km: number
          tire_interval_km: number
          tire_warning_km: number
          updated_at: string
        }
        Insert: {
          id?: boolean
          oil_interval_km?: number
          oil_warning_km?: number
          tire_interval_km?: number
          tire_warning_km?: number
          updated_at?: string
        }
        Update: {
          id?: boolean
          oil_interval_km?: number
          oil_warning_km?: number
          tire_interval_km?: number
          tire_warning_km?: number
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel_email: boolean
          channel_inapp: boolean
          reminder_days_before: number
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_email?: boolean
          channel_inapp?: boolean
          reminder_days_before?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_email?: boolean
          channel_inapp?: boolean
          reminder_days_before?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          dedupe_key: string | null
          id: string
          is_read: boolean
          link_url: string | null
          message: string
          priority: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          message: string
          priority?: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          priority?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      outstanding_payments: {
        Row: {
          amount_due: number
          amount_paid: number
          contract_id: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          last_reminder_at: string | null
          renter_id: string
          status: Database["public"]["Enums"]["outstanding_status"]
          updated_at: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          contract_id?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          last_reminder_at?: string | null
          renter_id: string
          status?: Database["public"]["Enums"]["outstanding_status"]
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          contract_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          last_reminder_at?: string | null
          renter_id?: string
          status?: Database["public"]["Enums"]["outstanding_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outstanding_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outstanding_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_bi_hari_pakai"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "outstanding_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_bi_pendapatan"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "outstanding_payments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          allocated_amount: number
          allocation_date: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          outstanding_payment_id: string
          payment_id: string
          reversal_of: string | null
          reversed_at: string | null
        }
        Insert: {
          allocated_amount: number
          allocation_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          outstanding_payment_id: string
          payment_id: string
          reversal_of?: string | null
          reversed_at?: string | null
        }
        Update: {
          allocated_amount?: number
          allocation_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          outstanding_payment_id?: string
          payment_id?: string
          reversal_of?: string | null
          reversed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_outstanding_payment_id_fkey"
            columns: ["outstanding_payment_id"]
            isOneToOne: false
            referencedRelation: "outstanding_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_outstanding_payment_id_fkey"
            columns: ["outstanding_payment_id"]
            isOneToOne: false
            referencedRelation: "v_bi_umur_piutang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "v_bi_pendapatan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "payment_allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          created_by: string | null
          id: string
          invoice_number: string
          method: string
          notes: string | null
          payment_category: string
          payment_date: string
          payment_source: Database["public"]["Enums"]["payment_source"]
          proof_url: string | null
          receipt_number: string | null
          reference_number: string | null
          rejection_reason: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string
          method?: string
          notes?: string | null
          payment_category?: string
          payment_date?: string
          payment_source?: Database["public"]["Enums"]["payment_source"]
          proof_url?: string | null
          receipt_number?: string | null
          reference_number?: string | null
          rejection_reason?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string
          method?: string
          notes?: string | null
          payment_category?: string
          payment_date?: string
          payment_source?: Database["public"]["Enums"]["payment_source"]
          proof_url?: string | null
          receipt_number?: string | null
          reference_number?: string | null
          rejection_reason?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_bi_hari_pakai"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_bi_pendapatan"
            referencedColumns: ["contract_id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      renter_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string
          renter_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          renter_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          renter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renter_notes_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
        ]
      }
      renters: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          driving_license_expiry: string | null
          driving_license_number: string | null
          driving_license_url: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          id: string
          id_card_number: string | null
          id_card_url: string | null
          is_active: boolean
          notes: string | null
          occupation: string | null
          phone: string
          updated_at: string
          user_id: string | null
          verification_reason: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          driving_license_expiry?: string | null
          driving_license_number?: string | null
          driving_license_url?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          id?: string
          id_card_number?: string | null
          id_card_url?: string | null
          is_active?: boolean
          notes?: string | null
          occupation?: string | null
          phone?: string
          updated_at?: string
          user_id?: string | null
          verification_reason?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          driving_license_expiry?: string | null
          driving_license_number?: string | null
          driving_license_url?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          id?: string
          id_card_number?: string | null
          id_card_url?: string | null
          is_active?: boolean
          notes?: string | null
          occupation?: string | null
          phone?: string
          updated_at?: string
          user_id?: string | null
          verification_reason?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_documents: {
        Row: {
          created_at: string
          doc_type: string
          expiry_date: string | null
          file_url: string
          id: string
          notes: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          expiry_date?: string | null
          file_url: string
          id?: string
          notes?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          expiry_date?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_internal"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_odometer_readings: {
        Row: {
          id: string
          notes: string | null
          odometer: number
          recorded_at: string
          recorded_by: string | null
          source: string
          vehicle_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          odometer: number
          recorded_at?: string
          recorded_by?: string | null
          source?: string
          vehicle_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          odometer?: number
          recorded_at?: string
          recorded_by?: string | null
          source?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_odometer_readings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_odometer_readings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_internal"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          is_primary: boolean
          photo_url: string
          sort_order: number
          vehicle_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          photo_url: string
          sort_order?: number
          vehicle_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          photo_url?: string
          sort_order?: number
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_photos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_photos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_internal"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_status: Database["public"]["Enums"]["vehicle_status"]
          notes: string | null
          odometer: number | null
          previous_status: Database["public"]["Enums"]["vehicle_status"] | null
          vehicle_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["vehicle_status"]
          notes?: string | null
          odometer?: number | null
          previous_status?: Database["public"]["Enums"]["vehicle_status"] | null
          vehicle_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["vehicle_status"]
          notes?: string | null
          odometer?: number | null
          previous_status?: Database["public"]["Enums"]["vehicle_status"] | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_status_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_status_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_internal"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          category: string
          chassis_number: string | null
          color: string
          created_at: string
          current_odometer: number
          daily_rate: number
          deposit_amount: number
          engine_number: string | null
          fuel_type: string
          id: string
          insurance_expiry: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          last_oil_service_odometer: number | null
          last_tire_service_odometer: number | null
          model: string
          monthly_rate: number | null
          notes: string | null
          plate_number: string
          purchase_date: string | null
          purchase_price: number | null
          seat_capacity: number
          status: Database["public"]["Enums"]["vehicle_status"]
          stnk_expiry: string | null
          tax_due_date: string | null
          transmission: string
          updated_at: string
          variant: string | null
          weekly_rate: number | null
          year: number
        }
        Insert: {
          brand: string
          category?: string
          chassis_number?: string | null
          color?: string
          created_at?: string
          current_odometer?: number
          daily_rate?: number
          deposit_amount?: number
          engine_number?: string | null
          fuel_type?: string
          id?: string
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_oil_service_odometer?: number | null
          last_tire_service_odometer?: number | null
          model: string
          monthly_rate?: number | null
          notes?: string | null
          plate_number: string
          purchase_date?: string | null
          purchase_price?: number | null
          seat_capacity?: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          stnk_expiry?: string | null
          tax_due_date?: string | null
          transmission?: string
          updated_at?: string
          variant?: string | null
          weekly_rate?: number | null
          year: number
        }
        Update: {
          brand?: string
          category?: string
          chassis_number?: string | null
          color?: string
          created_at?: string
          current_odometer?: number
          daily_rate?: number
          deposit_amount?: number
          engine_number?: string | null
          fuel_type?: string
          id?: string
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_oil_service_odometer?: number | null
          last_tire_service_odometer?: number | null
          model?: string
          monthly_rate?: number | null
          notes?: string | null
          plate_number?: string
          purchase_date?: string | null
          purchase_price?: number | null
          seat_capacity?: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          stnk_expiry?: string | null
          tax_due_date?: string | null
          transmission?: string
          updated_at?: string
          variant?: string | null
          weekly_rate?: number | null
          year?: number
        }
        Relationships: []
      }
      workshops: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          specialization: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          specialization?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_bi_biaya_perawatan_bulanan: {
        Row: {
          bulan: string | null
          category: string | null
          jumlah: number | null
          total: number | null
          vehicle_id: string | null
          workshop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_internal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bi_hari_pakai: {
        Row: {
          contract_id: string | null
          hari: string | null
          renter_id: string | null
          vehicle_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_internal"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bi_pendapatan: {
        Row: {
          amount: number | null
          brand: string | null
          contract_id: string | null
          created_at: string | null
          id: string | null
          method: string | null
          model: string | null
          payment_category: string | null
          payment_date: string | null
          payment_source: Database["public"]["Enums"]["payment_source"] | null
          plate_number: string | null
          rental_type: Database["public"]["Enums"]["rental_type"] | null
          renter_id: string | null
          vehicle_category: string | null
          vehicle_id: string | null
          verified_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles_internal"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bi_umur_piutang: {
        Row: {
          contract_id: string | null
          description: string | null
          due_date: string | null
          id: string | null
          kelompok: string | null
          renter_id: string | null
          sisa: number | null
          umur_hari: number | null
        }
        Insert: {
          contract_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          kelompok?: never
          renter_id?: string | null
          sisa?: never
          umur_hari?: never
        }
        Update: {
          contract_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          kelompok?: never
          renter_id?: string | null
          sisa?: never
          umur_hari?: never
        }
        Relationships: [
          {
            foreignKeyName: "outstanding_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outstanding_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_bi_hari_pakai"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "outstanding_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_bi_pendapatan"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "outstanding_payments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles_internal: {
        Row: {
          brand: string | null
          category: string | null
          chassis_number: string | null
          color: string | null
          created_at: string | null
          current_odometer: number | null
          daily_rate: number | null
          deposit_amount: number | null
          engine_number: string | null
          fuel_type: string | null
          id: string | null
          insurance_expiry: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          last_oil_service_odometer: number | null
          last_tire_service_odometer: number | null
          model: string | null
          monthly_rate: number | null
          notes: string | null
          plate_number: string | null
          purchase_date: string | null
          purchase_price: number | null
          seat_capacity: number | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          stnk_expiry: string | null
          tax_due_date: string | null
          transmission: string | null
          updated_at: string | null
          variant: string | null
          weekly_rate: number | null
          year: number | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          chassis_number?: string | null
          color?: string | null
          created_at?: string | null
          current_odometer?: number | null
          daily_rate?: number | null
          deposit_amount?: number | null
          engine_number?: string | null
          fuel_type?: string | null
          id?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_oil_service_odometer?: number | null
          last_tire_service_odometer?: number | null
          model?: string | null
          monthly_rate?: number | null
          notes?: string | null
          plate_number?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          seat_capacity?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          stnk_expiry?: string | null
          tax_due_date?: string | null
          transmission?: string | null
          updated_at?: string | null
          variant?: string | null
          weekly_rate?: number | null
          year?: number | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          chassis_number?: string | null
          color?: string | null
          created_at?: string | null
          current_odometer?: number | null
          daily_rate?: number | null
          deposit_amount?: number | null
          engine_number?: string | null
          fuel_type?: string | null
          id?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_oil_service_odometer?: number | null
          last_tire_service_odometer?: number | null
          model?: string | null
          monthly_rate?: number | null
          notes?: string | null
          plate_number?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          seat_capacity?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          stnk_expiry?: string | null
          tax_due_date?: string | null
          transmission?: string | null
          updated_at?: string | null
          variant?: string | null
          weekly_rate?: number | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_deposit_damage_deduction: {
        Args: {
          _amount: number
          _deposit_id: string
          _description: string
          _invoice_date: string
          _invoice_number: string
          _reason: string
          _workshop_invoice_url: string
          _workshop_name: string
        }
        Returns: Json
      }
      bi_customer_analytics: {
        Args: { _dari: string; _sampai: string }
        Returns: Json
      }
      bi_executive_summary: { Args: never; Returns: Json }
      bi_finance_analytics: {
        Args: { _dari: string; _sampai: string }
        Returns: Json
      }
      bi_fleet_analytics: {
        Args: { _dari: string; _sampai: string }
        Returns: Json
      }
      bi_guard_owner: { Args: never; Returns: undefined }
      bi_maintenance_analytics: {
        Args: { _dari: string; _sampai: string }
        Returns: Json
      }
      bi_owner_insights: { Args: never; Returns: Json }
      bi_revenue_analytics: {
        Args: { _dari: string; _sampai: string }
        Returns: Json
      }
      check_renter_eligibility: {
        Args: { _end: string; _renter_id: string; _start: string }
        Returns: Json
      }
      complete_maintenance: {
        Args: {
          _completed_date: string
          _cost: number
          _id: string
          _invoice_pending?: boolean
          _mechanic_notes?: string
          _odometer: number
        }
        Returns: undefined
      }
      contract_billing_summary: {
        Args: { _contract_id: string }
        Returns: Json
      }
      current_role_name: { Args: never; Returns: string }
      deposit_settlement_preview: {
        Args: { _deposit_id: string }
        Returns: Json
      }
      fleet_health_summary: { Args: never; Returns: Json }
      fleet_maintenance_due: {
        Args: never
        Returns: {
          brand: string
          current_odometer: number
          model: string
          oil_remaining: number
          oil_target: number
          oil_urgency: string
          plate_number: string
          status: Database["public"]["Enums"]["vehicle_status"]
          tire_remaining: number
          tire_target: number
          tire_urgency: string
          vehicle_id: string
        }[]
      }
      format_rupiah_id: { Args: { _n: number }; Returns: string }
      format_tanggal_id: { Args: { _d: string }; Returns: string }
      generate_contract_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_receipt_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      jalankan_pemeriksaan_harian_sistem: { Args: never; Returns: Json }
      kirim_pengingat_tunggakan: {
        Args: { _outstanding_id: string }
        Returns: undefined
      }
      log_report_export: {
        Args: {
          _filter?: Json
          _periode: string
          _report: string
          _rows?: number
        }
        Returns: undefined
      }
      log_report_view: {
        Args: { _periode: string; _report: string }
        Returns: undefined
      }
      maintenance_cost_report: {
        Args: { _dari: string; _sampai: string }
        Returns: Json
      }
      mark_overdue_contracts: { Args: never; Returns: number }
      my_rental_maintenance_notice: { Args: never; Returns: Json }
      owns_contract: { Args: { _contract_id: string }; Returns: boolean }
      owns_deposit: { Args: { _deposit_id: string }; Returns: boolean }
      owns_renter: { Args: { _renter_id: string }; Returns: boolean }
      periksa_kontrak_harian: { Args: never; Returns: Json }
      periksa_perawatan_harian: { Args: never; Returns: Json }
      periksa_tunggakan_harian: { Args: never; Returns: Json }
      promote_renter_to_admin: { Args: { _target: string }; Returns: Json }
      recalc_deposit_status: {
        Args: { _deposit_id: string }
        Returns: undefined
      }
      record_vehicle_odometer: {
        Args: {
          _notes?: string
          _odometer: number
          _source?: string
          _vehicle_id: string
        }
        Returns: undefined
      }
      workshop_performance: {
        Args: never
        Returns: {
          kunjungan: number
          name: string
          rata_biaya: number
          rata_hari: number
          total_biaya: number
          workshop_id: string
        }[]
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "renter"
      contract_status:
        | "draft"
        | "aktif"
        | "terlambat"
        | "selesai"
        | "dibatalkan"
      deposit_status:
        | "diterima"
        | "ditahan"
        | "sebagian_dikembalikan"
        | "dikembalikan"
        | "disita"
        | "menunggu_penerimaan"
        | "dibatalkan"
      maintenance_status:
        | "dijadwalkan"
        | "dikerjakan"
        | "selesai"
        | "dibatalkan"
      outstanding_status: "belum_lunas" | "sebagian" | "lunas"
      payment_source:
        | "admin_manual"
        | "owner_manual"
        | "renter_portal"
        | "outstanding_settlement"
        | "refund"
        | "adjustment"
      payment_status: "menunggu_verifikasi" | "lunas" | "ditolak"
      rental_type: "harian" | "mingguan" | "bulanan"
      vehicle_status: "tersedia" | "disewa" | "perawatan" | "tidak_aktif"
      verification_status: "belum_diverifikasi" | "terverifikasi" | "ditolak"
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
  public: {
    Enums: {
      app_role: ["owner", "admin", "renter"],
      contract_status: ["draft", "aktif", "terlambat", "selesai", "dibatalkan"],
      deposit_status: [
        "diterima",
        "ditahan",
        "sebagian_dikembalikan",
        "dikembalikan",
        "disita",
        "menunggu_penerimaan",
        "dibatalkan",
      ],
      maintenance_status: [
        "dijadwalkan",
        "dikerjakan",
        "selesai",
        "dibatalkan",
      ],
      outstanding_status: ["belum_lunas", "sebagian", "lunas"],
      payment_source: [
        "admin_manual",
        "owner_manual",
        "renter_portal",
        "outstanding_settlement",
        "refund",
        "adjustment",
      ],
      payment_status: ["menunggu_verifikasi", "lunas", "ditolak"],
      rental_type: ["harian", "mingguan", "bulanan"],
      vehicle_status: ["tersedia", "disewa", "perawatan", "tidak_aktif"],
      verification_status: ["belum_diverifikasi", "terverifikasi", "ditolak"],
    },
  },
} as const
