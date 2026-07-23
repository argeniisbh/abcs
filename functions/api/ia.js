export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const prompt = body?.prompt || "Hola";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    const text = data?.content?.[0]?.text || "Sin respuesta";

    return new Response(JSON.stringify({ texto: text }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: "Error en la función" }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
