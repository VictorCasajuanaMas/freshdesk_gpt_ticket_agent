/**
 * Servicio para manejar las comunicaciones con la API de ChatGPT
 */

/**
 * Función genérica para llamar a la API de ChatGPT
 * @param {string} subject - Asunto del ticket
 * @param {string} description - Descripción del ticket
 * @param {string|null} additionalInfo - Información adicional opcional
 * @returns {Promise<string>} - Respuesta de ChatGPT
 */
async function callChatGPT(subject, description, additionalInfo = null) {
  // Verificar que el cliente esté disponible
  if (!window.client) {
    throw new Error('Cliente no inicializado');
  }

  // Obtener la API key y el prompt desde los parámetros de configuración
  const iparams = await window.client.iparams.get();
  const openaiApiKey = iparams.openai_api_key;
  const systemPrompt = iparams.system_prompt;
  
  if (!openaiApiKey) {
    throw new Error('API Key de OpenAI no configurada. Ve a http://localhost:10001/custom_configs para configurarla.');
  }

  if (!systemPrompt) {
    throw new Error('Prompt del sistema no configurado. Ve a http://localhost:10001/custom_configs para configurarlo.');
  }

  // Preparar el prompt final
  let finalPrompt = systemPrompt;
  
  if (additionalInfo) {
    finalPrompt += `\n\nINFORMACIÓN ADICIONAL: ${additionalInfo}`;
  }

  // Preparar el request body
  const requestBody = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: finalPrompt },
      { role: 'user', content: `Asunto: ${subject}\nCuerpo: ${description}` }
    ],
    temperature: 0.7
  };

  try {
    // Llamada a la API de OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error);
    throw new Error(`Error al conectar con ChatGPT: ${error.message}`);
  }
}