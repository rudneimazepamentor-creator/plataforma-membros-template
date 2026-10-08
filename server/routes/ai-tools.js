import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin, optionalAuth } from '../auth.js';

const router = Router();

// GET /api/ai-tools — lista ferramentas publicadas
router.get('/', (req, res) => {
  const tools = db.prepare('SELECT * FROM ai_tools WHERE is_published = 1 ORDER BY name ASC').all();
  res.json(tools);
});

// POST /api/ai-tools — criar ferramenta (admin)
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { name, description, url, icon_url, category } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'Nome e URL são obrigatórios' });
  if (name.length > 200) return res.status(400).json({ error: 'Nome muito longo' });
  // Validar protocolo da URL (previne javascript:, data:, etc.)
  try { const u = new URL(url); if (!['http:', 'https:'].includes(u.protocol)) throw new Error(); }
  catch { return res.status(400).json({ error: 'URL inválida (deve começar com http:// ou https://)' }); }

  const result = db.prepare(
    'INSERT INTO ai_tools (name, description, url, icon_url, category, created_by) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(name, description, url, icon_url, category || 'geral', req.user.id);

  const tool = db.prepare('SELECT * FROM ai_tools WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(tool);
});

// DELETE /api/ai-tools/:id
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM ai_tools WHERE id = ?').run(req.params.id);
  res.json({ message: 'Ferramenta removida' });
});

export default router;
