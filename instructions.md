Aplicación para ser ejecutada desde dentro de los tickets de la plataforma freshdesk
Esta aplicación utiliza el sdk de freshdesk: https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/interface-methods/
Es muy importante tambien el contexto: https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/advanced-interfaces/instance-method/#context
Todos los ficheros han de estar en utf8
Para la UI (User interface) se utiliza la siguiente librería: https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/app-ui/
Puedes vedr toda la documentación de la librería UI en el siguiente enlace: https://crayons.freshworks.com/introduction/ en ella tienes todos los "Core Components" para utilizarlos. Estos estilos son los que has de utilizar, no inventes estilos.
Aquí tienes la documentación del API: https://developers.freshdesk.com/api/#introduction

Objetivo:
El objetivo principal de la aplicación es leer el contenido del ticket y el asunto.
Enviar el asunto y contenido al api de chatgpt junto con un prompt
recibir la respuesta y mostrarla