import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const ALGORITHM = "pbkdf2-sha256";
const ITERATIONS = 310_000;
const KEY_LENGTH = 32;

export function hashAdminDeletionPassword(password: string) {
  if (password.length < 12 || password.length > 128)
    throw new Error("Silme şifresi 12-128 karakter arasında olmalıdır.");
  const salt = randomBytes(24);
  const digest = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha256");
  return [
    ALGORITHM,
    ITERATIONS,
    salt.toString("base64url"),
    digest.toString("base64url"),
  ].join("$");
}

export function verifyAdminDeletionPassword(
  password: string,
  encodedHash: string,
) {
  try {
    const [algorithm, iterationText, saltText, digestText] =
      encodedHash.split("$");
    const iterations = Number(iterationText);
    if (
      algorithm !== ALGORITHM ||
      iterations !== ITERATIONS ||
      !saltText ||
      !digestText ||
      password.length > 128
    )
      return false;
    const expected = Buffer.from(digestText, "base64url");
    if (expected.length !== KEY_LENGTH) return false;
    const actual = pbkdf2Sync(
      password,
      Buffer.from(saltText, "base64url"),
      iterations,
      KEY_LENGTH,
      "sha256",
    );
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
