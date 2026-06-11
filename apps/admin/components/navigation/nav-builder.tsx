"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { setNavConfigAction } from "@/lib/nav-actions";
import {
  SIMPLE_MAX_ITEMS,
  type NavConfig,
  type NavItemConfig,
  type NavMode,
} from "@ecom/shared/nav";

export type CatNode = {
  id: string;
  name: string;
  children: { id: string; name: string }[];
};

const PICK = "__pick__";

export function NavBuilder({
  tree,
  initial,
}: {
  tree: CatNode[];
  initial: NavConfig;
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<NavMode>(initial.mode);
  const [items, setItems] = React.useState<NavItemConfig[]>(initial.items);
  const [pending, startTransition] = React.useTransition();

  const childrenByParent = React.useMemo(() => {
    const m = new Map<string, { id: string; name: string }[]>();
    for (const r of tree) m.set(r.id, r.children);
    return m;
  }, [tree]);

  /** All child ids of a (root) category, or [] for a leaf / childless root. */
  function childIdsFor(categoryId: string): string[] {
    return (childrenByParent.get(categoryId) ?? []).map((c) => c.id);
  }

  const isSimple = mode === "simple";
  const atMax = isSimple && items.length >= SIMPLE_MAX_ITEMS;

  function update(i: number, patch: Partial<NavItemConfig>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function remove(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }
  function add() {
    setItems((prev) => [...prev, { categoryId: "" }]);
  }

  function toggleChild(i: number, childId: string) {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const set = new Set(it.childIds ?? []);
        if (set.has(childId)) set.delete(childId);
        else set.add(childId);
        return { ...it, childIds: [...set] };
      }),
    );
  }

  function save() {
    // Drop unfinished rows (no category chosen).
    const clean = items.filter((it) => it.categoryId);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("config", JSON.stringify({ mode, items: clean }));
      const res = await setNavConfigAction(fd);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Navigation updated");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>Mode</Label>
        <Tabs value={mode} onValueChange={(v) => setMode(v as NavMode)}>
          <TabsList>
            <TabsTrigger value="simple">Simple</TabsTrigger>
            <TabsTrigger value="mega">Mega menu</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-xs text-muted-foreground">
          {isSimple
            ? `A "Shop" button plus up to ${SIMPLE_MAX_ITEMS} category links.`
            : "A “Shop” button plus category links; top-level categories can open a dropdown of their sub-categories."}
        </p>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No nav items yet. Add one below. (A &ldquo;Shop&rdquo; link always
            appears first on the storefront.)
          </p>
        ) : null}

        {items.map((item, i) => {
          const children = childrenByParent.get(item.categoryId) ?? [];
          const isParentWithChildren = children.length > 0;
          const showChildren = !isSimple && isParentWithChildren;
          const checkedCount = (item.childIds ?? []).length;
          return (
            <div key={i} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={item.categoryId || PICK}
                      onValueChange={(v) => {
                        const id = v === PICK ? "" : v;
                        // Picking a top-level category with children defaults to
                        // a dropdown showing all of them (uncheck to trim, or
                        // uncheck all for a plain link).
                        update(i, { categoryId: id, childIds: childIdsFor(id) });
                      }}
                    >
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue placeholder="Choose a category…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PICK}>Choose a category…</SelectItem>
                        {tree.map((root) => [
                          <SelectItem key={root.id} value={root.id}>
                            {root.name}
                          </SelectItem>,
                          ...root.children.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {root.name} › {c.name}
                            </SelectItem>
                          )),
                        ])}
                      </SelectContent>
                    </Select>
                    {item.categoryId && !isSimple ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {isParentWithChildren
                          ? checkedCount > 0
                            ? "Opens a dropdown with the checked sub-links below."
                            : "Plain link (check sub-links below to make it a dropdown)."
                          : "Plain link. Pick a top-level category to build a dropdown."}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <Label className="text-xs">Label (optional)</Label>
                    <Input
                      className="mt-1"
                      value={item.label ?? ""}
                      placeholder="Defaults to category name"
                      onChange={(e) => update(i, { label: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1 pt-5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(i)}
                    aria-label="Remove"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>

              {showChildren ? (
                <div className="rounded-md bg-muted/40 p-3">
                  <p className="mb-0.5 text-xs font-medium">Dropdown sub-links</p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Checked items appear in this dropdown. Uncheck all for a plain link.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {children.map((c) => {
                      const checked = (item.childIds ?? []).includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleChild(i, c.id)}
                          />
                          {c.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={add} disabled={atMax}>
          <Plus /> Add item
        </Button>
        {atMax ? (
          <span className="text-xs text-muted-foreground">
            Simple mode allows up to {SIMPLE_MAX_ITEMS} items.
          </span>
        ) : null}
      </div>

      <Button onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save navigation"}
      </Button>
    </div>
  );
}
