/* eslint-disable no-unused-vars */
/**
 * Sistema de internacionalización (i18n)
 * Carga las traducciones según el idioma configurado en iparams
 */

const i18n = { strings: {} };

/**
 * Inicializar las traducciones cargando el JSON del idioma configurado
 * Nota: Se usa XMLHttpRequest para cargar ficheros locales (no es una API externa).
 */
async function initI18n() {
  const iparams = await window.client.iparams.get();
  const language = iparams.app_language || 'English';

  i18n.strings = await new Promise(function(resolve, reject) {
    const xhr = new XMLHttpRequest(); // Local file load, not an API request
    xhr.open('GET', 'i18n/' + language + '.json');
    xhr.onload = function() { resolve(JSON.parse(xhr.responseText)); };
    xhr.onerror = function() { reject(new Error('Failed to load i18n')); };
    xhr.send();
  });
}

/**
 * Obtener un string traducido por su clave
 * @param {string} key - Clave del string en el JSON de idioma
 * @returns {string} - String traducido o la clave si no se encuentra
 */
function t(key) {
  return i18n.strings[key] || key;
}
