import 'dotenv/config';
import db from './db.js';
import { hashPassword } from './auth.js';

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || 'Administrador';

// Cria admin a partir das variáveis de ambiente (sem valores padrão)
let adminId = null;
if (!email || !password) {
  console.warn('⚠ ADMIN_EMAIL/ADMIN_PASSWORD não definidos — nenhum admin foi criado.');
  console.warn('  Defina-os no .env e rode "npm run seed" novamente.');
} else {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    adminId = existing.id;
    console.log(`Admin já existe: ${email} (id: ${existing.id})`);
  } else {
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)',
    ).run(email, hashPassword(password), name, 'admin');
    adminId = result.lastInsertRowid;
    console.log(`✓ Admin criado: ${email} (id: ${adminId})`);
  }
}

// Cria curso de exemplo se não existe nenhum
const courseCount = db.prepare('SELECT COUNT(*) as count FROM courses').get().count;
if (courseCount === 0) {
  const course = db.prepare(`
    INSERT INTO courses (title, description, category, duration, is_published, created_by)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(
    'Curso de Exemplo',
    'Curso de demonstração. Edite ou apague pelo painel de administração.',
    'Geral',
    '1h',
    adminId,
  );

  const insertLesson = db.prepare(`
    INSERT INTO lessons (course_id, title, description, video_url, video_type, duration_minutes, module_name, order_index, is_published)
    VALUES (?, ?, ?, ?, 'youtube', ?, 'Módulo 1', ?, 1)
  `);
  insertLesson.run(course.lastInsertRowid, 'Aula 1 — Boas-vindas', 'Aula de exemplo.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 5, 1);
  insertLesson.run(course.lastInsertRowid, 'Aula 2 — Próximos passos', 'Aula de exemplo.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 10, 2);

  console.log(`✓ Curso de exemplo criado com 2 aulas (id: ${course.lastInsertRowid})`);
}

console.log('\n✓ Seed concluído!\n');
process.exit(0);
