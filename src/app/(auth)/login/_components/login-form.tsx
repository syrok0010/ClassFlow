"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { AlertCircle, Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onChange: loginSchema,
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
        router.push("/");
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
            <form.Field name="email">
              {(field) => (
                <FormField
                  field={field}
                  label="Электронная почта"
                  type="email"
                  placeholder="name@example.com"
                  required
                />
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <FormField
                  field={field}
                  label="Пароль"
                  type="password"
                  required
                />
              )}
            </form.Field>

            {error && (
              <div className="rounded-md bg-destructive/15 p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <form.Subscribe selector={(state) => ({
              isSubmitting: state.isSubmitting,
              canSubmit: state.canSubmit,
              isPristine: state.isPristine,
            })}>
              {(state) => (
                <Button
                  type="submit"
                  className="w-full font-semibold"
                  disabled={state.isSubmitting || !state.canSubmit || state.isPristine}
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
