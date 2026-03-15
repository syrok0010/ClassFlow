"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const { error: authError } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      });

      if (authError) {
        setError(authError.message || "Неверный email или пароль");
      } else {
        router.push("/admin");
        router.refresh();
      }
    },
  });

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/40 backdrop-blur-sm">
      <Card className="w-full max-w-sm shadow-xl border-t-4 border-t-primary">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Вход в ClassFlow</CardTitle>
            <CardDescription>
              Введите свой email и пароль для доступа к системе.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 py-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Электронная почта</Label>
              <form.Field name="email">
                {(field) => (
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={form.state.isSubmitting}
                    className="focus-visible:ring-primary"
                  />
                )}
              </form.Field>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Пароль</Label>
              </div>
              <form.Field name="password">
                {(field) => (
                  <Input
                    id="password"
                    type="password"
                    required
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={form.state.isSubmitting}
                    className="focus-visible:ring-primary"
                  />
                )}
              </form.Field>
            </div>
            {error && (
              <div className="rounded-md bg-destructive/15 p-3">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <form.Subscribe selector={(state) => ({ 
              isSubmitting: state.isSubmitting, 
              email: state.values.email, 
              password: state.values.password 
            })}>
              {(state) => (
                <Button 
                  type="submit" 
                  className="w-full font-semibold" 
                  disabled={state.isSubmitting || !state.email || !state.password}
                >
                  {state.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Вход...
                    </>
                  ) : (
                    "Войти"
                  )}
                </Button>
              )}
            </form.Subscribe>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
