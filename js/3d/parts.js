/*
 * Textos e enquadramentos dos sistemas do carro na garagem 3D.
 * cam: posição da câmera e ponto para onde ela olha (metros).
 */
export const PARTS = {
  chassi: {
    nome: "Chassi tubular",
    texto: "Treliça de tubos de aço soldados. O arco principal e o frontal protegem o piloto numa capotagem e a estrutura lateral absorve impactos. O regulamento fixa diâmetro e espessura mínimos para cada tubo.",
    cam: { pos: [2.1, 2.3, 2.3], tgt: [0.1, 0.35, 0] },
    estado: { xray: 1 },
  },
  suspensao: {
    nome: "Suspensão duplo A",
    texto: "Duas bandejas em A seguram cada roda. O coilover (mola e amortecedor num conjunto só) vai direto da bandeja ao chassi, sem balancim. A geometria das bandejas define quanto a roda inclina nas curvas.",
    cam: { pos: [1.75, 0.85, 1.75], tgt: [0.78, 0.3, 0.45] },
    estado: { xray: 0.75, demo: "heave" },
  },
  freios: {
    nome: "Freios",
    texto: "Discos nas quatro rodas e dois circuitos hidráulicos independentes, como pede o regulamento. Na inspeção técnica o carro precisa travar as quatro rodas numa frenagem em linha reta.",
    cam: { pos: [1.5, 0.55, 1.6], tgt: [0.8, 0.25, 0.55] },
    estado: { brake: 1 },
  },
  powertrain: {
    nome: "Motor",
    texto: "Motor de motocicleta de até 710 cm³ montado atrás do piloto, com o câmbio sequencial do próprio motor. O radiador fica exposto no lado direito, logo atrás do piloto.",
    cam: { pos: [-1.9, 1.5, 1.7], tgt: [-0.5, 0.4, 0] },
    estado: { xray: 0.35 },
  },
  admissao: {
    nome: "Admissão e restritor",
    texto: "Todo o ar que o motor respira passa por um restritor de 20 mm de diâmetro (19 mm com etanol). É ele que limita a potência de todos os carros da categoria.",
    cam: { pos: [-1.6, 1.6, 1.2], tgt: [-0.6, 0.72, 0] },
    estado: {},
  },
  escape: {
    nome: "Escape",
    texto: "Quatro coletores se juntam num só e terminam no silencioso. Antes de andar na pista o carro passa por um teste de ruído.",
    cam: { pos: [-2.1, 0.9, -1.6], tgt: [-0.9, 0.35, -0.2] },
    estado: { heat: 0.8 },
  },
  transmissao: {
    nome: "Transmissão final",
    texto: "Uma corrente leva o torque do pinhão do motor até a coroa no diferencial, que divide a força entre as rodas traseiras pelos semieixos.",
    cam: { pos: [-1.5, 0.7, -1.5], tgt: [-0.65, 0.22, -0.05] },
    estado: { xray: 0.8 },
  },
  aero: {
    nome: "Pacote aerodinâmico",
    texto: "Asa dianteira de três elementos e asa traseira de dois (plano principal e flap bem inclinado). Elas geram força para baixo e aumentam a aderência nas curvas, com o custo de mais arrasto nas retas.",
    cam: { pos: [-3.0, 1.75, 2.5], tgt: [-0.9, 0.95, 0] },
    estado: { air: 1 },
  },
  cockpit: {
    nome: "Cockpit",
    texto: "Banco moldado, volante com painel e cinto de vários pontos. Na inspeção, o piloto tem 5 segundos para sair do carro.",
    cam: { pos: [1.2, 1.6, 1.0], tgt: [0.1, 0.45, 0] },
    estado: { xray: 0.5 },
  },
};

export const VIEWS = {
  "34": { pos: [3.4, 1.45, 3.6], tgt: [0, 0.38, 0] },
  lado: { pos: [0.1, 0.75, 5.4], tgt: [0, 0.45, 0] },
  frente: { pos: [5.0, 0.8, 0.01], tgt: [0, 0.4, 0] },
  topo: { pos: [0.01, 6.0, 0.02], tgt: [0, 0.3, 0] },
  tras: { pos: [-3.6, 1.6, -2.8], tgt: [-0.2, 0.45, 0] },
};
