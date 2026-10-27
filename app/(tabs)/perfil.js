import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE, RAIO } from "../../components/estilo";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  buscarPerfil,
  atualizarPerfil,
  alterarSenha,
  atualizarNotificacoes,
  atualizarFoto,
  atualizarPreferencias,
  atualizarSeguranca,
} from "../../constants/api";

const TIPOS_PREF = [
  { valor: "multipla_escolha", rotulo: "Alternativa" },
  { valor: "dissertativa", rotulo: "Dissertativa" },
  { valor: "calculo", rotulo: "Cálculo" },
];

function iniciaisProfessor(nome) {
  if (!nome) return "?";
  const partes = String(nome).trim().split(/\s+/);
  const primeira = partes[0]?.[0] || "";
  const segunda = partes[1]?.[0] || "";
  return (primeira + segunda).toUpperCase();
}

function comoNumero(texto) {
  const n = parseFloat(String(texto).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function Avatar({ nome, foto, tamanho = 56 }) {
  const raio = tamanho / 2;
  if (foto) {
    return (
      <Image
        source={{ uri: foto }}
        style={{ width: tamanho, height: tamanho, borderRadius: raio }}
      />
    );
  }
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: raio,
        backgroundColor: COR.marinho,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: COR.branco,
          fontFamily: FONTE.bold,
          fontSize: tamanho * 0.32,
          fontWeight: "700",
        }}
      >
        {iniciaisProfessor(nome)}
      </Text>
    </View>
  );
}

function ItemLista({ item, ultimo }) {
  const clicavel = !!item.onPress;
  const emBreve = !clicavel && !item.somenteLeitura;

  return (
    <TouchableOpacity
      style={[styles.itemLista, !ultimo && styles.itemListaBorda]}
      activeOpacity={0.7}
      onPress={item.onPress}
      disabled={!clicavel}
    >
      <View style={styles.itemIconeCirculo}>
        <Ionicons name={item.icone} size={17} color={COR.tintaMedia} />
      </View>
      <View style={styles.itemTextos}>
        <Text style={styles.itemTitulo}>{item.titulo}</Text>
        <Text style={styles.itemDescricao}>{item.descricao}</Text>
      </View>
      {clicavel ? (
        <Ionicons name="chevron-forward" size={17} color={COR.chevron} />
      ) : emBreve ? (
        <View style={styles.emBreveTag}>
          <Text style={styles.emBreveTexto}>Em breve</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function ModalBase({ visivel, titulo, onFechar, children }) {
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.modalFundo}>
        <View style={styles.modalCard}>
          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>{titulo}</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={8}>
              <Ionicons name="close" size={22} color={COR.tintaMedia} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export default function Perfil() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const ehTelaLarga = width >= 1300;
  const router = useRouter();

  const [professor, setProfessor] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const [modal, setModal] = useState(null);
  const [erroModal, setErroModal] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [formDados, setFormDados] = useState({ nome: "", email: "", telefone: "", endereco: "" });
  const [formSenha, setFormSenha] = useState({ atual: "", nova: "", confirmar: "" });
  const [formPref, setFormPref] = useState({ peso: "1", tipo: "multipla_escolha", nota: "6" });

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        setCarregando(true);
        setErro("");
        try {
          const dados = await buscarPerfil();
          setProfessor(dados);
        } catch (e) {
          setErro(e.message);
        } finally {
          setCarregando(false);
        }
      }
      carregar();
    }, [])
  );

  async function sair() {
    await AsyncStorage.removeItem("token");
    router.replace("/login");
  }

  function fecharModal() {
    setModal(null);
    setErroModal("");
  }

  function abrirDados() {
    setFormDados({
      nome: professor?.nome || "",
      email: professor?.email || "",
      telefone: professor?.telefone || "",
      endereco: professor?.endereco || "",
    });
    setErroModal("");
    setAviso("");
    setModal("dados");
  }

  function abrirSenha() {
    setFormSenha({ atual: "", nova: "", confirmar: "" });
    setErroModal("");
    setAviso("");
    setModal("senha");
  }

  function abrirNotificacoes() {
    setErroModal("");
    setAviso("");
    setModal("notificacoes");
  }

  function abrirSeguranca() {
    setErroModal("");
    setAviso("");
    setModal("seguranca");
  }

  async function alternarSeguranca(valor) {
    setErroModal("");
    const anterior = professor.login_2fa;
    setProfessor((atual) => ({ ...atual, login_2fa: valor }));
    try {
      await atualizarSeguranca(valor);
    } catch (e) {
      setProfessor((atual) => ({ ...atual, login_2fa: anterior }));
      setErroModal(e.message);
    }
  }

  function abrirFoto() {
    setErroModal("");
    setAviso("");
    setModal("foto");
  }

  function abrirPreferencias() {
    setFormPref({
      peso: String(professor?.pref_peso_padrao ?? 1).replace(".", ","),
      tipo: professor?.pref_tipo_padrao || "multipla_escolha",
      nota: String(professor?.pref_nota_minima ?? 6).replace(".", ","),
    });
    setErroModal("");
    setAviso("");
    setModal("preferencias");
  }

  async function salvarDados() {
    if (!formDados.nome.trim() || !formDados.email.trim()) {
      setErroModal("Nome e e-mail são obrigatórios.");
      return;
    }
    setSalvando(true);
    setErroModal("");
    try {
      const atualizado = await atualizarPerfil(
        formDados.nome.trim(),
        formDados.email.trim(),
        formDados.telefone.trim(),
        formDados.endereco.trim()
      );
      setProfessor((atual) => ({ ...atual, ...atualizado }));
      setModal(null);
      setAviso("Dados atualizados com sucesso.");
    } catch (e) {
      setErroModal(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarSenha() {
    if (!formSenha.atual || !formSenha.nova || !formSenha.confirmar) {
      setErroModal("Preencha todos os campos.");
      return;
    }
    if (formSenha.nova.length < 6) {
      setErroModal("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (formSenha.nova !== formSenha.confirmar) {
      setErroModal("A confirmação não é igual à nova senha.");
      return;
    }
    setSalvando(true);
    setErroModal("");
    try {
      await alterarSenha(formSenha.atual, formSenha.nova);
      setModal(null);
      setAviso("Senha alterada com sucesso.");
    } catch (e) {
      setErroModal(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function alternarNotificacao(valor) {
    setErroModal("");
    const anterior = professor.notif_correcao;
    setProfessor((atual) => ({ ...atual, notif_correcao: valor }));
    try {
      await atualizarNotificacoes(valor);
    } catch (e) {
      setProfessor((atual) => ({ ...atual, notif_correcao: anterior }));
      setErroModal(e.message);
    }
  }

  async function escolherFoto() {
    setErroModal("");
    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) {
        setErroModal("Permita o acesso às fotos para escolher uma imagem.");
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (resultado.canceled) return;

      setSalvando(true);

      const imagem = await ImageManipulator.manipulateAsync(
        resultado.assets[0].uri,
        [{ resize: { width: 400 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const atualizado = await atualizarFoto(`data:image/jpeg;base64,${imagem.base64}`);
      setProfessor((atual) => ({ ...atual, foto: atualizado.foto }));
      setModal(null);
      setAviso("Foto atualizada com sucesso.");
    } catch (e) {
      setErroModal(e.message || "Não foi possível enviar a foto.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerFoto() {
    setSalvando(true);
    setErroModal("");
    try {
      await atualizarFoto(null);
      setProfessor((atual) => ({ ...atual, foto: null }));
      setModal(null);
      setAviso("Foto removida.");
    } catch (e) {
      setErroModal(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarPreferencias() {
    const peso = comoNumero(formPref.peso);
    const nota = comoNumero(formPref.nota);

    if (!(peso > 0 && peso <= 10)) {
      setErroModal("O peso padrão deve ser maior que 0 e no máximo 10.");
      return;
    }
    if (!(nota >= 0 && nota <= 10)) {
      setErroModal("A nota mínima deve estar entre 0 e 10.");
      return;
    }

    setSalvando(true);
    setErroModal("");
    try {
      const atualizado = await atualizarPreferencias(peso, formPref.tipo, nota);
      setProfessor((atual) => ({ ...atual, ...atualizado }));
      setModal(null);
      setAviso("Preferências salvas.");
    } catch (e) {
      setErroModal(e.message);
    } finally {
      setSalvando(false);
    }
  }

  const resumoConta = professor
    ? [
        { valor: String(professor.total_turmas), rotulo: "Turmas", icone: "people-outline", corFundo: COR.emAndamentoFundo, corIcone: COR.marcador },
        { valor: String(professor.total_atividades), rotulo: "Atividades", icone: "document-text-outline", corFundo: COR.okFundo, corIcone: COR.ok },
        { valor: String(professor.total_alunos), rotulo: "Alunos", icone: "school-outline", corFundo: COR.emAndamentoFundo, corIcone: COR.marcador },
        {
          valor: professor.taxa_correcao === null || professor.taxa_correcao === undefined ? "—" : `${professor.taxa_correcao}%`,
          rotulo: "Taxa média de correção",
          icone: "checkmark-circle-outline",
          corFundo: COR.avisoFundo,
          corIcone: COR.avisoTexto,
        },
      ]
    : [];

  const contaSeguranca = [
    {
      chave: "dados",
      titulo: "Dados pessoais",
      descricao: "Nome, e-mail, telefone e endereço",
      icone: "person-outline",
      onPress: abrirDados,
    },
    {
      chave: "senha",
      titulo: "Alterar senha",
      descricao: "Atualize sua senha de acesso",
      icone: "lock-closed-outline",
      onPress: abrirSenha,
    },
    {
      chave: "seguranca",
      titulo: "Segurança da conta",
      descricao: professor?.login_2fa
        ? "Código por e-mail ao entrar: ativado"
        : "Código por e-mail ao entrar: desativado",
      icone: "shield-checkmark-outline",
      onPress: abrirSeguranca,
    },
    {
      chave: "notificacoes",
      titulo: "Notificações",
      descricao: "Gerencie como deve ser avisado",
      icone: "notifications-outline",
      onPress: abrirNotificacoes,
    },
  ];

  const preferencias = [
    {
      chave: "correcao",
      titulo: "Preferências de correção",
      descricao: "Peso, tipo de questão e nota mínima",
      icone: "options-outline",
      onPress: abrirPreferencias,
    },
  ];

  return (
    <View style={[styles.tela]}>
      {!ehDesktop && <CabecalhoMobile comSino linkPerfil={false} />}

      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[
          styles.conteudoInterno,
          !ehDesktop && { paddingBottom: 100 },
          ehDesktop && styles.conteudoInternoDesktop,
        ]}
      >
        <View
          style={[ehDesktop ? styles.miolo : { width: "100%" }, ehTelaLarga && { maxWidth: 900 }]}
        >
          {ehDesktop && (
            <View style={styles.cabecalhoDesktopLinha}>
              <TouchableOpacity onPress={() => router.back()} style={styles.voltarLinha}>
                <Ionicons name="arrow-back" size={18} color={COR.tintaForte} />
                <Text style={styles.tituloPaginaDesktop}>Perfil</Text>
              </TouchableOpacity>
            </View>
          )}

          {erro ? <Text style={styles.textoErro}>{erro}</Text> : null}
          {aviso ? <Text style={styles.textoSucesso}>{aviso}</Text> : null}
          {carregando && !professor ? (
            <Text style={{ color: COR.tintaFraca, marginBottom: 12 }}>Carregando...</Text>
          ) : null}

          {professor && (
            <>
              <View style={[styles.perfilCard, ehDesktop && styles.perfilCardDesktop]}>
                <TouchableOpacity
                  style={[styles.avatarGrande, ehDesktop && styles.avatarGrandeDesktop]}
                  onPress={abrirFoto}
                  activeOpacity={0.8}
                >
                  <Avatar
                    nome={professor.nome}
                    foto={professor.foto}
                    tamanho={ehDesktop ? 76 : 72}
                  />
                  <View style={styles.avatarSelo}>
                    <MaterialCommunityIcons name="camera" size={12} color={COR.branco} />
                  </View>
                </TouchableOpacity>

                <View style={styles.perfilTextos}>
                  <Text style={styles.perfilNome}>{professor.nome}</Text>
                  <Text style={styles.perfilCargo}>Professor(a)</Text>

                  <View style={styles.perfilContatoLinha}>
                    <Ionicons name="mail-outline" size={13} color={COR.tintaFraca} />
                    <Text style={styles.perfilContatoTexto}>{professor.email}</Text>
                  </View>
                  {professor.telefone ? (
                    <View style={styles.perfilContatoLinha}>
                      <Ionicons name="call-outline" size={13} color={COR.tintaFraca} />
                      <Text style={styles.perfilContatoTexto}>{professor.telefone}</Text>
                    </View>
                  ) : null}
                  {professor.endereco ? (
                    <View style={styles.perfilContatoLinha}>
                      <Ionicons name="location-outline" size={13} color={COR.tintaFraca} />
                      <Text style={styles.perfilContatoTexto}>{professor.endereco}</Text>
                    </View>
                  ) : null}
                </View>

                <TouchableOpacity onPress={abrirDados} hitSlop={8}>
                  <Ionicons name="create-outline" size={18} color={COR.chevron} />
                </TouchableOpacity>
              </View>

              <Text style={styles.secaoTitulo}>Resumo da conta</Text>
              <View
                style={[
                  styles.resumoCard,
                  ehDesktop ? styles.resumoCardDesktop : styles.resumoCardMobile,
                ]}
              >
                {resumoConta.map((item) => (
                  <View key={item.rotulo} style={styles.resumoItem}>
                    <View style={[styles.resumoIconeCirculo, { backgroundColor: item.corFundo }]}>
                      <Ionicons name={item.icone} size={17} color={item.corIcone} />
                    </View>
                    <Text style={styles.resumoValor}>{item.valor}</Text>
                    <Text style={styles.resumoRotulo}>{item.rotulo}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={styles.secaoTitulo}>Conta e segurança</Text>
          <View style={styles.listaCard}>
            {contaSeguranca.map((item, indice) => (
              <ItemLista
                key={item.chave}
                item={item}
                ultimo={indice === contaSeguranca.length - 1}
              />
            ))}
          </View>

          <Text style={styles.secaoTitulo}>Preferências</Text>
          <View style={styles.listaCard}>
            {preferencias.map((item, indice) => (
              <ItemLista
                key={item.chave}
                item={item}
                ultimo={indice === preferencias.length - 1}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.botaoSair} activeOpacity={0.8} onPress={sair}>
            <Text style={styles.botaoSairTexto}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ModalBase visivel={modal === "dados"} titulo="Dados pessoais" onFechar={fecharModal}>
        <Text style={styles.rotulo}>
          Nome <Text style={styles.obrigatorio}>*</Text>
        </Text>
        <TextInput
          value={formDados.nome}
          onChangeText={(v) => setFormDados((a) => ({ ...a, nome: v }))}
          placeholderTextColor={COR.tintaFraca}
          style={styles.campoTexto}
        />

        <Text style={styles.rotulo}>
          E-mail <Text style={styles.obrigatorio}>*</Text>
        </Text>
        <TextInput
          value={formDados.email}
          onChangeText={(v) => setFormDados((a) => ({ ...a, email: v }))}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={COR.tintaFraca}
          style={styles.campoTexto}
        />

        <Text style={styles.rotulo}>Telefone</Text>
        <TextInput
          value={formDados.telefone}
          onChangeText={(v) => setFormDados((a) => ({ ...a, telefone: v }))}
          placeholder="(11) 90000-0000"
          keyboardType="phone-pad"
          placeholderTextColor={COR.tintaFraca}
          style={styles.campoTexto}
        />

        <Text style={styles.rotulo}>Endereço</Text>
        <TextInput
          value={formDados.endereco}
          onChangeText={(v) => setFormDados((a) => ({ ...a, endereco: v }))}
          placeholder="Cidade, estado"
          placeholderTextColor={COR.tintaFraca}
          style={styles.campoTexto}
        />

        {erroModal ? <Text style={styles.textoErro}>{erroModal}</Text> : null}

        <View style={styles.modalAcoes}>
          <TouchableOpacity style={styles.botaoCancelar} onPress={fecharModal}>
            <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoSalvar} onPress={salvarDados} disabled={salvando}>
            <Text style={styles.botaoSalvarTexto}>{salvando ? "Salvando..." : "Salvar"}</Text>
          </TouchableOpacity>
        </View>
      </ModalBase>

      <ModalBase visivel={modal === "senha"} titulo="Alterar senha" onFechar={fecharModal}>
        <Text style={styles.rotulo}>Senha atual</Text>
        <TextInput
          value={formSenha.atual}
          onChangeText={(v) => setFormSenha((a) => ({ ...a, atual: v }))}
          secureTextEntry
          placeholderTextColor={COR.tintaFraca}
          style={styles.campoTexto}
        />

        <Text style={styles.rotulo}>Nova senha</Text>
        <TextInput
          value={formSenha.nova}
          onChangeText={(v) => setFormSenha((a) => ({ ...a, nova: v }))}
          secureTextEntry
          placeholder="Mínimo de 6 caracteres"
          placeholderTextColor={COR.tintaFraca}
          style={styles.campoTexto}
        />

        <Text style={styles.rotulo}>Confirmar nova senha</Text>
        <TextInput
          value={formSenha.confirmar}
          onChangeText={(v) => setFormSenha((a) => ({ ...a, confirmar: v }))}
          secureTextEntry
          placeholderTextColor={COR.tintaFraca}
          style={styles.campoTexto}
        />

        {erroModal ? <Text style={styles.textoErro}>{erroModal}</Text> : null}

        <View style={styles.modalAcoes}>
          <TouchableOpacity style={styles.botaoCancelar} onPress={fecharModal}>
            <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoSalvar} onPress={salvarSenha} disabled={salvando}>
            <Text style={styles.botaoSalvarTexto}>{salvando ? "Salvando..." : "Alterar senha"}</Text>
          </TouchableOpacity>
        </View>
      </ModalBase>

      <ModalBase visivel={modal === "notificacoes"} titulo="Notificações" onFechar={fecharModal}>
        <View style={styles.switchLinha}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitulo}>Avisar quando uma correção terminar</Text>
            <Text style={styles.itemDescricao}>
              Sua preferência fica salva na conta.
            </Text>
          </View>
          <Switch
            value={!!professor?.notif_correcao}
            onValueChange={alternarNotificacao}
          />
        </View>

        {erroModal ? <Text style={styles.textoErro}>{erroModal}</Text> : null}

        <View style={styles.modalAcoes}>
          <TouchableOpacity style={styles.botaoSalvar} onPress={fecharModal}>
            <Text style={styles.botaoSalvarTexto}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </ModalBase>

      <ModalBase visivel={modal === "seguranca"} titulo="Segurança da conta" onFechar={fecharModal}>
        <View style={styles.switchLinha}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitulo}>Pedir código por e-mail ao entrar</Text>
            <Text style={styles.itemDescricao}>
              A cada login, enviamos um código de 6 dígitos para {professor?.email}.
            </Text>
          </View>
          <Switch
            value={!!professor?.login_2fa}
            onValueChange={alternarSeguranca}
          />
        </View>

        {erroModal ? <Text style={styles.textoErro}>{erroModal}</Text> : null}

        <View style={styles.modalAcoes}>
          <TouchableOpacity style={styles.botaoSalvar} onPress={fecharModal}>
            <Text style={styles.botaoSalvarTexto}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </ModalBase>

      <ModalBase visivel={modal === "foto"} titulo="Foto de perfil" onFechar={fecharModal}>
        <View style={styles.fotoPreviaLinha}>
          <Avatar nome={professor?.nome} foto={professor?.foto} tamanho={96} />
        </View>
        <Text style={styles.dica}>
          A imagem é reduzida automaticamente antes de ser enviada.
        </Text>

        {erroModal ? <Text style={styles.textoErro}>{erroModal}</Text> : null}

        <View style={styles.modalAcoes}>
          {professor?.foto ? (
            <TouchableOpacity style={styles.botaoCancelar} onPress={removerFoto} disabled={salvando}>
              <Text style={styles.botaoCancelarTexto}>Remover foto</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.botaoSalvar} onPress={escolherFoto} disabled={salvando}>
            <Text style={styles.botaoSalvarTexto}>{salvando ? "Enviando..." : "Escolher imagem"}</Text>
          </TouchableOpacity>
        </View>
      </ModalBase>

      <ModalBase visivel={modal === "preferencias"} titulo="Preferências de correção" onFechar={fecharModal}>
        <Text style={styles.rotulo}>Peso padrão das questões</Text>
        <TextInput
          value={formPref.peso}
          onChangeText={(v) => setFormPref((a) => ({ ...a, peso: v }))}
          keyboardType="decimal-pad"
          placeholder="1,0"
          placeholderTextColor={COR.tintaFraca}
          style={[styles.campoTexto, styles.campoCurto]}
        />

        <Text style={styles.rotulo}>Tipo de questão padrão</Text>
        <View style={styles.pillsLinha}>
          {TIPOS_PREF.map((tipo) => {
            const ativo = formPref.tipo === tipo.valor;
            return (
              <TouchableOpacity
                key={tipo.valor}
                onPress={() => setFormPref((a) => ({ ...a, tipo: tipo.valor }))}
                style={[styles.tipoPill, ativo && styles.tipoPillAtivo]}
              >
                <Text style={[styles.tipoPillTexto, ativo && styles.tipoPillTextoAtivo]}>
                  {tipo.rotulo}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.dica}>
          O peso e o tipo já vêm preenchidos ao criar uma nova questão.
        </Text>

        <Text style={styles.rotulo}>Nota mínima para aprovação</Text>
        <TextInput
          value={formPref.nota}
          onChangeText={(v) => setFormPref((a) => ({ ...a, nota: v }))}
          keyboardType="decimal-pad"
          placeholder="6,0"
          placeholderTextColor={COR.tintaFraca}
          style={[styles.campoTexto, styles.campoCurto]}
        />

        {erroModal ? <Text style={styles.textoErro}>{erroModal}</Text> : null}

        <View style={styles.modalAcoes}>
          <TouchableOpacity style={styles.botaoCancelar} onPress={fecharModal}>
            <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoSalvar} onPress={salvarPreferencias} disabled={salvando}>
            <Text style={styles.botaoSalvarTexto}>{salvando ? "Salvando..." : "Salvar"}</Text>
          </TouchableOpacity>
        </View>
      </ModalBase>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: COR.fundo },

  conteudo: { flex: 1 },
  conteudoInterno: { padding: 20, paddingBottom: 40, alignItems: "center" },
  conteudoInternoDesktop: { alignItems: "center" },
  miolo: { width: "92%", maxWidth: 900 },

  cabecalhoDesktopLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    minHeight: 56,
    marginBottom: 22,
  },
  voltarLinha: { flexDirection: "row", alignItems: "center", gap: 10 },
  tituloPaginaDesktop: { fontFamily: FONTE.bold, fontSize: 20, fontWeight: "700", color: COR.tintaForte },

  textoErro: { color: "#EF4444", fontSize: 12.5, marginTop: 12, marginBottom: 4 },
  textoSucesso: { color: COR.ok, fontSize: 12.5, fontWeight: "600", marginBottom: 12, width: "100%" },

  perfilCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 16,
    marginBottom: 20,
    position: "relative",
  },
  perfilCardDesktop: { padding: 22 },
  avatarGrande: {
    width: 72,
    height: 72,
    flexShrink: 0,
    position: "relative",
  },
  avatarGrandeDesktop: { width: 76, height: 76 },
  avatarSelo: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COR.marinho,
    borderWidth: 2,
    borderColor: COR.branco,
    alignItems: "center",
    justifyContent: "center",
  },
  perfilTextos: { flex: 1, minWidth: 0 },
  perfilNome: { fontFamily: FONTE.bold, fontSize: 15.5, fontWeight: "700", color: COR.tintaForte },
  perfilCargo: { fontFamily: FONTE.semi, fontSize: 12, color: COR.marcador, fontWeight: "600", marginBottom: 8 },
  perfilContatoLinha: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  perfilContatoTexto: { fontFamily: FONTE.regular, fontSize: 11.5, color: COR.tintaMedia },

  secaoTitulo: {
    width: "100%",
    fontFamily: FONTE.bold,
    fontSize: 14,
    fontWeight: "700",
    color: COR.tintaForte,
    marginBottom: 10,
  },

  resumoCard: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 16,
    marginBottom: 20,
  },
  resumoCardMobile: { flexDirection: "row", flexWrap: "wrap", rowGap: 16 },
  resumoCardDesktop: { flexDirection: "row" },
  resumoItem: { width: "25%", alignItems: "center" },
  resumoIconeCirculo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  resumoValor: { fontFamily: FONTE.bold, fontSize: 16, fontWeight: "700", color: COR.tintaForte },
  resumoRotulo: {
    fontFamily: FONTE.regular,
    fontSize: 10,
    color: COR.tintaFraca,
    marginTop: 2,
    textAlign: "center",
    paddingHorizontal: 2,
  },

  listaCard: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  itemLista: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  itemListaBorda: { borderBottomWidth: 1, borderBottomColor: COR.fundo },
  itemIconeCirculo: {
    width: 36,
    height: 36,
    borderRadius: RAIO.controle,
    backgroundColor: COR.fundo,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemTextos: { flex: 1, minWidth: 0 },
  itemTitulo: { fontFamily: FONTE.semi, fontSize: 13, fontWeight: "600", color: COR.tintaForte },
  itemDescricao: { fontFamily: FONTE.regular, fontSize: 11, color: COR.tintaFraca, marginTop: 2 },

  emBreveTag: {
    backgroundColor: COR.avisoFundo,
    borderRadius: RAIO.etiqueta,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  emBreveTexto: { fontFamily: FONTE.semi, fontSize: 10.5, fontWeight: "600", color: COR.avisoTexto },

  botaoSair: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    paddingVertical: 14,
    alignItems: "center",
  },
  botaoSairTexto: { fontFamily: FONTE.bold, fontSize: 13.5, fontWeight: "700", color: COR.marcador },

  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    padding: 20,
  },
  modalCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modalTitulo: { fontFamily: FONTE.bold, fontSize: 16, fontWeight: "700", color: COR.tintaForte },

  rotulo: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "600",
    color: COR.tintaMedia,
    marginTop: 14,
    marginBottom: 6,
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
  campoCurto: { width: 120 },

  dica: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaFraca,
    marginTop: 8,
    lineHeight: 16,
  },

  fotoPreviaLinha: { alignItems: "center", marginTop: 18 },

  pillsLinha: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tipoPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RAIO.controle,
    borderWidth: 1,
    borderColor: COR.linha,
    backgroundColor: COR.branco,
  },
  tipoPillAtivo: { backgroundColor: COR.marinho, borderColor: COR.marinho },
  tipoPillTexto: { fontFamily: FONTE.semi, fontSize: 12.5, fontWeight: "600", color: COR.tintaMedia },
  tipoPillTextoAtivo: { color: COR.branco },

  switchLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 16,
  },

  modalAcoes: { flexDirection: "row", gap: 10, marginTop: 22 },
  botaoCancelar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: RAIO.controle,
    borderWidth: 1,
    borderColor: COR.linha,
  },
  botaoCancelarTexto: { fontFamily: FONTE.bold, fontSize: 13.5, fontWeight: "700", color: COR.tintaMedia },
  botaoSalvar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: RAIO.controle,
    backgroundColor: COR.marinho,
  },
  botaoSalvarTexto: { fontFamily: FONTE.bold, fontSize: 13.5, fontWeight: "700", color: COR.branco },
});