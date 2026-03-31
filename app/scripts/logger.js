/* eslint-disable no-unused-vars */
/**
 * Sistema de logs simple para debug en producción
 */

const logger = { enabled: false };

/**
 * Inicializar el estado del debug leyendo desde iparams
 */
async function initDebug() {
  try {
    if (window.client && window.client.iparams) {
      const iparams = await window.client.iparams.get();
      logger.enabled = iparams.debug_enabled || false;
    }
  } catch (error) {
    logger.enabled = false;
  }
}

/**
 * Función simple de logging
 * @param {string} cText - Texto a mostrar en consola
 */
function LogWrite(cText) {
  if (logger.enabled) {
    console.log('[DEBUG] ' + cText);
  }
}