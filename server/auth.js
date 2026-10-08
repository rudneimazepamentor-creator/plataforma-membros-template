import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET não configurado ou muito curto (mín 32 chars). Defina no .env');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = '90d';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, tier: user.tier || 'basic' },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Middleware: requer autenticação.
 * Coloca req.user com { id, email, role }
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Verifica se user ainda existe e está ativo
    const user = db.prepare('SELECT id, email, role, display_name, tier, is_active FROM users WHERE id = ?').get(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Usuário inativo ou não encontrado' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

/**
 * Middleware: requer role admin.
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}

/**
 * Tier: 'basic' ou 'premium'.
 * premium > basic na hierarquia de acesso.
 */
export const TIER_RANK = { basic: 1, premium: 2 };

/**
 * Resolve o tier efetivo de uma aula:
 * se lesson.required_tier é null, herda do curso. Senão, override.
 */
export function getEffectiveTier(lesson, course) {
  return lesson?.required_tier || course?.required_tier || 'basic';
}

/**
 * Verifica se um user pode acessar uma aula.
 * Admin sempre pode. Senão, user.tier precisa ser >= effective_tier da aula.
 */
export function canAccessLesson(user, lesson, course) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const required = getEffectiveTier(lesson, course);
  const userRank = TIER_RANK[user.tier] || TIER_RANK.basic;
  const requiredRank = TIER_RANK[required] || TIER_RANK.basic;
  return userRank >= requiredRank;
}

/**
 * Versão para curso inteiro (lista de aulas, navegação).
 */
export function canAccessCourse(user, course) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const required = course?.required_tier || 'basic';
  const userRank = TIER_RANK[user.tier] || TIER_RANK.basic;
  const requiredRank = TIER_RANK[required] || TIER_RANK.basic;
  return userRank >= requiredRank;
}

/**
 * Middleware opcional: extrai user se token presente, mas não bloqueia.
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      const user = db.prepare('SELECT id, email, role, display_name, tier FROM users WHERE id = ? AND is_active = 1').get(decoded.id);
      if (user) req.user = user;
    } catch {
      // Token inválido — segue sem user
    }
  }
  next();
}
