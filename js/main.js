(function () {
  "use strict";

  var C = window.TAURUS || {};
  var eq = C.equipe || {};
  var ct = C.contato || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  var ICONS = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 100 12.4 6.2 6.2 0 000-12.4zM12 16a4 4 0 110-8 4 4 0 010 8zm6.4-11.8a1.4 1.4 0 100 2.9 1.4 1.4 0 000-2.9z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1c0 6 4.4 11 10.1 11.9v-8.4H7.1v-3.5h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.3h3.4l-.5 3.5h-2.9V24C19.6 23.1 24 18.1 24 12.1z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6h.1c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 110-4.2 2.1 2.1 0 010 4.2zM7.1 20.5H3.6V9h3.5v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 4h20a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V6a2 2 0 012-2zm10 8.6L2.4 6.2v1.9L12 14.5l9.6-6.4V6.2L12 12.6z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.6.8.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1112 21.8zM20.5 3.5A11.8 11.8 0 001.7 17.7L0 24l6.4-1.7A11.8 11.8 0 0024 12c0-3.2-1.2-6.1-3.5-8.5z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0a8 8 0 00-8 8c0 6 8 16 8 16s8-10 8-16a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/></svg>',
  };

  document.documentElement.classList.remove("no-js");

  /* ---------- contato principal ---------- */
  function mailto(subject) {
    return "mailto:" + ct.email + "?subject=" + encodeURIComponent(subject);
  }
  var primaryContact = ct.email
    ? mailto("Patrocínio · Taurus Racing")
    : ct.instagram;

  var ctaSponsor = $("#cta-sponsor");
  if (ctaSponsor) {
    ctaSponsor.href = primaryContact;
    if (!ct.email) { ctaSponsor.target = "_blank"; ctaSponsor.rel = "noopener"; ctaSponsor.textContent = "Pedir proposta no Instagram"; }
  }
  if (ct.midiaKit) {
    var kit = $("#cta-kit");
    kit.href = ct.midiaKit;
    kit.hidden = false;
  }

  /* ---------- nav ---------- */
  var nav = $("#nav");
  var toggle = $("#nav-toggle");
  var links = $("#nav-links");
  var bar = $("#progress-bar");

  function closeMenu() {
    links.classList.remove("is-open");
    nav.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu");
  }
  toggle.addEventListener("click", function () {
    var open = !links.classList.contains("is-open");
    links.classList.toggle("is-open", open);
    nav.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  });
  $$("a", links).forEach(function (a) { a.addEventListener("click", closeMenu); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 20);
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  // link ativo conforme a seção visível
  var navMap = {};
  $$('a[href^="#"]', links).forEach(function (a) { navMap[a.getAttribute("href").slice(1)] = a; });
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && navMap[en.target.id]) {
          Object.keys(navMap).forEach(function (k) { navMap[k].classList.remove("is-active"); });
          navMap[en.target.id].classList.add("is-active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach(function (s) { spy.observe(s); });
  }

  /* ---------- números do hero ---------- */
  if (eq.membros) {
    var m = $('.stats [data-count="32"]');
    if (m) { m.dataset.count = eq.membros; m.textContent = eq.membros; }
  }
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function countUp(node) {
    var end = parseInt(node.dataset.count, 10);
    if (isNaN(end) || reduce) return;
    var start = node.hasAttribute("data-plain") ? end - 40 : 0;
    var t0 = null, dur = 1400;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      node.textContent = Math.round(start + (end - start) * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  $$(".stats [data-count]").forEach(countUp);

  /* ---------- abas de provas ---------- */
  var tabs = $$(".tab");
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      panel.hidden = !on;
      panel.classList.toggle("is-active", on);
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t); });
    t.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        var next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        selectTab(next); next.focus();
      }
    });
  });

  /* ---------- carro ---------- */
  var car = C.carro || {};
  if (car.nome) $("#car-name").textContent = car.nome;
  if (car.categoria) $("#car-cat").textContent = car.categoria;

  // posição de cada ponto no desenho (% da largura, % da altura)
  var HOTSPOTS = {
    "Chassi": [45, 50],
    "Suspensão": [70, 70],
    "Motor": [34, 51],
    "Transmissão": [22, 64],
    "Freios": [76, 83],
    "Aerodinâmica": [16, 26],
  };
  var ficha = car.ficha || [];
  var hsWrap = $("#hotspots");
  var hsButtons = [];
  function showSpec(item, btn) {
    $("#panel-title").textContent = item.rotulo;
    $("#panel-value").textContent = item.valor || "";
    $("#panel-text").textContent = item.texto || "";
    hsButtons.forEach(function (b) { b.classList.toggle("is-active", b === btn); });
  }
  ficha.forEach(function (item) {
    var pos = HOTSPOTS[item.rotulo];
    if (!pos || !item.texto) return;
    var b = el("button", { class: "hotspot", type: "button", "aria-label": item.rotulo, style: "left:" + pos[0] + "%;top:" + pos[1] + "%" }, [
      el("span", { text: item.rotulo }),
    ]);
    b.addEventListener("click", function () { showSpec(item, b); });
    b.addEventListener("mouseenter", function () { showSpec(item, b); });
    hsWrap.appendChild(b);
    hsButtons.push(b);
  });
  var firstWithHs = ficha.filter(function (f) { return HOTSPOTS[f.rotulo] && f.texto; })[0];
  if (firstWithHs) showSpec(firstWithHs, hsButtons[0]);

  var specs = $("#specs");
  var withValue = ficha.filter(function (f) { return f.valor; });
  if (withValue.length) {
    ficha.forEach(function (f) {
      specs.appendChild(el("div", {}, [
        el("dt", { text: f.rotulo }),
        el("dd", { text: f.valor || "Em definição", class: f.valor ? "" : "is-empty" }),
      ]));
    });
  } else {
    specs.hidden = true;
  }

  /* ---------- linha do tempo ---------- */
  var tl = $("#timeline");
  (C.linhaDoTempo || []).forEach(function (it) {
    tl.appendChild(el("li", { class: "tl reveal" + (it.destaque ? " tl--hl" : "") }, [
      el("div", { class: "tl__card" }, [
        el("div", { class: "tl__year", text: it.ano }),
        el("h3", { text: it.titulo }),
        el("p", { text: it.texto }),
      ]),
    ]));
  });

  /* ---------- membros ---------- */
  var membros = C.membros || [];
  if (membros.length) {
    $("#membros-wrap").hidden = false;
    var mg = $("#membros");
    membros.forEach(function (p) {
      var initials = (p.nome || "?").split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase();
      var photo = p.foto
        ? el("img", { src: p.foto, alt: "Foto de " + p.nome, loading: "lazy" })
        : el("span", { class: "member__initials", text: initials });
      var meta = [p.area, p.curso].filter(Boolean).join(" · ");
      mg.appendChild(el("article", { class: "member reveal" }, [
        el("div", { class: "member__photo" }, [photo]),
        el("div", { class: "member__body" }, [
          p.cargo ? el("div", { class: "member__role", text: p.cargo }) : null,
          el("h4", { text: p.nome }),
          meta ? el("p", { class: "member__meta", text: meta }) : null,
          p.linkedin ? el("a", { href: p.linkedin, target: "_blank", rel: "noopener", text: "LinkedIn ↗" }) : null,
        ]),
      ]));
    });
  }

  /* ---------- patrocinadores ---------- */
  var sp = $("#sponsors");
  var tiersOrder = [
    ["diamante", "Diamante"], ["ouro", "Ouro"], ["prata", "Prata"], ["apoio", "Apoiadores"],
  ];
  var patrocinadores = C.patrocinadores || [];
  function slot() {
    var a = el("a", { class: "sponsor sponsor--slot", href: primaryContact, html: "<div><b>+</b>Sua marca aqui</div>" });
    if (!ct.email) { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }
  if (patrocinadores.length) {
    tiersOrder.forEach(function (t) {
      var list = patrocinadores.filter(function (p) { return (p.cota || "apoio") === t[0]; });
      if (!list.length) return;
      var grid = el("div", { class: "sponsors__grid" });
      list.forEach(function (p) {
        var inner = p.logo ? el("img", { src: p.logo, alt: p.nome, loading: "lazy" }) : document.createTextNode(p.nome);
        var card = el(p.site ? "a" : "div", { class: "sponsor" + (p.logo ? "" : " sponsor--text"), title: p.nome }, [inner]);
        if (p.site) { card.href = p.site; card.target = "_blank"; card.rel = "noopener"; }
        grid.appendChild(card);
      });
      sp.appendChild(el("div", { class: "sponsors__group" }, [el("p", { class: "sponsors__label", text: t[1] }), grid]));
    });
    var last = el("div", { class: "sponsors__grid" }, [slot()]);
    sp.appendChild(el("div", { class: "sponsors__group" }, [last]));
  } else {
    sp.appendChild(el("div", { class: "sponsors__group" }, [
      el("p", { class: "sponsors__label", text: "Parceiros da temporada" }),
      el("div", { class: "sponsors__grid" }, [slot(), slot(), slot(), slot()]),
    ]));
  }

  /* ---------- galeria ---------- */
  var gal = $("#gallery");
  var fotos = C.galeria || [];
  var lb;
  function openLightbox(f) {
    if (!lb) {
      lb = el("div", { class: "lightbox", role: "dialog", "aria-modal": "true", "aria-label": "Foto ampliada" }, [
        el("button", { type: "button", "aria-label": "Fechar", text: "×" }),
        el("figure", {}, [el("img", { alt: "" }), el("p")]),
      ]);
      lb.addEventListener("click", function (e) { if (e.target === lb || e.target.tagName === "BUTTON") closeLightbox(); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && lb && !lb.hidden) closeLightbox(); });
      document.body.appendChild(lb);
    }
    $("img", lb).src = f.src;
    $("img", lb).alt = f.legenda || "";
    $("p", lb).textContent = f.legenda || "";
    lb.hidden = false;
    $("button", lb).focus();
  }
  function closeLightbox() { lb.hidden = true; }

  if (fotos.length) {
    fotos.forEach(function (f) {
      var fig = el("figure", { class: "reveal", tabindex: "0" }, [
        el("img", { src: f.src, alt: f.legenda || "Foto da Taurus Racing", loading: "lazy" }),
        f.legenda ? el("figcaption", { text: f.legenda }) : null,
      ]);
      fig.addEventListener("click", function () { openLightbox(f); });
      fig.addEventListener("keydown", function (e) { if (e.key === "Enter") openLightbox(f); });
      gal.appendChild(fig);
    });
  }
  // atalho para o Instagram (sempre no fim da galeria)
  var tiles = "";
  ["T", "R", "39", "UF", "TM", "FSAE"].forEach(function (t) { tiles += "<span>" + t + "</span>"; });
  gal.appendChild(el("div", { class: "insta reveal" }, [
    el("div", {}, [
      el("h3", { text: "Os bastidores estão no Instagram" }),
      el("p", { text: "Solda do chassi, testes, viagens para a competição e o dia a dia da oficina. Tudo sai primeiro no " + (ct.instagramUser || "Instagram") + "." }),
      el("a", { class: "btn btn--primary", href: ct.instagram, target: "_blank", rel: "noopener", text: "Seguir " + (ct.instagramUser || "") }),
    ]),
    el("div", { class: "insta__tiles", "aria-hidden": "true", html: tiles }),
  ]));

  /* ---------- processo seletivo ---------- */
  var ps = C.processoSeletivo || {};
  var st = $("#ps-status");
  st.textContent = ps.aberto ? "Inscrições abertas" : "Lista de interesse";
  st.classList.toggle("is-open", !!ps.aberto);
  $("#ps-text").textContent = ps.texto || "";

  var form = $("#join-form");
  var note = $("#form-note");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    note.className = "form__note";
    var ok = true;
    $$("[required]", form).forEach(function (f) {
      var bad = !f.value.trim() || (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value));
      f.classList.toggle("is-invalid", bad);
      if (bad) ok = false;
    });
    if (!ok) {
      note.textContent = "Preencha nome, e-mail válido e curso.";
      note.classList.add("is-err");
      return;
    }
    var data = new FormData(form);

    if (ct.formEndpoint) {
      note.textContent = "Enviando…";
      fetch(ct.formEndpoint, { method: "POST", body: data, headers: { Accept: "application/json" } })
        .then(function (r) {
          if (!r.ok) throw new Error();
          form.reset();
          note.textContent = "Recebemos! A equipe vai te chamar quando o processo seletivo abrir.";
          note.classList.add("is-ok");
        })
        .catch(function () {
          note.textContent = "Não foi possível enviar agora. Tente pelo Instagram " + (ct.instagramUser || "") + ".";
          note.classList.add("is-err");
        });
      return;
    }

    var body =
      "Nome: " + data.get("nome") + "\n" +
      "E-mail: " + data.get("email") + "\n" +
      "Curso: " + data.get("curso") + "\n" +
      "Período: " + (data.get("periodo") || "-") + "\n" +
      "Área de interesse: " + data.get("area") + "\n\n" +
      (data.get("mensagem") || "");

    if (ct.email) {
      window.location.href = mailto("Quero entrar na Taurus Racing") + "&body=" + encodeURIComponent(body);
      note.textContent = "Abrimos seu app de e-mail com a mensagem pronta. É só enviar.";
      note.classList.add("is-ok");
    } else {
      var copied = function () {
        note.innerHTML = "Mensagem copiada. Cole no direct do <a class=\"link\" target=\"_blank\" rel=\"noopener\" href=\"" + ct.instagram + "\">" + (ct.instagramUser || "Instagram") + "</a>.";
        note.classList.add("is-ok");
        window.open(ct.instagram, "_blank", "noopener");
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(body).then(copied, copied);
      } else {
        copied();
      }
    }
  });

  /* ---------- contato ---------- */
  var cards = $("#contact-cards");
  function ccard(icon, label, value, href) {
    var a = el("a", { class: "ccard reveal", href: href, html: ICONS[icon] }, [
      el("span", { text: label }), el("strong", { text: value }),
    ]);
    if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }
  if (ct.instagram) cards.appendChild(ccard("instagram", "Instagram", ct.instagramUser || "Instagram", ct.instagram));
  if (ct.email) cards.appendChild(ccard("mail", "E-mail", ct.email, "mailto:" + ct.email));
  if (ct.whatsapp) cards.appendChild(ccard("whatsapp", "WhatsApp", "Mandar mensagem", "https://wa.me/" + ct.whatsapp));
  if (ct.linkedin) cards.appendChild(ccard("linkedin", "LinkedIn", "Taurus Racing FSAE", ct.linkedin));
  if (ct.facebook) cards.appendChild(ccard("facebook", "Facebook", "taurusracingfsae", ct.facebook));
  $("#address").textContent = eq.endereco || "";

  var social = $("#footer-social");
  [["instagram", ct.instagram, "Instagram"], ["facebook", ct.facebook, "Facebook"], ["linkedin", ct.linkedin, "LinkedIn"]]
    .forEach(function (s) {
      if (!s[1]) return;
      social.appendChild(el("a", { href: s[1], target: "_blank", rel: "noopener", "aria-label": s[2], html: ICONS[s[0]] }));
    });
  $("#year").textContent = new Date().getFullYear();

  /* ---------- reveal on scroll ---------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var t = en.target;
        // pequeno atraso em cascata para irmãos
        var sibs = Array.prototype.indexOf.call(t.parentNode.children, t);
        t.style.transitionDelay = Math.min(sibs, 6) * 70 + "ms";
        t.classList.add("is-in");
        setTimeout(function () { t.style.transitionDelay = ""; }, 1300);
        io.unobserve(t);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    reveals.forEach(function (r) { io.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add("is-in"); });
  }
})();
