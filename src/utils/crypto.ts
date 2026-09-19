// Web Crypto API standard AES-GCM encryption & decryption for ANSAMA Finanzas

// Derive a cryptographic key from a password and salt using PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext string using password
export async function encryptData(plaintext: string, password: string): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const enc = new TextEncoder();
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    enc.encode(plaintext)
  );

  const payload = {
    app: 'ANSAMA_FINANZAS_PROTECTED',
    version: '1.0',
    cipher: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iterations: 100000,
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(encrypted)),
  };

  return JSON.stringify(payload, null, 2);
}

// Decrypt encrypted payload string using password
export async function decryptData(encryptedJsonStr: string, password: string): Promise<string> {
  let payload: any;
  try {
    payload = JSON.parse(encryptedJsonStr);
  } catch {
    throw new Error('El archivo no tiene un formato válido.');
  }

  if (payload.app !== 'ANSAMA_FINANZAS_PROTECTED' || !payload.ciphertext || !payload.salt || !payload.iv) {
    throw new Error('El archivo no es una copia protegida de ANSAMA Finanzas.');
  }

  const salt = new Uint8Array(payload.salt);
  const iv = new Uint8Array(payload.iv);
  const ciphertext = new Uint8Array(payload.ciphertext);

  const key = await deriveKey(password, salt);

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      ciphertext
    );
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    throw new Error('Contraseña incorrecta o archivo dañado.');
  }
}

// Hash password for local app lock verification (SHA-256)
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(password + '_ANSAMA_SALT_KEY'));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
