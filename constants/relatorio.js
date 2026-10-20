import * as Print from "expo-print";
import { Platform } from "react-native";
import { LOGO_EDUSYNC } from "./logo";


function escapar(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatarNota(valor) {
  return Number(valor ?? 0)
    .toFixed(1)
    .replace(".", ",");
}

function comQuestoes(questoes) {
  return (questoes || []).filter(
    (q) => q.aproveitamento !== null && q.aproveitamento !== undefined,
  );
}

function daPiorParaMelhor(questoes) {
  return [...comQuestoes(questoes)].sort(
    (a, b) => a.aproveitamento - b.aproveitamento,
  );
}

function resumoDaTurma(grupo) {
  return `${grupo.atividade.turma} · ${grupo.total} ${
    grupo.total === 1 ? "aluno" : "alunos"
  } · média ${formatarNota(grupo.media)}`;
}

function moldura({ titulo, subtitulo, corpo }) {
  const hoje = new Date().toLocaleDateString("pt-BR");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>EduSync — ${escapar(titulo)}</title>
<style>
  /* 8mm tira o cabeçalho que o navegador escreve ao imprimir (a data e a
     URL). Ele é desenhado dentro da margem da página, então com pouca margem
     não cabe. Medido no provaPdf.js: até 8mm sai limpo, de 10mm em diante
     ele volta. */
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    color: #17242E;
    margin: 24px;
  }
  header {
    border-bottom: 2px solid #0B1E3D;
    padding-bottom: 12px;
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .cabecalho-texto { flex: 1; min-width: 0; }
  h1 { font-size: 19px; margin: 0; color: #0B1E3D; }
  header p { margin: 4px 0 0; font-size: 12px; color: #8795A0; }
  /* Fração da largura útil, não um tanto fixo de pixels: se a folha mudar de
     tamanho, a logo acompanha. Mesma regra da folha de prova. */
  .marca { flex: 0 0 7%; }
  .marca img { display: block; width: 100%; height: auto; }

  section { margin-bottom: 20px; }
  h2 { font-size: 14px; margin: 0 0 2px; color: #0B1E3D; }
  .sub { margin: 0 0 10px; font-size: 11px; color: #8795A0; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  /* 6px e não 7: com 20 alunos e 7 questões o documento "tudo" passava da
     página por uns poucos pixels, e a folha 2 saía só com o rodapé. */
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #E9EEF0; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: .4px; color: #8795A0; }
  /* O thead se repete sozinho nas páginas seguintes; o importante é a linha
     não ser cortada no meio. */
  tr { page-break-inside: avoid; }
  .n { width: 34px; text-align: center; }
  .num { text-align: right; white-space: nowrap; }
  /* break-before: avoid porque, quando o relatório realmente passa da página,
     o rodapé sozinho numa folha em branco parece defeito de impressão. Assim
     ele arrasta a última linha da tabela junto. */
  footer {
    break-before: avoid;
    margin-top: 22px;
    font-size: 10px;
    color: #8795A0;
    border-top: 1px solid #E9EEF0;
    padding-top: 10px;
  }
</style>
</head>
<body>
  <header>
    <div class="cabecalho-texto">
      <h1>${escapar(titulo)}</h1>
      <p>${escapar(subtitulo)} · gerado em ${hoje}</p>
    </div>
    <div class="marca"><img src="${LOGO_EDUSYNC}" alt="EduSync" /></div>
  </header>
  ${corpo}
  <footer>
    As notas foram calculadas pelo sistema a partir do gabarito cadastrado e
    revisadas pelo professor. Documento gerado automaticamente pelo EduSync.
  </footer>
</body>
</html>`;
}

function tabelaDasNotas(grupo) {
  const linhas = grupo.alunos
    .map(
      (c) => `
      <tr>
        <td class="n">${c.aluno?.numero_chamada ?? ""}</td>
        <td>${escapar(c.aluno?.nome || "Aluno")}</td>
        <td class="num">${formatarNota(c.nota)} / ${formatarNota(c.peso_total)}</td>
      </tr>`,
    )
    .join("");

  return `
    <table>
      <thead>
        <tr><th class="n">Nº</th><th>Aluno</th><th class="num">Nota</th></tr>
      </thead>
      <tbody>${linhas || '<tr><td colspan="3">Nenhuma folha corrigida.</td></tr>'}</tbody>
    </table>`;
}

function tabelaDasQuestoes(questoes) {
  const linhas = daPiorParaMelhor(questoes)
    .map(
      (q) => `
      <tr>
        <td class="n">${q.numero}</td>
        <td>${escapar(q.pergunta)}</td>
        <td class="num">${q.acertos} de ${q.respondidas}</td>
        <td class="num">${Math.round(q.aproveitamento * 100)}%</td>
      </tr>`,
    )
    .join("");

  return `
    <table>
      <thead>
        <tr>
          <th class="n">Nº</th>
          <th>Questão</th>
          <th class="num">Acertaram</th>
          <th class="num">Aproveitamento</th>
        </tr>
      </thead>
      <tbody>${linhas || '<tr><td colspan="4">Nenhuma questão com resposta corrigida.</td></tr>'}</tbody>
    </table>`;
}

export function montarHtmlDasNotas(grupo) {
  return moldura({
    titulo: `${grupo.atividade.nome} — notas`,
    subtitulo: resumoDaTurma(grupo),
    corpo: tabelaDasNotas(grupo),
  });
}

export function montarHtmlDasQuestoes(grupo, questoes) {
  return moldura({
    titulo: `${grupo.atividade.nome} — desempenho por questão`,
    subtitulo: `${grupo.atividade.turma} · ${grupo.total} ${
      grupo.total === 1 ? "folha corrigida" : "folhas corrigidas"
    } · da questão pior para a melhor`,
    corpo: tabelaDasQuestoes(questoes),
  });
}

export function montarHtmlCompleto(grupo, questoes) {
  return moldura({
    titulo: `${grupo.atividade.nome} — relatório completo`,
    subtitulo: resumoDaTurma(grupo),
    corpo: `
      <section>
        <h2>Notas dos alunos</h2>
        ${tabelaDasNotas(grupo)}
      </section>
      <section>
        <h2>Desempenho por questão</h2>
        <p class="sub">Da que a turma foi pior para a que foi melhor</p>
        ${tabelaDasQuestoes(questoes)}
      </section>`,
  });
}

export async function imprimirRelatorio(html) {
  try {
    if (Platform.OS === "web") {
      const janela = window.open("", "_blank");

      if (!janela) {
        return "O navegador bloqueou a janela do relatório. Libere os pop-ups para este site e tente de novo.";
      }

      janela.document.write(html);
      janela.document.close();
      janela.focus();
      setTimeout(() => janela.print(), 450);
      return "";
    }

    await Print.printAsync({ html });
    return "";
  } catch (e) {
    if (e?.message && !/cancel|dismiss/i.test(e.message)) {
      return "Não consegui gerar o PDF: " + e.message;
    }
    return "";
  }
}

const SEPARADOR = ";";

function celula(valor) {
  const texto = String(valor ?? "");
  if (texto.includes('"') || texto.includes(SEPARADOR) || /[\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function linha(valores) {
  return valores.map(celula).join(SEPARADOR);
}

function cabecalhoDaPlanilha(grupo) {
  return [
    linha([grupo.atividade.nome]),
    linha([grupo.atividade.turma]),
    linha([
      `${grupo.total} ${grupo.total === 1 ? "aluno" : "alunos"}`,
      `média ${formatarNota(grupo.media)}`,
    ]),
  ];
}

function linhasDasNotas(grupo) {
  const linhas = [linha(["Nº", "Aluno", "Nota", "Vale"])];

  grupo.alunos.forEach((c) => {
    linhas.push(
      linha([
        c.aluno?.numero_chamada ?? "",
        c.aluno?.nome || "Aluno",
        formatarNota(c.nota),
        formatarNota(c.peso_total),
      ]),
    );
  });

  return linhas;
}

function fechar(linhas) {
  return "﻿" + linhas.join("\r\n");
}

export function montarCsvDasNotas(grupo) {
  return fechar([...cabecalhoDaPlanilha(grupo), "", ...linhasDasNotas(grupo)]);
}

function nomeDeArquivo(texto) {
  return (
    String(texto ?? "relatorio")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "relatorio"
  );
}

export function baixarPlanilha(nome, csv) {
  if (Platform.OS !== "web") {
    return "Exportar a planilha está disponível no computador. No celular, use o PDF.";
  }

  try {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const endereco = URL.createObjectURL(blob);

    const ancora = document.createElement("a");
    ancora.href = endereco;
    ancora.download = `${nomeDeArquivo(nome)}.csv`;
    document.body.appendChild(ancora);
    ancora.click();
    document.body.removeChild(ancora);

    setTimeout(() => URL.revokeObjectURL(endereco), 1000);
    return "";
  } catch (e) {
    return "Não consegui gerar a planilha: " + (e.message || e);
  }
}