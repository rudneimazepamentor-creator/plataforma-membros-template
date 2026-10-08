import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin, optionalAuth, canAccessLesson, getEffectiveTier } from '../auth.js';
import { resolverVideo } from '../r2.js';
import { sendAutoNotification } from './notifications.js';

const VALID_TIERS = ['basic', 'premium'];
const normalizeTier = (t) => (t === null || t === undefined || t === '' ? null : (VALID_TIERS.includes(t) ? t : null));

const router = Router();

// GET /api/lessons/upcoming — próximas aulas (agenda do aluno)
router.get('/upcoming', optionalAuth, (req, res) => {
  const lessons = db.prepare(`
    SELECT l.id, l.title, l.description, l.release_date, l.duration_minutes,
           l.course_id, l.module_name, l.required_tier,
           c.title as course_title, c.category, c.thumbnail_url, c.required_tier as course_required_tier
    FROM lessons l
    JOIN courses c ON l.course_id = c.id
    WHERE l.is_published = 1 AND l.release_date IS NOT NULL AND l.release_date >= date('now')
    ORDER BY l.release_date ASC
    LIMIT 20
  `).all();
  const enriched = lessons.map((l) => {
    const courseRow = { required_tier: l.course_required_tier };
    return {
      ...l,
      effective_tier: getEffectiveTier(l, courseRow),
      locked: !canAccessLesson(req.user, l, courseRow),
    };
  });
  res.json(enriched);
});

// GET /api/lessons/calendar — todas as aulas com data (passadas + futuras)
router.get('/calendar', optionalAuth, (req, res) => {
  const { month, year } = req.query;
  let lessons;

  if (month && year) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(Number(month) + 1).padStart(2, '0')}-01`;
    lessons = db.prepare(`
      SELECT l.id, l.title, l.description, l.release_date, l.duration_minutes,
             l.course_id, l.module_name, l.video_url, l.required_tier,
             c.title as course_title, c.category, c.thumbnail_url, c.required_tier as course_required_tier
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE l.is_published = 1 AND l.release_date IS NOT NULL
        AND l.release_date >= ? AND l.release_date < ?
      ORDER BY l.release_date ASC
    `).all(startDate, endDate);
  } else {
    lessons = db.prepare(`
      SELECT l.id, l.title, l.description, l.release_date, l.duration_minutes,
             l.course_id, l.module_name, l.video_url, l.required_tier,
             c.title as course_title, c.category, c.thumbnail_url, c.required_tier as course_required_tier
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE l.is_published = 1 AND l.release_date IS NOT NULL
      ORDER BY l.release_date ASC
    `).all();
  }
  const enriched = lessons.map((l) => {
    const courseRow = { required_tier: l.course_required_tier };
    return {
      ...l,
      effective_tier: getEffectiveTier(l, courseRow),
      locked: !canAccessLesson(req.user, l, courseRow),
    };
  });
  res.json(enriched);
});

// GET /api/lessons/:id — detalhes da aula
router.get('/:id', optionalAuth, async (req, res) => {
  const lesson = db.prepare(`
    SELECT l.*, c.title as course_title, c.required_tier as course_required_tier, c.thumbnail_url as course_thumbnail
    FROM lessons l
    JOIN courses c ON l.course_id = c.id
    WHERE l.id = ?
  `).get(req.params.id);

  if (!lesson) return res.status(404).json({ error: 'Aula não encontrada' });
  if (!lesson.is_published && req.user?.role !== 'admin') {
    return res.status(404).json({ error: 'Aula não encontrada' });
  }

  // Tier gating: se basic tenta abrir aula premium, retorna preview + paywall
  const courseRow = { required_tier: lesson.course_required_tier };
  const effective_tier = getEffectiveTier(lesson, courseRow);
  if (!canAccessLesson(req.user, lesson, courseRow)) {
    return res.status(403).json({
      error: 'Aula restrita ao tier premium',
      locked: true,
      required_tier: effective_tier,
      preview: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        duration_minutes: lesson.duration_minutes,
        module_name: lesson.module_name,
        course_id: lesson.course_id,
        course_title: lesson.course_title,
        course_thumbnail: lesson.course_thumbnail,
      },
    });
  }

  // Materiais da aula
  const materials = db.prepare(
    'SELECT * FROM materials WHERE lesson_id = ? ORDER BY created_at DESC',
  ).all(lesson.id);

  // Registra view se logado
  if (req.user) {
    db.prepare(
      'INSERT INTO lesson_views (user_id, lesson_id, course_id) VALUES (?, ?, ?)',
    ).run(req.user.id, lesson.id, lesson.course_id);
  }

  // Todas aulas do mesmo curso (pra navegação) com flag locked
  const siblingsRaw = db.prepare(`
    SELECT id, title, module_name, order_index, required_tier
    FROM lessons
    WHERE course_id = ? AND is_published = 1
    ORDER BY module_name ASC, order_index ASC
  `).all(lesson.course_id);

  const siblings = siblingsRaw.map((s) => {
    const eff = getEffectiveTier(s, courseRow);
    return {
      ...s,
      effective_tier: eff,
      locked: !canAccessLesson(req.user, s, courseRow),
    };
  });

  // Progresso nesta aula
  let progress = null;
  if (req.user) {
    progress = db.prepare(
      'SELECT * FROM user_progress WHERE user_id = ? AND lesson_id = ?',
    ).get(req.user.id, lesson.id);
  }

  // Aulas no R2 guardam a chave do objeto; a URL assinada é gerada agora, já
  // depois do gate de tier — quem não pode ver a aula nunca recebe um link.
  const comVideo = await resolverVideo(lesson);

  res.json({ ...comVideo, effective_tier, materials, siblings, progress });
});

// POST /api/lessons — criar aula (admin)
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { course_id, title, description, video_url, video_type, duration_minutes, module_name, order_index, is_published, release_date, required_tier } = req.body;

  if (!course_id || !title) {
    return res.status(400).json({ error: 'course_id e title são obrigatórios' });
  }

  const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(course_id);
  if (!course) return res.status(404).json({ error: 'Curso não encontrado' });

  const tierValue = normalizeTier(required_tier);

  const result = db.prepare(`
    INSERT INTO lessons (course_id, title, description, video_url, video_type, duration_minutes, module_name, order_index, is_published, release_date, required_tier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(course_id, title, description, video_url, video_type, duration_minutes, module_name || 'Módulo 1', order_index || 0, is_published ? 1 : 0, release_date || null, tierValue);

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(result.lastInsertRowid);

  // Notificação automática se aula publicada
  if (is_published) {
    const course = db.prepare('SELECT title FROM courses WHERE id = ?').get(course_id);
    sendAutoNotification(
      'Nova aula disponível!',
      `${title} — ${course?.title || 'Novo conteúdo'}`,
      `/courses/${course_id}/lesson/${lesson.id}`,
      'new_lesson',
    ).catch(() => {});
  }

  res.status(201).json(lesson);
});

// PUT /api/lessons/:id — atualizar aula (admin)
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const { title, description, video_url, video_type, duration_minutes, module_name, order_index, is_published, release_date, required_tier } = req.body;

  const tierValue = normalizeTier(required_tier);

  db.prepare(`
    UPDATE lessons SET title = ?, description = ?, video_url = ?, video_type = ?,
    duration_minutes = ?, module_name = ?, order_index = ?, is_published = ?, release_date = ?, required_tier = ?
    WHERE id = ?
  `).run(title, description, video_url, video_type, duration_minutes, module_name, order_index, is_published ? 1 : 0, release_date || null, tierValue, req.params.id);

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Aula não encontrada' });

  res.json(lesson);
});

// DELETE /api/lessons/:id
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM lessons WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Aula não encontrada' });
  res.json({ message: 'Aula removida' });
});

// POST /api/lessons/:id/progress — marcar progresso
router.post('/:id/progress', requireAuth, (req, res) => {
  const { progress_percentage } = req.body;
  const lesson = db.prepare('SELECT id, course_id FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Aula não encontrada' });

  const completed_at = progress_percentage >= 100 ? "datetime('now')" : null;

  db.prepare(`
    INSERT INTO user_progress (user_id, course_id, lesson_id, progress_percentage, completed_at, last_accessed_at)
    VALUES (?, ?, ?, ?, ${completed_at ? "datetime('now')" : 'NULL'}, datetime('now'))
    ON CONFLICT(user_id, course_id, lesson_id)
    DO UPDATE SET progress_percentage = ?, completed_at = ${completed_at ? "datetime('now')" : 'completed_at'}, last_accessed_at = datetime('now')
  `).run(req.user.id, lesson.course_id, lesson.id, progress_percentage, progress_percentage);

  res.json({ message: 'Progresso atualizado' });
});

// GET /api/lessons/:id/comments
router.get('/:id/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.display_name, u.avatar_url
    FROM lesson_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.lesson_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id);

  res.json(comments);
});

// POST /api/lessons/:id/comments
router.post('/:id/comments', requireAuth, (req, res) => {
  const { content, parent_id } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Conteúdo é obrigatório' });
  if (content.length > 5000) return res.status(400).json({ error: 'Comentário muito longo (máx 5000 caracteres)' });

  const result = db.prepare(
    'INSERT INTO lesson_comments (lesson_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
  ).run(req.params.id, req.user.id, parent_id || null, content.trim());

  const comment = db.prepare(`
    SELECT c.*, u.display_name, u.avatar_url
    FROM lesson_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(comment);
});

export default router;
