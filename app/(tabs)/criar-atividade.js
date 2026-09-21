import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Print from "expo-print";
import { useEffect, useState } from "react";
import { COR, FONTE, RAIO } from "../../components/estilo";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  atualizarAtividade,
  criarAlternativa,
  criarAtividade,
  criarQuestao,
  excluirQuestao,
  listarAlternativas,
  listarQuestoes,
  listarTurmas,
} from "../../constants/api";

const TIPOS = [
  { valor: "alternativa", rotulo: "Alternativa" },
  { valor: "dissertativa", rotulo: "Dissertativa" },
  { valor: "calculo", rotulo: "Cálculo" },
];

const LETRAS = ["A", "B", "C", "D", "E"];

let proximoId = 1;

function novaQuestao() {
  return {
    id: proximoId++,
    enunciado: "",
    peso: "1",
    tipo: "alternativa",
    alternativas: [
      { letra: "A", texto: "" },
      { letra: "B", texto: "" },
      { letra: "C", texto: "" },
      { letra: "D", texto: "" },
    ],
    letraCorreta: "",
    palavrasChave: "",
    respostaEsperada: "",
  };
}

function contarPalavrasChave(texto) {
  return texto
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean).length;
}

function comoNumero(texto) {
  const n = parseFloat(String(texto).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------------------
// Monta a folha de prova em branco, para imprimir e entregar aos alunos.
//
// REGRA QUE NÃO PODE SER QUEBRADA: este documento NUNCA leva o gabarito.
// Nada de letraCorreta, palavrasChave ou respostaEsperada sai daqui — é a
// folha do aluno. O gabarito fica só no banco, para a correção comparar.
//
// O cabeçalho com "Nome do aluno" em linha larga é de propósito: é por ele que
// o scanner identifica de quem é a folha depois.
// ---------------------------------------------------------------------------
function montarHtmlDaProva({ titulo, disciplina, turma, descricao, questoes }) {
  const pesoTotal = questoes.reduce((soma, q) => soma + comoNumero(q.peso), 0);

  const blocos = questoes
    .map((questao, indice) => {
      const peso = comoNumero(questao.peso);
      const rotuloPeso = peso.toFixed(1).replace(".", ",");

      let corpo = "";

      if (questao.tipo === "alternativa") {
        corpo = `<ul class="alternativas">${questao.alternativas
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

      return `
        <section class="questao">
          <div class="questao-topo">
            <span class="numero">${indice + 1}.</span>
            <span class="enunciado">${escaparHtml(questao.enunciado)}</span>
            <span class="peso">${rotuloPeso} pt</span>
          </div>
          ${corpo}
        </section>`;
    })
    .join("");

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

  .alternativas { list-style: none; padding: 0 0 0 22px; margin: 0; }
  .alternativas li { display: flex; align-items: center; gap: 8px; font-size: 12.5px; padding: 4px 0; }
  .marcar { display: inline-block; width: 13px; height: 13px; border: 1.4px solid #17242E; border-radius: 50%; flex: 0 0 13px; }

  .linhas { padding-left: 22px; }
  .linha { border-bottom: 1px solid #C4CAD0; height: 26px; }

  .espaco-calculo { margin-left: 22px; height: 90px; border: 1px dashed #C4CAD0; border-radius: 6px; }
  .resultado { margin: 10px 0 0 22px; font-size: 12.5px; }
  .linha-curta { display: inline-block; width: 160px; border-bottom: 1px solid #17242E; }

  footer { margin-top: 26px; border-top: 1px solid #E9EEF0; padding-top: 8px; font-size: 10px; color: #8795A0; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <header>
    <h1>${escaparHtml(titulo)}</h1>
    <p class="materia">${escaparHtml(disciplina)}${turma ? " · " + escaparHtml(turma) : ""}</p>
    ${descricao.trim() ? `<p class="descricao">${escaparHtml(descricao)}</p>` : ""}
  </header>

  <div class="identificacao">
    <div class="campo"><span>Nome do aluno</span><span class="preencher"></span></div>
    <div class="campo data"><span>Data</span><span class="preencher"></span></div>
  </div>
  <p class="aviso">Escreva seu nome completo com letra legível — é por ele que a prova é identificada.</p>

  ${blocos}

  <footer>
    <span>${questoes.length} ${questoes.length === 1 ? "questão" : "questões"} · total ${pesoTotal.toFixed(1).replace(".", ",")} pontos</span>
    <span>EduSync</span>
  </footer>
</body>
</html>`;
}

export default function CriarAtividade() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();

  // Vindo de "Editar atividade", os dados chegam por parâmetro.
  const { modo, id, tituloInicial, idTurmaInicial } = useLocalSearchParams();
  const emEdicao = modo === "editar";

  const [titulo, setTitulo] = useState(
    typeof tituloInicial === "string" ? tituloInicial : "",
  );
  const [disciplina, setDisciplina] = useState("");
  const [descricao, setDescricao] = useState("");
  const [questoes, setQuestoes] = useState([novaQuestao()]);

  const [turmas, setTurmas] = useState([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  const [modalTurmaAberto, setModalTurmaAberto] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [carregandoQuestoes, setCarregandoQuestoes] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarTurmas() {
      try {
        const dados = await listarTurmas();
        setTurmas(dados);
        if (idTurmaInicial) {
          const turmaAtual = dados.find((t) => t.id_turma === Number(idTurmaInicial));
          if (turmaAtual) setTurmaSelecionada(turmaAtual);
        }
      } catch (e) {
        setErro(e.message);
      }
    }
    carregarTurmas();
  }, []);

  // -------------------------------------------------------------------------
  // Editando: traz as questões que já estão no banco para dentro do formulário.
  //
  // Sem isto, a tela abriria com uma questão em branco e o "salvar" apagaria o
  // gabarito inteiro sem a professora perceber.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!emEdicao || !id) return;

    async function carregarQuestoes() {
      setCarregandoQuestoes(true);
      try {
        const doBanco = await listarQuestoes(id);
        if (doBanco.length === 0) return;

        const convertidas = await Promise.all(
          doBanco
            .slice()
            .sort((a, b) => a.numero - b.numero)
            .map(async (q) => {
              const base = novaQuestao();
              const tipo = q.tipo || "dissertativa";

              if (tipo !== "alternativa") {
                return {
                  ...base,
                  enunciado: q.pergunta || "",
                  peso: String(q.peso ?? 1).replace(".", ","),
                  tipo,
                  palavrasChave: tipo === "dissertativa" ? q.resposta_correta || "" : "",
                  respostaEsperada: tipo === "calculo" ? q.resposta_correta || "" : "",
                };
              }

              const alternativas = await listarAlternativas(q.id_questao).catch(() => []);

              return {
                ...base,
                enunciado: q.pergunta || "",
                peso: String(q.peso ?? 1).replace(".", ","),
                tipo,
                letraCorreta: q.resposta_correta || "",
                alternativas: alternativas.length
                  ? alternativas.map((a) => ({ letra: a.letra, texto: a.texto || "" }))
                  : base.alternativas,
              };
            })
        );

        setQuestoes(convertidas);
      } catch (e) {
        setErro("Não consegui carregar as questões: " + e.message);
      } finally {
        setCarregandoQuestoes(false);
      }
    }

    carregarQuestoes();
  }, [emEdicao, id]);

  function atualizarQuestao(idQuestao, campo, valor) {
    setQuestoes((atuais) =>
      atuais.map((q) => (q.id === idQuestao ? { ...q, [campo]: valor } : q))
    );
  }

  function adicionarQuestao() {
    setQuestoes((atuais) => [...atuais, novaQuestao()]);
  }

  function removerQuestao(id) {
    setQuestoes((atuais) => atuais.filter((q) => q.id !== id));
  }

  function atualizarAlternativa(idQuestao, letra, texto) {
    setQuestoes((atuais) =>
      atuais.map((q) =>
        q.id === idQuestao
          ? {
              ...q,
              alternativas: q.alternativas.map((a) =>
                a.letra === letra ? { ...a, texto } : a
              ),
            }
          : q
      )
    );
  }

  function adicionarAlternativa(idQuestao) {
    setQuestoes((atuais) =>
      atuais.map((q) => {
        if (q.id !== idQuestao) return q;
        const proximaLetra = LETRAS[q.alternativas.length];
        if (!proximaLetra) return q;
        return { ...q, alternativas: [...q.alternativas, { letra: proximaLetra, texto: "" }] };
      })
    );
  }

  function removerAlternativa(idQuestao, letra) {
    setQuestoes((atuais) =>
      atuais.map((q) =>
        q.id === idQuestao
          ? { ...q, alternativas: q.alternativas.filter((a) => a.letra !== letra) }
          : q
      )
    );
  }

  // ---------------------------------------------------------------------------
  // O gabarito de cada tipo mora num campo diferente da tela, mas no banco é
  // sempre a coluna resposta_correta. É aqui que essa tradução acontece.
  //
  // Na dissertativa as palavras-chave vão separadas por ponto-e-vírgula porque
  // é exatamente assim que o notaService separa depois, para contar quantos
  // conceitos o aluno expressou.
  // ---------------------------------------------------------------------------
  function gabaritoDaQuestao(questao) {
    if (questao.tipo === "alternativa") return questao.letraCorreta.trim();
    if (questao.tipo === "calculo") return questao.respostaEsperada.trim();
    return questao.palavrasChave.trim();
  }

  // Confere antes de mandar. Gabarito vazio não dá erro no banco — ele salva
  // e só aparece na hora da correção, com a nota saindo zero sem explicação.
  function primeiroProblema() {
    if (!titulo.trim()) return "Dê um título para a atividade.";
    if (!disciplina.trim()) return "Escolha a disciplina.";
    if (!turmaSelecionada) return "Escolha a turma.";
    if (questoes.length === 0) return "Adicione pelo menos uma questão.";

    for (let i = 0; i < questoes.length; i++) {
      const q = questoes[i];
      const n = i + 1;

      if (!q.enunciado.trim()) return `Escreva o enunciado da questão ${n}.`;
      if (comoNumero(q.peso) <= 0) return `O peso da questão ${n} precisa ser maior que zero.`;

      if (q.tipo === "alternativa") {
        if (!q.letraCorreta) return `Marque a alternativa correta da questão ${n}.`;
        const vazias = q.alternativas.filter((a) => !a.texto.trim());
        if (vazias.length) return `Preencha o texto de todas as alternativas da questão ${n}.`;
      }

      if (q.tipo === "dissertativa" && contarPalavrasChave(q.palavrasChave) === 0) {
        return `Escreva as palavras-chave do gabarito da questão ${n}.`;
      }

      if (q.tipo === "calculo" && !q.respostaEsperada.trim()) {
        return `Escreva o resultado esperado da questão ${n}.`;
      }
    }

    return "";
  }

  // ---------------------------------------------------------------------------
  // Grava as questões da atividade.
  //
  // Editando, apaga as antigas antes: comparar uma a uma para descobrir o que
  // mudou daria muito mais código e mais chance de erro do que refazer.
  //
  // O banco não deixa apagar uma questão que já tem resposta de aluno — e isso
  // é proposital. Se a atividade já foi corrigida, mudar o gabarito por baixo
  // invalidaria notas já dadas. Quando isso acontece, a mensagem explica.
  // ---------------------------------------------------------------------------
  async function gravarQuestoes(id_atividade) {
    if (emEdicao) {
      const antigas = await listarQuestoes(id_atividade);
      for (const q of antigas) {
        await excluirQuestao(q.id_questao);
      }
    }

    for (let i = 0; i < questoes.length; i++) {
      const questao = questoes[i];

      const criada = await criarQuestao(
        i + 1,
        questao.enunciado.trim(),
        questao.tipo,
        gabaritoDaQuestao(questao),
        comoNumero(questao.peso),
        id_atividade
      );

      if (questao.tipo !== "alternativa") continue;

      const id_questao = criada?.id_questao ?? criada?.id;
      if (!id_questao) continue;

      for (const alternativa of questao.alternativas) {
        await criarAlternativa(alternativa.letra, alternativa.texto.trim(), id_questao);
      }
    }
  }

  // Exporta a folha em branco para imprimir. Não precisa ter publicado ainda:
  // sai do que está escrito na tela agora.
  async function salvarProvaEmPdf() {
    if (gerandoPdf) return;

    if (!titulo.trim() || questoes.every((q) => !q.enunciado.trim())) {
      setErro("Escreva o título e pelo menos uma questão antes de gerar a prova.");
      return;
    }

    setGerandoPdf(true);
    setErro("");

    const html = montarHtmlDaProva({
      titulo,
      disciplina,
      turma: turmaSelecionada?.nome || "",
      descricao,
      questoes,
    });

    try {
      if (Platform.OS === "web") {
        // O expo-print no navegador manda a própria página para a impressora
        // em vez do HTML. Por isso abrimos uma janela e imprimimos de lá.
        const janela = window.open("", "_blank");

        if (!janela) {
          setErro(
            "O navegador bloqueou a janela da prova. Libere os pop-ups para este site e tente de novo."
          );
          return;
        }

        janela.document.write(html);
        janela.document.close();
        janela.focus();
        setTimeout(() => janela.print(), 250);
      } else {
        await Print.printAsync({ html });
      }
    } catch (e) {
      if (e?.message && !/cancel|dismiss/i.test(e.message)) {
        setErro("Não consegui gerar a prova: " + e.message);
      }
    } finally {
      setGerandoPdf(false);
    }
  }

  async function publicarAtividade() {
    const problema = primeiroProblema();
    if (problema) {
      setErro(problema);
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      let id_atividade = id;

      if (emEdicao) {
        await atualizarAtividade(id, titulo, disciplina, descricao, turmaSelecionada.id_turma);
      } else {
        const criada = await criarAtividade(
          titulo,
          disciplina,
          descricao,
          turmaSelecionada.id_turma
        );
        id_atividade = criada?.id_atividade ?? criada?.id;

        if (!id_atividade) {
          throw new Error(
            "A atividade foi criada, mas o servidor não devolveu o id — as questões não foram salvas."
          );
        }
      }

      await gravarQuestoes(id_atividade);

      router.replace("/atividades");
    } catch (e) {
      const texto = String(e.message || "");

      // Erro de chave estrangeira ao apagar questão já respondida.
      if (/foreign key|constraint|referenc/i.test(texto)) {
        setErro(
          "Esta atividade já tem folhas corrigidas, então as questões não podem ser trocadas. " +
            "Crie uma atividade nova ou apague as correções antes."
        );
      } else {
        setErro(texto || "Não consegui salvar.");
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={styles.tela}>
      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[
          styles.conteudoInterno,
          ehDesktop && styles.conteudoInternoDesktop,
        ]}
      >
        <View style={ehDesktop ? styles.miolo : null}>
          {ehDesktop ? (
            <View style={styles.cabecalhoDesktopLinha}>
              <TouchableOpacity onPress={() => router.back()} style={styles.voltarLinha}>
                <Ionicons name="arrow-back" size={18} color="#0B1E3D" />
                <Text style={styles.tituloPaginaDesktop}>
                  {emEdicao ? "Editar atividade" : "Criar atividade"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => router.back()} style={styles.voltarLinha}>
              <Ionicons name="arrow-back" size={18} color="#0B1E3D" />
              <Text style={styles.tituloPagina}>
                {emEdicao ? "Editar atividade" : "Criar atividade"}
              </Text>
            </TouchableOpacity>
          )}

          {erro ? <Text style={{ color: "#EF4444", marginBottom: 12 }}>{erro}</Text> : null}

          <View
            style={[styles.secaoCard, ehDesktop && styles.secaoCardDesktop]}
          >
            <View style={styles.secaoCabecalho}>
              <Text style={styles.secaoTitulo}>Informações gerais</Text>
            </View>

            <Text style={styles.rotulo}>
              Título da atividade <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TextInput
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Ex: Prova de Ciências — Fotossíntese"
              placeholderTextColor={COR.tintaFraca}
              style={styles.campoTexto}
            />

            <Text style={styles.rotulo}>
              Disciplina <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TextInput
              value={disciplina}
              onChangeText={setDisciplina}
              placeholder="Ex: Ciências"
              placeholderTextColor={COR.tintaFraca}
              style={styles.campoTexto}
            />

            <Text style={styles.rotulo}>Descrição</Text>
            <TextInput
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Ex: Avaliação bimestral sobre processos das plantas"
              placeholderTextColor={COR.tintaFraca}
              style={[styles.campoTexto, styles.campoTextoArea]}
              multiline
            />

            <Text style={styles.rotulo}>
              Turma <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.campoSelect}
              onPress={() => setModalTurmaAberto(true)}
            >
              <Text
                style={
                  turmaSelecionada ? styles.campoSelectValor : styles.campoSelectPlaceholder
                }
              >
                {turmaSelecionada ? turmaSelecionada.nome : "Selecione a turma"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.avisoBox}>
            <Ionicons
              name="information-circle"
              size={18}
              color={COR.marcador}
            />
            <View style={styles.avisoTextos}>
              <Text style={styles.avisoTitulo}>Isto é o gabarito</Text>
              <Text style={styles.avisoDescricao}>
                A IA corrige as folhas escaneadas comparando com o que você
                preencher aqui.
              </Text>
            </View>
          </View>

          {questoes.map((questao, indice) => (
            <View
              key={questao.id}
              style={[styles.secaoCard, ehDesktop && styles.secaoCardDesktop]}
            >
              <View style={styles.questaoCabecalho}>
                <Text style={styles.numeroQuestao}>QUESTÃO {indice + 1}</Text>
                {questoes.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removerQuestao(questao.id)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={COR.tintaFraca}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.rotulo}>
                Enunciado <Text style={styles.obrigatorio}>*</Text>
              </Text>
              <TextInput
                value={questao.enunciado}
                onChangeText={(v) =>
                  atualizarQuestao(questao.id, "enunciado", v)
                }
                placeholder="Digite o enunciado da questão..."
                placeholderTextColor={COR.tintaFraca}
                style={[styles.campoTexto, styles.campoTextoArea]}
                multiline
              />

              <Text style={styles.rotulo}>Peso</Text>
              <TextInput
                value={questao.peso}
                onChangeText={(v) => atualizarQuestao(questao.id, "peso", v)}
                placeholder="1,0"
                placeholderTextColor={COR.tintaFraca}
                style={[styles.campoTexto, styles.campoPeso]}
                keyboardType="decimal-pad"
              />

              <Text style={styles.rotulo}>
                Tipo <Text style={styles.obrigatorio}>*</Text>
              </Text>
              <View style={styles.tiposGrade}>
                {TIPOS.map((tipo) => {
                  const selecionado = questao.tipo === tipo.valor;
                  return (
                    <TouchableOpacity
                      key={tipo.valor}
                      onPress={() =>
                        atualizarQuestao(questao.id, "tipo", tipo.valor)
                      }
                      style={[
                        styles.tipoPill,
                        selecionado && styles.tipoPillAtivo,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tipoPillTexto,
                          selecionado && styles.tipoPillTextoAtivo,
                        ]}
                      >
                        {tipo.rotulo}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {questao.tipo === "alternativa" && (
                <>
                  <Text style={styles.rotulo}>
                    Alternativas <Text style={styles.obrigatorio}>*</Text>{" "}
                    <Text style={styles.rotuloApoio}>— marque a correta</Text>
                  </Text>

                  {questao.alternativas.map((alternativa) => {
                    const correta = questao.letraCorreta === alternativa.letra;
                    return (
                      <View
                        key={alternativa.letra}
                        style={styles.alternativaLinha}
                      >
                        <TouchableOpacity
                          onPress={() =>
                            atualizarQuestao(
                              questao.id,
                              "letraCorreta",
                              alternativa.letra,
                            )
                          }
                          hitSlop={6}
                          style={[styles.radio, correta && styles.radioAtivo]}
                        />
                        <Text style={styles.alternativaLetra}>
                          {alternativa.letra})
                        </Text>
                        <TextInput
                          value={alternativa.texto}
                          onChangeText={(v) =>
                            atualizarAlternativa(
                              questao.id,
                              alternativa.letra,
                              v,
                            )
                          }
                          placeholder="Texto da alternativa"
                          placeholderTextColor={COR.tintaFraca}
                          style={[styles.campoTexto, styles.alternativaCampo]}
                        />
                        {questao.alternativas.length > 2 && (
                          <TouchableOpacity
                            onPress={() =>
                              removerAlternativa(questao.id, alternativa.letra)
                            }
                            hitSlop={8}
                          >
                            <Ionicons
                              name="close"
                              size={15}
                              color={COR.chevron}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}

                  {questao.alternativas.length < LETRAS.length && (
                    <TouchableOpacity
                      onPress={() => adicionarAlternativa(questao.id)}
                    >
                      <Text style={styles.linkPequeno}>
                        + Adicionar alternativa
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {questao.tipo === "dissertativa" && (
                <>
                  <Text style={styles.rotulo}>
                    Palavras-chave <Text style={styles.obrigatorio}>*</Text>
                  </Text>
                  <TextInput
                    value={questao.palavrasChave}
                    onChangeText={(v) =>
                      atualizarQuestao(questao.id, "palavrasChave", v)
                    }
                    placeholder="luz solar; gás carbônico; água; glicose; oxigênio"
                    placeholderTextColor={COR.tintaFraca}
                    style={styles.campoTexto}
                  />
                  <Text style={styles.dica}>
                    Separe por ponto e vírgula. A IA conta quantas o aluno
                    expressou — mesmo com outras palavras ("H2O" vale por
                    "água") — e a nota é essa fração do peso.
                  </Text>
                  {contarPalavrasChave(questao.palavrasChave) > 0 && (
                    <Text style={styles.dicaForte}>
                      {contarPalavrasChave(questao.palavrasChave)} palavras ·
                      cada uma vale{" "}
                      {(
                        comoNumero(questao.peso) /
                        contarPalavrasChave(questao.palavrasChave)
                      )
                        .toFixed(2)
                        .replace(".", ",")}
                    </Text>
                  )}
                </>
              )}

              {questao.tipo === "calculo" && (
                <>
                  <Text style={styles.rotulo}>
                    Resposta esperada <Text style={styles.obrigatorio}>*</Text>
                  </Text>
                  <TextInput
                    value={questao.respostaEsperada}
                    onChangeText={(v) =>
                      atualizarQuestao(questao.id, "respostaEsperada", v)
                    }
                    placeholder="Ex: 3 g por hora"
                    placeholderTextColor={COR.tintaFraca}
                    style={styles.campoTexto}
                  />
                  <Text style={styles.dica}>
                    A IA confere o resultado e também o caminho. Se o aluno
                    acerta o resultado por caminho errado, ela dá nota parcial e
                    explica.
                  </Text>
                </>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={styles.botaoAdicionarQuestao}
            onPress={adicionarQuestao}
          >
            <Ionicons name="add" size={18} color={COR.marcador} />
            <Text style={styles.botaoAdicionarQuestaoTexto}>
              Adicionar questão
            </Text>
          </TouchableOpacity>

          <View style={[styles.acoesFinais, ehDesktop && styles.acoesFinaisDesktop]}>
            <TouchableOpacity
              style={[styles.botaoProva, ehDesktop && styles.botaoProvaDesktop]}
              onPress={salvarProvaEmPdf}
              disabled={gerandoPdf}
              activeOpacity={0.85}
            >
              <Ionicons name="print-outline" size={16} color={COR.marcador} />
              <Text style={styles.botaoProvaTexto} numberOfLines={1}>
                {gerandoPdf ? "Gerando..." : "Salvar prova em PDF"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botaoPublicar, ehDesktop && styles.botaoPublicarDesktop]}
              onPress={publicarAtividade}
              disabled={salvando}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoPublicarTexto} numberOfLines={1}>
                {salvando ? "Salvando..." : emEdicao ? "Salvar alterações" : "Publicar atividade"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={modalTurmaAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalTurmaAberto(false)}
      >
        <View style={styles.modalTurmaFundo}>
          <View style={styles.modalTurmaCard}>
            <Text style={styles.modalTurmaTitulo}>Selecione a turma</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {turmas.map((t) => (
                <TouchableOpacity
                  key={t.id_turma}
                  style={styles.modalTurmaItem}
                  onPress={() => {
                    setTurmaSelecionada(t);
                    setModalTurmaAberto(false);
                  }}
                >
                  <Text style={styles.modalTurmaItemTexto}>{t.nome}</Text>
                  {t.escola ? (
                    <Text style={styles.modalTurmaItemEscola}>{t.escola}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
              {turmas.length === 0 && (
                <Text style={{ color: "#94A3B8", padding: 12 }}>
                  Nenhuma turma cadastrada ainda.
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalTurmaFechar}
              onPress={() => setModalTurmaAberto(false)}
            >
              <Text style={styles.modalTurmaFecharTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#F4F6FA" },

  conteudo: { flex: 1 },
  conteudoInterno: { padding: 20, paddingBottom: 60, alignItems: "center" },
  conteudoInternoDesktop: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 60,
  },
  miolo: { width: "92%", maxWidth: 760 },

  cabecalhoDesktopLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  voltarLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 22,
  },
  tituloPagina: {
    fontFamily: FONTE.bold,
    fontSize: 18,
    fontWeight: "700",
    color: COR.tintaForte,
  },
  tituloPaginaDesktop: {
    fontFamily: FONTE.bold,
    fontSize: 22,
    fontWeight: "700",
    color: COR.tintaForte,
  },

  secaoCard: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 16,
    marginBottom: 16,
  },
  secaoCardDesktop: { padding: 24, marginBottom: 18 },
  secaoCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  secaoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 14.5,
    fontWeight: "700",
    color: COR.tintaForte,
  },

  questaoCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  numeroQuestao: {
    fontFamily: FONTE.bold,
    fontSize: 12.5,
    fontWeight: "700",
    color: COR.marcador,
  },

  rotulo: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "600",
    color: COR.tintaMedia,
    marginTop: 14,
    marginBottom: 6,
  },
  rotuloApoio: {
    fontFamily: FONTE.regular,
    fontWeight: "400",
    color: COR.tintaFraca,
  },
  obrigatorio: { color: COR.perigo },

  campoTexto: {
    borderWidth: 1,
    borderColor: COR.linha,
    borderRadius: RAIO.controle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaForte,
    backgroundColor: COR.branco,
  },
  campoTextoArea: { minHeight: 72, textAlignVertical: "top" },
  campoPeso: { width: 110 },

  campoSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COR.linha,
    borderRadius: RAIO.controle,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: COR.branco,
  },
  campoSelectPlaceholder: { fontSize: 13, color: "#94A3B8" },
  campoSelectValor: { fontSize: 13, color: "#0B1E3D", fontWeight: "600" },

  avisoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    width: "100%",
    backgroundColor: COR.emAndamentoFundo,
    borderRadius: RAIO.superficie,
    padding: 14,
    marginBottom: 20,
  },
  avisoTextos: { flex: 1 },
  avisoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 12.5,
    fontWeight: "700",
    color: COR.marinho,
  },
  avisoDescricao: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaMedia,
    marginTop: 2,
    lineHeight: 15,
  },

  tiposGrade: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tipoPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RAIO.controle,
    borderWidth: 1,
    borderColor: COR.linha,
    backgroundColor: COR.branco,
  },
  tipoPillAtivo: { backgroundColor: COR.marinho, borderColor: COR.marinho },
  tipoPillTexto: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "600",
    color: COR.tintaMedia,
  },
  tipoPillTextoAtivo: { color: COR.branco },

  alternativaLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COR.linha,
    flexShrink: 0,
  },
  radioAtivo: { borderWidth: 6, borderColor: COR.ok },
  alternativaLetra: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    fontWeight: "700",
    color: COR.tintaMedia,
    width: 22,
    flexShrink: 0,
  },
  alternativaCampo: { flex: 1 },
  linkPequeno: {
    fontFamily: FONTE.semi,
    fontSize: 12,
    fontWeight: "600",
    color: COR.marcador,
    marginTop: 4,
  },

  dica: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaFraca,
    marginTop: 6,
    lineHeight: 16,
  },
  dicaForte: {
    fontFamily: FONTE.semi,
    fontSize: 11.5,
    fontWeight: "600",
    color: COR.tintaMedia,
    marginTop: 4,
  },

  botaoAdicionarQuestao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    borderWidth: 1.5,
    borderColor: COR.marcador,
    borderStyle: "dashed",
    borderRadius: RAIO.superficie,
    paddingVertical: 14,
    marginBottom: 16,
  },
  botaoAdicionarQuestaoTexto: {
    color: COR.marcador,
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    fontWeight: "700",
  },

  acoesFinais: { flexDirection: "row", gap: 12, width: "100%" },
  acoesFinaisDesktop: {
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: COR.linha,
    paddingTop: 22,
  },
  botaoProva: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1.5,
    borderColor: COR.marcador,
    borderRadius: RAIO.controle,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  botaoProvaDesktop: { paddingHorizontal: 20 },
  botaoProvaTexto: { fontFamily: FONTE.bold, fontSize: 13, fontWeight: "700", color: COR.marcador },

  botaoPublicar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: RAIO.superficie,
    backgroundColor: COR.marinho,
  },
  botaoPublicarDesktop: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    paddingHorizontal: 32,
  },
  botaoPublicarTexto: { fontSize: 13.5, fontWeight: "700", color: "#FFFFFF" },

  modalTurmaFundo: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalTurmaCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },
  modalTurmaTitulo: { fontSize: 15, fontWeight: "700", color: "#0B1E3D", marginBottom: 10 },
  modalTurmaItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTurmaItemTexto: { fontSize: 14, fontWeight: "600", color: "#0B1E3D" },
  modalTurmaItemEscola: { fontSize: 11.5, color: "#94A3B8", marginTop: 2 },
  modalTurmaFechar: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  modalTurmaFecharTexto: { fontSize: 13.5, fontWeight: "700", color: "#64748B" },
});