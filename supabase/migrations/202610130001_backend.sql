-- Review against the target project before application. No existing data is modified.
BEGIN;
CREATE TABLE public.enquiries (
 id text PRIMARY KEY CHECK(length(id) BETWEEN 1 AND 100),
 kind text NOT NULL CHECK(kind IN ('contact','quote','tracking')),
 created timestamptz NOT NULL DEFAULT now(), updated timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','in-review','responded','closed')),
 queue text NOT NULL CHECK(queue IN ('procurement','integrated','logistics')),
 email_status text NOT NULL DEFAULT 'pending' CHECK(email_status IN ('pending','sent','not-configured')),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object' AND (data->>'consent'='true') IS TRUE AND (length(data->>'email') BETWEEN 3 AND 254) IS TRUE),
 assigned text NOT NULL DEFAULT '' CHECK(length(assigned)<=200), reply text NOT NULL DEFAULT '' CHECK(length(reply)<=10000)
);
CREATE INDEX enquiries_created ON public.enquiries(created DESC);
CREATE INDEX enquiries_queue_status ON public.enquiries(queue,status,created DESC);
CREATE TABLE public.documents (
 id uuid PRIMARY KEY, enquiry text NOT NULL REFERENCES public.enquiries(id),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200),
 type text NOT NULL CHECK(type IN ('application/pdf','image/jpeg','image/png')),
 file uuid NOT NULL UNIQUE, created timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX documents_enquiry ON public.documents(enquiry);
CREATE TABLE public.content (
 id text PRIMARY KEY,kind text NOT NULL CHECK(kind IN ('service','industry','fleet','location','article','settings')),
 slug text NOT NULL CHECK(length(slug)<=120), status text NOT NULL CHECK(status IN ('draft','published','archived')),
 position integer NOT NULL CHECK(position BETWEEN 0 AND 10000),data jsonb NOT NULL,
 updated timestamptz NOT NULL DEFAULT now(),UNIQUE(kind,slug),
 CHECK(status<>'published' OR ((data->>'verified'='true' AND (kind<>'fleet' OR (data->>'owned'='true' AND coalesce(data->>'planned','false')='false'))) IS TRUE))
);
CREATE TABLE public.versions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),content_id text NOT NULL REFERENCES public.content(id),data jsonb NOT NULL,actor text NOT NULL,created timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.audit_records(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor text NOT NULL,event text NOT NULL,target text NOT NULL,created timestamptz NOT NULL DEFAULT now());
CREATE INDEX audit_records_created ON public.audit_records(created DESC);
CREATE TABLE public.limits(key text PRIMARY KEY,count integer NOT NULL CHECK(count>0),expires timestamptz NOT NULL);
CREATE INDEX limits_expires ON public.limits(expires);
-- Existing password/TOTP accounts and role assignments remain in protected runtime settings.
-- No browser-writeable administrator table or Supabase Auth role mapping is introduced.
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.enquiries,public.documents,public.content,public.versions,public.audit_records,public.limits FROM anon,authenticated,service_role;
GRANT SELECT ON public.enquiries,public.documents,public.content,public.versions,public.audit_records,public.limits TO service_role;
GRANT INSERT ON public.enquiries,public.documents,public.content,public.versions,public.audit_records,public.limits TO service_role;
GRANT UPDATE ON public.enquiries,public.content,public.limits TO service_role;
GRANT DELETE ON public.limits TO service_role;
CREATE VIEW public.contact_enquiries WITH (security_invoker=true) AS SELECT * FROM public.enquiries WHERE kind='contact';
CREATE VIEW public.quotation_requests WITH (security_invoker=true) AS SELECT * FROM public.enquiries WHERE kind='quote';
CREATE VIEW public.tracking_enquiries WITH (security_invoker=true) AS SELECT * FROM public.enquiries WHERE kind='tracking';
REVOKE ALL ON public.contact_enquiries,public.quotation_requests,public.tracking_enquiries FROM anon,authenticated;
GRANT SELECT ON public.contact_enquiries,public.quotation_requests,public.tracking_enquiries TO service_role;
CREATE FUNCTION public.blies_audit(p_actor text,p_event text,p_target text) RETURNS void LANGUAGE sql SET search_path='' AS $$ INSERT INTO public.audit_records(actor,event,target) VALUES(p_actor,p_event,p_target); $$;
CREATE FUNCTION public.blies_rate_limit(p_key text,p_max integer,p_seconds integer) RETURNS boolean LANGUAGE plpgsql SET search_path='' AS $$
DECLARE n integer;
BEGIN
 IF p_max<1 OR p_seconds<1 OR p_seconds>86400 THEN RAISE EXCEPTION 'Invalid limit'; END IF;
 DELETE FROM public.limits WHERE expires<now();
 INSERT INTO public.limits(key,count,expires) VALUES(p_key,1,now()+make_interval(secs=>p_seconds)) ON CONFLICT(key) DO UPDATE SET count=public.limits.count+1 RETURNING count INTO n;
 RETURN n<=p_max;
END; $$;
CREATE FUNCTION public.blies_create_enquiry(p_id text,p_kind text,p_queue text,p_data jsonb,p_documents jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE d jsonb;
BEGIN
 IF jsonb_typeof(p_documents)<>'array' OR jsonb_array_length(p_documents)>3 THEN RAISE EXCEPTION 'Invalid documents'; END IF;
 INSERT INTO public.enquiries(id,kind,queue,data) VALUES(p_id,p_kind,p_queue,p_data);
 FOR d IN SELECT * FROM jsonb_array_elements(p_documents) LOOP
  INSERT INTO public.documents(id,enquiry,name,type,file) VALUES((d->>'id')::uuid,p_id,d->>'name',d->>'type',(d->>'file')::uuid);
 END LOOP;
 PERFORM public.blies_audit('public',p_kind||'.received',p_id);
END; $$;
CREATE FUNCTION public.blies_email_status(p_id text,p_status text) RETURNS void LANGUAGE sql SET search_path='' AS $$ UPDATE public.enquiries SET email_status=p_status,updated=now() WHERE id=p_id; $$;
CREATE FUNCTION public.blies_update_record(p_actor text,p_id text,p_status text,p_assigned text,p_reply text) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 UPDATE public.enquiries SET status=p_status,assigned=p_assigned,reply=p_reply,updated=now() WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
 PERFORM public.blies_audit(p_actor,'enquiry.updated',p_id);
END; $$;
CREATE FUNCTION public.blies_save_content(p_actor text,p_id text,p_kind text,p_slug text,p_status text,p_position integer,p_data jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE previous public.content;
BEGIN
 -- Serialize inserts and edits to the same content identifier before recording history.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id,0));
 SELECT * INTO previous FROM public.content WHERE id=p_id FOR UPDATE;
 IF FOUND THEN INSERT INTO public.versions(content_id,data,actor) VALUES(p_id,to_jsonb(previous),p_actor); END IF;
 INSERT INTO public.content(id,kind,slug,status,position,data) VALUES(p_id,p_kind,p_slug,p_status,p_position,p_data)
 ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,slug=excluded.slug,status=excluded.status,position=excluded.position,data=excluded.data,updated=now();
 PERFORM public.blies_audit(p_actor,'content.saved',p_id);
END; $$;
REVOKE EXECUTE ON FUNCTION public.blies_audit(text,text,text),public.blies_rate_limit(text,integer,integer),public.blies_create_enquiry(text,text,text,jsonb,jsonb),public.blies_email_status(text,text),public.blies_update_record(text,text,text,text,text),public.blies_save_content(text,text,text,text,text,integer,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.blies_audit(text,text,text),public.blies_rate_limit(text,integer,integer),public.blies_create_enquiry(text,text,text,jsonb,jsonb),public.blies_email_status(text,text),public.blies_update_record(text,text,text,text,text),public.blies_save_content(text,text,text,text,text,integer,jsonb) TO service_role;
-- A private bucket; no anonymous/authenticated storage policies are granted.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('blies-private','blies-private',false,2097152,ARRAY['application/pdf','image/jpeg','image/png']);
COMMIT;
