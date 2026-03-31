import { supabaseERP } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';
import type { CartItem } from '@/hooks/useCart';

const COMPANY_ID = 'default';

export type OrderData = {
  items: CartItem[];
  customerName: string;
  customerEmail: string;
  customerCep: string;
  shippingCost: number;
  customerId: string;
  shippingAddress: {
    cep: string;
    address: string;
    number: string;
    complement: string;
    city: string;
    state: string;
  };
};

export async function createOrder(order: OrderData) {
  const errors: string[] = [];
  const subtotal = order.items.reduce((sum, i) => sum + i.product.unit_price * i.quantity, 0);
  const total = subtotal + order.shippingCost;

  // 1. Create order in Cloud database
  const orderItems = order.items.map((i) => ({
    product_id: i.product.id,
    name: i.product.name,
    quantity: i.quantity,
    unit_price: i.product.unit_price,
    image_url: i.product.image_url || i.product.images?.[0] || null,
  }));

  const { error: orderError } = await supabase.from('orders').insert({
    customer_id: order.customerId,
    company_id: COMPANY_ID,
    items: orderItems,
    subtotal,
    shipping_cost: order.shippingCost,
    total,
    status: 'pending',
    shipping_address: order.shippingAddress,
  });

  if (orderError) {
    return { success: false, errors: ['Erro ao criar pedido: ' + orderError.message] };
  }

  // 2. Process ERP operations (stock, sales, logs)
  for (const item of order.items) {
    const { data: product, error: fetchErr } = await supabaseERP
      .from('products')
      .select('stock_quantity')
      .eq('id', item.product.id)
      .single();

    if (fetchErr || !product) {
      errors.push(`Produto ${item.product.name} não encontrado`);
      continue;
    }

    if (product.stock_quantity < item.quantity) {
      errors.push(`Estoque insuficiente para ${item.product.name} (disponível: ${product.stock_quantity})`);
      continue;
    }

    const quantityBefore = product.stock_quantity;
    const quantityAfter = quantityBefore - item.quantity;

    const { error: saleErr } = await supabaseERP.from('sales').insert({
      company_id: COMPANY_ID,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.unit_price,
      total_amount: item.product.unit_price * item.quantity,
      sale_date: new Date().toISOString(),
      status: 'pending',
      source: 'website',
    });

    if (saleErr) {
      errors.push(`Erro ao registrar venda de ${item.product.name}: ${saleErr.message}`);
      continue;
    }

    const { error: stockErr } = await supabaseERP
      .from('products')
      .update({ stock_quantity: quantityAfter })
      .eq('id', item.product.id);

    if (stockErr) {
      errors.push(`Erro ao atualizar estoque de ${item.product.name}: ${stockErr.message}`);
    }

    const { error: logErr } = await supabaseERP.from('inventory_logs').insert({
      company_id: COMPANY_ID,
      product_id: item.product.id,
      type: 'sale',
      quantity_change: -item.quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      justification: `Venda via website`,
    });

    if (logErr) {
      errors.push(`Erro ao registrar log de ${item.product.name}: ${logErr.message}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, errors: [] };
}
