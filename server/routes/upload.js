import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

// Storage para thumbnails
const thumbStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/thumbnails';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`);
  },
});

const thumbUpload = multer({
  storage: thumbStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Apenas imagens são aceitas'));
  },
});

// POST /api/upload/thumbnail — upload + otimização de thumbnail
router.post('/thumbnail', requireAuth, requireAdmin, thumbUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

  try {
    // Otimiza com Sharp: WebP, 800px wide
    const optimizedName = `opt-${req.file.filename.replace(/\.[^.]+$/, '.webp')}`;
    const optimizedPath = path.join('./uploads/thumbnails', optimizedName);

    await sharp(req.file.path)
      .resize(800, 450, { fit: 'cover' })
      .webp({ quality: 82 })
      .toFile(optimizedPath);

    // Remove original
    fs.unlinkSync(req.file.path);

    res.json({ url: `/uploads/thumbnails/${optimizedName}` });
  } catch (err) {
    res.json({ url: `/uploads/thumbnails/${req.file.filename}` });
  }
});

// Storage para covers gerados automaticamente
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/covers';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`);
  },
});

const coverUpload = multer({ storage: coverStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/upload/cover
router.post('/cover', requireAuth, requireAdmin, coverUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  res.json({ url: `/uploads/covers/${req.file.filename}` });
});

// Storage para vídeos
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/videos';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 500) * 1024 * 1024 },
});

// POST /api/upload/video
router.post('/video', requireAuth, requireAdmin, videoUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum vídeo enviado' });
  res.json({
    url: `/uploads/videos/${req.file.filename}`,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

export default router;
