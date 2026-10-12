CREATE OR REPLACE FUNCTION public.enforce_contract_renter_eligibility()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status public.verification_status;
  v_active boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.renter_id IS NOT DISTINCT FROM OLD.renter_id THEN
    RETURN NEW;
  END IF;

  IF NEW.override_type IS NOT NULL THEN
    NEW.override_by := auth.uid();
    NEW.override_at := now();
  END IF;

  SELECT verification_status, is_active INTO v_status, v_active
  FROM public.renters WHERE id = NEW.renter_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Penyewa tidak ditemukan.' USING ERRCODE = '23503';
  END IF;

  IF v_status = 'terverifikasi' AND v_active THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL
     AND public.has_role(auth.uid(), 'owner')
     AND NEW.override_type = 'pembuatan_kontrak'
     AND length(btrim(coalesce(NEW.override_reason, ''))) >= 10 THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Penyewa belum terverifikasi atau nonaktif. Hanya Pemilik yang dapat menimpa aturan ini dengan alasan minimal 10 karakter.'
    USING ERRCODE = '42501';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_contract_renter_eligibility() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_enforce_contract_renter_eligibility
BEFORE INSERT OR UPDATE OF renter_id ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.enforce_contract_renter_eligibility();