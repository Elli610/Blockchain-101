export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return value;
}

export function fromBlock(): number {
  return Number(process.env.FROM_BLOCK || 0);
}
