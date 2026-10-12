import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/lupa-password")({
  head: () => ({
    meta: [
      { title: "Lupa Kata Sandi — Okta Car Rent" },
      {
        name: "description",
        content:
          "Kirim tautan pemulihan kata sandi ke email Anda untuk mengakses kembali akun Okta Car Rent.",
      },
      { property: "og:title", content: "Lupa Kata Sandi — Okta Car Rent" },
      {
        property: "og:description",
        content: "Pulihkan akses akun Okta Car Rent melalui email pemulihan kata sandi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LupaPasswordPage,
});

function LupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [terkirim, setTerkirim] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().email("Format email tidak valid").safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setTerkirim(true);
    toast.success("Tautan pemulihan sudah dikirim.");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary px-4 py-10">
      <Link to="/" className="mb-6">
        <Logo />
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Lupa kata sandi</CardTitle>
          <CardDescription className="text-base">
            Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat kata sandi baru.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {terkirim ? (
            <div className="space-y-4">
              <p className="text-base text-foreground">
                Email pemulihan sudah dikirim ke <strong>{email}</strong>. Silakan periksa kotak
                masuk atau folder spam.
              </p>
              <Button asChild size="lg" className="w-full text-base">
                <Link to="/auth">Kembali ke halaman masuk</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lupa-email" className="text-base">
                  Email
                </Label>
                <Input
                  id="lupa-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="h-11 text-base"
                  required
                />
              </div>
              <Button type="submit" size="lg" className="w-full text-base" disabled={loading}>
                {loading ? "Mengirim…" : "Kirim tautan pemulihan"}
              </Button>
              <div className="text-center">
                <Link to="/auth" className="text-sm font-medium text-primary hover:underline">
                  Kembali ke halaman masuk
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}