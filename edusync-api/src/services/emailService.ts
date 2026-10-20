import nodemailer from 'nodemailer';

export async function enviarEmail(para: string, assunto: string, texto: string) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_SENHA;

  if (!user || !pass) {
    console.log(`\n[E-MAIL SIMULADO] Para: ${para}\nAssunto: ${assunto}\n${texto}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Edusync" <${user}>`,
    to: para,
    subject: assunto,
    text: texto,
  });
}