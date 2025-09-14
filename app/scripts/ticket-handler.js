/**
 * Funciones para el manejo de tickets y respuestas
 */

/**
 * Extraer solo el texto de respuesta para insertar en el ticket
 * @param {string} response - Respuesta raw de ChatGPT
 * @returns {string} - Solo el texto de respuesta, sin formato
 */
function extractResponseText(response) {
  const parsedResponse = JSON.parse(response);
  return parsedResponse.respuesta;
}

/**
 * Añadir respuesta de ChatGPT al ticket
 * Abre el editor de respuesta de Freshdesk con el texto insertado
 */
async function addResponseToTicket() {
  LogWrite('Iniciando inserción de respuesta en ticket');
  
  const responseText = extractResponseText(appState.lastChatGPTResponse);
  
  await appState.client.interface.trigger("click", {
    id: "reply",
    text: responseText
  }).then(function() {
    LogWrite('Respuesta insertada exitosamente en ticket');
    appState.client.interface.trigger("showNotify", {
      type: "success",
      message: "Respuesta insertada en el editor"
    });
  });
}