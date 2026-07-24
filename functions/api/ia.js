export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "No hay API key" }, 500);
    }

    const body = await request.json().catch(() => ({}));
    const resumen = body.resumen || "Sin datos";

    const prompt = `Eres asistente de un equipo de gestión de apartamentos. Basándote en esto, escribe UN párrafo corto (máximo 2 líneas) describiendo qué pasó hoy:\n\n${resumen}`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const datos = await r.json();
    const texto = datos?.content?.[0]?.text || "Sin respuesta";
    return json({ texto }, 200);

  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json" }
  });
}
