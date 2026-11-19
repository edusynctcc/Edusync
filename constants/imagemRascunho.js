import { Platform } from "react-native";
import { urlDaImagem } from "./api";

// ---------------------------------------------------------------------------
// A IMAGEM DENTRO DO RASCUNHO
//
// Antes a foto da questão simplesmente não ia para o rascunho: na web ela é um
// `blob:` que morre quando a aba fecha, e guardar esse endereço devolveria uma
// imagem quebrada. Aqui ela vira uma cópia pequena e de verdade.
//
// Por que encolher: o armazenamento local do navegador tem uns 5 MB no TOTAL,
// para todos os rascunhos juntos. Uma foto de celular sozinha passa disso. A
// cópia tem lado máximo de 1100 px e qualidade 0,6 -- o suficiente para ler um
// gráfico ou uma figura numa prova, e perto de 150 KB em vez de 4 MB.
//
// No celular nada disso é preciso: o arquivo escolhido continua no aparelho, e
// guardar o endereço dele basta.
// ---------------------------------------------------------------------------
const LADO_MAXIMO = 1100;
const QUALIDADE = 0.6;
const LIMITE_POR_IMAGEM = 420 * 1024;

function encolherNaWeb(endereco) {
  return new Promise((resolve, reject) => {
    const foto = new window.Image();

    foto.onload = () => {
      try {
        const maior = Math.max(foto.width, foto.height) || 1;
        const escala = Math.min(1, LADO_MAXIMO / maior);

        const tela = document.createElement("canvas");
        tela.width = Math.max(1, Math.round(foto.width * escala));
        tela.height = Math.max(1, Math.round(foto.height * escala));

        const pincel = tela.getContext("2d");
        pincel.drawImage(foto, 0, 0, tela.width, tela.height);

        resolve(tela.toDataURL("image/jpeg", QUALIDADE));
      } catch (e) {
        reject(e);
      }
    };

    foto.onerror = () => reject(new Error("Não consegui abrir essa imagem."));
    foto.src = endereco;
  });
}

// Devolve o que cabe no rascunho, ou null quando a imagem não dá para guardar.
export async function imagemParaGuardar(imagem) {
  if (!imagem) return null;

  // Já está no servidor: o caminho é curto e volta inteiro.
  if (imagem.caminho) {
    return { caminho: imagem.caminho, mime: imagem.mime || "" };
  }

  if (!imagem.uri) return null;

  if (Platform.OS !== "web") {
    return { uri: imagem.uri, mime: imagem.mime || "image/jpeg" };
  }

  try {
    const copia = await encolherNaWeb(imagem.uri);
    if (!copia || copia.length > LIMITE_POR_IMAGEM) return null;
    return { uri: copia, mime: "image/jpeg" };
  } catch {
    return null;
  }
}

export function imagemDeVolta(guardada) {
  if (!guardada) return null;

  if (guardada.caminho) {
    return {
      caminho: guardada.caminho,
      uri: urlDaImagem(guardada.caminho),
      mime: guardada.mime || "",
      objetoWeb: null,
    };
  }

  if (!guardada.uri) return null;

  return {
    caminho: null,
    uri: guardada.uri,
    mime: guardada.mime || "image/jpeg",
    objetoWeb: null,
  };
}

// Prepara a lista inteira e conta quantas imagens ficaram de fora, para a tela
// poder avisar em vez de deixar o professor descobrir sozinho.
export async function questoesParaGuardar(questoes) {
  const lista = questoes || [];

  const prontas = await Promise.all(
    lista.map(async (q) => {
      if (!q || !q.imagem) return { ...q, imagem: null };
      return { ...q, imagem: await imagemParaGuardar(q.imagem) };
    }),
  );

  const perdidas = prontas.filter(
    (q, i) => lista[i] && lista[i].imagem && !q.imagem,
  ).length;

  return { questoes: prontas, perdidas };
}
