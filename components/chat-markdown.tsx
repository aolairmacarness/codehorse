"use client";

import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import "streamdown/styles.css";

export function ChatMarkdown({
  content,
  isAnimating = true,
}: {
  content: string;
  isAnimating?: boolean;
}) {
  return (
    <Streamdown
      mode={isAnimating ? "streaming" : "static"}
      plugins={{ code }}
      isAnimating={isAnimating}
      className="text-sm leading-relaxed [&_p]:my-2 [&_pre]:my-3 [&_pre]:overflow-x-auto"
    >
      {content}
    </Streamdown>
  );
}
