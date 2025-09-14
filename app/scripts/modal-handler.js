/**
 * Funciones para el manejo del modal de información adicional
 */

/**
 * Mostrar modal para información adicional
 * Abre el modal que permite al usuario añadir más contexto
 */
function showOtraModal() {
  if (!client) {
    console.error('Cliente no disponible');
    return;
  }
  
  client.interface.trigger('showModal', {
    title: 'Otra Respuesta',
    template: './modal.html'
  });
}

/**
 * Manejar texto adicional recibido del modal
 * Genera una nueva respuesta de ChatGPT con la información adicional
 * @param {string} textoAdicional - Información adicional del usuario
 */
async function handleTextoAdicional(textoAdicional) {
  LogWrite('Procesando texto adicional del modal para nueva respuesta');
  
  if (!currentTicketData || !textoAdicional.trim()) {
    LogWrite('Error: No hay datos del ticket o texto adicional vacío');
    console.warn('No hay datos del ticket o texto adicional vacío');
    return;
  }
  
  const textElement = document.getElementById('apptext');
  
  try {
    textElement.innerHTML = renderLoadingSpinner('Generando nueva respuesta...');
    
    const { subject, description } = currentTicketData;
    const response = await callChatGPT(subject, description, textoAdicional);
    
    LogWrite('Nueva respuesta con información adicional generada');
    
    // Asignar de forma segura
    lastChatGPTResponse = response;
    const formattedResponse = formatResponse(response);
    
    textElement.innerHTML = renderUI(formattedResponse);
  } catch (error) {
    LogWrite('Error al generar respuesta adicional: ' + error.message);
    console.error('Error en handleTextoAdicional:', error);
    textElement.innerHTML = renderError(error.message);
  }
}