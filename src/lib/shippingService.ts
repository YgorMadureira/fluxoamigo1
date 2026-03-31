import { supabase } from '@/integrations/supabase/client';

export type ShippingOption = {
  carrier_name: string | null;
  price: number;
  delivery_days: number | null;
};

export async function calculateShipping(cep: string, totalWeight = 1): Promise<ShippingOption[]> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return [];

  const { data, error } = await supabase
    .from('shipping_rates')
    .select('*')
    .lte('cep_start', cleanCep)
    .gte('cep_end', cleanCep)
    .lte('weight_min', totalWeight)
    .gte('weight_max', totalWeight);

  if (error || !data) return [];

  return data.map((r) => ({
    carrier_name: r.carrier_name,
    price: r.price,
    delivery_days: r.delivery_days,
  }));
}
