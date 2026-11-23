import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { useAviso } from "../../components/Avisos";
import { COR, FONTE, RAIO } from "../../components/estilo";
import {
  atualizarAtividade,
  buscarAtividade,
  criarAlternativa,
  criarAtividade,
  criarQuestao,
  excluirAtividade as excluirAtividadeApi,
  enviarImagemDaQuestao,
  excluirQuestao,
  lerAtividadeDeArquivo,
  listarAlternativas,
  listarCorrecoes,
  listarQuestoes,
  listarTurmas,
  urlDaImagem,
} from "../../constants/api";
import {
  imagemDeVolta,
  questoesParaGuardar,
} from "../../constants/imagemRascunho";
import {
  apagarRascunho,
  guardarRascunho,
  lerRascunhos,
} from "../../constants/rascunhos";
import { embutirImagens, entregarProva } from "../../constants/provaPdf";

const TIPOS = [
  { valor: "alternativa", rotulo: "Alternativa" },
  { valor: "dissertativa", rotulo: "Dissertativa" },
  { valor: "calculo", rotulo: "Cálculo" },
  { valor: "itens", rotulo: "Itens (a, b, c)" },
];

const LETRAS = ["A", "B", "C", "D", "E"];
// Os rótulos dos itens: a) b) c) ... z) e, acabadas as letras, 1) 2) 3).
//
// Antes a lista tinha oito letras e o nono item caía num `String(indice + 1)`
// que devolvia "9)" logo depois do "h)" -- um salto sem explicação. Pior que
// feio: o leitor que remonta os itens ao reabrir a atividade só reconhecia
// letras, então do nono em diante tudo voltava grudado no enunciado.
//
// Agora o alfabeto inteiro vem primeiro e a numeração continua de onde ele
// para, e os dois leitores (esta tela e o PDF) entendem as duas formas.
const LETRAS_ITEM = "abcdefghijklmnopqrstuvwxyz".split("");
const MAX_ITENS = LETRAS_ITEM.length + 99;

function rotuloDoItem(indice) {
  return LETRAS_ITEM[indice] || String(indice - LETRAS_ITEM.length + 1);
}

function novoItem(indice) {
  return {
    letra: rotuloDoItem(indice),
    texto: "",
    resposta: "",
  };
}

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
    itens: [novoItem(0), novoItem(1)],

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
    q.alternativas.every((a) => !a.texto.trim()) &&
    (q.itens || []).every((i) => !i.texto.trim() && !i.resposta.trim())
  );
}

// A questão com itens não existe no banco, e de propósito: ela é enviada
// como uma dissertativa comum. O enunciado leva os itens listados embaixo, e
// a resposta de cada item vira uma palavra-chave do gabarito.
//
// Isso resolve a nota de graça. A correção de dissertativa já divide o peso
// pelo número de palavras-chave e conta quantas o aluno expressou -- que é
// exatamente "cada item vale a mesma coisa, e acertar dois de três vale dois
// terços". Nada muda no banco, na API nem na correção.
function perguntaDaQuestao(questao) {
  const base = questao.enunciado.trim();
  if (questao.tipo !== "itens") return base;

  const itens = (questao.itens || []).filter((i) => i.texto.trim());
  if (itens.length === 0) return base;

  const lista = itens.map((i) => `${i.letra}) ${i.texto.trim()}`).join("\n");
  return base ? `${base}\n\n${lista}` : lista;
}

function tipoParaApi(questao) {
  return questao.tipo === "itens" ? "dissertativa" : questao.tipo;
}

// O caminho de volta, para quando a atividade é aberta para editar: se o fim
// do enunciado é uma lista "a) ...", "b) ...", ela volta a ser itens. Sem
// isto, editar uma questão com itens grudaria a lista no enunciado e
// duplicaria tudo no próximo salvamento.
function separarItens(pergunta, gabarito) {
  const linhas = String(pergunta || "").split("\n");
  const itens = [];

  while (linhas.length) {
    const ultima = linhas[linhas.length - 1].trim();
    if (!ultima) {
      linhas.pop();
      continue;
    }
    const achou = ultima.match(/^([a-z]|\d{1,2})\)\s*(.+)$/i);
    if (!achou) break;
    itens.unshift({
      letra: achou[1].toLowerCase(),
      texto: achou[2].trim(),
      resposta: "",
    });
    linhas.pop();
  }

  // Um item só pode ser coincidência: uma pergunta que por acaso termina em
  // "a) alguma coisa". Com dois ou mais, foi escrito como lista.
  //
  // E a lista TEM de começar no a). Sem essa trava, agora que o leitor também
  // aceita número, um enunciado comum terminado numa lista numerada ("1) ...
  // 2) ...") seria confundido com itens de gabarito.
  if (itens.length < 2 || itens[0].letra !== "a") return null;

  const respostas = String(gabarito || "")
    .split(";")
    .map((r) => r.trim());
  itens.forEach((item, i) => {
    item.resposta = respostas[i] || "";
  });

  return { enunciado: linhas.join("\n").trim(), itens };
}

function contarPalavrasChave(texto) {
  return texto
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// OS TETOS DO BANCO
//
// Estas colunas são VARCHAR no MySQL, e o MySQL não corta sozinho: ele recusa
// a linha inteira. Sem freio aqui, escrever um gabarito comprido demais fazia
// o salvamento voltar com "erro ao conectar com o servidor (HTTP 500)" -- que
// não diz nada para quem está do outro lado da tela.
//
// Os números são os da tabela, não chutes: atividade.nome VARCHAR(100),
// atividade.disciplina VARCHAR(80), questao.resposta_correta VARCHAR(255),
// alternativa.texto VARCHAR(255).
// ---------------------------------------------------------------------------
const TETO = {
  titulo: 100,
  disciplina: 80,
  gabarito: 255,
  alternativa: 255,
};

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

  if (imagem.objetoWeb) {
    return {
      uri: imagem.uri,
      mime: imagem.mime || "image/jpeg",
      objetoWeb: imagem.objetoWeb,
    };
  }

  // Imagem que veio de um rascunho: o arquivo que a pessoa escolheu não existe
  // mais, só o endereço guardado. Na web o envio precisa de um File de
  // verdade, então ele é remontado aqui a partir do próprio endereço.
  if (imagem.uri && !imagem.caminho) {
    if (Platform.OS !== "web") {
      return { uri: imagem.uri, mime: imagem.mime || "image/jpeg", objetoWeb: null };
    }

    const dados = await lerComoBlob(imagem.uri);
    const tipo = dados?.type || imagem.mime || "image/jpeg";

    return {
      uri: imagem.uri,
      mime: tipo,
      objetoWeb:
        typeof File === "function"
          ? new File([dados], "questao.jpg", { type: tipo })
          : dados,
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
        size={21}
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

  const {
    modo,
    id,
    tituloInicial,
    idTurmaInicial,
    rascunho: idRascunhoParam,
  } = useLocalSearchParams();
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
  const [gerandoPdf, setGerandoPdf] = useState("");
  const [folhasCorrigidas, setFolhasCorrigidas] = useState(0);

  const [erro, setErro] = useState("");
  useAviso(erro);
  const [problema, setProblema] = useState(null);

  const rolagem = useRef(null);
  const alturaDasQuestoes = useRef({});

  const [importando, setImportando] = useState(false);
  const [resumoImport, setResumoImport] = useState("");

  // Questões lidas de um arquivo, esperando você decidir se substituem o que
  // já está na tela ou se somam.
  const [importPendente, setImportPendente] = useState(null);

  const [rascunhos, setRascunhos] = useState([]);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [apagando, setApagando] = useState(false);

  // Qual rascunho esta tela está alimentando. Null significa "ainda não
  // virou rascunho": o primeiro salvamento automático cria um e guarda o id
  // aqui, para os seguintes gravarem por cima em vez de empilhar cópias.
  const idRascunho = useRef(null);
  const turmaPendente = useRef(null);

  // Espelho da lista de turmas. aplicarRascunho precisa dela, mas não pode
  // depender do estado: entraria na lista de dependências do efeito de foco,
  // que recarrega as turmas, que muda o estado, que recria a função... e o
  // efeito rodaria sem parar.
  const turmasRef = useRef([]);

  // O que esta tela está editando agora: "nova" ou "editar:7". Serve para
  // perceber quando ela trocou de alvo. É ref porque só é lido dentro de
  // efeito -- virar estado faria render à toa.
  const alvoNaTela = useRef(null);

  const limparFormulario = useCallback(() => {
    setTitulo(typeof tituloInicial === "string" ? tituloInicial : "");
    setDisciplina("");
    setDescricao("");
    setQuestoes([novaQuestao()]);
    setTurmaSelecionada(null);
    setResumoImport("");
    setFolhasCorrigidas(0);
    setImportPendente(null);
    setErro("");
    setProblema(null);
  }, [tituloInicial]);

  // Esta tela também vive dentro do <Tabs> e não é desmontada ao sair dela:
  // o que estava digitado continua aqui quando você volta.
  //
  // Isso é bom no meio de uma atividade -- dá para ir criar uma turma e
  // voltar sem perder o que escreveu. E era ruim ao começar OUTRA atividade:
  // as questões e a turma da anterior continuavam na tela, e a segunda
  // nascia com as questões da primeira, na turma da primeira. Era o que
  // obrigava a apagar questão por questão antes de importar a próxima prova.
  //
  // O critério é o alvo. Mudou de "nova" para "editar a 7", ou de uma
  // atividade para outra: limpa. Continuou no mesmo alvo: preserva.
  function aplicarRascunho(r) {
    if (!r) return;

    idRascunho.current = r.id;
    setTitulo(r.titulo || "");
    setDisciplina(r.disciplina || "");
    setDescricao(r.descricao || "");
    setQuestoes(
      (r.questoes || []).length
        ? r.questoes.map((q) => ({
            ...novaQuestao(),
            ...q,
            imagem: imagemDeVolta(q.imagem),
          }))
        : [novaQuestao()],
    );

    // A lista de turmas pode ainda estar chegando do servidor. Se já chegou,
    // resolve agora; se não, fica anotado e o carregamento resolve depois.
    turmaPendente.current = r.id_turma || null;
    if (r.id_turma) {
      const achou = turmasRef.current.find((x) => x.id_turma === r.id_turma);
      if (achou) {
        setTurmaSelecionada(achou);
        turmaPendente.current = null;
      }
    }

  }

  useFocusEffect(
    useCallback(() => {
      const alvo = emEdicao
        ? `editar:${id ?? ""}`
        : idRascunhoParam
          ? `rascunho:${idRascunhoParam}`
          : "nova";

      if (alvoNaTela.current !== alvo) {
        alvoNaTela.current = alvo;
        limparFormulario();

        idRascunho.current = null;
        turmaPendente.current = null;
      }

      // A lista de turmas é relida toda vez que a tela aparece, e não só na
      // primeira: se você saiu daqui para criar uma turma, ela precisa estar
      // na lista quando voltar.
      let ativo = true;

      (async () => {
        // A lista de rascunhos é relida a cada vez que a tela aparece: o
        // contador do botão tem de refletir o que foi descartado em
        // Atividades sem precisar recarregar nada.
        const guardados = await lerRascunhos();
        if (!ativo) return;
        setRascunhos(guardados);

        if (idRascunhoParam) {
          const pedido = guardados.find((r) => r.id === idRascunhoParam);
          if (pedido) aplicarRascunho(pedido);
        }

        try {
          const dados = await listarTurmas();
          if (!ativo) return;

          setTurmas(dados);
          turmasRef.current = dados;

          // Rascunho retomado antes de as turmas chegarem: agora dá para
          // reencontrar a turma dele.
          if (turmaPendente.current) {
            const achou = dados.find(
              (x) => x.id_turma === turmaPendente.current,
            );
            if (achou) setTurmaSelecionada(achou);
            turmaPendente.current = null;
          }

          if (idTurmaInicial) {
            const turmaAtual = dados.find(
              (t) => t.id_turma === Number(idTurmaInicial),
            );
            if (turmaAtual) setTurmaSelecionada(turmaAtual);
          }
        } catch (e) {
          if (ativo) setErro(e.message);
        }
      })();

      return () => {
        ativo = false;
      };
      // aplicarRascunho fica fora das dependências de propósito: ela é
      // recriada a cada render, e incluí-la faria o efeito recarregar as
      // turmas sem parar. O que ela usa de fora são refs, que não mudam de
      // identidade.
    }, [emEdicao, id, idTurmaInicial, idRascunhoParam, limparFormulario]),
  );

  // ---------------------------------------------------------------------
  // EDIÇÃO: o cabeçalho da atividade.
  //
  // Antes daqui só vinham as questões, e disciplina, descrição e turma
  // apareciam em branco ao abrir "Editar" -- o professor salvava achando que
  // estava mexendo só nas questões e apagava os três campos sem perceber.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!emEdicao || !id) return;
    let ativo = true;

    async function carregarCabecalho() {
      try {
        const a = await buscarAtividade(id);
        if (!ativo || !a) return;

        setTitulo(a.nome || "");
        setDisciplina(a.disciplina || "");
        setDescricao(a.descricao || "");

        // Quantas folhas já foram corrigidas. É isso que decide se as
        // questões ainda podem ser trocadas.
        const corrigidas = await listarCorrecoes({
          id_atividade: Number(id),
        }).catch(() => []);
        if (!ativo) return;
        setFolhasCorrigidas(corrigidas.length);

        if (!a.id_turma) return;

        // A turma precisa do objeto inteiro, não só do id. Se a lista ainda
        // não chegou, busca aqui mesmo em vez de esperar o outro efeito.
        let lista = turmasRef.current || [];
        if (lista.length === 0) {
          lista = await listarTurmas().catch(() => []);
          if (!ativo) return;
          if (lista.length) {
            turmasRef.current = lista;
            setTurmas(lista);
          }
        }

        const achou = lista.find((t) => t.id_turma === a.id_turma);
        if (achou) setTurmaSelecionada(achou);
        else turmaPendente.current = a.id_turma;
      } catch (e) {
        if (ativo) setErro("Não consegui carregar a atividade: " + e.message);
      }
    }

    carregarCabecalho();

    return () => {
      ativo = false;
    };
  }, [emEdicao, id]);

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
                const comItens =
                  tipo === "dissertativa"
                    ? separarItens(q.pergunta, q.resposta_correta)
                    : null;

                if (comItens) {
                  return {
                    ...base,
                    enunciado: comItens.enunciado,
                    peso: String(q.peso ?? 1).replace(".", ","),
                    tipo: "itens",
                    imagem,
                    itens: comItens.itens,
                  };
                }

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

  // Toda mexida nos itens passa por aqui para reescrever as letras no fim.
  // Tirando o b), o que era c) vira b) -- senão a prova sai com buraco.
  // Guarda o que está escrito, pouco depois de a pessoa parar de digitar.
  // Só para atividade nova -- editar uma existente já tem onde salvar.
  //
  // As imagens vão junto, encolhidas (ver constants/imagemRascunho.js). A que
  // não couber fica de fora e entra na conta de `imagensPerdidas`, para a tela
  // de rascunhos poder avisar em vez de o professor descobrir sozinho.
  useEffect(() => {
    if (emEdicao) return;

    const temAlgo =
      titulo.trim() ||
      disciplina.trim() ||
      descricao.trim() ||
      questoes.some((q) => !questaoEmBranco(q));

    const esperar = setTimeout(async () => {
      if (!temAlgo) {
        if (idRascunho.current) {
          await apagarRascunho(idRascunho.current);
          idRascunho.current = null;
          setRascunhos(await lerRascunhos());
        }
        return;
      }

      const guardaveis = await questoesParaGuardar(questoes);

      idRascunho.current = await guardarRascunho({
        id: idRascunho.current,
        titulo,
        disciplina,
        descricao,
        id_turma: turmaSelecionada ? turmaSelecionada.id_turma : null,
        imagensPerdidas: guardaveis.perdidas,
        questoes: guardaveis.questoes,
      });

      setRascunhos(await lerRascunhos());
    }, 900);

    return () => clearTimeout(esperar);
  }, [emEdicao, titulo, disciplina, descricao, questoes, turmaSelecionada]);

  // Guarda o rascunho na hora e sai. É o "deixo pra depois" explícito, para
  // quem não confia no salvamento automático -- e ele é invisível mesmo.
  async function salvarRascunhoESair() {
    const guardaveis = await questoesParaGuardar(questoes);

    const corpo = {
      id: idRascunho.current,
      titulo,
      disciplina,
      descricao,
      id_turma: turmaSelecionada ? turmaSelecionada.id_turma : null,
      imagensPerdidas: guardaveis.perdidas,
      questoes: guardaveis.questoes,
    };

    await guardarRascunho(corpo);

    // Solta o id ANTES de limpar a tela. A tela fica montada depois que a
    // gente sai, e o salvamento automático ainda vai disparar uma vez: se
    // ele encontrasse a tela vazia com o id ainda apontando para este
    // rascunho, apagaria justamente o que acabou de ser guardado.
    idRascunho.current = null;
    alvoNaTela.current = null;
    limparFormulario();

    setRascunhos(await lerRascunhos());
    router.navigate("/atividades");
  }

  async function confirmarSaida() {
    if (apagando) return;
    setApagando(true);

    try {
      if (emEdicao && id) {
        await excluirAtividadeApi(id);
      }

      if (idRascunho.current) {
        await apagarRascunho(idRascunho.current);
      }

      idRascunho.current = null;
      alvoNaTela.current = null;
      limparFormulario();

      setRascunhos(await lerRascunhos());
      setConfirmandoSaida(false);
      router.navigate("/atividades");
    } catch (e) {
      setConfirmandoSaida(false);
      setErro(e.message);
    } finally {
      setApagando(false);
    }
  }

  function mexerNosItens(idQuestao, transformar) {
    setQuestoes((atuais) =>
      atuais.map((q) => {
        if (q.id !== idQuestao) return q;
        const itens = transformar([...(q.itens || [])]);
        return {
          ...q,
          itens: itens.map((item, i) => ({
            ...item,
            letra: rotuloDoItem(i),
          })),
        };
      }),
    );
  }

  function atualizarItem(idQuestao, indice, campo, valor) {
    mexerNosItens(idQuestao, (itens) => {
      itens[indice] = { ...itens[indice], [campo]: valor };
      return itens;
    });
  }

  function adicionarItem(idQuestao) {
    mexerNosItens(idQuestao, (itens) =>
      itens.length >= MAX_ITENS ? itens : [...itens, novoItem(itens.length)],
    );
  }

  function removerItem(idQuestao, indice) {
    mexerNosItens(idQuestao, (itens) => itens.filter((_, i) => i !== indice));
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

  function aplicarImportacao(novas, manter, nomeArquivo) {
    setQuestoes(manter.length > 0 ? [...manter, ...novas] : novas);
    setImportPendente(null);

    const quantas = novas.length;

    setResumoImport(
      `${quantas} ${quantas === 1 ? "questão importada" : "questões importadas"} de "${nomeArquivo}"` +
        (manter.length > 0
          ? `, somadas às ${manter.length} que já estavam aqui. `
          : ". ") +
        `Falta você definir o gabarito ${quantas === 1 ? "dela" : "de cada uma"}.`,
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

      const jaEscritas = questoes.filter((q) => !questaoEmBranco(q));

      // Com a tela vazia não há o que perguntar. Só quando já existe questão
      // escrita é que a escolha importa -- e antes ela era tomada sozinha,
      // sempre somando: quem importasse a mesma prova de novo terminava com
      // tudo em dobro, para apagar uma a uma.
      if (jaEscritas.length === 0) {
        aplicarImportacao(novas, [], arquivo.nome);
      } else {
        setImportPendente({
          novas,
          jaEscritas,
          nomeArquivo: arquivo.nome,
        });
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setImportando(false);
    }
  }

  function faltaGabarito(questao) {
    if (!questao.enunciado.trim()) return false;
    if (questao.tipo === "itens") {
      const itens = (questao.itens || []).filter((i) => i.texto.trim());
      return itens.length === 0 || itens.some((i) => !i.resposta.trim());
    }
    if (questao.tipo === "alternativa") return !questao.letraCorreta;
    if (questao.tipo === "calculo") return !questao.respostaEsperada.trim();
    return contarPalavrasChave(questao.palavrasChave) === 0;
  }

  // navigate, e não replace.
  //
  // O `_layout.tsx` da raiz declara `unstable_settings = { anchor: "index" }`.
  // Com isso, `router.replace` não troca só a tela de cima: ele reconstrói a
  // pilha a partir da rota âncora, e o app acabava caindo na home em vez de
  // ir para onde foi pedido. `navigate` vai direto para a rota, reaproveitando
  // a que já está no histórico quando existe.
  function voltar() {
    if (emEdicao && id) {
      router.navigate({ pathname: "/atividade", params: { id: String(id) } });
      return;
    }
    router.navigate("/atividades");
  }

  const temConteudo = Boolean(
    titulo.trim() ||
      disciplina.trim() ||
      descricao.trim() ||
      questoes.some((q) => !questaoEmBranco(q)),
  );

  function gabaritoDaQuestao(questao) {
    if (questao.tipo === "itens") {
      return (questao.itens || [])
        .filter((i) => i.texto.trim())
        .map((i) => i.resposta.trim())
        .filter(Boolean)
        .join("; ");
    }
    if (questao.tipo === "alternativa") return questao.letraCorreta.trim();
    if (questao.tipo === "calculo") return questao.respostaEsperada.trim();
    return questao.palavrasChave.trim();
  }

  function primeiroProblema() {
    const noTopo = (texto) => ({ texto, idQuestao: null, numero: null });

    if (!titulo.trim()) return noTopo("Dê um título para a atividade.");
    if (!disciplina.trim()) return noTopo("Escolha a disciplina.");
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

      if (q.tipo === "itens") {
        const itens = (q.itens || []).filter((i) => i.texto.trim());
        if (itens.length === 0) {
          return na("Escreva pelo menos um item (a, b, c).");
        }
        if (itens.some((i) => !i.resposta.trim())) {
          return na("Falta a resposta de um dos itens.");
        }
      }

      // As respostas dos itens viram um gabarito só, separado por ponto e
      // vírgula, e é ele que vai para a coluna de 255 caracteres.
      const gabarito = gabaritoDaQuestao(q);
      if (gabarito && gabarito.length > TETO.gabarito) {
        return na(
          `O gabarito ficou com ${gabarito.length} caracteres e o limite é ` +
            `${TETO.gabarito}. Encurte as respostas.`,
        );
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

  async function gravarQuestoes(idCru) {
    // Em edição o id vem do endereço da tela, e endereço é sempre texto. O
    // banco espera número: mandando "10" em vez de 10, a questão nova não
    // entrava e a tela só dizia "deu erro no servidor".
    const id_atividade = Number(idCru);

    if (emEdicao) {
      // Trocar as questões quer dizer apagar as que existem, e apagar uma
      // questão leva junto as respostas dos alunos penduradas nela.
      //
      // A verificação precisa vir ANTES do primeiro apagamento. Antes ela
      // acontecia dentro do servidor, questão por questão: as sem resposta
      // eram apagadas, a primeira com resposta era recusada, e a atividade
      // ficava pela metade -- com parte das questões já perdida.
      const corrigidas = await listarCorrecoes({ id_atividade }).catch(
        () => [],
      );

      if (corrigidas.length > 0) {
        throw new Error(
          `Título, disciplina, turma e descrição foram salvos. As questões não: ` +
            `esta atividade já tem ${corrigidas.length} ` +
            `${corrigidas.length === 1 ? "folha corrigida" : "folhas corrigidas"}, ` +
            `e trocá-las apagaria as notas dos alunos.`,
        );
      }

      const antigas = await listarQuestoes(id_atividade);
      for (const q of antigas) {
        await excluirQuestao(q.id_questao);
      }
    }

    for (let i = 0; i < questoes.length; i++) {
      const questao = questoes[i];

      const criada = await criarQuestao(
        i + 1,
        perguntaDaQuestao(questao),
        tipoParaApi(questao),
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

  async function salvarProvaEmPdf(modo = "baixar") {
    if (gerandoPdf) return;

    if (!titulo.trim() || questoes.every((q) => !q.enunciado.trim())) {
      setErro(
        "Escreva o título e pelo menos uma questão antes de gerar a prova.",
      );
      return;
    }

    setGerandoPdf(modo);
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

      const problema = await entregarProva(
        {
          titulo,
          disciplina,
          turma: turmaSelecionada?.nome || "",
          descricao,
          questoes: paraProva,
          id_atividade: emEdicao ? id : null,
        },
        modo,
      );

      if (problema) setErro(problema);
    } catch (e) {
      setErro("Não consegui gerar a prova: " + (e.message || e));
    } finally {
      setGerandoPdf("");
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
          turmaSelecionada ? turmaSelecionada.id_turma : null,
        );
      } else {
        const criada = await criarAtividade(
          titulo,
          disciplina,
          descricao,
          turmaSelecionada ? turmaSelecionada.id_turma : null,
        );
        id_atividade = criada?.id_atividade ?? criada?.id;

        if (!id_atividade) {
          throw new Error(
            "A atividade foi criada, mas o servidor não devolveu o id — as questões não foram salvas.",
          );
        }
      }

      await gravarQuestoes(id_atividade);

      // Salvou: o formulário já cumpriu o papel. Limpar aqui é o que garante
      // que a PRÓXIMA atividade comece em branco -- o alvo continua sendo
      // "nova" de uma para a outra, então o efeito de cima sozinho não
      // perceberia a troca.
      alvoNaTela.current = null;
      limparFormulario();

      if (idRascunho.current) {
        await apagarRascunho(idRascunho.current);
        idRascunho.current = null;
        setRascunhos(await lerRascunhos());
      }

      // Termina na atividade que acabou de ser salva, não na lista: é de lá
      // que se imprime a prova e se vê o resumo, que é o passo seguinte.
      router.navigate({
        pathname: "/atividade",
        params: { id: String(id_atividade) },
      });
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
                <Ionicons name="arrow-back" size={21} color="#0F172A" />
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
              <Ionicons name="arrow-back" size={21} color="#0F172A" />
              <Text style={styles.tituloPagina}>
                {emEdicao ? "Editar atividade" : "Criar atividade"}
              </Text>
            </TouchableOpacity>
          )}

          {emEdicao && folhasCorrigidas > 0 && (
            <Alerta
              titulo="As questões desta atividade estão travadas"
              texto={
                `${folhasCorrigidas} ${folhasCorrigidas === 1 ? "folha já foi corrigida" : "folhas já foram corrigidas"}. ` +
                "Trocar as questões agora apagaria as notas dos alunos, então elas não podem mais ser alteradas. " +
                "Título, disciplina, turma e descrição continuam liberados."
              }
            />
          )}

          {!emEdicao && rascunhos.length > 0 && (
            <TouchableOpacity
              style={styles.rascunhoBotao}
              onPress={() => router.push("/rascunhos")}
              activeOpacity={0.85}
            >
              <Ionicons
                name="document-text-outline"
                size={17}
                color={COR.tintaFraca}
              />
              <Text style={styles.rascunhoBotaoTexto}>
                {rascunhos.length === 1
                  ? "1 rascunho guardado"
                  : `${rascunhos.length} rascunhos guardados`}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COR.chevron} />
            </TouchableOpacity>
          )}


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
                    size={ehDesktop ? 18 : 19}
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
              <Ionicons name="checkmark-circle" size={21} color={COR.ok} />
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
              maxLength={TETO.titulo}
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
              maxLength={TETO.disciplina}
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
              Turma <Text style={styles.opcional}>(pode escolher depois)</Text>
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
                {turmaSelecionada
                  ? turmaSelecionada.nome
                  : "Ainda sem turma"}
              </Text>
              <Ionicons name="chevron-down" size={19} color="#64748B" />
            </TouchableOpacity>
            {!turmaSelecionada && (
              <Text style={styles.dica}>
                Dá para montar as questões agora e escolher a turma depois. Só
                não dá para escanear folhas enquanto ela não for escolhida: é a
                turma que diz de quem são as provas.
              </Text>
            )}
          </View>

          <View style={styles.avisoBox}>
            <Ionicons
              name="information-circle-outline"
              size={21}
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
                      size={19}
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
                        size={18}
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
                        size={18}
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
                  <Ionicons name="image-outline" size={21} color={COR.marcador} />
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
                          maxLength={TETO.alternativa}
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
                              size={19}
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
                    maxLength={TETO.gabarito}
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
                    maxLength={TETO.gabarito}
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

              {questao.tipo === "itens" && (
                <>
                  <Text style={styles.rotulo}>
                    Itens <Text style={styles.obrigatorio}>*</Text>
                  </Text>
                  <Text style={styles.dica}>
                    Cada item ganha a sua linha de resposta na prova impressa. O
                    peso da questão é dividido por igual entre eles: acertar dois
                    de três vale dois terços.
                  </Text>

                  {(questao.itens || []).map((item, indice) => (
                    <View key={`${questao.id}-${indice}`} style={styles.itemLinha}>
                      <Text style={styles.itemLetra}>{item.letra})</Text>

                      <View style={styles.itemCampos}>
                        <TextInput
                          value={item.texto}
                          onChangeText={(v) =>
                            atualizarItem(questao.id, indice, "texto", v)
                          }
                          placeholder="O que se pede neste item"
                          placeholderTextColor={COR.tintaFraca}
                          style={styles.campoTexto}
                        />
                        <TextInput
                          value={item.resposta}
                          onChangeText={(v) =>
                            atualizarItem(questao.id, indice, "resposta", v)
                          }
                          placeholder="Resposta certa deste item"
                          placeholderTextColor={COR.tintaFraca}
                          style={[styles.campoTexto, styles.itemResposta]}
                        />
                      </View>

                      {(questao.itens || []).length > 1 && (
                        <TouchableOpacity
                          onPress={() => removerItem(questao.id, indice)}
                          style={styles.itemRemover}
                          hitSlop={10}
                          accessibilityLabel={`Remover o item ${item.letra}`}
                        >
                          <Ionicons
                            name="close"
                            size={17}
                            color={COR.tintaFraca}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.itemAdicionar}
                    disabled={(questao.itens || []).length >= MAX_ITENS}
                    onPress={() => adicionarItem(questao.id)}
                  >
                    <Ionicons name="add" size={17} color={COR.marcador} />
                    <Text style={styles.itemAdicionarTexto}>
                      Adicionar item
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={styles.botaoAdicionarQuestao}
            onPress={adicionarQuestao}
          >
            <Ionicons name="add" size={21} color={COR.marcador} />
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
                      size={15}
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
              style={[
                styles.botaoExcluir,
                ehDesktop
                  ? styles.botaoExcluirDesktop
                  : styles.botaoExcluirMobile,
              ]}
              onPress={() => setConfirmandoSaida(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={
                emEdicao ? "Excluir atividade" : "Descartar atividade"
              }
            >
              <Ionicons
                name="trash-outline"
                size={ehDesktop ? 18 : 20}
                color={COR.perigo}
              />
              {ehDesktop && (
                <Text style={styles.botaoExcluirTexto} numberOfLines={1}>
                  {emEdicao ? "Excluir atividade" : "Descartar"}
                </Text>
              )}
            </TouchableOpacity>

            {!emEdicao && (
              <TouchableOpacity
                style={[
                  styles.botaoProva,
                  ehDesktop
                    ? styles.botaoProvaDesktop
                    : styles.botaoCurtoMobile,
                ]}
                onPress={salvarRascunhoESair}
                disabled={!temConteudo}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={temConteudo ? COR.marcador : COR.tintaFraca}
                />
                <Text
                  style={[
                    styles.botaoProvaTexto,
                    !temConteudo && { color: COR.tintaFraca },
                  ]}
                  numberOfLines={1}
                >
                  Salvar rascunho
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.botaoProva,
                ehDesktop ? styles.botaoProvaDesktop : styles.botaoMeioMobile,
              ]}
              onPress={() => salvarProvaEmPdf("baixar")}
              disabled={!!gerandoPdf}
              activeOpacity={0.85}
            >
              <Ionicons
                name="download-outline"
                size={19}
                color={COR.marcador}
              />
              <Text style={styles.botaoProvaTexto} numberOfLines={1}>
                {gerandoPdf === "baixar"
                  ? "Gerando..."
                  : ehDesktop
                    ? "Salvar em PDF"
                    : "Baixar PDF"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botaoProva,
                ehDesktop ? styles.botaoProvaDesktop : styles.botaoMeioMobile,
              ]}
              onPress={() => salvarProvaEmPdf("imprimir")}
              disabled={!!gerandoPdf}
              activeOpacity={0.85}
            >
              <Ionicons name="print-outline" size={19} color={COR.marcador} />
              <Text style={styles.botaoProvaTexto} numberOfLines={1}>
                {gerandoPdf === "imprimir" ? "Abrindo..." : "Imprimir"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botaoPublicar,
                ehDesktop
                  ? styles.botaoPublicarDesktop
                  : styles.botaoLargoMobile,
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
                <View style={styles.semTurmaBox}>
                  <View style={styles.semTurmaIcone}>
                    <Ionicons name="people-outline" size={24} color={COR.marcador} />
                  </View>
                  <Text style={styles.semTurmaTitulo}>
                    Você ainda não tem nenhuma turma
                  </Text>
                  <Text style={styles.semTurmaTexto}>
                    Toda atividade pertence a uma turma -- é ela que diz de quem
                    são as folhas que vão ser corrigidas. Crie a primeira e
                    volte aqui.
                  </Text>
                  <TouchableOpacity
                    style={styles.semTurmaBotao}
                    activeOpacity={0.85}
                    onPress={() => {
                      setModalTurmaAberto(false);
                      router.push("/turmas");
                    }}
                  >
                    <Ionicons name="add" size={18} color={COR.branco} />
                    <Text style={styles.semTurmaBotaoTexto}>Criar turma</Text>
                  </TouchableOpacity>
                </View>
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

      <Modal
        visible={!!importPendente}
        transparent
        animationType="fade"
        onRequestClose={() => setImportPendente(null)}
      >
        <View style={styles.modalTurmaFundo}>
          <View style={styles.modalTurmaCard}>
            <Text style={styles.modalTurmaTitulo}>
              Já tem questão nesta tela
            </Text>

            <Text style={styles.importAviso}>
              {importPendente
                ? `Li ${importPendente.novas.length} ${
                    importPendente.novas.length === 1
                      ? "questão"
                      : "questões"
                  } de "${importPendente.nomeArquivo}". Aqui já ${
                    importPendente.jaEscritas.length === 1
                      ? "tem 1 questão escrita"
                      : `tem ${importPendente.jaEscritas.length} questões escritas`
                  }.`
                : ""}
            </Text>

            <TouchableOpacity
              style={styles.importBotao}
              activeOpacity={0.85}
              onPress={() =>
                aplicarImportacao(
                  importPendente.novas,
                  [],
                  importPendente.nomeArquivo,
                )
              }
            >
              <Ionicons name="swap-horizontal" size={18} color={COR.branco} />
              <Text style={styles.importBotaoTexto}>
                Trocar pelas importadas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.importBotaoClaro}
              activeOpacity={0.85}
              onPress={() =>
                aplicarImportacao(
                  importPendente.novas,
                  importPendente.jaEscritas,
                  importPendente.nomeArquivo,
                )
              }
            >
              <Ionicons name="add" size={18} color={COR.marcador} />
              <Text style={styles.importBotaoClaroTexto}>
                Somar às que já estão aqui
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalTurmaFechar}
              onPress={() => setImportPendente(null)}
            >
              <Text style={styles.modalTurmaFecharTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={confirmandoSaida}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmandoSaida(false)}
      >
        <View style={styles.modalTurmaFundo}>
          <View style={styles.modalTurmaCard}>
            <View style={styles.confirmaIcone}>
              <Ionicons name="trash-outline" size={21} color={COR.perigo} />
            </View>

            <Text style={styles.confirmaTitulo}>
              {emEdicao ? "Excluir esta atividade?" : "Descartar esta atividade?"}
            </Text>

            <Text style={styles.confirmaTexto}>
              {emEdicao
                ? "As questões, o gabarito e as folhas já corrigidas vão junto. Não dá para desfazer."
                : "O que está escrito aqui se perde, e o rascunho guardado também. Não dá para desfazer."}
            </Text>

            <View style={styles.confirmaBotoes}>
              <TouchableOpacity
                style={styles.confirmaCancelar}
                onPress={() => setConfirmandoSaida(false)}
              >
                <Text style={styles.confirmaCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmaApagar}
                onPress={confirmarSaida}
                disabled={apagando}
              >
                <Text style={styles.confirmaApagarTexto}>
                  {apagando
                    ? "Apagando..."
                    : emEdicao
                      ? "Excluir"
                      : "Descartar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

   </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#F8FAFC" },

  conteudo: { flex: 1 },
  conteudoInterno: { padding: 19, paddingBottom: 71, alignItems: "center" },
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
    gap: 9,
    marginBottom: 24,
  },
  tituloPagina: {
    fontFamily: FONTE.bold,
    fontSize: 21,
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
    padding: 19,
    marginBottom: 19,
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
    fontSize: 16.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  importarTexto: {
    fontFamily: FONTE.regular,
    fontSize: 15.5,
    color: "#475569",
    marginTop: 5,
    lineHeight: 21,
  },
  botaoImportar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 17,
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
    fontSize: 15.5,
    fontWeight: "500",
    color: "#2563EB",
  },
  importarDica: {
    fontFamily: FONTE.regular,
    fontSize: 13.5,
    color: "#94A3B8",
    marginTop: 9,
    lineHeight: 19,
  },
  resumoImport: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    width: "100%",
    backgroundColor: "#EFF6FF",
    borderRadius: RAIO.controle,
    padding: 14,
    marginBottom: 19,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  resumoImportTexto: {
    flex: 1,
    fontFamily: FONTE.regular,
    fontSize: 15,
    color: "#1E40AF",
    lineHeight: 21,
  },
  questaoCabecalhoEsquerda: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  selo: {
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: RAIO.etiqueta,
    backgroundColor: "#EFF6FF",
  },
  seloTexto: {
    fontFamily: FONTE.semi,
    fontSize: 13,
    fontWeight: "500",
    color: "#2563EB",
  },

  secaoCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 21,
    marginBottom: 19,
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
    gap: 12,
    marginBottom: 14,
  },
  secaoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 17.5,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.2,
  },

  questaoCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  numeroQuestao: {
    fontFamily: FONTE.bold,
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
    letterSpacing: 0.5,
  },

  rotulo: {
    fontFamily: FONTE.semi,
    fontSize: 15,
    fontWeight: "500",
    color: "#334155",
    marginTop: 17,
    marginBottom: 7,
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
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 3,
    borderLeftColor: "#DC2626",
    borderRadius: RAIO.controle,
    paddingVertical: 14,
    paddingHorizontal: 17,
    marginBottom: 19,
  },
  alertaIcone: { marginTop: 1 },
  alertaTextos: { flex: 1, gap: 2 },
  alertaTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 15.5,
    fontWeight: "600",
    color: "#991B1B",
  },
  alertaTexto: {
    fontFamily: FONTE.regular,
    fontSize: 15,
    color: "#7F1D1D",
    lineHeight: 20,
  },
  alertaAcao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
    alignSelf: "flex-start",
  },
  alertaAcaoTexto: {
    fontFamily: FONTE.semi,
    fontSize: 14,
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
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: FONTE.regular,
    fontSize: 16,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  campoTextoArea: { minHeight: 94, textAlignVertical: "top", lineHeight: 22.5 },
  campoPeso: { width: 118 },

  campoSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: RAIO.controle,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  campoSelectPlaceholder: { fontSize: 16, color: "#94A3B8" },
  campoSelectValor: { fontSize: 16, color: "#0F172A", fontWeight: "500" },

  imagemVazia: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: RAIO.controle,
    paddingVertical: 17,
    backgroundColor: "#F8FAFC",
  },
  imagemVaziaTexto: {
    fontFamily: FONTE.semi,
    fontSize: 15.5,
    fontWeight: "500",
    color: "#2563EB",
  },
  imagemBloco: { gap: 9 },
  imagemPrevia: {
    width: "100%",
    height: 212,
    borderRadius: RAIO.controle,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  imagemPreviaDesktop: { height: 220 },
  imagemAcoes: { flexDirection: "row", gap: 9 },
  imagemBotao: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: RAIO.controle,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },
  imagemBotaoTexto: {
    fontFamily: FONTE.semi,
    fontSize: 15,
    fontWeight: "500",
    color: "#2563EB",
  },

  avisoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: RAIO.controle,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 21,
  },
  avisoTextos: { flex: 1 },
  avisoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  avisoDescricao: {
    fontFamily: FONTE.regular,
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 19,
  },

  tiposGrade: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tipoPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RAIO.etiqueta,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  tipoPillAtivo: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  tipoPillTexto: {
    fontFamily: FONTE.semi,
    fontSize: 15,
    fontWeight: "500",
    color: "#475569",
  },
  tipoPillTextoAtivo: { color: "#FFFFFF" },

  alternativaLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 9,
  },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioAtivo: { borderColor: "#16A34A" },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#16A34A",
  },
  alternativaLetra: {
    fontFamily: FONTE.bold,
    fontSize: 15.5,
    fontWeight: "600",
    color: "#475569",
    width: 21,
    flexShrink: 0,
  },
  alternativaCampo: { flex: 1, minWidth: 0 },
  linkPequeno: {
    fontFamily: FONTE.semi,
    fontSize: 14,
    fontWeight: "500",
    color: "#2563EB",
    marginTop: 5,
  },

  dica: {
    fontFamily: FONTE.regular,
    fontSize: 13.5,
    color: "#64748B",
    marginTop: 7,
    lineHeight: 19,
  },
  dicaForte: {
    fontFamily: FONTE.semi,
    fontSize: 13.5,
    fontWeight: "600",
    color: "#334155",
    marginTop: 5,
  },

  itemLinha: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    marginBottom: 10,
  },
  itemLetra: {
    width: 24,
    paddingTop: 13,
    fontFamily: FONTE.bold,
    fontSize: 14,
    color: COR.tintaMedia,
  },
  itemCampos: { flex: 1, gap: 7, minWidth: 0 },
  itemResposta: {
    backgroundColor: "#F8FAFC",
    borderStyle: "dashed",
  },
  itemRemover: { paddingTop: 12 },
  itemAdicionar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  itemAdicionarTexto: {
    fontFamily: FONTE.semi,
    fontSize: 13.5,
    color: COR.marcador,
  },

  rascunhoBotao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: COR.campo,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    borderRadius: RAIO.controle,
    paddingVertical: 9,
    paddingHorizontal: 13,
    marginBottom: 14,
  },
  rascunhoBotaoTexto: {
    fontFamily: FONTE.semi,
    fontSize: 13,
    color: COR.tintaMedia,
  },
  rascunhoAviso: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: COR.tintaMedia,
    marginTop: 4,
    marginBottom: 12,
  },
  rascunhoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  rascunhoItemMeio: { flex: 1, minWidth: 0 },
  rascunhoItemTitulo: {
    fontFamily: FONTE.semi,
    fontSize: 14.5,
    color: COR.tintaForte,
  },
  rascunhoItemApoio: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    lineHeight: 17,
    color: COR.tintaFraca,
    marginTop: 2,
  },

  opcional: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaFraca,
  },

  botaoAdicionarQuestao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    width: "100%",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: RAIO.controle,
    paddingVertical: 14,
    marginBottom: 19,
    backgroundColor: "#FFFFFF",
  },
  botaoAdicionarQuestaoTexto: {
    color: "#2563EB",
    fontFamily: FONTE.bold,
    fontSize: 15.5,
    fontWeight: "600",
  },

  // ---------------------------------------------------------------------
  // A LINHA DE AÇÕES
  //
  // `flexWrap` nos dois. Sem ele a linha do computador não cabia em janela
  // estreita e, como ela alinha à direita, o excesso saía pela ESQUERDA: o
  // botão de descartar ficava metade escondido atrás do menu lateral. Com
  // wrap, o que não cabe desce para a linha de baixo e nada some.
  //
  // No celular a mesma linha vira: [lixeira] [salvar rascunho] e, embaixo,
  // os dois botões largos -- o de descartar não precisa de texto num lugar
  // onde cada botão de largura inteira custa uma rolada de tela.
  // ---------------------------------------------------------------------
  acoesFinais: { width: "100%", gap: 12 },
  acoesFinaisMobile: { flexDirection: "row", flexWrap: "wrap" },
  acoesFinaisDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 20,
  },
  // As bases em porcentagem é que decidem onde cada botão quebra de linha:
  //
  //   [lixeira] [salvar rascunho]        <- 54px + 60%, cabem juntos
  //   [baixar PDF] [imprimir]            <- 45% cada, cabem em par
  //   [publicar atividade]               <- linha inteira
  //
  // Sem isso os quatro tentavam caber na mesma linha e o rótulo de cada um
  // virava "S...", "S...", "I..." -- três botões que ninguém sabe o que são.
  botaoCurtoMobile: { flexGrow: 1, flexShrink: 1, flexBasis: "60%", minWidth: 0 },
  botaoMeioMobile: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "45%",
    minWidth: 0,
    paddingHorizontal: 12,
  },
  botaoLargoMobile: { width: "100%" },
  botaoProva: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: RAIO.controle,
    paddingVertical: 13,
    paddingHorizontal: 19,
    backgroundColor: "#FFFFFF",
  },
  botaoProvaDesktop: { paddingHorizontal: 18 },
  botaoProvaTexto: {
    fontFamily: FONTE.bold,
    fontSize: 15.5,
    fontWeight: "600",
    color: "#0F172A",
  },

  botaoExcluir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: COR.perigoFundo,
    borderRadius: RAIO.controle,
    paddingVertical: 13,
    paddingHorizontal: 18,
    backgroundColor: COR.branco,
  },
  botaoExcluirDesktop: { marginRight: "auto" },
  botaoExcluirMobile: { width: 54, paddingHorizontal: 0, flexShrink: 0 },
  botaoExcluirTexto: {
    fontFamily: FONTE.bold,
    fontSize: 14,
    color: COR.perigo,
  },

  confirmaIcone: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COR.perigoFundo,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  confirmaTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 16,
    color: COR.tintaForte,
    textAlign: "center",
  },
  confirmaTexto: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    lineHeight: 19,
    color: COR.tintaMedia,
    textAlign: "center",
    marginTop: 8,
  },
  confirmaBotoes: { flexDirection: "row", gap: 10, marginTop: 18 },
  confirmaCancelar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: RAIO.controle,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },
  confirmaCancelarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.tintaMedia,
  },
  confirmaApagar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: RAIO.controle,
    backgroundColor: COR.perigo,
  },
  confirmaApagarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.branco,
  },

  botaoPublicar: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 21,
    borderRadius: RAIO.controle,
    backgroundColor: "#0F172A",
  },
  botaoPublicarDesktop: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    paddingHorizontal: 28,
  },
  botaoPublicarTexto: { fontSize: 15.5, fontWeight: "600", color: "#FFFFFF" },

  importAviso: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    marginBottom: 14,
  },
  importBotao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COR.marcador,
    borderRadius: RAIO.controle,
    paddingVertical: 14,
  },
  importBotaoTexto: { fontSize: 14.5, fontWeight: "600", color: COR.branco },
  importBotaoClaro: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: RAIO.controle,
    paddingVertical: 14,
    marginTop: 9,
  },
  importBotaoClaroTexto: {
    fontSize: 14.5,
    fontWeight: "600",
    color: COR.marcador,
  },

  modalTurmaFundo: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  modalTurmaCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: RAIO.superficie,
    padding: 21,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalTurmaTitulo: {
    fontSize: 17.5,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 12,
  },
  modalTurmaItem: {
    paddingVertical: 12,
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTurmaItemTexto: { fontSize: 16, fontWeight: "500", color: "#0F172A" },

  // Sem turma nenhuma, escolher turma é um beco sem saída: a atividade não
  // pode ser salva e a tela não dizia para onde ir. Agora o caminho está aqui.
  semTurmaBox: { alignItems: "center", paddingVertical: 14, gap: 7 },
  semTurmaIcone: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COR.emAndamentoFundo,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  semTurmaTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 15,
    fontWeight: "700",
    color: COR.tintaForte,
    textAlign: "center",
  },
  semTurmaTexto: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaMedia,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 6,
  },
  semTurmaBotao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    width: "100%",
    backgroundColor: COR.marinho,
    borderRadius: RAIO.controle,
    paddingVertical: 14,
  },
  semTurmaBotaoTexto: {
    fontFamily: FONTE.bold,
    fontSize: 14,
    fontWeight: "700",
    color: COR.branco,
  },
  modalTurmaItemEscola: { fontSize: 13.5, color: "#94A3B8", marginTop: 2 },
  modalTurmaFechar: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 9,
  },
  modalTurmaFecharTexto: {
    fontSize: 15.5,
    fontWeight: "600",
    color: "#64748B",
  },
});