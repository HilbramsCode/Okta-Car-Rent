import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";

import { Logo } from "@/components/site/Logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-base text-muted-foreground">
            Layanan rental mobil harian, mingguan, dan bulanan untuk kebutuhan pribadi maupun
            perusahaan. Armada terawat, harga jelas, proses cepat.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold">Halaman</h2>
          <ul className="mt-3 space-y-2 text-base text-muted-foreground">
            <li><Link to="/armada" className="hover:text-primary">Armada</Link></li>
            <li><Link to="/layanan" className="hover:text-primary">Layanan</Link></li>
            <li><Link to="/syarat-ketentuan" className="hover:text-primary">Syarat &amp; Ketentuan</Link></li>
            <li><Link to="/tentang" className="hover:text-primary">Tentang Kami</Link></li>
            <li><Link to="/kontak" className="hover:text-primary">Kontak</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold">Hubungi Kami</h2>
          <ul className="mt-3 space-y-3 text-base text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin className="mt-1 size-4 shrink-0 text-primary" />
              Jl. Raya Pasar Minggu No. 88, Jakarta Selatan 12520
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-primary" />
              <a href="tel:+622150001234" className="hover:text-primary">(021) 5000-1234</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-primary" />
              <a href="mailto:halo@oktacarrent.id" className="hover:text-primary">halo@oktacarrent.id</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border py-4">
        <p className="mx-auto max-w-6xl px-4 text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Okta Car Rent. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}