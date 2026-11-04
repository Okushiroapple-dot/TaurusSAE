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
    numeroCarro: 38,
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
    // Opcional: endpoint do Formspree (https://formspree.io). Só é usado se o
    // Firebase (abaixo) não estiver configurado ou falhar.
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
   * do protótipo atual (ex.: "Aço SAE 4130", "600 cm³"). Na garagem 3D,
   * ao clicar em Chassi, Suspensão, Motor, Transmissão ou Freios,
   * o valor aparece no painel como "No carro da equipe: ...".
   */
  carro: {
    nome: "TR-04",
    numero: "38",
    categoria: "Fórmula SAE · Combustão",
    ficha: [
      { rotulo: "Chassi", valor: "", texto: "Treliça de tubos de aço soldados, com arcos de proteção e atenuador de impacto conforme o regulamento." },
      { rotulo: "Suspensão", valor: "", texto: "Duplo A nas quatro rodas com coilovers de ação direta, geometria calculada para o traçado travado das provas." },
      { rotulo: "Motor", valor: "", texto: "Motor de motocicleta, limitado por restritor de admissão exigido pela regra." },
      { rotulo: "Transmissão", valor: "", texto: "Câmbio sequencial do próprio motor e transmissão final por corrente." },
      { rotulo: "Freios", valor: "", texto: "Disco nas quatro rodas, com duplo circuito hidráulico e balanço ajustável." },
      { rotulo: "Peso", valor: "", texto: "" },
    ],
  },

  /*
   * Integrantes (página integrantes.html).
   * departamentos: a ordem aqui é a ordem na página. "lideranca" aparece com cartões maiores.
   * membros: uma linha por pessoa. departamento = id de um dos departamentos acima;
   *   diretor: true coloca a pessoa em destaque no começo do departamento;
   *   foto: caminho dentro de assets/img/equipe/ (formato quadrado). Sem foto, o site
   *   desenha um avatar a partir do nome; linkedin é opcional.
   * integrantesDemo: true mostra o aviso de que os nomes são de exemplo. Quando a
   *   lista tiver as pessoas reais, troque para false.
   */
  integrantesDemo: true,
  departamentos: [
    { id: "lideranca", nome: "Liderança", descricao: "Coordena a equipe inteira: cronograma da temporada, decisões técnicas, relação com a universidade e com os patrocinadores." },
    { id: "chassi", nome: "Chassi e ergonomia", descricao: "Estrutura tubular, arcos de proteção, atenuador de impacto, banco e posição do piloto." },
    { id: "suspensao", nome: "Suspensão e direção", descricao: "Geometria, cinemática, amortecedores, cubos, mangas de eixo e caixa de direção." },
    { id: "powertrain", nome: "Powertrain", descricao: "Motor, admissão com restritor, escape, arrefecimento, combustível e transmissão." },
    { id: "freios", nome: "Freios", descricao: "Discos, pinças, cilindros mestres e o balanço de frenagem que o piloto ajusta." },
    { id: "eletronica", nome: "Eletrônica e dados", descricao: "Chicote, painel, sensores e aquisição de dados para entender o carro em pista." },
    { id: "aerodinamica", nome: "Aerodinâmica e carenagem", descricao: "Formas da carroceria e das asas, estudadas em CFD e fabricadas em compósito." },
    { id: "gestao", nome: "Gestão e custos", descricao: "Cronograma, compras, relatório de custos e o plano de negócios apresentado na competição." },
    { id: "marketing", nome: "Marketing e patrocínio", descricao: "Redes sociais, identidade visual, relacionamento com empresas e captação de recursos." },
  ],
  membros: [
    // Liderança
    { nome: "Ana Carolina Ribeiro", cargo: "Capitã", departamento: "lideranca", curso: "Engenharia Mecânica", periodo: "9º", foto: "", linkedin: "" },
    { nome: "Lucas Ferreira Lima", cargo: "Vice-capitão", departamento: "lideranca", curso: "Engenharia Mecânica", periodo: "8º", foto: "", linkedin: "" },
    { nome: "Rafael Moreira Santos", cargo: "Diretor técnico", departamento: "lideranca", curso: "Engenharia Mecânica", periodo: "9º", foto: "", linkedin: "" },
    { nome: "Juliana Costa Almeida", cargo: "Diretora administrativa", departamento: "lideranca", curso: "Engenharia de Produção", periodo: "8º", foto: "", linkedin: "" },
    // Chassi e ergonomia
    { nome: "Bruna Oliveira Prado", cargo: "Diretora de Chassi", departamento: "chassi", curso: "Engenharia Mecânica", periodo: "7º", diretor: true, foto: "", linkedin: "" },
    { nome: "Gabriel Souza Martins", cargo: "Membro", departamento: "chassi", curso: "Engenharia Mecânica", periodo: "6º", foto: "", linkedin: "" },
    { nome: "Isabela Rocha Nunes", cargo: "Membro", departamento: "chassi", curso: "Engenharia Civil", periodo: "5º", foto: "", linkedin: "" },
    { nome: "Pedro Henrique Alves", cargo: "Membro", departamento: "chassi", curso: "Engenharia Mecânica", periodo: "4º", foto: "", linkedin: "" },
    { nome: "Thiago Carvalho Reis", cargo: "Membro", departamento: "chassi", curso: "Engenharia Mecânica", periodo: "5º", foto: "", linkedin: "" },
    { nome: "Larissa Mendes Faria", cargo: "Trainee", departamento: "chassi", curso: "Engenharia Mecânica", periodo: "2º", foto: "", linkedin: "" },
    { nome: "Vinícius Barbosa Teixeira", cargo: "Trainee", departamento: "chassi", curso: "Engenharia Civil", periodo: "3º", foto: "", linkedin: "" },
    // Suspensão e direção
    { nome: "Matheus Gomes Pereira", cargo: "Diretor de Suspensão", departamento: "suspensao", curso: "Engenharia Mecânica", periodo: "8º", diretor: true, foto: "", linkedin: "" },
    { nome: "Camila Duarte Freitas", cargo: "Membro", departamento: "suspensao", curso: "Engenharia Mecânica", periodo: "6º", foto: "", linkedin: "" },
    { nome: "Felipe Araújo Castro", cargo: "Membro", departamento: "suspensao", curso: "Engenharia Mecânica", periodo: "7º", foto: "", linkedin: "" },
    { nome: "Letícia Cardoso Ramos", cargo: "Membro", departamento: "suspensao", curso: "Engenharia Mecânica", periodo: "5º", foto: "", linkedin: "" },
    { nome: "João Victor Pinto", cargo: "Membro", departamento: "suspensao", curso: "Engenharia de Produção", periodo: "4º", foto: "", linkedin: "" },
    { nome: "Gustavo Monteiro Dias", cargo: "Trainee", departamento: "suspensao", curso: "Engenharia Mecânica", periodo: "2º", foto: "", linkedin: "" },
    { nome: "Amanda Correia Vieira", cargo: "Trainee", departamento: "suspensao", curso: "Engenharia Mecânica", periodo: "3º", foto: "", linkedin: "" },
    // Powertrain
    { nome: "Leonardo Batista Rocha", cargo: "Diretor de Powertrain", departamento: "powertrain", curso: "Engenharia Mecânica", periodo: "8º", diretor: true, foto: "", linkedin: "" },
    { nome: "Beatriz Lopes Moraes", cargo: "Membro", departamento: "powertrain", curso: "Engenharia Mecânica", periodo: "7º", foto: "", linkedin: "" },
    { nome: "Henrique Fonseca Melo", cargo: "Membro", departamento: "powertrain", curso: "Engenharia Mecânica", periodo: "6º", foto: "", linkedin: "" },
    { nome: "Caio Rezende Borges", cargo: "Membro", departamento: "powertrain", curso: "Engenharia Química", periodo: "5º", foto: "", linkedin: "" },
    { nome: "Mariana Azevedo Lima", cargo: "Membro", departamento: "powertrain", curso: "Engenharia Mecânica", periodo: "5º", foto: "", linkedin: "" },
    { nome: "Diego Nascimento Cruz", cargo: "Trainee", departamento: "powertrain", curso: "Engenharia Mecânica", periodo: "2º", foto: "", linkedin: "" },
    { nome: "Sofia Tavares Campos", cargo: "Trainee", departamento: "powertrain", curso: "Engenharia Mecânica", periodo: "3º", foto: "", linkedin: "" },
    // Freios
    { nome: "Fernanda Machado Silva", cargo: "Diretora de Freios", departamento: "freios", curso: "Engenharia Mecânica", periodo: "7º", diretor: true, foto: "", linkedin: "" },
    { nome: "Eduardo Pires Andrade", cargo: "Membro", departamento: "freios", curso: "Engenharia Mecânica", periodo: "6º", foto: "", linkedin: "" },
    { nome: "Natália Ramos Coelho", cargo: "Membro", departamento: "freios", curso: "Engenharia Mecânica", periodo: "5º", foto: "", linkedin: "" },
    { nome: "Arthur Bezerra Lacerda", cargo: "Membro", departamento: "freios", curso: "Engenharia de Produção", periodo: "6º", foto: "", linkedin: "" },
    { nome: "Igor Vasconcelos Paiva", cargo: "Membro", departamento: "freios", curso: "Engenharia Mecânica", periodo: "4º", foto: "", linkedin: "" },
    { nome: "Yasmin Furtado Leal", cargo: "Trainee", departamento: "freios", curso: "Engenharia Mecânica", periodo: "2º", foto: "", linkedin: "" },
    { nome: "Otávio Brandão Sales", cargo: "Trainee", departamento: "freios", curso: "Engenharia Mecânica", periodo: "3º", foto: "", linkedin: "" },
    // Eletrônica e dados
    { nome: "Daniel Siqueira Prates", cargo: "Diretor de Eletrônica", departamento: "eletronica", curso: "Engenharia Elétrica", periodo: "8º", diretor: true, foto: "", linkedin: "" },
    { nome: "Carolina Bastos Dutra", cargo: "Membro", departamento: "eletronica", curso: "Engenharia Elétrica", periodo: "7º", foto: "", linkedin: "" },
    { nome: "Murilo Antunes Lobo", cargo: "Membro", departamento: "eletronica", curso: "Engenharia Elétrica", periodo: "6º", foto: "", linkedin: "" },
    { nome: "Gabriela Fagundes Torres", cargo: "Membro", departamento: "eletronica", curso: "Engenharia Elétrica", periodo: "5º", foto: "", linkedin: "" },
    { nome: "Renan Albuquerque Mota", cargo: "Membro", departamento: "eletronica", curso: "Engenharia Elétrica", periodo: "5º", foto: "", linkedin: "" },
    { nome: "Lívia Peixoto Guerra", cargo: "Trainee", departamento: "eletronica", curso: "Engenharia Elétrica", periodo: "2º", foto: "", linkedin: "" },
    { nome: "Samuel Couto Damasceno", cargo: "Trainee", departamento: "eletronica", curso: "Engenharia Elétrica", periodo: "3º", foto: "", linkedin: "" },
    // Aerodinâmica e carenagem
    { nome: "Marina Esteves Gouveia", cargo: "Diretora de Aerodinâmica", departamento: "aerodinamica", curso: "Engenharia Mecânica", periodo: "8º", diretor: true, foto: "", linkedin: "" },
    { nome: "André Queiroz Lemos", cargo: "Membro", departamento: "aerodinamica", curso: "Engenharia Mecânica", periodo: "7º", foto: "", linkedin: "" },
    { nome: "Vitória Sampaio Rangel", cargo: "Membro", departamento: "aerodinamica", curso: "Engenharia Química", periodo: "6º", foto: "", linkedin: "" },
    { nome: "Bruno Xavier Cunha", cargo: "Membro", departamento: "aerodinamica", curso: "Engenharia Mecânica", periodo: "5º", foto: "", linkedin: "" },
    { nome: "Rodrigo Medeiros Falcão", cargo: "Membro", departamento: "aerodinamica", curso: "Engenharia Civil", periodo: "6º", foto: "", linkedin: "" },
    { nome: "Clara Viana Bittencourt", cargo: "Trainee", departamento: "aerodinamica", curso: "Engenharia Mecânica", periodo: "2º", foto: "", linkedin: "" },
    { nome: "Enzo Magalhães Toledo", cargo: "Trainee", departamento: "aerodinamica", curso: "Engenharia Mecânica", periodo: "3º", foto: "", linkedin: "" },
    // Gestão e custos
    { nome: "Patrícia Barros Figueiredo", cargo: "Diretora de Gestão", departamento: "gestao", curso: "Engenharia de Produção", periodo: "8º", diretor: true, foto: "", linkedin: "" },
    { nome: "Ricardo Neves Moura", cargo: "Membro", departamento: "gestao", curso: "Engenharia de Produção", periodo: "7º", foto: "", linkedin: "" },
    { nome: "Júlia Andrade Sardinha", cargo: "Membro", departamento: "gestao", curso: "Engenharia de Produção", periodo: "6º", foto: "", linkedin: "" },
    { nome: "Fábio Lins Carneiro", cargo: "Membro", departamento: "gestao", curso: "Engenharia de Produção", periodo: "5º", foto: "", linkedin: "" },
    { nome: "Helena Cavalcanti Pinho", cargo: "Membro", departamento: "gestao", curso: "Engenharia Civil", periodo: "4º", foto: "", linkedin: "" },
    { nome: "Marcelo Aguiar Pacheco", cargo: "Trainee", departamento: "gestao", curso: "Engenharia de Produção", periodo: "2º", foto: "", linkedin: "" },
    { nome: "Alice Rios Domingues", cargo: "Trainee", departamento: "gestao", curso: "Engenharia de Produção", periodo: "3º", foto: "", linkedin: "" },
    // Marketing e patrocínio
    { nome: "Laura Teles Montenegro", cargo: "Diretora de Marketing", departamento: "marketing", curso: "Engenharia de Produção", periodo: "7º", diretor: true, foto: "", linkedin: "" },
    { nome: "Gustavo Prado Valente", cargo: "Membro", departamento: "marketing", curso: "Engenharia de Produção", periodo: "6º", foto: "", linkedin: "" },
    { nome: "Manuela Freire Assunção", cargo: "Membro", departamento: "marketing", curso: "Engenharia de Produção", periodo: "5º", foto: "", linkedin: "" },
    { nome: "Davi Holanda Quintela", cargo: "Membro", departamento: "marketing", curso: "Engenharia Elétrica", periodo: "5º", foto: "", linkedin: "" },
    { nome: "Bianca Seixas Lourenço", cargo: "Membro", departamento: "marketing", curso: "Engenharia Civil", periodo: "4º", foto: "", linkedin: "" },
    { nome: "Heitor Bragança Fontes", cargo: "Trainee", departamento: "marketing", curso: "Engenharia de Produção", periodo: "2º", foto: "", linkedin: "" },
    { nome: "Lara Coutinho Amaral", cargo: "Trainee", departamento: "marketing", curso: "Engenharia de Produção", periodo: "3º", foto: "", linkedin: "" },
  ],

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
  galeria: [
    // imagens do TR-04 geradas a partir do modelo 3D da equipe; troque por fotos reais quando houver
    { src: "assets/img/carro/tr04-xray.webp", legenda: "TR-04 em 3D: o chassi tubular, em laranja, por dentro da carenagem" },
    { src: "assets/img/carro/tr04-explodido.webp", legenda: "TR-04 em 3D: vista explodida" },
    { src: "assets/img/carro/tr04-lado.webp", legenda: "TR-04 em 3D: vista lateral" },
    { src: "assets/img/carro/tr04-frente.webp", legenda: "TR-04 em 3D: de frente, com a asa dianteira" },
    { src: "assets/img/camisetas-oficiais.webp", legenda: "Camisa oficial da temporada 26/27" },
    { src: "assets/img/camisetas-pretas.webp", legenda: "Camiseta da temporada 26/27" },
  ],

  // Processo seletivo: aberto = true mostra o formulário como "inscrições abertas".
  processoSeletivo: {
    aberto: false,
    texto:
      "Todo semestre a equipe abre vagas para alunos da UFTM. Deixe seu contato e avisamos quando as inscrições começarem.",
  },

  /*
   * Firebase (projeto taurus-racing). Os formulários "Faça parte" e "Fale com
   * a Taurus" gravam no Firestore, nas coleções "inscricoes" e "mensagens".
   * Cole aqui a configuração do app da Web (console do Firebase → Configurações
   * do projeto → Geral → Seus apps → SDK setup and configuration → Config).
   * Esses valores são públicos; quem protege os dados são as regras em firestore.rules.
   * Com apiKey vazio, o site no Firebase Hosting pega a configuração sozinho, mas a
   * cópia no GitHub Pages precisa dela preenchida para gravar no Firestore.
   */
  firebase: {
    apiKey: "",
    authDomain: "taurus-racing.firebaseapp.com",
    projectId: "taurus-racing",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  },
};
