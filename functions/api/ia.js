export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      // Si no viene JSON, es un prompt simple
    }

    // Si viene con datos estructurados (resumen de turno), úsalos
    if (body.tipo === "resumen-turno") {
      const prompt = generarPromptResumen(body.datos);
      return await llamarIA(env, prompt);
    }

    // Si no, es un prompt simple
    const prompt = body.prompt || "Hola";
    return await llamarIA(env, prompt);

  } catch (e) {
    return resp({ error: "Error: " + String(e.message) }, 500);
  }
}

async function llamarIA(env, prompt) {
  const apiKey = (env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey || !apiKey.startsWith("sk-")) {
    return resp({ error: "API key inválida" }, 500);
  }

  try {
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
        error: "Anthropic: " + (data.error?.message || `Status ${apiResponse.status}`),
      }, apiResponse.status);
    }

    const text = data?.content?.[0]?.text || "Sin respuesta";
    return resp({ texto: text }, 200);

  } catch (e) {
    return resp({ error: "Error en fetch: " + String(e.message) }, 500);
  }
}

function generarPromptResumen(datos) {
  return `Eres un asistente para el equipo de gestión de apartamentos en Barcelona. Genera un resumen de traspaso de turno en español, breve y directo.

Datos del turno de hoy:
- Check-ins: ${datos.checkinsTotal} total, ${datos.checkinsAbiertos} sin cerrar
- Checkouts: ${datos.checkoutsTotal} total, ${datos.checkoutsSinConfirmar} sin confirmar
- Llaves: ${datos.llavesEntregadas} entregadas, ${datos.llavesPendientes} pendientes de devolver
- Ruido: ${datos.ruidoTotal} incidencias reportadas${datos.ruidoPendiente ? ` (${datos.ruidoPendiente} pendientes)` : ''}
- Reportes: ${datos.reportesPendientes} reportes pendientes
- Actividad: Últimas acciones: ${datos.ultimasAcciones.join(', ')}

Redacta un resumen conciso para pasar al siguiente turno. Formato: 2-3 frases máximo. Menciona solo lo que es crítico o pendiente.`;
}

function resp(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: { "content-type": "application/json" }
  });
}
