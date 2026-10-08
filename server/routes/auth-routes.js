import { Router } from 'express';
import db from '../db.js';
import { hashPassword, comparePassword, generateToken, requireAuth } from '../auth.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../email.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Email ou senha incorretos' });
  }

  if (!comparePassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email ou senha incorretos' });
  }

  // Atualiza last_login
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);

  const token = generateToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      role: user.role,
      tier: user.tier,
    },
  });
});

// POST /api/auth/signup
// Acesso restrito: apenas via invite_token válido (link enviado pelo admin).
router.post('/signup', (req, res) => {
  const { email, password, display_name, invite_token } = req.body;

  if (!invite_token) {
    return res.status(403).json({ error: 'Cadastro disponível apenas via link de convite.' });
  }

  if (!email || !password || !display_name) {
    return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });
  }

  const emailNorm = email.toLowerCase().trim();

  const invite = db.prepare(
    `SELECT * FROM invite_links WHERE token = ? AND used_count < max_uses
     AND (expires_at IS NULL OR expires_at > datetime('now'))`,
  ).get(invite_token);

  if (!invite) {
    return res.status(400).json({ error: 'Convite inválido ou expirado' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm);
  if (existing) {
    return res.status(409).json({ error: 'Este email já está cadastrado' });
  }

  const password_hash = hashPassword(password);
  const inviteTier = (invite.tier === 'premium' || invite.tier === 'basic') ? invite.tier : 'basic';

  const tx = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, display_name, tier) VALUES (?, ?, ?, ?)',
    ).run(emailNorm, password_hash, display_name.trim(), inviteTier);
    db.prepare('UPDATE invite_links SET used_count = used_count + 1 WHERE id = ?').run(invite.id);
    return result.lastInsertRowid;
  });

  const userId = tx();
  const user = db.prepare('SELECT id, email, display_name, role, tier FROM users WHERE id = ?').get(userId);
  const token = generateToken(user);

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
      tier: user.tier,
    },
  });
});

// POST /api/auth/register (cadastro detalhado via invite)
router.post('/register', (req, res) => {
  const { invite_token, full_name, email, password, whatsapp, city, uf, occupation, motivation, objective, instagram } = req.body;

  if (!invite_token || !full_name || !email || !password) {
    return res.status(400).json({ error: 'Campos obrigatórios: convite, nome, email, senha' });
  }

  // Limites de tamanho em todos os campos
  const limits = { full_name: 200, email: 200, whatsapp: 30, city: 100, uf: 2, occupation: 200, motivation: 2000, objective: 2000, instagram: 100 };
  for (const [field, max] of Object.entries(limits)) {
    if (req.body[field] && String(req.body[field]).length > max) {
      return res.status(400).json({ error: `Campo ${field} muito longo (máx ${max} caracteres)` });
    }
  }

  // Valida invite
  const invite = db.prepare(
    `SELECT * FROM invite_links WHERE token = ? AND used_count < max_uses
     AND (expires_at IS NULL OR expires_at > datetime('now'))`,
  ).get(invite_token);

  if (!invite) {
    return res.status(400).json({ error: 'Convite inválido ou expirado' });
  }

  const emailNorm = email.toLowerCase().trim();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm);
  if (existing) {
    return res.status(409).json({ error: 'Este email já está cadastrado' });
  }

  const inviteTier = (invite.tier === 'premium' || invite.tier === 'basic') ? invite.tier : 'basic';

  // Transaction: cria user + registration + incrementa invite
  const tx = db.transaction(() => {
    const password_hash = hashPassword(password);
    const userResult = db.prepare(
      'INSERT INTO users (email, password_hash, display_name, tier) VALUES (?, ?, ?, ?)',
    ).run(emailNorm, password_hash, full_name.trim(), inviteTier);

    db.prepare(`
      INSERT INTO student_registrations (user_id, full_name, email, whatsapp, city, uf, occupation, motivation, objective, instagram, invite_link_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userResult.lastInsertRowid, full_name, emailNorm, whatsapp, city, uf, occupation, motivation, objective, instagram, invite.id);

    db.prepare('UPDATE invite_links SET used_count = used_count + 1 WHERE id = ?').run(invite.id);

    return userResult.lastInsertRowid;
  });

  const userId = tx();
  const user = db.prepare('SELECT id, email, display_name, role, tier FROM users WHERE id = ?').get(userId);
  const token = generateToken(user);

  res.status(201).json({ token, user });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/password
router.put('/password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'Senha atual e nova senha (mín. 8 caracteres) são obrigatórias' });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (!comparePassword(current_password, user.password_hash)) {
    return res.status(401).json({ error: 'Senha atual incorreta' });
  }

  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(hashPassword(new_password), req.user.id);

  res.json({ message: 'Senha alterada com sucesso' });
});

// POST /api/auth/forgot-password
// Plataforma fechada: rejeitamos explicitamente emails não-cadastrados.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

  const user = db.prepare('SELECT id, email, display_name FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim());

  if (!user) {
    return res.status(404).json({ error: 'Este email não tem acesso à plataforma. O cadastro é feito apenas pelo link de convite.' });
  }

  // Gerar token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora

  // Invalida tokens anteriores
  db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

  // Salva novo token
  db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);

  // Envia email
  try {
    await sendPasswordResetEmail(user.email, token, user.display_name);
    console.log(`[RESET] Email enviado para ${user.email}`);
  } catch (err) {
    console.error('[RESET] Erro ao enviar email:', err.message);
    return res.status(500).json({ error: 'Erro ao enviar email. Tente novamente.' });
  }

  res.json({ message: 'Se o email existir, você receberá um link de redefinição.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { token, new_password } = req.body;

  if (!token || !new_password) {
    return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
  }

  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });
  }

  // Busca token válido
  const reset = db.prepare(`
    SELECT pr.*, u.email FROM password_resets pr
    JOIN users u ON pr.user_id = u.id
    WHERE pr.token = ? AND pr.used = 0 AND pr.expires_at > datetime('now')
  `).get(token);

  if (!reset) {
    return res.status(400).json({ error: 'Link inválido ou expirado. Solicite um novo.' });
  }

  // Atualiza senha
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(hashPassword(new_password), reset.user_id);

  // Marca token como usado
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(reset.id);

  console.log(`[RESET] Senha alterada para ${reset.email}`);

  res.json({ message: 'Senha alterada com sucesso! Faça login com a nova senha.' });
});

export default router;
