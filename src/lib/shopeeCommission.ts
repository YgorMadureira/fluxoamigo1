/**
 * Shopee Commission Calculator
 *
 * Regras de comissão da Shopee (por pedido):
 * - Até R$ 79,99:       20% do valor do item + R$ 4,00 (frete)
 * - R$ 80 a R$ 99,99:   14% do valor do item + R$ 16,00
 * - R$ 100 a R$ 199,99: 14% do valor do item + R$ 20,00
 * - R$ 200 a R$ 499,99: 14% do valor do item + R$ 26,00
 * - Acima de R$ 500:    14% do valor do item + R$ 26,00
 *
 * A comissão percentual incide sobre o total do pedido (preço × qtd).
 * A taxa fixa (frete) é cobrada UMA VEZ por pedido.
 */

export interface ShopeeCommissionTier {
  percent: number;
  fixedFee: number;
  label: string;
}

/** Retorna a faixa de comissão com base no preço unitário do item. */
export function getShopeeCommissionTier(unitPrice: number): ShopeeCommissionTier {
  if (unitPrice <= 79.99) {
    return { percent: 0.20, fixedFee: 4.00, label: 'Até R$ 79,99 — 20% + R$ 4,00' };
  }
  if (unitPrice <= 99.99) {
    return { percent: 0.14, fixedFee: 16.00, label: 'R$ 80–99,99 — 14% + R$ 16,00' };
  }
  if (unitPrice <= 199.99) {
    return { percent: 0.14, fixedFee: 20.00, label: 'R$ 100–199,99 — 14% + R$ 20,00' };
  }
  if (unitPrice <= 499.99) {
    return { percent: 0.14, fixedFee: 26.00, label: 'R$ 200–499,99 — 14% + R$ 26,00' };
  }
  return { percent: 0.14, fixedFee: 26.00, label: 'Acima de R$ 500 — 14% + R$ 26,00' };
}

export interface ShopeeCommissionResult {
  tier: ShopeeCommissionTier;
  percentCommission: number;  // valor da comissão percentual (% × total)
  fixedFee: number;           // taxa fixa — 1× por pedido
  totalCommission: number;    // percentCommission + fixedFee
}

/**
 * Calcula a comissão da Shopee para um único item/linha.
 * @param unitPrice — preço unitário do item (define a faixa)
 * @param quantity — quantidade no pedido
 */
export function calcShopeeCommission(unitPrice: number, quantity: number): ShopeeCommissionResult {
  const tier = getShopeeCommissionTier(unitPrice);
  const totalValue = unitPrice * quantity;
  const percentCommission = totalValue * tier.percent;
  const fixedFee = tier.fixedFee * quantity;
  return {
    tier,
    percentCommission,
    fixedFee,
    totalCommission: percentCommission + fixedFee,
  };
}

export interface OrderItemInput {
  unitPrice: number;
  costPrice: number;
  quantity: number;
}

export interface ProfitResult {
  revenue: number;
  productCost: number;
  shopeeCommission: number;
  shopeePercent: number;
  shopeeFixedFee: number;
  netProfit: number;
  margin: number; // margem líquida em %
}

/**
 * Calcula o lucro líquido de uma venda simples de 1 produto.
 */
export function calcNetProfit(
  unitPrice: number,
  costPrice: number,
  quantity: number,
  source: string,
): ProfitResult {
  return calcOrderNetProfit([{ unitPrice, costPrice, quantity }], source);
}

/**
 * Calcula o lucro líquido de um PEDIDO COMPLETO (com 1 ou múltiplos itens).
 * A comissão da Shopee e a taxa fixa/frete por unidade são calculadas por item.
 */
export function calcOrderNetProfit(
  items: OrderItemInput[],
  source: string,
): ProfitResult {
  let revenue = 0;
  let productCost = 0;
  let shopeePercent = 0;
  let shopeeFixedFee = 0;

  for (const item of items) {
    const itemRevenue = item.unitPrice * item.quantity;
    revenue += itemRevenue;
    productCost += item.costPrice * item.quantity;

    if (source === 'shopee') {
      const tier = getShopeeCommissionTier(item.unitPrice);
      shopeePercent += itemRevenue * tier.percent;
      shopeeFixedFee += tier.fixedFee * item.quantity;
    }
  }

  const shopeeCommission = shopeePercent + shopeeFixedFee;
  const netProfit = revenue - productCost - shopeeCommission;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return { revenue, productCost, shopeeCommission, shopeePercent, shopeeFixedFee, netProfit, margin };
}
