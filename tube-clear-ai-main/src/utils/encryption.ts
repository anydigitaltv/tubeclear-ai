/**
 * AES-256-GCM Encryption Utility
 * Military-grade encryption for API keys using Web Crypto API
 */

const ENCRYPTION_KEY_STORAGE = 'tubeclear_encryption_key';

/**
 * Generate a random encryption key (AES-256-GCM)
 */
const generateEncryptionKey = async (): Promise<CryptoKey> => {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
};

/**
 * Export encryption key to localStorage (as JWK)
 */
const exportKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(exported);
};

/**
 * Import encryption key from localStorage
 */
const importKey = async (jwkString: string): Promise<CryptoKey> => {
  const jwk = JSON.parse(jwkString);
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

/**
 * Get or create encryption key
 */
const getEncryptionKey = async (): Promise<CryptoKey> => {
  try {
    const stored = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
    if (stored) {
      return await importKey(stored);
    }
    
    // Generate new key
    const key = await generateEncryptionKey();
    const exported = await exportKey(key);
    localStorage.setItem(ENCRYPTION_KEY_STORAGE, exported);
    return key;
  } catch (error) {
    console.error('Encryption key error:', error);
    throw error;
  }
};

/**
 * Encrypt data using AES-256-GCM
 * Returns: { encrypted: string, iv: string }
 */
export const encryptData = async (text: string): Promise<{ encrypted: string; iv: string }> => {
  try {
    const key = await getEncryptionKey();
    const encoded = new TextEncoder().encode(text);
    
    // Generate random IV (Initialization Vector)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encoded
    );
    
    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
};

/**
 * Decrypt data using AES-256-GCM
 */
export const decryptData = async (encryptedBase64: string, ivBase64: string): Promise<string> => {
  try {
    const key = await getEncryptionKey();
    
    const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error;
  }
};

/**
 * Encrypt API key before storing in Supabase
 */
export const encryptAPIKey = async (apiKey: string): Promise<{ encrypted: string; iv: string }> => {
  return await encryptData(apiKey);
};

/**
 * Decrypt API key from Supabase
 */
export const decryptAPIKey = async (encryptedKey: string, iv: string): Promise<string> => {
  return await decryptData(encryptedKey, iv);
};

/**
 * Calculate checksum for tamper detection
 */
export const calculateChecksum = async (data: string): Promise<string> => {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Verify data integrity
 */
export const verifyIntegrity = async (data: string, expectedChecksum: string): Promise<boolean> => {
  const actualChecksum = await calculateChecksum(data);
  return actualChecksum === expectedChecksum;
};
