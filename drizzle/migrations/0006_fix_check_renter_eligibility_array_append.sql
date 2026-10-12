CREATE OR REPLACE FUNCTION public.check_renter_eligibility(_renter_id uuid, _start date, _end date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r public.renters%ROWTYPE;
  v_blocks text[] := '{}';
  v_warns text[] := '{}';
  v_arrears numeric := 0;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO r FROM public.renters WHERE id = _renter_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'blocks', ARRAY['Penyewa tidak ditemukan.'], 'warnings', '{}'::text[], 'arrears', 0);
  END IF;

  IF NOT r.is_active THEN
    v_blocks := v_blocks || 'Penyewa berstatus nonaktif.'::text;
  END IF;
  IF r.verification_status <> 'terverifikasi' THEN
    v_blocks := v_blocks || 'Penyewa belum diverifikasi.'::text;
  END IF;
  IF r.id_card_url IS NULL THEN
    v_blocks := v_blocks || 'Dokumen KTP belum diunggah.'::text;
  END IF;
  IF r.driving_license_url IS NULL THEN
    v_blocks := v_blocks || 'Dokumen SIM belum diunggah.'::text;
  END IF;
  IF r.driving_license_expiry IS NOT NULL AND r.driving_license_expiry < COALESCE(_end, CURRENT_DATE) THEN
    v_blocks := v_blocks || 'SIM kedaluwarsa sebelum masa sewa berakhir.'::text;
  END IF;

  SELECT COALESCE(SUM(GREATEST(0, amount_due - amount_paid)), 0) INTO v_arrears
  FROM public.outstanding_payments
  WHERE renter_id = _renter_id AND status <> 'lunas';

  IF v_arrears > 0 THEN
    v_blocks := v_blocks || ('Penyewa memiliki tunggakan Rp ' || to_char(v_arrears, 'FM999G999G999') || '.')::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contracts
    WHERE renter_id = _renter_id AND status IN ('aktif', 'terlambat')
  ) THEN
    v_warns := v_warns || 'Penyewa masih memiliki kontrak berjalan.'::text;
  END IF;

  RETURN jsonb_build_object(
    'eligible', array_length(v_blocks, 1) IS NULL,
    'blocks', to_jsonb(v_blocks),
    'warnings', to_jsonb(v_warns),
    'arrears', v_arrears
  );
END;
$function$;