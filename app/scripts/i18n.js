/* eslint-disable no-unused-vars */
/**
 * Sistema de internacionalización (i18n)
 * Carga las traducciones según el idioma configurado en iparams
 */

const i18n = { strings: {} };

/**
 * Inicializar las traducciones cargando el JSON del idioma configurado
 */
async function initI18n() {
  const iparams = await window.client.iparams.get();
  const language = iparams.app_language || 'English';

  const response = await fetch(`i18n/${language}.json`);
  i18n.strings = await response.json();
}

/**
 * Obtener un string traducido por su clave
 * @param {string} key - Clave del string en el JSON de idioma
 * @returns {string} - String traducido o la clave si no se encuentra
 */
function t(key) {
  return i18n.strings[key] || key;
}
