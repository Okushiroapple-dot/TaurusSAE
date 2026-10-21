// Publica firestore.rules no projeto do Firebase pela API do Firebase Rules.
// Usado pelo GitHub Actions (.github/workflows/firebase-hosting-merge.yml).
//
//   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}' node tools/deploy-rules.mjs taurus-racing
//
// A conta de serviço precisa do papel "Administrador de regras do Firebase"
// (roles/firebaserules.admin). Não usa pacotes externos.
import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";

const project = process.argv[2];
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
if (!project || !sa.client_email || !sa.private_key) {
  console.error("uso: FIREBASE_SERVICE_ACCOUNT='<json>' node tools/deploy-rules.mjs <projeto>");
  process.exit(1);
}
const API = (process.env.FIREBASE_RULES_URL || "https://firebaserules.googleapis.com") + "/v1";
const b64 = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");

// token de acesso OAuth a partir da chave da conta de serviço (JWT assinado com RS256)
async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: "RS256", typ: "JWT" });
  const claims = b64({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 600,
  });
  const sig = createSign("RSA-SHA256").update(`${head}.${claims}`).sign(sa.private_key, "base64url");
  const r = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claims}.${sig}` }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`token: ${r.status} ${JSON.stringify(j)}`);
  return j.access_token;
}

const token = await accessToken();
async function call(method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body: j };
}

// 1) cria o conjunto de regras (o servidor compila e recusa se tiver erro)
const content = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");
const rs = await call("POST", `/projects/${project}/rulesets`, { source: { files: [{ name: "firestore.rules", content }] } });
if (!rs.ok) {
  console.error(`Erro ao criar as regras (${rs.status}):`);
  console.error(JSON.stringify(rs.body, null, 2));
  process.exit(1);
}
const rulesetName = rs.body.name;
console.log("regras compiladas:", rulesetName);

// 2) aponta o banco padrão do Firestore para elas (atualiza a publicação ou cria se não existir)
const releaseName = `projects/${project}/releases/cloud.firestore`;
let rel = await call("PATCH", `/projects/${project}/releases/cloud.firestore`, { release: { name: releaseName, rulesetName } });
if (!rel.ok) rel = await call("POST", `/projects/${project}/releases`, { name: releaseName, rulesetName });
if (!rel.ok) {
  console.error(`Erro ao publicar as regras (${rel.status}):`);
  console.error(JSON.stringify(rel.body, null, 2));
  process.exit(1);
}
console.log("regras do Firestore publicadas:", rel.body.name || releaseName);
