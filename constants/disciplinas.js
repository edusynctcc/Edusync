// ---------------------------------------------------------------------------
// O VISUAL DE CADA DISCIPLINA
//
// Que ícone e que cor uma atividade ganha a partir do nome da disciplina que o
// professor digitou. Como ele digita livremente ("Matemática", "matematica",
// "Mat. Básica"), a busca é por pedaço do nome e sem acento.
//
// Este arquivo existe porque a mesma tabela estava copiada em atividades.js e
// em correcoes.js — e as duas cópias JÁ TINHAM COMEÇADO A DIVERGIR: a de
// Atividades devolvia o campo `biblioteca` e a de Correções não. A tabela em
// si ainda era igual nas duas, mas seria questão de tempo: bastava alguém
// acrescentar "Sociologia" num arquivo e esquecer do outro para a mesma
// atividade aparecer com ícone diferente em duas telas.
//
// A versão daqui devolve `biblioteca` sempre. Quem não usa, ignora.
// ---------------------------------------------------------------------------

export const VISUAL_PADRAO = {
  icone: "file-document-outline",
  biblioteca: "mci",
  corFundo: "#EEF2F4",
  corIcone: "#55646F",
};

const POR_DISCIPLINA = [
  {
    termos: ["matematica", "algebra", "geometria", "calculo", "aritmetica"],
    icone: "function-variant",
    corFundo: "#E7EFF7",
    corIcone: "#2E6FB0",
  },
  {
    termos: ["historia"],
    icone: "book-open-page-variant",
    corFundo: "#FBF1E0",
    corIcone: "#8A4A12",
  },
  {
    termos: ["geografia"],
    icone: "earth",
    corFundo: "#F3EDE6",
    corIcone: "#A85A3C",
  },
  {
    termos: ["ciencias", "biologia", "quimica", "fisica"],
    icone: "flask-outline",
    corFundo: "#E6F2EC",
    corIcone: "#2F7D5C",
  },
  {
    termos: ["portugues", "literatura", "redacao", "gramatica"],
    icone: "format-quote-close",
    corFundo: "#EFEAF7",
    corIcone: "#6B4E9B",
  },
  {
    termos: ["ingles", "espanhol", "frances", "idioma"],
    icone: "translate",
    corFundo: "#E9EEF0",
    corIcone: "#55646F",
  },
  {
    termos: ["arte", "artes", "musica", "educacao fisica"],
    icone: "palette-outline",
    corFundo: "#FBEAE8",
    corIcone: "#B4443A",
  },
];

/**
 * Texto em minúsculas, sem acento e sem espaço nas pontas.
 *
 * Exportado porque as telas de Atividades e Correções usam a MESMA função na
 * busca: quem digita "ciencias" tem que achar "Ciências". Ela mora aqui
 * porque é daqui que ela nasceu (o visualDaDisciplina depende dela) e porque
 * um arquivo só para uma função de quatro linhas seria pior.
 */
export function semAcento(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function visualDaDisciplina(disciplina) {
  const nome = semAcento(disciplina);
  if (!nome) return VISUAL_PADRAO;

  const achou = POR_DISCIPLINA.find((grupo) =>
    grupo.termos.some((termo) => nome.includes(termo)),
  );

  if (!achou) return VISUAL_PADRAO;

  return {
    icone: achou.icone,
    biblioteca: "mci",
    corFundo: achou.corFundo,
    corIcone: achou.corIcone,
  };
}