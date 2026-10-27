import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

    imagem: null,
  };
}

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

async function prepararParaEnvio(imagem) {
  if (!imagem) return null;

  if (imagem.objetoWeb || (imagem.uri && !imagem.caminho)) {
    return {
      uri: imagem.uri,
      mime: imagem.mime || "image/jpeg",
      objetoWeb: imagem.objetoWeb || null,
    };
  }

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

function Alerta({ titulo, texto, acao }) {
  return (
    <View style={styles.alerta}>
      <Ionicons
        name="alert-circle"
        size={18}
        color={COR.perigo}
        style={styles.alertaIcone}
      />
      <View style={styles.alertaTextos}>
        <Text style={styles.alertaTitulo}>{titulo}</Text>
        <Text style={styles.alertaTexto}>{texto}</Text>
        {acao}
      </View>
    </View>
  );
}

export default function CriarAtividade() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();

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
  const [problema, setProblema] = useState(null);

  const rolagem = useRef(null);
  const alturaDasQuestoes = useRef({});

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

  async function escolherImagem(idQuestao) {
    setErro("");

    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  function faltaGabarito(questao) {
    if (!questao.enunciado.trim()) return false;
    if (questao.tipo === "alternativa") return !questao.letraCorreta;
    if (questao.tipo === "calculo") return !questao.respostaEsperada.trim();
    return contarPalavrasChave(questao.palavrasChave) === 0;
  }

  function voltar() {
    if (emEdicao && id) {
      router.replace({ pathname: "/atividade", params: { id } });
      return;
    }
    router.replace("/atividades");
  }

  function gabaritoDaQuestao(questao) {
    if (questao.tipo === "alternativa") return questao.letraCorreta.trim();
    if (questao.tipo === "calculo") return questao.respostaEsperada.trim();
    return questao.palavrasChave.trim();
  }

  function primeiroProblema() {
    const noTopo = (texto) => ({ texto, idQuestao: null, numero: null });

    if (!titulo.trim()) return noTopo("Dê um título para a atividade.");
    if (!disciplina.trim()) return noTopo("Escolha a disciplina.");
    if (!turmaSelecionada) return noTopo("Escolha a turma.");
    if (questoes.length === 0)
      return noTopo("Adicione pelo menos uma questão.");

    for (let i = 0; i < questoes.length; i++) {
      const q = questoes[i];
      const n = i + 1;
      const na = (texto) => ({ texto, idQuestao: q.id, numero: n });

      if (!q.enunciado.trim()) return na("Falta o enunciado.");
      if (comoNumero(q.peso) <= 0)
        return na("O peso precisa ser maior que zero.");

      if (q.tipo === "alternativa") {
        if (!q.letraCorreta) return na("Marque a alternativa correta.");
        const vazias = q.alternativas.filter((a) => !a.texto.trim());
        if (vazias.length)
          return na("Preencha o texto de todas as alternativas.");
      }

      if (
        q.tipo === "dissertativa" &&
        contarPalavrasChave(q.palavrasChave) === 0
      ) {
        return na("Falta escrever as palavras-chave do gabarito.");
      }

      if (q.tipo === "calculo" && !q.respostaEsperada.trim()) {
        return na("Falta o resultado esperado.");
      }
    }

    return null;
  }

  useEffect(() => {
    if (problema) setProblema(primeiroProblema());
  }, [titulo, disciplina, turmaSelecionada, questoes]);

  function irParaQuestao(idQuestao) {
    const y = alturaDasQuestoes.current[idQuestao];
    if (y === undefined || !rolagem.current) return;
    rolagem.current.scrollTo({ y: Math.max(y - 12, 0), animated: true });
  }

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
    const falta = primeiroProblema();
    if (falta) {
      setProblema(falta);
      return;
    }

    setSalvando(true);
    setErro("");
    setProblema(null);

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

      if (/foreign key|constraint|referenc/i.test(texto)) {
        setProblema({
          titulo: "Não dá para trocar as questões",
          texto:
            "Esta atividade já tem folhas corrigidas. Crie uma atividade nova ou apague as correções antes.",
        });
      } else {
        setProblema({
          titulo: "Não consegui salvar",
          texto: texto || "Tente de novo em alguns segundos.",
        });
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={styles.tela}>
      <ScrollView
        ref={rolagem}
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
                onPress={voltar}
                style={styles.voltarLinha}
              >
                <Ionicons name="arrow-back" size={18} color="#0F172A" />
                <Text style={styles.tituloPaginaDesktop}>
                  {emEdicao ? "Editar atividade" : "Criar atividade"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={voltar}
              style={styles.voltarLinha}
            >
              <Ionicons name="arrow-back" size={18} color="#0F172A" />
              <Text style={styles.tituloPagina}>
                {emEdicao ? "Editar atividade" : "Criar atividade"}
              </Text>
            </TouchableOpacity>
          )}

          {erro ? <Alerta titulo="Não deu certo" texto={erro} /> : null}

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
                    size={ehDesktop ? 18 : 16}
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
              name="information-circle-outline"
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
              onLayout={(e) => {
                alturaDasQuestoes.current[questao.id] = e.nativeEvent.layout.y;
              }}
              style={[
                styles.secaoCard,
                ehDesktop && styles.secaoCardDesktop,
                problema?.idQuestao === questao.id && styles.secaoCardComFalta,
              ]}
            >
              <View style={styles.questaoCabecalho}>
                <View style={styles.questaoCabecalhoEsquerda}>
                  <Text style={styles.numeroQuestao}>
                    QUESTÃO {indice + 1}
                  </Text>
                  {problema?.idQuestao === questao.id ? (
                    <View style={[styles.selo, styles.seloFalta]}>
                      <Text style={[styles.seloTexto, styles.seloFaltaTexto]}>
                        {problema.texto.replace(/\.$/, "").toLowerCase()}
                      </Text>
                    </View>
                  ) : faltaGabarito(questao) ? (
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
                  <Ionicons name="image-outline" size={18} color={COR.marcador} />
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
                        >
                          {correta && <View style={styles.radioInner} />}
                        </TouchableOpacity>
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
                              size={16}
                              color={COR.tintaFraca}
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

          {problema ? (
            <Alerta
              titulo={problema.titulo || "Falta preencher"}
              texto={
                problema.numero
                  ? `Questão ${problema.numero}: ${problema.texto.toLowerCase()}`
                  : problema.texto
              }
              acao={
                problema.idQuestao ? (
                  <TouchableOpacity
                    onPress={() => irParaQuestao(problema.idQuestao)}
                    activeOpacity={0.7}
                    hitSlop={6}
                    style={styles.alertaAcao}
                  >
                    <Text style={styles.alertaAcaoTexto}>
                      Ver questão {problema.numero}
                    </Text>
                    <Ionicons
                      name="arrow-up"
                      size={13}
                      color={COR.perigo}
                    />
                  </TouchableOpacity>
                ) : null
              }
            />
          ) : null}

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
  tela: { flex: 1, backgroundColor: "#F8FAFC" },

  conteudo: { flex: 1 },
  conteudoInterno: { padding: 16, paddingBottom: 60, alignItems: "center" },
  conteudoInternoDesktop: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 60,
  },
  miolo: { width: "100%", maxWidth: 860 },
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
    gap: 8,
    marginBottom: 20,
  },
  tituloPagina: {
    fontFamily: FONTE.bold,
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  tituloPaginaDesktop: {
    fontFamily: FONTE.bold,
    fontSize: 22,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.4,
  },

  cartaoImportar: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cartaoImportarDesktop: {
    padding: 20,
    marginBottom: 20,
  },
  importarTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  importarTexto: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
    lineHeight: 18,
  },
  botaoImportar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RAIO.controle,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#2563EB",
    backgroundColor: "#F8FAFC",
  },
  botaoImportarDesativado: {
    opacity: 0.5,
  },
  botaoImportarTexto: {
    fontFamily: FONTE.semi,
    fontSize: 13,
    fontWeight: "500",
    color: "#2563EB",
  },
  importarDica: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: "#94A3B8",
    marginTop: 8,
    lineHeight: 16,
  },
  resumoImport: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    width: "100%",
    backgroundColor: "#EFF6FF",
    borderRadius: RAIO.controle,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  resumoImportTexto: {
    flex: 1,
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: "#1E40AF",
    lineHeight: 18,
  },
  questaoCabecalhoEsquerda: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  selo: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RAIO.etiqueta,
    backgroundColor: "#EFF6FF",
  },
  seloTexto: {
    fontFamily: FONTE.semi,
    fontSize: 11,
    fontWeight: "500",
    color: "#2563EB",
  },

  secaoCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  secaoCardDesktop: { padding: 22, marginBottom: 20 },
  secaoCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  secaoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.2,
  },

  questaoCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  numeroQuestao: {
    fontFamily: FONTE.bold,
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    letterSpacing: 0.5,
  },

  rotulo: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "500",
    color: "#334155",
    marginTop: 14,
    marginBottom: 6,
  },
  rotuloApoio: {
    fontFamily: FONTE.regular,
    fontWeight: "400",
    color: "#94A3B8",
  },
  obrigatorio: { color: "#DC2626" },

  alerta: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 3,
    borderLeftColor: "#DC2626",
    borderRadius: RAIO.controle,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  alertaIcone: { marginTop: 1 },
  alertaTextos: { flex: 1, gap: 2 },
  alertaTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    fontWeight: "600",
    color: "#991B1B",
  },
  alertaTexto: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: "#7F1D1D",
    lineHeight: 17,
  },
  alertaAcao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  alertaAcaoTexto: {
    fontFamily: FONTE.semi,
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },

  secaoCardComFalta: { borderColor: "#FCA5A5" },
  seloFalta: { backgroundColor: "#FEF2F2" },
  seloFaltaTexto: { color: "#DC2626" },

  campoTexto: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: RAIO.controle,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: FONTE.regular,
    fontSize: 13.5,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  campoTextoArea: { minHeight: 80, textAlignVertical: "top", lineHeight: 19 },
  campoPeso: { width: 100 },

  campoSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: RAIO.controle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  campoSelectPlaceholder: { fontSize: 13.5, color: "#94A3B8" },
  campoSelectValor: { fontSize: 13.5, color: "#0F172A", fontWeight: "500" },

  imagemVazia: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: RAIO.controle,
    paddingVertical: 14,
    backgroundColor: "#F8FAFC",
  },
  imagemVaziaTexto: {
    fontFamily: FONTE.semi,
    fontSize: 13,
    fontWeight: "500",
    color: "#2563EB",
  },
  imagemBloco: { gap: 8 },
  imagemPrevia: {
    width: "100%",
    height: 180,
    borderRadius: RAIO.controle,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  imagemPreviaDesktop: { height: 220 },
  imagemAcoes: { flexDirection: "row", gap: 8 },
  imagemBotao: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: RAIO.controle,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  imagemBotaoTexto: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "500",
    color: "#2563EB",
  },

  avisoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: RAIO.controle,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 18,
  },
  avisoTextos: { flex: 1 },
  avisoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 12.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  avisoDescricao: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },

  tiposGrade: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tipoPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RAIO.etiqueta,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  tipoPillAtivo: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  tipoPillTexto: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "500",
    color: "#475569",
  },
  tipoPillTextoAtivo: { color: "#FFFFFF" },

  alternativaLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioAtivo: { borderColor: "#16A34A" },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
  },
  alternativaLetra: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    width: 18,
    flexShrink: 0,
  },
  alternativaCampo: { flex: 1, minWidth: 0 },
  linkPequeno: {
    fontFamily: FONTE.semi,
    fontSize: 12,
    fontWeight: "500",
    color: "#2563EB",
    marginTop: 4,
  },

  dica: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 6,
    lineHeight: 16,
  },
  dicaForte: {
    fontFamily: FONTE.semi,
    fontSize: 11.5,
    fontWeight: "600",
    color: "#334155",
    marginTop: 4,
  },

  botaoAdicionarQuestao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: RAIO.controle,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  botaoAdicionarQuestaoTexto: {
    color: "#2563EB",
    fontFamily: FONTE.bold,
    fontSize: 13,
    fontWeight: "600",
  },

  acoesFinais: { width: "100%", gap: 10 },
  acoesFinaisMobile: { flexDirection: "column" },
  acoesFinaisDesktop: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 20,
  },
  botaoProva: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: RAIO.controle,
    paddingVertical: 11,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  botaoProvaDesktop: { paddingHorizontal: 18 },
  botaoProvaTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },

  botaoPublicar: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: RAIO.controle,
    backgroundColor: "#0F172A",
  },
  botaoPublicarDesktop: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    paddingHorizontal: 28,
  },
  botaoPublicarTexto: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },

  modalTurmaFundo: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalTurmaCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: RAIO.superficie,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalTurmaTitulo: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 10,
  },
  modalTurmaItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTurmaItemTexto: { fontSize: 13.5, fontWeight: "500", color: "#0F172A" },
  modalTurmaItemEscola: { fontSize: 11.5, color: "#94A3B8", marginTop: 2 },
  modalTurmaFechar: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 8,
  },
  modalTurmaFecharTexto: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
});