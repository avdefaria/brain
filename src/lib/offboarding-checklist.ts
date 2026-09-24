export interface OffboardingChecklistItem {
  key: string;
  label: string;
  note?: string;
  indent?: boolean;
  /** Ao marcar este item, dispara a troca de status do cliente pra Inativo (pede motivo de churn). */
  triggersChurn?: boolean;
}

export interface OffboardingChecklistGroup {
  title: string;
  items: OffboardingChecklistItem[];
}

export const OFFBOARDING_CHECKLIST: OffboardingChecklistGroup[] = [
  {
    title: "Aviso de saída recebido",
    items: [
      { key: "aviso_analisar_volta", label: "Analisar se realmente não tem mais volta" },
      {
        key: "aviso_servico_unico",
        label: "Se o cliente tiver contratado mais de um serviço, avisar que ele pode sair de apenas um caso queira",
        indent: true,
      },
      { key: "aviso_conferir_pagamentos", label: "Conferir quando entrou, pagamentos pendentes e se tem multa" },
      { key: "aviso_avisar_procedimentos", label: "Avisar para o cliente sobre os procedimentos e pedir para enviar e-mail formalizando a saída" },
      { key: "aviso_cliente_enviar_email", label: "Cliente enviar o e-mail formalizando a saída" },
      { key: "aviso_perguntar_campanhas", label: "Perguntar se é para manter as campanhas durante os 30 dias do aviso" },
      { key: "aviso_status_painel", label: 'Alterar o status no painel para "aviso 30 dias"' },
      { key: "aviso_status_dashboard", label: 'Alterar o status no(s) dashboard(s) do cliente para "aviso 30 dias"' },
      { key: "aviso_time_operacional", label: "Avisar time operacional correspondente" },
      { key: "aviso_controle_clientes", label: 'Alterar em Controle de Clientes para "aviso 30 dias"' },
      { key: "aviso_time_financeiro", label: "Avisar o time financeiro" },
      { key: "aviso_pagamento_final", label: "Cliente pagar última(s) mensalidade(s) e/ou multa e/ou apenas confirmar que está tudo certo" },
    ],
  },
  {
    title: "Jurídico",
    items: [
      { key: "juridico_acionado", label: "Departamento jurídico acionado no grupo caso dê algum tipo de problema" },
      { key: "juridico_escalar_painel", label: "Caso isso evolua de alguma forma, tirar daqui e colocar no painel do departamento Jurídico" },
      { key: "juridico_contato_cliente", label: "Jurídico entrou em contato com o cliente para falar sobre a situação atual" },
    ],
  },
  {
    title: "Processos",
    items: [
      {
        key: "processos_passar_inativo",
        label: "Passar para inativo no Controle de Clientes",
        triggersChurn: true,
      },
      { key: "processos_retirar_acesso", label: "Retirar o acesso do cliente ao dashboard do Notion" },
      {
        key: "processos_mensagem_agradecimento",
        label: "Enviar mensagem ao cliente agradecendo a parceria",
        note: 'Olá, [CLIENTE]! Como vai? Nosso contrato encerrou no dia X e pra oficializar preciso perguntar se deseja manter as campanhas ativas ou se desativamos, além disso vou conferir se você está com acesso à todas as contas e ferramentas que utilizamos e são suas.\nNo mais, agradecemos imensamente a parceria e desejamos muito sucesso para você, qualquer coisa estaremos à disposição!',
      },
    ],
  },
];

export const OFFBOARDING_TOTAL_ITEMS = OFFBOARDING_CHECKLIST.reduce((sum, g) => sum + g.items.length, 0);
