"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { AlertCircle, Loader2 } from "lucide-react";

import { activateInviteAction } from "@/app/actions/auth";
import { activateInviteSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";

type InviteFormProps = {
  token: string;
};

export function InviteForm({ token }: InviteFormProps) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      name: "",
      surname: "",
      patronymicName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: {
      onChange: activateInviteSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const result = await activateInviteAction(token, value);

      if (!result.success) {
        setError(result.error || "Ошибка активации");
      } else {
        router.push("/login?activated=true");
      }
    },
  });

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/40 backdrop-blur-sm">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Активация аккаунта</CardTitle>
            <CardDescription>
              Заполните свои данные и установите пароль для входа.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 py-6">
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="surname">
                {(field) => (
                  <FormField
                    field={field}
                    label="Фамилия"
                    placeholder="Иванов"
                    required
                  />
                )}
              </form.Field>
              <form.Field name="name">
                {(field) => (
                  <FormField
                    field={field}
                    label="Имя"
                    placeholder="Иван"
                    required
                  />
                )}
              </form.Field>
            </div>

            <form.Field name="patronymicName">
              {(field) => (
                <FormField
                  field={field}
                  label="Отчество (если есть)"
                  placeholder="Иванович"
                />
              )}
            </form.Field>

            <form.Field name="email">
              {(field) => (
                <FormField
                  field={field}
                  label="Email (для входа)"
                  type="email"
                  placeholder="ivanov@example.com"
                  required
                />
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4 mt-2">
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
              <form.Field
                name="confirmPassword"
                validators={{
                  onChangeListenTo: ["password"],
                }}
              >
                {(field) => (
                  <FormField
                    field={field}
                    label="Подтверждение"
                    type="password"
                    required
                  />
                )}
              </form.Field>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/15 p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-2">
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
                      Активация...
                    </>
                  ) : (
                    "Активировать аккаунт"
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
