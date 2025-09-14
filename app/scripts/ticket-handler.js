/**
 * Funciones para el manejo de tickets y respuestas
 */

/**
 * Extraer solo el texto de respuesta para insertar en el ticket
 * @param {string} response - Respuesta raw de ChatGPT
 * @returns {string} - Solo el texto de respuesta, sin formato
 */
function extractResponseText(response) {
  try {
    const parsedResponse = JSON.parse(response);
    return parsedResponse.respuesta;
  } catch {
    return response;
  }
}

/**
 * Añadir respuesta de ChatGPT al ticket
 * Abre el editor de respuesta de Freshdesk con el texto insertado
 */
async function addResponseToTicket() {
  LogWrite('Iniciando inserción de respuesta en ticket');
  
  try {
    if (!lastChatGPTResponse) {
      LogWrite('Error: No hay respuesta de ChatGPT disponible');
      console.error('No hay respuesta de ChatGPT para añadir');
      return;
    }

    const responseText = extractResponseText(lastChatGPTResponse);
    
    await client.interface.trigger("click", {
      id: "reply",
      text: responseText
    }).then(function() {
      LogWrite('Respuesta insertada exitosamente en ticket');
      client.interface.trigger("showNotify", {
        type: "success",
        message: "Respuesta insertada en el editor"
      });
    }).catch(function() {
      LogWrite('Error al insertar respuesta en ticket');
      client.interface.trigger("showNotify", {
        type: "danger",
        title: "Error",
        message: "No se pudo insertar la respuesta"
      });
    });

  } catch (error) {
    LogWrite('Error al insertar respuesta: ' + error.message);
    console.error('Error al abrir editor de respuesta:', error);
    client.interface.trigger("showNotify", {
      type: "danger",
      title: "Error",
      message: "Error al insertar la respuesta: " + error.message
    });
  }
}