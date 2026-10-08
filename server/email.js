import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const BRAND = process.env.APP_NAME || 'Minha Plataforma';
const FROM = process.env.SMTP_FROM || `${BRAND} <${process.env.SMTP_USER}>`;
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173';

export async function sendPasswordResetEmail(email, token, displayName) {
  const resetUrl = `${SITE_URL}/reset-password?token=${token}`;

  const html = `
    <div style="max-width:500px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#0f172a;padding:40px;border-radius:16px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;background:#dc2626;color:white;font-weight:bold;font-size:20px;width:48px;height:48px;line-height:48px;border-radius:12px;">${String(BRAND).charAt(0).toUpperCase()}</div>
        <h1 style="color:white;font-size:24px;margin:12px 0 0;">${BRAND}</h1>
      </div>

      <p style="color:#e2e8f0;font-size:16px;margin-bottom:8px;">Olá, <strong>${displayName || 'aluno'}</strong>!</p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin-bottom:24px;">
        Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#dc2626;color:white;text-decoration:none;font-weight:600;font-size:16px;padding:14px 32px;border-radius:10px;">
          Redefinir Senha
        </a>
      </div>

      <p style="color:#64748b;font-size:12px;line-height:1.6;">
        Se você não solicitou esta alteração, ignore este email. O link expira em <strong>1 hora</strong>.
      </p>

      <p style="color:#64748b;font-size:11px;margin-top:8px;">
        Ou copie e cole este link no navegador:<br>
        <a href="${resetUrl}" style="color:#dc2626;word-break:break-all;">${resetUrl}</a>
      </p>

      <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;">
      <p style="color:#475569;font-size:11px;text-align:center;">
        ${BRAND}
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `${BRAND} — Redefinição de Senha`,
    html,
  });
}
