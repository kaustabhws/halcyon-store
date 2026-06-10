import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DeleteCouponButton } from "@/components/coupons/delete-button";
import { formatPrice, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const coupons = await prisma.coupon.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 p-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Marketing
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Coupons</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {coupons.length} active. Customers redeem these at checkout.
          </p>
        </div>
        <Button asChild>
          <Link href="/coupons/new">
            <Plus /> New coupon
          </Link>
        </Button>
      </header>

      <Card className="py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="px-4 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => {
                const expired = c.validTo && c.validTo < new Date();
                const exhausted =
                  c.maxRedemptions != null &&
                  c.redemptionsCount >= c.maxRedemptions;
                const status = !c.active
                  ? { label: "Inactive", variant: "default" as const }
                  : expired
                    ? { label: "Expired", variant: "danger" as const }
                    : exhausted
                      ? { label: "Used up", variant: "warning" as const }
                      : { label: "Live", variant: "success" as const };

                return (
                  <TableRow key={c.id}>
                    <TableCell className="px-4 font-mono text-xs">
                      <Link
                        href={`/coupons/${c.id}/edit`}
                        className="hover:underline"
                      >
                        {c.code}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{c.type}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {c.type === "PERCENT"
                        ? `${c.value}%`
                        : c.type === "FIXED"
                          ? formatPrice(BigInt(c.value), c.currency ?? "INR")
                          : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {c.redemptionsCount}
                      {c.maxRedemptions != null
                        ? ` / ${c.maxRedemptions}`
                        : ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.validFrom || c.validTo
                        ? `${c.validFrom ? formatDate(c.validFrom) : "—"} → ${c.validTo ? formatDate(c.validTo) : "—"}`
                        : "Anytime"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Edit"
                        >
                          <Link href={`/coupons/${c.id}/edit`}>
                            <Pencil />
                          </Link>
                        </Button>
                        <DeleteCouponButton couponId={c.id} code={c.code} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {coupons.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No coupons yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
