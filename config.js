/* Os formulários abrem o WhatsApp com os dados preenchidos.
 * O visitante deve revisar a mensagem e tocar em Enviar no WhatsApp.
 * Não é necessário contratar um serviço de formulário ou configurar uma API.
 */
window.SITE_CONFIG = Object.freeze({
  contactMethod: "whatsapp", // "whatsapp" (atual) ou "endpoint" para um serviço próprio.
  contactWhatsAppNumber: "5511991001754", // País + DDD + número, somente dígitos.
  // Opcional, usado somente no modo "endpoint": POST JSON com resposta HTTP 2xx.
  contactEndpoint: "",
  // Ative somente após preencher os IDs reais e os domínios de produção.
  // Consulte docs/MEDICAO.md. Não inclua localhost, previews ou um segundo GTM.
  measurement: Object.freeze({
    allowedHosts: Object.freeze([]), // Ex.: ["www.seudominio.com.br", "seudominio.com.br"]
    googleAdsId: "", // ID AW- da conta, sem a barra nem o rótulo.
    ga4Id: "", // ID G- opcional. Desative as medições melhoradas no fluxo GA4.
    conversionLabels: Object.freeze({
      whatsapp_click: "", // Ações de clique: configurar como conversões secundárias.
      email_click: "",
      phone_click: "",
      form_submit: "" // Envio confirmado pelo endpoint: contato recebido.
    })
  })
});
