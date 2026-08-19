import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Mail, Loader2, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createInitialAdmin } from "@/lib/setup.functions";

export const Route = createFileRoute("/auth/login")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      console.log("Session found in beforeLoad, redirecting to dashboard");
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const setupAdmin = useServerFn(createInitialAdmin);

  useEffect(() => {
    // Run setup on mount to ensure the requested admin exists
    const runSetup = async () => {
      try {
        await setupAdmin();
        console.log("Initial setup completed");
      } catch (e: any) {
        // Only log if it's NOT an "already registered" error
        if (!e.message?.includes('already has been registered')) {
          console.error("Setup error:", e);
        }
      }
    };
    runSetup();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("Attempting login for:", email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        toast.error("Erro ao entrar", {
          description: error.message === "Invalid login credentials" 
            ? "E-mail ou senha incorretos." 
            : error.message
        });
        return;
      }

      console.log("Login successful, session:", data.session);
      toast.success("Bem-vindo de volta!");
      
      // Explicitly redirect to dashboard after successful login
      window.location.href = "/dashboard";
    } catch (error: any) {
      console.error("Unexpected login error:", error);
      toast.error("Ocorreu um erro inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        toast.error("Erro no login com Google", {
          description: result.error.message
        });
        return;
      }
      // Redirect happens automatically if result.redirected is true
    } catch (error: any) {
      toast.error("Erro ao conectar com Google.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC] p-4">
      <Card className="w-full max-w-md border-[#E4E6F0] shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-8 bg-[#3D4FE8] rounded-full flex items-center justify-center relative">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
          <CardTitle className="text-2xl font-title font-bold text-[#0E0E16]">
            Brain <span className="text-[#3D4FE8]">Ongo</span>
          </CardTitle>
          <CardDescription className="text-[#8A8FA3]">
            Entre na sua conta para gerenciar seu squad.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-[#8A8FA3]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10 border-[#E4E6F0] focus:ring-[#3D4FE8]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[#8A8FA3]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 border-[#E4E6F0] focus:ring-[#3D4FE8]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full h-11"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Entrar
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#E4E6F0]"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-[#8A8FA3]">Ou continue com</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full border-[#E4E6F0] hover:bg-[#F7F8FC] rounded-full h-11"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
            )}
            Google
          </Button>

          <div className="pt-4 text-center">
            <p className="text-[10px] text-[#8A8FA3] flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3 text-[#3D4FE8]" />
              Protótipo: Login administrador configurado.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}