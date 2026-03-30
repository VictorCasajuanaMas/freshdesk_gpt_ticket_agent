# GPT Ticket Assistant — Freshdesk App

## Descripción General

Aplicación para la plataforma **Freshdesk** que se ejecuta dentro de la vista de tickets. Al abrir un ticket, la app lee automáticamente el asunto y la descripción, los envía a la API de OpenAI (ChatGPT) junto con un prompt de sistema configurable, y muestra la respuesta generada en el sidebar del ticket. El agente puede insertar la respuesta directamente en el editor de respuesta del ticket o solicitar una nueva respuesta proporcionando contexto adicional a través de un modal.

## Stack Tecnológico

- **Plataforma:** Freshworks App SDK v3.0 (platform-version: "3.0")
- **FDK:** v9.7.4 | **Node:** v18.20.8
- **UI:** Freshworks Crayons v4 (web components: `fw-button`, `fw-spinner`, `fw-textarea`, etc.)
- **API externa:** OpenAI Chat Completions API (`gpt-3.5-turbo`)
- **Lenguaje:** JavaScript vanilla (sin frameworks, sin bundlers)
- **Codificación:** Todos los ficheros deben estar en **UTF-8**

## Documentación de Referencia

| Recurso | URL |
|---|---|
| SDK Front-end Apps | https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/interface-methods/ |
| Instance Methods & Context | https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/advanced-interfaces/instance-method/#context |
| Librería UI (Crayons) | https://crayons.freshworks.com/introduction/ |
| Componentes Crayons | https://crayons.freshworks.com/ — usar solo "Core Components" existentes, no inventar estilos |
| Data Methods (client.data.get) | https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/data-methods/ |
| Interface Methods | https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/interface-methods/ |
| API REST de Freshdesk | https://developers.freshdesk.com/api/#introduction |
| Manifest.json | https://developers.freshworks.com/docs/app-sdk/v3.0/common/front-end-apps/app-manifest/ |
| Publicar app | https://developers.freshworks.com/docs/app-sdk/v3.0/common/app-development-process/#test-the-app |

## Arquitectura y Estructura de Ficheros

```
manifest.json            → Configuración de la app: locations, módulos, engines
config/iparams.json      → Parámetros de instalación (API key, prompt del sistema, debug)
app/
  index.html             → Página principal cargada en ticket_sidebar y full_page_app
  modal.html             → Modal para solicitar información adicional al agente
  scripts/
    logger.js            → Sistema de logging condicional (controlado por iparam debug_enabled)
    chatgpt-service.js   → Llamadas a la API de OpenAI (callChatGPT)
    ui-renderer.js       → Renderizado de HTML: formatResponse, renderUI, renderLoadingSpinner
    ticket-handler.js    → Manejo de tickets: extractResponseText, addResponseToTicket
    modal-handler.js     → Gestión del modal: showOtraModal, handleTextoAdicional
    app.js               → Punto de entrada: initializeApp, renderText, estado global (appState)
  styles/
    style.css            → Estilos personalizados
    images/              → Iconos (icon.svg)
```

### Orden de carga de scripts (importante)

Los scripts se cargan en `index.html` en orden de dependencias:
1. `logger.js` — sin dependencias
2. `prompt.js` — (referenciado en HTML, pendiente de verificar existencia)
3. `chatgpt-service.js` — depende de logger, client
4. `ui-renderer.js` — sin dependencias externas
5. `ticket-handler.js` — depende de appState, client
6. `modal-handler.js` — depende de appState, chatgpt-service, ui-renderer
7. `app.js` — orquesta todo, depende de todos los anteriores

## Locations (manifest.json)

- **`support_ticket > ticket_sidebar`**: Se muestra en el sidebar al visualizar un ticket.
- **`common > full_page_app`**: Disponible también como aplicación a página completa.

## Parámetros de Instalación (iparams.json)

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `openai_api_key` | text | Sí | API Key de OpenAI |
| `system_prompt` | paragraph | Sí | Prompt de sistema para ChatGPT. Define el comportamiento del asistente. La respuesta esperada es JSON: `{"estado": {"emoji": "...", "estado": "..."}, "respuesta": "..."}` |
| `debug_enabled` | checkbox | No | Activa logs de debug en consola |

## Flujo Principal de la Aplicación

1. **Inicialización:** `initializeApp()` llama a `window.frsh_init()` para obtener el `client` del SDK.
2. **Activación:** Al evento `app.activated`, se ejecuta `renderText()`.
3. **Obtención de datos:** `client.data.get('ticket')` obtiene `subject` y `description` del ticket actual.
4. **Consulta a ChatGPT:** `callChatGPT(subject, description)` envía los datos a OpenAI con el `system_prompt` configurado.
5. **Renderizado:** La respuesta (JSON) se parsea y se muestra con estado/emoji + texto de respuesta.
6. **Acciones del agente:**
   - **"Añadir"**: `addResponseToTicket()` abre el editor de respuesta del ticket con `client.interface.trigger("click", {id: "reply", text: responseText})`.
   - **"Otra"**: `showOtraModal()` abre un modal donde el agente escribe contexto adicional. Se reenvía a ChatGPT con el parámetro `additionalInfo`.

## Estado Global

```js
const appState = {
  client: null,              // Instancia del client SDK de Freshworks
  currentTicketData: null,   // Datos del ticket actual (subject, description, etc.)
  lastChatGPTResponse: null  // Última respuesta raw de ChatGPT (string JSON)
};
```

## API de OpenAI — Formato de Llamada

- **Endpoint:** `https://api.openai.com/v1/chat/completions`
- **Modelo:** `gpt-3.5-turbo`
- **Temperature:** `0.7`
- **Mensajes:** System prompt (configurable) + User message con asunto y cuerpo del ticket
- **Autenticación:** Bearer token con la API key del iparam

## Formato de Respuesta Esperado de ChatGPT

```json
{
  "estado": {
    "emoji": "😊",
    "estado": "Descripción del estado del ticket"
  },
  "respuesta": "Texto de la respuesta sugerida para el cliente"
}
```

## Reglas de Desarrollo

1. **No escribir código innecesario ni comprobaciones redundantes.** Para publicar en el Marketplace se requiere un **80% de cobertura de tests**. Try-catch excesivos generan ramas no testeables que bajan la cobertura.
2. **Usar solo componentes de Crayons** para la UI. No inventar estilos ni componentes custom.
3. **Todos los ficheros en UTF-8.**
4. **JavaScript vanilla** — sin frameworks, sin TypeScript, sin bundlers.
5. **No usar `client.request.invokeTemplate()`** — las llamadas a OpenAI se hacen directamente con `fetch()` desde el frontend.

## Comandos de Desarrollo

```bash
# Iniciar servidor de desarrollo local
fdk run

# URL de la app en desarrollo (dentro de Freshdesk)
# Abrir ticket en Freshdesk con ?dev=true en la URL

# Configurar parámetros de instalación en desarrollo
# http://localhost:10001/custom_configs
```
