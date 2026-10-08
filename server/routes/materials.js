import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const uploadDir = process.env.UPLOAD_DIR || './uploads/materials';
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 500) * 1024 * 1024 },
});

const router = Router();

// GET /api/materials?course_id=X&lesson_id=Y
router.get('/', (req, res) => {
  const { course_id, lesson_id } = req.query;
  let sql = 'SELECT * FROM materials WHERE 1=1';
  const params = [];

  if (lesson_id) {
    sql += ' AND lesson_id = ?';
    params.push(lesson_id);
  } else if (course_id) {
    sql += ' AND course_id = ?';
    params.push(course_id);
  }

  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// POST /api/materials/upload — upload de arquivo (admin)
router.post('/upload', requireAuth, requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  const { lesson_id, course_id, title, description } = req.body;

  const result = db.prepare(`
    INSERT INTO materials (lesson_id, course_id, title, description, file_url, file_type, file_size)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    lesson_id || null,
    course_id || null,
    title || req.file.originalname,
    description,
    `/uploads/materials/${req.file.filename}`,
    req.file.mimetype,
    req.file.size,
  );

  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(material);
});

// POST /api/materials/link — adicionar material por URL (admin)
router.post('/link', requireAuth, requireAdmin, (req, res) => {
  const { lesson_id, course_id, title, description, file_url } = req.body;

  if (!title || !file_url) return res.status(400).json({ error: 'Título e URL são obrigatórios' });

  const result = db.prepare(`
    INSERT INTO materials (lesson_id, course_id, title, description, file_url, file_type)
    VALUES (?, ?, ?, ?, ?, 'link')
  `).run(lesson_id || null, course_id || null, title, description || '', file_url);

  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(material);
});

// DELETE /api/materials/:id
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Material não encontrado' });

  // Remove arquivo físico se local (com proteção contra path traversal)
  if (material.file_url?.startsWith('/uploads/')) {
    const uploadsRoot = path.resolve('.', 'uploads');
    const filePath = path.resolve('.', material.file_url);
    // Garantir que o arquivo está DENTRO de /uploads/
    if (filePath.startsWith(uploadsRoot + path.sep)) {
      try { fs.unlinkSync(filePath); } catch { /* arquivo já removido */ }
    }
  }

  db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);
  res.json({ message: 'Material removido' });
});

export default router;
