CREATE OR REPLACE FUNCTION public.promote_renter_to_admin(_target uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_roles int;
  v_caller_owner int;
  v_target_roles int;
  v_target_renter int;
  v_renter_id uuid;
  v_reasons text[] := '{}';
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'TIDAK_LOGIN' USING ERRCODE = '42501';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE role = 'owner')
    INTO v_caller_roles, v_caller_owner
    FROM public.user_roles WHERE user_id = v_caller;
  IF v_caller_roles <> 1 OR v_caller_owner <> 1 THEN
    RAISE EXCEPTION 'BUKAN_PEMILIK' USING ERRCODE = '42501';
  END IF;

  IF _target IS NULL OR _target = v_caller THEN
    RAISE EXCEPTION 'TARGET_DIRI_SENDIRI' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('promote_admin:' || _target::text, 0));
  PERFORM 1 FROM public.user_roles WHERE user_id = _target FOR UPDATE;
  PERFORM 1 FROM public.renters WHERE user_id = _target FOR UPDATE;

  SELECT count(*), count(*) FILTER (WHERE role = 'renter')
    INTO v_target_roles, v_target_renter
    FROM public.user_roles WHERE user_id = _target;
  IF v_target_roles <> 1 OR v_target_renter <> 1 THEN
    RAISE EXCEPTION 'TARGET_BUKAN_PENYEWA' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_renter_id FROM public.renters WHERE user_id = _target;
  IF v_renter_id IS NULL THEN
    RAISE EXCEPTION 'DATA_PENYEWA_TIDAK_ADA' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.contracts WHERE renter_id = v_renter_id) THEN v_reasons := v_reasons || 'kontrak'; END IF;
  IF EXISTS (SELECT 1 FROM public.deposits WHERE renter_id = v_renter_id) THEN v_reasons := v_reasons || 'deposit'; END IF;
  IF EXISTS (SELECT 1 FROM public.outstanding_payments WHERE renter_id = v_renter_id) THEN v_reasons := v_reasons || 'tunggakan'; END IF;
  IF EXISTS (SELECT 1 FROM public.renter_notes WHERE renter_id = v_renter_id) THEN v_reasons := v_reasons || 'catatan'; END IF;
  IF array_length(v_reasons, 1) > 0 THEN
    RAISE EXCEPTION 'PUNYA_RIWAYAT:%', array_to_string(v_reasons, ',') USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _target AND role = 'renter';
  INSERT INTO public.user_roles (user_id, role) VALUES (_target, 'admin');
  UPDATE public.renters
     SET is_active = false,
         notes = concat_ws(E'\n', notes, 'Dinonaktifkan otomatis: akun dijadikan Admin pada ' || now()::date)
   WHERE id = v_renter_id;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, summary, changed_fields)
  VALUES (v_caller, 'owner', 'promote_admin', 'user_roles', _target,
          'Penyewa dijadikan Admin',
          jsonb_build_object('target_user_id', _target, 'renter_id', v_renter_id, 'from', 'renter', 'to', 'admin'));

  RETURN jsonb_build_object('ok', true, 'user_id', _target);
END;
$$;

REVOKE ALL ON FUNCTION public.promote_renter_to_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_renter_to_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS user_roles_owner_manage ON public.user_roles;