import nodemailer from 'nodemailer';

export async function enviarEmail(para: string, assunto: string, texto: string) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_SENHA;

  // Sem credenciais, nem tenta enviar: só registra no log. É assim que dá para
  // desenvolver sem configurar e-mail nenhum.
  if (!user || !pass) {
    console.log(`\n[E-MAIL SIMULADO] Para: ${para}\nAssunto: ${assunto}\n${texto}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    // Porta 587 explícita em vez de `service: 'gmail'`, que usa a 465.
    // A 465 deu "Connection timeout" saindo da Railway; a 587 às vezes passa
    // onde a 465 nao passa. Se continuar dando timeout, o caminho é trocar
    // SMTP por um serviço de e-mail via HTTPS.
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },

    // Limites de paciência. Sem eles, o nodemailer pode ficar pendurado por
    // mais de um minuto esperando o Gmail, e é esse tempo que estava travando
    // o login inteiro.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  // A parte importante: NÃO esperamos o envio terminar.
  //
  // O login e o cadastro chamam esta função e, se ficassem esperando o Gmail
  // responder, a pessoa veria a tela travada até o navegador desistir --
  // "Load failed". Mandar o e-mail não deve segurar a resposta HTTP.
  //
  // Então disparamos e seguimos. O envio continua acontecendo em segundo
  // plano; se falhar, o texto (com o código dentro) fica no log, que é a
  // rede de segurança para destravar alguém na hora.
  transporter
    .sendMail({
      from: `"Edusync" <${user}>`,
      to: para,
      subject: assunto,
      text: texto,
    })
    .then(() => {
      console.log(`[E-MAIL] enviado para ${para}`);
    })
    .catch((erro: unknown) => {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      console.error(`[E-MAIL] falhou o envio para ${para}: ${motivo}`);
      console.log(`\n[E-MAIL NÃO ENVIADO] Para: ${para}\nAssunto: ${assunto}\n${texto}\n`);
    });
}