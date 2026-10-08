import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Importa banco (cria schema automaticamente)
import './db.js';

// Rotas
import authRoutes from './routes/auth-routes.js';
import courseRoutes from './routes/courses.js';
import lessonRoutes from './routes/lessons.js';
import materialRoutes from './routes/materials.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import ratingRoutes from './routes/ratings.js';
import aiToolsRoutes from './routes/ai-tools.js';
import notificationRoutes from './routes/notifications.js';
import referralRoutes from './routes/referrals.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3004;

// ═══════════ MIDDLEWARE ═══════════

app.use(compression());

// Helmet com CSP configurado para YouTube/Drive embeds
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co", "https://*.googleusercontent.com"],
      // Sem media-src explícito o CSP herda default-src 'self' e o browser
      // recusa o vídeo hospedado no R2 — falha silenciosa que só apareceria
      // no console do aluno.
      mediaSrc: ["'self'", "blob:", "https://*.r2.cloudflarestorage.com"],
      frameSrc: ["https://www.youtube.com", "https://youtube.com", "https://drive.google.com"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS restrito
const allowedOrigins = [
  process.env.SITE_URL,
  'http://localhost:5173',
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('CORS bloqueado'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiters
// Limiter de CREDENCIAL: protege contra força bruta de senha.
// Só conta tentativas que FALHAM (skipSuccessfulRequests) e só vale para as
// rotas que de fato verificam senha — nunca para /me, que o app chama a cada
// carregamento de página e cuja cota esgotada derrubava a sessão do aluno.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 tentativas FALHAS por IP
  skipSuccessfulRequests: true,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rotas de /api/auth que verificam credencial e merecem o limiter estrito.
const CREDENTIAL_PATHS = new Set([
  '/login', '/signup', '/register', '/forgot-password', '/reset-password',
]);

function authPathLimiter(req, res, next) {
  if (CREDENTIAL_PATHS.has(req.path)) return credentialLimiter(req, res, next);
  return next();
}

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 requests/min
  standardHeaders: true,
  legacyHeaders: false,
});

// HSTS em produção.
// O redirect http->https NÃO é feito aqui: o Traefik da borda já o aplica
// (configure o redirect no seu proxy). Duplicar o
// redirect no app criava loop infinito sempre que o proxy interno passasse
// X-Forwarded-Proto: http — o app respondia 301 para uma URL que voltava igual.
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

// Servir uploads estáticos
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

// As capas de curso eram PNGs de 4–7 MB cada (43 MB só para montar a Home —
// cerca de 70s em 4G). Foram reprocessadas para JPEG, mas o banco ainda
// referencia os caminhos .png. Este middleware entrega o .jpg equivalente
// quando ele existir: mantém as URLs antigas funcionando e devolve o
// Content-Type correto (com nosniff ativo, não dá para servir JPEG rotulado
// como PNG — o browser recusaria a imagem).
app.use('/uploads', (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (!/\.png$/i.test(req.path)) return next();

  const candidato = path.resolve(UPLOADS_DIR, '.' + req.path.replace(/\.png$/i, '.jpg'));
  // Barra path traversal: o alvo tem de estar dentro de uploads/.
  if (candidato !== UPLOADS_DIR && !candidato.startsWith(UPLOADS_DIR + path.sep)) return next();

  fs.access(candidato, fs.constants.R_OK, (err) => {
    if (err) return next(); // sem versão otimizada — segue para o static normal
    res.type('jpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.sendFile(candidato);
  });
});

app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '7d',
  etag: true,
}));

// ═══════════ API ROUTES ═══════════

// Rate limiters por rota
const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30, // 30 req/min para admin
  message: { error: 'Muitas requisições. Aguarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', generalLimiter);
app.use('/api/auth', authPathLimiter, authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/ai-tools', aiToolsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/referrals', referralRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ═══════════ SERVE FRONTEND (produção) ═══════════

const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist, {
  maxAge: '30d',
  setHeaders: (res, filePath) => {
    // Assets do Vite têm hash no nome — podem cachear por 30d.
    // O index.html NÃO: se o browser guardar o antigo, ele pede bundles que
    // já não existem no servidor e o aluno vê tela branca após cada deploy.
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  },
}));

// SPA fallback — qualquer rota que não é API serve o index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint não encontrado' });
  }
  res.set('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ═══════════ ERROR HANDLER ═══════════

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Erro interno' : err.message,
  });
});

// ═══════════ START ═══════════

app.listen(PORT, () => {
  console.log(`\n🟢 Plataforma de membros rodando na porta ${PORT}`);
  console.log(`   ${process.env.SITE_URL || `http://localhost:${PORT}`}\n`);
});
