import { Car } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "terang";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Car className="size-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-heading text-lg font-bold tracking-tight",
            variant === "terang" ? "text-sidebar-foreground" : "text-primary",
          )}
        >
          Okta Car Rent
        </span>
        <span
          className={cn(
            "text-xs",
            variant === "terang" ? "text-sidebar-foreground/70" : "text-muted-foreground",
          )}
        >
          Rental Mobil Terpercaya
        </span>
      </span>
    </span>
  );
}