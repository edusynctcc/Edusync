
const VERSOES = {
  1: { tamanho: 21, dados: 13, ec: 13, alinhamento: [] },
  2: { tamanho: 25, dados: 22, ec: 22, alinhamento: [6, 18] },
};

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

  empurrar(0b0100, 4);
  empurrar(bytes.length, 8);
  bytes.forEach((b) => empurrar(b, 8));

  const sobra = capacidade * 8 - bits.length;
  empurrar(0, Math.min(4, sobra));

  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    codewords.push(b);
  }

  const ENCHIMENTO = [0xec, 0x11];
  let k = 0;
  while (codewords.length < capacidade) {
    codewords.push(ENCHIMENTO[k % 2]);
    k++;
  }

  return codewords.concat(codigosDeCorrecao(codewords, VERSOES[versao].ec));
}

function matrizVazia(tamanho) {
  const m = [];
  for (let i = 0; i < tamanho; i++) {
    m.push(new Array(tamanho).fill(null));
  }
  return m;
}

function porFinder(m, linha, coluna) {
  for (let i = -1; i <= 7; i++) {
    for (let j = -1; j <= 7; j++) {
      const y = linha + i;
      const x = coluna + j;
      if (y < 0 || y >= m.length || x < 0 || x >= m.length) continue;

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
  m[n - 8][8] = 1;
}

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
      if (mapa[l][c] !== null) continue;
      if (funcao(l, c)) saida[l][c] ^= 1;
    }
  }

  return saida;
}

function penalidade(m) {
  const n = m.length;
  let total = 0;

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

  for (let l = 0; l < n - 1; l++) {
    for (let c = 0; c < n - 1; c++) {
      const v = m[l][c];
      if (v === m[l][c + 1] && v === m[l + 1][c] && v === m[l + 1][c + 1]) {
        total += 3;
      }
    }
  }

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

  let escuros = 0;
  m.forEach((linha) => linha.forEach((v) => (escuros += v)));
  const porcento = (escuros * 100) / (n * n);
  total += Math.floor(Math.abs(porcento - 50) / 5) * 10;

  return total;
}

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


  for (let i = 0; i <= 5; i++) m[8][i] = pegar(14 - i);
  m[8][7] = pegar(8);
  m[8][8] = pegar(7);
  m[7][8] = pegar(6);
  for (let r = 0; r <= 5; r++) m[r][8] = pegar(r);

  for (let i = 0; i <= 6; i++) m[n - 1 - i][8] = pegar(14 - i);
  for (let i = 0; i <= 7; i++) m[8][n - 8 + i] = pegar(7 - i);

  m[n - 8][8] = 1;
}

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

export function qrSvg(texto, lado = 86) {
  const m = matrizDoQr(texto);
  const n = m.length;

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