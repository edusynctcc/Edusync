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
    service: 'gmail',
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"Edusync" <${user}>`,
      to: para,
      subject: assunto,
      text: texto,
    });
  } catch (erro) {
    // O envio falhou, mas NÃO derrubamos quem chamou.
    //
    // No cadastro, o professor já foi gravado no banco antes desta função ser
    // chamada. Se o erro subisse daqui, a pessoa veria "erro no servidor", a
    // conta existiria assim mesmo, e tentar de novo responderia "e-mail já
    // cadastrado" — ela ficaria presa, sem conta usável e sem poder criar
    // outra.
    //
    // Então o fluxo segue e o código fica no log, como último recurso: dá para
    // ler no painel da Railway e destravar a pessoa na hora.
    const motivo = erro instanceof Error ? erro.message : String(erro);
    console.error(`[E-MAIL] falhou o envio para ${para}: ${motivo}`);
    console.log(`\n[E-MAIL NAO ENVIADO] Para: ${para}\nAssunto: ${assunto}\n${texto}\n`);
  }
}