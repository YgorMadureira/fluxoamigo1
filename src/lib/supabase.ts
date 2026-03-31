import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://esummsjofnchrsxcckwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdW1tc2pvZm5jaHJzeGNja3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzczNDgsImV4cCI6MjA5MDI1MzM0OH0.exq7vz-Igm_mSo9AsGcKgAW8l9SvaXGBYyWRkO0Q8E8';

export const supabaseERP = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Product = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  unit_price: number;
  stock_quantity: number;
  image_url: string | null;
  images: string[] | null;
  created_at: string;
  updated_at: string;
};

export type Sale = {
  id: string;
  company_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
  status: string;
  source: string;
  created_at: string;
};

export type InventoryLog = {
  id: string;
  company_id: string;
  product_id: string;
  type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  justification: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
};
