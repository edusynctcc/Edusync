// ---------------------------------------------------------------------------
// GERADOR DE QR CODE — sem biblioteca nenhuma
//
// Por que à mão: o QR precisa entrar no PDF da prova, e o expo-print não
// espera imagem remota carregar (foi o que quebrou a figura da questão na
// primeira versão). Gerando aqui, o código sai como SVG escrito direto no
// HTML — não tem download, não tem espera, não tem o que falhar.
//
// E porque a API já parou duas vezes por dependência que não instalou.
//
// O ESCOPO É DE PROPÓSITO PEQUENO: modo byte, nível de correção Q, versões 1
// e 2 (até 20 bytes). Isso cobre com folga o "EDU-12-47-K" que a folha usa.
//
// Nível Q (recupera 25%) e não M (15%): esta folha vai ser impressa, dobrada,
// levada na mochila e fotografada de lado com a luz da sala. Redundância é o
// que compra leitura nessas condições, e aqui ela é de graça — o código é
// curto, então sobra espaço de qualquer jeito.
// Mandar mais que isso devolve erro em vez de gerar um código quebrado — um
// QR que não lê é pior do que QR nenhum, porque ninguém desconfia dele.
//
// Versões 1 a 3 têm UM bloco de correção cada. Isso evita o intercalamento de
// blocos, que é onde a maioria dos geradores escritos à mão erra.
//
// Testado gerando e decodificando com o leitor do OpenCV, que é um leitor de
// verdade e não sabe nada deste código.
// ---------------------------------------------------------------------------

// Dados e correção por versão, no nível Q. As duas têm UM bloco de correção,
// o que evita o intercalamento — a partir da versão 3 o nível Q usa dois
// blocos, e é por isso que o gerador para na 2.
const VERSOES = {
  1: { tamanho: 21, dados: 13, ec: 13, alinhamento: [] },
  2: { tamanho: 25, dados: 22, ec: 22, alinhamento: [6, 18] },
};

// ---------------------------------------------------------------------------
// Aritmética de Galois GF(256), que é onde a correção de erro acontece.
// O polinômio 0x11D é o que a norma do QR manda usar.
// ---------------------------------------------------------------------------
const EXP = new Array(512);
const LOG = new Array(256);

(function montarTabelas() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function multiplicar(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

// Polinômio gerador para `quantos` códigos de correção.
function polinomioGerador(quantos) {
  let g = [1];
  for (let i = 0; i < quantos; i++) {
    const novo = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      novo[j] ^= g[j];
      novo[j + 1] ^= multiplicar(g[j], EXP[i]);
    }
    g = novo;
  }
  return g;
}

function codigosDeCorrecao(dados, quantos) {
  const g = polinomioGerador(quantos);
  const resto = new Array(quantos).fill(0);

  for (let i = 0; i < dados.length; i++) {
    const fator = dados[i] ^ resto[0];
    resto.shift();
    resto.push(0);
    if (fator !== 0) {
      for (let j = 0; j < quantos; j++) {
        resto[j] ^= multiplicar(g[j + 1], fator);
      }
    }
  }

  return resto;
}

// ---------------------------------------------------------------------------
// Texto -> bytes. Só ASCII: o conteúdo é um código que nós mesmos montamos
// (EDU-12-47-K), e acento ali só serviria para confundir leitor.
// ---------------------------------------------------------------------------
function emBytes(texto) {
  const bytes = [];
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    if (c > 127) {
      throw new Error("O conteúdo do QR precisa ser ASCII: " + texto);
    }
    bytes.push(c);
  }
  return bytes;
}

function escolherVersao(quantosBytes) {
  for (const n of [1, 2]) {
    // 1 byte de cabeçalho (4 bits de modo + 8 bits de contagem = 12 bits,
    // que com o terminador cabem em 2 bytes de folga).
    if (quantosBytes + 2 <= VERSOES[n].dados) return n;
  }
  throw new Error(
    `Esse texto tem ${quantosBytes} bytes e não cabe num QR versão 2 nível Q ` +
      `(máximo 20).`
  );
}

function montarCodewords(texto, versao) {
  const bytes = emBytes(texto);
  const { dados: capacidade } = VERSOES[versao];

  const bits = [];
  const empurrar = (valor, quantos) => {
    for (let i = quantos - 1; i >= 0; i--) bits.push((valor >> i) & 1);
  };

  empurrar(0b0100, 4); // modo byte
  empurrar(bytes.length, 8); // contagem (8 bits nas versões 1 a 9)
  bytes.forEach((b) => empurrar(b, 8));

  // Terminador: até 4 zeros, ou menos se já encheu.
  const sobra = capacidade * 8 - bits.length;
  empurrar(0, Math.min(4, sobra));

  // Completa o byte.
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    codewords.push(b);
  }

  // Enchimento alternado, como manda a norma.
  const ENCHIMENTO = [0xec, 0x11];
  let k = 0;
  while (codewords.length < capacidade) {
    codewords.push(ENCHIMENTO[k % 2]);
    k++;
  }

  return codewords.concat(codigosDeCorrecao(codewords, VERSOES[versao].ec));
}

// ---------------------------------------------------------------------------
// O desenho
// ---------------------------------------------------------------------------
function matrizVazia(tamanho) {
  const m = [];
  for (let i = 0; i < tamanho; i++) {
    m.push(new Array(tamanho).fill(null)); // null = ainda não ocupado
  }
  return m;
}

function porFinder(m, linha, coluna) {
  for (let i = -1; i <= 7; i++) {
    for (let j = -1; j <= 7; j++) {
      const y = linha + i;
      const x = coluna + j;
      if (y < 0 || y >= m.length || x < 0 || x >= m.length) continue;

      // O anel de fora (i ou j valendo -1 ou 7) é o SEPARADOR, e ele é sempre
      // claro. Sem essa linha, a borda do finder encosta no que vem depois e
      // a proporção 1:1:3:1:1 que o leitor procura some — foi o que fez
      // nenhum dos sete códigos de teste decodificar na primeira rodada.
      if (i < 0 || i > 6 || j < 0 || j > 6) {
        m[y][x] = 0;
        continue;
      }

      const naBorda = i === 0 || i === 6 || j === 0 || j === 6;
      const noMiolo = i >= 2 && i <= 4 && j >= 2 && j <= 4;
      m[y][x] = naBorda || noMiolo ? 1 : 0;
    }
  }
}

function porAlinhamento(m, versao) {
  const coords = VERSOES[versao].alinhamento;
  if (coords.length === 0) return;

  coords.forEach((linha) => {
    coords.forEach((coluna) => {
      // Os cantos onde já existe um finder ficam de fora.
      if (m[linha][coluna] !== null) return;

      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          const borda = Math.max(Math.abs(i), Math.abs(j));
          m[linha + i][coluna + j] = borda === 1 ? 0 : 1;
        }
      }
    });
  });
}

function porTemporizacao(m) {
  const n = m.length;
  for (let i = 8; i < n - 8; i++) {
    const valor = i % 2 === 0 ? 1 : 0;
    if (m[6][i] === null) m[6][i] = valor;
    if (m[i][6] === null) m[i][6] = valor;
  }
}

// Guarda lugar para os bits de formato, que são escritos depois da máscara.
function reservarFormato(m) {
  const n = m.length;
  for (let i = 0; i < 9; i++) {
    if (m[8][i] === null) m[8][i] = 0;
    if (m[i][8] === null) m[i][8] = 0;
  }
  for (let i = 0; i < 8; i++) {
    if (m[8][n - 1 - i] === null) m[8][n - 1 - i] = 0;
    if (m[n - 1 - i][8] === null) m[n - 1 - i][8] = 0;
  }
  m[n - 8][8] = 1; // o módulo escuro, que é sempre 1
}

// Marca quais posições são padrão fixo (não recebem dado nem máscara).
function mapaDeFuncao(versao) {
  const n = VERSOES[versao].tamanho;
  const m = matrizVazia(n);
  porFinder(m, 0, 0);
  porFinder(m, 0, n - 7);
  porFinder(m, n - 7, 0);
  porAlinhamento(m, versao);
  porTemporizacao(m);
  reservarFormato(m);
  return m;
}

function colocarDados(m, codewords) {
  const n = m.length;
  const bits = [];
  codewords.forEach((c) => {
    for (let i = 7; i >= 0; i--) bits.push((c >> i) & 1);
  });

  let indice = 0;
  let subindo = true;

  for (let coluna = n - 1; coluna > 0; coluna -= 2) {
    // A coluna 6 é a de temporização e não entra na contagem das duplas.
    if (coluna === 6) coluna--;

    for (let passo = 0; passo < n; passo++) {
      const linha = subindo ? n - 1 - passo : passo;

      for (const c of [coluna, coluna - 1]) {
        if (m[linha][c] !== null) continue;
        m[linha][c] = indice < bits.length ? bits[indice] : 0;
        indice++;
      }
    }

    subindo = !subindo;
  }
}

const MASCARAS = [
  (l, c) => (l + c) % 2 === 0,
  (l) => l % 2 === 0,
  (l, c) => c % 3 === 0,
  (l, c) => (l + c) % 3 === 0,
  (l, c) => (Math.floor(l / 2) + Math.floor(c / 3)) % 2 === 0,
  (l, c) => ((l * c) % 2) + ((l * c) % 3) === 0,
  (l, c) => (((l * c) % 2) + ((l * c) % 3)) % 2 === 0,
  (l, c) => (((l + c) % 2) + ((l * c) % 3)) % 2 === 0,
];

function aplicarMascara(m, funcao, mapa) {
  const n = m.length;
  const saida = m.map((linha) => linha.slice());

  for (let l = 0; l < n; l++) {
    for (let c = 0; c < n; c++) {
      if (mapa[l][c] !== null) continue; // padrão fixo não recebe máscara
      if (funcao(l, c)) saida[l][c] ^= 1;
    }
  }

  return saida;
}

// ---------------------------------------------------------------------------
// As quatro regras de penalidade da norma. Servem para escolher a máscara que
// deixa o desenho mais fácil de ler: menos listras longas, menos blocos
// sólidos, nada parecido com um finder no meio dos dados.
// ---------------------------------------------------------------------------
function penalidade(m) {
  const n = m.length;
  let total = 0;

  // Regra 1: cinco ou mais iguais em sequência.
  const contarFila = (pegar) => {
    for (let a = 0; a < n; a++) {
      let igual = 1;
      for (let b = 1; b < n; b++) {
        if (pegar(a, b) === pegar(a, b - 1)) {
          igual++;
        } else {
          if (igual >= 5) total += 3 + (igual - 5);
          igual = 1;
        }
      }
      if (igual >= 5) total += 3 + (igual - 5);
    }
  };
  contarFila((l, c) => m[l][c]);
  contarFila((c, l) => m[l][c]);

  // Regra 2: blocos 2x2 da mesma cor.
  for (let l = 0; l < n - 1; l++) {
    for (let c = 0; c < n - 1; c++) {
      const v = m[l][c];
      if (v === m[l][c + 1] && v === m[l + 1][c] && v === m[l + 1][c + 1]) {
        total += 3;
      }
    }
  }

  // Regra 3: sequência parecida com finder (1:1:3:1:1 com área clara).
  const ALVO_A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const ALVO_B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const bate = (pegar, a, b, alvo) => {
    for (let i = 0; i < 11; i++) if (pegar(a, b + i) !== alvo[i]) return false;
    return true;
  };
  for (let a = 0; a < n; a++) {
    for (let b = 0; b + 11 <= n; b++) {
      if (bate((l, c) => m[l][c], a, b, ALVO_A)) total += 40;
      if (bate((l, c) => m[l][c], a, b, ALVO_B)) total += 40;
      if (bate((c, l) => m[l][c], a, b, ALVO_A)) total += 40;
      if (bate((c, l) => m[l][c], a, b, ALVO_B)) total += 40;
    }
  }

  // Regra 4: desequilíbrio entre claro e escuro.
  let escuros = 0;
  m.forEach((linha) => linha.forEach((v) => (escuros += v)));
  const porcento = (escuros * 100) / (n * n);
  total += Math.floor(Math.abs(porcento - 50) / 5) * 10;

  return total;
}

// Bits de formato: nível de correção + máscara, protegidos por BCH(15,5).
function bitsDeFormato(mascara) {
  const NIVEL_Q = 0b11;
  const dados = (NIVEL_Q << 3) | mascara;

  let resto = dados << 10;
  for (let i = 14; i >= 10; i--) {
    if ((resto >> i) & 1) resto ^= 0b10100110111 << (i - 10);
  }

  return ((dados << 10) | resto) ^ 0b101010000010010;
}

function escreverFormato(m, mascara) {
  const n = m.length;
  const bits = bitsDeFormato(mascara);
  const pegar = (i) => (bits >> i) & 1;

  // A ORDEM DOS BITS AQUI É O DETALHE QUE DERRUBA GERADOR ESCRITO À MÃO.
  //
  // A norma numera os 15 bits do formato de 14 (o mais significativo) até 0, e
  // o primeiro módulo de cada cópia recebe o bit 14 — não o bit 0. Escrever na
  // ordem natural do laço espelha os quinze bits, e o leitor lê um nível de
  // correção e uma máscara que não são os usados. O desenho fica perfeito e
  // não decodifica, que é o pior jeito de errar.
  //
  // Conferido módulo a módulo contra o segno, que é uma implementação
  // independente da norma.

  // Primeira cópia: em volta do finder de cima à esquerda.
  for (let i = 0; i <= 5; i++) m[8][i] = pegar(14 - i); // (8,0)..(8,5) = 14..9
  m[8][7] = pegar(8);
  m[8][8] = pegar(7);
  m[7][8] = pegar(6);
  for (let r = 0; r <= 5; r++) m[r][8] = pegar(r); // (5,8)..(0,8) = 5..0

  // Segunda cópia: desce pela coluna 8 à esquerda do finder de baixo, e segue
  // pela linha 8 à esquerda do finder da direita.
  for (let i = 0; i <= 6; i++) m[n - 1 - i][8] = pegar(14 - i);
  for (let i = 0; i <= 7; i++) m[8][n - 8 + i] = pegar(7 - i);

  // O módulo escuro fica em (n-8, 8) e não é bit de formato — o laço de cima
  // para em n-7 justamente para não passar por cima dele.
  m[n - 8][8] = 1;
}

/** Devolve a matriz de módulos (1 = escuro) do QR para este texto. */
export function matrizDoQr(texto, mascaraForcada) {
  const versao = escolherVersao(emBytes(texto).length);
  const codewords = montarCodewords(texto, versao);

  const mapa = mapaDeFuncao(versao);
  const base = mapa.map((linha) => linha.slice());
  colocarDados(base, codewords);

  let melhor = null;
  let melhorNota = Infinity;

  for (let i = 0; i < 8; i++) {
    if (mascaraForcada !== undefined && i !== mascaraForcada) continue;
    const tentativa = aplicarMascara(base, MASCARAS[i], mapa);
    escreverFormato(tentativa, i);

    const nota = penalidade(tentativa);
    if (nota < melhorNota) {
      melhorNota = nota;
      melhor = tentativa;
    }
  }

  return melhor;
}

/**
 * Devolve o QR como SVG escrito direto no HTML.
 *
 * SVG em vez de imagem porque o expo-print não espera imagem carregar: SVG
 * dentro do HTML já está lá quando a página é montada, não tem o que esperar.
 *
 * `lado` é o tamanho final em pixels de CSS.
 */
export function qrSvg(texto, lado = 86) {
  const m = matrizDoQr(texto);
  const n = m.length;

  // A "zona quieta" em volta. A norma exige 4 módulos; aqui vão 6.
  //
  // Não é exagero: testando com o leitor do OpenCV, com 4 módulos algumas
  // máscaras não eram lidas de jeito nenhum, e as mesmas eram lidas na hora
  // com 6. Em papel, dois módulos a mais de branco não custam nada.
  const margem = 6;
  const total = n + margem * 2;

  let caminho = "";
  for (let l = 0; l < n; l++) {
    for (let c = 0; c < n; c++) {
      if (m[l][c]) caminho += `M${c + margem} ${l + margem}h1v1h-1z`;
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" ` +
    `viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="#FFFFFF"/>` +
    `<path d="${caminho}" fill="#000000"/>` +
    `</svg>`
  );
}