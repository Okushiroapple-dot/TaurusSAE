/*
 * ============================================================
 *  TAURUS RACING · CONFIGURAÇÃO DO SITE
 * ============================================================
 *  Tudo o que muda com frequência fica aqui: contatos, membros,
 *  patrocinadores, fotos, linha do tempo e ficha técnica.
 *  Não precisa mexer no HTML para atualizar o site.
 *
 *  Regra geral: se um campo ficar vazio ("" ou []), a seção
 *  correspondente se adapta sozinha (esconde a lista ou mostra
 *  um convite no lugar).
 * ============================================================
 */

window.TAURUS = {
  equipe: {
    nome: "Taurus Racing",
    universidade: "Universidade Federal do Triângulo Mineiro",
    sigla: "UFTM",
    cidade: "Uberaba · MG",
    fundacao: 2015,
    numeroCarro: 39,
    membros: 32,
    // Endereço do campus de engenharia (ICTE). Ajuste se a oficina for em outro lugar.
    endereco: "ICTE/UFTM · Av. Dr. Randolfo Borges Júnior, 1400 · Univerdecidade · Uberaba/MG",
  },

  contato: {
    // Coloque o e-mail oficial da equipe. Enquanto estiver vazio,
    // os botões de contato levam para o Instagram.
    email: "",
    whatsapp: "", // só números com DDI, ex: "5534999999999"
    instagram: "https://www.instagram.com/taurusracingfsae/",
    instagramUser: "@taurusracingfsae",
    facebook: "https://www.facebook.com/taurusracingfsae/",
    linkedin: "https://www.linkedin.com/company/taurus-racing-formula-sae-uftm",
    // Opcional: endpoint do Formspree (https://formspree.io) para receber
    // o formulário "Faça parte" direto no e-mail, sem abrir o app de e-mail.
    formEndpoint: "",
    // Link do media kit / proposta de patrocínio em PDF (ex: "assets/midia-kit.pdf").
    midiaKit: "",
  },

  /*
   * Linha do tempo. Adicione novos marcos no fim da lista.
   * destaque: true deixa o card em vermelho.
   */
  linhaDoTempo: [
    {
      ano: "2015",
      titulo: "Fundação",
      texto:
        "Alunos de engenharia da UFTM montam a equipe para disputar a Fórmula SAE Brasil, a competição de carros tipo fórmula projetados e construídos por universitários.",
    },
    {
      ano: "2018",
      titulo: "TR1 na pista",
      texto:
        "O TR1, primeiro carro da equipe, disputa a Fórmula SAE Brasil e termina em 37º lugar na classificação geral.",
      destaque: true,
    },
    {
      ano: "TR2",
      titulo: "Segundo protótipo",
      texto:
        "Com o que aprendeu no TR1, a equipe projeta e constrói o TR2 para voltar às competições nacionais.",
    },
    {
      ano: "2025",
      titulo: "21ª Fórmula SAE Brasil",
      texto:
        "A Taurus Racing disputa a 21ª edição na categoria combustão, com o carro número 39.",
      destaque: true,
    },
    {
      ano: "2026",
      titulo: "Novo ciclo de projeto",
      texto:
        "A equipe segue na oficina da UFTM preparando a próxima temporada. Os bastidores saem primeiro no Instagram.",
    },
  ],

  /*
   * Ficha técnica do carro. Preencha "valor" com os números reais
   * do protótipo atual. Itens com valor vazio aparecem só com a
   * descrição.
   */
  carro: {
    nome: "Protótipo Taurus",
    categoria: "Fórmula SAE · Combustão",
    ficha: [
      { rotulo: "Chassi", valor: "", texto: "Treliça de tubos de aço soldados, com arcos de proteção e atenuador de impacto conforme o regulamento." },
      { rotulo: "Suspensão", valor: "", texto: "Duplo A nas quatro rodas, com geometria calculada para o traçado travado das provas." },
      { rotulo: "Motor", valor: "", texto: "Motor de motocicleta, limitado por restritor de admissão exigido pela regra." },
      { rotulo: "Transmissão", valor: "", texto: "Câmbio sequencial do próprio motor e transmissão final por corrente." },
      { rotulo: "Freios", valor: "", texto: "Disco nas quatro rodas, com duplo circuito hidráulico e balanço ajustável." },
      { rotulo: "Peso", valor: "", texto: "" },
    ],
  },

  /*
   * Membros. Deixe a lista vazia para esconder a grade.
   * foto: caminho dentro de assets/img/equipe/ (opcional).
   * Exemplo:
   *   { nome: "Fulana de Tal", cargo: "Capitã", area: "Gestão", curso: "Eng. Mecânica", foto: "assets/img/equipe/fulana.jpg", linkedin: "https://..." },
   */
  membros: [],

  /*
   * Patrocinadores e apoiadores atuais.
   * cota: "diamante" | "ouro" | "prata" | "apoio"
   * Exemplo:
   *   { nome: "Empresa X", logo: "assets/img/patrocinadores/empresa-x.svg", site: "https://...", cota: "ouro" },
   */
  patrocinadores: [],

  /*
   * Galeria. Coloque as fotos em assets/img/galeria/ e liste aqui.
   * Enquanto a lista estiver vazia, a seção mostra um atalho para o Instagram.
   * Exemplo:
   *   { src: "assets/img/galeria/chassi.jpg", legenda: "Soldagem do chassi" },
   */
  galeria: [],

  // Processo seletivo: aberto = true mostra o formulário como "inscrições abertas".
  processoSeletivo: {
    aberto: false,
    texto:
      "Todo semestre a equipe abre vagas para alunos da UFTM. Deixe seu contato e avisamos quando as inscrições começarem.",
  },
};
