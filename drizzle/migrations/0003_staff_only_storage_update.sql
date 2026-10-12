DROP POLICY payment_proofs_update ON storage.objects;
CREATE POLICY payment_proofs_update ON storage.objects
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-proofs'::text AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'payment-proofs'::text AND public.is_staff(auth.uid()));

DROP POLICY renter_documents_update ON storage.objects;
CREATE POLICY renter_documents_update ON storage.objects
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (bucket_id = 'renter-documents'::text AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'renter-documents'::text AND public.is_staff(auth.uid()));