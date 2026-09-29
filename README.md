# Taurus Racing · site oficial

Site da Taurus Racing, equipe de Fórmula SAE da Universidade Federal do Triângulo Mineiro (UFTM), em Uberaba/MG.

HTML, CSS e JavaScript puros, sem etapa de build. O 3D usa [Three.js](https://threejs.org), que já vem empacotado em `vendor/` (não depende de CDN). Roda em qualquer hospedagem estática.

## O que tem no site

| Seção | O que faz |
| --- | --- |
| Abertura 3D | O TR-04, carro nº 38, em 3D. Conforme a pessoa rola a página, a câmera passa pela carenagem, pelo chassi em raio-X, pela suspensão se mexendo, pelo motor com o escape aquecido, pelo fluxo de ar na asa traseira e termina na vista explodida |
| Equipe | O que é a Taurus e o ciclo projetar → fabricar → testar → competir |
| Garagem 3D | O carro para girar à vontade: raio-X, fluxo de ar, vista explodida, direção, curso da suspensão, pintura, pontos clicáveis por sistema, partida no motor com conta-giros e som gerado no navegador, e modo foto com traçado de raios (salva a imagem em PNG) |
| Laboratório | Simulações: volta de autocross com mapa animado e diagrama g-g, aceleração de 75 m com semáforo de largada, skidpad e geometria de suspensão duplo A com pontos arrastáveis |
| Competição | Provas estáticas e dinâmicas da Fórmula SAE Brasil |
| Trajetória | Linha do tempo desde 2015 |
| Áreas | Divisão interna da equipe e, se preenchida, a grade de membros |
| Extensão | O papel da equipe como projeto de extensão da UFTM |
| Patrocínio | Cotas, logos dos parceiros e uma prévia 3D: a empresa escolhe o logo e vê na lateral do carro (a imagem não sai do navegador) |
| Galeria, Faça parte, Contato | Fotos, formulário do processo seletivo, redes e mapa |

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
- **Formulário direto no e-mail**: crie um formulário grátis no [Formspree](https://formspree.io) e cole o endereço em `contato.formEndpoint`. Sem isso, o formulário abre o app de e-mail (se houver e-mail configurado) ou copia a mensagem e abre o Instagram.
- **Mídia kit**: salve o PDF em `assets/` e coloque o caminho em `contato.midiaKit`.

### Textos do 3D e das simulações

- Textos dos pontos clicáveis da garagem e enquadramento da câmera: `js/3d/parts.js`.
- Capítulos da abertura (texto): `index.html`, seção `#topo`. Câmera e estado do carro em cada capítulo: lista `STEPS` em `js/3d/stage.js`.
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

### GitHub Pages (grátis)

1. No GitHub, vá em **Settings → Pages** e em *Source* escolha **GitHub Actions**.
2. Faça merge na branch `main`. O workflow `.github/workflows/pages.yml` publica o site sozinho a cada push.
3. O endereço fica `https://<usuario>.github.io/<repositorio>/`. Dá para apontar um domínio próprio (ex.: `taurusracing.com.br`) na mesma tela.

### Netlify ou Vercel

Importe o repositório e deixe o comando de build vazio. A pasta publicada é a raiz.

## Estrutura

```
index.html              página única
css/style.css           estilos (cores e fontes no topo)
js/config.js            conteúdo editável
js/main.js              menu, formulário, galeria, patrocinadores, contato
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
vendor/                 Three.js e three-gpu-pathtracer empacotados (licença MIT)
tools/                  script para atualizar o Three.js e o path tracer
assets/fonts/           Barlow Condensed e Inter (licença OFL)
assets/img/             logo, favicon, imagem de compartilhamento, fotos
```

Para atualizar o Three.js e o path tracer: `bash tools/build-vendor.sh` (precisa de Node.js).

## Gráficos

- Iluminação de estúdio gerada em código (softboxes e faixas de luz que desenham os reflexos longos na pintura).
- Materiais físicos: preto fosco da carenagem, camuflado laranja e cinza da asa com os patrocinadores, fibra de carbono em sarja com relevo, alumínio usinado, alumínio fundido, pneu de rua com banda de rodagem e letreiro no flanco, escape com a coloração do calor e disco de freio furado. Todas as texturas são desenhadas em canvas (`js/3d/textures.js`).
- No computador: piso com reflexo, oclusão de ambiente (GTAO), antisserrilhado por multiamostragem, bloom, vinheta e grão de filme. A sombra de contato funciona em todos os aparelhos.
- Modo foto: path tracing com [three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer). O módulo só é baixado quando alguém liga o modo foto. A imagem fica mais limpa a cada amostra; numa placa de vídeo comum fica boa em alguns segundos.
- Para testar a qualidade: `?hq=1` na URL força a qualidade máxima e `?lq=1` a mínima.

## Compatibilidade

- Navegadores sem WebGL mostram um desenho do carro no lugar do 3D; o resto do site funciona normalmente.
- Em celulares o 3D usa menos partículas, sem reflexo no piso nem pós-processamento, e a garagem só gira o carro depois de tocar em "Girar o carro", para não atrapalhar a rolagem.
- Quem ativa "reduzir movimento" no sistema vê menos animação.

## Fontes das informações

Os dados públicos usados no site (fundação em 2015, 32 membros, cursos, TR1 em 37º na Fórmula SAE Brasil 2018, TR2, carro nº 39 na 21ª edição em 2025) vêm das páginas da equipe no LinkedIn, Facebook e Instagram e das listas oficiais da SAE Brasil. As regras citadas (restritor de 20 mm, motor até 710 cm³, saída do piloto em 5 segundos, dois circuitos de freio) são do regulamento da Fórmula SAE. Confira e atualize o que tiver mudado.
