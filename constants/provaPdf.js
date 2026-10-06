import * as Print from "expo-print";
import { Platform } from "react-native";
import {
  listarAlternativas,
  listarAlunos,
  listarQuestoes,
  listarTurmas,
  urlDaImagem,
} from "./api";
import { qrSvg } from "./qr";

// ---------------------------------------------------------------------------
// A folha de prova em branco — a que o professor imprime e entrega aos alunos.
//
// Este arquivo existe para a geração acontecer num lugar só. A tela de criar
// atividade e a lista de atividades chamam daqui.
//
// REGRA QUE NÃO PODE SER QUEBRADA: este documento NUNCA leva o gabarito.
// Nada de letra correta, palavras-chave ou resultado esperado sai daqui — é a
// folha do aluno. O gabarito fica só no banco, para a correção comparar.
//
// Era justamente por isso que valia um arquivo compartilhado: com uma cópia em
// cada tela, bastaria alguém mexer numa delas para o gabarito vazar só ali, e
// ninguém perceberia até a prova estar na mão dos alunos.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// O CÓDIGO DA FOLHA
//
// Formato: EDU-<atividade>-<aluno>-<D>, onde D é um dígito verificador.
//
// Ele aparece em dois lugares na folha: dentro do QR e impresso em texto ao
// lado dele. Os dois existem por motivos diferentes:
//
//   o texto  é o que funciona HOJE. O Scanner manda a foto para o Gemini, e
//            modelo lê texto impresso muito melhor do que decodifica QR.
//   o QR     é para ler de perto, com a câmera apontada só nele — e para o
//            dia em que a leitura do código sair do modelo e virar um
//            decodificador de verdade.
//
// O dígito verificador é o que separa um dos outros: se o modelo ler "EDU-12-41"
// onde estava "EDU-12-47", a conta não fecha e o servidor descarta o código em
// vez de gravar a nota no boletim do aluno errado. Sem ele, um 1 lido como 7
// seria aceito em silêncio.
// ---------------------------------------------------------------------------
export function digitoDaFolha(id_atividade, id_aluno) {
  const base = `${Number(id_atividade) || 0}-${Number(id_aluno) || 0}`;
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    // O peso alternado faz a troca de dois dígitos vizinhos mudar o resultado;
    // uma soma simples não pegaria "47" lido como "74".
    soma += base.charCodeAt(i) * (i % 2 === 0 ? 3 : 1);
  }
  return "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[soma % 36];
}

export function codigoDaFolha(id_atividade, id_aluno) {
  return `EDU-${id_atividade}-${id_aluno}-${digitoDaFolha(id_atividade, id_aluno)}`;
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function comoNumero(texto) {
  const n = parseFloat(String(texto).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function comVirgula(numero) {
  return Number(numero).toFixed(1).replace(".", ",");
}

// ---------------------------------------------------------------------------
// A IMAGEM DA QUESTÃO PRECISA IR EMBUTIDA NO HTML
//
// O caminho óbvio seria <img src="http://192.168.x.x:3333/uploads/...">. Não
// funciona, por dois motivos:
//
//   1. O expo-print pega o HTML e gera o PDF na hora. Ele não espera imagem
//      remota carregar — o PDF sai com um retângulo vazio no lugar.
//   2. O PDF ficaria dependente do servidor. Abrir o arquivo amanhã, com a API
//      desligada ou com outro IP, mostraria imagem quebrada. Uma prova
//      impressa não pode depender de rede.
//
// Então a imagem é lida e vira um data: URL antes de o HTML ser montado. O PDF
// fica maior, e é um preço justo: ele passa a ser um arquivo inteiro, que
// funciona sozinho.
//
// XMLHttpRequest e não fetch porque ele lê tanto http:// quanto file:// — e o
// criar-atividade gera a prova antes de a imagem subir, quando ela ainda é um
// arquivo local do aparelho.
// ---------------------------------------------------------------------------
function lerComoDataUrl(endereco) {
  return new Promise((resolve, reject) => {
    const requisicao = new XMLHttpRequest();

    requisicao.onload = () => {
      const leitor = new FileReader();
      leitor.onloadend = () => resolve(String(leitor.result || ""));
      leitor.onerror = () => reject(new Error("Não consegui ler a imagem."));
      leitor.readAsDataURL(requisicao.response);
    };

    requisicao.onerror = () => reject(new Error("Não consegui baixar a imagem."));
    requisicao.ontimeout = () => reject(new Error("A imagem demorou demais."));

    requisicao.timeout = 20000;
    requisicao.responseType = "blob";
    requisicao.open("GET", endereco, true);
    requisicao.send(null);
  });
}

// Troca o caminho de cada imagem pelo conteúdo dela. Uma imagem que falhar sai
// da prova sem derrubar as outras: folha sem figura ainda é folha; erro no
// meio da impressão não é.
export async function embutirImagens(questoes) {
  return Promise.all(
    (questoes || []).map(async (questao) => {
      const endereco = urlDaImagem(questao.imagem);
      if (!endereco) return questao;

      try {
        const embutida = await lerComoDataUrl(endereco);
        return { ...questao, imagem: embutida };
      } catch (e) {
        console.warn("[prova] imagem de fora:", e?.message || e);
        return { ...questao, imagem: "" };
      }
    })
  );
}

// questoes: [{ enunciado, peso, tipo, imagem, alternativas: [{letra, texto}] }]
export function montarHtmlDaProva({
  titulo,
  disciplina,
  turma,
  descricao,
  questoes,
  id_atividade,
  alunos,
}) {
  const lista = questoes || [];
  const pesoTotal = lista.reduce((soma, q) => soma + comoNumero(q.peso), 0);

  // -------------------------------------------------------------------------
  // O cabeçalho de identificação.
  //
  // Com aluno, sai o nome impresso, o QR e o código. Sem aluno (turma vazia,
  // ou atividade ainda sem turma), volta a linha em branco de sempre — a
  // prova sai de qualquer jeito, que é melhor do que não sair.
  // -------------------------------------------------------------------------
  const identificacao = (aluno) => {
    if (!aluno) {
      return `<div class="identificacao">
    <div class="campo"><span>Nome do aluno</span><span class="preencher"></span></div>
    <div class="campo data"><span>Data</span><span class="preencher"></span></div>
  </div>
  <p class="aviso">Escreva seu nome completo com letra legível — é por ele que a prova é identificada.</p>`;
    }

    const codigo = codigoDaFolha(id_atividade, aluno.id_aluno);

    return `<div class="identidade">
    <div class="qr">${qrSvg(codigo, 120)}</div>
    <div class="dados">
      <div class="aluno">${escaparHtml(aluno.nome)}</div>
      <div class="codigo">${codigo}</div>
      <div class="nota">Não apague nem cubra este bloco — é por ele que a correção identifica a sua folha.</div>
    </div>
    <div class="campo data"><span>Data</span><span class="preencher"></span></div>
  </div>`;
  };

  const blocos = lista
    .map((questao, indice) => {
      const rotuloPeso = comVirgula(comoNumero(questao.peso));
      let corpo = "";

      if (questao.tipo === "alternativa") {
        corpo = `<ul class="alternativas">${(questao.alternativas || [])
          .map(
            (a) =>
              `<li><span class="marcar"></span><b>${escaparHtml(a.letra)})</b> ${escaparHtml(a.texto)}</li>`
          )
          .join("")}</ul>`;
      } else if (questao.tipo === "calculo") {
        corpo =
          '<div class="espaco-calculo"></div>' +
          '<p class="resultado">Resultado: <span class="linha-curta"></span></p>';
      } else {
        corpo = '<div class="linhas">' + '<div class="linha"></div>'.repeat(4) + "</div>";
      }

      // A figura entra entre o enunciado e o espaço de resposta — é onde o
      // aluno espera encontrar, e é o que mantém a leitura na ordem natural.
      const figura = questao.imagem
        ? `<figure class="figura"><img src="${questao.imagem}" alt="" /></figure>`
        : "";

      return `
        <section class="questao">
          <div class="questao-topo">
            <span class="numero">${indice + 1}.</span>
            <span class="enunciado">${escaparHtml(questao.enunciado)}</span>
            <span class="peso">${rotuloPeso} pt</span>
          </div>
          ${figura}
          ${corpo}
        </section>`;
    })
    .join("");

  // Uma seção por aluno. Sem lista de alunos, uma só, em branco.
  const paraQuem = Array.isArray(alunos) && alunos.length > 0 ? alunos : [null];

  const folhas = paraQuem
    .map(
      (aluno) => `<section class="folha">
  <header>
    <h1>${escaparHtml(titulo)}</h1>
    <p class="materia">${escaparHtml(disciplina)}${turma ? " · " + escaparHtml(turma) : ""}</p>
    ${String(descricao || "").trim() ? `<p class="descricao">${escaparHtml(descricao)}</p>` : ""}
  </header>

  ${identificacao(aluno)}

  ${blocos}

  <footer>
    <span>${lista.length} ${lista.length === 1 ? "questão" : "questões"} · total ${comVirgula(pesoTotal)} pontos</span>
    <span>EduSync</span>
  </footer>
</section>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escaparHtml(titulo)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #17242E; margin: 30px 34px; }
  header { border-bottom: 2px solid #0B1E3D; padding-bottom: 10px; }
  h1 { font-size: 18px; margin: 0 0 3px; color: #0B1E3D; }
  .materia { font-size: 12px; color: #55646F; margin: 0; }
  .descricao { font-size: 11.5px; color: #55646F; margin: 10px 0 0; line-height: 1.5; }

  .identificacao { display: flex; gap: 18px; margin: 16px 0 6px; font-size: 12px; }
  .campo { flex: 1; }
  .campo.data { flex: 0 0 150px; }
  .campo span { color: #55646F; }
  .campo .preencher { display: block; border-bottom: 1px solid #17242E; height: 22px; margin-top: 2px; }

  .aviso { font-size: 10.5px; color: #8795A0; margin: 2px 0 16px; }

  .questao { margin-bottom: 20px; page-break-inside: avoid; }
  .questao-topo { display: flex; gap: 8px; align-items: baseline; margin-bottom: 8px; }
  .numero { font-weight: 700; font-size: 13px; }
  .enunciado { flex: 1; font-size: 13px; line-height: 1.45; }
  .peso { font-size: 10.5px; color: #8795A0; white-space: nowrap; }

  /* A figura da questão. A altura máxima existe porque foto de celular em
     retrato ocuparia a página inteira e empurraria o espaço de resposta para
     a folha seguinte. */
  .figura { margin: 0 0 10px 22px; padding: 0; }
  .figura img { display: block; max-width: 92%; max-height: 260px; border: 1px solid #E9EEF0; border-radius: 4px; }

  .alternativas { list-style: none; padding: 0 0 0 22px; margin: 0; }
  .alternativas li { display: flex; align-items: center; gap: 8px; font-size: 12.5px; padding: 4px 0; }
  .marcar { display: inline-block; width: 13px; height: 13px; border: 1.4px solid #17242E; border-radius: 50%; flex: 0 0 13px; }

  .linhas { padding-left: 22px; }
  .linha { border-bottom: 1px solid #C4CAD0; height: 26px; }

  .espaco-calculo { margin-left: 22px; height: 90px; border: 1px dashed #C4CAD0; border-radius: 6px; }
  .resultado { margin: 10px 0 0 22px; font-size: 12.5px; }
  .linha-curta { display: inline-block; width: 160px; border-bottom: 1px solid #17242E; }

  footer { margin-top: 26px; border-top: 1px solid #E9EEF0; padding-top: 8px; font-size: 10px; color: #8795A0; display: flex; justify-content: space-between; }

  /* Uma folha por aluno. A última não leva quebra, senão sai uma página em
     branco no fim do PDF. */
  .folha { page-break-after: always; }
  .folha:last-child { page-break-after: auto; }

  /* O bloco de identificação do aluno, que substitui a linha em branco. */
  /* O font-size explicito importa: sem ele o campo "Data" aqui dentro herda
     o tamanho do body e sai maior que o do resto da folha. */
  .identidade { display: flex; gap: 14px; align-items: center; border: 1px solid #17242E; border-radius: 8px; padding: 12px 14px; margin-bottom: 6px; font-size: 12px; }
  .identidade .qr { flex: 0 0 auto; line-height: 0; }
  .identidade .dados { flex: 1; min-width: 0; }
  .identidade .aluno { font-size: 15px; font-weight: 700; color: #0B1E3D; }
  /* Monoespaçada e espaçada: é este texto que a IA lê na hora de corrigir, e
     fonte de largura fixa separa melhor o 1 do 7 e o 0 do O. */
  .identidade .codigo { font-family: "Courier New", Courier, monospace; font-size: 14px; letter-spacing: 2px; color: #17242E; margin-top: 4px; }
  .identidade .nota { font-size: 10px; color: #8795A0; margin-top: 5px; }
</style>
</head>
<body>
  ${folhas}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Manda o HTML para a impressão do sistema, onde "Salvar como PDF" é uma das
// opções.
//
// No navegador o Print.printAsync do expo-print acaba imprimindo a própria
// página do app em vez do HTML que passamos — sai a tela com menu lateral e
// tudo. Por isso no web abrimos uma janela, escrevemos o documento nela e
// mandamos imprimir dali. No celular o expo-print funciona como deveria.
//
// Devolve "" quando deu certo, ou a mensagem de erro para a tela mostrar.
// ---------------------------------------------------------------------------
export async function imprimirHtml(html) {
  try {
    if (Platform.OS === "web") {
      const janela = window.open("", "_blank");

      if (!janela) {
        return "O navegador bloqueou a janela do documento. Libere os pop-ups para este site e tente de novo.";
      }

      janela.document.write(html);
      janela.document.close();
      janela.focus();
      // Um instante para o navegador desenhar antes de abrir a impressão,
      // senão em alguns casos ele imprime a folha ainda em branco. Com imagem
      // embutida o desenho demora um pouco mais, por isso 450ms e não 250.
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

// ---------------------------------------------------------------------------
// Imprime a prova de uma atividade que já está no banco.
//
// Busca as questões pela API. As alternativas vêm numa chamada por questão,
// mas só para as do tipo "alternativa" — dissertativa e cálculo não têm.
// ---------------------------------------------------------------------------
export async function imprimirProvaDaAtividade(atividade) {
  const id_atividade = atividade.id_atividade ?? atividade.id;

  const doBanco = await listarQuestoes(id_atividade);

  if (!doBanco || doBanco.length === 0) {
    return "Esta atividade ainda não tem questões cadastradas.";
  }

  const emOrdem = doBanco.slice().sort((a, b) => a.numero - b.numero);

  const questoes = await Promise.all(
    emOrdem.map(async (q) => {
      const tipo = q.tipo || "dissertativa";

      const alternativas =
        tipo === "alternativa"
          ? await listarAlternativas(q.id_questao).catch(() => [])
          : [];

      return {
        enunciado: q.pergunta || "",
        peso: q.peso ?? 1,
        tipo,
        imagem: q.imagem || "",
        alternativas: alternativas.map((a) => ({
          letra: a.letra || "",
          texto: a.texto || "",
        })),
      };
    })
  );

  // O nome da turma não vem junto da atividade, só o id. Buscamos para o
  // cabeçalho — e se falhar, a prova sai sem a turma em vez de não sair.
  let turma = atividade.turma || "";

  if (!turma && atividade.id_turma) {
    const turmas = await listarTurmas().catch(() => []);
    turma = turmas.find((t) => t.id_turma === atividade.id_turma)?.nome || "";
  }

  // Os alunos da turma, para sair uma folha por aluno com o nome impresso.
  //
  // Se a busca falhar, ou a turma estiver vazia, a prova sai com a linha em
  // branco de sempre em vez de não sair. O professor prefere uma folha
  // genérica a um erro na hora de imprimir.
  let alunos = [];

  if (atividade.id_turma) {
    const lidos = await listarAlunos(atividade.id_turma).catch(() => []);
    alunos = (lidos || [])
      .slice()
      .sort(
        (a, b) =>
          (Number(a.numero_chamada) || 999) - (Number(b.numero_chamada) || 999) ||
          String(a.nome || "").localeCompare(String(b.nome || ""))
      );
  }

  return imprimirHtml(
    montarHtmlDaProva({
      titulo: atividade.nome || atividade.titulo || "Atividade",
      disciplina: atividade.disciplina || "",
      turma,
      descricao: atividade.descricao || "",
      questoes: await embutirImagens(questoes),
      id_atividade,
      alunos,
    })
  );
}