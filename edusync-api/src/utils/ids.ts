// ---------------------------------------------------------------------------
// IDENTIFICADORES QUE CHEGAM DE FORA
//
// O corpo de uma requisição é JSON, e JSON não garante tipo nenhum. O app
// manda `id_atividade` tirado do endereço da tela, e endereço é sempre
// texto: chegava "10" em vez de 10. O Prisma não converte sozinho e devolve
//
//   Argument `id_atividade`: Expected IntFilter or Int, provided String.
//
// que na tela aparecia como "Deu erro no servidor" na hora de salvar uma
// questão nova numa atividade já existente.
//
// Converter na porta de entrada é mais seguro do que confiar em quem chama:
// o mesmo endpoint é usado pelo app web, pelo app do celular e por quem
// quiser testar com curl.
// ---------------------------------------------------------------------------
export function comoId(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;

  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) return null;

  return numero;
}
