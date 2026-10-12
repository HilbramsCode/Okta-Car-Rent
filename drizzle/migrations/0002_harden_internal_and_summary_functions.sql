REVOKE EXECUTE ON FUNCTION public.jalankan_pemeriksaan_harian_sistem() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_overdue_contracts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_deposit_status(uuid) FROM PUBLIC, anon, authenticated;

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
    v_blocks := v_blocks || 'Penyewa berstatus nonaktif.';
  END IF;
  IF r.verification_status <> 'terverifikasi' THEN
    v_blocks := v_blocks || 'Penyewa belum diverifikasi.';
  END IF;
  IF r.id_card_url IS NULL THEN
    v_blocks := v_blocks || 'Dokumen KTP belum diunggah.';
  END IF;
  IF r.driving_license_url IS NULL THEN
    v_blocks := v_blocks || 'Dokumen SIM belum diunggah.';
  END IF;
  IF r.driving_license_expiry IS NOT NULL AND r.driving_license_expiry < COALESCE(_end, CURRENT_DATE) THEN
    v_blocks := v_blocks || 'SIM kedaluwarsa sebelum masa sewa berakhir.';
  END IF;

  SELECT COALESCE(SUM(GREATEST(0, amount_due - amount_paid)), 0) INTO v_arrears
  FROM public.outstanding_payments
  WHERE renter_id = _renter_id AND status <> 'lunas';

  IF v_arrears > 0 THEN
    v_blocks := v_blocks || ('Penyewa memiliki tunggakan Rp ' || to_char(v_arrears, 'FM999G999G999') || '.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contracts
    WHERE renter_id = _renter_id AND status IN ('aktif', 'terlambat')
  ) THEN
    v_warns := v_warns || 'Penyewa masih memiliki kontrak berjalan.';
  END IF;

  RETURN jsonb_build_object(
    'eligible', array_length(v_blocks, 1) IS NULL,
    'blocks', to_jsonb(v_blocks),
    'warnings', to_jsonb(v_warns),
    'arrears', v_arrears
  );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.check_renter_eligibility(uuid, date, date) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.deposit_settlement_preview(_deposit_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  d public.deposits%ROWTYPE;
  v_potongan numeric;
  v_tunggakan numeric;
  v_usulan numeric;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO d FROM public.deposits WHERE id = _deposit_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Deposit tidak ditemukan.');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_potongan
  FROM public.deposit_deductions WHERE deposit_id = _deposit_id;

  SELECT COALESCE(SUM(GREATEST(0, amount_due - amount_paid)), 0) INTO v_tunggakan
  FROM public.outstanding_payments
  WHERE renter_id = d.renter_id AND status <> 'lunas';

  v_usulan := LEAST(v_tunggakan, GREATEST(0, d.amount - v_potongan));

  RETURN jsonb_build_object(
    'deposit', d.amount,
    'potongan', v_potongan,
    'sisa', GREATEST(0, d.amount - v_potongan),
    'tunggakan', v_tunggakan,
    'usulan_potongan_tunggakan', v_usulan,
    'nominal_pengembalian', GREATEST(0, d.amount - v_potongan - v_usulan)
  );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.deposit_settlement_preview(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.contract_billing_summary(_contract_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'total', COALESCE(c.total_amount, 0),
    'paid', COALESCE((
      SELECT SUM(p.amount) FROM public.payments p
      WHERE p.contract_id = c.id AND p.status = 'lunas'
    ), 0),
    'pending', COALESCE((
      SELECT SUM(p.amount) FROM public.payments p
      WHERE p.contract_id = c.id AND p.status = 'menunggu_verifikasi'
    ), 0),
    'remaining', GREATEST(0, COALESCE(c.total_amount, 0) - COALESCE((
      SELECT SUM(p.amount) FROM public.payments p
      WHERE p.contract_id = c.id AND p.status = 'lunas'
    ), 0))
  )
  FROM public.contracts c
  WHERE c.id = _contract_id
    AND (public.is_staff(auth.uid()) OR public.owns_contract(c.id));
$function$;
REVOKE EXECUTE ON FUNCTION public.contract_billing_summary(uuid) FROM PUBLIC, anon;