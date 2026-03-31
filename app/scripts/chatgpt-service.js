/* eslint-disable no-unused-vars */
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
  LogWrite('Iniciando llamada a ChatGPT API');
  
  // Obtener el prompt desde los parámetros de configuración
  const iparams = await window.client.iparams.get();
  const systemPrompt = iparams.system_prompt;

  LogWrite('Configuración validada - preparando petición a OpenAI');

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

  // Llamada segura a la API de OpenAI usando request template
  LogWrite('Enviando petición a OpenAI API via invokeTemplate');
  let response;
  try {
    response = await window.client.request.invokeTemplate('openaiChatCompletion', {
      body: JSON.stringify(requestBody)
    });
  } catch (err) {
    throw new Error(parseOpenAIError(err));
  }

  const data = JSON.parse(response.response);
  LogWrite('Respuesta de ChatGPT recibida exitosamente');
  return data.choices[0].message.content;
}

const OPENAI_ERROR_MESSAGES = {
  401: 'La API Key de OpenAI no es válida. Revisa la configuración de la app.',
  429: 'Se ha superado el límite de uso de la API de OpenAI. Inténtalo de nuevo más tarde.',
  500: 'Error interno en los servidores de OpenAI. Inténtalo de nuevo más tarde.',
  503: 'El servicio de OpenAI no está disponible temporalmente. Inténtalo de nuevo más tarde.'
};

function parseOpenAIError(err) {
  const status = err.status || 0;

  // Check for known status codes first
  if (OPENAI_ERROR_MESSAGES[status]) {
    return OPENAI_ERROR_MESSAGES[status];
  }

  // Try to extract the message from the OpenAI JSON error response
  try {
    const body = typeof err.response === 'string' ? JSON.parse(err.response) : err.response;
    if (body && body.error && body.error.message) {
      return `Error de OpenAI: ${body.error.message}`;
    }
  } catch (_) {
    // response wasn't JSON, fall through
  }

  return err.message || 'Error desconocido al contactar con OpenAI.';
}