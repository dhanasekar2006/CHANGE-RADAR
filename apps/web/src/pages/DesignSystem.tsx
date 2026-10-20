import { Bell, Mail, Moon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListRow } from "@/components/ui/ListRow";
import { PriceTag } from "@/components/ui/PriceTag";
import { Skeleton } from "@/components/ui/Skeleton";
import { Sparkline } from "@/components/ui/Sparkline";
import { Toast } from "@/components/ui/Toast";
import { Toggle } from "@/components/ui/Toggle";

const noop = () => undefined;

/** Dev-only gallery of the UI primitives. Routed only when import.meta.env.DEV. */
export function DesignSystem() {
  const [emailOn, setEmailOn] = useState(true);
  const [dark, setDark] = useState(false);

  const toggleTheme = (next: boolean) => {
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
  };

  return (
    <div className="min-h-full bg-canvas px-4 py-10 text-ink sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <h1 className="text-[32px] font-extrabold leading-[38px]">Design system</h1>

        <Card className="flex flex-wrap items-center gap-3">
          <Button>Get started</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="ghost">Skip</Button>
          <Button disabled>Disabled</Button>
          <IconButton label="Notifications">
            <Bell size={20} strokeWidth={1.75} aria-hidden />
          </IconButton>
        </Card>

        <Card className="flex flex-wrap items-center gap-3">
          <Badge tone="dark">40%</Badge>
          <Badge tone="good">Lowest in 90 days</Badge>
          <Badge tone="warn">Price rose</Badge>
          <Badge tone="accent">Best</Badge>
          <Badge>Watching</Badge>
        </Card>

        <Card className="flex flex-wrap items-center gap-8">
          <PriceTag price={24999} oldPrice={29999} changePct={-16.7} size="lg" />
          <PriceTag price={1299} oldPrice={1199} changePct={8.3} />
          <Sparkline values={[12, 14, 13, 17, 15, 11, 9, 10]} label="Price trend, falling" />
        </Card>

        <Card className="flex flex-col">
          <ListRow icon={Mail} label="Email alerts" action={<Toggle label="Email alerts" checked={emailOn} onChange={setEmailOn} />} />
          <ListRow icon={Moon} label="Dark mode" action={<Toggle label="Dark mode" checked={dark} onChange={toggleTheme} />} />
          <ListRow icon={Bell} label="Alerts" value="3 active" to="/prices/alerts" />
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <EmptyState title="No alerts yet" hint="Set a target price and we'll tell you when it's reached.">
          <Button>Set an alert</Button>
        </EmptyState>
        <ErrorState message="Can't reach the server." onRetry={noop} />
        <Toast tone="success" title="Alert created" body="We'll notify you at ₹24,000." onDismiss={noop} />
      </div>
    </div>
  );
}
