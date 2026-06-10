// ══════════════════════════════════════════
// Biblioteca de Seções — servidor Node/Express
// ══════════════════════════════════════════
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';
const DB_PATH = path.join(__dirname, 'db.json');

// ── Cria db.json vazio se não existir ──────
function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ categories: [], components: [] }, null, 2));
  }
}
ensureDb();

// ── Helpers de leitura/escrita ─────────────
function readDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    return { categories: [], components: [] };
  }
}
function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// ── Middlewares ────────────────────────────
// limite alto para aceitar imagens em base64 no JSON
app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ══════════════════════════════════════════
// API — CATEGORIAS
// ══════════════════════════════════════════
app.get('/api/categories', (req, res) => {
  res.json(readDb().categories);
});

app.post('/api/categories', (req, res) => {
  const db = readDb();
  const { name, emoji, bg, color } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });
  const cat = { id: uid(), name, emoji: emoji || '', bg: bg || '', color: color || '' };
  db.categories.push(cat);
  writeDb(db);
  res.status(201).json(cat);
});

app.put('/api/categories/:id', (req, res) => {
  const db = readDb();
  const idx = db.categories.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'categoria não encontrada' });
  const { name, emoji, bg, color } = req.body || {};
  db.categories[idx] = {
    ...db.categories[idx],
    ...(name !== undefined ? { name } : {}),
    ...(emoji !== undefined ? { emoji } : {}),
    ...(bg !== undefined ? { bg } : {}),
    ...(color !== undefined ? { color } : {}),
  };
  writeDb(db);
  res.json(db.categories[idx]);
});

app.delete('/api/categories/:id', (req, res) => {
  const db = readDb();
  const exists = db.categories.some(c => c.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'categoria não encontrada' });
  // remove a categoria e todos os componentes dela
  db.categories = db.categories.filter(c => c.id !== req.params.id);
  db.components = db.components.filter(c => c.catId !== req.params.id);
  writeDb(db);
  res.json({ ok: true });
});

// ══════════════════════════════════════════
// API — COMPONENTES (seções)
// ══════════════════════════════════════════
app.get('/api/components', (req, res) => {
  const db = readDb();
  const { catId } = req.query;
  const list = catId ? db.components.filter(c => c.catId === catId) : db.components;
  res.json(list);
});

app.post('/api/components', (req, res) => {
  const db = readDb();
  const { catId, name, desc, html, css, js, img } = req.body || {};
  if (!catId) return res.status(400).json({ error: 'catId é obrigatório' });
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });
  const comp = {
    id: uid(),
    catId,
    name,
    desc: desc || '',
    html: html || '',
    css: css || '',
    js: js || '',
    img: img || null,
    createdAt: Date.now(),
  };
  db.components.push(comp);
  writeDb(db);
  res.status(201).json(comp);
});

app.put('/api/components/:id', (req, res) => {
  const db = readDb();
  const idx = db.components.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'componente não encontrado' });
  const { catId, name, desc, html, css, js, img } = req.body || {};
  db.components[idx] = {
    ...db.components[idx],
    ...(catId !== undefined ? { catId } : {}),
    ...(name !== undefined ? { name } : {}),
    ...(desc !== undefined ? { desc } : {}),
    ...(html !== undefined ? { html } : {}),
    ...(css !== undefined ? { css } : {}),
    ...(js !== undefined ? { js } : {}),
    ...(img !== undefined ? { img } : {}),
  };
  writeDb(db);
  res.json(db.components[idx]);
});

app.delete('/api/components/:id', (req, res) => {
  const db = readDb();
  const exists = db.components.some(c => c.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'componente não encontrado' });
  db.components = db.components.filter(c => c.id !== req.params.id);
  writeDb(db);
  res.json({ ok: true });
});

// ══════════════════════════════════════════
app.listen(PORT, HOST, () => {
  console.log(`\n  Biblioteca de Seções rodando:`);
  console.log(`  → local:  http://localhost:${PORT}`);
  console.log(`  → rede:   http://<IP-DA-MAQUINA>:${PORT}\n`);
});
