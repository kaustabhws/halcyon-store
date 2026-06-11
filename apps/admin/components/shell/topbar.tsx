import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TopbarUser } from "./topbar-user";
import { MobileNav } from "./mobile-nav";
import { ModeToggle } from "@/components/theme/mode-toggle";

export function AdminTopbar({
  user,
  isMock,
  storefrontUrl,
}: {
  user: { fullName: string | null; email: string };
  isMock: boolean;
  storefrontUrl: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <MobileNav />
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search orders, products, customers…"
          className="pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {isMock ? (
          <Badge variant="warning" className="hidden sm:inline-flex">
            Mock auth
          </Badge>
        ) : null}
        <ModeToggle />
        <TopbarUser user={user} isMock={isMock} storefrontUrl={storefrontUrl} />
      </div>
    </header>
  );
}
