import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter, usePathname } from "expo-router";
import { useState } from "react";
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

export const LARGURA_LATERAL = 236;

const SISTEMA: any = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
});

const FONTE: any = {
  regular: Platform.OS === "web" ? `PublicSans_400Regular, ${SISTEMA}` : "PublicSans_400Regular",
  media: Platform.OS === "web" ? `PublicSans_500Medium, ${SISTEMA}` : "PublicSans_500Medium",
  semi: Platform.OS === "web" ? `PublicSans_600SemiBold, ${SISTEMA}` : "PublicSans_600SemiBold",
  bold: Platform.OS === "web" ? `PublicSans_700Bold, ${SISTEMA}` : "PublicSans_700Bold",
};

const COR: any = {
  marinho: "#0B1E3D",
  marinhoFundo: "#081730",
  marinhoClaro: "#9FB3D4",
  tintaForte: "#17242E",
  tintaMedia: "#55646F",
  branco: "#FFFFFF",
  marcador: "#2E6FB0",
  fundo: "#F2F5F6",
  perigo: "#F87171",
};

const TRANSICAO_WEB: any =
  Platform.OS === "web"
    ? { transitionProperty: "background-color", transitionDuration: "150ms" }
    : null;

const SEM_CONTORNO_WEB: any = Platform.OS === "web" ? { outlineStyle: "none" } : null;


const ITENS_LATERAL = [
  { rota: "/home", rotulo: "Home", icone: "grid-outline", iconeAtivo: "grid" },
  { rota: "/turmas", rotulo: "Turmas", icone: "people-outline", iconeAtivo: "people" },
  { rota: "/atividades", rotulo: "Atividades", icone: "document-text-outline", iconeAtivo: "document-text" },
  { rota: "/scanner", rotulo: "Scanner", icone: "scan-outline", iconeAtivo: "scan" },
  { rota: "/correcoes", rotulo: "Correções", icone: "checkmark-done-outline", iconeAtivo: "checkmark-done" },
  { rota: "/perfil", rotulo: "Perfil", icone: "person-outline", iconeAtivo: "person" },
];

// Índice que a busca percorre.
//
// API — GET /turmas + GET /atividades
// Mesma ideia do Home: troque a constante por estado e busque os dois.
const INDICE_BUSCA = [
  { tipo: "turma", titulo: "9º Ano A" },
  { tipo: "turma", titulo: "1ª Série B" },
  { tipo: "turma", titulo: "7º Ano C" },
  { tipo: "atividade", titulo: "Prova de Álgebra" },
  { tipo: "atividade", titulo: "Lista de Exercícios" },
  { tipo: "atividade", titulo: "Trabalho de Geometria" },
  { tipo: "atividade", titulo: "Prova Bimestral" },
  { tipo: "atividade", titulo: "Exercícios de Frações" },
  { tipo: "atividade", titulo: "Projeto de Estatística" },
];

function LateralDesktop() {
  const router = useRouter();
  const caminho = usePathname();
  const [buscaTexto, setBuscaTexto] = useState("");

  const resultados =
    buscaTexto.trim().length === 0
      ? []
      : INDICE_BUSCA.filter((item) =>
          item.titulo.toLowerCase().includes(buscaTexto.toLowerCase())
        );

  function abrirResultado(item: any) {
    setBuscaTexto("");
    if (item.tipo === "turma") {
      router.push({ pathname: "/turmas", params: { turmaBusca: item.titulo } });
    } else {
      router.push({ pathname: "/atividades", params: { atividadeTitulo: item.titulo } });
    }
  }

  function sair() {
    // Com a API no ar, apague o token guardado antes de redirecionar.
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
        <Ionicons name="search" size={15} color={COR.marinhoClaro} />
        <TextInput
          value={buscaTexto}
          onChangeText={setBuscaTexto}
          placeholder="Buscar..."
          placeholderTextColor={COR.marinhoClaro}
          style={[styles.buscaInput, SEM_CONTORNO_WEB]}
          onSubmitEditing={() => resultados[0] && abrirResultado(resultados[0])}
        />
        {buscaTexto.length > 0 && (
          <TouchableOpacity onPress={() => setBuscaTexto("")} hitSlop={6}>
            <Ionicons name="close" size={15} color={COR.marinhoClaro} />
          </TouchableOpacity>
        )}

        {resultados.length > 0 && (
          <View style={styles.buscaResultados}>
            {resultados.map((item) => (
              <TouchableOpacity
                key={item.tipo + item.titulo}
                style={styles.buscaResultadoItem}
                onPress={() => abrirResultado(item)}
              >
                <Ionicons
                  name={item.tipo === "turma" ? "people-outline" : "document-text-outline"}
                  size={14}
                  color={COR.tintaMedia}
                />
                <Text style={styles.buscaResultadoTexto} numberOfLines={1}>
                  {item.titulo}
                </Text>
              </TouchableOpacity>
            ))}
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
                  size={18}
                  color={ativo ? COR.marinho : COR.marinhoClaro}
                />
                <Text style={[styles.itemLateralTexto, ativo && styles.itemLateralTextoAtivo]}>
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
        style={({ hovered }: any) => [styles.sairLinha, TRANSICAO_WEB, hovered && styles.itemLateralHover]}
      >
        <Ionicons name="log-out-outline" size={17} color={COR.perigo} />
        <Text style={styles.sairTexto}>Sair</Text>
      </Pressable>
    </View>
  );
}

function BarraMobile({ state, navigation }: any) {
  const rotaAtual = state.routes[state.index]?.name;

  const itensMenu = state.routes.filter(
    (route: any) => !ROTAS_OCULTAS_DA_BARRA.includes(route.name)
  );

  const posicaoNaBarra = (nome: string) => {
    const posicao = ORDEM_BARRA_MOBILE.indexOf(nome);
    return posicao === -1 ? 999 : posicao;
  };

  const itensOrdenados = [...itensMenu].sort(
    (a: any, b: any) => posicaoNaBarra(a.name) - posicaoNaBarra(b.name)
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
              <View style={[styles.botaoCentral, focado && styles.botaoCentralAtivo]}>
                <Ionicons name={icone} size={24} color={COR.branco} />
              </View>
              <Text style={[styles.rotuloInferior, focado && styles.rotuloInferiorAtivo]}>
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
            <Ionicons name={icone} size={21} color={focado ? COR.branco : COR.marinhoClaro} />
            <Text
              style={[styles.rotuloInferior, focado && styles.rotuloInferiorAtivo]}
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

const ICONES_POR_ROTA: Record<string, any> = {
  home: "home-outline",
  correcoes: "checkmark-done-outline",
  scanner: "camera-outline",
  editar: "pencil-outline",
  perfil: "person-outline",
  atividades: "document-text-outline",
  turmas: "people-outline",
};

const ROTULOS_POR_ROTA: Record<string, string> = {
  home: "Home",
  correcoes: "Correções",
  scanner: "Scanner",
  editar: "Editar",
  perfil: "Perfil",
  atividades: "Atividades",
  turmas: "Turmas",
};

const ROTAS_OCULTAS_DA_BARRA: string[] = ["criar-atividade", "perfil", "processando", "editar"];

const ORDEM_BARRA_MOBILE: string[] = ["home", "turmas", "scanner", "atividades", "correcoes"];
const ROTA_ACAO_CENTRAL = "scanner";

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;

  return (
    <View style={[styles.raiz, ehDesktop && styles.raizLinha]}>
      {ehDesktop && <LateralDesktop />}

      <View style={[styles.area, ehDesktop && styles.areaDesktop]}>
        <Tabs
          tabBar={(props: any) => (ehDesktop ? null : <BarraMobile {...props} />)}
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
        </Tabs>
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
    borderRadius: 20,
    overflow: "hidden",
  },

  lateral: {
    width: LARGURA_LATERAL,
    flexShrink: 0,
    backgroundColor: COR.marinho,
    borderRadius: 20,
    paddingTop: 22,
    paddingBottom: 14,
    paddingHorizontal: 14,
    zIndex: 20,
  },
  logoLateral: { width: 140, height: 36, marginLeft: 6, marginBottom: 18 },

  buscaCaixa: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 36,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 18,
    zIndex: 30,
  },
  buscaInput: { fontFamily: FONTE.media, flex: 1, height: "100%", color: COR.branco, fontSize: 12.5 },
  buscaResultados: {
    position: "absolute",
    top: 42,
    left: 0,
    right: 0,
    backgroundColor: COR.branco,
    borderRadius: 10,
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
  buscaResultadoTexto: { fontFamily: FONTE.media, flex: 1, fontSize: 12.5, color: COR.tintaForte, fontWeight: "500" },

  lateralItens: { gap: 3 },
  itemEnvolucro: { position: "relative", justifyContent: "center" },
  marcaAtivo: {
    position: "absolute",
    left: -14,
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
    gap: 11,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  itemLateralHover: { backgroundColor: "rgba(255,255,255,0.07)" },
  itemLateralAtivo: { backgroundColor: COR.branco },
  itemLateralTexto: { fontFamily: FONTE.media, fontSize: 13, color: COR.marinhoClaro, fontWeight: "500" },
  itemLateralTextoAtivo: { color: COR.marinho, fontWeight: "600" },

  sairLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingVertical: 11,
    borderRadius: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.09)",
  },
  sairTexto: { fontFamily: FONTE.semi, fontSize: 12.5, color: COR.perigo, fontWeight: "600" },

  barraInferior: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COR.marinho,
    minHeight: 62,
    paddingTop: 9,
    paddingBottom: 12,
  },
  itemInferior: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  rotuloInferior: { fontFamily: FONTE.semi, fontSize: 10, fontWeight: "600", color: COR.marinhoClaro },
  rotuloInferiorAtivo: { color: COR.branco },

  botaoCentral: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COR.marcador,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -26,
    marginBottom: 2,
    borderWidth: 4,
    borderColor: COR.marinho,
    shadowColor: COR.marcador,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  botaoCentralAtivo: { backgroundColor: COR.marinho },
});