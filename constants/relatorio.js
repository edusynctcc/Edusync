import * as Print from "expo-print";
import { Platform } from "react-native";
import { LOGO_EDUSYNC } from "./logo";

// ---------------------------------------------------------------------------
// OS RELATÓRIOS DAS CORREÇÕES
//
// O PDF tem três versões, montadas a partir de DUAS tabelas:
//
//   "notas"     a lista de alunos com a nota de cada um. É o que vai para o
//               diário, para a secretaria, para o pai que pediu.
//   "questoes"  o desempenho da turma em cada questão. É o que serve para
//               decidir o que revisar na próxima aula.
//   "tudo"      os dois no mesmo documento.
//
// Repare que as tabelas são montadas por funções próprias (tabelaDasNotas e
// tabelaDasQuestoes) e os três documentos só as combinam. Sem isso,
// acrescentar uma coluna significaria mexer em três lugares e esquecer de um
// — e o "tudo" passaria a mostrar uma tabela diferente da que o relatório
// separado mostra.
//
// A PLANILHA tem uma versão só: as notas. Ela é para somar e lançar nota, e
// quem abre o Excel quer a lista de alunos — não o desempenho por questão,
// que é coisa de ler, não de calcular.
//
// Este arquivo existe para a geração acontecer num lugar só: a tela de
// Correções e a de Editar correção chamam daqui. Mesmo motivo do provaPdf.js.
// ---------------------------------------------------------------------------

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

// Só as questões que já têm resposta corrigida. Questão sem resposta não tem
// aproveitamento — mostrar 0% seria mentira.
function comQuestoes(questoes) {
  return (questoes || []).filter(
    (q) => q.aproveitamento !== null && q.aproveitamento !== undefined,
  );
}

// Da pior para a melhor: o relatório é para achar o problema, não para
// conferir a prova na ordem em que ela foi aplicada.
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

// ===========================================================================
// O PDF
//
// A logo entra como base64 vindo do logo.js, e não como caminho de arquivo: o
// expo-print não espera imagem carregar — manda imprimir depois de um
// setTimeout fixo. Embutida, ela já está lá. (No celular, aliás, um require
// de imagem devolveria um número, não um caminho.)
// ===========================================================================
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

// ---------------------------------------------------------------------------
// A tabela de notas.
//
// SEM a coluna "Situação" de propósito: este documento vai para o diário ou
// para a secretaria, e ali "aguardando revisão" não é informação sobre o
// aluno — é sobre o trabalho do professor. Quem lê quer a nota.
// ---------------------------------------------------------------------------
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

// As duas tabelas no mesmo documento. As notas vêm primeiro porque são o que
// alguém procura num relatório de correção; o desempenho por questão é a
// leitura que o professor faz depois, com calma.
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

// Devolve "" quando deu certo, ou a mensagem de erro para a tela mostrar.
export async function imprimirRelatorio(html) {
  try {
    if (Platform.OS === "web") {
      // No navegador o Print.printAsync acaba mandando a própria página do app
      // para a impressora em vez deste HTML — sai a tela com menu lateral e
      // tudo. Por isso aqui abrimos uma janela e imprimimos de lá.
      const janela = window.open("", "_blank");

      if (!janela) {
        return "O navegador bloqueou a janela do relatório. Libere os pop-ups para este site e tente de novo.";
      }

      janela.document.write(html);
      janela.document.close();
      janela.focus();
      // Um instante para o navegador desenhar antes de abrir a impressão.
      // 450ms e não 250: com a logo embutida o desenho demora um pouco mais.
      setTimeout(() => janela.print(), 450);
      return "";
    }

    await Print.printAsync({ html });
    return "";
  } catch (e) {
    // Fechar a caixa de impressão sem imprimir também cai aqui em alguns
    // navegadores. Não é erro que valha assustar ninguém.
    if (e?.message && !/cancel|dismiss/i.test(e.message)) {
      return "Não consegui gerar o PDF: " + e.message;
    }
    return "";
  }
}

// ===========================================================================
// A PLANILHA
//
// É um .csv, e o Excel abre com dois cliques. Três detalhes fazem ele abrir
// CERTO no Excel em português, e cada um é um jeito conhecido de a planilha
// chegar torta:
//
// 1. SEPARADOR ";" e não ",". O Excel configurado em português usa o
//    ponto-e-vírgula como separador de lista. Com vírgula, a planilha inteira
//    chega numa coluna só.
// 2. VÍRGULA DECIMAL. "8,5" é lido como número; "8.5" vira texto, e aí não dá
//    para somar nem ordenar.
// 3. BOM no começo do arquivo. Sem ele o Excel assume a codificação do
//    sistema e "João" vira "JoÃ£o".
//
// A planilha não leva logo: é um arquivo de dados, para colar numa outra
// planilha ou somar. Uma imagem no meio das células só atrapalharia.
//
// E sai só a lista de notas. Duas tabelas num arquivo só obrigariam quem for
// somar a selecionar o bloco certo antes, e o desempenho por questão não é
// número que se calcule — é leitura, e para ler existe o PDF.
// ===========================================================================
const SEPARADOR = ";";

function celula(valor) {
  const texto = String(valor ?? "");
  // Aspas, separador ou quebra de linha dentro do texto obrigam a envolver em
  // aspas — e as aspas de dentro viram duas. Nome de aluno vem do banco.
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

// \r\n e não \n: é o fim de linha que o Excel espera.
function fechar(linhas) {
  return "﻿" + linhas.join("\r\n");
}

export function montarCsvDasNotas(grupo) {
  return fechar([...cabecalhoDaPlanilha(grupo), "", ...linhasDasNotas(grupo)]);
}

// Tira do nome do arquivo o que sistema de arquivos recusa.
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

/**
 * Baixa a planilha. Devolve "" quando deu certo, ou a mensagem para a tela.
 *
 * Só funciona na web por enquanto. No celular seria preciso o
 * expo-file-system (para escrever o arquivo) e o expo-sharing (para abrir o
 * "compartilhar com"), e não dá para deixar isso opcional — um import de
 * pacote que não existe quebra o empacotamento inteiro, não só este botão.
 * Com os dois instalados, são dez linhas aqui.
 */
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

    // Sem isto o blob fica na memória do navegador até a aba fechar.
    setTimeout(() => URL.revokeObjectURL(endereco), 1000);
    return "";
  } catch (e) {
    return "Não consegui gerar a planilha: " + (e.message || e);
  }
}