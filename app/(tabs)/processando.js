import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { createElement, useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE } from "../../components/estilo";
import {
  confirmarCorrecao,
  criarAluno,
  enviarCorrecao,
} from "../../constants/api";
import {
  limparArquivo,
  pegarArquivo,
} from "../../constants/arquivoSelecionado";

const ETAPAS = [
  "Lendo o documento...",
  "Identificando o aluno...",
  "Comparando com o gabarito...",
  "Calculando a nota...",
];

function formatarNota(valor) {
  return Number(valor ?? 0)
    .toFixed(1)
    .replace(".", ",");
}

function chamada(numero) {
  return String(numero ?? "–").padStart(2, "0");
}

export default function Processando() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();
  const params = useLocalSearchParams();

  const id_atividade = params.id_atividade;
  const id_turma = Number(params.id_turma || 0);
  const atividadeTitulo = params.atividadeTitulo || "Atividade";
  const atividadeTurma = params.atividadeTurma || "";

  const [arquivo, setArquivo] = useState(() => pegarArquivo());
  const [nomeManual, setNomeManual] = useState("");
  const ehPdf = arquivo?.tipo === "pdf";

  const [enderecoWeb, setEnderecoWeb] = useState("");

  useFocusEffect(
    useCallback(() => {
      setArquivo(pegarArquivo());
    }, []),
  );

  useEffect(() => {
    if (Platform.OS !== "web" || !arquivo?.objetoWeb) return;
    const endereco = URL.createObjectURL(arquivo.objetoWeb);
    setEnderecoWeb(endereco);
    return () => URL.revokeObjectURL(endereco);
  }, [arquivo]);

  const enderecoPreview = enderecoWeb || arquivo?.uri || "";

  // preview -> processando -> confirmarAluno -> resultado
  //                        \-> erro
  const [etapa, setEtapa] = useState("preview");
  const [progresso, setProgresso] = useState(0);
  const [leitura, setLeitura] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const intervaloRef = useRef(null);

  useEffect(() => {
    if (!leitura || !leitura.nome_aluno) return;
    setNomeManual((atual) => (atual ? atual : leitura.nome_aluno));
  }, [leitura]);

  const indiceEtapa = Math.min(
    ETAPAS.length - 1,
    Math.floor((progresso / 100) * ETAPAS.length),
  );

  // -------------------------------------------------------------------------
  // 1º tempo: a IA lê a folha e o servidor calcula as notas. Nada é gravado
  // ainda — a resposta traz o resultado e um palpite de quem é o aluno.
  // -------------------------------------------------------------------------
  async function corrigir() {
    setEtapa("processando");
    setProgresso(0);
    setErro("");

    try {
      const resposta = await enviarCorrecao({ arquivo, id_atividade });
      setLeitura(resposta);
      setProgresso(100);
      setEtapa("confirmarAluno");
    } catch (e) {
      setErro(e.message || "Não consegui falar com o servidor.");
      setEtapa("erro");
    }
  }

  // -------------------------------------------------------------------------
  // 2º tempo: o professor disse de quem é. Só agora a nota entra no boletim.
  // -------------------------------------------------------------------------
  async function confirmar(id_aluno) {
    if (salvando) return;
    setSalvando(true);
    setErro("");

    try {
      const resposta = await confirmarCorrecao({
        id_leitura: leitura.id_leitura,
        id_aluno,
      });
      setResultado(resposta);
      setEtapa("resultado");
      limparArquivo();
    } catch (e) {
      setErro(e.message || "Não consegui salvar a correção.");
      setEtapa("erro");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarAlunoNovo() {
    const nome = nomeManual.trim();
    if (!nome || !id_turma || salvando) return;

    setSalvando(true);
    setErro("");

    try {
      const turma = leitura?.alunos_da_turma || [];
      const proximoNumero =
        turma.reduce(
          (maior, aluno) => Math.max(maior, Number(aluno.numero_chamada ?? 0)),
          0,
        ) + 1;

      const alunoCriado = await criarAluno(
        nome,
        `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        proximoNumero,
        id_turma,
      );

      const resposta = await confirmarCorrecao({
        id_leitura: leitura.id_leitura,
        id_aluno: alunoCriado.id_aluno,
      });

      setResultado(resposta);
      setEtapa("resultado");
      limparArquivo();
    } catch (e) {
      setErro(e.message || "Não consegui salvar o novo aluno.");
      setEtapa("erro");
    } finally {
      setSalvando(false);
    }
  }

  // A barra sobe até 90% e espera ali. O resto só acontece quando a resposta
  // chega — uma barra que completa antes da resposta seria mentira.
  useEffect(() => {
    if (etapa !== "processando") return;

    intervaloRef.current = setInterval(() => {
      setProgresso((atual) => (atual >= 90 ? 90 : atual + 3));
    }, 220);

    return () => clearInterval(intervaloRef.current);
  }, [etapa]);

  function preview() {
    if (!arquivo) {
      return (
        <View style={styles.previewCaixa}>
          <Ionicons
            name="alert-circle-outline"
            size={40}
            color={COR.avisoTexto}
          />
          <Text style={styles.previewCaixaTexto}>Nenhum arquivo recebido</Text>
          <Text style={styles.previewCaixaDica}>
            Se você recarregou a página, escolha a folha de novo no Scanner.
          </Text>
        </View>
      );
    }

    if (!ehPdf) {
      return (
        <Image
          source={{ uri: enderecoPreview }}
          style={styles.previewFoto}
          resizeMode="contain"
        />
      );
    }

    if (Platform.OS === "web" && enderecoPreview) {
      return createElement("iframe", {
        src: enderecoPreview,
        title: arquivo.nome,
        style: {
          width: "100%",
          height: 360,
          border: `1px solid ${COR.linha}`,
          borderRadius: 12,
          backgroundColor: COR.branco,
          marginBottom: 18,
        },
      });
    }

    return (
      <View style={styles.previewPdf}>
        <View style={styles.pdfIconeCirculo}>
          <Ionicons name="document-text-outline" size={28} color={COR.perigo} />
        </View>
        <Text style={styles.pdfNome} numberOfLines={2}>
          {arquivo.nome}
        </Text>
        <Text style={styles.pdfEtiqueta}>PDF pronto para envio</Text>
      </View>
    );
  }

  function telaProcessando() {
    return (
      <View
        style={[styles.cardCentral, ehDesktop && styles.cardCentralDesktop]}
      >
        <View style={styles.spinnerCirculo}>
          <Ionicons name="sparkles" size={30} color={COR.marcador} />
        </View>

        <Text style={styles.tituloCard}>Analisando atividade com IA</Text>
        <Text style={styles.subtituloCard}>{ETAPAS[indiceEtapa]}</Text>

        <View style={styles.barraFundo}>
          <View style={[styles.barraPreenchida, { width: `${progresso}%` }]} />
        </View>
        <Text style={styles.progressoTexto}>
          Pode levar alguns segundos. Não feche esta tela.
        </Text>
      </View>
    );
  }

  function telaErro() {
    return (
      <View
        style={[styles.cardCentral, ehDesktop && styles.cardCentralDesktop]}
      >
        <View style={styles.erroCirculo}>
          <Ionicons name="close-circle-outline" size={30} color={COR.perigo} />
        </View>
        <Text style={styles.tituloCard}>Não deu para corrigir</Text>
        <Text style={styles.erroTexto}>{erro}</Text>

        <View style={styles.botoesLinha}>
          <TouchableOpacity
            style={styles.botaoSecundario}
            activeOpacity={0.85}
            onPress={() => setEtapa("preview")}
          >
            <Ionicons name="arrow-back" size={17} color={COR.marcador} />
            <Text style={styles.botaoSecundarioTexto}>Voltar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botaoPrimario}
            activeOpacity={0.85}
            onPress={corrigir}
          >
            <Ionicons name="refresh" size={17} color={COR.branco} />
            <Text style={styles.botaoPrimarioTexto}>Tentar de novo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // A confirmação do aluno aparece SEMPRE, mesmo quando a IA reconheceu o nome.
  // A diferença é que, reconhecendo, o aluno já vem sugerido em cima e basta
  // confirmar. Nada entra no boletim sem o professor dizer de quem é.
  // ---------------------------------------------------------------------------
  function telaConfirmarAluno() {
    const sugestao = leitura?.sugestao;
    const turma = leitura?.alunos_da_turma || [];
    const outros = sugestao
      ? turma.filter((a) => a.id_aluno !== sugestao.id_aluno)
      : turma;
    const nomePadrao = (leitura?.nome_aluno || "").trim();

    return (
      <View
        style={[styles.cardCentral, ehDesktop && styles.cardCentralDesktop]}
      >
        <View style={styles.notaPreviaCaixa}>
          <Text style={styles.notaPreviaValor}>
            {formatarNota(leitura?.nota_total)}
          </Text>
          <Text style={styles.notaPreviaDe}>
            de {formatarNota(leitura?.peso_total)}
          </Text>
        </View>

        <Text style={styles.tituloCard}>De quem é esta folha?</Text>

        {leitura?.modo === "demo" && (
          <Text style={styles.selo}>modo demonstração — sem IA</Text>
        )}

        {sugestao ? (
          <>
            <Text style={styles.subtituloCard}>
              Na folha está escrito “{leitura?.nome_aluno}”.
            </Text>

            <TouchableOpacity
              style={[styles.cardSugestao, salvando && styles.botaoDesativado]}
              activeOpacity={0.85}
              disabled={salvando}
              onPress={() => confirmar(sugestao.id_aluno)}
            >
              <View style={styles.sugestaoCirculo}>
                <Ionicons name="person" size={18} color={COR.ok} />
              </View>
              <View style={styles.sugestaoTextos}>
                <Text style={styles.sugestaoEtiqueta}>parece ser esta</Text>
                <Text style={styles.sugestaoNome} numberOfLines={1}>
                  {sugestao.nome}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={COR.ok} />
            </TouchableOpacity>

            <Text style={styles.separadorTexto}>ou escolha outro aluno</Text>
          </>
        ) : (
          <Text style={styles.subtituloCard}>
            {nomePadrao
              ? `Não achei “${nomePadrao}” entre os alunos desta turma.`
              : "Não consegui ler o nome do aluno na folha."}
          </Text>
        )}

        <View style={styles.novoAlunoBox}>
          <Text style={styles.novoAlunoTitulo}>
            {sugestao ? "Editar nome do aluno" : "Aluno novo ou nome diferente"}
          </Text>
          <TextInput
            value={nomeManual}
            onChangeText={setNomeManual}
            placeholder="Digite o nome da aluna"
            placeholderTextColor={COR.tintaFraca}
            style={styles.novoAlunoInput}
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[
              styles.botaoNovoAluno,
              (!nomeManual.trim() || salvando || !id_turma) &&
                styles.botaoDesativado,
            ]}
            activeOpacity={0.85}
            disabled={!nomeManual.trim() || salvando || !id_turma}
            onPress={confirmarAlunoNovo}
          >
            <Text style={styles.botaoNovoAlunoTexto}>Salvar e confirmar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listaAlunos}>
          {outros.map((aluno) => (
            <TouchableOpacity
              key={aluno.id_aluno}
              style={styles.linhaAluno}
              activeOpacity={0.7}
              disabled={salvando}
              onPress={() => confirmar(aluno.id_aluno)}
            >
              <Text style={styles.chamadaAluno}>
                {chamada(aluno.numero_chamada)}
              </Text>
              <Text style={styles.nomeAluno} numberOfLines={1}>
                {aluno.nome}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COR.chevron} />
            </TouchableOpacity>
          ))}

          {turma.length === 0 && (
            <Text style={styles.subtituloCard}>
              Esta turma ainda não tem alunos cadastrados.
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.botaoSecundarioLargo}
          activeOpacity={0.85}
          disabled={salvando}
          onPress={() => {
            limparArquivo();
            setEtapa("preview");
          }}
        >
          <Text style={styles.botaoSecundarioTexto}>
            {salvando ? "Salvando..." : "Cancelar"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function telaResultado() {
    const revisar = resultado.questoes_para_revisar || 0;

    return (
      <View
        style={[styles.cardCentral, ehDesktop && styles.cardCentralDesktop]}
      >
        <View style={styles.okCirculo}>
          <Ionicons name="checkmark" size={30} color={COR.ok} />
        </View>

        <Text style={styles.alunoCorrigido}>
          {resultado.aluno?.nome || "Aluno"}
        </Text>
        <Text style={styles.atividadeTurma}>{atividadeTitulo}</Text>

        <View style={styles.notaCaixa}>
          <Text style={styles.notaGrande}>
            {formatarNota(resultado.nota_total)}
          </Text>
          <Text style={styles.notaDe}>
            de {formatarNota(resultado.peso_total)}
          </Text>
        </View>

        {resultado.modo === "demo" && (
          <Text style={styles.selo}>modo demonstração — sem IA</Text>
        )}

        <View style={styles.listaQuestoes}>
          {(resultado.questoes || []).map((q) => (
            <View key={q.numero} style={styles.linhaQuestao}>
              <Text style={styles.numeroQuestao}>{q.numero}</Text>
              <View style={styles.miolaQuestao}>
                <Text style={styles.detalheQuestao} numberOfLines={2}>
                  {q.detalhe}
                </Text>
                {!!q.precisa_revisao && (
                  <Text style={styles.avisoQuestao}>conferir</Text>
                )}
              </View>
              <Text style={styles.notaQuestao}>
                {formatarNota(q.nota)}/{formatarNota(q.peso)}
              </Text>
            </View>
          ))}
        </View>

        {revisar > 0 && (
          <Text style={styles.rodapeRevisar}>
            {revisar === 1
              ? "1 questão merece uma conferida sua."
              : `${revisar} questões merecem uma conferida sua.`}
          </Text>
        )}

        <View style={styles.botoesLinha}>
          <TouchableOpacity
            style={styles.botaoSecundario}
            activeOpacity={0.85}
            onPress={() => router.replace("/scanner")}
          >
            <Ionicons name="scan-outline" size={17} color={COR.marcador} />
            <Text style={styles.botaoSecundarioTexto}>Outra folha</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botaoPrimario}
            activeOpacity={0.85}
            onPress={() =>
              router.replace({
                pathname: "/revisar",
                params: { id_correcao: resultado.id_correcao },
              })
            }
          >
            <Text style={styles.botaoPrimarioTexto}>Revisar</Text>
            <Ionicons name="arrow-forward" size={17} color={COR.branco} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function telaPreview() {
    return (
      <View
        style={[styles.cardCentral, ehDesktop && styles.cardCentralDesktop]}
      >
        {preview()}

        <Text style={styles.atividadeTitulo}>{atividadeTitulo}</Text>
        {!!atividadeTurma && (
          <Text style={styles.atividadeTurma}>{atividadeTurma}</Text>
        )}
        {!!arquivo && ehPdf && (
          <Text style={styles.arquivoNomeLinha} numberOfLines={1}>
            {arquivo.nome}
          </Text>
        )}

        <Text style={styles.previewDica}>
          {ehPdf
            ? "Confira se é o arquivo certo antes de mandar pra correção."
            : "Dá pra ler o nome do aluno e todas as respostas? Se ficou torto ou escuro, mande de novo."}
        </Text>

        <View style={styles.botoesLinha}>
          <TouchableOpacity
            style={styles.botaoSecundario}
            activeOpacity={0.85}
            onPress={() => {
              limparArquivo();
              router.back();
            }}
          >
            <Ionicons
              name={ehPdf ? "refresh-outline" : "camera-reverse-outline"}
              size={17}
              color={COR.marcador}
            />
            <Text style={styles.botaoSecundarioTexto}>
              {ehPdf ? "Escolher outro" : "Enviar outra"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botaoPrimario, !arquivo && styles.botaoDesativado]}
            activeOpacity={0.85}
            disabled={!arquivo}
            onPress={corrigir}
          >
            <Text style={styles.botaoPrimarioTexto}>Confirmar e corrigir</Text>
            <Ionicons name="arrow-forward" size={17} color={COR.branco} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function conteudo() {
    if (etapa === "processando") return telaProcessando();
    if (etapa === "erro") return telaErro();
    if (etapa === "confirmarAluno" && leitura) return telaConfirmarAluno();
    if (etapa === "resultado" && resultado) return telaResultado();
    return telaPreview();
  }

  return (
    <View style={styles.tela}>
      {!ehDesktop && <CabecalhoMobile />}

      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[
          styles.conteudoInterno,
          ehDesktop && styles.conteudoInternoDesktop,
        ]}
      >
        <View style={ehDesktop ? styles.miolo : { width: "100%" }}>
          {ehDesktop && (
            <View style={styles.cabecalhoDesktopLinha}>
              <View style={styles.voltarLinha}>
                <Ionicons
                  name="scan-outline"
                  size={18}
                  color={COR.tintaForte}
                />
                <Text style={styles.tituloPaginaDesktop}>Enviar correção</Text>
              </View>
            </View>
          )}

          {conteudo()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: COR.fundo },

  conteudo: { flex: 1 },
  conteudoInterno: {
    padding: 20,
    paddingBottom: 60,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  conteudoInternoDesktop: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 32,
  },
  miolo: { width: "92%", maxWidth: 560, alignSelf: "center" },

  cabecalhoDesktopLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    minHeight: 56,
    marginBottom: 22,
  },
  voltarLinha: { flexDirection: "row", alignItems: "center", gap: 10 },
  tituloPaginaDesktop: {
    fontFamily: FONTE.bold,
    fontSize: 20,
    color: COR.tintaForte,
  },

  cardCentral: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 24,
    alignItems: "center",
  },
  cardCentralDesktop: { padding: 40, borderRadius: 22 },

  previewCaixa: {
    width: "100%",
    aspectRatio: 4 / 3,
    maxHeight: 220,
    backgroundColor: COR.emAndamentoFundo,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COR.linha,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 24,
    marginBottom: 18,
  },
  previewCaixaTexto: {
    fontFamily: FONTE.semi,
    fontSize: 13,
    color: COR.avisoTexto,
  },
  previewCaixaDica: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaMedia,
    textAlign: "center",
    lineHeight: 16,
  },
  previewFoto: {
    width: "100%",
    height: 300,
    borderRadius: 14,
    backgroundColor: COR.linhaSuave,
    marginBottom: 18,
  },

  previewPdf: {
    width: "100%",
    backgroundColor: COR.perigoFundo,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COR.linha,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: "center",
    gap: 6,
    marginBottom: 18,
  },
  pdfIconeCirculo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COR.branco,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  pdfNome: {
    fontFamily: FONTE.semi,
    fontSize: 13,
    color: COR.tintaForte,
    textAlign: "center",
  },
  pdfEtiqueta: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
  },

  atividadeTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 16,
    color: COR.tintaForte,
    textAlign: "center",
  },
  atividadeTurma: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaFraca,
    marginTop: 3,
    textAlign: "center",
  },
  arquivoNomeLinha: {
    fontFamily: FONTE.media,
    fontSize: 11,
    color: COR.marcador,
    marginTop: 6,
    maxWidth: "100%",
  },
  previewDica: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaMedia,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 20,
    lineHeight: 17,
  },

  botoesLinha: { flexDirection: "row", gap: 10, width: "100%" },
  botaoSecundario: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: COR.marcador,
    borderRadius: 12,
    paddingVertical: 13,
  },
  botaoSecundarioLargo: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COR.marcador,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 16,
  },
  botaoSecundarioTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.marcador,
  },
  botaoPrimario: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COR.marinho,
    borderRadius: 12,
    paddingVertical: 13,
  },
  botaoPrimarioTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.branco,
  },
  botaoDesativado: { opacity: 0.45 },

  spinnerCirculo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COR.emAndamentoFundo,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  okCirculo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COR.okFundo,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  erroCirculo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COR.perigoFundo,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  tituloCard: {
    fontFamily: FONTE.bold,
    fontSize: 16,
    color: COR.tintaForte,
    textAlign: "center",
  },
  subtituloCard: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaMedia,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 17,
  },

  barraFundo: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: COR.linhaSuave,
    overflow: "hidden",
    marginTop: 16,
  },
  barraPreenchida: {
    height: "100%",
    backgroundColor: COR.marcador,
    borderRadius: 4,
  },
  progressoTexto: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
    marginTop: 10,
    textAlign: "center",
  },

  erroTexto: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaMedia,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 22,
    lineHeight: 17,
  },

  notaPreviaCaixa: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    marginBottom: 12,
  },
  notaPreviaValor: { fontFamily: FONTE.bold, fontSize: 30, color: COR.marinho },
  notaPreviaDe: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaFraca,
  },

  cardSugestao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COR.ok,
    backgroundColor: COR.okFundo,
  },
  sugestaoCirculo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COR.branco,
    alignItems: "center",
    justifyContent: "center",
  },
  sugestaoTextos: { flex: 1, gap: 1 },
  sugestaoEtiqueta: { fontFamily: FONTE.semi, fontSize: 10, color: COR.ok },
  sugestaoNome: { fontFamily: FONTE.bold, fontSize: 14, color: COR.tintaForte },

  separadorTexto: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
    marginTop: 18,
  },

  novoAlunoBox: {
    width: "100%",
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COR.linha,
    backgroundColor: COR.branco,
    gap: 10,
  },
  novoAlunoTitulo: {
    fontFamily: FONTE.semi,
    fontSize: 12,
    color: COR.tintaForte,
  },
  novoAlunoInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: COR.linha,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaForte,
    backgroundColor: COR.fundo,
  },
  botaoNovoAluno: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: COR.marinho,
  },
  botaoNovoAlunoTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.branco,
  },
  listaAlunos: {
    width: "100%",
    marginTop: 10,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    borderRadius: 12,
    overflow: "hidden",
  },
  linhaAluno: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COR.linhaSuave,
  },
  chamadaAluno: {
    fontFamily: FONTE.semi,
    fontSize: 12,
    color: COR.tintaFraca,
    minWidth: 20,
  },
  nomeAluno: {
    flex: 1,
    fontFamily: FONTE.media,
    fontSize: 13,
    color: COR.tintaForte,
  },

  alunoCorrigido: {
    fontFamily: FONTE.bold,
    fontSize: 17,
    color: COR.tintaForte,
    textAlign: "center",
  },
  notaCaixa: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 14,
  },
  notaGrande: { fontFamily: FONTE.bold, fontSize: 38, color: COR.marinho },
  notaDe: { fontFamily: FONTE.regular, fontSize: 13, color: COR.tintaFraca },
  selo: {
    fontFamily: FONTE.semi,
    fontSize: 10,
    color: COR.avisoTexto,
    backgroundColor: COR.avisoFundo,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 10,
  },

  listaQuestoes: {
    width: "100%",
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: COR.linhaSuave,
  },
  linhaQuestao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COR.linhaSuave,
  },
  numeroQuestao: {
    fontFamily: FONTE.bold,
    fontSize: 12,
    color: COR.tintaFraca,
    minWidth: 16,
  },
  miolaQuestao: { flex: 1, gap: 2 },
  detalheQuestao: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaMedia,
    lineHeight: 16,
  },
  avisoQuestao: { fontFamily: FONTE.semi, fontSize: 10, color: COR.avisoTexto },
  notaQuestao: { fontFamily: FONTE.bold, fontSize: 13, color: COR.tintaForte },

  rodapeRevisar: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.avisoTexto,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 18,
  },
});
