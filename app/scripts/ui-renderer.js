/* eslint-disable no-unused-vars */
/**
 * Funciones para el renderizado de la interfaz de usuario
 */

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formatear respuesta de ChatGPT para mostrar en la UI
 * @param {string} response - Respuesta raw de ChatGPT
 * @param {Array|null} annotations - Anotaciones de citas de ficheros (vector store)
 * @returns {string} - HTML formateado para mostrar
 */
function formatResponse(response, annotations) {
  const parsedResponse = JSON.parse(response);
  const emoji = escapeHtml(parsedResponse.status.emoji);
  const status = escapeHtml(parsedResponse.status.status);
  const responseText = escapeHtml(parsedResponse.response).replace(/\n/g, '<br>');
  let html = `
    <p>${emoji} ${status}</p>
    <div>${responseText}</div>
  `;
  if (annotations && annotations.length) {
    html += renderSources(annotations);
  }
  return html;
}

/**
 * Renderizar sección de fuentes de ficheros del vector store
 * @param {Array} annotations - Array de {filename, fileId}
 * @returns {string} - HTML con la lista de fuentes
 */
function renderSources(annotations) {
  let items = '';
  for (let i = 0; i < annotations.length; i++) {
    items += '<li>' + escapeHtml(annotations[i].filename) + '</li>';
  }
  return `
    <div style="margin-top: 12px; padding: 8px; background: var(--fw-popover-bg, #f5f7f9); border-radius: 4px;">
      <strong>${t('sourcesTitle')}</strong>
      <ul style="margin: 4px 0 0 0; padding-left: 20px;">${items}</ul>
    </div>
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
  return `<fw-inline-message open type="error">${escapeHtml(message)}</fw-inline-message>`;
}

/**
 * Renderizar error directamente en un elemento DOM de forma segura (sin innerHTML)
 * Usa DOM API para evitar DOM XSS con datos de excepciones
 * @param {HTMLElement} element - Elemento DOM donde renderizar
 * @param {string} message - Mensaje de error a mostrar
 */
function renderErrorSafe(element, message) {
  element.textContent = '';
  const errorEl = document.createElement('fw-inline-message');
  errorEl.setAttribute('open', '');
  errorEl.setAttribute('type', 'error');
  errorEl.textContent = typeof message === 'string' ? message : '';
  element.appendChild(errorEl);
}

