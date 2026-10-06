import { Ionicons } from "@expo/vector-icons";
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
import { COR, FONTE } from "../../components/estilo";
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

// ---------------------------------------------------------------------------
// O ENVIO DA FOLHA
//
// Esta função vivia no constants/api.js. Ela está aqui porque o envio no
// celular precisou de mais de uma tentativa, e concentrar tudo num arquivo só
// é o que permite trocar uma tela sem mexer em mais nada.
//
// O problema: existem dois jeitos de descrever um arquivo dentro de um
// FormData, e qual deles funciona depende da versão do Expo/React Native.
//
//   1) { uri, name, type }  -> o jeito clássico do React Native
//   2) um Blob              -> o jeito do fetch novo (padrão WinterCG)
//
// Neste celular o jeito 1 é recusado com "Unsupported FormDataPart
// implementation" — mensagem que só aparece na hora do envio. Então tentamos
// os dois, em ordem, e paramos no primeiro que passar.
//
// Ler o arquivo para virar Blob tem duas vias também. O XMLHttpRequest é o
// mais confiável com file:// no Android porque é a implementação do próprio
// React Native, que não muda com a versão do fetch. O fetch fica de terceira
// tentativa.
//
// Erro vindo DO servidor (400, 401, 500) não repete o envio: o arquivo chegou
// lá, o problema é outro, e remandar a mesma foto só gasta internet.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// TEMPO LIMITE
//
// O fetch do React Native não tem tempo limite. Se a requisição trava no meio,
// ela nunca volta: nem resolve, nem dá erro — e a tela fica carregando pra
// sempre, sem nada no console. Foi o que aconteceu com a foto da câmera.
//
// O AbortController cancela de verdade quando a implementação respeita o
// signal. A corrida com o relógio é o cinto de segurança: mesmo que o signal
// seja ignorado, a gente desiste e passa para a próxima tentativa.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// O TIPO DO ARQUIVO
//
// Um Blob lido de um file:// vem com type vazio — o celular não sabe dizer que
// aquilo é um JPEG só pelo caminho. No multipart isso vira
// "application/octet-stream", e o multer do nosso servidor recusa com "Envie
// uma foto (JPG, PNG) ou um PDF da folha".
//
// O arquivo está certo; falta só a etiqueta. Aqui ela é colada de volta, com o
// mime que o seletor de imagem já tinha informado.
//
// Se o construtor de Blob não existir, ou devolver algo vazio, o original
// segue — melhor mandar sem etiqueta do que mandar zero byte.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// NOME E TIPO NO MESMO PACOTE
//
// O terceiro argumento do formulario.append("imagem", parte, nome) nem sempre
// é respeitado: algumas implementações de FormData simplesmente o ignoram, e
// então o arquivo chega no servidor chamado "blob", sem extensão. Se o multer
// olhar a extensão, recusa — e a mensagem é a mesma de quando o tipo está
// errado, o que confunde.
//
// Um File resolve os dois de uma vez: ele carrega o nome E o tipo dentro de si,
// e toda implementação de FormData usa o file.name como nome da parte.
//
// Se File não existir neste runtime, cai no Blob reetiquetado, que já é melhor
// do que nada.
// ---------------------------------------------------------------------------
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
  // Sem este piso, um ms indefinido virava NaN, o setTimeout disparava no
  // mesmo instante e a promessa boa era descartada antes de começar.
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

async function enviarFolha({ arquivo, id_atividade }) {
  const token = await AsyncStorage.getItem("token");

  // O FormData é montado a cada tentativa de propósito: um que já foi entregue
  // ao fetch não pode ser reaproveitado.
  // O limite tem padrão próprio de propósito. Ele já foi esquecido uma vez na
  // chamada do web, e Math.round(undefined / 1000) devolve NaN — o setTimeout
  // com NaN dispara na hora, e todo envio falhava no primeiro instante com
  // "o envio passou de NaNs".
  async function despachar(parte, nome, limite = 90000, pacote = null) {
    const formulario = new FormData();
    // Sem o terceiro argumento, de propósito.
    //
    // O FormData deste runtime, ao receber append(chave, parte, nome), tenta
    // fazer parte.name = nome. Em um File o name é somente leitura, e a
    // atribuição estoura com "Cannot assign to property 'name' which has only
    // a getter" — foi o que derrubou as duas tentativas de Blob.
    //
    // O nome não se perde: quem carrega o nome é o próprio File, e o
    // { uri, name, type } do jeito clássico traz o dele dentro do objeto.
    formulario.append("imagem", parte);
    formulario.append("id_atividade", String(id_atividade));

    const controlador =
      typeof AbortController === "function" ? new AbortController() : null;

    // Quando vem um pacote pronto, ele substitui o FormData inteiro: o corpo
    // já é o multipart montado à mão, e o Content-Type vai junto porque só nós
    // sabemos qual é a fronteira usada.
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

  // No navegador vai o objeto File de verdade, que o próprio input devolveu.
  if (Platform.OS === "web") {
    if (!arquivo?.objetoWeb) {
      throw new Error("O arquivo se perdeu. Escolha a folha de novo no Scanner.");
    }
    return await despachar(arquivo.objetoWeb, arquivo.nome, 90000);
  }

  if (!arquivo?.uri) {
    throw new Error("O arquivo se perdeu. Escolha a folha de novo no Scanner.");
  }

  const mime = arquivo.mime || "image/jpeg";

  // O nome que sobe não é o que aparece na tela — esse continua sendo o
  // arquivo.nome. Aqui vale um nome limpo, com a extensão batendo com o tipo,
  // para o servidor não ter com o que implicar.
  const extensao =
    mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
  const nome = `folha.${extensao}`;

  // A ordem importa. O "blob-fetch" vem antes do "blob-xhr" porque o Blob que
  // o próprio fetch produz é o que esse fetch sabe enviar. O Blob do
  // XMLHttpRequest vem do módulo de blob do React Native, que é outra
  // implementação — foi ele que o envio aceitou e nunca terminou.
  //
  // O tempo de cada uma é diferente de propósito: as duas primeiras têm rédea
  // curta, porque se travarem não adianta esperar. A última ganha 90s, que é o
  // tempo real de uma correção com a IA lendo a folha.
  // -------------------------------------------------------------------------
  // O MULTIPART MONTADO À MÃO
  //
  // Todas as tentativas acima dependem do FormData deste runtime, e ele já
  // recusou duas formas de arquivo. Esta não depende dele: o corpo da
  // requisição é um Blob montado por nós, com o cabeçalho e o rodapé do
  // multipart escritos como texto, e os bytes do arquivo no meio.
  //
  // É o mesmo formato que o FormData produziria; a diferença é que a fronteira
  // é nossa, então o Content-Type pode ir no cabeçalho sem estragar nada — o
  // que normalmente seria erro, aqui é obrigatório.
  //
  // O multer do outro lado não sabe a diferença. Para ele é um upload comum.
  // -------------------------------------------------------------------------
  function pacoteMultipart(blob, nome, tipo) {
    const fronteira = `----EduSync${Date.now().toString(36)}`;

    const cabeca =
      `--${fronteira}\r\n` +
      `Content-Disposition: form-data; name="imagem"; filename="${nome}"\r\n` +
      `Content-Type: ${tipo}\r\n\r\n`;

    const rodape =
      `\r\n--${fronteira}\r\n` +
      `Content-Disposition: form-data; name="id_atividade"\r\n\r\n` +
      `${id_atividade}\r\n` +
      `--${fronteira}--\r\n`;

    const corpo = new Blob([cabeca, blob, rodape], {
      type: `multipart/form-data; boundary=${fronteira}`,
    });

    return {
      size: corpo.size,
      name: nome,
      type: tipo,
      __pacote: {
        corpo,
        contentType: `multipart/form-data; boundary=${fronteira}`,
      },
    };
  }

  const tentativas = [
    {
      apelido: "uri",
      limite: 25000,
      montar: async () => ({ uri: arquivo.uri, name: nome, type: mime }),
    },
    {
      apelido: "blob-xhr",
      limite: 60000,
      montar: async () => embrulhar(await lerComoBlob(arquivo.uri), nome, mime),
    },
    {
      apelido: "multipart-manual",
      limite: 90000,
      montar: async () =>
        pacoteMultipart(await lerComoBlob(arquivo.uri), nome, mime),
    },
    {
      apelido: "blob-fetch",
      limite: 90000,
      montar: async () =>
        embrulhar(await (await fetch(arquivo.uri)).blob(), nome, mime),
    },
  ];

  let ultimaFalha = null;

  for (const tentativa of tentativas) {
    try {
      const parte = await tentativa.montar();

      // O fetch(file://) deste runtime devolveu um Blob de 0 KB. Mandar zero
      // byte para o servidor é pior do que falhar: ele responde alguma coisa,
      // a IA lê uma imagem vazia, e ninguém entende o resultado.
      if (parte && !parte.__pacote && parte.size === 0) {
        throw new Error("o arquivo veio com 0 byte");
      }
      const tamanho = parte?.size ? `${Math.round(parte.size / 1024)} KB` : "?";
      const tipo = parte?.type || parte?.type === "" ? `"${parte.type}"` : mime;
      const classe = parte?.constructor?.name || typeof parte;
      console.log(
        `[EduSync] tentando "${tentativa.apelido}" — ${classe}, ${tamanho}, tipo ${tipo}, nome "${parte?.name || nome}", limite ${tentativa.limite / 1000}s`,
      );
      const dados = await despachar(
        parte,
        nome,
        tentativa.limite,
        parte?.__pacote || null,
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
    "Não consegui enviar essa foto. Tente pela galeria ou mande o PDF.",
  );
  falha.causa = ultimaFalha?.message;
  throw falha;
}

// As quatro coisas que acontecem, na ordem, enquanto a folha é corrigida.
// Escritas como o professor contaria — não como o log do servidor.
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

// ---------------------------------------------------------------------------
// O QUE O PROFESSOR LÊ QUANDO DÁ ERRADO
//
// Erro que vem do nosso servidor já chega em português e ajuda ("Atividade não
// encontrada", "Essa turma não tem alunos"). Esse a gente mostra.
//
// Erro que vem de biblioteca chega em inglês e não ajuda ninguém em uma sala
// de aula: "Unsupported FormDataPart implementation", "Network request
// failed". Esse vira uma frase nossa, e o texto técnico vai pro console — que
// é onde ele serve pra alguma coisa.
// ---------------------------------------------------------------------------
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

// Toda mensagem nossa tem acento ou uma destas palavras. Se não tiver nenhuma
// das duas coisas, é texto de biblioteca — não vai pra tela.
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

// ---------------------------------------------------------------------------
// A coluna `matricula` é VARCHAR(20) e tem índice único.
//
// O formato antigo era "manual-" + Date.now() + "-" + sorteio, o que dava 27
// caracteres. O banco recusava, ninguém tratava o erro, e a tela mostrava um
// "HTTP 500" sem motivo nenhum. Custou horas de procura no lugar errado.
//
// Base 36 encurta o tempo de 13 dígitos para 8. Com o prefixo e seis letras de
// sorteio dá 15 caracteres — cabe com folga, e o sorteio evita colisão quando
// dois cadastros caem no mesmo milissegundo. Seis e não três porque a coluna é
// UNIQUE: uma colisão viraria erro na cara do professor, e com três letras ela
// deixa de ser improvável rápido demais.
// ---------------------------------------------------------------------------
function matriculaProvisoria() {
  const tempo = Date.now().toString(36);
  const sorteio = Math.random().toString(36).slice(2, 8).padEnd(6, "0");
  return `M${tempo}${sorteio}`.slice(0, 20);
}

// Compara nomes ignorando acento, caixa e espaço sobrando: "BEATRIZ  carvalho"
// e "Beatriz Carvalho" são a mesma pessoa.
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

  // Altura útil para centralizar o card: a janela menos o cabeçalho da página
  // (34 de respiro + 56 do título + 22 de margem = 112 acima) e o mesmo tanto
  // reservado abaixo. Descontando os dois, o card cai no meio da tela — e não
  // no meio do que sobrou embaixo do título, que era o que o deixava baixo.
  //
  // Dá para fazer isso só com flex: 1, mas dentro de um ScrollView o flex nem
  // sempre resolve para a altura da janela — depende de o container de
  // conteúdo ter altura definida. Uma conta simples aqui sempre funciona.
  const alturaDoCentro = Math.max(320, alturaJanela - 224);
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

  // Guarda qual folha gerou o que está na tela agora. Não dá para usar o
  // estado `arquivo` aqui porque o useFocusEffect roda antes do React aplicar
  // o setState, e a comparação leria o valor velho.
  const folhaNaTela = useRef(arquivo);

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

  // -------------------------------------------------------------------------
  // A logo pulsa enquanto a IA lê a folha.
  //
  // A espera aqui é de alguns segundos e a tela não tem o que mostrar nesse
  // meio tempo. Uma imagem parada parece travada; pulsando, parece trabalhando
  // — e quem está olhando sabe que não precisa clicar em nada.
  //
  // Na web o driver nativo não existe, então a animação roda em JavaScript.
  // É uma propriedade mudando a cada 900ms: não pesa.
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Chegou uma folha nova? Então a tela recomeça.
  //
  // Esta tela é registrada como aba no _layout.tsx, e o Expo Router NÃO a
  // desmonta ao navegar. Sem isto, voltar do Scanner com a folha do aluno
  // seguinte mostrava o resultado do aluno anterior — a tela nem chegava na
  // etapa de preview, e a folha nova nunca era enviada. Parecia que o app
  // tinha ignorado o arquivo.
  //
  // Só reseta quando vem folha NOVA. Folha nula (o limparArquivo() depois de
  // salvar) não mexe em nada: senão o professor perderia o resultado da tela
  // só de a aba receber foco de novo.
  // -------------------------------------------------------------------------
  const recomecarSeFolhaNova = useCallback(() => {
    const nova = pegarArquivo();
    if (!nova || nova === folhaNaTela.current) return;

    console.log(
      `[processando] folha nova: "${nova.nome}" ` +
        `(na tela estava: "${folhaNaTela.current?.nome ?? "nenhuma"}"). Recomeçando.`,
    );

    folhaNaTela.current = nova;
    setArquivo(nova);
    setEtapa("preview");
    setLeitura(null);
    setResultado(null);
    setErro("");
    setProgresso(0);
    setNomeManual("");
  }, []);

  // Duas redes para a mesma coisa, de propósito.
  //
  // O useFocusEffect é o caminho certo: dispara quando a tela ganha foco. Só
  // que ele depende do ciclo de foco do React Navigation, e há situações no
  // navegador (voltar pelo botão do browser, trocar de aba pela barra) em que
  // esse ciclo não acontece como se espera.
  //
  // O useEffect sem lista de dependências roda a cada render. Ele não é
  // elegante, mas é o que garante que uma folha nova nunca fique esperando um
  // evento que talvez não venha. Como a função só age quando a folha mudou de
  // verdade, rodar várias vezes não custa nada.
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

  // -------------------------------------------------------------------------
  // 1º tempo: a IA lê a folha e o servidor calcula as notas. Nada é gravado
  // ainda — a resposta traz o resultado e um palpite de quem é o aluno.
  // -------------------------------------------------------------------------
  async function corrigir() {
    console.log(
      `[processando] enviando "${arquivo?.nome}" para a atividade ${id_atividade}`,
    );
    setEtapa("processando");
    setProgresso(0);
    setErro("");

    try {
      const resposta = await enviarFolha({ arquivo, id_atividade });
      setLeitura(resposta);
      setProgresso(100);
      setEtapa("confirmarAluno");
    } catch (e) {
      console.warn("[EduSync] corrigir:", e?.message || e);
      setErro(e?.message || "Não consegui falar com o servidor.");
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
      console.warn("[EduSync] confirmarCorrecao:", e?.message || e);
      setErro(e?.message || "Não consegui salvar a correção.");
      setEtapa("erro");
    } finally {
      setSalvando(false);
    }
  }

  // -------------------------------------------------------------------------
  // O campo de nome, quando o professor mexe nele.
  //
  // REGRA IMPORTANTE: antes de criar aluno, procura o nome na turma. Se já
  // existir, a folha é dessa pessoa e o caminho é confirmar, não cadastrar.
  //
  // Sem isso, apertar o botão com a sugestão certa no campo criaria uma
  // SEGUNDA Beatriz na turma, e as notas dela ficariam espalhadas entre dois
  // cadastros. Numa prova de 30 alunos, ninguém perceberia até o fechamento do
  // bimestre — é o tipo de erro que só aparece quando já é tarde.
  // -------------------------------------------------------------------------
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

      // Sem id não dá para gravar a correção. Melhor dizer isso do que chamar
      // o confirmar com undefined e receber um erro que não explica nada.
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

  // ---------------------------------------------------------------------------
  // A tela da espera.
  //
  // Antes era um círculo grande, um título e uma barra, tudo centralizado — a
  // cara de qualquer tela de carregamento do mundo. Não dizia de quem era a
  // folha, nem de que atividade, nem o que estava sendo feito.
  //
  // Agora diz. O topo mostra a atividade e a turma; a lista mostra as quatro
  // coisas que acontecem, com visto no que já passou; o rodapé mostra o nome
  // do arquivo. Quem olha reconhece a própria aula na tela.
  //
  // Os passos são cronometrados, não medidos — o servidor faz tudo numa
  // chamada só e não reporta progresso. A ordem é verdadeira; o relógio é uma
  // aproximação.
  // ---------------------------------------------------------------------------
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

    // O botão diz o que vai fazer de verdade. Se o nome digitado já é de
    // alguém da turma, ele confirma; se não é, ele cadastra. Rótulo que mente
    // sobre a ação é como o professor acaba com dois cadastros do mesmo aluno.
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

  // ---------------------------------------------------------------------------
  // Duas etapas são só um card pequeno: "processando" e "erro".
  //
  // No desktop elas ficavam penduradas no topo, com meia tela de branco
  // embaixo — parecia que a página tinha carregado pela metade. Aqui o card
  // passa a ocupar o meio da tela, que é onde o olho procura quando não há
  // mais nada nela.
  //
  // As outras etapas (preview, confirmar aluno, resultado) têm conteúdo longo
  // e rolam normalmente, então ficam como estavam: começando em cima.
  // ---------------------------------------------------------------------------
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
  // O mesmo respiro das outras telas do desktop (a Home usa padding: 34 com
  // miolo de 940). Estava 20/560, e por isso o conteúdo daqui começava bem
  // mais longe da barra lateral que o das outras — dava para ver o degrau ao
  // trocar de tela.
  conteudoInternoDesktop: {
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 34,
    // precisa ser explícito: paddingBottom é mais específico que padding, e o
    // 60 do estilo de cima venceria o 34 daqui.
    paddingBottom: 40,
  },
  // Mesma largura de miolo da Home: assim o título "Enviar correção" nasce na
  // mesma vertical que a saudação de lá.
  //
  // Os cards ocupam essa largura inteira, então a margem da direita fica igual
  // à da esquerda: 34 de cada lado. Antes eles paravam em 720 e sobrava um
  // vazio só de um lado, o que deixava a tela torta.
  miolo: { width: "100%", maxWidth: 940, alignSelf: "center" },

  // Teto para quando a coluna do app for mais larga que um celular: o card
  // para de crescer e continua centralizado, em vez de virar uma faixa.
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 24,
    alignItems: "center",
  },
  cardCentralDesktop: { padding: 48, borderRadius: 24 },

  // -------------------------------------------------------------------------
  // Tamanhos só do computador.
  //
  // Esta tela desenha o mesmo JSX nas duas larguras, então cada estilo daqui
  // entra empilhado por cima do compartilhado:
  // [styles.nomeAluno, ehDesktop && styles.nomeAlunoDesktop].
  // O primeiro define, o segundo corrige, e o celular não passa por aqui.
  //
  // Mesmo arranjo da Home e do Scanner. Para ajustar o web, é só este bloco.
  // -------------------------------------------------------------------------
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

  logoCirculo: {
    width: 74,
    height: 74,
    borderRadius: 37,
    // O azul-marinho do sistema. A logo tem fundo transparente, então ela fica
    // sobre o marinho do mesmo jeito que fica na barra lateral — o azul da
    // figura e o amarelo da estrela aparecem com força sobre ele.
    backgroundColor: COR.marinho,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logoProcessando: { width: 48, height: 48 },

  // No desktop sobra espaço, e esta é a tela que fica no ar enquanto todo
  // mundo espera. A logo cresce junto com o card.
  logoCirculoDesktop: { width: 104, height: 104, borderRadius: 52 },
  logoProcessandoDesktop: { width: 68, height: 68 },
  barraFundoDesktop: { height: 10, borderRadius: 5, marginTop: 26 },

  // -------------------------------------------------------------------------
  // A tela da espera
  // -------------------------------------------------------------------------

  // O card deixa de centralizar tudo: o conteúdo é alinhado à esquerda, que é
  // como se lê. Título, texto e lista centralizados são o que dá aquele ar de
  // página de carregamento genérica.
  cardTrabalho: { alignItems: "stretch" },

  // O card ocupa a largura toda, mas o conteúdo dele não: ele fica numa coluna
  // de 560 no meio. Sem isso, num card de 870, a logo, a lista e o rodapé
  // ficavam encostados à esquerda com meio card vazio do lado direito.
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
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COR.linha,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  marcaEtapaFeita: { backgroundColor: COR.ok, borderColor: COR.ok },
  // anel grosso em vez de bolinha: sem precisar de outra animação, já lê como
  // "é esta aqui, agora".
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