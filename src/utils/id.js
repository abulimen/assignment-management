// Deterministic, salt-based, bi-directional integer obfuscation for public URLs.
// Generates clean, unguessable, non-sequential alphanumeric IDs (length 6)
// so internal auto-increment database keys (1, 2, 3...) are not exposed in URLs.

const DEFAULT_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SALT = 'draftly_assignment_mgmt_salt_2026';
const MIN_LENGTH = 6;

function shuffleAlphabet(alphabet, salt) {
  const chars = alphabet.split('');
  let v = 0;
  let p = 0;
  for (let i = chars.length - 1; i > 0; i--) {
    v = (v + salt.charCodeAt(p % salt.length) + i) % chars.length;
    p++;
    const temp = chars[i];
    chars[i] = chars[v];
    chars[v] = temp;
  }
  return chars.join('');
}

const SHUFFLED = shuffleAlphabet(DEFAULT_ALPHABET, SALT);
const BASE = SHUFFLED.length;

function scramble(num) {
  let n = (num ^ 0x5bf03635) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b) >>> 0;
  n = (n ^ (n >>> 16)) >>> 0;
  return n;
}

function unscramble(num) {
  let n = num >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x119de1f3) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x119de1f3) >>> 0;
  n = (n ^ (n >>> 16)) >>> 0;
  return (n ^ 0x5bf03635) >>> 0;
}

/**
 * Encodes a positive integer ID into an obfuscated alphanumeric string.
 * @param {number|string} id - Positive integer ID
 * @returns {string} Obfuscated ID (e.g. 'dYQcqT')
 */
export function encodeId(id) {
  const num = typeof id === 'string' ? parseInt(id, 10) : id;
  if (!num || isNaN(num) || num <= 0) return String(id || '');

  let n = scramble(num);
  let str = '';
  while (n > 0) {
    str = SHUFFLED[n % BASE] + str;
    n = Math.floor(n / BASE);
  }

  while (str.length < MIN_LENGTH) {
    str = SHUFFLED[0] + str;
  }

  return str;
}

/**
 * Decodes an obfuscated alphanumeric string back to the original integer ID.
 * Supports raw integer strings for backwards compatibility.
 * @param {string|number} str - Obfuscated ID or integer
 * @returns {number|null} Decoded positive integer or null if invalid
 */
export function decodeId(str) {
  if (typeof str === 'number') return str > 0 ? str : null;
  if (!str || typeof str !== 'string') return null;

  const trimmed = str.trim();
  if (!trimmed) return null;

  let num = 0;
  let isValidBase62 = true;
  for (let i = 0; i < trimmed.length; i++) {
    const idx = SHUFFLED.indexOf(trimmed[i]);
    if (idx === -1) {
      isValidBase62 = false;
      break;
    }
    num = num * BASE + idx;
  }

  if (isValidBase62 && num > 0) {
    const unscrambled = unscramble(num);
    if (unscrambled > 0 && unscrambled < 2147483647) {
      if (encodeId(unscrambled) === trimmed) {
        return unscrambled;
      }
    }
  }

  if (/^\d+$/.test(trimmed)) {
    const direct = parseInt(trimmed, 10);
    return direct > 0 ? direct : null;
  }

  return null;
}
