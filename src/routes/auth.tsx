import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/Logo";
import { supabase } from "@/integrations/supabase/client";
import { dashboardPathForRole, fetchUserRole } from "@/lib/auth";
import { pesanGagalDaftar } from "@/lib/pesan-daftar";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk atau Daftar — Okta Car Rent" },
      {
        name: "description",
        content:
          "Masuk ke akun Okta Car Rent atau daftar akun baru untuk mengelola sewa mobil, pembayaran, dan deposit.",
      },
      { property: "og:title", content: "Masuk atau Daftar — Okta Car Rent" },
      {
        property: "og:description",
        content: "Akses dashboard Okta Car Rent sesuai peran Anda: pemilik, admin, atau penyewa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Format email tidak valid").max(255);
const passwordSchema = z.string().min(8, "Kata sandi minimal 8 karakter").max(72);

const daftarSchema = z.object({
  full_name: z.string().trim().min(3, "Nama lengkap minimal 3 karakter").max(100),
  phone: z.string().trim().min(8, "Nomor telepon tidak valid").max(20),
  email: emailSchema,
  password: passwordSchema,
});

function AuthPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<"masuk" | "daftar">("masuk");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const user = data.session?.user;
      if (!user) {
        setChecking(false);
        return;
      }
      const role = await fetchUserRole(user.id);
      navigate({ to: dashboardPathForRole(role), replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
        <p className="text-base text-muted-foreground">Memuat…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary px-4 py-10">
      <Link to="/" className="mb-6">
        <Logo />
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Selamat datang</CardTitle>
          <CardDescription className="text-base">
            Masuk dengan email dan kata sandi, atau daftar akun baru.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 rounded-md bg-secondary p-1">
            {(["masuk", "daftar"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                aria-pressed={tab === item}
                className={`rounded-md px-3 py-2 text-base font-semibold transition-colors ${
                  tab === item
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item === "masuk" ? "Masuk" : "Daftar"}
              </button>
            ))}
          </div>
          <div className="mt-6">{tab === "masuk" ? <FormMasuk /> : <FormDaftar />}</div>
        </CardContent>
      </Card>

      <Link to="/" className="mt-6 text-base font-medium text-primary hover:underline">
        ← Kembali ke beranda
      </Link>
    </div>
  );
}

function FormMasuk() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.object({ email: emailSchema, password: z.string().min(1, "Kata sandi wajib diisi") })
      .safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      setLoading(false);
      toast.error(
        error.message.toLowerCase().includes("invalid")
          ? "Email atau kata sandi salah."
          : error.message,
      );
      return;
    }

    const role = await fetchUserRole(data.user!.id);
    toast.success("Berhasil masuk.");
    navigate({ to: dashboardPathForRole(role), replace: true });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="masuk-email" className="text-base">
          Email
        </Label>
        <Input
          id="masuk-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
          className="h-11 text-base"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="masuk-password" className="text-base">
          Kata sandi
        </Label>
        <Input
          id="masuk-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 text-base"
          required
        />
      </div>
      <div className="text-right">
        <Link to="/lupa-password" className="text-sm font-medium text-primary hover:underline">
          Lupa kata sandi?
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full text-base" disabled={loading}>
        {loading ? "Memproses…" : "Masuk"}
      </Button>
    </form>
  );
}

function FormDaftar() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = daftarSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { full_name: parsed.data.full_name, phone: parsed.data.phone },
      },
    });
    setLoading(false);

    if (error) {
      console.error("[daftar] sign-up gagal", error);
      toast.error(pesanGagalDaftar(error));
      return;
    }

    if (data.session?.user) {
      const role = await fetchUserRole(data.session.user.id);
      toast.success("Pendaftaran berhasil. Selamat datang!");
      navigate({ to: dashboardPathForRole(role), replace: true });
      return;
    }

    toast.success("Pendaftaran berhasil. Anda bisa langsung masuk.");
    setForm({ full_name: "", phone: "", email: "", password: "" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="daftar-nama" className="text-base">
          Nama lengkap
        </Label>
        <Input
          id="daftar-nama"
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          className="h-11 text-base"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="daftar-telp" className="text-base">
          Nomor telepon
        </Label>
        <Input
          id="daftar-telp"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="0812xxxxxxx"
          className="h-11 text-base"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="daftar-email" className="text-base">
          Email
        </Label>
        <Input
          id="daftar-email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="nama@email.com"
          className="h-11 text-base"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="daftar-password" className="text-base">
          Kata sandi
        </Label>
        <Input
          id="daftar-password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          className="h-11 text-base"
          required
        />
        <p className="text-sm text-muted-foreground">
          Minimal 8 karakter. Gunakan kata sandi unik yang mudah diingat, misalnya gabungan 3 kata
          acak — jangan pakai kata sandi yang sama dengan akun lain.
        </p>
      </div>
      <Button type="submit" size="lg" className="w-full text-base" disabled={loading}>
        {loading ? "Memproses…" : "Daftar"}
      </Button>
    </form>
  );
}