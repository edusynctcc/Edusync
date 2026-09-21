// ---------------------------------------------------------------------------
// Guarda o arquivo que a professora acabou de escolher no Scanner, para a tela
// de conferência ler logo em seguida.
//
// Por que não mandar pelos params da rota: no navegador o Expo Router põe os
// params na URL. Um PDF vira um texto gigante, passa por codificação de query
// string e volta diferente do que entrou — o arquivo chega corrompido. Aqui ele
// fica na memória, intacto, incluindo o objeto File que o navegador precisa
// para montar o upload.
//
// É só uma variável de módulo: some se a página recarregar. É de propósito —
// nesse caso a tela mostra "nenhum arquivo" e manda voltar pro Scanner, em vez
// de enviar algo pela metade.
// ---------------------------------------------------------------------------
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