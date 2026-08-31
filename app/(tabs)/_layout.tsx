
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
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

// Altura da navbar do desktop; as telas usam esse valor no paddingTop.
export const ALTURA_NAVBAR_TOPO = 76;

// Estilos só do navegador — ficam fora do StyleSheet pra não dar erro de tipo.
const TRANSICAO_WEB: any =
  Platform.OS === "web"
    ? { transitionProperty: "background-color", transitionDuration: "150ms" }
    : null;

const SEM_CONTORNO_WEB: any =
  Platform.OS === "web" ? { outlineStyle: "none" } : null;

// Índice que a busca da navbar percorre (mesmos dados do Home).
const INDICE_BUSCA_NAVBAR = [
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

function CustomTabBar({ state, navigation }: any) {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();

  // Controla se a caixa de busca está aberta (abre e fecha na lupa).
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [buscaTexto, setBuscaTexto] = useState("");

  const rotaAtual = state.routes[state.index]?.name;

  const itensMenu = state.routes.filter(
    (route: any) => !ROTAS_OCULTAS_DA_BARRA.includes(route.name)
  );

  const resultadosBusca =
    buscaTexto.trim().length === 0
      ? []
      : INDICE_BUSCA_NAVBAR.filter((item) =>
          item.titulo.toLowerCase().includes(buscaTexto.toLowerCase())
        );

  function abrirBusca() {
    setBuscaAberta(true);
  }

  function fecharBusca() {
    setBuscaAberta(false);
    setBuscaTexto("");
  }

  function abrirResultado(item: any) {
    fecharBusca();
    if (item.tipo === "turma") {
      router.push({ pathname: "/turmas", params: { turmaBusca: item.titulo } });
    } else {
      router.push({ pathname: "/atividades", params: { atividadeTitulo: item.titulo } });
    }
  }

  function sair() {
    // Sai da conta. Com a API no ar, apague o token guardado antes de redirecionar.
    router.replace("/login");
  }

  // ---------- MOBILE: barra de baixo, só ícones ----------
  if (!ehDesktop) {
    return (
      <View style={styles.barraInferior}>
        {itensMenu.map((route: any) => {
          const focado = route.name === rotaAtual;
          const icone = ICONES_POR_ROTA[route.name] ?? "ellipse-outline";
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.itemInferior}
              onPress={() => navigation.navigate(route.name)}
            >
              <Ionicons name={icone} size={22} color={focado ? "#FFFFFF" : "#5C7096"} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ---------- DESKTOP: navbar horizontal no topo ----------
  return (
    <View style={styles.navbarTopo}>
      <Image
        source={require("../../assets/images/logo_escrita.png")}
        style={styles.logoTopo}
        resizeMode="contain"
      />

      <View style={styles.itensTopoLinha}>
        {itensMenu.map((route: any) => {
          const ativo = route.name === rotaAtual;
          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={({ hovered }: any) => [
                styles.itemTopo,
                TRANSICAO_WEB,
                !ativo && hovered && styles.itemTopoHover,
              ]}
            >
              <Ionicons
                name={ICONES_POR_ROTA[route.name] ?? "ellipse-outline"}
                size={19}
                color={ativo ? "#FFFFFF" : "#8CA0C6"}
              />
              <Text style={[styles.itemTopoTexto, ativo && styles.itemTopoTextoAtivo]}>
                {ROTULOS_POR_ROTA[route.name] ?? route.name}
              </Text>
              {/* Tracinho embaixo do item ativo, igual sublinhado de aba */}
              {ativo && <View style={styles.itemTopoIndicador} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.acoesTopoLinha}>
        {buscaAberta ? (
          <View style={styles.buscaTopoCaixa}>
            <TouchableOpacity onPress={fecharBusca} hitSlop={6}>
              <Ionicons name="search" size={15} color="#8CA0C6" />
            </TouchableOpacity>
            <TextInput
              autoFocus
              value={buscaTexto}
              onChangeText={setBuscaTexto}
              placeholder="Buscar turma ou atividade..."
              placeholderTextColor="#8CA0C6"
              // SEM_CONTORNO_WEB tira o contorno azul do input no navegador.
              style={[styles.buscaTopoInput, SEM_CONTORNO_WEB]}
              onSubmitEditing={() => resultadosBusca[0] && abrirResultado(resultadosBusca[0])}
            />
            <TouchableOpacity onPress={fecharBusca}>
              <Ionicons name="close" size={16} color="#8CA0C6" />
            </TouchableOpacity>

            {resultadosBusca.length > 0 && (
              <View style={styles.buscaTopoResultados}>
                {resultadosBusca.map((item) => (
                  <TouchableOpacity
                    key={item.tipo + item.titulo}
                    style={styles.buscaTopoResultadoItem}
                    onPress={() => abrirResultado(item)}
                  >
                    <Ionicons
                      name={item.tipo === "turma" ? "people-outline" : "document-text-outline"}
                      size={15}
                      color="#0B1E3D"
                    />
                    <Text style={styles.buscaTopoResultadoTexto}>{item.titulo}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.botaoIconeTopo} activeOpacity={0.7} onPress={abrirBusca}>
            <Ionicons name="search" size={17} color="#C6D2EA" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.botaoIconeTopo} activeOpacity={0.7} onPress={sair}>
          <Ionicons name="log-out-outline" size={17} color="#F87171" />
        </TouchableOpacity>

        <Pressable
          style={({ hovered }: any) => [styles.avatarLinhaTopo, hovered && { opacity: 0.85 }]}
          onPress={() => router.push("/perfil")}
        >
          <View style={styles.avatarTopo}>
            <Text style={styles.avatarTopoTexto}>AS</Text>
          </View>
          <Ionicons name="chevron-down" size={14} color="#C6D2EA" />
        </Pressable>
      </View>
    </View>
  );
}

// Record<string, any> permite indexar por route.name sem erro de tipo.
const ICONES_POR_ROTA: Record<string, any> = {
  home: "home-outline",
  correcoes: "list-outline",
  scanner: "camera-outline",
  editar: "pencil-outline",
  perfil: "person-outline",
  atividades: "document-text-outline",
  turmas: "people-outline",
};

// Rótulos usados na navbar do desktop (mobile só mostra o ícone).
const ROTULOS_POR_ROTA: Record<string, string> = {
  home: "Home",
  correcoes: "Correções",
  scanner: "Scanner",
  editar: "Editar",
  perfil: "Perfil",
  atividades: "Atividades",
  turmas: "Turmas",
};

// Telas navegáveis que não aparecem como ícone na barra.
const ROTAS_OCULTAS_DA_BARRA: string[] = ["criar-atividade", "perfil", "processando", "editar"];

// Ordem dos itens na navbar: turma → atividade → scanner → correções.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props: any) => <CustomTabBar {...props} />}
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
  );
}

const styles = StyleSheet.create({
  // ----- mobile -----
  barraInferior: {
    flexDirection: "row",
    height: 60,
    backgroundColor: "#0B1E3D",
  },
  itemInferior: { flex: 1, alignItems: "center", justifyContent: "center" },

  // ----- desktop: navbar horizontal no topo -----
  navbarTopo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: ALTURA_NAVBAR_TOPO,
    backgroundColor: "#0B1E3D",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 24,
    zIndex: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  logoTopo: { width: 130, height: 34, flexShrink: 0 },

  itensTopoLinha: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  itemTopo: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    position: "relative",
    // A transição do hover está na constante TRANSICAO_WEB, no topo do arquivo.
  },
  itemTopoHover: { backgroundColor: "rgba(255,255,255,0.08)" },
  itemTopoTexto: { fontSize: 10.5, color: "#8CA0C6", fontWeight: "600", marginTop: 4 },
  itemTopoTextoAtivo: { color: "#FFFFFF", fontWeight: "700" },
  itemTopoIndicador: {
    position: "absolute",
    bottom: 0,
    left: "22%",
    right: "22%",
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },

  acoesTopoLinha: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 0 },
  botaoIconeTopo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  avatarLinhaTopo: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 4 },
  avatarTopo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTopoTexto: { color: "#0B1E3D", fontSize: 12, fontWeight: "700" },

  buscaTopoCaixa: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 240,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  buscaTopoInput: {
    flex: 1,
    height: "100%",
    color: "#FFFFFF",
    fontSize: 13,
  },
  buscaTopoResultados: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  buscaTopoResultadoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  buscaTopoResultadoTexto: { fontSize: 13, color: "#0B1E3D", fontWeight: "600" },
});