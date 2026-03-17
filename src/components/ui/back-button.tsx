"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "./button";

export function BackButton() {
  return (
    <Button
      variant="outline"
      size="lg"
      className="px-6"
      onClick={() => window.history.back()}
    >
      <ArrowLeft className="h-4 w-4" />
      Назад
    </Button>
  );
}
