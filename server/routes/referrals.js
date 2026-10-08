import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

const SITE_URL = process.env.SITE_URL || 'http://localhost:5173';
const PRODUCT_PRICE = Number(process.env.REFERRAL_PRODUCT_PRICE) || 1000;
const COMMISSION_RATE = 0.10; // 10%
const COMMISSION_DAYS = 40;

// ═══════════ ALUNO: Gerar/ver link de indicação ═══════════

// GET /api/referrals/my-link — gerar ou retornar link do aluno
router.get('/my-link', requireAuth, (req, res) => {
  let link = db.prepare('SELECT * FROM referral_links WHERE user_id = ?').get(req.user.id);

  if (!link) {
    const code = crypto.randomBytes(6).toString('hex'); // 12 chars
    db.prepare('INSERT INTO referral_links (user_id, code) VALUES (?, ?)').run(req.user.id, code);
    link = db.prepare('SELECT * FROM referral_links WHERE user_id = ?').get(req.user.id);
  }

  const url = `${SITE_URL}/indicacao/${link.code}`;
  res.json({ code: link.code, url });
});

// GET /api/referrals/my-referrals — ver indicações do aluno
router.get('/my-referrals', requireAuth, (req, res) => {
  const referrals = db.prepare(`
    SELECT id, full_name, email, status, commission_amount, commission_status,
           commission_due_date, created_at, closed_at, paid_at, payment_preference
    FROM referral_applications
    WHERE referrer_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);

  const stats = {
    total: referrals.length,
    pending: referrals.filter(r => r.status === 'pending' || r.status === 'contacted').length,
    closed: referrals.filter(r => r.status === 'closed').length,
    lost: referrals.filter(r => r.status === 'lost').length,
    total_earned: referrals.filter(r => r.commission_status === 'paid').reduce((s, r) => s + (r.commission_amount || 0), 0),
    total_pending: referrals.filter(r => r.commission_status === 'pending').reduce((s, r) => s + (r.commission_amount || 0), 0),
  };

  res.json({ referrals, stats });
});

// ═══════════ PÚBLICO: Ficha de aplicação ═══════════

// GET /api/referrals/validate/:code — verificar se código é válido
router.get('/validate/:code', (req, res) => {
  const link = db.prepare(`
    SELECT rl.code, u.display_name as referrer_name
    FROM referral_links rl
    JOIN users u ON rl.user_id = u.id
    WHERE rl.code = ?
  `).get(req.params.code);

  if (!link) return res.status(404).json({ error: 'Link de indicação inválido' });
  res.json({ valid: true, referrer_name: link.referrer_name });
});

// POST /api/referrals/apply — enviar ficha de aplicação
router.post('/apply', async (req, res) => {
  const { code, full_name, email, whatsapp, city, uf, occupation, current_revenue, main_challenge, why_join, instagram, payment_preference } = req.body;

  if (!code || !full_name || !email || !whatsapp) {
    return res.status(400).json({ error: 'Nome, email e WhatsApp são obrigatórios' });
  }

  // Limites de tamanho
  if (full_name.length > 200 || email.length > 200 || whatsapp.length > 30) {
    return res.status(400).json({ error: 'Campos muito longos' });
  }

  // Validar código
  const link = db.prepare('SELECT rl.*, u.display_name as referrer_name FROM referral_links rl JOIN users u ON rl.user_id = u.id WHERE rl.code = ?').get(code);
  if (!link) return res.status(400).json({ error: 'Código de indicação inválido' });

  // Verificar se email já aplicou
  const existing = db.prepare('SELECT id FROM referral_applications WHERE email = ? AND referral_code = ?').get(email.toLowerCase(), code);
  if (existing) return res.status(409).json({ error: 'Você já enviou uma aplicação com este link' });

  const result = db.prepare(`
    INSERT INTO referral_applications (referral_code, referrer_id, full_name, email, whatsapp, city, uf, occupation, current_revenue, main_challenge, why_join, instagram, payment_preference)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(code, link.user_id, full_name, email.toLowerCase(), whatsapp, city, uf, occupation, current_revenue, main_challenge, why_join, instagram, payment_preference || 'parcelado');

  // Telegram notification (async, não bloqueia)
  notifyTelegram(full_name, email, whatsapp, link.referrer_name, payment_preference).catch(() => {});

  res.status(201).json({ message: 'Aplicação enviada com sucesso! Entraremos em contato em breve.' });
});

// ═══════════ ADMIN: Gerenciar indicações ═══════════

// GET /api/referrals/admin/all — listar todas indicações
router.get('/admin/all', requireAuth, requireAdmin, (req, res) => {
  const applications = db.prepare(`
    SELECT ra.*, u.display_name as referrer_name, u.email as referrer_email
    FROM referral_applications ra
    JOIN users u ON ra.referrer_id = u.id
    ORDER BY ra.created_at DESC
  `).all();

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    contacted: applications.filter(a => a.status === 'contacted').length,
    closed: applications.filter(a => a.status === 'closed').length,
    lost: applications.filter(a => a.status === 'lost').length,
    total_revenue: applications.filter(a => a.status === 'closed').length * PRODUCT_PRICE,
    total_commissions: applications.filter(a => a.status === 'closed').reduce((s, a) => s + (a.commission_amount || 0), 0),
  };

  res.json({ applications, stats });
});

// PUT /api/referrals/admin/:id/status — atualizar status
router.put('/admin/:id/status', requireAuth, requireAdmin, (req, res) => {
  const { status, notes } = req.body;
  const app = db.prepare('SELECT * FROM referral_applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Aplicação não encontrada' });

  if (status === 'closed' && app.status !== 'closed') {
    // Marcar como fechado — gera comissão
    const commission = PRODUCT_PRICE * COMMISSION_RATE;
    const dueDate = new Date(Date.now() + COMMISSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE referral_applications
      SET status = 'closed', commission_amount = ?, commission_status = 'pending',
          commission_due_date = ?, closed_at = datetime('now'), notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(commission, dueDate, notes, req.params.id);

    res.json({ message: `Fechado! Comissão de R$${commission.toFixed(2)} pendente para ${COMMISSION_DAYS} dias` });
  } else {
    db.prepare('UPDATE referral_applications SET status = ?, notes = COALESCE(?, notes) WHERE id = ?')
      .run(status, notes, req.params.id);
    res.json({ message: 'Status atualizado' });
  }
});

// PUT /api/referrals/admin/:id/pay — marcar comissão como paga
router.put('/admin/:id/pay', requireAuth, requireAdmin, (req, res) => {
  db.prepare(`
    UPDATE referral_applications
    SET commission_status = 'paid', paid_at = datetime('now')
    WHERE id = ? AND commission_status = 'pending'
  `).run(req.params.id);

  res.json({ message: 'Comissão marcada como paga' });
});

// ═══════════ INTEGRAÇÕES ═══════════

async function notifyTelegram(name, email, whatsapp, referrerName, paymentPref) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  const pref = paymentPref === 'avista' ? 'À vista' : 'Parcelado';
  const msg = `🔔 *Nova Indicação*\n\n👤 *${name}*\n📧 ${email}\n📱 ${whatsapp}\n💰 Preferência: ${pref}\n\n👥 Indicado por: *${referrerName}*\n\n_Veja a ficha no painel admin → Indicações_`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
    });
    db.prepare('UPDATE referral_applications SET notified_telegram = 1 WHERE email = ?').run(email);
  } catch (err) {
    console.error('[TELEGRAM] Erro:', err.message);
  }
}

export default router;
