/**
 * JOBS — MOTOR CRIPTOGRÁFICO DE AUDITORIA & SERIALIZAÇÃO CANÔNICA
 * 
 * Padrões:
 * 1. Algoritmo de Hashing: SHA-256 padrão FIPS 180-4 (digest hexadecimal de 64 caracteres).
 * 2. Serialização Canônica Determinística: Ordenação recursiva lexicográfica de propriedades,
 *    representação estável de números, booleanos, strings e arrays sem espaços.
 * 3. Encadeamento Criptográfico: Cada evento inclui o hash do evento anterior (`previousEventHash`).
 * 4. Isomorfismo Total: Opera identicamente em Node.js (testes), Browsers modernos e Web Workers sem dependências externas.
 */

// Constantes K do SHA-256 (primeiros 32 bits das partes fracionárias das raízes cúbicas dos primeiros 64 números primos)
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function ch(x: number, y: number, z: number): number {
  return (x & y) ^ (~x & z);
}

function maj(x: number, y: number, z: number): number {
  return (x & y) ^ (x & z) ^ (y & z);
}

function sigma0(x: number): number {
  return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
}

function sigma1(x: number): number {
  return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
}

function gamma0(x: number): number {
  return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
}

function gamma1(x: number): number {
  return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);
}

/**
 * Computa o hash SHA-256 padrão de uma string UTF-8.
 * Retorna 64 caracteres hexadecimais em caixa baixa.
 */
export function sha256(input: string): string {
  const utf8: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let charCode = input.charCodeAt(i);
    if (charCode < 0x80) {
      utf8.push(charCode);
    } else if (charCode < 0x800) {
      utf8.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      utf8.push(
        0xe0 | (charCode >> 12),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f)
      );
    } else {
      // Surrogate pair
      i++;
      charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (input.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charCode >> 18),
        0x80 | ((charCode >> 12) & 0x3f),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f)
      );
    }
  }

  const lengthBits = utf8.length * 8;
  utf8.push(0x80);
  while ((utf8.length % 64) !== 56) {
    utf8.push(0x00);
  }

  // Comprimento em 64-bit big-endian
  const highBits = Math.floor(lengthBits / 0x100000000);
  const lowBits = lengthBits >>> 0;
  utf8.push(
    (highBits >>> 24) & 0xff,
    (highBits >>> 16) & 0xff,
    (highBits >>> 8) & 0xff,
    highBits & 0xff,
    (lowBits >>> 24) & 0xff,
    (lowBits >>> 16) & 0xff,
    (lowBits >>> 8) & 0xff,
    lowBits & 0xff
  );

  // Valores iniciais H0-H7
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let chunk = 0; chunk < utf8.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      const idx = chunk + i * 4;
      w[i] =
        (utf8[idx] << 24) |
        (utf8[idx + 1] << 16) |
        (utf8[idx + 2] << 8) |
        utf8[idx + 3];
    }
    for (let i = 16; i < 64; i++) {
      w[i] = (gamma1(w[i - 2]) + w[i - 7] + gamma0(w[i - 15]) + w[i - 16]) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const t1 = (h + sigma1(e) + ch(e, f, g) + K[i] + w[i]) >>> 0;
      const t2 = (sigma0(a) + maj(a, b, c)) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const toHex = (n: number) => n.toString(16).padStart(8, '0');
  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}`;
}

/**
 * Serialização Canônica Determinística (Canonical JSON).
 * Garante que a ordem das chaves seja sempre alfabética e sem espaços ou inconsistências de separador.
 */
export function canonicalJsonStringify(data: unknown): string {
  if (data === null || data === undefined) {
    return 'null';
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return JSON.stringify(data);
  }

  if (typeof data === 'string') {
    return JSON.stringify(data);
  }

  if (Array.isArray(data)) {
    const elements = data.map((item) => canonicalJsonStringify(item));
    return `[${elements.join(',')}]`;
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data as Record<string, unknown>).sort();
    const pairs: string[] = [];
    for (const key of keys) {
      const val = (data as Record<string, unknown>)[key];
      // Ignorar chaves indefinidas ou funções
      if (val !== undefined && typeof val !== 'function') {
        pairs.push(`${JSON.stringify(key)}:${canonicalJsonStringify(val)}`);
      }
    }
    return `{${pairs.join(',')}}`;
  }

  return JSON.stringify(String(data));
}

/**
 * Hash do bloco gênesis para inicialização da cadeia de auditoria.
 */
export const GENESIS_PREVIOUS_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
