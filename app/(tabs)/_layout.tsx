
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const LARGURA_BARRA_LATERAL = 240;

function CustomTabBar({ state, navigation }: any) {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();
  const [busca, setBusca] = useState("");

  const rotaAtual = state.routes[state.index]?.name;

  function sair() {
    router.replace("/login");
  }

  // ---------- MOBILE: barra de baixo, só ícones ----------
  if (!ehDesktop) {
    return (
      <View style={styles.barraInferior}>
        {state.routes
          .filter((route: any) => !ROTAS_OCULTAS_DA_BARRA.includes(route.name))
          .map((route: any) => {
            const focado = route.name === rotaAtual;
            const icone =
              (ICONES_POR_ROTA as any)[route.name] ?? "ellipse-outline";
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.itemInferior}
                onPress={() => navigation.navigate(route.name)}
              >
                <Ionicons
                  name={icone}
                  size={22}
                  color={focado ? "#FFFFFF" : "#5C7096"}
                />
              </TouchableOpacity>
            );
          })}

        <TouchableOpacity style={styles.itemInferior} onPress={sair}>
          <Ionicons name="log-out-outline" size={22} color="#F87171" />
        </TouchableOpacity>
      </View>
    );
  }

  // ---------- DESKTOP: barra lateral com pesquisa + menu + sair ----------
  return (
    <View style={styles.barraLateral}>
      <Image
        source={require("../../assets/images/logo_escrita.png")}
        style={styles.logoLateral}
        resizeMode="contain"
      />

      <View style={styles.buscaBox}>
        <Ionicons name="search" size={16} color="#8CA0C4" />
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Pesquisar..."
          placeholderTextColor="#8CA0C4"
          style={styles.buscaInput}
        />
      </View>

      <Text style={styles.menuTitulo}>MENU PRINCIPAL</Text>

      {state.routes
        .filter((route: any) => !ROTAS_OCULTAS_DA_BARRA.includes(route.name))
        .map((route: any) => (
          <ItemMenu
            key={route.key}
            ativo={route.name === rotaAtual}
            icone={(ICONES_POR_ROTA as any)[route.name] ?? "ellipse-outline"}
            rotulo={(ROTULOS_POR_ROTA as any)[route.name] ?? route.name}
            onPress={() => navigation.navigate(route.name)}
          />
        ))}

      <View style={styles.espacador} />

      <View style={styles.divisor} />

      <Pressable
        onPress={sair}
        style={({ hovered, pressed }) => [
          styles.itemSair,
          hovered && styles.itemSairHover,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Ionicons name="log-out-outline" size={18} color="#F87171" />
        <Text style={styles.itemSairTexto}>Sair</Text>
      </Pressable>
    </View>
  );
}

function ItemMenu({ ativo, icone, rotulo, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.itemLateral,
        ativo && styles.itemLateralAtivo,
        !ativo && hovered && styles.itemLateralHover,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons name={icone} size={18} color={ativo ? "#BFDBFE" : "#8CA0C4"} />
      <Text
        style={[styles.itemLateralTexto, ativo && styles.itemLateralTextoAtivo]}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}

const ICONES_POR_ROTA = {
  home: "home-outline",
  correcoes: "list-outline",
  scanner: "camera-outline",
  editar: "pencil-outline",
  perfil: "person-outline",
  atividades: "document-text-outline",
};

// Rótulos usados na sidebar do desktop (mobile só mostra o ícone).
const ROTULOS_POR_ROTA = {
  home: "Home",
  correcoes: "Correções",
  scanner: "Scanner",
  editar: "Editar",
  perfil: "Perfil",
  atividades: "Atividades",
};

const ROTAS_OCULTAS_DA_BARRA: string[] = ["criar-atividade", "perfil"];

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="correcoes" />
      <Tabs.Screen name="scanner" />
      <Tabs.Screen name="editar" />
      <Tabs.Screen name="perfil" />
      <Tabs.Screen name="atividades" />
      <Tabs.Screen name="criar-atividade" />
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

  // ----- desktop -----
  barraLateral: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: LARGURA_BARRA_LATERAL,
    height: "100%",
    backgroundColor: "#0B1E3D",
    paddingHorizontal: 16,
    paddingTop: 24,
    borderRightWidth: 1,
    borderRightColor: "#12294F",
  },
  logoLateral: {
    width: 180,
    height: 41,
    marginBottom: 22,
    marginLeft: 4,
  },
  buscaBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 22,
  },
  buscaInput: { flex: 1, color: "#FFFFFF", fontSize: 13, padding: 0 },

  menuTitulo: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#5C7096",
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  itemLateral: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
    // transição suave de fundo ao passar o mouse/tocar (só tem efeito no web)
    transitionProperty: "background-color",
    transitionDuration: "150ms",
  },
  itemLateralHover: { backgroundColor: "rgba(255,255,255,0.06)" },
  itemLateralAtivo: { backgroundColor: "rgba(59,130,246,0.16)" },
  itemLateralTexto: { fontSize: 13, color: "#8CA0C4", fontWeight: "500" },
  itemLateralTextoAtivo: { color: "#DCEAFE", fontWeight: "700" },

  espacador: { flex: 1 },

  divisor: {
    height: 1,
    backgroundColor: "#12294F",
    marginBottom: 12,
  },
  itemSair: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 42,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderRadius: 10,
    transitionProperty: "background-color",
    transitionDuration: "150ms",
  },
  itemSairHover: { backgroundColor: "rgba(248,113,113,0.10)" },
  itemSairTexto: { fontSize: 13, color: "#F87171", fontWeight: "600" },
});
