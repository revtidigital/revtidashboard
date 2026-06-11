"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Shield, Key, Mail, Lock, User as UserIcon, AlertCircle } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getWorkspaceService as apiService } from "@/lib/services/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isSandbox, setIsSandbox] = useState(true);
  const [sandboxUsers, setSandboxUsers] = useState<any[]>([]);

  useEffect(() => {
    setIsSandbox(!isSupabaseConfigured);
    
    if (!isSupabaseConfigured) {
      // Load sandbox personas
      async function loadSandbox() {
        try {
          const service = apiService();
          const all = await service.getUsers();
          setSandboxUsers(all);
        } catch (err) {
          console.error(err);
        }
      }
      loadSandbox();
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      const service = apiService();
      
      if (isSandbox) {
        setErrorMsg("Sandbox Mode is active. Please use the persona shortcuts below to sign in.");
        setIsSubmitting(false);
        return;
      }
      
      const supabaseClient = (await import("@/lib/supabase")).supabase!;
      
      if (isSignUp) {
        // Sign Up Flow
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim() || email.split("@")[0],
              role: "view", // Default role
            },
          },
        });
        
        if (error) throw error;
        
        alert("Account created successfully! You can now log in.");
        setIsSignUp(false);
      } else {
        // Sign In Flow
        const { error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        router.push("/");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSandboxLogin = async (userId: string) => {
    try {
      const service = apiService();
      await service.setCurrentUserPersona(userId);
      router.push("/");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#07090F] px-4 text-white">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="Revti Digital Logo"
            width={160}
            height={50}
            className="h-10 w-auto object-contain brightness-100 mb-2"
            priority
          />
          <p className="text-xs text-[#94A3B8] tracking-widest uppercase mt-1">
            The Operating System for Revti Digital
          </p>
        </div>

        {isSandbox ? (
          /* Sandbox mode shortcuts */
          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0EA5E9] bg-[#0EA5E9]/10 px-2 py-0.5 rounded border border-[#0EA5E9]/30 uppercase tracking-widest">
                Sandbox Mode Active
              </span>
              <h2 className="text-lg font-bold text-white mt-2">Select a Persona to Sign In</h2>
              <p className="text-xs text-[#94A3B8] max-w-xs mx-auto">
                No database config found. Select a simulated team member profile to test workspace permissions.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {sandboxUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSandboxLogin(u.id)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[#1E2D47] bg-[#07090F]/50 hover:bg-[#1E2D47]/40 hover:border-[#0EA5E9]/40 text-left transition-all group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0EA5E9]/15 text-[#0EA5E9] text-xs font-bold group-hover:bg-[#0EA5E9]/20">
                    {u.full_name?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-[#0EA5E9] transition-colors">{u.full_name}</p>
                    <p className="text-[10px] text-[#94A3B8] capitalize mt-0.5">{u.role} Access</p>
                  </div>
                  <Shield className="h-4 w-4 text-[#94A3B8] group-hover:text-white" />
                </button>
              ))}
            </div>
          </Card>
        ) : (
          /* Live Supabase login controls */
          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 shadow-2xl space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">
                {isSignUp ? "Create Account" : "Sign In to Workspace"}
              </h2>
              <p className="text-xs text-[#94A3B8] mt-1">
                {isSignUp ? "Register as a new team member" : "Enter your email credentials below"}
              </p>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 p-3 rounded bg-red-500/10 border border-red-500/20 text-xs text-[#EF4444]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="full-name" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5" />
                    Full Name
                  </Label>
                  <Input
                    id="full-name"
                    placeholder="Enter full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="border-[#1E2D47] bg-[#07090F] text-white focus:ring-[#0EA5E9]"
                    required={isSignUp}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@revtidigital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white focus:ring-[#0EA5E9]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white focus:ring-[#0EA5E9]"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold flex items-center justify-center gap-1.5 mt-2"
              >
                <Key className="h-4 w-4" />
                {isSubmitting ? "Authenticating..." : isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-[#0EA5E9] hover:underline"
              >
                {isSignUp ? "Already have an account? Sign In" : "Need a new account? Register"}
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
