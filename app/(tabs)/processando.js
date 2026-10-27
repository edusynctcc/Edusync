import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { createElement, useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
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
import { COR, FONTE, RAIO } from "../../components/estilo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ENDPOINTS,
  confirmarCorrecao,
  criarAluno,
} from "../../constants/api";
import {
  limparArquivo,
  pegarArquivo,
} from "../../constants/arquivoSelecionado";

function lerComoBlob(uri) {
  return new Promise((resolve, reject) => {
    const requisicao = new XMLHttpRequest();
    requisicao.onload = () => resolve(requisicao.response);
    requisicao.onerror = () =>
      reject(new Error("Não consegui ler a foto do celular."));
    requisicao.ontimeout = () =>
      reject(new Error("A leitura da foto demorou demais."));
    requisicao.timeout = 15000;
    requisicao.responseType = "blob";
    requisicao.open("GET", uri, true);
    requisicao.send(null);
  });
}

function embrulhar(blob, nome, mime) {
  try {
    if (blob && mime && typeof File === "function") {
      const arquivoReal = new File([blob], nome, { type: mime });
      if (arquivoReal && (!blob.size || arquivoReal.size === blob.size)) {
        return arquivoReal;
      }
    }
  } catch (e) {
    console.warn("[EduSync] File não serviu:", e?.message || e);
  }
  return comTipo(blob, mime);
}

function comTipo(blob, mime) {
  try {
    if (!blob || !mime) return blob;
    if (blob.type === mime) return blob;

    const novo = new Blob([blob], { type: mime });
    if (!novo || (blob.size && novo.size !== blob.size)) return blob;
    return novo;
  } catch (e) {
    console.warn(
      "[EduSync] não consegui reetiquetar o arquivo:",
      e?.message || e,
    );
    return blob;
  }
}

function comTempoLimite(promessa, ms, oQueEra) {

  const tempo = Number.isFinite(ms) && ms > 0 ? ms : 90000;

  let relogio = null;
  const estouro = new Promise((_, reject) => {
    relogio = setTimeout(
      () =>
        reject(new Error(`${oQueEra} passou de ${Math.round(tempo / 1000)}s`)),
      tempo,
    );
  });
  return Promise.race([promessa, estouro]).finally(() => clearTimeout(relogio));
}

async function enviarFolha({ paginas, id_atividade }) {
  const token = await AsyncStorage.getItem("token");

  function dadosDaPagina(pagina, indice) {
    const mime = pagina?.mime || "image/jpeg";
    const extensao =
      mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
    return { mime, nome: `folha-${indice + 1}.${extensao}` };
  }

  async function despachar(partes, limite = 90000, pacote = null) {
    const formulario = new FormData();

    for (const parte of partes) {
      formulario.append("imagem", parte);
    }
    formulario.append("id_atividade", String(id_atividade));

    const controlador =
      typeof AbortController === "function" ? new AbortController() : null;

    const envio = fetch(ENDPOINTS.correcoes, {
      method: "POST",
      headers: pacote
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": pacote.contentType,
          }
        : { Authorization: `Bearer ${token}` },
      body: pacote ? pacote.corpo : formulario,
      signal: controlador ? controlador.signal : undefined,
    });

    const resposta = await comTempoLimite(envio, limite, "o envio").catch(
      (e) => {
        if (controlador) controlador.abort();
        throw e;
      },
    );

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      const falha = new Error(
        dados.erro || "Não consegui enviar a folha para correção.",
      );
      falha.respondido = true;
      throw falha;
    }

    return dados;
  }

  if (!paginas || paginas.length === 0) {
    throw new Error("O arquivo se perdeu. Escolha a folha de novo no Scanner.");
  }

  if (Platform.OS === "web") {
    const faltando = paginas.findIndex((p) => !p?.objetoWeb);
    if (faltando >= 0) {
      throw new Error(
        paginas.length === 1
          ? "O arquivo se perdeu. Escolha a folha de novo no Scanner."
          : `A página ${faltando + 1} se perdeu. Adicione ela de novo.`,
      );
    }
    return await despachar(
      paginas.map((p) => p.objetoWeb),
      90000,
    );
  }

  const semUri = paginas.findIndex((p) => !p?.uri);
  if (semUri >= 0) {
    throw new Error(
      paginas.length === 1
        ? "O arquivo se perdeu. Escolha a folha de novo no Scanner."
        : `A página ${semUri + 1} se perdeu. Adicione ela de novo.`,
    );
  }

  function pacoteMultipart(itens) {
    const fronteira = `----EduSync${Date.now().toString(36)}`;

    const pedacos = [];

    for (const item of itens) {
      pedacos.push(
        `--${fronteira}\r\n` +
          `Content-Disposition: form-data; name="imagem"; filename="${item.nome}"\r\n` +
          `Content-Type: ${item.tipo}\r\n\r\n`,
      );
      pedacos.push(item.blob);

      pedacos.push("\r\n");
    }

    pedacos.push(
      `--${fronteira}\r\n` +
        `Content-Disposition: form-data; name="id_atividade"\r\n\r\n` +
        `${id_atividade}\r\n` +
        `--${fronteira}--\r\n`,
    );

    const corpo = new Blob(pedacos, {
      type: `multipart/form-data; boundary=${fronteira}`,
    });

    return {
      size: corpo.size,
      name: itens[0]?.nome,
      type: itens[0]?.tipo,
      __pacote: {
        corpo,
        contentType: `multipart/form-data; boundary=${fronteira}`,
      },
    };
  }

  const porPagina = Math.max(1, paginas.length);

  const tentativas = [
    {
      apelido: "uri",
      limite: 25000 * porPagina,
      montar: async () =>
        paginas.map((pagina, i) => {
          const { mime, nome } = dadosDaPagina(pagina, i);
          return { uri: pagina.uri, name: nome, type: mime };
        }),
    },
    {
      apelido: "blob-xhr",
      limite: 60000 * porPagina,
      montar: async () =>
        Promise.all(
          paginas.map(async (pagina, i) => {
            const { mime, nome } = dadosDaPagina(pagina, i);
            return embrulhar(await lerComoBlob(pagina.uri), nome, mime);
          }),
        ),
    },
    {
      apelido: "multipart-manual",
      limite: 90000,
      montar: async () => [
        pacoteMultipart(
          await Promise.all(
            paginas.map(async (pagina, i) => {
              const { mime, nome } = dadosDaPagina(pagina, i);
              return { blob: await lerComoBlob(pagina.uri), nome, tipo: mime };
            }),
          ),
        ),
      ],
    },
    {
      apelido: "blob-fetch",
      limite: 90000,
      montar: async () =>
        Promise.all(
          paginas.map(async (pagina, i) => {
            const { mime, nome } = dadosDaPagina(pagina, i);
            return embrulhar(await (await fetch(pagina.uri)).blob(), nome, mime);
          }),
        ),
    },
  ];

  let ultimaFalha = null;

  for (const tentativa of tentativas) {
    try {
      const partes = await tentativa.montar();

      for (let i = 0; i < partes.length; i++) {
        const parte = partes[i];
        if (parte && !parte.__pacote && parte.size === 0) {
          throw new Error(
            partes.length === 1
              ? "o arquivo veio com 0 byte"
              : `a página ${i + 1} veio com 0 byte`,
          );
        }
      }

      const soma = partes.reduce((total, p) => total + (p?.size || 0), 0);
      const tamanho = soma ? `${Math.round(soma / 1024)} KB` : "?";
      const classe = partes[0]?.constructor?.name || typeof partes[0];
      console.log(
        `[EduSync] tentando "${tentativa.apelido}" — ${partes.length} ` +
          `${partes.length === 1 ? "parte" : "partes"}, ${classe}, ${tamanho} no total, ` +
          `limite ${tentativa.limite / 1000}s`,
      );

      const dados = await despachar(
        partes,
        tentativa.limite,
        partes[0]?.__pacote || null,
      );
      console.log(`[EduSync] envio ok pelo jeito "${tentativa.apelido}"`);
      return dados;
    } catch (e) {
      if (e?.respondido) throw e;
      ultimaFalha = e;
      console.warn(
        `[EduSync] envio falhou pelo jeito "${tentativa.apelido}":`,
        e?.message || e,
      );
    }
  }

  const falha = new Error(
    paginas.length === 1
      ? "Não consegui enviar essa foto. Tente pela galeria ou mande o PDF."
      : "Não consegui enviar essas páginas. Tente pela galeria ou mande um PDF com a folha inteira.",
  );
  falha.causa = ultimaFalha?.message;
  throw falha;
}

const ETAPAS = [
  "Lendo o que está escrito na folha",
  "Procurando o nome do aluno",
  "Comparando com o gabarito",
  "Calculando a nota",
];

function formatarNota(valor) {
  return Number(valor ?? 0)
    .toFixed(1)
    .replace(".", ",");
}

function chamada(numero) {
  return String(numero ?? "–").padStart(2, "0");
}

const ERRO_GENERICO =
  "Tente de novo. Se continuar, escolha a folha pela galeria ou mande o PDF.";

const ERROS_TECNICOS = [
  {
    marca: /FormData|FormDataPart|multipart/i,
    texto:
      "Não consegui montar o envio dessa foto. Tente pela galeria ou mande o PDF.",
  },
  {
    marca: /Network request failed|Failed to fetch|ERR_NETWORK|ECONNREFUSED/i,
    texto: "Não consegui falar com o servidor. Confira a internet e tente de novo.",
  },
  { marca: /timeout|timed out|ETIMEDOUT/i, texto: "O servidor demorou demais. Tente de novo." },
  { marca: /JSON|Unexpected token|SyntaxError/i, texto: "O servidor respondeu uma coisa que eu não entendi." },
];

const PALAVRAS_NOSSAS =
  /\b(n[a\u00e3]o|folha|aluno|atividade|professor|servidor|arquivo|nota|turma|imagem|foto|gabarito|quest[a\u00e3]o|senha|email)\b/i;

function humanizar(bruto) {
  const texto = String(bruto || "").trim();
  if (!texto) return ERRO_GENERICO;

  for (const item of ERROS_TECNICOS) {
    if (item.marca.test(texto)) return item.texto;
  }

  const temAcento = /[\u00C0-\u00FF]/.test(texto);
  if (temAcento || PALAVRAS_NOSSAS.test(texto)) return texto;

  return ERRO_GENERICO;
}

function matriculaProvisoria() {
  const tempo = Date.now().toString(36);
  const sorteio = Math.random().toString(36).slice(2, 8).padEnd(6, "0");
  return `M${tempo}${sorteio}`.slice(0, 20);
}

function mesmoNome(a, b) {
  const limpar = (texto) =>
    String(texto ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const limpo = limpar(a);
  return !!limpo && limpo === limpar(b);
}

export default function Processando() {
  const { width, height: alturaJanela } = useWindowDimensions();
  const ehDesktop = width >= 900;

  const alturaDoCentro = Math.max(320, alturaJanela - 224);
  const router = useRouter();
  const params = useLocalSearchParams();

  const id_atividade = params.id_atividade;
  const id_turma = Number(params.id_turma || 0);
  const atividadeTitulo = params.atividadeTitulo || "Atividade";
  const atividadeTurma = params.atividadeTurma || "";

  const [paginas, setPaginas] = useState(() => {
    const primeira = pegarArquivo();
    return primeira ? [primeira] : [];
  });
  const arquivo = paginas[0] ?? null;

  const [nomeManual, setNomeManual] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const ehPdf = arquivo?.tipo === "pdf";

  const origem = String(params.origem || "imagem");

  const MAX_PAGINAS = 6;
  const podeAdicionar = !ehPdf && paginas.length > 0 && paginas.length < MAX_PAGINAS;

  const [enderecoWeb, setEnderecoWeb] = useState("");

  const folhaNaTela = useRef(arquivo);

  useEffect(() => {
    if (Platform.OS !== "web" || !arquivo?.objetoWeb) return;
    const endereco = URL.createObjectURL(arquivo.objetoWeb);
    setEnderecoWeb(endereco);
    return () => URL.revokeObjectURL(endereco);
  }, [arquivo]);

  const enderecoPreview = enderecoWeb || arquivo?.uri || "";

  const [etapa, setEtapa] = useState("preview");
  const [progresso, setProgresso] = useState(0);
  const [leitura, setLeitura] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const intervaloRef = useRef(null);

  const pulso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (etapa !== "processando") return;

    const laco = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, {
          toValue: 1,
          duration: 900,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulso, {
          toValue: 0,
          duration: 900,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );

    laco.start();
    return () => laco.stop();
  }, [etapa, pulso]);

  const escalaDaLogo = pulso.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.07],
  });

  const recomecarSeFolhaNova = useCallback(() => {
    const nova = pegarArquivo();
    if (!nova || nova === folhaNaTela.current) return;

    console.log(
      `[processando] folha nova: "${nova.nome}" ` +
        `(na tela estava: "${folhaNaTela.current?.nome ?? "nenhuma"}"). Recomeçando.`,
    );

    folhaNaTela.current = nova;

    setPaginas([nova]);
    setEtapa("preview");
    setLeitura(null);
    setResultado(null);
    setErro("");
    setProgresso(0);
    setNomeManual("");
  }, []);

  useFocusEffect(recomecarSeFolhaNova);
  useEffect(recomecarSeFolhaNova);

  useEffect(() => {
    if (!leitura || !leitura.nome_aluno) return;
    setNomeManual((atual) => (atual ? atual : leitura.nome_aluno));
  }, [leitura]);

  const indiceEtapa = Math.min(
    ETAPAS.length - 1,
    Math.floor((progresso / 100) * ETAPAS.length),
  );

  async function adicionarPagina() {
    if (adicionando || !podeAdicionar) return;

    setAdicionando(true);
    setErro("");

    try {

      const usarCamera = origem === "foto" && Platform.OS !== "web";

      if (usarCamera) {
        const permissao = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissao.granted) {
          setErro("Preciso da permissão da câmera para fotografar a folha.");
          return;
        }
      }

      const resultado = usarCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
            allowsMultipleSelection: true,
            selectionLimit: MAX_PAGINAS - paginas.length,
          });

      if (resultado.canceled) return;

      const novas = (resultado.assets || [])
        .filter((a) => a?.uri)
        .map((a) => ({
          uri: a.uri,
          tipo: "imagem",
          nome: a.fileName || "folha.jpg",
          mime: a.mimeType || "image/jpeg",
          objetoWeb: a.file ?? null,
        }));

      if (novas.length === 0) {
        setErro("Não consegui ler essa imagem. Tente outra.");
        return;
      }

      setPaginas((antes) => [...antes, ...novas].slice(0, MAX_PAGINAS));
    } catch (e) {
      setErro(e?.message || "Não consegui abrir o seletor de arquivos.");
    } finally {
      setAdicionando(false);
    }
  }

  function removerPagina(indice) {
    if (indice === 0) return;
    setPaginas((antes) => antes.filter((_, i) => i !== indice));
  }

  async function corrigir() {
    console.log(
      `[processando] enviando ${paginas.length} ` +
        `${paginas.length === 1 ? "página" : "páginas"} para a atividade ${id_atividade}`,
    );
    setEtapa("processando");
    setProgresso(0);
    setErro("");

    try {
      const resposta = await enviarFolha({ paginas, id_atividade });
      setLeitura(resposta);
      setProgresso(100);
      setEtapa("confirmarAluno");
    } catch (e) {
      console.warn("[EduSync] corrigir:", e?.message || e);
      setErro(e?.message || "Não consegui falar com o servidor.");
      setEtapa("erro");
    }
  }

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
      console.warn("[EduSync] confirmarCorrecao:", e?.message || e);
      setErro(e?.message || "Não consegui salvar a correção.");
      setEtapa("erro");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarAlunoNovo() {
    const nome = nomeManual.trim();
    if (!nome || !id_turma || salvando) return;

    const turma = leitura?.alunos_da_turma || [];

    const existente = turma.find((aluno) => mesmoNome(aluno.nome, nome));
    if (existente) {
      confirmar(existente.id_aluno);
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      const proximoNumero =
        turma.reduce(
          (maior, aluno) => Math.max(maior, Number(aluno.numero_chamada ?? 0)),
          0,
        ) + 1;

      const alunoCriado = await criarAluno(
        nome,
        matriculaProvisoria(),
        proximoNumero,
        id_turma,
      );

      const id_aluno = alunoCriado?.id_aluno ?? alunoCriado?.id;

      if (!id_aluno) {
        throw new Error(
          "O aluno foi criado mas o servidor não devolveu o código dele. A nota não foi gravada — escolha o aluno na lista.",
        );
      }

      const resposta = await confirmarCorrecao({
        id_leitura: leitura.id_leitura,
        id_aluno,
      });

      setResultado(resposta);
      setEtapa("resultado");
      limparArquivo();
    } catch (e) {
      console.warn("[EduSync] novoAluno:", e?.message || e);
      setErro(e?.message || "Não consegui salvar o novo aluno.");
      setEtapa("erro");
    } finally {
      setSalvando(false);
    }
  }

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
    const contexto = [atividadeTitulo, atividadeTurma]
      .filter(Boolean)
      .join("  \u00b7  ");

    return (
      <View
        style={[
          styles.cardCentral,
          styles.cardTrabalho,
          ehDesktop && styles.cardCentralDesktop,
        ]}
      >
        <View style={styles.trabalhoMiolo}>
          <View style={styles.trabalhoTopo}>
            <Animated.View
              style={[
                styles.logoCirculo,
                ehDesktop && styles.logoCirculoDesktop,
                { transform: [{ scale: escalaDaLogo }] },
              ]}
            >
              <Image
                source={require("../../assets/images/logoImg.png")}
                style={[
                  styles.logoProcessando,
                  ehDesktop && styles.logoProcessandoDesktop,
                ]}
                resizeMode="contain"
              />
            </Animated.View>

            <View style={styles.trabalhoTexto}>
              <Text
                style={[
                  styles.tituloTrabalho,
                  ehDesktop && styles.tituloTrabalhoDesktop,
                ]}
              >
                Corrigindo a folha
              </Text>
              {!!contexto && (
                <Text
                  style={[
                    styles.contextoTrabalho,
                    ehDesktop && styles.contextoTrabalhoDesktop,
                  ]}
                  numberOfLines={2}
                >
                  {contexto}
                </Text>
              )}
            </View>
          </View>

          <View
            style={[styles.barraFundo, ehDesktop && styles.barraFundoDesktop]}
          >
            <View
              style={[styles.barraPreenchida, { width: `${progresso}%` }]}
            />
          </View>

          <View style={styles.listaEtapas}>
            {ETAPAS.map((texto, posicao) => {
              const jaPassou = posicao < indiceEtapa;
              const acontecendo = posicao === indiceEtapa;

              return (
                <View key={texto} style={styles.linhaEtapa}>
                  <View
                    style={[
                      styles.marcaEtapa,
                      jaPassou && styles.marcaEtapaFeita,
                      acontecendo && styles.marcaEtapaAgora,
                    ]}
                  >
                    {jaPassou && (
                      <Ionicons name="checkmark" size={12} color={COR.branco} />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.textoEtapa,
                      (jaPassou || acontecendo) && styles.textoEtapaViva,
                    ]}
                    numberOfLines={1}
                  >
                    {texto}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.rodapeTrabalho}>
            <Text style={styles.rodapeArquivo} numberOfLines={1}>
              {arquivo?.nome || "folha enviada"}
            </Text>
            <Text style={styles.rodapeTempo}>uns 10 segundos</Text>
          </View>
        </View>
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
        <Text
          style={[styles.tituloCard, ehDesktop && styles.tituloCardDesktop]}
        >
          Não deu para corrigir
        </Text>
        <Text style={styles.erroTexto}>{humanizar(erro)}</Text>

        <View style={styles.botoesLinha}>
          <TouchableOpacity
            style={styles.botaoSecundario}
            activeOpacity={0.85}
            onPress={() => setEtapa("preview")}
          >
            <Ionicons name="arrow-back" size={17} color={COR.marcador} />
            <Text
              style={[
                styles.botaoSecundarioTexto,
                ehDesktop && styles.botaoSecundarioTextoDesktop,
              ]}
            >
              Voltar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botaoPrimario,
              ehDesktop && styles.botaoPrimarioDesktop,
            ]}
            activeOpacity={0.85}
            onPress={corrigir}
          >
            <Ionicons name="refresh" size={17} color={COR.branco} />
            <Text
              style={[
                styles.botaoPrimarioTexto,
                ehDesktop && styles.botaoPrimarioTextoDesktop,
              ]}
            >
              Tentar de novo
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function telaConfirmarAluno() {
    const sugestao = leitura?.sugestao;
    const turma = leitura?.alunos_da_turma || [];
    const outros = sugestao
      ? turma.filter((a) => a.id_aluno !== sugestao.id_aluno)
      : turma;
    const nomePadrao = (leitura?.nome_aluno || "").trim();

    const nomeDigitado = nomeManual.trim();
    const vaiConfirmarExistente = turma.some((aluno) =>
      mesmoNome(aluno.nome, nomeDigitado),
    );

    return (
      <View
        style={[styles.cardCentral, ehDesktop && styles.cardCentralDesktop]}
      >
        <View style={styles.notaPreviaCaixa}>
          <Text
            style={[
              styles.notaPreviaValor,
              ehDesktop && styles.notaPreviaValorDesktop,
            ]}
          >
            {formatarNota(leitura?.nota_total)}
          </Text>
          <Text
            style={[
              styles.notaPreviaDe,
              ehDesktop && styles.notaPreviaDeDesktop,
            ]}
          >
            de {formatarNota(leitura?.peso_total)}
          </Text>
        </View>

        <Text
          style={[styles.tituloCard, ehDesktop && styles.tituloCardDesktop]}
        >
          De quem é esta folha?
        </Text>

        {leitura?.modo === "demo" && (
          <Text style={styles.selo}>modo demonstração — sem IA</Text>
        )}

        {sugestao ? (
          <>
            <Text
              style={[
                styles.subtituloCard,
                ehDesktop && styles.subtituloCardDesktop,
              ]}
            >
              Na folha está escrito “{leitura?.nome_aluno}”.
            </Text>

            <TouchableOpacity
              style={[styles.cardSugestao, salvando && styles.botaoDesativado]}
              activeOpacity={0.85}
              disabled={salvando}
              onPress={() => confirmar(sugestao.id_aluno)}
            >
              <View
                style={[
                  styles.sugestaoCirculo,
                  ehDesktop && styles.sugestaoCirculoDesktop,
                ]}
              >
                <Ionicons name="person" size={18} color={COR.ok} />
              </View>
              <View style={styles.sugestaoTextos}>
                <Text
                  style={[
                    styles.sugestaoEtiqueta,
                    ehDesktop && styles.sugestaoEtiquetaDesktop,
                  ]}
                >
                  parece ser esta
                </Text>
                <Text
                  style={[
                    styles.sugestaoNome,
                    ehDesktop && styles.sugestaoNomeDesktop,
                  ]}
                  numberOfLines={1}
                >
                  {sugestao.nome}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={COR.ok} />
            </TouchableOpacity>

            <Text
              style={[
                styles.separadorTexto,
                ehDesktop && styles.separadorTextoDesktop,
              ]}
            >
              ou escolha outro aluno
            </Text>
          </>
        ) : (
          <Text
            style={[
              styles.subtituloCard,
              ehDesktop && styles.subtituloCardDesktop,
            ]}
          >
            {nomePadrao
              ? `Não achei “${nomePadrao}” entre os alunos desta turma.`
              : "Não consegui ler o nome do aluno na folha."}
          </Text>
        )}

        <View style={styles.novoAlunoBox}>
          <Text
            style={[
              styles.novoAlunoTitulo,
              ehDesktop && styles.novoAlunoTituloDesktop,
            ]}
          >
            {sugestao ? "Corrigir o nome lido" : "Aluno novo ou nome diferente"}
          </Text>
          <TextInput
            value={nomeManual}
            onChangeText={setNomeManual}
            placeholder="Digite o nome do aluno"
            placeholderTextColor={COR.tintaFraca}
            style={[
              styles.novoAlunoInput,
              ehDesktop && styles.novoAlunoInputDesktop,
            ]}
            autoCapitalize="words"
          />

          <Text
            style={[
              styles.novoAlunoDica,
              ehDesktop && styles.novoAlunoDicaDesktop,
            ]}
          >
            {vaiConfirmarExistente
              ? "Este nome já é de um aluno da turma — a nota vai para ele."
              : "Este nome não está na turma. Ele será cadastrado agora."}
          </Text>

          <TouchableOpacity
            style={[
              styles.botaoNovoAluno,
              (!nomeDigitado || salvando || !id_turma) &&
                styles.botaoDesativado,
            ]}
            activeOpacity={0.85}
            disabled={!nomeDigitado || salvando || !id_turma}
            onPress={confirmarAlunoNovo}
          >
            <Text
              style={[
                styles.botaoNovoAlunoTexto,
                ehDesktop && styles.botaoNovoAlunoTextoDesktop,
              ]}
            >
              {vaiConfirmarExistente
                ? "Confirmar"
                : "Cadastrar na turma e confirmar"}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[styles.listaAlunos, ehDesktop && styles.listaAlunosDesktop]}
        >
          {outros.map((aluno) => (
            <TouchableOpacity
              key={aluno.id_aluno}
              style={[styles.linhaAluno, ehDesktop && styles.linhaAlunoDesktop]}
              activeOpacity={0.7}
              disabled={salvando}
              onPress={() => confirmar(aluno.id_aluno)}
            >
              <Text
                style={[
                  styles.chamadaAluno,
                  ehDesktop && styles.chamadaAlunoDesktop,
                ]}
              >
                {chamada(aluno.numero_chamada)}
              </Text>
              <Text
                style={[styles.nomeAluno, ehDesktop && styles.nomeAlunoDesktop]}
                numberOfLines={1}
              >
                {aluno.nome}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COR.chevron} />
            </TouchableOpacity>
          ))}

          {turma.length === 0 && (
            <Text
              style={[
                styles.subtituloCard,
                ehDesktop && styles.subtituloCardDesktop,
              ]}
            >
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
          <Text
            style={[
              styles.botaoSecundarioTexto,
              ehDesktop && styles.botaoSecundarioTextoDesktop,
            ]}
          >
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

        <Text
          style={[
            styles.alunoCorrigido,
            ehDesktop && styles.alunoCorrigidoDesktop,
          ]}
        >
          {resultado.aluno?.nome || "Aluno"}
        </Text>
        <Text
          style={[
            styles.atividadeTurma,
            ehDesktop && styles.atividadeTurmaDesktop,
          ]}
        >
          {atividadeTitulo}
        </Text>

        <View style={styles.notaCaixa}>
          <Text
            style={[styles.notaGrande, ehDesktop && styles.notaGrandeDesktop]}
          >
            {formatarNota(resultado.nota_total)}
          </Text>
          <Text style={[styles.notaDe, ehDesktop && styles.notaDeDesktop]}>
            de {formatarNota(resultado.peso_total)}
          </Text>
        </View>

        {resultado.modo === "demo" && (
          <Text style={styles.selo}>modo demonstração — sem IA</Text>
        )}

        <View style={styles.listaQuestoes}>
          {(resultado.questoes || []).map((q) => (
            <View
              key={q.numero}
              style={[
                styles.linhaQuestao,
                ehDesktop && styles.linhaQuestaoDesktop,
              ]}
            >
              <Text
                style={[
                  styles.numeroQuestao,
                  ehDesktop && styles.numeroQuestaoDesktop,
                ]}
              >
                {q.numero}
              </Text>
              <View style={styles.miolaQuestao}>
                <Text
                  style={[
                    styles.detalheQuestao,
                    ehDesktop && styles.detalheQuestaoDesktop,
                  ]}
                  numberOfLines={2}
                >
                  {q.detalhe}
                </Text>
                {!!q.precisa_revisao && (
                  <Text style={styles.avisoQuestao}>conferir</Text>
                )}
              </View>
              <Text
                style={[
                  styles.notaQuestao,
                  ehDesktop && styles.notaQuestaoDesktop,
                ]}
              >
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
            <Text
              style={[
                styles.botaoSecundarioTexto,
                ehDesktop && styles.botaoSecundarioTextoDesktop,
              ]}
            >
              Outra folha
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botaoPrimario,
              ehDesktop && styles.botaoPrimarioDesktop,
            ]}
            activeOpacity={0.85}
            onPress={() =>
              router.replace({
                pathname: "/revisar",
                params: { id_correcao: resultado.id_correcao },
              })
            }
          >
            <Text
              style={[
                styles.botaoPrimarioTexto,
                ehDesktop && styles.botaoPrimarioTextoDesktop,
              ]}
            >
              Revisar
            </Text>
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

        <Text
          style={[
            styles.atividadeTitulo,
            ehDesktop && styles.atividadeTituloDesktop,
          ]}
        >
          {atividadeTitulo}
        </Text>
        {!!atividadeTurma && (
          <Text
            style={[
              styles.atividadeTurma,
              ehDesktop && styles.atividadeTurmaDesktop,
            ]}
          >
            {atividadeTurma}
          </Text>
        )}
        {!!arquivo && ehPdf && (
          <Text style={styles.arquivoNomeLinha} numberOfLines={1}>
            {arquivo.nome}
          </Text>
        )}

        <Text style={styles.previewDica}>
          {ehPdf
            ? "Confira se é o arquivo certo antes de mandar pra correção."
            : paginas.length > 1
              ? "Confira se todas as páginas da folha estão aqui, na ordem certa."
              : "Dá pra ler o nome do aluno e todas as respostas? Se ficou torto ou escuro, mande de novo."}
        </Text>

        {

                                                                          }
        {!ehPdf && paginas.length > 0 && (
          <View style={styles.paginasBloco}>
            <View style={styles.paginasCabecalho}>
              <Text style={styles.paginasTitulo}>
                {paginas.length === 1
                  ? "1 página"
                  : `${paginas.length} páginas`}
              </Text>
              {paginas.length === 1 && (
                <Text style={styles.paginasDica}>
                  A prova tem mais de uma folha? Adicione as outras.
                </Text>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.paginasFaixa}
            >
              {paginas.map((pagina, indice) => (
                <View key={`${pagina.uri}-${indice}`} style={styles.paginaItem}>
                  <Image
                    source={{ uri: pagina.uri }}
                    style={styles.paginaMiniatura}
                    resizeMode="cover"
                  />
                  <Text style={styles.paginaNumero}>{indice + 1}</Text>

                  {

                                                              }
                  {indice > 0 && (
                    <TouchableOpacity
                      style={styles.paginaRemover}
                      hitSlop={8}
                      activeOpacity={0.7}
                      onPress={() => removerPagina(indice)}
                    >
                      <Ionicons name="close" size={12} color={COR.branco} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {podeAdicionar && (
                <TouchableOpacity
                  style={styles.paginaAdicionar}
                  activeOpacity={0.7}
                  disabled={adicionando}
                  onPress={adicionarPagina}
                >
                  <Ionicons
                    name={origem === "foto" ? "camera-outline" : "add"}
                    size={20}
                    color={COR.marcador}
                  />
                  <Text style={styles.paginaAdicionarTexto}>
                    {adicionando ? "Abrindo..." : "Adicionar"}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {paginas.length >= MAX_PAGINAS && (
              <Text style={styles.paginasDica}>
                Chegou ao limite de {MAX_PAGINAS} páginas por folha.
              </Text>
            )}
          </View>
        )}

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
            <Text
              style={[
                styles.botaoSecundarioTexto,
                ehDesktop && styles.botaoSecundarioTextoDesktop,
              ]}
            >
              {ehPdf ? "Escolher outro" : "Enviar outra"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botaoPrimario, !arquivo && styles.botaoDesativado]}
            activeOpacity={0.85}
            disabled={!arquivo}
            onPress={corrigir}
          >
            <Text
              style={[
                styles.botaoPrimarioTexto,
                ehDesktop && styles.botaoPrimarioTextoDesktop,
              ]}
            >
              Confirmar e corrigir
            </Text>
            <Ionicons name="arrow-forward" size={17} color={COR.branco} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const cardSozinho = etapa === "processando" || etapa === "erro";
  const centralizaNaVertical = ehDesktop && cardSozinho;

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
        <View style={ehDesktop ? styles.miolo : styles.mioloMobile}>
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

          <View
            style={[
              centralizaNaVertical && styles.centroVertical,
              centralizaNaVertical && { minHeight: alturaDoCentro },
            ]}
          >
            {conteudo()}
          </View>
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
    padding: 34,

    paddingBottom: 40,
  },

  miolo: { width: "100%", maxWidth: 940, alignSelf: "center" },

  mioloMobile: { width: "100%", maxWidth: 520, alignSelf: "center" },

  centroVertical: { justifyContent: "center" },

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
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 24,
    alignItems: "center",
  },
  cardCentralDesktop: { padding: 48, borderRadius: RAIO.superficie },

  tituloCardDesktop: { fontSize: 20 },
  subtituloCardDesktop: { fontSize: 14, lineHeight: 20, marginTop: 8 },

  notaGrandeDesktop: { fontSize: 46 },
  notaDeDesktop: { fontSize: 15 },
  notaPreviaValorDesktop: { fontSize: 30 },
  notaPreviaDeDesktop: { fontSize: 14 },

  sugestaoCirculoDesktop: { width: 46, height: 46, borderRadius: 23 },
  sugestaoEtiquetaDesktop: { fontSize: 12 },
  sugestaoNomeDesktop: { fontSize: 16 },
  separadorTextoDesktop: { fontSize: 13 },

  listaAlunosDesktop: { marginTop: 4 },
  linhaAlunoDesktop: { paddingVertical: 15 },
  chamadaAlunoDesktop: { fontSize: 13.5 },
  nomeAlunoDesktop: { fontSize: 15.5 },

  novoAlunoTituloDesktop: { fontSize: 14.5 },
  novoAlunoInputDesktop: { fontSize: 15, paddingVertical: 13 },
  novoAlunoDicaDesktop: { fontSize: 12.5, lineHeight: 18 },
  botaoNovoAlunoTextoDesktop: { fontSize: 14.5 },

  botaoPrimarioDesktop: { paddingVertical: 16 },
  botaoPrimarioTextoDesktop: { fontSize: 15 },
  botaoSecundarioTextoDesktop: { fontSize: 15 },

  alunoCorrigidoDesktop: { fontSize: 19 },
  atividadeTituloDesktop: { fontSize: 15 },
  atividadeTurmaDesktop: { fontSize: 13.5 },

  linhaQuestaoDesktop: { paddingVertical: 15 },
  numeroQuestaoDesktop: { fontSize: 13.5 },
  notaQuestaoDesktop: { fontSize: 15 },
  detalheQuestaoDesktop: { fontSize: 13, lineHeight: 19 },

  previewCaixa: {
    width: "100%",
    aspectRatio: 4 / 3,
    maxHeight: 220,
    backgroundColor: COR.emAndamentoFundo,
    borderRadius: RAIO.superficie,
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
    borderRadius: RAIO.superficie,
    backgroundColor: COR.linhaSuave,
    marginBottom: 18,
  },

  previewPdf: {
    width: "100%",
    backgroundColor: COR.perigoFundo,
    borderRadius: RAIO.superficie,
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

  paginasBloco: { width: "100%", marginBottom: 18 },
  paginasCabecalho: { marginBottom: 8 },
  paginasTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 12.5,
    fontWeight: "700",
    color: COR.tintaForte,
  },
  paginasDica: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaFraca,
    marginTop: 2,
  },

  paginasFaixa: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  paginaItem: { width: 58, height: 76, position: "relative" },
  paginaMiniatura: {
    width: 58,
    height: 76,
    borderRadius: RAIO.controle,
    backgroundColor: COR.linhaSuave,
    borderWidth: 1,
    borderColor: COR.linha,
  },

  paginaNumero: {
    position: "absolute",
    left: 4,
    bottom: 4,
    minWidth: 16,
    textAlign: "center",
    fontFamily: FONTE.bold,
    fontSize: 10,
    fontWeight: "700",
    color: COR.branco,
    backgroundColor: "rgba(11,30,61,0.75)",
    borderRadius: RAIO.controle,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: "hidden",
  },
  paginaRemover: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COR.perigo,
    alignItems: "center",
    justifyContent: "center",
  },
  paginaAdicionar: {
    width: 58,
    height: 76,
    borderRadius: RAIO.controle,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COR.marcador,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  paginaAdicionarTexto: {
    fontFamily: FONTE.semi,
    fontSize: 9.5,
    fontWeight: "600",
    color: COR.marcador,
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
    borderRadius: RAIO.controle,
    paddingVertical: 13,
  },
  botaoSecundarioLargo: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COR.marcador,
    borderRadius: RAIO.controle,
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
    borderRadius: RAIO.controle,
    paddingVertical: 13,
  },
  botaoPrimarioTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.branco,
  },
  botaoDesativado: { opacity: 0.45 },

  logoCirculo: {
    width: 74,
    height: 74,
    borderRadius: 37,

    backgroundColor: COR.marinho,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logoProcessando: { width: 48, height: 48 },

  logoCirculoDesktop: { width: 104, height: 104, borderRadius: 52 },
  logoProcessandoDesktop: { width: 68, height: 68 },
  barraFundoDesktop: { height: 10, borderRadius: 5, marginTop: 26 },

  cardTrabalho: { alignItems: "stretch" },

  trabalhoMiolo: { width: "100%", maxWidth: 560, alignSelf: "center" },

  trabalhoTopo: { flexDirection: "row", alignItems: "center", gap: 18 },
  trabalhoTexto: { flex: 1, minWidth: 0 },

  tituloTrabalho: {
    fontFamily: FONTE.bold,
    fontSize: 18,
    color: COR.tintaForte,
  },
  tituloTrabalhoDesktop: { fontSize: 23 },

  contextoTrabalho: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaMedia,
    marginTop: 5,
    lineHeight: 19,
  },
  contextoTrabalhoDesktop: { fontSize: 15, lineHeight: 22, marginTop: 6 },

  listaEtapas: { marginTop: 22, gap: 12 },
  linhaEtapa: { flexDirection: "row", alignItems: "center", gap: 12 },

  marcaEtapa: {
    width: 20,
    height: 20,
    borderRadius: RAIO.controle,
    borderWidth: 1.5,
    borderColor: COR.linha,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  marcaEtapaFeita: { backgroundColor: COR.ok, borderColor: COR.ok },

  marcaEtapaAgora: { borderWidth: 6, borderColor: COR.marcador },

  textoEtapa: {
    fontFamily: FONTE.regular,
    fontSize: 13.5,
    color: COR.tintaFraca,
    flex: 1,
  },
  textoEtapaViva: { fontFamily: FONTE.media, color: COR.tintaForte },

  rodapeTrabalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COR.linhaSuave,
  },
  rodapeArquivo: {
    fontFamily: FONTE.media,
    fontSize: 12,
    color: COR.tintaMedia,
    flex: 1,
  },
  rodapeTempo: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaFraca,
    flexShrink: 0,
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
    borderRadius: RAIO.superficie,
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
    borderRadius: RAIO.superficie,
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
    borderRadius: RAIO.controle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaForte,
    backgroundColor: COR.fundo,
  },
  novoAlunoDica: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
    lineHeight: 15,
  },
  botaoNovoAluno: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RAIO.controle,
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
    borderRadius: RAIO.superficie,
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