// ===== Comprobación rápida (GET) =====
export async function onRequestGet(context) {
  const tieneKey = !!context.env.ANTHROPIC_API_KEY;
  const respuesta = {
    estado: "✅ La función está desplegada y viva",
    apiKeyDetectada: tieneKey,
    nota: tieneKey
      ? "Todo listo. Ahora prueba el botón desde la app."
      : "⚠️ No se detecta ANTHROPIC_API_KEY en Cloudflare."
  };
  return new Response(JSON.stringify(respuesta), {
    status: 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
  });
}

// ===== Llamada real a la IA (POST) =====
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Verifica que la key exista
    if (!env.ANTHROPIC_API_KEY) {
      return respuestaJSON(
        { error: "No se encontró ANTHROPIC_API_KEY en Cloudflare." },
        500
      );
    }

    // Parsea el body
    let prompt = "Hola";
    try {
      const body = await request.json();
      if (body && body.prompt) {
        prompt = String(body.prompt).substring(0, 5000);
      }
    } catch (e) {
      // Si el body no es JSON válido, usa el prompt por defecto
    }

    // Llamada a la API de Anthropic
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

    // Lee la respuesta
    const respuestaTexto = await respuesta.text();

    if (!respuesta.ok) {
      return respuestaJSON(
        {
          error: "La API de Anthropic devolvió un error",
          status: respuesta.status,
          detalle: respuestaTexto.substring(0, 500)
        },
        500
      );
    }

    // Parsea el JSON de Anthropic
    let datos;
    try {
      datos = JSON.parse(respuestaTexto);
    } catch (e) {
      return respuestaJSON(
        {
          error: "Anthropic devolvió una respuesta no válida",
          detalle: respuestaTexto.substring(0, 300)
        },
        500
      );
    }

    // Extrae el texto de la respuesta
    const texto = datos?.content?.[0]?.text ?? "Sin respuesta";
    return respuestaJSON({ texto }, 200);

  } catch (error) {
    const mensajeError = error && error.message ? String(error.message) : "Error desconocido";
    return respuestaJSON(
      { error: "Error en la función: " + mensajeError.substring(0, 200) },
      500
    );
  }
}

// Función auxiliar para respuestas JSON seguras
function respuestaJSON(obj, status) {
  try {
    const json = JSON.stringify(obj);
    return new Response(json, {
      status: status || 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      }
    });
  } catch (e) {
    // Fallback extremo si el stringify falla
    return new Response('{"error":"Error serializando respuesta"}', {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
// v2 - test
