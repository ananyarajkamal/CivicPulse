"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMeApi, loginApi, refreshTokenApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LockIcon } from "@/components/ui/Icons";

export default function StaffLoginPage() {
  const router = useRouter();
  const { isAuthenticated, setAuth } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      router.push("/dashboard");
      return;
    }

    refreshTokenApi()
      .then(async (tokenRes) => {
        const user = await getMeApi(tokenRes.access_token);
        if (isMounted) {
          setAuth(user, tokenRes.access_token);
          router.push("/dashboard");
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, setAuth, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const tokenRes = await loginApi({ email, password });
      const user = await getMeApi(tokenRes.access_token);
      setAuth(user, tokenRes.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred during staff login. Please check credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F5F1E8] text-[#161616]">
      {/* Left Split Panel (~50% Desktop): Dark Charcoal & Architectural Overlay */}
      <div className="lg:w-1/2 bg-[#292724] text-[#FBFAF7] relative overflow-hidden flex flex-col justify-between p-8 lg:p-16 border-b lg:border-b-0 lg:border-r border-[#161616] min-h-[320px] lg:min-h-screen">
        {/* Background Architectural Image */}
        <div className="absolute inset-0 z-0 opacity-25">
          <Image
            src="/images/dark-architecture.png"
            alt="Dark Architecture Texture"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center"
          />
        </div>

        <div className="relative z-10 space-y-6">
          <Logo variant="darkFooter" size="lg" showTagline />

          <div className="space-y-4 pt-12 max-w-md">
            <span className="font-sans text-xs font-semibold tracking-widest uppercase text-[#B7A58A] bg-[#161616]/60 px-3 py-1 rounded-xs border border-[#5D5A55]/50 inline-block">
              MUNICIPAL OPERATIONS
            </span>

            <h1 className="font-serif-civic text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-[#FBFAF7]">
              City operations begin with accountability.
            </h1>

            <p className="font-sans text-sm sm:text-base text-[#D6CFC3] leading-relaxed">
              Secure operational access for municipal department officers, triage personnel, and city administrators.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-8 font-sans text-xs text-[#D6CFC3]/80 flex items-center justify-between border-t border-[#5D5A55]/40">
          <Link href="/" className="hover:text-[#FBFAF7] transition-colors">
            ← Return to Public Portal
          </Link>
          <span>CivicPulse Platform</span>
        </div>
      </div>

      {/* Right Split Panel (~50% Desktop): Warm Ivory Staff Sign-In Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <Card variant="primary" padding="lg" className="w-full max-w-md border-[#D6CFC3] shadow-civic space-y-6">
          <div className="space-y-2 border-b border-[#D6CFC3] pb-4">
            <h2 className="font-serif-civic text-3xl font-bold text-[#161616]">
              Staff Sign In
            </h2>
            <p className="font-sans text-xs text-[#5D5A55]">
              Access complaint operations, workflow routing, and city intelligence.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-[#EAE4DA] border border-[#292724] text-[#161616] text-xs font-semibold rounded-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block font-sans text-xs font-semibold uppercase tracking-wider text-[#161616] mb-1.5"
              >
                Official Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@civicpulse.gov"
                className="w-full px-4 py-2.5 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-[#161616] font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#B7A58A]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block font-sans text-xs font-semibold uppercase tracking-wider text-[#161616] mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-[#161616] font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#B7A58A]"
              />
            </div>

            <Button
              type="submit"
              variant="dark"
              size="lg"
              disabled={loading}
              className="w-full justify-center shadow-civic"
            >
              {loading ? "Authenticating..." : "Sign In to Operations →"}
            </Button>
          </form>

          <div className="pt-2 flex items-center justify-center gap-2 text-xs font-sans text-[#5D5A55] border-t border-[#D6CFC3]">
            <LockIcon className="w-3.5 h-3.5 text-[#292724]" />
            <span>Authorized municipal personnel only.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
