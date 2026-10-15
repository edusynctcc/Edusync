type AlunoDaTurma = { id_aluno: number; nome: string };

// Exportado porque mais de um lugar precisa comparar nome de aluno: o
// acharAluno aqui embaixo (folha → chamada) e a importação da lista de
// chamada (arquivo → chamada). Duas normalizações diferentes no mesmo sistema
// seriam duas regras diferentes de "mesma pessoa", e elas divergiriam no dia
// em que alguém mexesse só numa.
export function normalizar(texto: string | null | undefined) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Casa o nome que a IA leu na folha com um aluno da turma.
//
// A regra é conservadora de propósito: só devolve um id quando sobra UM
// candidato. Duas Marias na sala, ou um nome que não bate com ninguém, devolve
// null — e aí o professor escolhe na tela. Chutar aqui significa gravar a
// nota de um aluno no boletim de outro.
// ---------------------------------------------------------------------------
export function acharAluno(nomeLido: string, alunos: AlunoDaTurma[]): number | null {
  const lido = normalizar(nomeLido);
  if (!lido || alunos.length === 0) return null;

  // 1. nome idêntico
  const exatos = alunos.filter((a) => normalizar(a.nome) === lido);
  if (exatos.length > 1) return null;

  const exato = exatos[0];
  if (exato) return exato.id_aluno;

  // 2. um contém o outro — cobre "Ana Santos" na folha e "Ana Beatriz Santos"
  //    na chamada, e também o contrário
  const contidos = alunos.filter((a) => {
    const cadastrado = normalizar(a.nome);
    return cadastrado.includes(lido) || lido.includes(cadastrado);
  });
  if (contidos.length > 1) return null;

  const contido = contidos[0];
  if (contido) return contido.id_aluno;

  // 3. primeiro e último nome iguais — pega quem escreveu só "Ana Santos"
  //    estando cadastrado como "Ana Beatriz Rocha Santos"
  const pedacos = lido.split(' ');
  const primeiro = pedacos[0];
  const ultimo = pedacos[pedacos.length - 1];

  if (pedacos.length < 2 || !primeiro || !ultimo) return null;

  const porExtremos = alunos.filter((a) => {
    const partes = normalizar(a.nome).split(' ');
    if (partes.length < 2) return false;
    return partes[0] === primeiro && partes[partes.length - 1] === ultimo;
  });

  const porExtremo = porExtremos.length === 1 ? porExtremos[0] : undefined;
  if (porExtremo) return porExtremo.id_aluno;

  return null;
}

// ---------------------------------------------------------------------------
// ESTA É A REGRA DA IMPORTAÇÃO, E ELA É DIFERENTE DA DE CIMA.
//
// O acharAluno é generoso: ele tenta casar "Ana Santos" com "Ana Beatriz
// Rocha Santos", porque ali o objetivo é achar o dono de uma folha já escrita,
// e o aluno assinou do jeito dele.
//
// Aqui o objetivo é outro: decidir se um nome do arquivo já está cadastrado.
// Generosidade vira perigo — "Ana Santos" e "Ana Beatriz Rocha Santos" podem
// ser duas alunas de verdade, e tratar como a mesma pessoa deixaria uma delas
// de fora da chamada sem ninguém perceber.
//
// Então aqui é igualdade exata depois de normalizar. Nada de "parecido".
// Duplicado que o professor vê na lista ele apaga em dois toques; aluna que
// nunca foi cadastrada só aparece no dia da prova.
// ---------------------------------------------------------------------------
export function jaEstaNaTurma(nome: string, alunos: AlunoDaTurma[]): boolean {
  const procurado = normalizar(nome);
  if (!procurado) return false;
  return alunos.some((a) => normalizar(a.nome) === procurado);
}

// ---------------------------------------------------------------------------
// O QUE ESTÁ IMPRESSO NA FOLHA, E O QUE O ALUNO ESCREVE NELA
//
// A folha sai em branco e igual para todos — é assim que prova funciona: o
// professor imprime N cópias, distribui, e o aluno se identifica. Então o que
// vem impresso e o que vem à mão identificam coisas diferentes:
//
//   EDU-12-H   impresso, igual em todas as folhas  -> QUAL ATIVIDADE
//   nº chamada escrito pelo aluno, dois dígitos    -> QUAL ALUNO
//   nome       escrito pelo aluno                  -> confirmação
//
// O número de chamada entrou porque dois dígitos à mão a IA lê muito melhor do
// que um nome completo em letra cursiva, e ele já está cadastrado em cada
// aluno da turma. O nome continua valendo quando o número vier em branco.
// ---------------------------------------------------------------------------
export function digitoDaFolha(id_atividade: number): string {
  const base = String(Number(id_atividade) || 0);
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += base.charCodeAt(i) * (i % 2 === 0 ? 3 : 1);
  }
  return '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[soma % 36] as string;
}

// Devolve o id da atividade, ou null quando não dá para ter certeza.
//
// O dígito verificador é o que torna isto seguro: se a IA ler "EDU-21" onde
// estava "EDU-12", a conta não fecha e o código é descartado. Sem ele, a
// prova seria corrigida contra o gabarito de outra atividade — notas erradas
// para a turma inteira, e nada na tela sugerindo que algo deu errado.
//
// Null quer dizer "siga como antes, perguntando a atividade". Isso é seguro.
// Devolver a atividade errada não é.
export function lerCodigoDaFolha(
  texto: string | null | undefined
): { id_atividade: number } | null {
  if (!texto) return null;

  // A IA devolve o código no meio de uma frase, às vezes com espaço entre os
  // caracteres (a folha imprime espaçado, para separar o 1 do 7) ou em caixa
  // baixa. Normaliza antes de conferir.
  const limpo = String(texto).toUpperCase().replace(/[^A-Z0-9-]/g, '');

  const achado = limpo.match(/EDU-(\d{1,7})-([0-9A-Z])/);
  if (!achado) return null;

  const id_atividade = Number(achado[1]);
  if (!id_atividade) return null;

  if (achado[2] !== digitoDaFolha(id_atividade)) return null;

  return { id_atividade };
}

type AlunoComChamada = {
  id_aluno: number;
  nome: string;
  numero_chamada?: number | string | null;
};

// Acha o aluno pelo número de chamada que ele escreveu na folha.
//
// Igualdade exata, e null quando sobra mais de um candidato. O número de
// chamada deveria ser único na turma, mas "deveria" não é garantia — e com
// duas folhas apontando para o mesmo número, chutar uma significa lançar a
// nota de um aluno no boletim do outro.
export function acharPorChamada(
  numero: unknown,
  alunos: AlunoComChamada[]
): number | null {
  const procurado = parseInt(String(numero ?? '').replace(/[^0-9]/g, ''), 10);

  if (!Number.isFinite(procurado) || procurado <= 0) return null;

  const achados = alunos.filter(
    (a) => Number(a.numero_chamada) === procurado
  );

  const unico = achados.length === 1 ? achados[0] : undefined;
  return unico ? unico.id_aluno : null;
}