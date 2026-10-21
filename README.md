# Taurus Racing · site oficial

Site da Taurus Racing, equipe de Fórmula SAE da Universidade Federal do Triângulo Mineiro (UFTM), em Uberaba/MG.

HTML, CSS e JavaScript puros, sem etapa de build. O 3D usa [Three.js](https://threejs.org), que já vem empacotado em `vendor/` (não depende de CDN). Roda em qualquer hospedagem estática.

## O que tem no site

| Página | Arquivo | O que tem |
| --- | --- | --- |
| Início | `index.html` | Abertura com o TR-04 em 3D, o que é a equipe, o ciclo projetar → fabricar → testar → competir, o papel como projeto de extensão da UFTM, a grade de membros (se preenchida) e atalhos para as outras páginas |
| Oficina 3D | `oficina.html` | Tour com rolagem guiada: a câmera passa pela carenagem, pelo chassi em raio-X, pela suspensão, pelo motor com o escape aquecido, pelo fluxo de ar nas asas e termina na vista explodida. Depois, a garagem: girar o carro, raio-X, vista explodida, direção, suspensão, pintura, pontos clicáveis, partida no motor com conta-giros e som, e modo foto com traçado de raios |
| Laboratório | `laboratorio.html` | Volta de autocross com mapa animado e diagrama g-g, aceleração de 75 m, skidpad e geometria de suspensão duplo A com pontos arrastáveis. `laboratorio.html#suspensao` (ou `#aceleracao`, `#skidpad`) abre direto na aba |
| Competição | `competicao.html` | Provas estáticas e dinâmicas da Fórmula SAE Brasil, linha do tempo desde 2015 e galeria |
| Patrocínio | `patrocinio.html` | Cotas, logos dos parceiros e uma prévia 3D: a empresa escolhe o logo e vê na lateral do carro (a imagem não sai do navegador) |
| Faça parte | `processo-seletivo.html` | Situação do processo seletivo, requisitos, formulário da lista de interesse e as áreas da equipe |
| Contato | `contato.html` | Redes, mapa e formulário de mensagem. `contato.html?assunto=Patrocínio` já abre com o assunto escolhido (é para onde vai o botão "Pedir proposta") |

O menu e o rodapé se repetem no topo e no fim de cada arquivo `.html`. Para mudar um link do menu, mude nos sete arquivos. O 3D só é baixado nas páginas que mostram o carro (início, oficina e patrocínio).

O modelo 3D é o TR-04 redesenhado em código a partir de fotos do carro, então as medidas são aproximadas. Os números das simulações são típicos de um Fórmula SAE a combustão, não os do carro da equipe.

## Como atualizar o conteúdo

Quase tudo fica em **`js/config.js`**. Não precisa mexer no HTML.

- **E-mail e WhatsApp**: preencha `contato.email` e `contato.whatsapp`. Enquanto estiverem vazios, os botões de contato levam para o Instagram.
- **Membros**: adicione objetos em `membros`. Fotos vão em `assets/img/equipe/` (formato retrato, 4:5).
- **Patrocinadores**: adicione em `patrocinadores` com a `cota` (`diamante`, `ouro`, `prata` ou `apoio`). Logos em `assets/img/patrocinadores/` (SVG ou PNG com fundo transparente).
- **Galeria**: coloque as fotos em `assets/img/galeria/` e liste em `galeria`.
- **Ficha técnica**: preencha `valor` em `carro.ficha` (ex.: `"Aço SAE 4130"`). Na garagem 3D, o valor aparece no painel quando alguém clica no sistema correspondente.
- **Linha do tempo**: acrescente marcos em `linhaDoTempo`. `destaque: true` destaca o card.
- **Processo seletivo**: `processoSeletivo.aberto = true` troca o selo para "Inscrições abertas".
- **Formulários**: "Faça parte" e "Fale com a Taurus" gravam no Firestore (veja [Formulários no Firebase](#formulários-no-firebase)). Se o Firebase falhar, o site usa o [Formspree](https://formspree.io) (endereço em `contato.formEndpoint`), abre o app de e-mail (se houver e-mail configurado) ou copia a mensagem e abre o Instagram.
- **Mídia kit**: salve o PDF em `assets/` e coloque o caminho em `contato.midiaKit`.

### Textos do 3D e das simulações

- Textos dos pontos clicáveis da garagem e enquadramento da câmera: `js/3d/parts.js`.
- Capítulos da abertura (texto): `oficina.html`, seção `#topo`. Câmera e estado do carro em cada capítulo: lista `STEPS` em `js/3d/stage.js`.
- Carro de referência das simulações (massa, potência, pneu, asas): `REFERENCE` em `js/lab/physics.js`.
- Traçado do autocross: pontos de controle em `js/lab/track.js`.

### Logo e cores

- O logo em `assets/img/logo.svg` é provisório. Troque pelo logo oficial mantendo o nome do arquivo (e copie também para `favicon.svg`).
- A paleta é preto, branco e laranja papaya (#FF8000), inspirada na McLaren. As cores ficam no topo de `css/style.css`. A pintura do carro 3D fica em `PAINTS`, em `js/3d/car.js` (`taurus` é a pintura real do TR-04; as outras são opções da garagem).
- A imagem que aparece quando o link é compartilhado é `assets/img/og-image.png` (1200×630).

## Ver no computador

O 3D usa módulos JavaScript, então o site precisa ser aberto por um servidor (abrir o arquivo com dois cliques não funciona):

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Publicar

O site oficial fica no **Firebase Hosting**, no projeto `taurus-racing`: <https://taurus-racing.web.app>. Uma cópia continua no GitHub Pages. Os dois são atualizados sozinhos a cada merge na `main`.

### Firebase Hosting

Configuração (uma vez só, pelo navegador):

1. **App da Web**: no [console do Firebase](https://console.firebase.google.com/project/taurus-racing/settings/general), em *Configurações do projeto → Geral → Seus apps*, adicione um app da Web (ícone `</>`), marque "Configurar também o Firebase Hosting" e conclua sem rodar os comandos que ele mostra. Copie o bloco `firebaseConfig` para `firebase` em `js/config.js`.
2. **Firestore**: em *Firestore Database → Criar banco de dados*, escolha a região `southamerica-east1 (São Paulo)` e o modo de produção.
3. **Conta de serviço para o GitHub**: no [Google Cloud](https://console.cloud.google.com/iam-admin/serviceaccounts?project=taurus-racing), crie uma conta de serviço (ex.: `github-taurussae`) com estes papéis:
   - Administrador do Firebase Hosting (`roles/firebasehosting.admin`)
   - Leitor de chaves de API (`roles/serviceusage.apiKeysViewer`)
   - Administrador do Firebase Authentication (`roles/firebaseauth.admin`), usado pelas prévias dos PRs
   - Leitor do Cloud Run (`roles/run.viewer`)
   - Administrador de regras do Firebase (`roles/firebaserules.admin`), usado para publicar `firestore.rules`

   Depois abra a conta, vá em *Chaves → Adicionar chave → JSON* e baixe o arquivo.
4. **Segredo no GitHub**: em *Settings → Secrets and variables → Actions → New repository secret*, crie `FIREBASE_SERVICE_ACCOUNT_TAURUS_RACING` e cole o conteúdo inteiro do JSON. Depois apague o arquivo do computador.

A partir daí:

- Cada merge na `main` roda `.github/workflows/firebase-hosting-merge.yml`, que publica as regras do Firestore (`tools/deploy-rules.mjs`) e o site.
- Cada PR ganha uma prévia com link próprio, comentado no PR, que expira em 7 dias (`.github/workflows/firebase-hosting-pull-request.yml`).
- Enquanto o segredo não existir, os dois workflows só deixam um aviso e não falham.

O que é publicado e os cabeçalhos de cache ficam em `firebase.json`. O site é a raiz do repositório; `README.md`, `tools/`, as regras e os arquivos ocultos ficam de fora.

Para publicar do próprio computador (opcional, precisa do Node.js): `npm install -g firebase-tools`, `firebase login` e `firebase deploy` na pasta do repositório. Se o Firestore ainda não existir, o deploy cria o banco em São Paulo (`southamerica-east1`, definido em `firebase.json`).

### Formulários no Firebase

- "Faça parte" grava na coleção `inscricoes` e "Fale com a Taurus" na coleção `mensagens` do Firestore.
- Para ver as respostas: console do Firebase → *Firestore Database → Dados*. Cada documento tem os campos do formulário, `criadoEm` (data e hora do servidor) e `origem` (endereço da página).
- As regras (`firestore.rules`) só deixam o site **criar** documentos, com os campos certos e tamanho limitado. Ninguém lê, altera ou apaga pelo site. Os formulários também têm um campo escondido que pega robôs.
- O pacote do Firebase (`vendor/firebase.bundle.min.js`, 128 KB) só é baixado quando alguém clica em enviar.
- Para receber um e-mail a cada resposta dá para instalar a extensão "Trigger Email" do Firebase, mas ela exige o plano Blaze (pago por uso).

### GitHub Pages (cópia)

1. No GitHub, vá em **Settings → Pages** e em *Source* escolha **GitHub Actions**.
2. Faça merge na branch `main`. O workflow `.github/workflows/pages.yml` publica o site sozinho a cada push.
3. O endereço fica `https://<usuario>.github.io/<repositorio>/`.

Na cópia do GitHub Pages os formulários só gravam no Firestore se a configuração do app da Web estiver preenchida em `js/config.js`. A página aponta o Firebase como endereço oficial (`<link rel="canonical">`), para o Google não tratar as duas como conteúdo duplicado.

### Netlify ou Vercel

Importe o repositório e deixe o comando de build vazio. A pasta publicada é a raiz.

## Estrutura

```
index.html              página inicial
oficina.html            oficina 3D (tour e garagem)
laboratorio.html        simulações
competicao.html         competição, trajetória e galeria
patrocinio.html         patrocínio
processo-seletivo.html  faça parte
contato.html            contato
css/style.css           estilos (cores e fontes no topo)
js/config.js            conteúdo editável
js/main.js              menu, formulários, galeria, patrocinadores, contato
js/forms.js             envio dos formulários para o Firestore
js/app.js               liga o 3D, o laboratório e a tela de carregamento
js/3d/car.js            modelo 3D do carro (chassi, suspensão, motor, asas, pintura)
js/3d/stage.js          cena, luzes, câmera guiada pela rolagem, garagem e prévia do patrocinador
js/3d/airflow.js        visualização do fluxo de ar
js/3d/engine-audio.js   som do motor (Web Audio)
js/3d/parts.js          textos dos sistemas na garagem
js/3d/textures.js       texturas e estúdio gerados em código
js/3d/photo.js          modo foto (path tracing)
js/lab/physics.js       modelo do carro, volta, aceleração e skidpad
js/lab/track.js         traçado do autocross
js/lab/suspension.js    cinemática da suspensão duplo A
js/lab/lab.js           interface das simulações
vendor/                 Three.js e three-gpu-pathtracer (licença MIT) e Firebase (Apache 2.0) empacotados
tools/                  script dos pacotes de vendor/ e publicação das regras do Firestore
firebase.json           configuração do Firebase Hosting e do Firestore
.firebaserc             projeto padrão do Firebase (taurus-racing)
firestore.rules         regras de segurança do Firestore
assets/fonts/           Barlow Condensed e Inter (licença OFL)
assets/img/             logo, favicon, imagem de compartilhamento, fotos
```

Para atualizar o Three.js, o path tracer e o Firebase: `bash tools/build-vendor.sh` (precisa de Node.js).

## Gráficos

- Iluminação de estúdio gerada em código (softboxes e faixas de luz que desenham os reflexos longos na pintura).
- Materiais físicos: preto fosco da carenagem, camuflado laranja e cinza das asas com os patrocinadores, fibra de carbono em sarja com relevo, alumínio usinado, alumínio fundido, pneu de rua com banda de rodagem e letreiro no flanco, escape com a coloração do calor e disco de freio furado. Todas as texturas são desenhadas em canvas (`js/3d/textures.js`).
- No computador: piso com reflexo, oclusão de ambiente (GTAO), antisserrilhado por multiamostragem, bloom, vinheta e grão de filme. A sombra de contato funciona em todos os aparelhos.
- Modo foto: path tracing com [three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer). O módulo só é baixado quando alguém liga o modo foto. A imagem fica mais limpa a cada amostra; numa placa de vídeo comum fica boa em alguns segundos.
- Para testar a qualidade: `?hq=1` na URL força a qualidade máxima e `?lq=1` a mínima.

## Compatibilidade

- Navegadores sem WebGL mostram um desenho do carro no lugar do 3D; o resto do site funciona normalmente.
- Em celulares o 3D usa menos partículas, sem reflexo no piso nem pós-processamento, e a garagem só gira o carro depois de tocar em "Girar o carro", para não atrapalhar a rolagem.
- Quem ativa "reduzir movimento" no sistema vê menos animação.

## Fontes das informações

Os dados públicos usados no site (fundação em 2015, 32 membros, cursos, TR1 em 37º na Fórmula SAE Brasil 2018, TR2, carro nº 39 na 21ª edição em 2025) vêm das páginas da equipe no LinkedIn, Facebook e Instagram e das listas oficiais da SAE Brasil. As regras citadas (restritor de 20 mm, motor até 710 cm³, saída do piloto em 5 segundos, dois circuitos de freio) são do regulamento da Fórmula SAE. Confira e atualize o que tiver mudado.
