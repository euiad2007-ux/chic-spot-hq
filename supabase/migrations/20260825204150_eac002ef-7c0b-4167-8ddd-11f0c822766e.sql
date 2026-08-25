CREATE POLICY "invoices_insert_auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'invoices');
CREATE POLICY "invoices_select_auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'invoices');
CREATE POLICY "invoices_update_auth" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'invoices') WITH CHECK (bucket_id = 'invoices');