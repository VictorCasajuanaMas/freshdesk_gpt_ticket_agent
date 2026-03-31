/* eslint-disable no-unused-vars */
/**
 * Funciones para el renderizado de la interfaz de usuario
 */

/**
 * Formatear respuesta de ChatGPT para mostrar en la UI
 * @param {string} response - Respuesta raw de ChatGPT
 * @returns {string} - HTML formateado para mostrar
 */
function formatResponse(response) {
  const parsedResponse = JSON.parse(response);
  return `
    <p>${parsedResponse.status.emoji} ${parsedResponse.status.status}</p>
    <div>${parsedResponse.response.replace(/\n/g, '<br>')}</div>
  `;
}

/**
 * Renderizar botones y respuesta en la UI
 * @param {string} formattedResponse - Respuesta HTML formateada
 * @returns {string} - HTML completo con botones y respuesta
 */
function renderUI(formattedResponse) {
  return `
    <div style="margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
      <fw-button color="primary" onclick="addResponseToTicket()" title="${t('btnAddTitle')}">${t('btnAdd')}</fw-button>
      <fw-button color="secondary" onclick="showOtraModal()" title="${t('btnOtherTitle')}">${t('btnOther')}</fw-button>
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
 * Renderizar mensaje de error con estilo visual
 * @param {string} message - Mensaje de error a mostrar
 * @returns {string} - HTML del error con estilo rojo
 */
function renderError(message) {
  return `<fw-inline-message open type="error">${message}</fw-inline-message>`;
}

