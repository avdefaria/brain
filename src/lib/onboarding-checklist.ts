export interface OnboardingChecklistItem {
  key: string;
  label: string;
  note?: string;
  indent?: boolean;
}

export interface OnboardingChecklistGroup {
  title: string;
  items: OnboardingChecklistItem[];
}

export const ONBOARDING_CHECKLIST: OnboardingChecklistGroup[] = [
  {
    title: "Contrato",
    items: [
      { key: "contrato_enviar_ficha", label: "Enviar ficha cadastral para o cliente preencher" },
      { key: "contrato_ficha_preenchida", label: "Cliente preencheu a ficha" },
      { key: "contrato_enviar_juridico", label: "Enviar para o Jurídico da Ongo a ficha cadastral e o contrato" },
      { key: "contrato_juridico_analisar", label: "Jurídico analisar os representantes e a empresa" },
      { key: "contrato_juridico_aprovar", label: "Jurídico vai aprovar (prazo de 1 dia útil)" },
      { key: "contrato_enviar_cliente", label: "Enviar contrato para o cliente" },
      {
        key: "contrato_testemunhas",
        label: "Enviar contrato para testemunhas e responsável pela empresa",
        note: "Se for a empresa Ongo, Tráfego Pago ou Especialista E-commerce, enviar para o Alan assinar",
      },
      { key: "contrato_assinado", label: "Contrato assinado" },
      { key: "contrato_primeiro_pagamento", label: "Primeiro pagamento" },
    ],
  },
  {
    title: "Procedimentos",
    items: [
      { key: "proc_pasta_dropbox", label: "Criar uma pasta com o nome do cliente no Dropbox" },
      { key: "proc_pasta_comercial", label: 'Criar outra pasta chamada "Comercial"' },
      {
        key: "proc_colocar_videos",
        label: "Colocar os vídeos",
        note: "1 - Reunião Inicial de Apresentação · 2 - Reunião de Proposta · 3 - Vídeo de Apresentação do Cliente",
        indent: true,
      },
      { key: "proc_colocar_contratos", label: "Coloca o(s) contrato(s)", indent: true },
      { key: "proc_colocar_proposta", label: "Coloca a proposta", indent: true },
      { key: "proc_planilha_clientes", label: "Colocar na planilha de clientes com todos os dados" },
      { key: "proc_avisar_financeiro", label: "Avisar ao departamento financeiro da empresa no grupo" },
      { key: "proc_pasta_google_drive", label: "Criar pasta no Google Drive" },
      { key: "proc_controle_fechamentos", label: "Colocar o cliente no controle de fechamentos, dentro do Notion na página Comercial" },
      { key: "proc_marcar_crm", label: 'Marcar como "Cliente" no CRM' },
      { key: "proc_onboarding_notion", label: "Colocar no onboarding do Notion de cada serviço fechado com todos os vídeos" },
      { key: "proc_avisar_grupo", label: "Avisar no grupo da empresa" },
    ],
  },
];

export const ONBOARDING_TOTAL_ITEMS = ONBOARDING_CHECKLIST.reduce((sum, g) => sum + g.items.length, 0);
