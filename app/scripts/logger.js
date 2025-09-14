/**
 * Sistema de logs simple para debug en producción
 */

// Variable global para controlar si el debug está habilitado
let debugEnabled = false;

/**
 * Inicializar el estado del debug leyendo desde iparams
 */
async function initDebug() {
  try {
    if (window.client && window.client.iparams) {
      const iparams = await window.client.iparams.get();
      debugEnabled = iparams.debug_enabled || false;
      
      // Console.log directo para verificar el valor
      console.log('DEBUG INIT - debug_enabled valor:', iparams.debug_enabled);
      console.log('DEBUG INIT - debugEnabled final:', debugEnabled);
    }
  } catch (error) {
    debugEnabled = false;
    console.log('DEBUG INIT - Error:', error);
  }
}

/**
 * Función simple de logging
 * @param {string} cText - Texto a mostrar en consola
 */
function LogWrite(cText) {
  if (debugEnabled) {
    console.log('[DEBUG] ' + cText);
  }
}