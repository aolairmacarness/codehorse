import { serve } from "inngest/next";
import { inngest } from "@/app/module/indexing/inngest/client";
import { indexRepository } from "@/app/module/indexing/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [indexRepository],
});
