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
  try {
    // Verificar que el cliente esté disponible
    if (!window.client) {
      throw new Error('Cliente no inicializado');
    }

    // Obtener la API key desde los parámetros de configuración
    let openaiApiKey = null;
    
    try {
      const iparams = await window.client.iparams.get();
      console.log('iparams obtenidos:', iparams);
      openaiApiKey = iparams.openai_api_key;
    } catch (iparamsError) {
      console.error('Error obteniendo iparams:', iparamsError);
    }
    
    // Temporal para desarrollo - añade tu API key aquí
    if (!openaiApiKey) {
      openaiApiKey = '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';
    }
    
    if (!openaiApiKey) {
      throw new Error('API Key de OpenAI no configurada. Por favor, configúrala en los parámetros de instalación.');
    }

    console.log('Usando API key:', openaiApiKey.substring(0, 20) + '...');

    let systemPrompt = getSystemPrompt();
    
    if (additionalInfo) {
      systemPrompt += `\n\nINFORMACIÓN ADICIONAL: ${additionalInfo}`;
    }

    const requestBody = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Asunto: ${subject}\nCuerpo: ${description}` }
      ],
      temperature: 0.7
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error en callChatGPT:', error);
    throw new Error(`Error al conectar con ChatGPT: ${error.message}`);
  }
}