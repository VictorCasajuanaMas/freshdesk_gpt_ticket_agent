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
  const response = await window.client.request.invokeTemplate('openaiChatCompletion', {
    body: JSON.stringify(requestBody)
  });

  const data = JSON.parse(response.response);
  LogWrite('Respuesta de ChatGPT recibida exitosamente');
  return data.choices[0].message.content;
}