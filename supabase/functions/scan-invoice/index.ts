// v6 - uses getUser(token) explicitly for auth validation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Initialize Supabase admin client (service role)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate JWT by passing token explicitly to getUser
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Fetch user's company_id from profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the gemini_api_key from companies table
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("gemini_api_key")
      .eq("id", profile.company_id)
      .single();

    if (companyError || !company?.gemini_api_key) {
      return new Response(
        JSON.stringify({
          error: "Chave da API Gemini não configurada. Acesse Configurações > Inteligência Artificial e salve sua chave.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const GEMINI_API_KEY = company.gemini_api_key;

    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Imagem não fornecida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Você é um assistente de entrada de estoque. Analise esta imagem de nota fiscal/cupom e retorne APENAS um JSON válido, sem markdown, sem explicações adicionais, exatamente neste formato:
{
  "fornecedor_nome": "Nome do Fornecedor ou Estabelecimento",
  "data_emissao": "YYYY-MM-DD ou null",
  "valor_total_nota": 0.00,
  "numero_nota": "número ou null",
  "itens": [
    {
      "descricao": "Nome do produto/item",
      "quantidade": 1,
      "valor_unitario": 0.00
    }
  ]
}

REGRAS:
- Extraia TODOS os itens listados na nota
- Use ponto como separador decimal
- Se o fornecedor não estiver claro, use "Fornecedor Desconhecido"
- Para datas converta para YYYY-MM-DD
- valor_total_nota é o valor total da nota (pode incluir frete, descontos etc.)
- Não adicione comentários ou texto fora do JSON`;

    // Call Gemini 1.5 Pro via REST API (Standard and safe tier)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType || "image/jpeg",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errText);

      if (geminiResponse.status === 400 && errText.includes("API_KEY_INVALID")) {
        return new Response(
          JSON.stringify({ error: "Chave da API Gemini inválida. Verifique em Configurações > Inteligência Artificial." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições do Gemini atingido. Aguarde um momento e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Erro na API Gemini: ${geminiResponse.status} - ${errText}`);
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("Resposta vazia do Gemini");
    }

    // Clean potential markdown wrappers
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Não foi possível extrair JSON da resposta do Gemini");
      }
    }

    // Normalize response to consistent format
    const normalized = {
      supplier: parsed.fornecedor_nome || parsed.supplier || "Fornecedor Desconhecido",
      invoice_date: parsed.data_emissao || parsed.invoice_date || null,
      invoice_number: parsed.numero_nota || parsed.invoice_number || null,
      total_note: Number(parsed.valor_total_nota ?? parsed.total_note ?? 0),
      items: (parsed.itens || parsed.items || []).map((item: Record<string, unknown>) => ({
        description: String(item.descricao || item.description || ""),
        quantity: Number(item.quantidade || item.quantity || 1),
        unit_price: Number(item.valor_unitario || item.unit_price || 0),
        total_price: Number(item.valor_unitario || item.unit_price || 0) * Number(item.quantidade || item.quantity || 1),
      })),
    };

    return new Response(JSON.stringify(normalized), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("scan-invoice error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Não foi possível ler todos os dados. Por favor, preencha manualmente ou tente outra foto.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
