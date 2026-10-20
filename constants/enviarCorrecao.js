
export async function enviarCorrecao({ arquivo, id_atividade }) {
  const token = await AsyncStorage.getItem("token");

  async function despachar(parte, nome) {
    const formulario = new FormData();
    formulario.append("imagem", parte, nome);
    formulario.append("id_atividade", String(id_atividade));

    const resposta = await fetch(ENDPOINTS.correcoes, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formulario,
    });

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

  if (Platform.OS === "web") {
    if (!arquivo?.objetoWeb) {
      throw new Error("O arquivo se perdeu. Escolha a folha de novo no Scanner.");
    }
    return await despachar(arquivo.objetoWeb, arquivo.nome);
  }

  if (!arquivo?.uri) {
    throw new Error("O arquivo se perdeu. Escolha a folha de novo no Scanner.");
  }

  const nomeDoArquivo = arquivo.nome || "folha.jpg";
  const tipoDoArquivo = arquivo.mime || "image/jpeg";

  try {
    return await despachar(
      { uri: arquivo.uri, name: nomeDoArquivo, type: tipoDoArquivo },
      nomeDoArquivo,
    );
  } catch (e) {
    if (e?.respondido) throw e;
    console.warn("[EduSync] upload jeito 1 falhou:", e?.message || e);
  }

  try {
    const lido = await fetch(arquivo.uri);
    const blob = await lido.blob();
    return await despachar(blob, nomeDoArquivo);
  } catch (e) {
    if (e?.respondido) throw e;
    console.warn("[EduSync] upload jeito 2 falhou:", e?.message || e);
    throw new Error(
      "Não consegui enviar essa foto. Tente pela galeria ou mande o PDF.",
    );
  }
}