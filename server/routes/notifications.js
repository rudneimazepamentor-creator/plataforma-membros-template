import { Router } from 'express';
import webpush from 'web-push';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

// VAPID config
// Gere as chaves com: npx web-push generate-vapid-keys
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
} else {
  console.warn('[PUSH] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configuradas — notificações push desativadas.');
}

// Tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT,
    auth_key TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notification_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT,
    type TEXT DEFAULT 'manual' CHECK(type IN ('manual', 'new_lesson', 'new_course', 'system')),
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    sent_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// GET /api/notifications/vapid-key — retorna chave pública para o frontend
router.get('/vapid-key', (req, res) => {
  if (!VAPID_PUBLIC) return res.status(503).json({ error: 'Push não configurado' });
  res.json({ publicKey: VAPID_PUBLIC });
});

// POST /api/notifications/subscribe — salvar subscription do browser
router.post('/subscribe', requireAuth, (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'Endpoint é obrigatório' });

  db.prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET user_id = ?, p256dh = ?, auth_key = ?
  `).run(
    req.user.id, endpoint, keys?.p256dh || '', keys?.auth || '',
    req.user.id, keys?.p256dh || '', keys?.auth || '',
  );

  res.json({ message: 'Inscrito para notificações' });
});

// DELETE /api/notifications/unsubscribe
router.delete('/unsubscribe', requireAuth, (req, res) => {
  db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'Desinscrito' });
});

// ═══════════ ADMIN ═══════════

// GET /api/notifications/admin/stats
router.get('/admin/stats', requireAuth, requireAdmin, (req, res) => {
  const subscribers = db.prepare('SELECT COUNT(*) as count FROM push_subscriptions').get();
  const totalSent = db.prepare('SELECT COALESCE(SUM(sent_count), 0) as count FROM notification_logs').get();
  const recentLogs = db.prepare(`
    SELECT nl.*, u.display_name as sent_by_name
    FROM notification_logs nl
    LEFT JOIN users u ON nl.sent_by = u.id
    ORDER BY nl.created_at DESC
    LIMIT 20
  `).all();

  res.json({
    subscribers: subscribers.count,
    totalSent: totalSent.count,
    logs: recentLogs,
  });
});

// POST /api/notifications/admin/send — enviar notificação para todos
router.post('/admin/send', requireAuth, requireAdmin, async (req, res) => {
  const { title, body, url, type } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
  }

  if (title.length > 100) return res.status(400).json({ error: 'Título muito longo (máx 100)' });
  if (body.length > 500) return res.status(400).json({ error: 'Mensagem muito longa (máx 500)' });

  const subscriptions = db.prepare('SELECT * FROM push_subscriptions').all();

  if (subscriptions.length === 0) {
    return res.status(400).json({ error: 'Nenhum inscrito para receber notificações' });
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    url: url || '/',
    tag: `notif-${Date.now()}`,
  });

  let sent = 0;
  let failed = 0;
  const toRemove = [];

  for (const sub of subscriptions) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth_key },
    };

    try {
      await webpush.sendNotification(pushSub, payload);
      sent++;
    } catch (err) {
      failed++;
      // Se subscription expirou (410 Gone), marcar para remoção
      if (err.statusCode === 410 || err.statusCode === 404) {
        toRemove.push(sub.id);
      }
      console.log(`[PUSH] Falha para sub ${sub.id}: ${err.statusCode || err.message}`);
    }
  }

  // Limpar subscriptions expiradas
  if (toRemove.length > 0) {
    db.prepare(`DELETE FROM push_subscriptions WHERE id IN (${toRemove.join(',')})`).run();
    console.log(`[PUSH] ${toRemove.length} subscriptions expiradas removidas`);
  }

  // Log
  db.prepare(`
    INSERT INTO notification_logs (title, body, url, type, sent_count, failed_count, sent_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, body, url || '/', type || 'manual', sent, failed, req.user.id);

  res.json({ message: `Notificação enviada: ${sent} sucesso, ${failed} falhas`, sent, failed });
});

// ═══════════ AUTO NOTIFICATIONS ═══════════

// Função para disparar notificação automática (chamada por outras rotas)
export async function sendAutoNotification(title, body, url, type = 'system') {
  const subscriptions = db.prepare('SELECT * FROM push_subscriptions').all();
  if (subscriptions.length === 0) return { sent: 0, failed: 0 };

  const payload = JSON.stringify({
    title, body, icon: '/icon-192.png', badge: '/icon-192.png',
    url: url || '/', tag: `auto-${Date.now()}`,
  });

  let sent = 0, failed = 0;
  const toRemove = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth_key },
      }, payload);
      sent++;
    } catch (err) {
      failed++;
      if (err.statusCode === 410 || err.statusCode === 404) toRemove.push(sub.id);
    }
  }

  if (toRemove.length > 0) {
    db.prepare(`DELETE FROM push_subscriptions WHERE id IN (${toRemove.join(',')})`).run();
  }

  db.prepare(`
    INSERT INTO notification_logs (title, body, url, type, sent_count, failed_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, body, url || '/', type, sent, failed);

  return { sent, failed };
}

export default router;
