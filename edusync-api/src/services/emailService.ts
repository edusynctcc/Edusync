import nodemailer from 'nodemailer';

/**
 * Envio de e-mail do Edusync.
 *
 * Por que não é mais só o nodemailer: a Railway bloqueia as portas de SMTP
 * (25, 465 e 587) nos planos Free, Trial e Hobby, para não virar ponto de
 * disparo de spam. Qualquer tentativa de falar com o smtp.gmail.com de lá
 * morre em "Connection timeout" -- foi exatamente o que apareceu no log.
 * Não adianta trocar de porta: as três estão fechadas.
 *
 * O caminho que funciona nesses planos é mandar o e-mail por HTTPS, que é
 * uma requisição web comum e passa normalmente. É o que a Brevo oferece.
 *
 * Então esta função tem dois caminhos:
 *
 *   1. BREVO_API_KEY configurada  -> manda por HTTPS (funciona na Railway)
 *   2. só EMAIL_SENHA configurada -> manda por SMTP  (funciona no notebook)
 *
 * Nos dois casos o envio é disparado e não é esperado: o login não pode
 * ficar travado esperando um servidor de e-mail responder.
 */

const ENDERECO_BREVO = 'https://api.brevo.com/v3/smtp/email';

export async function enviarEmail(para: string, assunto: string, texto: string) {
  const remetente = process.env.EMAIL_USER;
  const chaveBrevo = process.env.BREVO_API_KEY;
  const senhaGmail = process.env.EMAIL_SENHA;

  // Sem nada configurado, nem tenta enviar: só registra no log. É assim que
  // dá para desenvolver sem configurar e-mail nenhum.
  if (!remetente || (!chaveBrevo && !senhaGmail)) {
    console.log(`\n[E-MAIL SIMULADO] Para: ${para}\nAssunto: ${assunto}\n${texto}\n`);
    return;
  }

  const envio = chaveBrevo
    ? enviarPelaBrevo(chaveBrevo, remetente, para, assunto, texto)
    : enviarPeloSmtp(remetente, String(senhaGmail), para, assunto, texto);

  // A parte importante: NÃO esperamos o envio terminar.
  //
  // O login e o cadastro chamam esta função e, se ficassem esperando o
  // servidor de e-mail responder, a pessoa veria a tela travada até o
  // navegador desistir -- "Load failed". Mandar o e-mail não deve segurar a
  // resposta HTTP.
  //
  // Então disparamos e seguimos. Se falhar, o texto (com o código dentro)
  // fica no log, que é a rede de segurança para destravar alguém na hora.
  envio
    .then(() => {
      console.log(`[E-MAIL] enviado para ${para}`);
    })
    .catch((erro: unknown) => {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      console.error(`[E-MAIL] falhou o envio para ${para}: ${motivo}`);
      console.log(`\n[E-MAIL NÃO ENVIADO] Para: ${para}\nAssunto: ${assunto}\n${texto}\n`);
    });
}

/** Caminho da Railway: uma requisição HTTPS comum, nada de SMTP. */
async function enviarPelaBrevo(
  chave: string,
  remetente: string,
  para: string,
  assunto: string,
  texto: string,
) {
  const resposta = await fetch(ENDERECO_BREVO, {
    method: 'POST',
    headers: {
      'api-key': chave,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Edusync', email: remetente },
      to: [{ email: para }],
      subject: assunto,
      textContent: texto,
    }),
    // Se a Brevo não responder em 15 segundos, desiste em vez de ficar
    // pendurada para sempre.
    signal: AbortSignal.timeout(15000),
  });

  if (!resposta.ok) {
    // O corpo da resposta diz o motivo em texto claro: remetente não
    // verificado, chave errada, cota do dia estourada. Vale a pena ele ir
    // inteiro para o log.
    const detalhe = await resposta.text().catch(() => '');
    throw new Error(`a Brevo respondeu ${resposta.status}: ${detalhe}`);
  }
}

/** Caminho local: o SMTP do Gmail, que só funciona fora da Railway. */
async function enviarPeloSmtp(
  remetente: string,
  senha: string,
  para: string,
  assunto: string,
  texto: string,
) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: remetente, pass: senha },

    // Limites de paciência, para não ficar pendurado por mais de um minuto.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  await transporter.sendMail({
    from: `"Edusync" <${remetente}>`,
    to: para,
    subject: assunto,
    text: texto,
  });
}