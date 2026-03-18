const ALLOWED_MODELS = ["openai/gpt-5.3", "anthropic/claude-opus-4-6", "google/gemini-pro-3.1"];
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { model, messages } = await req.json();
  if (!ALLOWED_MODELS.includes(model)) return new Response("Invalid model", { status: 400 });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENROUTER_KEY}` },
    body: JSON.stringify({ model, messages, max_tokens: 1024 }),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", ...CORS }, status: res.status });
};
