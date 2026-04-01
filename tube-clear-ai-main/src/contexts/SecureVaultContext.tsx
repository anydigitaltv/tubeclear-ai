import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// Secure Vault - Encrypted storage that root users cannot easily access
// Uses obfuscation and encryption to protect sensitive data

interface SecureVaultContextType {
  setItem: (key: string, value: any) => Promise<void>;
  getItem: <T>(key: string) => Promise<T | null>;
  removeItem: (key: string) => Promise<void>;
  clearAll: () => Promise<void>;
  isTampered: () => boolean;
}

const VAULT_PREFIX = "__vault__";
const CHECKSUM_KEY = "__vault_checksums";

// Simple XOR encryption with rotating key
const generateVaultKey = (key: string): string => {
  const baseKey = "tubeclear_secure_vault_2024";
  return `${baseKey}_${key}`;
};

const xorEncrypt = (data: string, key: string): string => {
  let result = "";
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode ^ keyChar);
  }
  return btoa(result); // Base64 encode
};

const xorDecrypt = (encrypted: string, key: string): string => {
  try {
    const decoded = atob(encrypted);
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode ^ keyChar);
    }
    return result;
  } catch {
    return "";
  }
};

// Calculate checksum for tamper detection
const calculateChecksum = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

const SecureVaultContext = createContext<SecureVaultContextType | undefined>(undefined);

export const SecureVaultProvider = ({ children }: { children: ReactNode }) => {
  const [checksums, setChecksums] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(CHECKSUM_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const saveChecksums = useCallback((newChecksums: Record<string, string>) => {
    localStorage.setItem(CHECKSUM_KEY, JSON.stringify(newChecksums));
    setChecksums(newChecksums);
  }, []);

  const setItem = useCallback(async (key: string, value: any): Promise<void> => {
    try {
      const vaultKey = generateVaultKey(key);
      const serializedValue = JSON.stringify(value);
      
      // Encrypt the value
      const encryptedValue = xorEncrypt(serializedValue, vaultKey);
      
      // Calculate checksum
      const checksum = calculateChecksum(serializedValue);
      
      // Store with prefix
      localStorage.setItem(`${VAULT_PREFIX}${key}`, encryptedValue);
      
      // Save checksum
      const newChecksums = { ...checksums, [key]: checksum };
      saveChecksums(newChecksums);
    } catch (error) {
      console.error("SecureVault setItem error:", error);
    }
  }, [checksums, saveChecksums]);

  const getItem = useCallback(async <T,>(key: string): Promise<T | null> => {
    try {
      const vaultKey = generateVaultKey(key);
      const encryptedValue = localStorage.getItem(`${VAULT_PREFIX}${key}`);
      
      if (!encryptedValue) return null;
      
      // Decrypt
      const decryptedValue = xorDecrypt(encryptedValue, vaultKey);
      
      if (!decryptedValue) return null;
      
      // Verify checksum
      const currentChecksum = calculateChecksum(decryptedValue);
      const storedChecksum = checksums[key];
      
      if (storedChecksum && currentChecksum !== storedChecksum) {
        console.warn(`[SECURE VAULT] Checksum mismatch for ${key}. Data may be tampered.`);
        return null;
      }
      
      return JSON.parse(decryptedValue) as T;
    } catch {
      return null;
    }
  }, [checksums]);

  const removeItem = useCallback(async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(`${VAULT_PREFIX}${key}`);
      
      // Remove checksum
      const newChecksums = { ...checksums };
      delete newChecksums[key];
      saveChecksums(newChecksums);
    } catch (error) {
      console.error("SecureVault removeItem error:", error);
    }
  }, [checksums, saveChecksums]);

  const clearAll = useCallback(async (): Promise<void> => {
    try {
      // Clear all vault items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(VAULT_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear checksums
      localStorage.removeItem(CHECKSUM_KEY);
      setChecksums({});
    } catch (error) {
      console.error("SecureVault clearAll error:", error);
    }
  }, []);

  const isTampered = useCallback((): boolean => {
    // Check if any stored item's checksum doesn't match
    const vaultKeys = Object.keys(localStorage).filter(k => k.startsWith(VAULT_PREFIX));
    
    for (const vaultKey of vaultKeys) {
      const originalKey = vaultKey.substring(VAULT_PREFIX.length);
      const encryptedValue = localStorage.getItem(vaultKey);
      
      if (!encryptedValue) continue;
      
      const vaultKeyName = generateVaultKey(originalKey);
      const decryptedValue = xorDecrypt(encryptedValue, vaultKeyName);
      
      if (!decryptedValue) continue;
      
      const currentChecksum = calculateChecksum(decryptedValue);
      const storedChecksum = checksums[originalKey];
      
      if (storedChecksum && currentChecksum !== storedChecksum) {
        console.error(`[SECURE VAULT BREACH] Tampering detected for ${originalKey}`);
        return true;
      }
    }
    
    return false;
  }, [checksums]);

  return (
    <SecureVaultContext.Provider
      value={{
        setItem,
        getItem,
        removeItem,
        clearAll,
        isTampered,
      }}
    >
      {children}
    </SecureVaultContext.Provider>
  );
};

export const useSecureVault = () => {
  const ctx = useContext(SecureVaultContext);
  if (!ctx) throw new Error("useSecureVault must be used within SecureVaultProvider");
  return ctx;
};

// Helper function to migrate existing localStorage items to secure vault
export const migrateToSecureVault = async (keys: string[]) => {
  const vault = useSecureVault();
  
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        const parsed = JSON.parse(value);
        await vault.setItem(key, parsed);
        localStorage.removeItem(key);
      } catch {
        // Not JSON, store as-is
        await vault.setItem(key, value);
        localStorage.removeItem(key);
      }
    }
  }
};
