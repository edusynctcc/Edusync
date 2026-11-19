import AsyncStorage from "@react-native-async-storage/async-storage";

// Rascunhos de atividade: ficam só neste aparelho.
//
// Não vão para o banco de propósito. Rascunho é coisa pela metade -- sem
// gabarito, às vezes sem turma -- e o servidor teria de aceitar atividade
// inválida, que é justamente o que a validação existe para impedir. Aqui
// eles não atrapalham ninguém e somem quando a atividade é publicada.
const CHAVE = "rascunhos:atividade";
const LIMITE = 12;

export async function lerRascunhos() {
  try {
    const cru = await AsyncStorage.getItem(CHAVE);
    const lista = cru ? JSON.parse(cru) : [];
    if (!Array.isArray(lista)) return [];
    return lista.sort((a, b) => (b.quando || 0) - (a.quando || 0));
  } catch {
    return [];
  }
}

// Grava por cima do rascunho de mesmo id, ou cria um novo. Devolve o id, que
// é o que a tela guarda para continuar gravando no mesmo lugar.
export async function guardarRascunho(rascunho) {
  const id = rascunho.id || `r${Date.now()}`;
  const corpo = { ...rascunho, id, quando: Date.now() };

  const lista = await lerRascunhos();
  const semEle = lista.filter((r) => r.id !== id);

  try {
    await AsyncStorage.setItem(
      CHAVE,
      JSON.stringify([corpo, ...semEle].slice(0, LIMITE)),
    );
    return id;
  } catch {
    // Quase sempre é falta de espaço, e o que ocupa espaço são as imagens.
    // Guardar o texto sem elas é muito melhor do que perder o rascunho.
  }

  try {
    const questoes = corpo.questoes || [];
    const semImagens = {
      ...corpo,
      imagensPerdidas: questoes.filter((q) => q && q.imagem).length,
      questoes: questoes.map((q) => ({ ...q, imagem: null })),
    };

    await AsyncStorage.setItem(
      CHAVE,
      JSON.stringify([semImagens, ...semEle].slice(0, LIMITE)),
    );
  } catch {
    // Sem espaço nem para o texto: a tela continua funcionando mesmo assim.
  }

  return id;
}

export async function apagarRascunho(id) {
  try {
    const lista = await lerRascunhos();
    await AsyncStorage.setItem(
      CHAVE,
      JSON.stringify(lista.filter((r) => r.id !== id)),
    );
  } catch {
    // mesmo caso de cima
  }
}

export function quandoFoi(ms) {
  const minutos = Math.round((Date.now() - (ms || 0)) / 60000);
  if (minutos < 1) return "agora há pouco";
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.round(minutos / 60);
  if (horas < 24) return horas === 1 ? "há 1 hora" : `há ${horas} horas`;

  const dias = Math.round(horas / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}

export function tituloDoRascunho(r) {
  return (r && r.titulo && r.titulo.trim()) || "Atividade sem título";
}

export function resumoDoRascunho(r) {
  const quantas = (r?.questoes || []).filter(
    (q) => q && (q.enunciado || "").trim(),
  ).length;

  if (quantas === 0) return "nenhuma questão ainda";
  return quantas === 1 ? "1 questão" : `${quantas} questões`;
}
