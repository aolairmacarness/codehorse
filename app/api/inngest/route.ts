import { serve } from "inngest/next";
import { inngest } from "@/app/module/indexing/inngest/client";
import { indexRepository } from "@/app/module/indexing/inngest/functions";
import { review } from "@/app/module/indexing/inngest/review";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [indexRepository, review],
});
