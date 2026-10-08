import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin, optionalAuth, canAccessLesson, getEffectiveTier } from '../auth.js';

const router = Router();

const VALID_TIERS = ['basic', 'premium'];
const normalizeCourseTier = (t) => (VALID_TIERS.includes(t) ? t : 'basic');

// GET /api/courses/search — busca por cursos e aulas
router.get('/search', optionalAuth, (req, res) => {
  const q = req.query.q;
  if (!q) return res.json({ courses: [], lessons: [] });

  const term = `%${q}%`;

  const courses = db.prepare(`
    SELECT id, title, category FROM courses
    WHERE is_published = 1 AND (title LIKE ? OR description LIKE ? OR category LIKE ?)
    LIMIT 10
  `).all(term, term, term);

  const lessons = db.prepare(`
    SELECT l.id, l.title, l.course_id, l.module_name
    FROM lessons l
    JOIN courses c ON l.course_id = c.id
    WHERE l.is_published = 1 AND c.is_published = 1
    AND (l.title LIKE ? OR l.description LIKE ? OR l.module_name LIKE ?)
    LIMIT 10
  `).all(term, term, term);

  res.json({ courses, lessons });
});

// GET /api/courses — lista cursos publicados (ou todos para admin)
router.get('/', optionalAuth, (req, res) => {
  const isAdmin = req.user?.role === 'admin';

  const courses = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM lessons WHERE course_id = c.id AND is_published = 1) as lesson_count,
      (SELECT COUNT(DISTINCT user_id) FROM user_progress WHERE course_id = c.id) as student_count
    FROM courses c
    ${isAdmin ? '' : 'WHERE c.is_published = 1'}
    ORDER BY c.order_index ASC, c.created_at DESC
  `).all();

  res.json(courses);
});

// GET /api/courses/:id — detalhes do curso + aulas
router.get('/:id', optionalAuth, (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso não encontrado' });

  if (!course.is_published && req.user?.role !== 'admin') {
    return res.status(404).json({ error: 'Curso não encontrado' });
  }

  const lessonsRaw = db.prepare(`
    SELECT id, title, description, video_url, video_type, duration_minutes, module_name, order_index, is_published, required_tier
    FROM lessons
    WHERE course_id = ?
    ${req.user?.role === 'admin' ? '' : 'AND is_published = 1'}
    ORDER BY module_name ASC, order_index ASC
  `).all(course.id);

  // Marca cada aula como locked (sem esconder — vira upsell visual)
  const lessons = lessonsRaw.map((l) => {
    const eff = getEffectiveTier(l, course);
    return {
      ...l,
      effective_tier: eff,
      locked: !canAccessLesson(req.user, l, course),
    };
  });

  // Progresso do usuário (se logado)
  let progress = [];
  if (req.user) {
    progress = db.prepare(
      'SELECT lesson_id, progress_percentage, completed_at FROM user_progress WHERE user_id = ? AND course_id = ?',
    ).all(req.user.id, course.id);
  }

  res.json({ ...course, lessons, progress });
});

// POST /api/courses — criar curso (admin)
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { title, description, thumbnail_url, category, duration, is_published, order_index, required_tier } = req.body;

  if (!title?.trim() || title.length > 200) return res.status(400).json({ error: 'Título é obrigatório (máx 200 chars)' });
  if (description && description.length > 5000) return res.status(400).json({ error: 'Descrição muito longa (máx 5000 chars)' });

  const tierValue = normalizeCourseTier(required_tier);

  const result = db.prepare(`
    INSERT INTO courses (title, description, thumbnail_url, category, duration, is_published, order_index, created_by, required_tier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, thumbnail_url, category || 'Geral', duration, is_published ? 1 : 0, order_index || 0, req.user.id, tierValue);

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(course);
});

// PUT /api/courses/:id — atualizar curso (admin)
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const { title, description, thumbnail_url, category, duration, is_published, order_index, required_tier } = req.body;

  const existing = db.prepare('SELECT id FROM courses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Curso não encontrado' });

  const tierValue = normalizeCourseTier(required_tier);

  db.prepare(`
    UPDATE courses SET title = ?, description = ?, thumbnail_url = ?, category = ?,
    duration = ?, is_published = ?, order_index = ?, required_tier = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(title, description, thumbnail_url, category, duration, is_published ? 1 : 0, order_index || 0, tierValue, req.params.id);

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  res.json(course);
});

// DELETE /api/courses/:id — deletar curso (admin)
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Curso não encontrado' });
  res.json({ message: 'Curso removido' });
});

export default router;
