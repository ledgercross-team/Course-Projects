const crypto = require("crypto");
const fs = require("fs");
const { requireHexEnv } = require("../config/env");

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getKey() {
  const keyHex = requireHexEnv("AES_SECRET_KEY", 64);
  return Buffer.from(keyHex, "hex");
}

/// Encrypts a file on disk and writes the encrypted output to a new path.
/// The IV is prepended to the ciphertext so it can be recovered on decrypt.
function encryptFile(inputPath, outputPath) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    output.write(iv); // prepend IV

    input.pipe(cipher).pipe(output);

    output.on("finish", () => resolve(outputPath));
    output.on("error", reject);
    input.on("error", reject);
  });
}

/// Decrypts a file previously encrypted with encryptFile().
function decryptFile(inputPath, outputPath) {
  const key = getKey();

  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(inputPath);

    let iv = Buffer.alloc(0);
    let ivCaptured = false;
    let decipher;
    const output = fs.createWriteStream(outputPath);

    input.on("data", (chunk) => {
      if (!ivCaptured) {
        const needed = IV_LENGTH - iv.length;
        const take = chunk.slice(0, needed);
        iv = Buffer.concat([iv, take]);

        if (iv.length === IV_LENGTH) {
          ivCaptured = true;
          decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
          const rest = chunk.slice(needed);
          if (rest.length) output.write(decipher.update(rest));
        }
      } else {
        output.write(decipher.update(chunk));
      }
    });

    input.on("end", () => {
      if (decipher) output.write(decipher.final());
      output.end();
    });

    output.on("finish", () => resolve(outputPath));
    input.on("error", reject);
    output.on("error", reject);
  });
}

module.exports = { encryptFile, decryptFile };
