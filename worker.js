// Cloudflare Worker para Chatbot de Historia
// Este código actúa como puente seguro entre el frontend y la API de Groq

export default {
  async fetch(request, env) {
    // Manejar CORS (preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Solo aceptar POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    try {
      // Obtener el cuerpo de la petición
      const body = await request.json();
      const { messages } = body;

      if (!messages || !Array.isArray(messages)) {
        throw new Error('Formato de mensajes inválido');
      }

      // System prompt detallado
      const systemPrompt = `Eres CISOChat, un tutor espacial de astronomía e historia para estudiantes de 12 a 18 años. 
      Tu objetivo es enseñar de forma amena, usando lenguaje natural y no técnico.
      🔭 Temas: observación, constelaciones, telescopios, nebulosas, cúmulos estelares, galaxias, Vía Láctea, sistema solar, exoplanetas, agujeros negros, supernovas, big bang, misiones espaciales, astronautas.
      📜 También eres experto en historia universal y de América Latina.
      Reglas importantes:
      - Responde en español, siempre con un tono cálido y entusiasta.
      - Usa emojis espaciales: 🌟🌍🪐🔭🚀🌙☀, NUNCA uses emojis de dinero.
      - Las respuestas deben ser cortas (máximo 3 párrafos) a menos que el usuario pida un resumen extenso.
      - Si no sabes algo, dilo honestamente: "No tengo información sobre eso, pero puedo investigar contigo."
      - Para resúmenes, proporciona una estructura clara con título, introducción, puntos clave y conclusión.
      - Siempre motiva al estudiante a seguir aprendiendo.`;

      // Construir el payload para Groq
      const groqMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      // Llamar a la API de Groq
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: groqMessages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Groq API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const reply = data.choices[0]?.message?.content || 'Lo siento, no pude procesar tu solicitud.';

      return new Response(JSON.stringify({ reply }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      console.error('Error en Worker:', error);
      return new Response(JSON.stringify({ error: error.message || 'Error interno del servidor' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }
};
