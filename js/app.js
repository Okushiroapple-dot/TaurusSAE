/*
 * Liga o palco 3D, o laboratório e a tela de carregamento.
 * O conteúdo textual do site continua em js/config.js + js/main.js.
 */
import { createStage } from "./3d/stage.js";
import { initLab } from "./lab/lab.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const cfg = window.TAURUS || {};

/* ---------- tela de carregamento (conta-giros) ---------- */
const loader = $("#loader");
const fill = $("#loader-fill");
const needle = $("#loader-needle");
const rpmTxt = $("#loader-rpm");
let ready = false, loaderGone = false;
const t0 = performance.now();
function loaderTick(now) {
  if (loaderGone) return;
  const el = (now - t0) / 1000;
  // sobe até 11 mil rpm, espera o 3D ficar pronto e então corta
  let k = Math.min(1, el / 1.3);
  k = 1 - Math.pow(1 - k, 3);
  if (ready && el > 1.3) k = Math.max(0, 1 - (el - 1.3) * 4);
  if (fill) fill.style.strokeDashoffset = String(100 - k * 100);
  if (needle) needle.style.transform = `rotate(${-90 + k * 180}deg)`;
  if (rpmTxt) rpmTxt.textContent = Math.round(k * 11000).toLocaleString("pt-BR");
  if ((ready && el > 1.55) || el > 7) {
    loaderGone = true;
    loader && loader.classList.add("is-done");
    document.documentElement.classList.add("is-loaded");
    setTimeout(() => loader && loader.remove(), 900);
    return;
  }
  requestAnimationFrame(loaderTick);
}
requestAnimationFrame(loaderTick);

/* ---------- palco 3D ---------- */
let stage = null;
try {
  stage = createStage({
    carNumber: (cfg.equipe && cfg.equipe.numeroCarro) || 39,
    story: { section: $("#topo"), host: $("#stage-story"), bar: $("#story-bar") },
    garage: {
      host: $("#stage-garage"),
      labels: $$("#garage-labels .hot3d"),
      onSelect: showInfo,
      onRpm: updateTach,
      onLeave: () => stopEngine(),
      onPhoto: (n) => { const el = $("#photo-samples"); if (el) el.textContent = Math.floor(n); },
      onPhotoEnd: () => photoUI(false),
    },
    sponsorHost: $("#stage-sponsor"),
    onReady: () => { ready = true; },
  });
} catch (err) {
  console.error(err);
  stage = null;
}
if (stage) window.taurus3d = stage;
if (!stage) {
  document.documentElement.classList.add("no-webgl");
  ready = true;
}

/* ---------- garagem: controles ---------- */
const info = $("#g-info");
// sistemas da garagem que têm linha correspondente na ficha técnica (config.js)
const FICHA = { chassi: "Chassi", suspensao: "Suspensão", powertrain: "Motor", transmissao: "Transmissão", freios: "Freios" };
function showInfo(name, part) {
  if (!info) return;
  if (!part) { info.hidden = true; return; }
  $("#g-info-title").textContent = part.nome;
  $("#g-info-text").textContent = part.texto;
  const item = ((cfg.carro && cfg.carro.ficha) || []).find((f) => f.rotulo === FICHA[name]);
  const val = $("#g-info-value");
  if (val) {
    val.textContent = item && item.valor ? "No carro da equipe: " + item.valor : "";
    val.hidden = !(item && item.valor);
  }
  info.hidden = false;
}
$("#g-info-close")?.addEventListener("click", () => stage && stage.select(null));

if (stage) {
  $$("[data-toggle]").forEach((b) =>
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(on));
      stage.set(b.dataset.toggle, on ? 1 : 0);
    })
  );
  const range = (id, out, fn) => {
    const el = $(id), o = $(out);
    el && el.addEventListener("input", () => { const t = fn(+el.value); if (o) o.textContent = t; });
  };
  range("#g-explode", "#o-explode", (v) => { stage.set("explode", v / 100); return v + "%"; });
  range("#g-steer", "#o-steer", (v) => { const r = (v / 100) * 0.35; stage.set("steer", r); return Math.round((r * 180) / Math.PI) + "°"; });
  range("#g-heave", "#o-heave", (v) => { const m = (v / 100) * 0.03; stage.set("heave", m); return Math.round(m * 1000) + " mm"; });
  $$("[data-paint]").forEach((b) =>
    b.addEventListener("click", () => {
      $$("[data-paint]").forEach((x) => x.classList.toggle("is-active", x === b));
      stage.paint(b.dataset.paint);
    })
  );
  $$("[data-view]").forEach((b) =>
    b.addEventListener("click", () => {
      $$("[data-view]").forEach((x) => x.classList.toggle("is-active", x === b));
      stage.view(b.dataset.view);
    })
  );
  $$("[data-zoom]").forEach((b) => b.addEventListener("click", () => stage.zoom(+b.dataset.zoom)));

  // celular: o dedo rola a página até a pessoa pedir para girar o carro
  const touchBtn = $("#g-touch");
  if (stage.isTouch && touchBtn) {
    touchBtn.hidden = false;
    let on = false;
    touchBtn.addEventListener("click", () => {
      on = !on;
      stage.setTouch(on);
      touchBtn.textContent = on ? "Voltar a rolar" : "Girar o carro";
      touchBtn.classList.toggle("is-on", on);
    });
  }

  // motor
  // modo foto (path tracing)
  const photoBtn = $("#g-photo"), photoSave = $("#g-photo-save");
  photoBtn.addEventListener("click", async () => {
    if (stage.photo.active) { stage.photo.stop(); return; }
    photoBtn.disabled = true;
    photoBtn.textContent = "Preparando a cena…";
    try {
      stopEngine();
      await stage.photo.start();
      photoUI(true);
    } catch (err) {
      console.error(err);
      photoBtn.textContent = "Não foi possível renderizar aqui";
      setTimeout(() => photoUI(false), 2500);
    } finally {
      photoBtn.disabled = false;
    }
  });
  photoSave.addEventListener("click", () => stage.photo.save());

  const engBtn = $("#g-engine"), thr = $("#g-throttle"), mute = $("#g-mute");
  engBtn.addEventListener("click", () => (stage.engine.on ? stopEngine() : startEngine()));
  const press = (v) => (e) => { if (!stage.engine.on) return; e.preventDefault(); stage.engine.throttle(v); thr.classList.toggle("is-down", v > 0); };
  thr.addEventListener("pointerdown", press(1));
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => thr.addEventListener(ev, press(0)));
  thr.addEventListener("contextmenu", (e) => e.preventDefault());
  const garageEl = $("#garagem");
  let garageInView = false;
  new IntersectionObserver((es) =>
    es.forEach((e) => {
      garageInView = e.isIntersecting;
      if (!garageInView) stopEngine(); // saiu da garagem: desliga o motor e o som
    })
  ).observe(garageEl);
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || !stage.engine.on || !garageInView) return;
    if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName) && document.activeElement !== thr) return;
    e.preventDefault();
    stage.engine.throttle(1);
    thr.classList.add("is-down");
  });
  window.addEventListener("keyup", (e) => {
    if (e.code !== "Space") return;
    stage.engine.throttle(0);
    thr.classList.remove("is-down");
  });
  mute.addEventListener("click", () => {
    const m = mute.getAttribute("aria-pressed") !== "true";
    mute.setAttribute("aria-pressed", String(m));
    mute.textContent = m ? "🔇" : "🔊";
    mute.setAttribute("aria-label", m ? "Ligar som" : "Sem som");
    stage.engine.mute(m);
  });
}
function photoUI(on) {
  const btn = $("#g-photo"), save = $("#g-photo-save"), hud = $("#photo-hud");
  if (!btn) return;
  btn.textContent = on ? "Sair do modo foto" : "Renderizar foto realista";
  btn.classList.toggle("is-on", on);
  save.hidden = !on;
  hud.hidden = !on;
  $("#garagem").classList.toggle("garage--photo", on);
  // o motor fica bloqueado durante a foto (a cena renderizada é uma cópia estática)
  $("#g-engine").disabled = on;
  $("#g-throttle").disabled = on || !(stage && stage.engine.on);
}
function startEngine() {
  if (!stage) return;
  stage.engine.start();
  const b = $("#g-engine"), t = $("#g-throttle");
  b.textContent = "Desligar";
  b.classList.add("is-on");
  t.disabled = false;
  $("#tach")?.classList.add("is-on");
}
function stopEngine() {
  if (!stage || !stage.engine.on) return;
  stage.engine.stop();
  const b = $("#g-engine"), t = $("#g-throttle");
  b.textContent = "Dar partida";
  b.classList.remove("is-on");
  t.disabled = true;
  t.classList.remove("is-down");
  $("#tach")?.classList.remove("is-on");
}

/* conta-giros */
const tachFill = $("#tach-fill"), tachNeedle = $("#tach-needle"), tachRpm = $("#tach-rpm");
const leds = $$("#tach-leds i");
let lastRpmTxt = -1;
function updateTach(rpm, limit, on) {
  const MAX = 14000;
  const k = Math.min(1, rpm / MAX);
  if (tachFill) tachFill.style.strokeDashoffset = String(100 - k * 100);
  if (tachNeedle) tachNeedle.style.transform = `rotate(${-90 + k * 180}deg)`;
  const r = Math.round(rpm / 50) * 50;
  if (r !== lastRpmTxt && tachRpm) { tachRpm.textContent = r.toLocaleString("pt-BR"); lastRpmTxt = r; }
  const lit = Math.max(0, Math.min(10, Math.floor(((rpm - 8000) / (limit - 8000)) * 10) + (rpm > 8000 ? 1 : 0)));
  const flash = rpm > limit - 700 && Math.floor(performance.now() / 70) % 2 === 0;
  leds.forEach((l, i) => { l.classList.toggle("is-on", i < lit && !(flash && lit >= 10)); });
}

/* ---------- prévia do patrocinador ---------- */
const file = $("#sp-file"), reset = $("#sp-reset"), status = $("#sp-status");
file && file.addEventListener("change", () => {
  const f = file.files && file.files[0];
  if (!f || !stage) return;
  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = () => {
    // rasteriza (SVG sem tamanho próprio também funciona)
    const w0 = img.naturalWidth || 600, h0 = img.naturalHeight || 300;
    const k = 640 / Math.max(w0, h0);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w0 * k));
    c.height = Math.max(1, Math.round(h0 * k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    stage.sponsor(c);
    URL.revokeObjectURL(url);
    reset.hidden = false;
    status.textContent = "Pronto. Sua marca está no sidepod do carro 39.";
  };
  img.onerror = () => { status.textContent = "Não consegui abrir essa imagem. Tente um PNG ou JPG."; };
  img.src = url;
});
reset && reset.addEventListener("click", () => {
  stage && stage.sponsor(null);
  reset.hidden = true;
  file.value = "";
  status.textContent = "";
});

/* ---------- sliders: preenchimento até o valor ---------- */
function paintRange(el) {
  const p = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.setProperty("--p", p + "%");
}
$$('input[type="range"]').forEach((el) => {
  paintRange(el);
  el.addEventListener("input", () => paintRange(el));
});

/* ---------- dica de rolagem some depois do primeiro movimento ---------- */
const hint = $(".story__hint");
if (hint) window.addEventListener("scroll", () => { hint.style.opacity = window.scrollY > 60 ? "0" : "1"; }, { passive: true });

/* ---------- laboratório ---------- */
initLab($("#laboratorio"));
$$("[data-lab-open]").forEach((a) =>
  a.addEventListener("click", () => {
    const tab = $(`[data-lab-tab="${a.dataset.labOpen}"]`);
    tab && tab.click();
  })
);
