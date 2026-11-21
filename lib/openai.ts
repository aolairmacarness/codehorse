import OpenAI from "openai";

// Must match the dimension of the Pinecone index (PINECONE_INDEX).
export const EMBEDDING_DIMENSIONS = 512;

let client: OpenAI | undefined;

// Created lazily so importing this module (e.g. during `next build`) doesn't
// throw when OPENAI_API_KEY isn't set.
function getOpenAI() {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export async function embedText(texts: string[]) {
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data.map((item) => item.embedding);
}
