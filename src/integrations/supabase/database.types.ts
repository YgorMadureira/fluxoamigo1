export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          gemini_api_key: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          gemini_api_key?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          gemini_api_key?: string | null
        }
      }

      profiles: {
        Row: {
          id: string
          company_id: string
          full_name: string | null
          role: string
          created_at: string
        }
        Insert: {
          id: string
          company_id: string
          full_name?: string | null
          role?: string
          created_at?: string
        }
        Update: {
          company_id?: string
          full_name?: string | null
          role?: string
        }
      }
      shop_configs: {
        Row: {
          id: string
          company_id: string
          partner_id: string | null
          partner_key: string | null
          shop_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          partner_id?: string | null
          partner_key?: string | null
          shop_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          partner_id?: string | null
          partner_key?: string | null
          shop_id?: string | null
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          company_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          created_at?: string
        }
        Update: {
          name?: string
        }
      }
      products: {
        Row: {
          id: string
          company_id: string
          name: string
          sku: string | null
          unit_price: number
          cost_price: number
          stock_quantity: number
          min_stock: number
          category: string | null
          category_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          sku?: string | null
          unit_price?: number
          cost_price?: number
          stock_quantity?: number
          min_stock?: number
          category?: string | null
          category_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          sku?: string | null
          unit_price?: number
          cost_price?: number
          stock_quantity?: number
          min_stock?: number
          category?: string | null
          category_id?: string | null
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          user_id: string | null
          company_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
          total_amount: number
          sale_date: string
          source: string
          shopee_order_id: string | null
          status: string
          notes: string | null
          seller_name: string | null
          category_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          company_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price: number
          total_amount: number
          sale_date?: string
          source?: string
          shopee_order_id?: string | null
          status?: string
          notes?: string | null
          seller_name?: string | null
          category_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
          total_amount?: number
          sale_date?: string
          source?: string
          shopee_order_id?: string | null
          status?: string
          notes?: string | null
          seller_name?: string | null
          category_id?: string | null
          updated_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          user_id: string | null
          company_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_cost: number
          total_amount: number
          purchase_date: string
          supplier: string | null
          category: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          company_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_cost: number
          total_amount: number
          purchase_date?: string
          supplier?: string | null
          category?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_cost?: number
          total_amount?: number
          purchase_date?: string
          supplier?: string | null
          category?: string
          notes?: string | null
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          company_id: string
          name: string
          contact: string | null
          phone: string | null
          email: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          contact?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          contact?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
        }
      }
      inventory_logs: {
        Row: {
          id: string
          user_id: string | null
          product_id: string
          type: string
          quantity_change: number
          quantity_before: number
          quantity_after: number
          justification: string | null
          reference_id: string | null
          user_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          product_id: string
          type: string
          quantity_change: number
          quantity_before: number
          quantity_after: number
          justification?: string | null
          reference_id?: string | null
          user_name?: string | null
          created_at?: string
        }
        Update: {
          justification?: string | null
        }
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
  }
}
