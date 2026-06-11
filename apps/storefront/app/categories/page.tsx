import { Reveal } from "@/components/ui/reveal";
import { CategoryCard } from "@/components/category/category-card";
import { productRepo } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Collections",
  description: "Browse every collection on the shelf.",
};

export default async function CategoriesPage() {
  const categories = await productRepo.listCategories();

  return (
    <div className="container-page py-12 md:py-20">
      <header className="flex flex-col gap-4">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Collections
        </p>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Every shelf,{" "}
          <span className="italic text-muted-foreground">in one place.</span>
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Browse all collections and step into the one that&rsquo;s calling you.
        </p>
      </header>

      {categories.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed p-12 text-center">
          <p className="text-sm font-medium">No collections yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Check back soon.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.05} y={16}>
              <CategoryCard
                category={c}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
