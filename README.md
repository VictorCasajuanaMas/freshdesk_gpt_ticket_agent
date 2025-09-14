Para funcionar:

Instalar Node: https://nodejs.org/es/
Instalar CLi de freshdesk: https://developers.freshworks.com/docs/app-sdk/v3.0/common/app-development-process/#install-the-fdk-+-cli
clonar repositorio

ejecutar fdk run

Entrar en http://localhost:10001/custom_configs y añadir el ApiKey de Open AI y un prompt base que se pasará a todas las consultas ( revisar miprompt.md )

abrir un ticket en freshdesk y en la url añadir ?dev=true ( ejemplo: https://visionwin.freshdesk.com/a/tickets/43073?dev=true )