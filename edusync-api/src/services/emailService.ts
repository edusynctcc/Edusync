import nodemailer from 'nodemailer';
 
// Envia e-mail pelo Gmail (senha de app). Se EMAIL_USER / EMAIL_SENHA não
// existirem no .env, o e-mail é "simulado": o texto aparece no terminal da API.
// Assim o projeto continua funcionando em qualquer PC, mesmo sem a senha.
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