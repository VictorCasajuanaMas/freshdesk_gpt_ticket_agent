const SERVER_MESSAGES = {
  'Español': {
    401: 'La API Key de OpenAI no es válida. Verifica que la key sea correcta en https://platform.openai.com/account/api-keys',
    429: 'La API Key de OpenAI ha superado su límite de uso. Revisa tu plan en https://platform.openai.com/account/billing',
    500: 'El servicio de OpenAI no está disponible en este momento. Inténtalo de nuevo más tarde.',
    default: 'La API Key de OpenAI no es válida.'
  },
  English: {
    401: 'The OpenAI API Key is not valid. Verify your key at https://platform.openai.com/account/api-keys',
    429: 'The OpenAI API Key has exceeded its usage limit. Check your plan at https://platform.openai.com/account/billing',
    500: 'The OpenAI service is not available right now. Please try again later.',
    default: 'The OpenAI API Key is not valid.'
  },
  'Français': {
    401: "La clé API OpenAI n'est pas valide. Vérifiez votre clé sur https://platform.openai.com/account/api-keys",
    429: "La clé API OpenAI a dépassé sa limite d'utilisation. Vérifiez votre plan sur https://platform.openai.com/account/billing",
    500: "Le service OpenAI n'est pas disponible actuellement. Veuillez réessayer plus tard.",
    default: "La clé API OpenAI n'est pas valide."
  },
  Italiano: {
    401: 'La chiave API OpenAI non è valida. Verifica la tua chiave su https://platform.openai.com/account/api-keys',
    429: "La chiave API OpenAI ha superato il limite di utilizzo. Controlla il tuo piano su https://platform.openai.com/account/billing",
    500: 'Il servizio OpenAI non è disponibile al momento. Riprova più tardi.',
    default: 'La chiave API OpenAI non è valida.'
  },
  Deutsch: {
    401: 'Der OpenAI API-Schlüssel ist ungültig. Überprüfen Sie Ihren Schlüssel unter https://platform.openai.com/account/api-keys',
    429: 'Das Nutzungslimit des OpenAI API-Schlüssels wurde überschritten. Überprüfen Sie Ihren Plan unter https://platform.openai.com/account/billing',
    500: 'Der OpenAI-Dienst ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.',
    default: 'Der OpenAI API-Schlüssel ist ungültig.'
  },
  'Português': {
    401: 'A chave API da OpenAI não é válida. Verifique sua chave em https://platform.openai.com/account/api-keys',
    429: 'A chave API da OpenAI excedeu seu limite de uso. Verifique seu plano em https://platform.openai.com/account/billing',
    500: 'O serviço da OpenAI não está disponível no momento. Tente novamente mais tarde.',
    default: 'A chave API da OpenAI não é válida.'
  },
  '日本語': {
    401: 'OpenAI APIキーが無効です。https://platform.openai.com/account/api-keys でキーを確認してください',
    429: 'OpenAI APIキーの使用制限を超えました。https://platform.openai.com/account/billing でプランを確認してください',
    500: 'OpenAIサービスは現在利用できません。後でもう一度お試しください。',
    default: 'OpenAI APIキーが無効です。'
  },
  Nederlands: {
    401: 'De OpenAI API-sleutel is ongeldig. Controleer uw sleutel op https://platform.openai.com/account/api-keys',
    429: 'De OpenAI API-sleutel heeft de gebruikslimiet overschreden. Controleer uw plan op https://platform.openai.com/account/billing',
    500: 'De OpenAI-service is momenteel niet beschikbaar. Probeer het later opnieuw.',
    default: 'De OpenAI API-sleutel is ongeldig.'
  },
  '中文': {
    401: 'OpenAI API密钥无效。请在 https://platform.openai.com/account/api-keys 验证您的密钥',
    429: 'OpenAI API密钥已超出使用限制。请在 https://platform.openai.com/account/billing 检查您的计划',
    500: 'OpenAI服务目前不可用。请稍后重试。',
    default: 'OpenAI API密钥无效。'
  },
  Polski: {
    401: 'Klucz API OpenAI jest nieprawidłowy. Sprawdź swój klucz na https://platform.openai.com/account/api-keys',
    429: 'Klucz API OpenAI przekroczył limit użycia. Sprawdź swój plan na https://platform.openai.com/account/billing',
    500: 'Usługa OpenAI jest obecnie niedostępna. Spróbuj ponownie później.',
    default: 'Klucz API OpenAI jest nieprawidłowy.'
  },
  Svenska: {
    401: 'OpenAI API-nyckeln är ogiltig. Verifiera din nyckel på https://platform.openai.com/account/api-keys',
    429: 'OpenAI API-nyckeln har överskridit sin användningsgräns. Kontrollera din plan på https://platform.openai.com/account/billing',
    500: 'OpenAI-tjänsten är inte tillgänglig just nu. Försök igen senare.',
    default: 'OpenAI API-nyckeln är ogiltig.'
  }
};

exports = {
  onAppInstallHandler: function () {
    const lang = $iparams.app_language || 'English';
    const msgs = SERVER_MESSAGES[lang] || SERVER_MESSAGES.English;

    $request.invokeTemplate('openaiValidateKey', {}).then(
      function () {
        renderData();
      },
      function (err) {
        const msg = msgs[err.status] || (err.status >= 500 ? msgs[500] : msgs.default);
        renderData({ message: msg });
      }
    );
  }
};
