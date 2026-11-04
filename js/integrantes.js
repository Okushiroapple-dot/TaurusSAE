/*
 * Página Integrantes: liderança e departamentos, a partir de js/config.js
 * (TAURUS.departamentos e TAURUS.membros).
 * Quem não tem foto ganha um avatar ilustrado, gerado a partir do nome:
 * o mesmo nome sempre dá o mesmo desenho.
 */
(function () {
  "use strict";

  var C = window.TAURUS || {};
  var root = document.getElementById("integrantes");
  if (!root) return;

  /* ---------- avatar ilustrado ---------- */
  var SKIN = ["#f3cfb3", "#e8b896", "#d29a72", "#b97d55", "#94603d", "#6e432a", "#4f2f1e"];
  var HAIR = ["#141416", "#2b1d16", "#4a2f1e", "#6e4428", "#a56f3c", "#d6b57e", "#5a1e14"];
  var SHIRT = [
    { body: "#16161a", trim: "#ff7a00" }, // camiseta preta da equipe
    { body: "#ff7a00", trim: "#16161a" }, // camiseta laranja
    { body: "#2a2a31", trim: "#ff7a00" }, // cinza escuro
  ];

  // hash simples e estável do nome (FNV-1a)
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function picker(seed) {
    var s = seed || 1;
    return function (n) {
      s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
      s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0;
      s = (s ^ (s >>> 16)) >>> 0;
      return s % n;
    };
  }

  var uid = 0;
  function avatar(nome) {
    var r = picker(hash(nome || "?"));
    var skin = SKIN[r(SKIN.length)];
    var hair = HAIR[r(HAIR.length)];
    var shirt = SHIRT[r(SHIRT.length)];
    var style = r(7);
    var glasses = r(8) === 0;
    var beard = style !== 3 && style !== 4 && r(6) === 0;
    var id = "av" + (++uid);

    var back = "", top = "";
    if (style === 0) { // curto
      top = '<path d="M38 55 C36 33 49 26 61 26 C76 26 86 35 83 55 C80 45 72 39 61 39 C50 39 41 45 38 55 Z" fill="' + hair + '"/>';
    } else if (style === 1) { // franja de lado
      top = '<path d="M37 57 C35 33 50 25 63 26 C78 27 86 38 83 56 C78 47 70 43 64 37 C58 44 48 47 37 57 Z" fill="' + hair + '"/>';
    } else if (style === 2) { // comprido
      back = '<path d="M35 52 C35 30 48 24 60 24 C73 24 85 31 85 52 L88 96 C80 100 40 100 32 96 Z" fill="' + hair + '"/>';
      top = '<path d="M38 56 C37 36 48 29 60 29 C73 29 84 36 82 56 C76 44 67 40 58 40 C50 41 42 46 38 56 Z" fill="' + hair + '"/>';
    } else if (style === 3) { // cacheado
      top = '<g fill="' + hair + '">' +
        [[42, 40, 9], [51, 31, 10], [62, 28, 10], [73, 32, 10], [80, 42, 8.5], [39, 50, 7], [82, 52, 6.5], [60, 37, 9]]
          .map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '"/>'; }).join("") + "</g>";
    } else if (style === 4) { // coque
      back = '<circle cx="60" cy="22" r="9" fill="' + hair + '"/>';
      top = '<path d="M38 56 C36 34 48 28 60 28 C73 28 85 34 82 56 C78 45 70 40 60 40 C50 40 42 45 38 56 Z" fill="' + hair + '"/>';
    } else if (style === 5) { // raspado
      top = '<path d="M39 50 C39 35 49 30 60 30 C72 30 81 35 81 50 C76 43 69 40 60 40 C51 40 44 43 39 50 Z" fill="' + hair + '" opacity=".75"/>';
    } else { // topete
      top = '<path d="M38 54 C35 36 44 24 60 23 C74 22 87 30 83 53 C80 44 75 40 70 38 C64 41 52 41 44 44 C41 46 39 50 38 54 Z" fill="' + hair + '"/>';
    }

    return '<svg viewBox="17 18 86 86" role="img" aria-hidden="true" focusable="false">' +
      '<defs><clipPath id="' + id + '"><rect x="17" y="18" width="86" height="86"/></clipPath>' +
      '<radialGradient id="' + id + 'g" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#3a3a44"/><stop offset="1" stop-color="#23232a"/></radialGradient></defs>' +
      '<g clip-path="url(#' + id + ')">' +
      '<rect width="120" height="120" fill="url(#' + id + 'g)"/>' +
      back +
      // pescoço, corpo e gola
      '<path d="M51 74 h18 v14 c0 6 -18 6 -18 0 z" fill="' + skin + '"/>' +
      '<path d="M12 124 C14 98 34 86 60 86 C86 86 106 98 108 124 Z" fill="' + shirt.body + '"/>' +
      '<path d="M48 87 Q60 99 72 87" fill="none" stroke="' + shirt.trim + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M22 104 L30 98 M98 104 L90 98" stroke="' + shirt.trim + '" stroke-width="3" stroke-linecap="round"/>' +
      // cabeça
      '<circle cx="39" cy="59" r="4.5" fill="' + skin + '"/><circle cx="81" cy="59" r="4.5" fill="' + skin + '"/>' +
      '<ellipse cx="60" cy="56" rx="21" ry="24" fill="' + skin + '"/>' +
      (beard ? '<path d="M40 60 C42 78 52 82 60 82 C68 82 78 78 80 60 C76 70 70 72 60 72 C50 72 44 70 40 60 Z" fill="' + hair + '" opacity=".85"/>' : "") +
      top +
      // rosto
      '<path d="M48 51 h7 M65 51 h7" stroke="' + hair + '" stroke-width="2" stroke-linecap="round" opacity=".8"/>' +
      '<circle cx="52" cy="58" r="2.2" fill="#1a1a1e"/><circle cx="68" cy="58" r="2.2" fill="#1a1a1e"/>' +
      '<path d="M54 68 Q60 72.5 66 68" fill="none" stroke="#5b2f22" stroke-width="2" stroke-linecap="round"/>' +
      (glasses ? '<g fill="none" stroke="#e9e9ee" stroke-width="1.6"><rect x="45" y="53" width="13" height="10" rx="4"/><rect x="62" y="53" width="13" height="10" rx="4"/><path d="M58 57 h4"/></g>' : "") +
      "</g></svg>";
  }

  /* ---------- página ---------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function text(tag, cls, t) {
    var n = el(tag, cls);
    n.textContent = t;
    return n;
  }

  function card(p, lead) {
    var a = el("article", "person" + (lead ? " person--lead" : "") + (p.diretor ? " person--head" : ""));
    var pic = el("div", "person__avatar");
    if (p.foto) {
      var img = document.createElement("img");
      img.src = p.foto;
      img.alt = "Foto de " + p.nome;
      img.loading = "lazy";
      pic.appendChild(img);
    } else {
      pic.innerHTML = avatar(p.nome);
    }
    a.appendChild(pic);
    var body = el("div", "person__body");
    body.appendChild(text("p", "person__role", p.cargo || "Membro"));
    body.appendChild(text("h4", "person__name", p.nome));
    var curso = (p.curso || "").replace(/^Engenharia /, "Eng. ");
    var meta = [curso, p.periodo ? p.periodo + " período" : ""].filter(Boolean).join(" · ");
    if (meta) body.appendChild(text("p", "person__meta", meta));
    if (p.linkedin) {
      var l = text("a", "person__link", "LinkedIn ↗");
      l.href = p.linkedin;
      l.target = "_blank";
      l.rel = "noopener";
      body.appendChild(l);
    }
    a.appendChild(body);
    return a;
  }

  var deps = C.departamentos || [];
  var pessoas = C.membros || [];
  var chips = document.getElementById("dep-chips");

  deps.forEach(function (d) {
    var lista = pessoas.filter(function (p) { return p.departamento === d.id; });
    if (!lista.length) return;
    // diretor(a) primeiro
    lista.sort(function (a, b) { return (b.diretor ? 1 : 0) - (a.diretor ? 1 : 0); });
    var lead = d.id === "lideranca";

    var sec = el("section", "dep reveal" + (lead ? " dep--lead" : ""));
    sec.id = "dep-" + d.id;
    var head = el("header", "dep__head");
    var h = text("h2", "dep__name", d.nome);
    head.appendChild(h);
    head.appendChild(text("span", "dep__count", lista.length + (lista.length === 1 ? " pessoa" : " pessoas")));
    if (d.descricao) head.appendChild(text("p", "dep__desc", d.descricao));
    sec.appendChild(head);
    var grid = el("div", "dep__grid" + (lead ? " dep__grid--lead" : ""));
    lista.forEach(function (p) { grid.appendChild(card(p, lead)); });
    sec.appendChild(grid);
    root.appendChild(sec);

    if (chips) {
      var c = text("a", "chip", d.nome);
      c.href = "#dep-" + d.id;
      chips.appendChild(c);
    }
  });

  var aviso = document.getElementById("demo-aviso");
  if (aviso) aviso.hidden = !C.integrantesDemo;
  var total = document.getElementById("total-integrantes");
  if (total) total.textContent = pessoas.length;
})();
