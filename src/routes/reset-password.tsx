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

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Atur Ulang Kata Sandi — Okta Car Rent" },
      {
        name: "description",
        content: "Buat kata sandi baru untuk akun Okta Car Rent Anda melalui tautan pemulihan.",
      },
      { property: "og:title", content: "Atur Ulang Kata Sandi — Okta Car Rent" },
      {
        property: "og:description",
        content: "Selesaikan proses pemulihan akun dengan membuat kata sandi baru.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [siap, setSiap] = useState(false);
  const [memeriksa, setMemeriksa] = useState(true);
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setSiap(true);
        setMemeriksa(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSiap(true);
      setMemeriksa(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z
      .object({
        password: z.string().min(8, "Kata sandi minimal 8 karakter").max(72),
        konfirmasi: z.string(),
      })
      .refine((v) => v.password === v.konfirmasi, {
        message: "Konfirmasi kata sandi tidak sama",
        path: ["konfirmasi"],
      })
      .safeParse({ password, konfirmasi });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Kata sandi berhasil diperbarui. Silakan masuk kembali.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary px-4 py-10">
      <Link to="/" className="mb-6">
        <Logo />
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Kata sandi baru</CardTitle>
          <CardDescription className="text-base">
            Buat kata sandi baru untuk akun Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {memeriksa ? (
            <p className="text-base text-muted-foreground">Memeriksa tautan…</p>
          ) : !siap ? (
            <div className="space-y-4">
              <p className="text-base text-foreground">
                Tautan pemulihan tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.
              </p>
              <Button asChild size="lg" className="w-full text-base">
                <Link to="/lupa-password">Minta tautan baru</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw-baru" className="text-base">
                  Kata sandi baru
                </Label>
                <Input
                  id="pw-baru"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw-konfirmasi" className="text-base">
                  Ulangi kata sandi
                </Label>
                <Input
                  id="pw-konfirmasi"
                  type="password"
                  autoComplete="new-password"
                  value={konfirmasi}
                  onChange={(e) => setKonfirmasi(e.target.value)}
                  className="h-11 text-base"
                  required
                />
              </div>
              <Button type="submit" size="lg" className="w-full text-base" disabled={loading}>
                {loading ? "Menyimpan…" : "Simpan kata sandi"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}