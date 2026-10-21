/*
 * Envio dos formulários do site para o Firestore (Firebase).
 *
 * A configuração do Firebase vem de TAURUS.firebase (js/config.js). Se ela
 * estiver vazia e o site estiver no Firebase Hosting, usa o endereço reservado
 * /__/firebase/init.json, que o próprio Hosting preenche.
 * O pacote do Firebase só é baixado quando alguém envia um formulário.
 *
 * O main.js usa window.taurusForms.save(colecao, dados). Se o Firebase não
 * estiver configurado ou falhar, ele cai no plano B (Formspree, e-mail ou Instagram).
 */
const TIMEOUT = 15000;
let ready = null;

async function loadConfig() {
  const c = (window.TAURUS && window.TAURUS.firebase) || {};
  if (c.apiKey && c.projectId) return c;
  const r = await fetch("/__/firebase/init.json", { cache: "no-store" });
  if (!r.ok) throw new Error("Firebase sem configuração");
  return r.json();
}

function init() {
  if (!ready) {
    ready = (async () => {
      const cfg = await loadConfig();
      const fb = await import("../vendor/firebase.bundle.min.js");
      const app = fb.getApps()[0] || fb.initializeApp(cfg);
      return { fb, db: fb.getFirestore(app) };
    })();
    // se falhar (sem rede, sem configuração), tenta de novo no próximo envio
    ready.catch(() => { ready = null; });
  }
  return ready;
}

function withTimeout(p) {
  return Promise.race([p, new Promise((_, reject) => setTimeout(() => reject(new Error("tempo esgotado")), TIMEOUT))]);
}

// grava um documento novo e devolve o id
async function save(colecao, dados) {
  return withTimeout((async () => {
    const { fb, db } = await init();
    const ref = await fb.addDoc(fb.collection(db, colecao), {
      ...dados,
      criadoEm: fb.serverTimestamp(),
      origem: (location.origin + location.pathname).slice(0, 200),
    });
    return ref.id;
  })());
}

window.taurusForms = { save };
