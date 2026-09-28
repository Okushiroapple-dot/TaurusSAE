# Taurus Racing · site oficial

Site da Taurus Racing, equipe de Fórmula SAE da Universidade Federal do Triângulo Mineiro (UFTM), em Uberaba/MG.

HTML, CSS e JavaScript puros. Não tem build, framework nem dependência: abre direto no navegador e roda em qualquer hospedagem estática.

## Seções

| Seção | O que mostra |
| --- | --- |
| Hero | Nome, número do carro, chamadas para patrocínio e para o carro, números da equipe |
| Equipe | O que é a Taurus e o ciclo projetar → fabricar → testar → competir |
| Áreas | Divisão interna da equipe e, se preenchida, a grade de membros |
| Competição | Provas estáticas e dinâmicas da Fórmula SAE Brasil, em abas |
| O carro | Desenho do carro com pontos clicáveis por sistema e ficha técnica |
| Trajetória | Linha do tempo desde 2015 |
| Extensão | O papel da equipe como projeto de extensão da UFTM |
| Patrocínio | Motivos para patrocinar, cotas, logos dos parceiros e contato |
| Galeria | Fotos (quando adicionadas) e atalho para o Instagram |
| Faça parte | Formulário de interesse no processo seletivo |
| Contato | Redes sociais, e-mail, WhatsApp e mapa do ICTE |

## Como atualizar o conteúdo

Quase tudo fica em **`js/config.js`**. Não precisa mexer no HTML.

- **E-mail e WhatsApp**: preencha `contato.email` e `contato.whatsapp`. Enquanto estiverem vazios, os botões de contato levam para o Instagram.
- **Membros**: adicione objetos em `membros`. Fotos vão em `assets/img/equipe/` (formato retrato, 4:5).
- **Patrocinadores**: adicione em `patrocinadores` com a `cota` (`diamante`, `ouro`, `prata` ou `apoio`). Logos em `assets/img/patrocinadores/` (SVG ou PNG com fundo transparente).
- **Galeria**: coloque as fotos em `assets/img/galeria/` e liste em `galeria`.
- **Ficha técnica**: preencha `valor` em `carro.ficha` (ex.: `"Aço SAE 4130"`, `"215 kg"`). A tabela aparece quando pelo menos um valor estiver preenchido.
- **Linha do tempo**: acrescente marcos em `linhaDoTempo`. `destaque: true` deixa o card vermelho.
- **Processo seletivo**: `processoSeletivo.aberto = true` troca o selo para "Inscrições abertas".
- **Formulário direto no e-mail**: crie um formulário grátis no [Formspree](https://formspree.io) e cole o endereço em `contato.formEndpoint`. Sem isso, o formulário abre o app de e-mail (se houver e-mail configurado) ou copia a mensagem e abre o Instagram.
- **Mídia kit**: salve o PDF em `assets/` e coloque o caminho em `contato.midiaKit`. Aparece um botão de download na seção de patrocínio.

### Logo e cores

- O logo em `assets/img/logo.svg` é provisório. Troque pelo logo oficial da equipe mantendo o mesmo nome de arquivo (e copie também para `favicon.svg`).
- As cores ficam no topo de `css/style.css`, nas variáveis `--red`, `--amber` e `--bg`.
- A imagem que aparece quando o link é compartilhado no WhatsApp/Instagram é `assets/img/og-image.png` (1200×630).

## Ver no computador

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
index.html            página única
css/style.css         estilos (cores e fontes no topo)
js/config.js          conteúdo editável
js/main.js            interações e renderização do conteúdo
assets/fonts/         Barlow Condensed e Inter (licença OFL)
assets/img/           logo, favicon, imagem de compartilhamento, fotos
```

## Fontes das informações

Os dados públicos usados no site (fundação em 2015, 32 membros, cursos, TR1 em 37º na Fórmula SAE Brasil 2018, TR2, carro nº 39 na 21ª edição em 2025) vêm das páginas da equipe no LinkedIn, Facebook e Instagram e das listas oficiais da SAE Brasil. Confira e atualize o que tiver mudado.
