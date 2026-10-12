import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pesanGagalPromosi } from "@/lib/promote-admin";

/** Promotes an eligible renter to admin. All checks run inside the database function as the signed-in user. */
export const promoteToAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("promote_renter_to_admin", {
      _target: data.userId,
    });
    if (error) return { ok: false as const, message: pesanGagalPromosi(error.message) };
    return { ok: true as const };
  });
