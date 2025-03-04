const crypto = require('crypto');

// Example of a fixed key and IV for demonstration purposes
// In practice, these should be stored securely and not hardcoded
const key = Buffer.from('01234567890123456789012345678901'); // 32 bytes key for AES-256
const iv = Buffer.from('0123456789012345'); // 16 bytes IV

function encrypt(text) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encryptedText) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { crypto, encrypt, decrypt };
