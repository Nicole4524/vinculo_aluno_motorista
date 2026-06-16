import { randomInt } from 'crypto';

// Sem caracteres ambíguos (0/O, 1/I) para facilitar leitura e digitação pelo aluno
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SUFFIX_LENGTH = 6;
const PREFIX = 'MTR';

export function gerarCodigoMotorista(): string {
  let sufixo = '';
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    sufixo += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${PREFIX}${sufixo}`;
}
