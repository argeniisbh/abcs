// ===== Comprobación rápida =====
// Si abres esta dirección en el navegador (GET), te dice si la función está viva
// y si Cloudflare está detectando tu API key. Sirve para diagnosticar.
export async function onRequestGet(context) {
  const tieneKey = !!context.env.ANTHROPIC_API_KEY;
  return json({
    estado: "✅ La función está desplegada y viva",
    apiKeyDetectada: tieneKey,
    nota: tieneKey
      ? "Todo listo. Ahora prueba el botón desde la app."
      : "⚠️ No se detecta ANTHROPIC_API_KEY. Revisa Variables and secrets en Cloudflare."
  }, 200);
}

// ===== Llamada real a la IA (POST) =====
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "No se encontró ANTHROPIC_API_KEY en Cloudflare (Variables and secrets)." }, 500);
    }

    const body = await request.json().catch(() => ({}));
    const prompt = body.prompt || "Hola";

    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
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

    // Leemos como texto primero para poder mostrar cualquier error tal cual
    const raw = await respuesta.text();

    if (!respuesta.ok) {
      return json({
        error: "La API de Anthropic devolvió un error",
        status: respuesta.status,
        detalle: raw
      }, 500);
    }

    let datos;
    try {
      datos = JSON.parse(raw);
    } catch {
      return json({ error: "Anthropic devolvió una respuesta no válida", detalle: raw }, 500);
    }

    const texto = datos?.content?.[0]?.text ?? JSON.stringify(datos);
    return json({ texto }, 200);

  } catch (error) {
    return json({ error: "Error dentro de la función: " + (error && error.message) }, 500);
  }
}

// Ayudante para devolver siempre JSON válido (nunca una respuesta vacía)
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json" }
  });
}
