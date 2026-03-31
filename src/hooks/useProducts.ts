import { useState, useEffect, useCallback } from 'react';
import { supabaseERP, type Product, type Category } from '@/lib/supabase';

export function useProducts(filters?: {
  category?: string;
  search?: string;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let query = supabaseERP
      .from('products')
      .select('*')
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false });

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (!error && data) {
      setProducts(data as Product[]);
    }
    setLoading(false);
  }, [filters?.category, filters?.search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, refetch: fetchProducts };
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabaseERP
        .from('categories')
        .select('*')
        .order('name');
      if (data) setCategories(data as Category[]);
    };
    fetch();
  }, []);

  return categories;
}

export function useProduct(id: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabaseERP
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      setProduct(data as Product | null);
      setLoading(false);
    };
    fetch();
  }, [id]);

  return { product, loading };
}
