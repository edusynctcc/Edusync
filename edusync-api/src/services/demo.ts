import { LeituraFolha, QuestaoGabarito } from './geminiService';
import { separarPalavrasChave } from './notaService';

export function LEITURA_DEMO(gabarito: QuestaoGabarito[]): LeituraFolha {
  return {
    nome_aluno: 'Ana Santos',
    questoes: gabarito.map((q, indice) => {
      const erra = indice % 3 === 2;

      if (q.tipo === 'alternativa') {
        const letras = q.alternativas.map((a) => a.letra);
        const outra = letras.find((l) => l !== q.resposta_correta) ?? q.resposta_correta;

        return {
          numero: q.numero,
          letra_marcada: erra ? outra : q.resposta_correta,
          palavras_encontradas: [],
          resultado_encontrado: null,
          caminho_correto: null,
          resposta_aluno: `Alternativa ${erra ? outra : q.resposta_correta}`,
          confianca: erra ? ('media' as const) : ('alta' as const),
          observacao: '',
        };
      }

      if (q.tipo === 'dissertativa') {
        const palavras = separarPalavrasChave(q.resposta_correta);
        const achadas = erra ? palavras.slice(0, -1) : palavras;

        return {
          numero: q.numero,
          letra_marcada: null,
          palavras_encontradas: achadas,
          resultado_encontrado: null,
          caminho_correto: null,
          resposta_aluno: achadas.join(', '),
          confianca: 'alta' as const,
          observacao: '',
        };
      }

      return {
        numero: q.numero,
        letra_marcada: null,
        palavras_encontradas: [],
        resultado_encontrado: erra ? '0' : q.resposta_correta,
        caminho_correto: erra ? true : null,
        resposta_aluno: erra ? 'Conta iniciada, resultado errado' : q.resposta_correta,
        confianca: erra ? ('baixa' as const) : ('alta' as const),
        observacao: erra ? 'Rasura no final da conta' : '',
      };
    }),
  };
}
