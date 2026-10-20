import { Button } from "@/components/ui/Button";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-card bg-warn-soft p-5">
      <p className="font-bold text-warn">Couldn't load this</p>
      <p className="mt-1 text-[15px] text-ink-2">{message}</p>
      <Button variant="secondary" className="mt-4" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
