import { Link } from "@tanstack/react-router";
import { Menu, Phone } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/site/Logo";
import { useAuthSession } from "@/lib/auth";

const menu = [
  { to: "/", label: "Beranda" },
  { to: "/armada", label: "Armada" },
  { to: "/layanan", label: "Layanan" },
  { to: "/syarat-ketentuan", label: "Syarat & Ketentuan" },
  { to: "/tentang", label: "Tentang Kami" },
  { to: "/kontak", label: "Kontak" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { session } = useAuthSession();
  const masuk = Boolean(session);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {menu.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-md px-3 py-2 text-base font-medium text-foreground transition-colors hover:bg-secondary"
              activeProps={{ className: "bg-secondary text-secondary-foreground font-semibold" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="lg" className="hidden text-base sm:inline-flex">
            <Link to={masuk ? "/dashboard" : "/auth"}>{masuk ? "Dashboard" : "Masuk"}</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Buka menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-6">
              <nav className="mt-8 flex flex-col gap-1">
                {menu.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-lg font-medium hover:bg-secondary"
                    activeProps={{ className: "bg-secondary font-semibold" }}
                    activeOptions={{ exact: item.to === "/" }}
                  >
                    {item.label}
                  </Link>
                ))}
                <Button asChild size="lg" className="mt-4 text-base">
                  <Link to={masuk ? "/dashboard" : "/auth"} onClick={() => setOpen(false)}>
                    {masuk ? "Dashboard" : "Masuk / Daftar"}
                  </Link>
                </Button>
                <a
                  href="tel:+622150001234"
                  className="mt-2 inline-flex items-center gap-2 rounded-md px-3 py-3 text-base font-medium text-primary"
                >
                  <Phone className="size-4" /> (021) 5000-1234
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}