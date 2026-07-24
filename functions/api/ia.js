export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "No hay API key configurada" }, 500);
    }

    // Recibir el resumen básico desde el frontend
    const body = await request.json().catch(() => ({}));
    const resumenDatos = body.resumen || "Sin datos";

    // Prompt ultra-simple
    const prompt = `Eres un asistente para un equipo de gestión de apartamentos. Basándote en estos datos de hoy, escribe UN PÁRRAFO corto (máximo 3 líneas) diciendo qué pasó hoy:\n\n${resumenDatos}`;

    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      return json({ error: "Error de la IA: " + (datos.error?.message || "desconocido") }, 500);
    }

    const texto = datos?.content?.[0]?.text || "Sin respuesta";
    return json({ texto: texto }, 200);

  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json" }
  });
}
