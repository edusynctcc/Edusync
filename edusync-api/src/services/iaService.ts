// ---------------------------------------------------------------------------
// A CONVERSA COM O GEMINI, NUM LUGAR SÓ
//
// Duas leituras do sistema usam IA sem ser a correção de folha: a lista de
// chamada e a atividade pronta. Até agora as duas tinham a mesma chamada
// copiada, com o mesmo tratamento de erro escrito duas vezes — e isso é
// exatamente o tipo de coisa que diverge no dia em que alguém melhora uma e
// esquece da outra.
//
// Então a conversa mora aqui. Os serviços de cima só dizem O QUE perguntar.
//
// O nome deste arquivo foi trocado de "leituraIA" para "iaService": num nome
// de arquivo, o I maiúsculo e o l minúsculo são o mesmo desenho na fonte do
// editor, e um import que não resolve vira meia hora olhando para duas coisas
// idênticas. Também combina com o resto da pasta (alunoService, geminiService).
//
// O geminiService continua separado de propósito: ele serve a correção, que
// não pode falhar no meio de uma aula, e tem exigências próprias. Juntar os
// três significaria mexer no arquivo mais crítico da API para ganhar pouco.
// Quando estes dois amadurecerem, aí sim vale conversar.
// ---------------------------------------------------------------------------

const MODELO_PADRAO = 'gemini-3.8-flash';
const TEMPO_LIMITE_MS = 60000;

// Quantas vezes insistir no MESMO modelo, e quanto esperar antes de cada uma.
//
// A espera é o ponto. Um 503 do Gemini quer dizer "estou lotado agora", e
// repetir no mesmo instante cai na mesma fila cheia — foi o que aconteceu na
// primeira versão, que tentava duas vezes em sequência e desistia em menos de
// um segundo. Esperar 2s e depois 5s custa sete segundos no pior caso e
// resolve a maior parte dos picos, que duram segundos.
const ESPERAS_MS = [0, 2000, 5000];

function dormir(ms: number) {
  return new Promise((pronto) => setTimeout(pronto, ms));
}

// ---------------------------------------------------------------------------
// A fila de modelos.
//
// GEMINI_MODELOS aceita uma lista separada por vírgula no .env:
//
//   GEMINI_MODELOS="gemini-3.8-flash,outro-modelo"
//
// Quando o primeiro responde "lotado", o segundo é tentado. Sem a variável,
// roda só o modelo de sempre — ninguém precisa configurar nada para o
// sistema funcionar como funcionava.
// ---------------------------------------------------------------------------
function filaDeModelos(): string[] {
  const lista = (process.env.GEMINI_MODELOS || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  if (lista.length > 0) return lista;

  return [process.env.GEMINI_MODEL || MODELO_PADRAO];
}

function urlDoModelo(modelo: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
}

function limparCercaDeCodigo(texto: string) {
  const limpo = texto.trim();
  if (!limpo.startsWith('```')) return limpo;
  return limpo
    .replace(/^```[a-zA-Z]*\s*/, '')
    .replace(/```\s*$/, '')
    .trim();
}

// Erro com uma frase que pode ir direto para a tela do professor.
//
// O que NÃO vai para a tela: o corpo cru da resposta do Google. Ele é um JSON
// de quatro linhas que não diz ao professor nada que ele possa fazer, e ocupa
// a tela inteira em vermelho. Esse fica no console do servidor, que é onde
// alguém vai procurar quando for investigar.
class FalhaDeLeitura extends Error {
  lotado: boolean;

  constructor(mensagem: string, lotado = false) {
    super(mensagem);
    this.name = 'FalhaDeLeitura';
    this.lotado = lotado;
  }
}

export type ParteDoPedido =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

/**
 * Manda as partes para o Gemini e devolve o JSON já convertido em objeto.
 *
 * `rotulo` só aparece nos logs do servidor, para separar quem pediu o quê
 * quando duas leituras acontecem perto uma da outra.
 */
export async function perguntarAoGemini(
  partes: ParteDoPedido[],
  rotulo: string
): Promise<any> {
  const chave = process.env.GEMINI_API_KEY;

  if (!chave) {
    throw new FalhaDeLeitura(
      'O servidor não enxergou a GEMINI_API_KEY. Confira se ela está no ' +
        'edusync-api/.env e se a API foi reiniciada depois de editar o arquivo.'
    );
  }

  const corpo = JSON.stringify({
    contents: [{ parts: partes }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  });

  const modelos = filaDeModelos();

  let ultimaFalha = '';
  let lotado = false;

  for (const modelo of modelos) {
    for (let tentativa = 0; tentativa < ESPERAS_MS.length; tentativa++) {
      const espera = ESPERAS_MS[tentativa] || 0;
      if (espera > 0) await dormir(espera);

      console.log(
        `[${rotulo}] modelo "${modelo}", tentativa ${tentativa + 1}/${ESPERAS_MS.length}`
      );

      const controlador = new AbortController();
      const relogio = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);

      try {
        const resposta = await fetch(urlDoModelo(modelo), {
          method: 'POST',
          headers: {
            'x-goog-api-key': chave,
            'Content-Type': 'application/json',
          },
          body: corpo,
          signal: controlador.signal,
        });

        if (!resposta.ok) {
          const cru = (await resposta.text()).slice(0, 500);

          // O corpo cru vai para o console, não para a tela.
          console.error(`[${rotulo}] ${modelo} respondeu ${resposta.status}: ${cru}`);

          const estaLotado = resposta.status === 429 || resposta.status === 503;
          lotado = lotado || estaLotado;
          ultimaFalha = `HTTP ${resposta.status}`;

          // Lotado: insiste, e depois troca de modelo.
          if (estaLotado) continue;

          // 4xx que não é cota: não melhora insistindo. Chave errada, modelo
          // que não existe, arquivo que o modelo recusou. Sai agora para a
          // mensagem chegar rápido.
          if (resposta.status < 500) {
            throw new FalhaDeLeitura(
              `O Gemini recusou o pedido (HTTP ${resposta.status}). ` +
                'Veja o terminal da API — a resposta dele está lá.'
            );
          }

          continue; // 5xx genérico: tenta de novo
        }

        const dados: any = await resposta.json();
        const pedacos = dados?.candidates?.[0]?.content?.parts || [];
        const texto = pedacos.map((p: any) => p?.text || '').join('').trim();

        if (!texto) {
          ultimaFalha = 'a IA não devolveu texto';
          console.error(`[${rotulo}] ${modelo} devolveu resposta vazia`);
          continue;
        }

        return JSON.parse(limparCercaDeCodigo(texto));
      } catch (e: any) {
        if (e instanceof FalhaDeLeitura) throw e;

        ultimaFalha =
          e?.name === 'AbortError'
            ? `não respondeu em ${TEMPO_LIMITE_MS / 1000}s`
            : String(e?.message || e);

        console.error(`[${rotulo}] ${modelo} falhou: ${ultimaFalha}`);
      } finally {
        clearTimeout(relogio);
      }
    }
  }

  // Lotado é o caso comum e tem conselho útil: esperar. Os outros não têm,
  // então a mensagem manda olhar onde a informação está.
  if (lotado) {
    throw new FalhaDeLeitura(
      'A IA do Google está sobrecarregada agora — isso costuma passar em ' +
        'alguns minutos. Tente de novo daqui a pouco.',
      true
    );
  }

  throw new FalhaDeLeitura(
    `Não consegui falar com a IA (${ultimaFalha}). O terminal da API tem o ` +
      'detalhe do que aconteceu.'
  );
}