export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Paso 1: Parsear el body
    let prompt = "Hola";
    try {
      const body = await request.json();
      if (body && body.prompt) {
        prompt = String(body.prompt).slice(0, 5000);
      }
    } catch (e) {
      return resp({ error: "Error parseando JSON: " + e.message }, 400);
    }

    // Paso 2: Verificar que existe la key
    if (!env.ANTHROPIC_API_KEY) {
      return resp({ error: "No existe ANTHROPIC_API_KEY en Cloudflare" }, 500);
    }

    // Paso 3: Llamar a Anthropic
    let apiResponse;
    try {
      apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
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
    } catch (e) {
      return resp({ error: "Error en fetch a Anthropic: " + e.message }, 500);
    }

    // Paso 4: Parsear respuesta de Anthropic
    let data;
    try {
      data = await apiResponse.json();
    } catch (e) {
      return resp({ error: "Error parseando respuesta Anthropic: " + e.message }, 500);
    }

    // Paso 5: Verificar si Anthropic devolvió un error
    if (!apiResponse.ok) {
      return resp({
        error: "Anthropic error: " + (data.error?.message || data.message || "unknown"),
        status: apiResponse.status
      }, apiResponse.status);
    }

    // Paso 6: Extraer texto
    const text = data?.content?.[0]?.text || "Sin respuesta de la IA";
    return resp({ texto: text }, 200);

  } catch (e) {
    return resp({ error: "Error general: " + e.message }, 500);
  }
}

function resp(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: { "content-type": "application/json" }
  });
}
