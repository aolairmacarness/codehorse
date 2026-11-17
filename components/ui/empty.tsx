import { cn } from "@/lib/utils";

export function Empty({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl px-6 py-12 text-center",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      {...props}
    />
  );
}

export function EmptyMedia({
  className,
  ...props
}: React.ComponentProps<"div"> & { variant?: "icon" }) {
  return (
    <div
      className={cn(
        "flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-base font-medium", className)} {...props} />;
}

export function EmptyDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("max-w-sm text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function EmptyContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("flex gap-2", className)} {...props} />;
}
