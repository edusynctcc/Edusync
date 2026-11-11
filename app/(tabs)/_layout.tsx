import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AvisoCorrecao from "../../components/AvisoCorrecao";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { COR, FONTE, RAIO } from "../../components/estilo";
import { listarAtividades, listarTurmas } from "../../constants/api";
import { semAcento } from "../../constants/disciplinas";

export const LARGURA_LATERAL = 272;

const TRANSICAO_WEB: any =
  Platform.OS === "web"
    ? { transitionProperty: "background-color", transitionDuration: "150ms" }
    : null;

const SEM_CONTORNO_WEB: any =
  Platform.OS === "web" ? { outlineStyle: "none" } : null;

const ITENS_LATERAL = [
  { rota: "/home", rotulo: "Home", icone: "home-outline", iconeAtivo: "home" },
  {
    rota: "/turmas",
    rotulo: "Turmas",
    icone: "people-outline",
    iconeAtivo: "people",
  },
  {
    rota: "/atividades",
    rotulo: "Atividades",
    icone: "document-text-outline",
    iconeAtivo: "document-text",
  },
  {
    rota: "/scanner",
    rotulo: "Scanner",
    icone: "scan-outline",
    iconeAtivo: "scan",
  },
  {
    rota: "/correcoes",
    rotulo: "Correções",
    icone: "checkmark-done-outline",
    iconeAtivo: "checkmark-done",
  },
  {
    rota: "/perfil",
    rotulo: "Perfil",
    icone: "person-outline",
    iconeAtivo: "person",
  },
];

// O índice da busca vem do banco, não de uma lista escrita à mão: antes isto
// era um array fixo com "9º Ano A" e "Prova de Álgebra", então a busca da
// lateral mostrava turmas e atividades que não existiam e clicar nelas levava
// para uma lista vazia.
type ItemBusca = {
  tipo: "turma" | "atividade";
  id: number;
  titulo: string;
  subtitulo: string;
};

const MAX_RESULTADOS = 8;

function LateralDesktop() {
  const router = useRouter();
  const caminho = usePathname();
  const [buscaTexto, setBuscaTexto] = useState("");
  const [indice, setIndice] = useState<ItemBusca[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregarIndice = useCallback(async () => {
    const [turmas, atividades] = await Promise.all([
      listarTurmas().catch(() => []),
      listarAtividades().catch(() => []),
    ]);

    const nomeDaTurma = new Map<number, string>(
      (turmas || []).map((t: any) => [t.id_turma, t.nome]),
    );

    setIndice([
      ...(turmas || []).map((t: any) => ({
        tipo: "turma" as const,
        id: t.id_turma,
        titulo: t.nome,
        subtitulo: t.escola || `${t.alunos ?? 0} alunos`,
      })),
      ...(atividades || []).map((a: any) => ({
        tipo: "atividade" as const,
        id: a.id_atividade,
        titulo: a.nome,
        subtitulo:
          a.disciplina || nomeDaTurma.get(a.id_turma) || "Atividade",
      })),
    ]);

    setCarregando(false);
  }, []);

  // Recarrega a cada troca de tela: assim uma turma criada agora já aparece
  // na busca sem precisar recarregar a página.
  useEffect(() => {
    carregarIndice();
  }, [carregarIndice, caminho]);

  const procurado = semAcento(buscaTexto);

  const resultados =
    procurado.length === 0
      ? []
      : indice
          .filter(
            (item) =>
              semAcento(item.titulo).includes(procurado) ||
              semAcento(item.subtitulo).includes(procurado),
          )
          .slice(0, MAX_RESULTADOS);

  const semResultado = procurado.length > 0 && resultados.length === 0;

  function abrirResultado(item: ItemBusca) {
    setBuscaTexto("");
    router.push({
      pathname: item.tipo === "turma" ? "/turma" : "/atividade",
      params: { id: item.id },
    } as any);
  }

  async function sair() {
    await AsyncStorage.removeItem("token");
    router.replace("/login");
  }

  return (
    <View style={styles.lateral}>
      <Image
        source={require("../../assets/images/logo_escrita.png")}
        style={styles.logoLateral}
        resizeMode="contain"
      />

      <View style={styles.buscaCaixa}>
        <Ionicons name="search" size={16} color={COR.marinhoClaro} />
        <TextInput
          value={buscaTexto}
          onChangeText={setBuscaTexto}
          placeholder="Buscar turma ou atividade"
          placeholderTextColor={COR.marinhoClaro}
          style={[styles.buscaInput, SEM_CONTORNO_WEB]}
          onSubmitEditing={() => resultados[0] && abrirResultado(resultados[0])}
        />
        {buscaTexto.length > 0 && (
          <TouchableOpacity onPress={() => setBuscaTexto("")} hitSlop={6}>
            <Ionicons name="close" size={15} color={COR.marinhoClaro} />
          </TouchableOpacity>
        )}

        {(resultados.length > 0 || semResultado) && (
          <View style={styles.buscaResultados}>
            {semResultado ? (
              <Text style={styles.buscaVazio}>
                {carregando
                  ? "Carregando..."
                  : `Nada encontrado para "${buscaTexto.trim()}"`}
              </Text>
            ) : (
              resultados.map((item) => (
                <TouchableOpacity
                  key={`${item.tipo}-${item.id}`}
                  style={styles.buscaResultadoItem}
                  activeOpacity={0.6}
                  onPress={() => abrirResultado(item)}
                >
                  <Ionicons
                    name={
                      item.tipo === "turma"
                        ? "people-outline"
                        : "document-text-outline"
                    }
                    size={14}
                    color={COR.tintaMedia}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.buscaResultadoTexto} numberOfLines={1}>
                      {item.titulo}
                    </Text>
                    <Text style={styles.buscaResultadoApoio} numberOfLines={1}>
                      {item.tipo === "turma" ? "Turma" : "Atividade"} ·{" "}
                      {item.subtitulo}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>

      <View style={styles.lateralItens}>
        {ITENS_LATERAL.map((item) => {
          const ativo = caminho === item.rota;
          return (
            <View key={item.rota} style={styles.itemEnvolucro}>
              {ativo && <View style={styles.marcaAtivo} />}

              <Pressable
                onPress={() => router.push(item.rota as any)}
                style={({ hovered }: any) => [
                  styles.itemLateral,
                  TRANSICAO_WEB,
                  ativo && styles.itemLateralAtivo,
                  !ativo && hovered && styles.itemLateralHover,
                ]}
              >
                <Ionicons
                  name={(ativo ? item.iconeAtivo : item.icone) as any}
                  size={20}
                  color={ativo ? COR.marinho : COR.marinhoClaro}
                />
                <Text
                  style={[
                    styles.itemLateralTexto,
                    ativo && styles.itemLateralTextoAtivo,
                  ]}
                >
                  {item.rotulo}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      <Pressable
        onPress={sair}
        style={({ hovered }: any) => [
          styles.sairLinha,
          TRANSICAO_WEB,
          hovered && styles.itemLateralHover,
        ]}
      >
        <Ionicons name="log-out-outline" size={18} color={COR.perigo} />
        <Text style={styles.sairTexto}>Sair</Text>
      </Pressable>
    </View>
  );
}

function BarraMobile({ state, navigation }: any) {
  const rotaAtual = state.routes[state.index]?.name;

  const itensMenu = state.routes.filter(
    (route: any) => !ROTAS_OCULTAS_DA_BARRA.includes(route.name),
  );

  const posicaoNaBarra = (nome: string) => {
    const posicao = ORDEM_BARRA_MOBILE.indexOf(nome);
    return posicao === -1 ? 999 : posicao;
  };

  const itensOrdenados = [...itensMenu].sort(
    (a: any, b: any) => posicaoNaBarra(a.name) - posicaoNaBarra(b.name),
  );

  return (
    <View style={styles.barraInferior}>
      {itensOrdenados.map((route: any) => {
        const focado = route.name === rotaAtual;
        const icone = ICONES_POR_ROTA[route.name];

        if (route.name === ROTA_ACAO_CENTRAL) {
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.itemInferior}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(route.name)}
            >
              <View
                style={[
                  styles.botaoCentral,
                  focado && styles.botaoCentralAtivo,
                ]}
              >
                <Ionicons name={icone} size={px(24)} color={COR.branco} />
              </View>
              <Text
                style={[
                  styles.rotuloInferior,
                  focado && styles.rotuloInferiorAtivo,
                ]}
              >
                {ROTULOS_POR_ROTA[route.name]}
              </Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.itemInferior}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(route.name)}
          >
            <Ionicons
              name={icone}
              size={px(21)}
              color={focado ? COR.branco : COR.marinhoClaro}
            />
            <Text
              style={[
                styles.rotuloInferior,
                focado && styles.rotuloInferiorAtivo,
              ]}
              numberOfLines={1}
            >
              {ROTULOS_POR_ROTA[route.name]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Tamanho geral da barra de navegação de baixo.
//
// Mesmo fator usado no CabecalhoMobile, para as duas pontas da tela
// crescerem juntas. Todas as medidas da barra saem daqui, então a proporção
// entre ícone, rótulo e botão central fica travada. 1 = o tamanho original.
const ESCALA = 1.18;
const px = (n: number) => Math.round(n * ESCALA);
const pt = (n: number) => Math.round(n * ESCALA * 2) / 2;

const ICONES_POR_ROTA: Record<string, any> = {
  home: "home-outline",
  correcoes: "checkmark-done-outline",
  scanner: "camera-outline",
  editar: "pencil-outline",
  revisar: "create-outline",
  perfil: "person-outline",
  atividades: "document-text-outline",
  atividade: "document-text-outline",
  turmas: "people-outline",
  turma: "people-outline",
};

const ROTULOS_POR_ROTA: Record<string, string> = {
  home: "Home",
  correcoes: "Correções",
  scanner: "Scanner",
  editar: "Editar",
  revisar: "Revisar",
  perfil: "Perfil",
  atividades: "Atividades",
  atividade: "Atividade",
  turmas: "Turmas",
  turma: "Turma",
};

const ROTAS_OCULTAS_DA_BARRA: string[] = [
  "criar-atividade",
  "perfil",
  "processando",
  "editar",
  "revisar",
  "turma",
  "atividade",
];

const ORDEM_BARRA_MOBILE: string[] = [
  "home",
  "turmas",
  "scanner",
  "atividades",
  "correcoes",
];
const ROTA_ACAO_CENTRAL = "scanner";

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;

  return (
    <View style={[styles.raiz, ehDesktop && styles.raizLinha]}>
      {ehDesktop && <LateralDesktop />}

      <View style={[styles.area, ehDesktop && styles.areaDesktop]}>
        <Tabs
          tabBar={(props: any) =>
            ehDesktop ? null : <BarraMobile {...props} />
          }
          screenOptions={{ headerShown: false }}
        >
          <Tabs.Screen name="home" />
          <Tabs.Screen name="turmas" />
          <Tabs.Screen name="atividades" />
          <Tabs.Screen name="scanner" />
          <Tabs.Screen name="correcoes" />
          <Tabs.Screen name="editar" />
          <Tabs.Screen name="perfil" />
          <Tabs.Screen name="criar-atividade" />
          <Tabs.Screen name="processando" />
          <Tabs.Screen name="revisar" />
        </Tabs>
        <AvisoCorrecao />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: COR.fundo },
  raizLinha: {
    flexDirection: "row",
    backgroundColor: COR.marinhoFundo,
    padding: 12,
    gap: 12,
  },
  area: { flex: 1, minWidth: 0 },
  areaDesktop: {
    backgroundColor: COR.fundo,
    borderRadius: RAIO.superficie,
    overflow: "hidden",
  },

  lateral: {
    width: LARGURA_LATERAL,
    flexShrink: 0,
    backgroundColor: COR.marinho,
    borderRadius: RAIO.superficie,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
    zIndex: 20,
  },
  logoLateral: { width: 176, height: 48, marginLeft: 4, marginBottom: 22 },

  buscaCaixa: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: RAIO.controle,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 20,
    zIndex: 30,
  },
  buscaInput: {
    fontFamily: FONTE.media,
    flex: 1,
    height: "100%",
    color: COR.branco,
    fontSize: 13.5,
  },
  buscaResultados: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    paddingVertical: 5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  buscaResultadoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  buscaResultadoTexto: {
    fontFamily: FONTE.media,
    fontSize: 12.5,
    color: COR.tintaForte,
    fontWeight: "500",
  },
  buscaResultadoApoio: {
    fontFamily: FONTE.regular,
    fontSize: 10.5,
    color: COR.tintaFraca,
    marginTop: 1,
  },
  buscaVazio: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaFraca,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  lateralItens: { gap: 4 },
  itemEnvolucro: { position: "relative", justifyContent: "center" },
  marcaAtivo: {
    position: "absolute",
    left: -16,
    top: 10,
    bottom: 10,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: COR.branco,
  },
  itemLateral: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: RAIO.controle,
  },
  itemLateralHover: { backgroundColor: "rgba(255,255,255,0.07)" },
  itemLateralAtivo: { backgroundColor: COR.branco },
  itemLateralTexto: {
    fontFamily: FONTE.media,
    fontSize: 14.5,
    color: COR.marinhoClaro,
    fontWeight: "500",
  },
  itemLateralTextoAtivo: { color: COR.marinho, fontWeight: "600" },

  sairLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 13,
    borderRadius: RAIO.controle,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.09)",
  },
  sairTexto: {
    fontFamily: FONTE.semi,
    fontSize: 13.5,
    color: COR.perigo,
    fontWeight: "600",
  },

  barraInferior: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COR.marinho,
    minHeight: px(62),
    paddingTop: px(9),
    paddingBottom: px(12),
  },
  itemInferior: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: px(4),
  },
  rotuloInferior: {
    fontFamily: FONTE.semi,
    fontSize: pt(10),
    fontWeight: "600",
    color: COR.marinhoClaro,
  },
  rotuloInferiorAtivo: { color: COR.branco },

  botaoCentral: {
    width: px(54),
    height: px(54),
    borderRadius: px(54) / 2,
    backgroundColor: COR.marcador,
    alignItems: "center",
    justifyContent: "center",
    // Sobe metade da própria altura para "pousar" na borda da barra.
    marginTop: -px(26),
    marginBottom: px(2),
    borderWidth: px(4),
    borderColor: COR.marinho,
    shadowColor: COR.marcador,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  botaoCentralAtivo: { backgroundColor: COR.marinho },
});