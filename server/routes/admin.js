import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

// ═══════════ DASHBOARD STATS ═══════════

// GET /api/admin/stats
router.get('/stats', requireAuth, requireAdmin, (req, res) => {
  const stats = {
    total_courses: db.prepare('SELECT COUNT(*) as count FROM courses').get().count,
    total_lessons: db.prepare('SELECT COUNT(*) as count FROM lessons').get().count,
    total_members: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'member'").get().count,
    total_members_premium: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'member' AND tier = 'premium'").get().count,
    total_members_basic: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'member' AND tier = 'basic'").get().count,
    total_materials: db.prepare('SELECT COUNT(*) as count FROM materials').get().count,
    total_views: db.prepare('SELECT COUNT(*) as count FROM lesson_views').get().count,
    total_recordings: db.prepare('SELECT COUNT(*) as count FROM recordings').get().count,
    pending_recordings: db.prepare("SELECT COUNT(*) as count FROM recordings WHERE status IN ('pending', 'ready')").get().count,
  };

  // Views últimos 7 dias
  stats.recent_views = db.prepare(`
    SELECT date(viewed_at) as day, COUNT(*) as views
    FROM lesson_views
    WHERE viewed_at >= datetime('now', '-7 days')
    GROUP BY date(viewed_at)
    ORDER BY day ASC
  `).all();

  // Top aulas
  stats.top_lessons = db.prepare(`
    SELECT l.title, l.id, COUNT(v.id) as views
    FROM lesson_views v
    JOIN lessons l ON v.lesson_id = l.id
    GROUP BY l.id
    ORDER BY views DESC
    LIMIT 5
  `).all();

  res.json(stats);
});

// ═══════════ MEMBERS ═══════════

// GET /api/admin/members
router.get('/members', requireAuth, requireAdmin, (req, res) => {
  const members = db.prepare(`
    SELECT u.id, u.email, u.display_name, u.role, u.tier, u.is_active, u.created_at, u.last_login_at,
      (SELECT COUNT(*) FROM user_progress WHERE user_id = u.id AND completed_at IS NOT NULL) as completed_lessons
    FROM users u
    ORDER BY u.created_at DESC
  `).all();

  res.json(members);
});

// PUT /api/admin/members/:id/role
router.put('/members/:id/role', requireAuth, requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Role deve ser admin ou member' });
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: 'Role atualizado' });
});

// PUT /api/admin/members/:id/tier — promover/rebaixar entre basic e premium
router.put('/members/:id/tier', requireAuth, requireAdmin, (req, res) => {
  const { tier } = req.body;
  if (!['basic', 'premium'].includes(tier)) {
    return res.status(400).json({ error: 'Tier deve ser basic ou premium' });
  }
  const result = db.prepare('UPDATE users SET tier = ?, updated_at = datetime(\'now\') WHERE id = ?').run(tier, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
  const user = db.prepare('SELECT id, email, display_name, role, tier FROM users WHERE id = ?').get(req.params.id);
  res.json(user);
});

// PUT /api/admin/members/:id/toggle-active
router.put('/members/:id/toggle-active', requireAuth, requireAdmin, (req, res) => {
  db.prepare('UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(req.params.id);
  const user = db.prepare('SELECT id, email, is_active FROM users WHERE id = ?').get(req.params.id);
  res.json(user);
});

// DELETE /api/admin/members/:id — excluir aluno permanentemente
router.delete('/members/:id', requireAuth, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const user = db.prepare('SELECT id, email, role, display_name FROM users WHERE id = ?').get(userId);

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (user.role === 'admin') return res.status(403).json({ error: 'Não é possível excluir administradores' });
  if (userId === req.user.id) return res.status(403).json({ error: 'Não é possível excluir a si mesmo' });

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM user_progress WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM lesson_views WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM course_ratings WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM lesson_comments WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM student_registrations WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM referral_applications WHERE referrer_id = ?').run(userId);
    db.prepare('DELETE FROM referral_links WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });

  tx();
  res.json({ message: `Aluno ${user.display_name} (${user.email}) excluído permanentemente` });
});

// ═══════════ INVITE LINKS ═══════════

// GET /api/admin/invites
router.get('/invites', requireAuth, requireAdmin, (req, res) => {
  const invites = db.prepare(`
    SELECT i.*, u.display_name as created_by_name
    FROM invite_links i
    LEFT JOIN users u ON i.created_by = u.id
    ORDER BY i.created_at DESC
  `).all();

  res.json(invites);
});

// POST /api/admin/invites
router.post('/invites', requireAuth, requireAdmin, (req, res) => {
  const { email, max_uses, expires_days, tier } = req.body;
  const token = crypto.randomUUID();

  // Calcular data de expiração em JS (evita SQL injection)
  const days = Math.min(Math.max(parseInt(expires_days) || 30, 1), 365);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const tierValue = ['basic', 'premium'].includes(tier) ? tier : 'basic';

  const result = db.prepare(`
    INSERT INTO invite_links (token, email, max_uses, created_by, expires_at, tier)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(token, email || null, Math.min(Math.max(parseInt(max_uses) || 1, 1), 1000), req.user.id, expiresAt, tierValue);

  const invite = db.prepare('SELECT * FROM invite_links WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(invite);
});

// DELETE /api/admin/invites/:id
router.delete('/invites/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM invite_links WHERE id = ?').run(req.params.id);
  res.json({ message: 'Convite removido' });
});

// ═══════════ RECORDINGS ═══════════

// GET /api/admin/recordings
router.get('/recordings', requireAuth, requireAdmin, (req, res) => {
  const recordings = db.prepare(`
    SELECT r.*, l.title as lesson_title
    FROM recordings r
    LEFT JOIN lessons l ON r.lesson_id = l.id
    ORDER BY r.created_at DESC
  `).all();

  res.json(recordings);
});

// PUT /api/admin/recordings/:id/publish — publicar gravação como aula
router.put('/recordings/:id/publish', requireAuth, requireAdmin, (req, res) => {
  const { course_id, module_name, order_index } = req.body;
  const recording = db.prepare('SELECT * FROM recordings WHERE id = ?').get(req.params.id);

  if (!recording) return res.status(404).json({ error: 'Gravação não encontrada' });
  if (recording.status !== 'ready') {
    return res.status(400).json({ error: 'Gravação precisa estar com status "ready" para publicar' });
  }

  // Cria a aula a partir da gravação
  const tx = db.transaction(() => {
    const lessonResult = db.prepare(`
      INSERT INTO lessons (course_id, title, description, video_url, video_type, module_name, order_index, is_published)
      VALUES (?, ?, ?, ?, 'gdrive', ?, ?, 1)
    `).run(
      course_id,
      recording.title,
      JSON.parse(recording.document_json || '{}').resumo_executivo || '',
      recording.video_url,
      module_name || 'Mentorias',
      order_index || 0,
    );

    // Se tem PDF, adiciona como material
    if (recording.pdf_url) {
      db.prepare(`
        INSERT INTO materials (lesson_id, course_id, title, file_url, file_type)
        VALUES (?, ?, ?, ?, 'application/pdf')
      `).run(lessonResult.lastInsertRowid, course_id, `${recording.title} — Material Didático`, recording.pdf_url);
    }

    // Atualiza recording
    db.prepare(`
      UPDATE recordings SET status = 'published', lesson_id = ? WHERE id = ?
    `).run(lessonResult.lastInsertRowid, recording.id);

    return lessonResult.lastInsertRowid;
  });

  const lessonId = tx();
  res.json({ message: 'Gravação publicada como aula', lesson_id: lessonId });
});

// ═══════════ ANALYTICS ═══════════

// GET /api/admin/analytics
router.get('/analytics', requireAuth, requireAdmin, (req, res) => {
  const analytics = {
    views_by_day: db.prepare(`
      SELECT date(viewed_at) as day, COUNT(*) as views
      FROM lesson_views
      WHERE viewed_at >= datetime('now', '-30 days')
      GROUP BY date(viewed_at)
      ORDER BY day ASC
    `).all(),

    completion_by_course: db.prepare(`
      SELECT c.title,
        COUNT(DISTINCT up.user_id) as students,
        COUNT(CASE WHEN up.completed_at IS NOT NULL THEN 1 END) as completions,
        COUNT(*) as total_progress
      FROM user_progress up
      JOIN courses c ON up.course_id = c.id
      GROUP BY c.id
    `).all(),

    ratings_by_course: db.prepare(`
      SELECT c.title, AVG(r.rating) as avg_rating, COUNT(*) as total_ratings
      FROM course_ratings r
      JOIN courses c ON r.course_id = c.id
      GROUP BY c.id
    `).all(),

    new_members_by_month: db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM users
      WHERE role = 'member'
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).all(),
  };

  res.json(analytics);
});

export default router;
