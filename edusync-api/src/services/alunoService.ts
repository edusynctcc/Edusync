type AlunoDaTurma = { id_aluno: number; nome: string };

function normalizar(texto: string | null | undefined) {
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
