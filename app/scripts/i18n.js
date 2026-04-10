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

  i18n.strings = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `i18n/${language}.json`);
    xhr.onload = () => resolve(JSON.parse(xhr.responseText));
    xhr.onerror = () => reject(new Error('Failed to load i18n'));
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
