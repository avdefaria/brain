import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { loginWithRateLimit } from "@/lib/auth.functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Mail, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});


function LoginPage() {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [session, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { access_token, refresh_token } = await loginWithRateLimit({
        data: { email, password },
      });

      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (sessionError) throw sessionError;

      toast.success("Bem-vindo de volta!");
      navigate({ to: "/dashboard", replace: true });
    } catch (error: any) {
      toast.error("Erro ao entrar", {
        description: error?.message ?? "Ocorreu um erro inesperado.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-2)] p-4">
      <Card className="w-full max-w-md border-[var(--line-1)] shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-8 bg-[var(--violet-500)] rounded-full flex items-center justify-center relative">
              <div className="w-4 h-4 bg-[var(--surface-1)] rounded-full"></div>
            </div>
          </div>
          <CardTitle className="text-2xl font-title font-bold text-[var(--ink-1)]">
            Brain <span className="text-[var(--violet-500)]">Ongo</span>
          </CardTitle>
          <CardDescription className="text-[var(--ink-3)]">
            Entre na sua conta para gerenciar seu squad.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-[var(--ink-3)]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10 border-[var(--line-1)] focus:ring-[var(--violet-500)]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[var(--ink-3)]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 border-[var(--line-1)] focus:ring-[var(--violet-500)]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 rounded-full h-11"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}