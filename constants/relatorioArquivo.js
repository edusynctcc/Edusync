import { jsPDF } from "jspdf";
import { LOGO_EDUSYNC } from "./logo";

// ---------------------------------------------------------------------------
// O RELATÓRIO EM PDF, DESENHADO AQUI
//
// Mesma razão do provaArquivo.js: o navegador não salva PDF sozinho, só abre a
// janela de impressão. Aqui o arquivo baixa num clique, o texto continua
// sendo texto e as tabelas repetem o cabeçalho quando viram de página -- o
// que a impressão do navegador não garante.
// ---------------------------------------------------------------------------
const PAGINA = { largura: 210, altura: 297 };
const MARGEM = { esq: 16, dir: 16, topo: 14, baixo: 16 };
const UTIL = PAGINA.largura - MARGEM.esq - MARGEM.dir;

const TINTA = "#17242E";
const MARINHO = "#0B1E3D";
const CINZA = "#55646F";
const CINZA_CLARO = "#8795A0";
const RISCO = "#E9EEF0";
const ZEBRA = "#F5F7FA";

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
  doc.text(linhas, x, y, { baseline: "top", align: alinhamento });

  return linhas.length * (tamanho * 0.3528) * entrelinha;
}

function alturaDoTexto(doc, texto, largura, tamanho, entrelinha = 1.35) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(tamanho);
  const linhas = doc.splitTextToSize(String(texto ?? ""), largura);
  return linhas.length * (tamanho * 0.3528) * entrelinha;
}

function desenharCabecalho(folha, { titulo, subtitulo }) {
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
    // Sem a logo o relatório continua válido.
  }

  let y = folha.y;
  y += escrever(doc, titulo, MARGEM.esq, y, larguraTexto, {
    tamanho: 14,
    estilo: "bold",
    cor: MARINHO,
    entrelinha: 1.25,
  });

  if (subtitulo) {
    y += 1;
    y += escrever(doc, subtitulo, MARGEM.esq, y, larguraTexto, {
      tamanho: 9,
      cor: CINZA,
    });
  }

  y += 1;
  escrever(
    doc,
    `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    MARGEM.esq,
    y,
    larguraTexto,
    { tamanho: 8, cor: CINZA_CLARO },
  );
  y += 4;

  folha.y = Math.max(y, folha.y + alturaLogo) + 3;

  doc.setDrawColor(MARINHO);
  doc.setLineWidth(0.6);
  doc.line(MARGEM.esq, folha.y, MARGEM.esq + UTIL, folha.y);
  folha.y += 6;
}

// Uma tabela que sabe virar a página sozinha e levar o cabeçalho junto.
// Sem isso, a segunda folha de uma turma de 35 alunos começa com números
// soltos e ninguém sabe qual coluna é qual.
function desenharTabela(folha, colunas, linhas) {
  const { doc } = folha;

  const sobra = UTIL - colunas.reduce((s, c) => s + (c.largura || 0), 0);
  const flexiveis = colunas.filter((c) => !c.largura).length;

  const larguras = colunas.map((c) =>
    c.largura ? c.largura : sobra / Math.max(flexiveis, 1),
  );

  const alturaCabecalho = 8;

  const cabecalho = () => {
    let x = MARGEM.esq;

    doc.setFillColor(ZEBRA);
    doc.rect(MARGEM.esq, folha.y, UTIL, alturaCabecalho, "F");

    colunas.forEach((coluna, i) => {
      escrever(doc, coluna.titulo, coluna.direita ? x + larguras[i] - 2 : x + 2, folha.y + 2.2, larguras[i] - 4, {
        tamanho: 8.5,
        estilo: "bold",
        cor: CINZA,
        alinhamento: coluna.direita ? "right" : "left",
      });
      x += larguras[i];
    });

    doc.setDrawColor(MARINHO);
    doc.setLineWidth(0.4);
    doc.line(
      MARGEM.esq,
      folha.y + alturaCabecalho,
      MARGEM.esq + UTIL,
      folha.y + alturaCabecalho,
    );

    folha.y += alturaCabecalho + 1.5;
  };

  if (!folha.cabe(alturaCabecalho + 16)) folha.virar();
  cabecalho();

  if (!linhas.length) {
    folha.y += escrever(doc, "Nada corrigido ainda.", MARGEM.esq + 2, folha.y + 1, UTIL, {
      tamanho: 9,
      cor: CINZA_CLARO,
    });
    folha.y += 4;
    return;
  }

  linhas.forEach((linha, indice) => {
    const alturas = colunas.map((coluna, i) =>
      alturaDoTexto(doc, linha[i], larguras[i] - 4, 9),
    );
    const altura = Math.max(...alturas) + 3.6;

    if (!folha.cabe(altura + 4)) {
      folha.virar();
      cabecalho();
    }

    if (indice % 2 === 1) {
      doc.setFillColor(ZEBRA);
      doc.rect(MARGEM.esq, folha.y - 0.8, UTIL, altura, "F");
    }

    let x = MARGEM.esq;
    colunas.forEach((coluna, i) => {
      escrever(
        doc,
        linha[i],
        coluna.direita ? x + larguras[i] - 2 : x + 2,
        folha.y + 0.8,
        larguras[i] - 4,
        {
          tamanho: 9,
          estilo: coluna.forte ? "bold" : "normal",
          alinhamento: coluna.direita ? "right" : "left",
        },
      );
      x += larguras[i];
    });

    folha.y += altura;

    doc.setDrawColor(RISCO);
    doc.setLineWidth(0.2);
    doc.line(MARGEM.esq, folha.y - 0.8, MARGEM.esq + UTIL, folha.y - 0.8);
  });

  folha.y += 4;
}

function desenharSecao(folha, secao) {
  const { doc } = folha;

  if (secao.titulo) {
    if (!folha.cabe(26)) folha.virar();
    folha.y += escrever(doc, secao.titulo, MARGEM.esq, folha.y, UTIL, {
      tamanho: 11,
      estilo: "bold",
      cor: MARINHO,
    });
    if (secao.sub) {
      folha.y += 0.5;
      folha.y += escrever(doc, secao.sub, MARGEM.esq, folha.y, UTIL, {
        tamanho: 8.5,
        cor: CINZA_CLARO,
      });
    }
    folha.y += 2.5;
  }

  desenharTabela(folha, secao.colunas, secao.linhas);
}

function desenharRodape(doc, rodape) {
  const total = doc.getNumberOfPages();

  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina);
    const y = PAGINA.altura - MARGEM.baixo + 6;

    doc.setDrawColor(RISCO);
    doc.setLineWidth(0.3);
    doc.line(MARGEM.esq, y - 3, MARGEM.esq + UTIL, y - 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(CINZA_CLARO);

    doc.text(rodape || "", MARGEM.esq, y, { baseline: "top" });
    doc.text(
      total > 1 ? `EduSync · ${pagina}/${total}` : "EduSync",
      MARGEM.esq + UTIL,
      y,
      { baseline: "top", align: "right" },
    );
  }
}

export function montarPdfDoRelatorio({ titulo, subtitulo, rodape, secoes }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.setProperties({ title: titulo || "Relatório" });

  const folha = novaFolha(doc);

  desenharCabecalho(folha, { titulo, subtitulo });
  (secoes || []).forEach((secao) => desenharSecao(folha, secao));
  desenharRodape(doc, rodape);

  return doc;
}

export function nomeDoRelatorio(titulo) {
  const limpo = String(titulo || "relatorio")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);

  return `${limpo || "relatorio"}.pdf`;
}
