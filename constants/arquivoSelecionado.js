let selecionado = null;

export function guardarArquivo(arquivo) {
  selecionado = arquivo;
}

export function pegarArquivo() {
  return selecionado;
}

export function limparArquivo() {
  selecionado = null;
}