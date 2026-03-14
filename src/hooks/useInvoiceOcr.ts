import { createWorker } from 'tesseract.js';

export interface OcrItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface OcrResult {
  supplier: string;
  invoice_date: string | null;
  invoice_number: string | null;
  total_note: number;
  items: OcrItem[];
  rawText: string;
}

// ---- helpers ----

function cleanPrice(s: string): number {
  // Handle Brazilian format: 1.234,56 → 1234.56
  const normalized = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
}

function extractDate(text: string): string | null {
  // DD/MM/YYYY or DD-MM-YYYY
  const m = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function extractSupplier(lines: string[]): string {
  // First non-empty line that looks like a business name (heuristic)
  const skipWords = ['cnpj', 'cpf', 'nf-e', 'nota', 'cupom', 'fiscal', 'sat', 'danfe', 'mfe'];
  for (const line of lines.slice(0, 10)) {
    const clean = line.trim();
    if (clean.length < 4) continue;
    const lower = clean.toLowerCase();
    if (skipWords.some(w => lower.startsWith(w))) continue;
    if (/^\d+$/.test(clean)) continue; // skip pure numbers
    return clean;
  }
  return 'Fornecedor não identificado';
}

function extractTotal(text: string): number {
  // Look for "total" keyword followed by a value
  const patterns = [
    /total\s+(?:geral|a\s+pagar|líquido|nota)?\s*[:\s]+([R$\s]*[\d.,]+)/i,
    /valor\s+total[:\s]+([R$\s]*[\d.,]+)/i,
    /total[:\s]+([R$\s]*[\d.,]+)/i,
    /(?:^|\s)r\$\s*([\d.,]+)\s*$/im,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const v = cleanPrice(m[1].replace(/[R$\s]/g, ''));
      if (v > 0) return v;
    }
  }
  return 0;
}

function extractItems(lines: string[]): OcrItem[] {
  const items: OcrItem[] = [];

  // Pattern: description  qty  unit_price  total
  // Many NF-e formats: "DESCRICAO  2  UN  12,90  25,80"
  const linePattern = /^(.{3,40?})\s+(\d{1,3}(?:[.,]\d+)?)\s+(?:UN|KG|PC|CX|LT|ML|GR|G\s)?\s*([\d.,]+)\s+([\d.,]+)\s*$/i;
  // Simpler: description  value
  const simplePattern = /^(.{3,40})\s+([\d.,]+)\s*$/;

  for (const line of lines) {
    const t = line.trim();
    if (t.length < 5) continue;

    const m = t.match(linePattern);
    if (m) {
      const desc = m[1].trim();
      const qty = parseFloat(m[2].replace(',', '.')) || 1;
      const unitP = cleanPrice(m[3]);
      const totalP = cleanPrice(m[4]);
      if (unitP > 0 && desc.length >= 3) {
        items.push({ description: desc, quantity: qty, unit_price: unitP, total_price: totalP || qty * unitP });
        continue;
      }
    }

    // Try simple format
    const sm = t.match(simplePattern);
    if (sm) {
      const desc = sm[1].trim();
      const val = cleanPrice(sm[2]);
      const lower = desc.toLowerCase();
      // Skip header/footer lines
      if (val > 0 && val < 99999 && desc.length >= 3 &&
        !lower.includes('total') && !lower.includes('troco') &&
        !lower.includes('dinheiro') && !lower.includes('cartao') &&
        !lower.includes('cnpj') && !lower.includes('cpf') &&
        !lower.includes('subtotal') && !lower.includes('desconto') &&
        !lower.includes('acrescimo') && !/^\d+$/.test(desc)) {
        items.push({ description: desc, quantity: 1, unit_price: val, total_price: val });
      }
    }
  }

  return items;
}

export async function runOcr(
  file: File,
  onProgress?: (pct: number, status: string) => void
): Promise<OcrResult> {
  const worker = await createWorker('por', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100), 'Reconhecendo texto...');
      } else if (onProgress) {
        const statusMap: Record<string, string> = {
          'loading tesseract core': 'Carregando motor OCR...',
          'loading language traineddata': 'Carregando idioma português...',
          'initializing api': 'Inicializando...',
        };
        onProgress(0, statusMap[m.status] ?? m.status);
      }
    },
  });

  try {
    const { data } = await worker.recognize(file);
    const rawText = data.text;
    const lines = rawText.split('\n').filter(l => l.trim().length > 0);

    const result: OcrResult = {
      supplier: extractSupplier(lines),
      invoice_date: extractDate(rawText),
      invoice_number: null,
      total_note: extractTotal(rawText),
      items: extractItems(lines),
      rawText,
    };

    // Try to extract NF number
    const nfMatch = rawText.match(/n[uú]mero\s*[:\s]*(\d+)/i) || rawText.match(/n[°o\.]?\s*(\d{3,})/i);
    if (nfMatch) result.invoice_number = nfMatch[1];

    return result;
  } finally {
    await worker.terminate();
  }
}
