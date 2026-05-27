/* eslint-disable no-unused-vars */
/**
 * Funciones para el manejo del modal de información adicional
 */

/**
 * Mostrar modal para información adicional
 * Abre el modal que permite al usuario añadir más contexto
 */
function showOtraModal() {
  appState.client.interface.trigger('showModal', {
    title: t('modalTitle'),
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
  
  if (!appState.currentTicketData || !textoAdicional.trim()) {
    LogWrite('Error: No hay datos del ticket o texto adicional vacío');
    return;
  }
  
  const textElement = document.getElementById('apptext');
  
  try {
    textElement.innerHTML = renderLoadingSpinner(t('loadingNewResponse'));
    
    const { subject, description } = appState.currentTicketData;
    const result = await callChatGPT(subject, description, textoAdicional);
    
    LogWrite('Nueva respuesta con información adicional generada');
    
    // Actualizar estado global
    appState.lastChatGPTResponse = result.content;
    appState.lastAnnotations = result.annotations;
    const formattedResponse = formatResponse(result.content, result.annotations);
    
    textElement.innerHTML = renderUI(formattedResponse);
  } catch (error) {
    LogWrite('Error al generar respuesta adicional: ' + error.message);
    renderErrorSafe(textElement, error.message);
  }
}