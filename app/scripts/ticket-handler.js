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
  try {
    if (!lastChatGPTResponse) {
      console.error('No hay respuesta de ChatGPT para añadir');
      return;
    }

    const responseText = extractResponseText(lastChatGPTResponse);
    
    await client.interface.trigger("click", {
      id: "reply",
      text: responseText
    }).then(function() {
      client.interface.trigger("showNotify", {
        type: "success",
        message: "Respuesta insertada en el editor"
      });
    }).catch(function() {
      client.interface.trigger("showNotify", {
        type: "danger",
        title: "Error",
        message: "No se pudo insertar la respuesta"
      });
    });

  } catch (error) {
    console.error('Error al abrir editor de respuesta:', error);
    client.interface.trigger("showNotify", {
      type: "danger",
      title: "Error",
      message: "Error al insertar la respuesta: " + error.message
    });
  }
}