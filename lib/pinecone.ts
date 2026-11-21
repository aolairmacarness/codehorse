import { Pinecone } from "@pinecone-database/pinecone";

let pinecone: Pinecone | undefined;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

// Created lazily so importing this module (e.g. during `next build`) doesn't
// throw when the Pinecone env vars aren't set.
export function getIndex() {
  pinecone ??= new Pinecone({ apiKey: requiredEnv("PINECONE_API_KEY") });
  return pinecone.index({ name: requiredEnv("PINECONE_INDEX") });
}
