"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Invalid password");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="ambient-bg" />
      <motion.div
        className="ambient-blob"
        style={{
          width: 700,
          height: 700,
          top: -250,
          right: -200,
          background: "radial-gradient(circle, rgba(242,116,5,0.08) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="ambient-blob"
        style={{
          width: 500,
          height: 500,
          bottom: -200,
          left: -150,
          background: "radial-gradient(circle, rgba(32,135,142,0.07) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />

      {/* Card */}
      <motion.div
        className="glass w-full max-w-sm p-8 relative"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: "linear-gradient(135deg, rgba(242,116,5,0.15), rgba(242,116,5,0.05))",
              border: "1px solid rgba(242,116,5,0.2)",
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          >
            <Lock className="w-6 h-6 text-[var(--accent)]" />
          </motion.div>
          <motion.h1
            className="text-2xl font-semibold tracking-tight text-[var(--cream)]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            Life<span className="text-[var(--accent)]">OS</span>
          </motion.h1>
          <motion.p
            className="text-sm text-[var(--text-3)] mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Your personal command center
          </motion.p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-2)] mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-11 px-4 pr-11 rounded-xl text-[var(--text)] placeholder:text-[var(--text-3)] text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ice)]"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--glass-border)",
                }}
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>

          {error && (
            <motion.p
              className="text-sm text-[#FC8181]"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading || !password}
            className="w-full h-11 rounded-xl font-medium text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: loading
                ? "var(--amber)"
                : "linear-gradient(135deg, var(--accent), var(--accent-hot))",
              boxShadow: "0 0 20px rgba(242,116,5,0.25)",
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...{ transition: { delay: 0.3 } } as any}
          >
            {loading ? "Signing in…" : "Sign in"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
