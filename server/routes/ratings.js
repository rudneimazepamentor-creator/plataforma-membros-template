import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

// POST /api/ratings — avaliar curso
router.post('/', requireAuth, (req, res) => {
  const { course_id, rating, feedback } = req.body;

  if (!course_id || rating === undefined) {
    return res.status(400).json({ error: 'course_id e rating são obrigatórios' });
  }

  if (rating < 0 || rating > 10) {
    return res.status(400).json({ error: 'Rating deve ser entre 0 e 10' });
  }

  db.prepare(`
    INSERT INTO course_ratings (user_id, course_id, rating, feedback)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, course_id)
    DO UPDATE SET rating = ?, feedback = ?, created_at = datetime('now')
  `).run(req.user.id, course_id, rating, feedback, rating, feedback);

  res.json({ message: 'Avaliação salva' });
});

// GET /api/ratings/:courseId
router.get('/:courseId', (req, res) => {
  const stats = db.prepare(`
    SELECT AVG(rating) as avg_rating, COUNT(*) as total
    FROM course_ratings WHERE course_id = ?
  `).get(req.params.courseId);

  res.json(stats);
});

export default router;
