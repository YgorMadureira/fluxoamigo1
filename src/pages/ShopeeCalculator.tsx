import { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { calcShopeeCommission, calcNetProfit, getShopeeCommissionTier } from '@/lib/shopeeCommission';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calculator,
  ShoppingBag,
  Store,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  ArrowRight
} from 'lucide-react';

export default function ShopeeCalculator() {
  const [costPrice, setCostPrice] = useState<string>('');
  const [salePrice, setSalePrice] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const cost = parseFloat(costPrice.replace(',', '.')) || 0;
  const sale = parseFloat(salePrice.replace(',', '.')) || 0;
  const qty = quantity > 0 ? quantity : 1;

  const directProfit = calcNetProfit(sale, cost, qty, 'manual');
  const shopeeProfit = calcNetProfit(sale, cost, qty, 'shopee');
  const shopeeComm = calcShopeeCommission(sale, qty);
  const tierInfo = getShopeeCommissionTier(sale);

  const diff = directProfit.netProfit - shopeeProfit.netProfit;

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Animation variants
  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  const itemVars = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-md">
            <Calculator className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Calculadora de Lucro Shopee</h1>
            <p className="text-muted-foreground text-sm">Compare o lucro da venda direta com a venda na Shopee.</p>
          </div>
        </motion.div>

        <motion.section
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Input Form */}
          <motion.div variants={itemVars} className="bg-card border border-border rounded-xl shadow-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="costPrice" className="text-muted-foreground font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Preço de Custo (R$)
                </Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="h-11 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salePrice" className="text-muted-foreground font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Preço de Venda (R$)
                </Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="h-11 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-muted-foreground font-medium flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Quantidade
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="h-11 text-lg"
                />
              </div>
            </div>
          </motion.div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Direct Sale Card */}
            <motion.div variants={itemVars} className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
                <Store className="w-5 h-5 text-success" />
                <h2 className="font-display font-semibold text-foreground text-lg">Venda Direta</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Receita Total</span>
                  <span className="font-medium text-foreground">{formatBRL(directProfit.revenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Custo do Produto</span>
                  <span className="font-medium text-danger">-{formatBRL(directProfit.productCost)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground font-medium">Lucro Líquido</span>
                  <span className={`text-xl font-bold ${directProfit.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatBRL(directProfit.netProfit)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Margem de Lucro</span>
                  <Badge variant="outline" className={directProfit.margin >= 0 ? 'text-success border-success/30 bg-success/10' : 'text-danger border-danger/30 bg-danger/10'}>
                    {directProfit.margin >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {directProfit.margin.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            </motion.div>

            {/* Shopee Sale Card */}
            <motion.div variants={itemVars} className="bg-card border border-border rounded-xl shadow-card overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-warning"></div>
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
                <ShoppingBag className="w-5 h-5 text-warning" />
                <h2 className="font-display font-semibold text-foreground text-lg">Venda Shopee</h2>
                <Badge variant="outline" className="ml-auto text-xs border-warning/30 text-warning bg-warning/10">
                  {tierInfo.label}
                </Badge>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Receita Total</span>
                  <span className="font-medium text-foreground">{formatBRL(shopeeProfit.revenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Custo do Produto</span>
                  <span className="font-medium text-danger">-{formatBRL(shopeeProfit.productCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Comissão <span className="text-xs">({(tierInfo.percent * 100).toFixed(0)}%)</span>
                  </span>
                  <span className="font-medium text-warning">-{formatBRL(shopeeComm.percentCommission)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Taxa Fixa (Frete)</span>
                  <span className="font-medium text-warning">-{formatBRL(shopeeComm.fixedFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground font-medium">Lucro Líquido</span>
                  <span className={`text-xl font-bold ${shopeeProfit.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatBRL(shopeeProfit.netProfit)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Margem de Lucro</span>
                  <Badge variant="outline" className={shopeeProfit.margin >= 0 ? 'text-success border-success/30 bg-success/10' : 'text-danger border-danger/30 bg-danger/10'}>
                    {shopeeProfit.margin >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {shopeeProfit.margin.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Difference Summary */}
          {sale > 0 && (
            <motion.div variants={itemVars} className="bg-muted/30 border border-border rounded-xl p-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
               <div className="flex items-center justify-center w-12 h-12 rounded-full bg-warning/10 text-warning shrink-0">
                  <Percent className="w-6 h-6" />
               </div>
               <div>
                 <h3 className="text-lg font-semibold text-foreground">
                   Diferença de Lucro
                 </h3>
                 <p className="text-muted-foreground">
                   Vendendo pela Shopee, seu lucro é <span className="font-bold text-warning">{formatBRL(Math.max(0, diff))}</span> menor em comparação com a venda direta.
                 </p>
               </div>
            </motion.div>
          )}

          {/* Shopee Tiers Reference */}
          <motion.div variants={itemVars} className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
             <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
               <ArrowRight className="w-4 h-4 text-primary" />
               <h3 className="font-display font-semibold text-foreground">Tabela de Comissões Shopee (Referência)</h3>
             </div>
             <div className="p-4 overflow-x-auto">
               <table className="w-full text-sm text-left">
                 <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                   <tr>
                     <th className="px-4 py-3 rounded-tl-lg">Preço do Item</th>
                     <th className="px-4 py-3">Comissão (%)</th>
                     <th className="px-4 py-3 rounded-tr-lg">Taxa Fixa (R$)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-border">
                   <tr className="hover:bg-muted/30 transition-colors">
                     <td className="px-4 py-3 font-medium">Até R$ 79,99</td>
                     <td className="px-4 py-3">20%</td>
                     <td className="px-4 py-3">R$ 4,00</td>
                   </tr>
                   <tr className="hover:bg-muted/30 transition-colors">
                     <td className="px-4 py-3 font-medium">R$ 80 a R$ 99,99</td>
                     <td className="px-4 py-3">14%</td>
                     <td className="px-4 py-3">R$ 16,00</td>
                   </tr>
                   <tr className="hover:bg-muted/30 transition-colors">
                     <td className="px-4 py-3 font-medium">R$ 100 a R$ 199,99</td>
                     <td className="px-4 py-3">14%</td>
                     <td className="px-4 py-3">R$ 20,00</td>
                   </tr>
                   <tr className="hover:bg-muted/30 transition-colors">
                     <td className="px-4 py-3 font-medium">R$ 200 a R$ 499,99</td>
                     <td className="px-4 py-3">14%</td>
                     <td className="px-4 py-3">R$ 26,00</td>
                   </tr>
                   <tr className="hover:bg-muted/30 transition-colors">
                     <td className="px-4 py-3 font-medium">Acima de R$ 500</td>
                     <td className="px-4 py-3">14%</td>
                     <td className="px-4 py-3">R$ 26,00</td>
                   </tr>
                 </tbody>
               </table>
             </div>
          </motion.div>

        </motion.section>
      </div>
    </Layout>
  );
}
