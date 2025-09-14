/**
 * Funciones para el renderizado de la interfaz de usuario
 */

/**
 * Formatear respuesta de ChatGPT para mostrar en la UI
 * @param {string} response - Respuesta raw de ChatGPT
 * @returns {string} - HTML formateado para mostrar
 */
function formatResponse(response) {
  try {
    const parsedResponse = JSON.parse(response);
    return `
      <p>${parsedResponse.estado.emoji} ${parsedResponse.estado.estado}</p>
      <div>${parsedResponse.respuesta.replace(/\n/g, '<br>')}</div>
    `;
  } catch {
    return `<div>${response.replace(/\n/g, '<br>')}</div>`;
  }
}

/**
 * Renderizar botones y respuesta en la UI
 * @param {string} formattedResponse - Respuesta HTML formateada
 * @returns {string} - HTML completo con botones y respuesta
 */
function renderUI(formattedResponse) {
  return `
    <div style="margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
      <fw-button color="primary" onclick="addResponseToTicket()" title="Añade la respuesta al ticket">Añadir</fw-button>
      <fw-button color="secondary" onclick="showOtraModal()" title="Solicita otra respuesta con más contexto">Otra</fw-button>
    </div>
    <div class="fw-type-base">${formattedResponse}</div>
  `;
}

/**
 * Renderizar spinner de loading con mensaje
 * @param {string} message - Mensaje a mostrar junto al spinner
 * @returns {string} - HTML del spinner con mensaje
 */
function renderLoadingSpinner(message) {
  return `<div style="display: flex; align-items: center; gap: 8px;">
    <fw-spinner size="small"></fw-spinner>
    <span class="fw-type-base">${message}</span>
  </div>`;
}

/**
 * Renderizar mensaje de error
 * @param {string} errorMessage - Mensaje de error
 * @returns {string} - HTML del mensaje de error
 */
function renderError(errorMessage) {
  return `<p class="fw-type-base"><strong>Error:</strong> ${errorMessage}</p>`;
}

