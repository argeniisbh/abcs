export async function onRequestGet(context) {
  const apiKey = context.env.ANTHROPIC_API_KEY || "";
  const length = apiKey.length;
  const startsWithSk = apiKey.startsWith("sk-");
  const hasSpaces = apiKey.includes(" ");
  const hasNewlines = apiKey.includes("\n") || apiKey.includes("\r");
  
  return resp({
    keyExists: length > 0,
    keyLength: length,
    startsWithSk: startsWithSk,
    hasSpaces: hasSpaces,
    hasNewlines: hasNewlines,
    diagnosis: !startsWithSk ? "❌ Key no comienza con 'sk-'" : 
               hasSpaces || hasNewlines ? "❌ Key contiene espacios o saltos de línea" :
               length < 20 ? "❌ Key demasiado corta" :
               "✅ Key parece estar bien"
  }, 200);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    let prompt = "Hola";
    try {
      const body = await request.json();
      if (body && body.prompt) {
        prompt = String(body.prompt).slice(0, 5000);
      }
    } catch (e) {
      return resp({ error: "Error parseando JSON" }, 400);
    }

    const apiKey = (env.ANTHROPIC_API_KEY || "").trim();
    if (!apiKey || !apiKey.startsWith("sk-")) {
      return resp({ error: "API key inválida o no existe" }, 500);
    }

    const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return resp({
        error: "Anthropic error: " + (data.error?.message || `Status ${apiResponse.status}`),
      }, apiResponse.status);
    }

    const text = data?.content?.[0]?.text || "Sin respuesta";
    return resp({ texto: text }, 200);

  } catch (e) {
    return resp({ error: "Error: " + String(e.message) }, 500);
  }
}

function resp(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: { "content-type": "application/json" }
  });
}
