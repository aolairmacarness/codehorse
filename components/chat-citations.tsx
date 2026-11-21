import { Badge } from "@/components/ui/badge";

export function ChatCitations({
  citations,
}: {
  citations: { path: string; chunk: number }[];
}) {
  if (citations.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 border-t pt-2">
      <span className="text-xs text-muted-foreground">Sources:</span>
      {citations.map((citation) => (
        <Badge key={`${citation.path}-${citation.chunk}`} variant="outline">
          {citation.path}
          {citation.chunk > 0 ? `#${citation.chunk}` : ""}
        </Badge>
      ))}
    </div>
  );
}
