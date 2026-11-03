const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "troque-esta-chave";
const DB_FILE = path.join(__dirname, "data.json");

function loadDb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch {
    const initial = {
      guild: { name: "BHRLQ", game: "Free Fire", description: "Gerenciamento independente de guilda" },
      members: [],
      honor: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
}
let db = loadDb();
function saveDb() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

function requireKey(req, res, next) {
  const key = req.header("x-api-key");
  if (!key || key !== API_KEY) return res.status(401).json({ error: "Chave de API inválida ou ausente." });
  next();
}

app.get("/", (_req, res) => res.json({
  name: "BHRLQ Guild API",
  version: "1.0.0",
  status: "online",
  note: "API independente; não é uma API oficial da Garena."
}));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "BHRLQ API" }));

app.get("/api/guild", (_req, res) => res.json(db.guild));

app.get("/api/members", (_req, res) => res.json(db.members));

app.post("/api/members", requireKey, (req, res) => {
  const { nickname, playerId, role = "Membro" } = req.body || {};
  if (!nickname || !playerId) return res.status(400).json({ error: "Informe nickname e playerId." });
  if (db.members.some(m => String(m.playerId) === String(playerId)))
    return res.status(409).json({ error: "Este ID já está cadastrado." });
  const member = { id: Date.now(), nickname, playerId: String(playerId), role, createdAt: new Date().toISOString() };
  db.members.push(member);
  saveDb();
  res.status(201).json(member);
});

app.delete("/api/members/:id", requireKey, (req, res) => {
  const before = db.members.length;
  db.members = db.members.filter(m => String(m.id) !== req.params.id);
  if (db.members.length === before) return res.status(404).json({ error: "Membro não encontrado." });
  saveDb();
  res.json({ message: "Membro removido." });
});

app.get("/api/honor", (_req, res) => res.json(db.honor));

app.post("/api/honor", requireKey, (req, res) => {
  const { playerId, nickname, amount, note = "" } = req.body || {};
  const value = Number(amount);
  if (!playerId || !nickname || !Number.isInteger(value) || value <= 0)
    return res.status(400).json({ error: "Informe playerId, nickname e amount (inteiro maior que zero)." });
  const record = {
    id: Date.now(),
    playerId: String(playerId),
    nickname,
    amount: value,
    note,
    createdAt: new Date().toISOString(),
    source: "registro_manual"
  };
  db.honor.push(record);
  saveDb();
  res.status(201).json(record);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor." });
});

app.listen(PORT, () => console.log(`BHRLQ API rodando na porta ${PORT}`));
