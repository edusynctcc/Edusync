import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { COR, FONTE, RAIO } from "../../components/estilo";
import {
  atualizarAtividade,
  criarAlternativa,
  criarAtividade,
  criarQuestao,
  enviarImagemDaQuestao,
  excluirQuestao,
  lerAtividadeDeArquivo,
  listarAlternativas,
  listarQuestoes,
  listarTurmas,
  urlDaImagem,
} from "../../constants/api";
import {
  embutirImagens,
  imprimirHtml,
  montarHtmlDaProva,
} from "../../constants/provaPdf";

const TIPOS = [
  { valor: "alternativa", rotulo: "Alternativa" },
  { valor: "dissertativa", rotulo: "Dissertativa" },
  { valor: "calculo", rotulo: "Cálculo" },
];

const LETRAS = ["A", "B", "C", "D", "E"];

// Os tipos que a importação de atividade aceita. O octet-stream entra porque
// o Android não identifica arquivo vindo do Drive e o deixaria cinza no
// seletor; o servidor confere a extensão.
const TIPOS_DA_ATIVIDADE = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/*",
  "text/plain",
  "application/octet-stream",
];

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

    // A figura da questão — charge, gráfico, o desenho do problema.
    //
    // Guarda { uri, mime, objetoWeb, caminho }:
    //   uri       onde a imagem está AGORA (arquivo do aparelho ou URL da API)
    //   caminho   o que está gravado no banco, quando já foi enviada
    //
    // Null quer dizer "esta questão não tem figura".
    imagem: null,
  };
}

// Uma questão "em branco" é a que o professor ainda não tocou. Serve para a
// importação decidir entre SUBSTITUIR a questão inicial vazia e ACRESCENTAR
// as lidas depois do que ele já digitou. Apagar trabalho dele seria pior do
// que deixar uma questão vazia sobrando, que ele remove no lixeirinha.
function questaoEmBranco(q) {
  return (
    !q.enunciado.trim() &&
    !q.letraCorreta &&
    !q.palavrasChave.trim() &&
    !q.respostaEsperada.trim() &&
    !q.imagem &&
    q.alternativas.every((a) => !a.texto.trim())
  );
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

// ---------------------------------------------------------------------------
// Lê um arquivo como Blob — serve tanto para file:// do aparelho quanto para
// http:// da API.
//
// XMLHttpRequest e não fetch: no Expo deste projeto o fetch devolveu Blob de
// 0 KB ao ler arquivo local. Foi o que derrubou o envio da folha no Scanner, e
// não vale repetir o erro aqui.
// ---------------------------------------------------------------------------
function lerComoBlob(endereco) {
  return new Promise((resolve, reject) => {
    const requisicao = new XMLHttpRequest();
    requisicao.onload = () => resolve(requisicao.response);
    requisicao.onerror = () =>
      reject(new Error("Não consegui ler essa imagem."));
    requisicao.ontimeout = () =>
      reject(new Error("A leitura da imagem demorou demais."));
    requisicao.timeout = 20000;
    requisicao.responseType = "blob";
    requisicao.open("GET", endereco, true);
    requisicao.send(null);
  });
}

// ---------------------------------------------------------------------------
// Editar uma atividade apaga as questões e cria de novo (ver gravarQuestoes).
// Isso significa que a imagem da questão antiga some junto com ela — e o
// professor que só quis corrigir uma vírgula no enunciado perderia a figura
// sem entender por quê.
//
// Então, na hora de salvar, uma imagem que veio do banco é baixada de volta e
// reenviada para a questão nova. É trabalho extra que ninguém vê, e é o que
// faz "editar" significar editar.
// ---------------------------------------------------------------------------
async function prepararParaEnvio(imagem) {
  if (!imagem) return null;

  // Escolhida agora no aparelho: já está tudo pronto.
  if (imagem.objetoWeb || (imagem.uri && !imagem.caminho)) {
    return {
      uri: imagem.uri,
      mime: imagem.mime || "image/jpeg",
      objetoWeb: imagem.objetoWeb || null,
    };
  }

  // Veio do banco: buscar os bytes de volta.
  const endereco = urlDaImagem(imagem.caminho || imagem.uri);
  if (!endereco) return null;

  const blob = await lerComoBlob(endereco);
  const mime = blob?.type || imagem.mime || "image/jpeg";

  const objetoWeb =
    Platform.OS === "web" && typeof File === "function"
      ? new File([blob], "questao.jpg", { type: mime })
      : null;

  return { uri: endereco, mime, objetoWeb };
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
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [erro, setErro] = useState("");

  const [importando, setImportando] = useState(false);
  const [resumoImport, setResumoImport] = useState("");

  useEffect(() => {
    async function carregarTurmas() {
      try {
        const dados = await listarTurmas();
        setTurmas(dados);
        if (idTurmaInicial) {
          const turmaAtual = dados.find(
            (t) => t.id_turma === Number(idTurmaInicial),
          );
          if (turmaAtual) setTurmaSelecionada(turmaAtual);
        }
      } catch (e) {
        setErro(e.message);
      }
    }
    carregarTurmas();
  }, [idTurmaInicial]);

  // -------------------------------------------------------------------------
  // Editando: traz as questões que já estão no banco para dentro do formulário.
  //
  // Sem isto, a tela abriria com uma questão em branco e o "salvar" apagaria o
  // gabarito inteiro sem a professora perceber.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!emEdicao || !id) return;

    async function carregarQuestoes() {
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

              // O que já está no servidor entra como { caminho }, para a tela
              // saber que não precisa enviar de novo — a menos que troquem.
              const imagem = q.imagem
                ? { caminho: q.imagem, uri: urlDaImagem(q.imagem), mime: "", objetoWeb: null }
                : null;

              if (tipo !== "alternativa") {
                return {
                  ...base,
                  enunciado: q.pergunta || "",
                  peso: String(q.peso ?? 1).replace(".", ","),
                  tipo,
                  imagem,
                  palavrasChave:
                    tipo === "dissertativa" ? q.resposta_correta || "" : "",
                  respostaEsperada:
                    tipo === "calculo" ? q.resposta_correta || "" : "",
                };
              }

              const alternativas = await listarAlternativas(q.id_questao).catch(
                () => [],
              );

              return {
                ...base,
                enunciado: q.pergunta || "",
                peso: String(q.peso ?? 1).replace(".", ","),
                tipo,
                imagem,
                letraCorreta: q.resposta_correta || "",
                alternativas: alternativas.length
                  ? alternativas.map((a) => ({
                      letra: a.letra,
                      texto: a.texto || "",
                    }))
                  : base.alternativas,
              };
            }),
        );

        setQuestoes(convertidas);
      } catch (e) {
        setErro("Não consegui carregar as questões: " + e.message);
      }
    }

    carregarQuestoes();
  }, [emEdicao, id]);

  function atualizarQuestao(idQuestao, campo, valor) {
    setQuestoes((atuais) =>
      atuais.map((q) => (q.id === idQuestao ? { ...q, [campo]: valor } : q)),
    );
  }

  function adicionarQuestao() {
    setQuestoes((atuais) => [...atuais, novaQuestao()]);
  }

  function removerQuestao(id) {
    setQuestoes((atuais) => atuais.filter((q) => q.id !== id));
  }

  // -------------------------------------------------------------------------
  // A imagem só sobe quando a atividade for publicada.
  //
  // Antes disso a questão nem existe no banco, então não há a que anexar. Aqui
  // a tela só guarda o arquivo escolhido e mostra a prévia — o envio acontece
  // dentro do gravarQuestoes, depois de cada questão ganhar o seu id.
  // -------------------------------------------------------------------------
  async function escolherImagem(idQuestao) {
    setErro("");

    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        // 0.7 é o meio-termo: a figura continua legível impressa e o arquivo
        // não estoura o limite de 5 MB do servidor.
        quality: 0.7,
      });

      if (resultado.canceled) return;

      const escolhida = resultado.assets?.[0];
      if (!escolhida?.uri) {
        setErro("Não consegui ler essa imagem. Tente outra.");
        return;
      }

      atualizarQuestao(idQuestao, "imagem", {
        uri: escolhida.uri,
        mime: escolhida.mimeType || "image/jpeg",
        objetoWeb: escolhida.file ?? null,
        caminho: null,
      });
    } catch (e) {
      setErro("Não consegui abrir a galeria: " + (e.message || e));
    }
  }

  function tirarImagem(idQuestao) {
    atualizarQuestao(idQuestao, "imagem", null);
  }

  function atualizarAlternativa(idQuestao, letra, texto) {
    setQuestoes((atuais) =>
      atuais.map((q) =>
        q.id === idQuestao
          ? {
              ...q,
              alternativas: q.alternativas.map((a) =>
                a.letra === letra ? { ...a, texto } : a,
              ),
            }
          : q,
      ),
    );
  }

  function adicionarAlternativa(idQuestao) {
    setQuestoes((atuais) =>
      atuais.map((q) => {
        if (q.id !== idQuestao) return q;
        const proximaLetra = LETRAS[q.alternativas.length];
        if (!proximaLetra) return q;
        return {
          ...q,
          alternativas: [...q.alternativas, { letra: proximaLetra, texto: "" }],
        };
      }),
    );
  }

  function removerAlternativa(idQuestao, letra) {
    setQuestoes((atuais) =>
      atuais.map((q) =>
        q.id === idQuestao
          ? {
              ...q,
              alternativas: q.alternativas.filter((a) => a.letra !== letra),
            }
          : q,
      ),
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
  // -------------------------------------------------------------------------
  // IMPORTAR UMA ATIVIDADE PRONTA
  //
  // O professor manda a prova que já digitou e o servidor devolve as questões
  // separadas. O que chega é só o que foi PERGUNTADO: enunciado, alternativas
  // e tipo. O gabarito nunca vem junto, e isso é proposital — se a IA errasse
  // qual alternativa é a certa, a turma inteira seria corrigida contra uma
  // resposta inventada e ninguém descobriria. Quem define o certo é você.
  // -------------------------------------------------------------------------
  async function importarAtividade() {
    if (importando || salvando) return;

    setErro("");
    setResumoImport("");

    let arquivo;

    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: TIPOS_DA_ATIVIDADE,
        copyToCacheDirectory: true,
      });

      if (resultado.canceled) return;

      const escolhido = resultado.assets?.[0];
      if (!escolhido?.uri) {
        setErro("Não consegui ler esse arquivo. Tente outro.");
        return;
      }

      arquivo = {
        uri: escolhido.uri,
        nome: escolhido.name || "atividade",
        mime: escolhido.mimeType || "application/octet-stream",
        objetoWeb: escolhido.file ?? null,
      };
    } catch (e) {
      setErro("Não consegui abrir o seletor de arquivos: " + (e.message || e));
      return;
    }

    setImportando(true);

    try {
      const lida = await lerAtividadeDeArquivo(arquivo);

      // Título e disciplina só entram se estiverem vazios. Sobrescrever o que
      // o professor digitou seria desfazer trabalho dele sem avisar.
      if (lida.titulo && !titulo.trim()) setTitulo(lida.titulo);
      if (lida.disciplina && !disciplina.trim()) setDisciplina(lida.disciplina);

      const novas = (lida.questoes || []).map((q) => {
        const base = novaQuestao();
        const alternativas =
          q.tipo === "alternativa" && (q.alternativas || []).length >= 2
            ? q.alternativas.map((a) => ({ letra: a.letra, texto: a.texto }))
            : base.alternativas;

        return {
          ...base,
          enunciado: q.enunciado || "",
          tipo: q.tipo || "alternativa",
          peso: String(q.peso ?? 1).replace(".", ","),
          alternativas,
          // letraCorreta, palavrasChave e respostaEsperada ficam como o
          // novaQuestao() deixou: vazios. É você que preenche.
        };
      });

      if (novas.length === 0) {
        setErro("Não achei nenhuma questão nesse arquivo.");
        return;
      }

      setQuestoes((atuais) => {
        const aproveitar = atuais.filter((q) => !questaoEmBranco(q));
        return [...aproveitar, ...novas];
      });

      const quantas = novas.length;
      setResumoImport(
        `${quantas} ${quantas === 1 ? "questão importada" : "questões importadas"} de "${arquivo.nome}". ` +
          `Falta você definir o gabarito ${quantas === 1 ? "dela" : "de cada uma"}.`,
      );
    } catch (e) {
      setErro(e.message);
    } finally {
      setImportando(false);
    }
  }

  // Uma questão sem gabarito não bloqueia a digitação, mas bloqueia o publicar
  // (ver primeiroProblema). O selo no cabeçalho existe para você achar quais
  // são sem descer a tela inteira procurando.
  function faltaGabarito(questao) {
    if (!questao.enunciado.trim()) return false;
    if (questao.tipo === "alternativa") return !questao.letraCorreta;
    if (questao.tipo === "calculo") return !questao.respostaEsperada.trim();
    return contarPalavrasChave(questao.palavrasChave) === 0;
  }

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
      if (comoNumero(q.peso) <= 0)
        return `O peso da questão ${n} precisa ser maior que zero.`;

      if (q.tipo === "alternativa") {
        if (!q.letraCorreta)
          return `Marque a alternativa correta da questão ${n}.`;
        const vazias = q.alternativas.filter((a) => !a.texto.trim());
        if (vazias.length)
          return `Preencha o texto de todas as alternativas da questão ${n}.`;
      }

      if (
        q.tipo === "dissertativa" &&
        contarPalavrasChave(q.palavrasChave) === 0
      ) {
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
        id_atividade,
      );

      const id_questao = criada?.id_questao ?? criada?.id;

      // A imagem vai depois da questão existir, porque é nela que se anexa.
      // Falhar aqui não derruba a atividade: o enunciado, o gabarito e o peso
      // já estão salvos, e perder isso por causa de uma figura seria pior do
      // que a figura faltar. O aviso conta o que aconteceu.
      if (id_questao && questao.imagem) {
        try {
          const arquivo = await prepararParaEnvio(questao.imagem);
          if (arquivo) await enviarImagemDaQuestao(id_questao, arquivo);
        } catch (e) {
          console.warn("[criar-atividade] imagem da questão:", e?.message || e);
          setErro(
            `A questão ${i + 1} foi salva, mas a imagem dela não subiu: ${e.message}`,
          );
        }
      }

      if (questao.tipo !== "alternativa") continue;
      if (!id_questao) continue;

      for (const alternativa of questao.alternativas) {
        await criarAlternativa(
          alternativa.letra,
          alternativa.texto.trim(),
          id_questao,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Exporta a folha em branco para imprimir. Não precisa ter publicado ainda:
  // sai do que está escrito na tela agora.
  //
  // O HTML vem do constants/provaPdf.js. Esta tela tinha uma cópia própria da
  // montagem, e as duas geravam a mesma prova — o que é exatamente o risco que
  // o comentário no topo daquele arquivo descreve: mexer numa e esquecer da
  // outra. Agora é uma só.
  // ---------------------------------------------------------------------------
  async function salvarProvaEmPdf() {
    if (gerandoPdf) return;

    if (!titulo.trim() || questoes.every((q) => !q.enunciado.trim())) {
      setErro(
        "Escreva o título e pelo menos uma questão antes de gerar a prova.",
      );
      return;
    }

    setGerandoPdf(true);
    setErro("");

    try {
      // As imagens entram embutidas no documento. Aqui elas ainda podem ser
      // arquivos do aparelho, e o embutirImagens lê os dois casos.
      const paraProva = await embutirImagens(
        questoes.map((q) => ({
          enunciado: q.enunciado,
          peso: q.peso,
          tipo: q.tipo,
          imagem: q.imagem?.uri || q.imagem?.caminho || "",
          alternativas: q.alternativas,
        })),
      );

      const problema = await imprimirHtml(
        montarHtmlDaProva({
          titulo,
          disciplina,
          turma: turmaSelecionada?.nome || "",
          descricao,
          questoes: paraProva,
        }),
      );

      if (problema) setErro(problema);
    } catch (e) {
      setErro("Não consegui gerar a prova: " + (e.message || e));
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
        await atualizarAtividade(
          id,
          titulo,
          disciplina,
          descricao,
          turmaSelecionada.id_turma,
        );
      } else {
        const criada = await criarAtividade(
          titulo,
          disciplina,
          descricao,
          turmaSelecionada.id_turma,
        );
        id_atividade = criada?.id_atividade ?? criada?.id;

        if (!id_atividade) {
          throw new Error(
            "A atividade foi criada, mas o servidor não devolveu o id — as questões não foram salvas.",
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
            "Crie uma atividade nova ou apague as correções antes.",
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
        <View style={ehDesktop ? styles.miolo : styles.mioloMobile}>
          {ehDesktop ? (
            <View style={styles.cabecalhoDesktopLinha}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.voltarLinha}
              >
                <Ionicons name="arrow-back" size={18} color="#0B1E3D" />
                <Text style={styles.tituloPaginaDesktop}>
                  {emEdicao ? "Editar atividade" : "Criar atividade"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.voltarLinha}
            >
              <Ionicons name="arrow-back" size={18} color="#0B1E3D" />
              <Text style={styles.tituloPagina}>
                {emEdicao ? "Editar atividade" : "Criar atividade"}
              </Text>
            </TouchableOpacity>
          )}

          {erro ? (
            <Text style={{ color: "#EF4444", marginBottom: 12 }}>{erro}</Text>
          ) : null}

          {/* Importar fica no topo porque é o atalho: quem tem a prova pronta
              resolve tudo daqui, e os campos de baixo já chegam preenchidos.
              Só aparece ao criar — editando, isso sobrescreveria o título e a
              disciplina de uma atividade que já existe. */}
          {!emEdicao && (
            <View
              style={[
                styles.cartaoImportar,
                ehDesktop && styles.cartaoImportarDesktop,
              ]}
            >
              <Text style={styles.importarTitulo}>
                Já tem a atividade pronta?
              </Text>
              <Text style={styles.importarTexto}>
                Mande o arquivo e o sistema separa as questões. Você define o
                gabarito aqui.
              </Text>

              <TouchableOpacity
                style={[
                  styles.botaoImportar,
                  (importando || salvando) && styles.botaoImportarDesativado,
                ]}
                activeOpacity={0.85}
                disabled={importando || salvando}
                onPress={importarAtividade}
              >
                {importando ? (
                  <ActivityIndicator size="small" color={COR.marcador} />
                ) : (
                  <Ionicons
                    name="document-attach-outline"
                    size={ehDesktop ? 19 : 17}
                    color={COR.marcador}
                  />
                )}
                <Text style={styles.botaoImportarTexto}>
                  {importando
                    ? "Lendo a atividade..."
                    : "Importar atividade pronta"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.importarDica}>
                PDF, Word (.docx) ou foto. O gabarito você marca aqui — a IA
                não decide qual resposta está certa.
              </Text>
            </View>
          )}

          {resumoImport ? (
            <View style={styles.resumoImport}>
              <Ionicons name="checkmark-circle" size={18} color={COR.ok} />
              <Text style={styles.resumoImportTexto}>{resumoImport}</Text>
            </View>
          ) : null}

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
                  turmaSelecionada
                    ? styles.campoSelectValor
                    : styles.campoSelectPlaceholder
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
                <View style={styles.questaoCabecalhoEsquerda}>
                  <Text style={styles.numeroQuestao}>
                    QUESTÃO {indice + 1}
                  </Text>
                  {faltaGabarito(questao) ? (
                    <View style={styles.selo}>
                      <Text style={styles.seloTexto}>falta o gabarito</Text>
                    </View>
                  ) : null}
                </View>
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

              {/* ------------------------------------------------- imagem */}
              <Text style={styles.rotulo}>
                Imagem <Text style={styles.rotuloApoio}>— opcional</Text>
              </Text>

              {questao.imagem ? (
                <View style={styles.imagemBloco}>
                  <Image
                    source={{ uri: questao.imagem.uri }}
                    style={[
                      styles.imagemPrevia,
                      ehDesktop && styles.imagemPreviaDesktop,
                    ]}
                    resizeMode="contain"
                  />

                  <View style={styles.imagemAcoes}>
                    <TouchableOpacity
                      style={styles.imagemBotao}
                      activeOpacity={0.8}
                      onPress={() => escolherImagem(questao.id)}
                    >
                      <Ionicons
                        name="swap-horizontal"
                        size={15}
                        color={COR.marcador}
                      />
                      <Text style={styles.imagemBotaoTexto}>Trocar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.imagemBotao}
                      activeOpacity={0.8}
                      onPress={() => tirarImagem(questao.id)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={15}
                        color={COR.perigo}
                      />
                      <Text
                        style={[styles.imagemBotaoTexto, { color: COR.perigo }]}
                      >
                        Remover
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imagemVazia}
                  activeOpacity={0.8}
                  onPress={() => escolherImagem(questao.id)}
                >
                  <Ionicons name="image-outline" size={20} color={COR.marcador} />
                  <Text style={styles.imagemVaziaTexto}>Adicionar imagem</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.dica}>
                Para charge, gráfico ou figura do problema. Ela entra na prova
                impressa, logo abaixo do enunciado.
              </Text>

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
                    expressou — mesmo com outras palavras (&quot;H2O&quot; vale
                    por &quot;água&quot;) — e a nota é essa fração do peso.
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

          <View
            style={[
              styles.acoesFinais,
              ehDesktop ? styles.acoesFinaisDesktop : styles.acoesFinaisMobile,
            ]}
          >
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
              style={[
                styles.botaoPublicar,
                ehDesktop && styles.botaoPublicarDesktop,
              ]}
              onPress={publicarAtividade}
              disabled={salvando}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoPublicarTexto} numberOfLines={1}>
                {salvando
                  ? "Salvando..."
                  : emEdicao
                    ? "Salvar alterações"
                    : "Publicar atividade"}
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
  miolo: { width: "92%", maxWidth: 1100 },

  // ESTE era o bug do celular.
  //
  // Aqui estava `null`. Sem largura, e com o pai centralizando os filhos, esta
  // View encolhia até o tamanho do conteúdo — e os cards de dentro, que pedem
  // width: "100%", passavam a medir 100% de uma largura indefinida. O resultado
  // é o que você viu: a tela montada fora de lugar.
  //
  // As outras telas do app já usavam { width: "100%" } aqui. Esta ficou de
  // fora.
  mioloMobile: { width: "100%" },

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
    fontSize: 24,
    fontWeight: "700",
    color: COR.tintaForte,
  },

  // ------------------------------------------------- importar atividade
  cartaoImportar: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 16,
    marginBottom: 14,
  },
  cartaoImportarDesktop: {
    padding: 22,
    marginBottom: 18,
  },
  importarTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 14.5,
    color: COR.marinho,
  },
  importarTexto: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaMedia,
    marginTop: 4,
    lineHeight: 18,
  },
  botaoImportar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: RAIO.controle,
    borderWidth: 1.5,
    // Tracejado de propósito: diz "solte um arquivo aqui" sem precisar de
    // texto explicando, e separa visualmente do botão sólido de publicar.
    borderStyle: "dashed",
    borderColor: COR.marcador,
  },
  botaoImportarDesativado: {
    opacity: 0.5,
  },
  botaoImportarTexto: {
    fontFamily: FONTE.semi,
    fontSize: 13,
    color: COR.marcador,
  },
  importarDica: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaFraca,
    marginTop: 8,
    lineHeight: 16,
  },
  resumoImport: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    width: "100%",
    backgroundColor: COR.emAndamentoFundo,
    borderRadius: RAIO.superficie,
    padding: 12,
    marginBottom: 14,
  },
  resumoImportTexto: {
    flex: 1,
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaForte,
    lineHeight: 18,
  },
  questaoCabecalhoEsquerda: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  selo: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: COR.emAndamentoFundo,
  },
  seloTexto: {
    fontFamily: FONTE.semi,
    fontSize: 10,
    color: COR.marcador,
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

  // -------------------------------------------------------------------------
  // A imagem da questão.
  //
  // O botão vazio é tracejado, como o de adicionar questão: os dois dizem
  // "aqui cabe mais uma coisa, se você quiser". A prévia tem altura fixa para
  // a questão não mudar de tamanho conforme a foto escolhida — uma figura em
  // retrato empurraria o resto da questão para fora da tela.
  // -------------------------------------------------------------------------
  imagemVazia: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: COR.linha,
    borderStyle: "dashed",
    borderRadius: RAIO.controle,
    paddingVertical: 16,
  },
  imagemVaziaTexto: {
    fontFamily: FONTE.semi,
    fontSize: 13,
    fontWeight: "600",
    color: COR.marcador,
  },
  imagemBloco: { gap: 8 },
  imagemPrevia: {
    width: "100%",
    height: 170,
    borderRadius: RAIO.controle,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    backgroundColor: COR.fundo,
  },
  imagemPreviaDesktop: { height: 230 },
  imagemAcoes: { flexDirection: "row", gap: 8 },
  imagemBotao: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COR.linha,
    borderRadius: RAIO.controle,
    paddingVertical: 10,
  },
  imagemBotaoTexto: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "600",
    color: COR.marcador,
  },

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
  alternativaCampo: { flex: 1, minWidth: 0 },
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

  // No celular os dois botões ficam um embaixo do outro.
  //
  // Lado a lado não cabem: "Salvar prova em PDF" não encolhe (é uma View, e
  // View no React Native não encolhe sozinha), então sobrava um pedaço pequeno
  // para o "Publicar atividade", que saía cortado com reticências.
  acoesFinais: { width: "100%", gap: 12 },
  acoesFinaisMobile: { flexDirection: "column" },
  acoesFinaisDesktop: {
    flexDirection: "row",
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
  botaoProvaTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    fontWeight: "700",
    color: COR.marcador,
  },

  botaoPublicar: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
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
  modalTurmaTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0B1E3D",
    marginBottom: 10,
  },
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
  modalTurmaFecharTexto: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#64748B",
  },
});