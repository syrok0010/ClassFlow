"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { activateInviteAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "@tanstack/react-form";
import { Loader2, AlertCircle } from "lucide-react";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  
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
      onChange: ({ value }) => {
        if (value.password.length < 8) {
          return { password: "Пароль должен быть не менее 8 символов" };
        }
        if (value.password !== value.confirmPassword) {
          return { confirmPassword: "Пароли не совпадают" };
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      setError(null);

      const { confirmPassword: _, ...submitData } = value;
      const result = await activateInviteAction(token, submitData);

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
            <CardTitle className="text-2xl font-bold tracking-tight text-center">Активация аккаунта</CardTitle>
            <CardDescription className="text-center">
              Заполните свои данные и установите пароль для входа.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="surname">Фамилия</Label>
                <form.Field name="surname">
                  {(field) => (
                    <Input
                      id="surname"
                      required
                      placeholder="Иванов"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={form.state.isSubmitting}
                    />
                  )}
                </form.Field>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="name">Имя</Label>
                <form.Field name="name">
                  {(field) => (
                    <Input
                      id="name"
                      required
                      placeholder="Иван"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={form.state.isSubmitting}
                    />
                  )}
                </form.Field>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="patronymicName">Отчество (если есть)</Label>
              <form.Field name="patronymicName">
                {(field) => (
                  <Input
                    id="patronymicName"
                    placeholder="Иванович"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={form.state.isSubmitting}
                  />
                )}
              </form.Field>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="email">Email (для входа)</Label>
              <form.Field name="email">
                {(field) => (
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="ivanov@example.com"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={form.state.isSubmitting}
                  />
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="grid gap-1.5">
                <Label htmlFor="password">Пароль</Label>
                <form.Field name="password">
                  {(field) => (
                    <div className="grid gap-1">
                      <Input
                        id="password"
                        type="password"
                        required
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        disabled={form.state.isSubmitting}
                        className={field.state.meta.errors.length > 0 ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <span className="text-[10px] text-destructive font-medium uppercase tracking-wider">
                          {field.state.meta.errors[0]}
                        </span>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="confirmPassword">Подтверждение</Label>
                <form.Field name="confirmPassword">
                  {(field) => (
                    <div className="grid gap-1">
                      <Input
                        id="confirmPassword"
                        type="password"
                        required
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        disabled={form.state.isSubmitting}
                        className={field.state.meta.errors.length > 0 ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <span className="text-[10px] text-destructive font-medium uppercase tracking-wider">
                          {field.state.meta.errors[0]}
                        </span>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/15 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-2">
            <form.Subscribe selector={(state) => ({
              isSubmitting: state.isSubmitting,
              canSubmit: state.canSubmit,
              values: state.values
            })}>
              {(state) => {
                const isFormComplete = !!(
                  state.values.name && 
                  state.values.surname && 
                  state.values.email && 
                  state.values.password && 
                  state.values.confirmPassword
                );
                return (
                  <Button 
                    type="submit" 
                    className="w-full font-semibold" 
                    disabled={state.isSubmitting || !state.canSubmit || !isFormComplete}
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
                );
              }}
            </form.Subscribe>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
