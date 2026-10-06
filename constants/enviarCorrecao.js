// ===========================================================================
// SUBSTITUA a função enviarCorrecao do arquivo constants/api.js por esta.
// Não mexa em mais nada do arquivo.
//
// Começa em:   export async function enviarCorrecao({ arquivo, id_atividade }) {
// Termina em:  o } que fecha ela, logo antes do comentário "Segundo tempo:".
// ===========================================================================

// ===========================================================================
// CORREÇÃO DE FOLHA
//
// O upload não passa pelo apiFetch de propósito. O apiFetch força
// Content-Type: application/json e faz JSON.stringify no corpo — para enviar
// arquivo isso não serve. O FormData precisa montar o próprio Content-Type,
// com o boundary do multipart. Se definirmos o header na mão, o servidor não
// consegue separar as partes e o arquivo chega vazio, sem erro nenhum — que é
// o pior tipo de bug, o que parece que funcionou.
//
// ---------------------------------------------------------------------------
// POR QUE TEM DUAS TENTATIVAS AQUI
//
// No celular existem dois jeitos de descrever um arquivo dentro do FormData:
//
//   1) { uri, name, type }  — o jeito clássico do React Native
//   2) um Blob              — o jeito do fetch novo (padrão WinterCG)
//
// Qual dos dois funciona depende da versão do Expo/React Native instalada, e
// não dá pra saber isso pelo código. Quando o jeito errado é usado, o envio
// estoura com "Unsupported FormDataPart implementation" — que foi exatamente
// a mensagem que apareceu na tela quando a foto veio da câmera.
//
// Então: tenta o (1). Se o próprio envio estourar antes de o servidor
// responder, tenta o (2) com o mesmo arquivo. Se o erro veio DO servidor
// (400, 401, 500), não repete — o arquivo chegou lá, o problema é outro, e
// mandar a mesma foto de novo só gasta internet.
// ===========================================================================
export async function enviarCorrecao({ arquivo, id_atividade }) {
  const token = await AsyncStorage.getItem("token");

  // Monta o pacote e manda. O FormData é criado a cada tentativa de propósito:
  // um FormData que já foi entregue ao fetch não pode ser reaproveitado.
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
      // Marca que a resposta veio do servidor. Quem chama usa isso pra decidir
      // que não adianta tentar de novo.
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
    return await despachar(arquivo.objetoWeb, arquivo.nome);
  }

  if (!arquivo?.uri) {
    throw new Error("O arquivo se perdeu. Escolha a folha de novo no Scanner.");
  }

  const nomeDoArquivo = arquivo.nome || "folha.jpg";
  const tipoDoArquivo = arquivo.mime || "image/jpeg";

  // Tentativa 1 — o jeito clássico.
  try {
    return await despachar(
      { uri: arquivo.uri, name: nomeDoArquivo, type: tipoDoArquivo },
      nomeDoArquivo,
    );
  } catch (e) {
    if (e?.respondido) throw e;
    console.warn("[EduSync] upload jeito 1 falhou:", e?.message || e);
  }

  // Tentativa 2 — o mesmo arquivo, agora como Blob.
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