type AlunoDaTurma = { id_aluno: number; nome: string };

export function normalizar(texto: string | null | undefined) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function acharAluno(nomeLido: string, alunos: AlunoDaTurma[]): number | null {
  const lido = normalizar(nomeLido);
  if (!lido || alunos.length === 0) return null;

  const exatos = alunos.filter((a) => normalizar(a.nome) === lido);
  if (exatos.length > 1) return null;

  const exato = exatos[0];
  if (exato) return exato.id_aluno;

  const contidos = alunos.filter((a) => {
    const cadastrado = normalizar(a.nome);
    return cadastrado.includes(lido) || lido.includes(cadastrado);
  });
  if (contidos.length > 1) return null;

  const contido = contidos[0];
  if (contido) return contido.id_aluno;

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

export function jaEstaNaTurma(nome: string, alunos: AlunoDaTurma[]): boolean {
  const procurado = normalizar(nome);
  if (!procurado) return false;
  return alunos.some((a) => normalizar(a.nome) === procurado);
}

export function digitoDaFolha(id_atividade: number): string {
  const base = String(Number(id_atividade) || 0);
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += base.charCodeAt(i) * (i % 2 === 0 ? 3 : 1);
  }
  return '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[soma % 36] as string;
}

export function lerCodigoDaFolha(
  texto: string | null | undefined
): { id_atividade: number } | null {
  if (!texto) return null;

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