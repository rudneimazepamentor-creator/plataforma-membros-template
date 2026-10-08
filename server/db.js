import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '..', 'data', 'plataforma.db');

// Garante que o diretório data existe
import fs from 'fs';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : null });

// Performance: WAL mode + foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// ═══════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════

db.exec(`
  -- Usuários
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_login_at TEXT
  );

  -- Cursos (Módulos de conteúdo)
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    category TEXT DEFAULT 'Geral',
    duration TEXT,
    is_published INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Aulas
  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    video_type TEXT CHECK(video_type IN ('youtube', 'gdrive', 'local', 'external')),
    duration_minutes INTEGER,
    module_name TEXT DEFAULT 'Módulo 1',
    order_index INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Materiais complementares (PDFs, docs)
  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Progresso do aluno
  CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    progress_percentage INTEGER DEFAULT 0,
    completed_at TEXT,
    last_accessed_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, course_id, lesson_id)
  );

  -- Visualizações (analytics)
  CREATE TABLE IF NOT EXISTS lesson_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    viewed_at TEXT DEFAULT (datetime('now'))
  );

  -- Avaliações de curso
  CREATE TABLE IF NOT EXISTS course_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    rating INTEGER CHECK(rating BETWEEN 0 AND 10),
    feedback TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, course_id)
  );

  -- Comentários nas aulas
  CREATE TABLE IF NOT EXISTS lesson_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    parent_id INTEGER REFERENCES lesson_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Convites
  CREATE TABLE IF NOT EXISTS invite_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    email TEXT,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Registros de alunos (dados detalhados do cadastro)
  CREATE TABLE IF NOT EXISTS student_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT,
    city TEXT,
    uf TEXT,
    occupation TEXT,
    motivation TEXT,
    objective TEXT,
    instagram TEXT,
    invite_link_id INTEGER REFERENCES invite_links(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Ferramentas de IA (caixa de ferramentas)
  CREATE TABLE IF NOT EXISTS ai_tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    icon_url TEXT,
    category TEXT DEFAULT 'geral',
    is_published INTEGER DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Gravações processadas (mentoria-autopilot)
  CREATE TABLE IF NOT EXISTS recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'mentoria' CHECK(type IN ('mentoria', 'reuniao')),
    recording_date TEXT,
    video_url TEXT,
    transcription TEXT,
    document_json TEXT,
    pdf_url TEXT,
    cover_url TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'ready', 'published', 'archived')),
    lesson_id INTEGER REFERENCES lessons(id),
    drive_file_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    processed_at TEXT
  );

  -- Sistema de indicação (referral)
  CREATE TABLE IF NOT EXISTS referral_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS referral_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referral_code TEXT NOT NULL,
    referrer_id INTEGER NOT NULL REFERENCES users(id),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    city TEXT,
    uf TEXT,
    occupation TEXT,
    current_revenue TEXT,
    main_challenge TEXT,
    why_join TEXT,
    instagram TEXT,
    payment_preference TEXT DEFAULT 'parcelado' CHECK(payment_preference IN ('avista', 'parcelado')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'contacted', 'closed', 'lost')),
    commission_amount REAL DEFAULT 0,
    commission_status TEXT DEFAULT 'none' CHECK(commission_status IN ('none', 'pending', 'paid')),
    commission_due_date TEXT,
    closed_at TEXT,
    paid_at TEXT,
    notes TEXT,
    notified_telegram INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_referral_links_user ON referral_links(user_id);
  CREATE INDEX IF NOT EXISTS idx_referral_links_code ON referral_links(code);
  CREATE INDEX IF NOT EXISTS idx_referral_apps_referrer ON referral_applications(referrer_id);
  CREATE INDEX IF NOT EXISTS idx_referral_apps_status ON referral_applications(status);

  -- Tokens de reset de senha
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

  -- Índices
  CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id, module_name, order_index);
  CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id, course_id);
  CREATE INDEX IF NOT EXISTS idx_views_lesson ON lesson_views(lesson_id, course_id);
  CREATE INDEX IF NOT EXISTS idx_comments_lesson ON lesson_comments(lesson_id, parent_id);
  CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status, type);
`);

// ═══════════════════════════════════════════
// MIGRAÇÕES (seguras para re-execução)
// ═══════════════════════════════════════════

const columns = db.prepare("PRAGMA table_info(lessons)").all().map(c => c.name);
if (!columns.includes('release_date')) {
  db.exec("ALTER TABLE lessons ADD COLUMN release_date TEXT");
  db.exec("CREATE INDEX IF NOT EXISTS idx_lessons_release ON lessons(release_date)");
}

// Tier system: basic vs premium
// users.tier: tier do aluno (default basic — segurança defensiva)
// courses.required_tier: tier mínimo para ver o curso
// lessons.required_tier: NULL = herda do curso, ou override individual
// invite_links.tier: tier que será atribuído ao aluno ao usar o convite
const userColumns = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userColumns.includes('tier')) {
  db.exec("ALTER TABLE users ADD COLUMN tier TEXT DEFAULT 'basic'");
  db.exec("UPDATE users SET tier = 'basic' WHERE tier IS NULL");
  db.exec("CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier)");
}

const courseColumns = db.prepare("PRAGMA table_info(courses)").all().map(c => c.name);
if (!courseColumns.includes('required_tier')) {
  db.exec("ALTER TABLE courses ADD COLUMN required_tier TEXT DEFAULT 'basic'");
  db.exec("UPDATE courses SET required_tier = 'basic' WHERE required_tier IS NULL");
}

if (!columns.includes('required_tier')) {
  db.exec("ALTER TABLE lessons ADD COLUMN required_tier TEXT");
}

const inviteColumns = db.prepare("PRAGMA table_info(invite_links)").all().map(c => c.name);
if (!inviteColumns.includes('tier')) {
  db.exec("ALTER TABLE invite_links ADD COLUMN tier TEXT DEFAULT 'basic'");
  db.exec("UPDATE invite_links SET tier = 'basic' WHERE tier IS NULL");
}

export default db;
