
const MODELO_PADRAO = 'gemini-3.8-flash';
const TEMPO_LIMITE_MS = 60000;

const ESPERAS_MS = [0, 2000, 5000];

function dormir(ms: number) {
  return new Promise((pronto) => setTimeout(pronto, ms));
}

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

          console.error(`[${rotulo}] ${modelo} respondeu ${resposta.status}: ${cru}`);

          const estaLotado = resposta.status === 429 || resposta.status === 503;
          lotado = lotado || estaLotado;
          ultimaFalha = `HTTP ${resposta.status}`;

          if (estaLotado) continue;

          if (resposta.status < 500) {
            throw new FalhaDeLeitura(
              `O Gemini recusou o pedido (HTTP ${resposta.status}). ` +
                'Veja o terminal da API — a resposta dele está lá.'
            );
          }

          continue;
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