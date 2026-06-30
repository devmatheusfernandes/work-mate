import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Retorna a chave de criptografia de 32 bytes do ambiente.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("A variável de ambiente ENCRYPTION_KEY não está definida.");
  }
  
  const buffer = Buffer.from(key, "hex");
  if (buffer.length !== 32) {
    throw new Error("A chave ENCRYPTION_KEY deve ter 32 bytes (64 caracteres hexadecimais).");
  }
  
  return buffer;
}

/**
 * Criptografa um texto (PII) usando AES-256-GCM.
 * Retorna o texto formatado como ivHex:authTagHex:encryptedHex.
 * 
 * @param text O texto puro a ser criptografado.
 * @returns string criptografada
 */
export function encryptText(text: string): string;
export function encryptText(text: null | undefined): null;
export function encryptText(text: string | null | undefined): string | null;
export function encryptText(text: string | null | undefined): string | null {
  if (!text) return null;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Descriptografa um texto que foi criptografado com encryptText.
 * 
 * @param hash A string no formato ivHex:authTagHex:encryptedHex.
 * @returns string em texto puro
 */
export function decryptText(hash: string): string;
export function decryptText(hash: null | undefined): null;
export function decryptText(hash: string | null | undefined): string | null;
export function decryptText(hash: string | null | undefined): string | null {
  if (!hash) return null;
  
  const parts = hash.split(":");
  if (parts.length !== 3) {
    console.error("Tentativa de descriptografar dado que não está no formato correto de cifra.");
    return "[Conteúdo em formato inválido ou não criptografado]";
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivHex, "hex")
    );
    
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("Falha ao descriptografar dado sensível.", error);
    return "[Erro de chave ou dado corrompido ao descriptografar]";
  }
}
