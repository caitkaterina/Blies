-- Additive customer ownership and genuine shipment history. Review before application.
-- Existing guest requests deliberately remain unowned; matching email is not ownership.
BEGIN;
ALTER TABLE public.enquiries ADD COLUMN customer_id uuid REFERENCES auth.users(id);
CREATE INDEX enquiries_customer ON public.enquiries(customer_id,created DESC) WHERE customer_id IS NOT NULL;
CREATE POLICY customer_enquiries_read ON public.enquiries FOR SELECT TO authenticated
 USING (customer_id = (SELECT auth.uid()));
CREATE POLICY customer_documents_read ON public.documents FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM public.enquiries e WHERE e.id=enquiry AND e.customer_id=(SELECT auth.uid())));
-- Column grants keep staff assignment/reply/delivery state and private storage keys server-only.
GRANT SELECT(id,kind,created,status,data,customer_id) ON public.enquiries TO authenticated;
GRANT SELECT(id,enquiry,name,type,created) ON public.documents TO authenticated;
CREATE VIEW public.customer_requests WITH (security_invoker=true) AS
 SELECT id,kind,created,status,data FROM public.enquiries WHERE customer_id=(SELECT auth.uid());
GRANT SELECT ON public.customer_requests TO authenticated;
REVOKE ALL ON public.customer_requests FROM anon;

-- Replace the old RPC, retaining backwards-compatible omitted ownership via a default.
DROP FUNCTION public.blies_create_enquiry(text,text,text,jsonb,jsonb);
CREATE FUNCTION public.blies_create_enquiry(p_id text,p_kind text,p_queue text,p_data jsonb,p_documents jsonb,p_customer_id uuid DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE d jsonb;
BEGIN
 IF p_documents IS NULL OR jsonb_typeof(p_documents)<>'array' OR jsonb_array_length(p_documents)>3 THEN RAISE EXCEPTION 'Invalid documents'; END IF;
 INSERT INTO public.enquiries(id,kind,queue,data,customer_id) VALUES(p_id,p_kind,p_queue,p_data,p_customer_id);
 FOR d IN SELECT * FROM jsonb_array_elements(p_documents) LOOP
  INSERT INTO public.documents(id,enquiry,name,type,file) VALUES((d->>'id')::uuid,p_id,d->>'name',d->>'type',(d->>'file')::uuid);
 END LOOP;
 PERFORM public.blies_audit(COALESCE(p_customer_id::text,'public'),p_kind||'.received',p_id);
END; $$;
REVOKE EXECUTE ON FUNCTION public.blies_create_enquiry(text,text,text,jsonb,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.blies_create_enquiry(text,text,text,jsonb,jsonb,uuid) TO service_role;

CREATE TABLE public.shipments (
 id uuid PRIMARY KEY,
 reference text NOT NULL UNIQUE CHECK(length(reference) BETWEEN 1 AND 100),
 customer_id uuid NOT NULL REFERENCES auth.users(id),
 status text NOT NULL CHECK(length(status) BETWEEN 1 AND 120),
 created timestamptz NOT NULL DEFAULT now(),updated timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shipments_customer ON public.shipments(customer_id,created DESC);
CREATE TABLE public.shipment_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),shipment uuid NOT NULL REFERENCES public.shipments(id),
 status text NOT NULL CHECK(length(status) BETWEEN 1 AND 120),
 location text NOT NULL DEFAULT '' CHECK(length(location)<=200),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=2000),
 created timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shipment_events_shipment ON public.shipment_events(shipment,created);
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shipments,public.shipment_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.shipments,public.shipment_events TO authenticated,service_role;
GRANT INSERT ON public.shipments,public.shipment_events TO service_role;
GRANT UPDATE(status,updated) ON public.shipments TO service_role;
CREATE POLICY customer_shipments_read ON public.shipments FOR SELECT TO authenticated
 USING (customer_id=(SELECT auth.uid()));
CREATE POLICY customer_shipment_events_read ON public.shipment_events FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.shipments s WHERE s.id=shipment AND s.customer_id=(SELECT auth.uid())));
CREATE FUNCTION public.blies_create_shipment(p_actor text,p_id uuid,p_reference text,p_customer_id uuid,p_status text,p_location text,p_description text)
 RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF p_actor IS NULL OR length(p_actor) NOT BETWEEN 1 AND 254 THEN RAISE EXCEPTION 'Invalid actor'; END IF;
 INSERT INTO public.shipments(id,reference,customer_id,status) VALUES(p_id,p_reference,p_customer_id,p_status);
 INSERT INTO public.shipment_events(shipment,status,location,description) VALUES(p_id,p_status,p_location,p_description);
 PERFORM public.blies_audit(p_actor,'shipment.created',p_id::text);
END; $$;
CREATE FUNCTION public.blies_update_shipment(p_actor text,p_id uuid,p_status text,p_location text,p_description text)
 RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF p_actor IS NULL OR length(p_actor) NOT BETWEEN 1 AND 254 THEN RAISE EXCEPTION 'Invalid actor'; END IF;
 UPDATE public.shipments SET status=p_status,updated=now() WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Shipment not found' USING ERRCODE='P0002'; END IF;
 INSERT INTO public.shipment_events(shipment,status,location,description) VALUES(p_id,p_status,p_location,p_description);
 PERFORM public.blies_audit(p_actor,'shipment.updated',p_id::text);
END; $$;
REVOKE EXECUTE ON FUNCTION public.blies_create_shipment(text,uuid,text,uuid,text,text,text),public.blies_update_shipment(text,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.blies_create_shipment(text,uuid,text,uuid,text,text,text),public.blies_update_shipment(text,uuid,text,text,text) TO service_role;
-- No Auth account may upload/read/sign/delete Storage objects directly. Authorized server routes
-- continue to use blies-private and issue 60-second download URLs after ownership/staff checks.
COMMIT;
