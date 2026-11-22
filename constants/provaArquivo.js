import { jsPDF } from "jspdf";
import { LOGO_EDUSYNC } from "./logo";
import { matrizDoQr } from "./qr";

// ---------------------------------------------------------------------------
// A PROVA EM PDF, DESENHADA AQUI
//
// O outro caminho (montar HTML e pedir para o navegador imprimir) continua
// existindo, e é ele que o botão "Imprimir" usa. Este aqui existe porque
// navegador nenhum deixa um site salvar PDF sozinho: ele só sabe abrir a
// janela de impressão e esperar a pessoa escolher "Salvar como PDF".
//
// Desenhando a folha nós mesmos, o arquivo baixa num clique, o texto continua
// sendo texto (dá para selecionar e a leitura por máquina não erra) e o
// arquivo fica em alguns KB em vez de virar uma foto da página.
//
// Tudo em milímetros, porque o papel é em milímetros. A4 = 210 x 297.
// ---------------------------------------------------------------------------
const PAGINA = { largura: 210, altura: 297 };
const MARGEM = { esq: 16, dir: 16, topo: 14, baixo: 16 };
const UTIL = PAGINA.largura - MARGEM.esq - MARGEM.dir;
const RECUO = 7; // o quanto o corpo da questão anda para a direita do número

const TINTA = "#17242E";
const MARINHO = "#0B1E3D";
const CINZA = "#55646F";
const CINZA_CLARO = "#8795A0";
const LINHA = "#C4CAD0";

function comoNumero(texto) {
  const n = parseFloat(String(texto).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function comVirgula(numero) {
  return Number(numero).toFixed(1).replace(".", ",");
}

export function separarItens(enunciado) {
  const linhas = String(enunciado || "").split("\n");
  const itens = [];

  while (linhas.length) {
    const ultima = linhas[linhas.length - 1].trim();
    if (!ultima) {
      linhas.pop();
      continue;
    }
    const achou = ultima.match(/^([a-z]|\d{1,2})\)\s*(.+)$/i);
    if (!achou) break;
    itens.unshift({ letra: achou[1].toLowerCase(), texto: achou[2].trim() });
    linhas.pop();
  }

  if (itens.length < 2 || itens[0].letra !== "a") return null;
  return { comando: linhas.join("\n").trim(), itens };
}

// Uma folha é uma sequência de coisas empilhadas, e a única pergunta que
// importa a cada passo é "ainda cabe?". Este objeto responde isso.
function novaFolha(doc) {
  return {
    doc,
    y: MARGEM.topo,
    fundo() {
      return PAGINA.altura - MARGEM.baixo;
    },
    cabe(altura) {
      return this.y + altura <= this.fundo();
    },
    virar() {
      this.doc.addPage();
      this.y = MARGEM.topo;
    },
    garantir(altura) {
      if (!this.cabe(altura)) this.virar();
    },
  };
}

function escrever(doc, texto, x, y, largura, opcoes = {}) {
  const {
    tamanho = 9,
    estilo = "normal",
    cor = TINTA,
    entrelinha = 1.35,
    alinhamento = "left",
  } = opcoes;

  doc.setFont("helvetica", estilo);
  doc.setFontSize(tamanho);
  doc.setTextColor(cor);

  const linhas = doc.splitTextToSize(String(texto ?? ""), largura);
  const altura = (tamanho * 0.3528) * entrelinha;

  doc.text(linhas, x, y, { baseline: "top", align: alinhamento });
  return linhas.length * altura;
}

function alturaDoTexto(doc, texto, largura, tamanho, estilo = "normal", entrelinha = 1.35) {
  doc.setFont("helvetica", estilo);
  doc.setFontSize(tamanho);
  const linhas = doc.splitTextToSize(String(texto ?? ""), largura);
  return linhas.length * (tamanho * 0.3528) * entrelinha;
}

function linhaDeResposta(doc, x, y, largura) {
  doc.setDrawColor(LINHA);
  doc.setLineWidth(0.25);
  doc.line(x, y, x + largura, y);
}

// ------------------------------------------------------------------ cabeçalho
function desenharCabecalho(folha, { titulo, disciplina, turma, descricao }) {
  const { doc } = folha;

  const larguraLogo = 13;
  const alturaLogo = larguraLogo * 1.25;
  const larguraTexto = UTIL - larguraLogo - 6;

  try {
    doc.addImage(
      LOGO_EDUSYNC,
      "PNG",
      MARGEM.esq + UTIL - larguraLogo,
      folha.y,
      larguraLogo,
      alturaLogo,
    );
  } catch {
    // Sem a logo a prova continua válida; não vale derrubar o PDF por ela.
  }

  let y = folha.y;
  y += escrever(doc, titulo || "Prova", MARGEM.esq, y, larguraTexto, {
    tamanho: 14,
    estilo: "bold",
    cor: MARINHO,
    entrelinha: 1.25,
  });

  const materia = [disciplina, turma].filter(Boolean).join(" · ");
  if (materia) {
    y += 1;
    y += escrever(doc, materia, MARGEM.esq, y, larguraTexto, {
      tamanho: 9,
      cor: CINZA,
    });
  }

  if (String(descricao || "").trim()) {
    y += 2;
    y += escrever(doc, descricao, MARGEM.esq, y, larguraTexto, {
      tamanho: 8.5,
      cor: CINZA,
      entrelinha: 1.45,
    });
  }

  folha.y = Math.max(y, folha.y + alturaLogo) + 3;

  doc.setDrawColor(MARINHO);
  doc.setLineWidth(0.6);
  doc.line(MARGEM.esq, folha.y, MARGEM.esq + UTIL, folha.y);
  folha.y += 5;
}

// ------------------------------------------------------------ identificação
function desenharQr(doc, codigo, x, y, lado) {
  const matriz = matrizDoQr(codigo);
  const n = matriz.length;
  const margem = 2; // módulos de borda branca, exigidos pelo padrão
  const total = n + margem * 2;
  const modulo = lado / total;

  doc.setFillColor("#FFFFFF");
  doc.rect(x, y, lado, lado, "F");

  doc.setFillColor("#000000");
  for (let l = 0; l < n; l++) {
    for (let c = 0; c < n; c++) {
      if (!matriz[l][c]) continue;
      doc.rect(
        x + (c + margem) * modulo,
        y + (l + margem) * modulo,
        modulo + 0.02, // sobreposição mínima: sem ela aparecem fios brancos
        modulo + 0.02,
        "F",
      );
    }
  }
}

function desenharIdentificacao(folha, codigo) {
  const { doc } = folha;

  const altura = 34;
  folha.garantir(altura + 10);

  const x = MARGEM.esq;
  const y = folha.y;

  doc.setDrawColor(TINTA);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, UTIL, altura, 2, 2, "S");

  const padding = 4;
  let xDados = x + padding;

  if (codigo) {
    const lado = 24;
    desenharQr(doc, codigo, x + padding, y + padding, lado);

    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(TINTA);
    doc.setCharSpace(0.4);
    doc.text(codigo, x + padding + lado / 2, y + padding + lado + 3.2, {
      align: "center",
      baseline: "top",
    });
    doc.setCharSpace(0);

    xDados = x + padding + lado + 6;
  }

  const larguraDados = x + UTIL - padding - xDados;

  // Nome do aluno
  let yd = y + padding + 1;
  escrever(doc, "Nome do aluno", xDados, yd, larguraDados, {
    tamanho: 8,
    cor: CINZA,
  });
  yd += 7;
  doc.setDrawColor(TINTA);
  doc.setLineWidth(0.3);
  doc.line(xDados, yd, xDados + larguraDados, yd);

  // Data e número de chamada
  yd += 5;
  const larguraCasinha = 9;
  const alturaCasinha = 11;
  const larguraChamada = larguraCasinha * 2 + 3;
  const larguraData = larguraDados - larguraChamada - 8;

  escrever(doc, "Data", xDados, yd, larguraData, { tamanho: 8, cor: CINZA });
  doc.line(xDados, yd + 9, xDados + larguraData, yd + 9);

  const xChamada = xDados + larguraDados - larguraChamada;
  escrever(doc, "Nº de chamada", xChamada - 6, yd, larguraChamada + 12, {
    tamanho: 8,
    cor: CINZA,
    alinhamento: "left",
  });

  doc.setLineWidth(0.5);
  for (let i = 0; i < 2; i++) {
    doc.roundedRect(
      xChamada + i * (larguraCasinha + 3),
      yd + 4,
      larguraCasinha,
      alturaCasinha,
      1,
      1,
      "S",
    );
  }

  folha.y = y + altura + 2.5;

  folha.y += escrever(
    doc,
    "Escreva o seu número de chamada nas duas casinhas e o seu nome completo. É por eles que a prova é identificada.",
    MARGEM.esq,
    folha.y,
    UTIL,
    { tamanho: 7.5, cor: CINZA_CLARO },
  );

  folha.y += 4;
}

// ------------------------------------------------------------------ questões
function desenharQuestao(folha, questao, indice) {
  const { doc } = folha;

  const comItens =
    questao.tipo === "alternativa" ? null : separarItens(questao.enunciado);
  const textoEnunciado = comItens ? comItens.comando : questao.enunciado;

  const xCorpo = MARGEM.esq + RECUO;
  const larguraCorpo = UTIL - RECUO;
  const larguraEnunciado = larguraCorpo - 18; // espaço do peso, à direita

  const alturaEnunciado = alturaDoTexto(
    doc,
    textoEnunciado,
    larguraEnunciado,
    9.5,
    "normal",
    1.45,
  );

  // A questão não começa numa página se o enunciado e ao menos um pedaço da
  // resposta não couberem junto: número órfão no pé da folha é pior que
  // espaço em branco.
  folha.garantir(alturaEnunciado + 22);

  const y = folha.y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(TINTA);
  doc.text(`${indice + 1}.`, MARGEM.esq, y, { baseline: "top" });

  escrever(doc, textoEnunciado, xCorpo, y, larguraEnunciado, {
    tamanho: 9.5,
    entrelinha: 1.45,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(CINZA_CLARO);
  doc.text(
    `${comVirgula(comoNumero(questao.peso))} pt`,
    MARGEM.esq + UTIL,
    y + 0.6,
    { baseline: "top", align: "right" },
  );

  folha.y = y + alturaEnunciado + 3;

  // ------------------------------------------------------------- a figura
  if (questao.imagem) {
    try {
      const propriedades = doc.getImageProperties(questao.imagem);
      const larguraMax = larguraCorpo * 0.92;
      const alturaMax = 62;

      let largura = larguraMax;
      let altura = (propriedades.height / propriedades.width) * largura;

      if (altura > alturaMax) {
        altura = alturaMax;
        largura = (propriedades.width / propriedades.height) * altura;
      }

      folha.garantir(altura + 6);
      doc.addImage(questao.imagem, xCorpo, folha.y, largura, altura);
      doc.setDrawColor("#E9EEF0");
      doc.setLineWidth(0.2);
      doc.rect(xCorpo, folha.y, largura, altura, "S");
      folha.y += altura + 4;
    } catch {
      // Imagem que o gerador não consegue ler não pode impedir a prova de
      // sair: a questão vai sem ela.
    }
  }

  // -------------------------------------------------------------- o corpo
  if (questao.tipo === "alternativa") {
    for (const alternativa of questao.alternativas || []) {
      const texto = `${alternativa.letra}) ${alternativa.texto}`;
      const altura = alturaDoTexto(doc, texto, larguraCorpo - 7, 9);

      folha.garantir(altura + 2);

      doc.setDrawColor(TINTA);
      doc.setLineWidth(0.35);
      doc.circle(xCorpo + 1.8, folha.y + 1.9, 1.8, "S");

      escrever(doc, texto, xCorpo + 6, folha.y, larguraCorpo - 7, {
        tamanho: 9,
      });

      folha.y += altura + 1.6;
    }
  } else if (questao.tipo === "calculo") {
    folha.garantir(30);
    doc.setDrawColor(LINHA);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1.2, 1.2], 0);
    doc.roundedRect(xCorpo, folha.y, larguraCorpo, 24, 1.5, 1.5, "S");
    doc.setLineDashPattern([], 0);
    folha.y += 27;

    escrever(doc, "Resultado:", xCorpo, folha.y, 30, { tamanho: 9 });
    doc.setDrawColor(TINTA);
    doc.setLineWidth(0.3);
    doc.line(xCorpo + 19, folha.y + 3.6, xCorpo + 19 + 45, folha.y + 3.6);
    folha.y += 6;
  } else if (comItens) {
    for (const item of comItens.itens) {
      const texto = `${item.letra}) ${item.texto}`;
      const altura = alturaDoTexto(doc, texto, larguraCorpo, 9);

      folha.garantir(altura + 9);
      escrever(doc, texto, xCorpo, folha.y, larguraCorpo, { tamanho: 9 });
      folha.y += altura + 6;
      linhaDeResposta(doc, xCorpo, folha.y, larguraCorpo);
      folha.y += 3;
    }
  } else {
    for (let i = 0; i < 4; i++) {
      folha.garantir(8);
      folha.y += 7;
      linhaDeResposta(doc, xCorpo, folha.y, larguraCorpo);
    }
    folha.y += 2;
  }

  folha.y += 6;
}

// -------------------------------------------------------------------- rodapé
function desenharRodape(doc, quantas, pesoTotal) {
  const total = doc.getNumberOfPages();

  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina);

    const y = PAGINA.altura - MARGEM.baixo + 6;

    doc.setDrawColor("#E9EEF0");
    doc.setLineWidth(0.3);
    doc.line(MARGEM.esq, y - 3, MARGEM.esq + UTIL, y - 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(CINZA_CLARO);

    doc.text(
      `${quantas} ${quantas === 1 ? "questão" : "questões"} · total ${comVirgula(pesoTotal)} pontos`,
      MARGEM.esq,
      y,
      { baseline: "top" },
    );

    doc.text(
      total > 1 ? `EduSync · ${pagina}/${total}` : "EduSync",
      MARGEM.esq + UTIL,
      y,
      { baseline: "top", align: "right" },
    );
  }
}

export function montarPdfDaProva({
  titulo,
  disciplina,
  turma,
  descricao,
  questoes,
  codigo,
}) {
  const lista = questoes || [];
  const pesoTotal = lista.reduce((soma, q) => soma + comoNumero(q.peso), 0);

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.setProperties({ title: titulo || "Prova" });

  const folha = novaFolha(doc);

  desenharCabecalho(folha, { titulo, disciplina, turma, descricao });
  desenharIdentificacao(folha, codigo);

  lista.forEach((questao, indice) => desenharQuestao(folha, questao, indice));

  desenharRodape(doc, lista.length, pesoTotal);

  return doc;
}

export function nomeDoArquivo(titulo) {
  const limpo = String(titulo || "prova")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);

  return `${limpo || "prova"}.pdf`;
}
