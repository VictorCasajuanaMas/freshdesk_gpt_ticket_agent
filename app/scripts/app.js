/**
 * Aplicación principal - Coordinación e inicialización
 * GPT Ticket Assistant para Freshdesk
 */

// Estado de la aplicación
const appState = {
  client: null,
  currentTicketData: null,
  lastChatGPTResponse: null
};

// Variables globales para compatibilidad con otros módulos
let currentTicketData = null;
let lastChatGPTResponse = null;
let client = null;



/**
 * Inicialización de la aplicación
 * Configura eventos y listeners principales
 */
function initializeApp() {
  LogWrite('Iniciando aplicación GPT Ticket Assistant');
  
  window.frsh_init().then(function(client_instance) {
    // Inicializar sistema de debug
    initDebug();
    
    // Asignar al estado y variables globales
    appState.client = client_instance;
    client = client_instance;
    window.client = client_instance;
    
    LogWrite('Cliente inicializado correctamente');
    
    // Escuchar mensajes del modal
    client_instance.instance.receive(function(event) {
      const data = event.helper.getData();
      const textoAdicional = data.message.textoAdicional;
      LogWrite('Recibido texto adicional del modal');
      handleTextoAdicional(textoAdicional);
    });

    // Evento principal cuando se activa la app
    client_instance.events.on('app.activated', renderText);
  }).catch(function(error) {
    LogWrite('Error al inicializar aplicación: ' + error.message);
    console.error('Error al inicializar la aplicación:', error);
    const textElement = document.getElementById('apptext');
    if (textElement) {
      textElement.innerHTML = renderError('Error al inicializar la aplicación: ' + error.message);
    }
  });
}

// Inicializar la aplicación
initializeApp();

/**
 * Renderizar texto inicial al activar la aplicación
 * Obtiene datos del ticket y genera la primera respuesta de ChatGPT
 */
async function renderText() {
  const textElement = document.getElementById('apptext');
  LogWrite('Iniciando renderText - obteniendo datos del ticket');
  
  try {
    // Verificar que el cliente esté disponible
    if (!appState.client) {
      throw new Error('Cliente no inicializado');
    }

    // Obtener datos del ticket actual
    const ticketData = await appState.client.data.get('ticket');
    const ticketInfo = ticketData.ticket;
    const { subject, description } = ticketInfo;

    LogWrite('Datos del ticket obtenidos - iniciando consulta a ChatGPT');

    // Mostrar spinner de loading
    textElement.innerHTML = renderLoadingSpinner('Consultando al asistente...');
    
    // Generar respuesta de ChatGPT
    const chatGPTResponse = await callChatGPT(subject, description);
    
    LogWrite('Respuesta de ChatGPT recibida - renderizando UI');
    
    // Asignar a estado y variables globales de forma segura
    appState.currentTicketData = ticketInfo;
    appState.lastChatGPTResponse = chatGPTResponse;
    currentTicketData = ticketInfo;
    lastChatGPTResponse = chatGPTResponse;
    
    const formattedResponse = formatResponse(chatGPTResponse);
    
    // Renderizar UI
    textElement.innerHTML = renderUI(formattedResponse);
  } catch (error) {
    LogWrite('Error en renderText: ' + error.message);
    console.error('Error en renderText:', error);
    textElement.innerHTML = renderError(error.message);
  }
}