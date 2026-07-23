export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Parsear el body
    let prompt = "Hola";
    try {
      const body = await request.json();
      if (body && body.prompt) {
        prompt = String(body.prompt).slice(0, 5000);
      }
    } catch (e) {
      return resp({ error: "Error parseando JSON" }, 400);
    }

    // Obtener y limpiar la key
    let apiKey = env.ANTHROPIC_API_KEY || "";
    if (!apiKey) {
      return resp({ error: "No existe ANTHROPIC_API_KEY" }, 500);
    }
    
    // Limpiar espacios, saltos de línea y caracteres invisibles
    apiKey = String(apiKey).trim();
    if (apiKey.includes(" ") || apiKey.includes("\n") || apiKey.includes("\r")) {
      return resp({ error: "ANTHROPIC_API_KEY contiene espacios o saltos de línea" }, 500);
    }

    // Llamar a Anthropic
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

    // Parsear respuesta
    const data = await apiResponse.json();

    // Verificar si Anthropic devolvió error
    if (!apiResponse.ok) {
      return resp({
        error: "Anthropic: " + (data.error?.message || `Status ${apiResponse.status}`),
      }, apiResponse.status);
    }

    // Extraer texto
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
