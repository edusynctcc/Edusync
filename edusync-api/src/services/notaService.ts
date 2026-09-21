import { LeituraQuestao, QuestaoGabarito } from './geminiService';

export type NotaQuestao = {
  numero: number;
  pergunta: string;
  tipo: string;
  peso: number;
  nota: number;
  resposta_aluno: string;
  resposta_correta: string;
  confianca: string;
  observacao: string;
  detalhe: string;
  precisa_revisao: boolean;
};

export type ResultadoCorrecao = {
  nome_aluno: string;
  nota_total: number;
  peso_total: number;
  questoes: NotaQuestao[];
  questoes_para_revisar: number;
};

// Tira acento, espaço sobrando e caixa. "  ÁGUA " e "agua" viram a mesma coisa.
function normalizar(texto: string | null | undefined) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function separarPalavrasChave(resposta_correta: string) {
  return resposta_correta
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// A NOTA É CALCULADA AQUI, NÃO PELA IA.
//
// A IA só diz o que o aluno escreveu. A conta é feita por este código, que é
// sempre o mesmo para a mesma entrada. É o que torna o resultado defensável:
// dá para mostrar a fórmula para a banca, e rodar duas vezes dá igual.
// ---------------------------------------------------------------------------
export function calcularQuestao(
  questao: QuestaoGabarito,
  leitura: LeituraQuestao | undefined
): NotaQuestao {
  const base = {
    numero: questao.numero,
    pergunta: questao.pergunta,
    tipo: questao.tipo,
    peso: questao.peso,
    resposta_correta: questao.resposta_correta,
    resposta_aluno: leitura?.resposta_aluno ?? '',
    confianca: leitura?.confianca ?? 'baixa',
    observacao: leitura?.observacao ?? '',
  };

  if (!leitura) {
    return {
      ...base,
      nota: 0,
      detalhe: 'A IA não retornou leitura para esta questão.',
      precisa_revisao: true,
    };
  }

  const revisar = leitura.confianca === 'baixa';

  if (questao.tipo === 'alternativa') {
    const marcada = normalizar(leitura.letra_marcada);
    const correta = normalizar(questao.resposta_correta);
    const acertou = marcada !== '' && marcada === correta;

    return {
      ...base,
      nota: acertou ? questao.peso : 0,
      detalhe: marcada
        ? `Marcou ${marcada.toUpperCase()}, gabarito ${correta.toUpperCase()}`
        : 'Não foi possível identificar a alternativa marcada',
      precisa_revisao: revisar || marcada === '',
    };
  }

  if (questao.tipo === 'dissertativa') {
    const esperadas = separarPalavrasChave(questao.resposta_correta);

    if (esperadas.length === 0) {
      return {
        ...base,
        nota: 0,
        detalhe: 'A questão não tem palavras-chave cadastradas no gabarito.',
        precisa_revisao: true,
      };
    }

    // Só conta o que realmente está na lista do gabarito. Se a IA inventar um
    // conceito que o professor não pediu, é descartado aqui.
    const encontradas = esperadas.filter((esperada) =>
      (leitura.palavras_encontradas || []).some(
        (achada) => normalizar(achada) === normalizar(esperada)
      )
    );

    const nota = (encontradas.length / esperadas.length) * questao.peso;
    const faltaram = esperadas.filter((e) => !encontradas.includes(e));

    return {
      ...base,
      nota: Number(nota.toFixed(2)),
      detalhe:
        `${encontradas.length} de ${esperadas.length} conceitos` +
        (faltaram.length ? ` · faltou: ${faltaram.join(', ')}` : ''),
      // Nota parcial quase sempre merece o olho do professor.
      precisa_revisao: revisar || (encontradas.length > 0 && faltaram.length > 0),
    };
  }

  // calculo
  const resultado = normalizar(leitura.resultado_encontrado);
  const esperado = normalizar(questao.resposta_correta);

  if (resultado !== '' && resultado === esperado) {
    return {
      ...base,
      nota: questao.peso,
      detalhe: `Resultado correto: ${leitura.resultado_encontrado}`,
      precisa_revisao: revisar,
    };
  }

  // Errou o resultado mas o caminho estava certo: metade do peso.
  if (leitura.caminho_correto) {
    return {
      ...base,
      nota: Number((questao.peso * 0.5).toFixed(2)),
      detalhe: `Caminho certo, resultado errado (${leitura.resultado_encontrado ?? 'em branco'})`,
      precisa_revisao: true,
    };
  }

  return {
    ...base,
    nota: 0,
    detalhe: resultado
      ? `Resultado ${leitura.resultado_encontrado}, esperado ${questao.resposta_correta}`
      : 'Questão em branco ou ilegível',
    precisa_revisao: revisar || resultado === '',
  };
}

export function calcularFolha(
  gabarito: QuestaoGabarito[],
  leitura: { nome_aluno: string; questoes: LeituraQuestao[] }
): ResultadoCorrecao {
  const questoes = gabarito.map((questao) =>
    calcularQuestao(
      questao,
      (leitura.questoes || []).find((l) => Number(l.numero) === questao.numero)
    )
  );

  const nota_total = questoes.reduce((soma, q) => soma + q.nota, 0);
  const peso_total = gabarito.reduce((soma, q) => soma + q.peso, 0);

  return {
    nome_aluno: leitura.nome_aluno || '',
    nota_total: Number(nota_total.toFixed(2)),
    peso_total: Number(peso_total.toFixed(2)),
    questoes,
    questoes_para_revisar: questoes.filter((q) => q.precisa_revisao).length,
  };
}
