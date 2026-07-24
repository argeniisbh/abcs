export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { tipo, seccion, datos, pregunta } = body;

    // Modo 1: Resumen automático de sección
    if (tipo === "resumen-seccion") {
      const prompt = generarPromptSeccion(seccion, datos);
      return await llamarIA(env, prompt);
    }

    // Modo 2: Chat contextual dentro de sección
    if (tipo === "chat-contextual") {
      const prompt = generarPromptChat(seccion, datos, pregunta);
      return await llamarIA(env, prompt);
    }

    // Modo 3: Consulta general (como antes)
    if (tipo === "consulta-general") {
      const prompt = body.prompt || "Hola";
      return await llamarIA(env, prompt);
    }

    return respuesta({ error: "Tipo de solicitud no válido" }, 400);

  } catch (e) {
    return respuesta({ error: "Error: " + String(e.message) }, 500);
  }
}

function generarPromptSeccion(seccion, datos) {
  const prompts = {
    "inicio": `Eres un asistente de gestión de apartamentos. Análisis rápido del estado actual (sin explicaciones largas):
Datos: Check-ins totales: ${datos.checkinsTotal}, Abiertos: ${datos.checkinsAbiertos}. Check-outs pendientes: ${datos.checkoutsPendientes}. Reportes pendientes: ${datos.reportesPendientes}. Ruido reportado hoy: ${datos.ruidoHoy}.
Genera 2-3 puntos de atención crítica si hay. Si todo está bien, dilo en una línea.`,

    "checkin": `Resumen de check-ins para hoy:
Total: ${datos.total}, Completados: ${datos.completados}, Abiertos: ${datos.abiertos}, No-show: ${datos.noshow}.
Llaves entregadas: ${datos.llavesEntregadas}. 
Agentes activos: ${datos.agentes.join(', ')}.
Dame lo más relevante en 2-3 líneas. Menciona solo problemas o anomalías.`,

    "checkout": `Resumen de check-outs para hoy:
Total: ${datos.total}, Completados: ${datos.completados}, Pendientes: ${datos.pendientes}.
Llaves recibidas: ${datos.llavesRecibidas}. Llaves faltantes: ${datos.llavesFaltantes}.
Dame lo más relevante en 2-3 líneas.`,

    "llaves": `Estado de llaves:
Total en sistema: ${datos.total}, Entregadas: ${datos.entregadas}, En almacén: ${datos.almacen}, Pendientes devolver: ${datos.pendientes}.
Apartamentos sin confirmar devolución: ${datos.apartamentosPendientes}.
Dame lo crítico en 1-2 líneas.`,

    "ruido": `Incidencias de ruido hoy:
Total reportado: ${datos.total}, Críticas (nivel 3): ${datos.criticas}, Moderadas (nivel 2): ${datos.moderadas}, Leves (nivel 1): ${datos.leves}.
Pendientes resolver: ${datos.pendientes}.
Dame resumen en 1-2 líneas. Prioriza lo que necesita acción.`,

    "reportes": `Estado de reportes:
Total: ${datos.total}, Pendientes: ${datos.pendientes}, Resueltos: ${datos.resueltos}.
Tipos pendientes: ${datos.tiposPendientes.join(', ')}.
Dame lo más urgente en 1-2 líneas.`,

    "historial": `Actividad del turno:
Total de acciones: ${datos.total}. Últimas acciones: ${datos.ultimasAcciones.join(', ')}.
Usuarios activos: ${datos.usuarios.join(', ')}.
Dame un resumen de qué pasó hoy en 2-3 líneas.`
  };

  return prompts[seccion] || `Resumen de ${seccion}: ${JSON.stringify(datos)}`;
}

function generarPromptChat(seccion, datos, pregunta) {
  const contexto = `Contexto: Estamos en la sección de ${seccion}. Datos disponibles: ${JSON.stringify(datos).substring(0, 500)}.`;
  return `${contexto}\n\nPregunta del usuario: ${pregunta}\n\nResponde de forma concisa y específica a esta pregunta usando solo los datos disponibles.`;
}

async function llamarIA(env, prompt) {
  const apiKey = (env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey || !apiKey.startsWith("sk-")) {
    return respuesta({ error: "API key inválida" }, 500);
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
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return respuesta({
        error: "Anthropic: " + (data.error?.message || `Status ${apiResponse.status}`),
      }, apiResponse.status);
    }

    const texto = data?.content?.[0]?.text || "Sin respuesta";
    return respuesta({ texto: texto }, 200);

  } catch (e) {
    return respuesta({ error: "Error en fetch: " + String(e.message) }, 500);
  }
}

function respuesta(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: { "content-type": "application/json" }
  });
}
