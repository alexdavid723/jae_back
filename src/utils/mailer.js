// src/utils/mailer.js
import nodemailer from "nodemailer";

export async function createTransporter() {
  if (process.env.USE_ETHEREAL === "true") {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  // SMTP real
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail(to, resetLink) {
  const transporter = await createTransporter();

  const info = await transporter.sendMail({
    from: process.env.SMTP_USER || `"Instituto" <no-reply@instituto.local>`,
    to,
    subject: "Restablecer contraseña - Instituto",
    html: `
      <p>Hola,</p>
      <p>Haz solicitado restablecer tu contraseña. Haz clic en el enlace:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>El enlace expirará en 15 minutos.</p>
    `,
  });

  // Si usamos Ethereal, devuelve la URL de previsualización
  const previewUrl = nodemailer.getTestMessageUrl(info);
  return { info, previewUrl };
}
