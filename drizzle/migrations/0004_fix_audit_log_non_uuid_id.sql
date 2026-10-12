CREATE OR REPLACE FUNCTION public.record_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_action TEXT;
  v_entity_id UUID;
  v_changes JSONB;
  v_old JSONB;
  v_new JSONB;
  v_key TEXT;
  v_id_text TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_id_text := to_jsonb(OLD) ->> 'id';
  ELSE
    v_id_text := to_jsonb(NEW) ->> 'id';
  END IF;
  IF v_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_entity_id := v_id_text::uuid;
  ELSE
    v_entity_id := NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_changes := jsonb_build_object('after', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_changes := '{}'::jsonb;
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_new -> v_key IS DISTINCT FROM v_old -> v_key AND v_key <> 'updated_at' THEN
        v_changes := v_changes || jsonb_build_object(
          v_key, jsonb_build_object('before', v_old -> v_key, 'after', v_new -> v_key)
        );
      END IF;
    END LOOP;
    IF v_changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  ELSE
    v_action := 'delete';
    v_changes := jsonb_build_object('before', to_jsonb(OLD));
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, summary, changed_fields)
  VALUES (
    auth.uid(),
    public.current_role_name(),
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    TG_TABLE_NAME || ' ' || v_action,
    v_changes
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;