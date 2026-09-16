 import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE, RAIO } from "../../components/estilo";
import { buscarPerfil } from "../../constants/api";

function iniciaisProfessor(nome) {
  if (!nome) return "?";
  const partes = String(nome).trim().split(/\s+/);
  const primeira = partes[0]?.[0] || "";
  const segunda = partes[1]?.[0] || "";
  return (primeira + segunda).toUpperCase();
}

const CONTA_SEGURANCA = [
  {
    chave: "dados",
    titulo: "Dados pessoais",
    descricao: "Nome, email, telefone e endereço",
    icone: "person-outline",
  },
  {
    chave: "senha",
    titulo: "Alterar senha",
    descricao: "Atualize sua senha de acesso",
    icone: "lock-closed-outline",
  },
  {
    chave: "seguranca",
    titulo: "Segurança da conta",
    descricao: "Autenticação em duas etapas",
    icone: "shield-checkmark-outline",
  },
  {
    chave: "notificacoes",
    titulo: "Notificações",
    descricao: "Gerencie como deve ser avisado",
    icone: "notifications-outline",
  },
];

const PREFERENCIAS = [
  {
    chave: "correcao",
    titulo: "Preferências de correção",
    descricao: "Critérios, padrões e configurações",
    icone: "options-outline",
  },
  {
    chave: "aparencia",
    titulo: "Aparência",
    descricao: "Tema claro, escuro ou automático",
    icone: "contrast-outline",
  },
  {
    chave: "idioma",
    titulo: "Idioma",
    descricao: "Português (Brasil)",
    icone: "language-outline",
  },
];

function ItemLista({ item, ultimo }) {
  return (
    <TouchableOpacity
      style={[styles.itemLista, !ultimo && styles.itemListaBorda]}
      activeOpacity={0.7}
    >
      <View style={styles.itemIconeCirculo}>
        <Ionicons name={item.icone} size={17} color={COR.tintaMedia} />
      </View>
      <View style={styles.itemTextos}>
        <Text style={styles.itemTitulo}>{item.titulo}</Text>
        <Text style={styles.itemDescricao}>{item.descricao}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={COR.chevron} />
    </TouchableOpacity>
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

  // "Taxa média de correção" ainda é mockada — depende das tabelas
  // correcao/resposta, que são fase futura do projeto.
  const resumoConta = professor
    ? [
        { valor: String(professor.total_turmas), rotulo: "Turmas", icone: "people-outline", corFundo: COR.emAndamentoFundo, corIcone: COR.marcador },
        { valor: String(professor.total_atividades), rotulo: "Atividades", icone: "document-text-outline", corFundo: COR.okFundo, corIcone: COR.ok },
        { valor: String(professor.total_alunos), rotulo: "Alunos", icone: "school-outline", corFundo: COR.emAndamentoFundo, corIcone: COR.marcador },
        { valor: "—", rotulo: "Taxa média de correção", icone: "checkmark-circle-outline", corFundo: COR.avisoFundo, corIcone: COR.avisoTexto },
      ]
    : [];

  return (
    <View style={[styles.tela]}>
      {!ehDesktop && <CabecalhoMobile linkPerfil={false} />}

      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[
          styles.conteudoInterno,
          !ehDesktop && { paddingBottom: 100 },
          ehDesktop && styles.conteudoInternoDesktop,
        ]}
      >
        <View
          style={[
            ehDesktop ? styles.miolo : { width: "100%" },
            ehTelaLarga && { maxWidth: 900 },
          ]}
        >
          {ehDesktop && (
            <View style={styles.cabecalhoDesktopLinha}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.voltarLinha}
              >
                <Ionicons name="arrow-back" size={18} color={COR.tintaForte} />
                <Text style={styles.tituloPaginaDesktop}>Perfil</Text>
              </TouchableOpacity>
            </View>
          )}

          {erro ? <Text style={{ color: "red", marginBottom: 12 }}>{erro}</Text> : null}
          {carregando ? (
            <Text style={{ color: COR.tintaFraca, marginBottom: 12 }}>Carregando...</Text>
          ) : null}

          {professor && (
            <>
              <View style={[styles.perfilCard, ehDesktop && styles.perfilCardDesktop]}>
                <View style={styles.avatarGrande}>
                  <Text style={styles.avatarGrandeTexto}>{iniciaisProfessor(professor.nome)}</Text>
                  <View style={styles.avatarSelo}>
                    <MaterialCommunityIcons name="camera" size={12} color={COR.branco} />
                  </View>
                </View>

                <View style={styles.perfilTextos}>
                  <Text style={styles.perfilNome}>{professor.nome}</Text>
                  <Text style={styles.perfilCargo}>Professor(a)</Text>

                  <View style={styles.perfilContatoLinha}>
                    <Ionicons name="mail-outline" size={13} color={COR.tintaFraca} />
                    <Text style={styles.perfilContatoTexto}>{professor.email}</Text>
                  </View>
                  {/* Telefone e endereço ainda não existem no banco — sem campo pra mostrar aqui por enquanto. */}
                </View>

                <Ionicons name="chevron-forward" size={18} color={COR.chevron} style={styles.perfilSeta} />

                <TouchableOpacity style={styles.mascoteFlutuante} activeOpacity={0.85}>
                  <Ionicons name="help" size={16} color={COR.branco} />
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
            {CONTA_SEGURANCA.map((item, indice) => (
              <ItemLista
                key={item.chave}
                item={item}
                ultimo={indice === CONTA_SEGURANCA.length - 1}
              />
            ))}
          </View>

          <Text style={styles.secaoTitulo}>Preferências</Text>
          <View style={styles.listaCard}>
            {PREFERENCIAS.map((item, indice) => (
              <ItemLista
                key={item.chave}
                item={item}
                ultimo={indice === PREFERENCIAS.length - 1}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.botaoSair}
            activeOpacity={0.8}
            onPress={sair}
          >
            <Text style={styles.botaoSairTexto}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  tituloPaginaDesktop: {
    fontFamily: FONTE.bold,
    fontSize: 20,
    fontWeight: "700",
    color: COR.tintaForte,
  },

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
  },
  perfilCardDesktop: { padding: 22 },
  avatarGrande: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COR.marinho,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarGrandeTexto: {
    color: COR.branco,
    fontFamily: FONTE.bold,
    fontSize: 18,
  },
  perfilTextos: { flex: 1, minWidth: 0 },
  perfilNome: {
    fontFamily: FONTE.bold,
    fontSize: 15.5,
    fontWeight: "700",
    color: COR.tintaForte,
  },
  perfilCargo: {
    fontFamily: FONTE.semi,
    fontSize: 12,
    color: COR.marcador,
    fontWeight: "600",
    marginBottom: 8,
  },
  perfilContatoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  perfilContatoTexto: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaMedia,
  },
  perfilSeta: { flexShrink: 0 },

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
  resumoValor: {
    fontFamily: FONTE.bold,
    fontSize: 16,
    fontWeight: "700",
    color: COR.tintaForte,
  },
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
  itemLista: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  itemListaBorda: { borderBottomWidth: 1, borderBottomColor: COR.fundo },
  itemIconeCirculo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COR.fundo,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemTextos: { flex: 1, minWidth: 0 },
  itemTitulo: {
    fontFamily: FONTE.semi,
    fontSize: 13,
    fontWeight: "600",
    color: COR.tintaForte,
  },
  itemDescricao: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
    marginTop: 2,
  },

  botaoSair: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    paddingVertical: 14,
    alignItems: "center",
  },
  botaoSairTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    fontWeight: "700",
    color: COR.marcador,
  },
});
