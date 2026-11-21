"use client";

import { useState } from "react";
import { ChatMarkdown } from "@/components/chat-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import { ChatCitations } from "@/components/chat-citations";
import type { ChatMessageItem } from "@/app/module/chat/actions";

type ChatMessage = ChatMessageItem;

export function ChatView({
  repoId,
  repoName,
  initialMessages,
}: {
  repoId: string;
  repoName: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: text },
      { id: `assistant-${Date.now()}`, role: "assistant", content: "" , citations: [] },
    ]);
    setLoading(true);

    const setReply = (content: string, citations: ChatMessage["citations"]) =>
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content,
          citations,
        };
        return next;
      });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId, message: text }),
      });

      if (!res.ok || !res.body) {
        const errorText = await res.text().catch(() => "");
        setReply(`Something went wrong: ${errorText || res.statusText}`, []);
        return;
      }

      const citationsHeader = res.headers.get("X-Citations");
      const citations = citationsHeader ? JSON.parse(citationsHeader) : [];

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        reply += decoder.decode(value, { stream: true });
        setReply(reply, citations);
      }
    } catch {
      setReply("Something went wrong while streaming the reply.", []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ask anything about <strong>{repoName}</strong>. Example: &quot;How
            does auth work?&quot;
          </p>
        ) : (
          messages.map((msg, i) => (
            <Message key={msg.id} align={msg.role === "user" ? "end" : "start"}>
              <MessageContent>
                <Bubble
                  align={msg.role === "user" ? "end" : "start"}
                  variant={msg.role === "user" ? "default" : "muted"}
                >
                     <BubbleContent>
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <>
                        <ChatMarkdown
                          content={msg.content || "..."}
                          isAnimating={
                            loading &&
                            i === messages.length - 1 &&
                            msg.role === "assistant"
                          }
                        />
                        {!loading || i !== messages.length - 1 ? (
                          <ChatCitations citations={msg.citations ?? []} />
                        ) : null}
                      </>
                    )}
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this repo..."
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
        />
        <Button onClick={() => void sendMessage()} disabled={loading || !input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
