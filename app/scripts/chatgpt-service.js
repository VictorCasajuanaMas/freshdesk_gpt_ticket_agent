/* eslint-disable no-unused-vars */
/**
 * Servicio para manejar las comunicaciones con la API de ChatGPT
 */

/**
 * Función genérica para llamar a la API de ChatGPT
 * Si vector_store_id está configurado, usa la Responses API con file_search.
 * Si no, usa la Chat Completions API estándar.
 * @param {string} subject - Asunto del ticket
 * @param {string} description - Descripción del ticket
 * @param {string|null} additionalInfo - Información adicional opcional
 * @returns {Promise<{content: string, annotations: Array|null}>} - Respuesta de ChatGPT con anotaciones opcionales
 */
async function callChatGPT(subject, description, additionalInfo = null) {
  LogWrite('Iniciando llamada a ChatGPT API');
  
  const iparams = await window.client.iparams.get();
  const systemPrompt = iparams.system_prompt;
  const vectorStoreId = iparams.vector_store_id;

  LogWrite('Configuración validada - preparando petición a OpenAI');

  let finalPrompt = systemPrompt;
  
  if (additionalInfo) {
    finalPrompt += `\n\n${t('errorAdditionalInfo')}: ${additionalInfo}`;
  }

  if (vectorStoreId) {
    return await callWithVectorStore(finalPrompt, subject, description, vectorStoreId);
  }

  return await callStandard(finalPrompt, subject, description);
}

/**
 * Llamada estándar usando Chat Completions API (sin vector store)
 */
async function callStandard(systemPrompt, subject, description) {
  const requestBody = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${t('promptSubject')}: ${subject}\n${t('promptBody')}: ${description}` }
    ],
    temperature: 0.7
  };

  LogWrite('Enviando petición a OpenAI API via Chat Completions');
  let response;
  try {
    response = await window.client.request.invokeTemplate('openaiChatCompletion', {
      body: JSON.stringify(requestBody)
    });
  } catch (err) {
    throw new Error(parseOpenAIError(err));
  }

  const data = JSON.parse(response.response);
  LogWrite('Respuesta de ChatGPT recibida exitosamente');
  
  let content = data.choices[0].message.content;
  content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  return { content: content, annotations: null };
}

/**
 * Llamada usando Responses API con file_search (vector store)
 */
async function callWithVectorStore(systemPrompt, subject, description, vectorStoreId) {
  const requestBody = {
    model: 'gpt-4o-mini',
    instructions: systemPrompt,
    input: [
      { role: 'user', content: `${t('promptSubject')}: ${subject}\n${t('promptBody')}: ${description}` }
    ],
    tools: [{
      type: 'file_search',
      vector_store_ids: [vectorStoreId]
    }],
    temperature: 0.7
  };

  LogWrite('Enviando petición a OpenAI Responses API con file_search (vector store: ' + vectorStoreId + ')');
  let response;
  try {
    response = await window.client.request.invokeTemplate('openaiResponses', {
      body: JSON.stringify(requestBody)
    });
  } catch (err) {
    throw new Error(parseOpenAIError(err));
  }

  const data = JSON.parse(response.response);
  LogWrite('Respuesta de Responses API recibida exitosamente');

  return parseResponsesApiOutput(data);
}

/**
 * Parsear la salida de la Responses API para extraer contenido y anotaciones
 */
function parseResponsesApiOutput(data) {
  const messageItem = data.output.find(function(item) { return item.type === 'message'; });
  if (!messageItem || !messageItem.content || !messageItem.content.length) {
    throw new Error(t('errorUnknown'));
  }

  const textContent = messageItem.content.find(function(item) { return item.type === 'output_text'; });
  if (!textContent) {
    throw new Error(t('errorUnknown'));
  }

  let content = textContent.text;
  content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  return { content: content, annotations: extractAnnotations(textContent.annotations) };
}

/**
 * Extraer anotaciones de citas de ficheros (deduplicadas por filename)
 */
function extractAnnotations(rawAnnotations) {
  if (!rawAnnotations || !rawAnnotations.length) {
    return null;
  }
  const seen = {};
  const result = rawAnnotations
    .filter(function(ann) { return ann.type === 'file_citation' && ann.filename; })
    .filter(function(ann) {
      if (seen[ann.filename]) { return false; }
      seen[ann.filename] = true;
      return true;
    })
    .map(function(ann) { return { filename: ann.filename, fileId: ann.file_id }; });
  return result.length ? result : null;
}

const OPENAI_ERROR_KEYS = {
  401: 'errorApiKey',
  429: 'errorRateLimit',
  500: 'errorServer500',
  503: 'errorServer503'
};

function extractOpenAIMessage(response) {
  const body = typeof response === 'string' ? JSON.parse(response) : response;
  return body && body.error && body.error.message ? body.error.message : null;
}

function parseOpenAIError(err) {
  const status = err.status || 0;

  if (OPENAI_ERROR_KEYS[status]) {
    return t(OPENAI_ERROR_KEYS[status]);
  }

  try {
    const extracted = extractOpenAIMessage(err.response);
    if (extracted) {
      return extracted;
    }
  } catch (_) {
    // response wasn't JSON, fall through
  }

  return err.message || t('errorUnknown');
}