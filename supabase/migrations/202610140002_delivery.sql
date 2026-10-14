-- Additive delivery state. Review all migrations against the confirmed staging project first.
BEGIN;
CREATE TABLE public.submission_keys(key text PRIMARY KEY,payload_hash text NOT NULL,token uuid NOT NULL,reference text NOT NULL,response jsonb,expires timestamptz NOT NULL);
CREATE TABLE public.email_outbox(id text PRIMARY KEY,recipient text NOT NULL,locale text NOT NULL,subject text NOT NULL,message text NOT NULL,reference text NOT NULL,state text NOT NULL DEFAULT 'pending' CHECK(state IN('pending','processing','sent','failed')),attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 8),available timestamptz NOT NULL DEFAULT now(),lease timestamptz,created timestamptz NOT NULL DEFAULT now(),claim_token uuid);
CREATE INDEX email_outbox_due ON public.email_outbox(state,available);
ALTER TABLE public.submission_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.submission_keys,public.email_outbox FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.submission_keys TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.email_outbox TO service_role;
CREATE FUNCTION public.blies_claim_submission(p_key text,p_hash text,p_token uuid,p_reference text) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r public.submission_keys;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_key,0));
 SELECT * INTO r FROM public.submission_keys WHERE key=p_key FOR UPDATE;
 IF FOUND THEN
  IF r.payload_hash<>p_hash THEN RETURN jsonb_build_object('state','conflict'); END IF;
  IF r.response IS NOT NULL THEN RETURN jsonb_build_object('state','complete','response',r.response); END IF;
  IF r.expires>now() THEN RETURN jsonb_build_object('state','busy'); END IF;
  UPDATE public.submission_keys SET token=p_token,expires=now()+interval '3 minutes' WHERE key=p_key;
  RETURN jsonb_build_object('state','claimed','token',p_token,'reference',r.reference);
 END IF;
 INSERT INTO public.submission_keys VALUES(p_key,p_hash,p_token,p_reference,NULL,now()+interval '3 minutes');
 RETURN jsonb_build_object('state','claimed','token',p_token,'reference',p_reference);
END; $$;
CREATE FUNCTION public.blies_submission_receipt(p_key text,p_hash text) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$ SELECT response FROM public.submission_keys WHERE key=p_key AND payload_hash=p_hash; $$;
CREATE FUNCTION public.blies_release_submission(p_key text,p_token uuid) RETURNS void LANGUAGE sql SET search_path='' AS $$ DELETE FROM public.submission_keys WHERE key=p_key AND token=p_token AND response IS NULL; $$;
CREATE FUNCTION public.blies_submit_enquiry(p_key text,p_token uuid,p_id text,p_kind text,p_queue text,p_data jsonb,p_documents jsonb,p_customer_id uuid,p_admin_email text,p_email_configured boolean) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r public.submission_keys; receipt jsonb; email_state text;
BEGIN
 SELECT * INTO r FROM public.submission_keys WHERE key=p_key FOR UPDATE;
 IF NOT FOUND OR r.token<>p_token OR r.response IS NOT NULL THEN RAISE EXCEPTION 'Submission lease expired'; END IF;
 PERFORM public.blies_create_enquiry(p_id,p_kind,p_queue,p_data,p_documents,p_customer_id);
 email_state:=CASE WHEN p_email_configured THEN 'pending' ELSE 'not-configured' END;
 UPDATE public.enquiries SET email_status=email_state WHERE id=p_id;
 INSERT INTO public.email_outbox(id,recipient,locale,subject,message,reference) VALUES('receipt:'||p_id,p_data->>'email',p_data->>'locale','BLIES — Request received','Your request has been received. Reference: '||p_id||'. The team will review your request.',p_id);
 IF p_admin_email IS NOT NULL THEN INSERT INTO public.email_outbox(id,recipient,locale,subject,message,reference) VALUES('admin:'||p_id,p_admin_email,'en','BLIES — New request','A new request is available in administration. Reference: '||p_id||'.',p_id); END IF;
 receipt:=jsonb_build_object('reference',p_id,'received',true,'emailStatus',email_state);
 UPDATE public.submission_keys SET response=receipt WHERE key=p_key;
 RETURN receipt;
END; $$;
CREATE FUNCTION public.blies_claim_emails(p_limit integer) RETURNS SETOF public.email_outbox LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 RETURN QUERY WITH candidates AS (SELECT id FROM public.email_outbox WHERE ((state='pending' AND available<=now()) OR (state='processing' AND lease<now())) AND attempts<8 AND created>now()-interval '23 hours' ORDER BY created FOR UPDATE SKIP LOCKED LIMIT least(greatest(p_limit,1),10)) UPDATE public.email_outbox o SET state='processing',attempts=o.attempts+1,lease=now()+interval '5 minutes',claim_token=gen_random_uuid() FROM candidates c WHERE o.id=c.id RETURNING o.*;
END; $$;
CREATE FUNCTION public.blies_finish_email(p_id text,p_sent boolean,p_token uuid) RETURNS void LANGUAGE sql SET search_path='' AS $$ UPDATE public.email_outbox SET state=CASE WHEN p_sent THEN 'sent' WHEN attempts>=8 THEN 'failed' ELSE 'pending' END,available=now()+make_interval(secs=>least(3600,(60*power(2,attempts-1))::integer)),lease=NULL WHERE id=p_id AND state='processing' AND claim_token=p_token; $$;
-- Status notifications are queued in the same transaction as the administrative update.
CREATE FUNCTION public.blies_request_status_email() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.email_outbox(id,recipient,locale,subject,message,reference) VALUES('status:'||gen_random_uuid()::text,NEW.data->>'email',coalesce(NEW.data->>'locale','en'),'BLIES — Request status update','Your request '||NEW.id||' is now '||NEW.status||'.',NEW.id); END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER blies_request_status_email AFTER UPDATE OF status ON public.enquiries FOR EACH ROW EXECUTE FUNCTION public.blies_request_status_email();
CREATE FUNCTION public.blies_shipment_event_email() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE shipment public.shipments; address text;
BEGIN
 SELECT * INTO shipment FROM public.shipments WHERE id=NEW.shipment;
 SELECT email INTO address FROM auth.users WHERE id=shipment.customer_id;
 IF address IS NOT NULL THEN INSERT INTO public.email_outbox(id,recipient,locale,subject,message,reference) VALUES('shipment:'||NEW.id::text,address,'en','BLIES — Shipment update','Shipment '||shipment.reference||': '||NEW.status||'. '||NEW.description,shipment.reference); END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER blies_shipment_event_email AFTER INSERT ON public.shipment_events FOR EACH ROW EXECUTE FUNCTION public.blies_shipment_event_email();
DROP FUNCTION public.blies_update_record(text,text,text,text,text);
CREATE FUNCTION public.blies_update_record(p_actor text,p_id text,p_status text,p_assigned text,p_reply text,p_notify_reply boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r public.enquiries;
BEGIN
 SELECT * INTO r FROM public.enquiries WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
 UPDATE public.enquiries SET status=p_status,assigned=p_assigned,reply=p_reply,updated=now() WHERE id=p_id;
 IF p_notify_reply THEN
  INSERT INTO public.email_outbox(id,recipient,locale,subject,message,reference) VALUES('reply:'||p_id||':'||md5(p_reply),r.data->>'email',coalesce(r.data->>'locale','en'),'BLIES — Response to your request',p_reply,p_id) ON CONFLICT(id) DO NOTHING;
 END IF;
 PERFORM public.blies_audit(p_actor,'enquiry.updated',p_id);
END; $$;
REVOKE EXECUTE ON FUNCTION public.blies_update_record(text,text,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.blies_update_record(text,text,text,text,text,boolean) TO service_role;
CREATE FUNCTION public.blies_resolve_submission(p_key text,p_hash text,p_token uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r public.submission_keys;
BEGIN
 SELECT * INTO r FROM public.submission_keys WHERE key=p_key FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('state','aborted'); END IF;
 IF r.payload_hash<>p_hash THEN RETURN jsonb_build_object('state','unknown'); END IF;
 IF r.response IS NOT NULL THEN RETURN jsonb_build_object('state','complete','response',r.response); END IF;
 IF r.token<>p_token THEN RETURN jsonb_build_object('state','unknown'); END IF;
 DELETE FROM public.submission_keys WHERE key=p_key AND token=p_token;
 RETURN jsonb_build_object('state','aborted');
END; $$;
CREATE FUNCTION public.blies_retry_confirmation(p_id text) RETURNS text LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r public.enquiries; job public.email_outbox;
BEGIN
 SELECT * INTO r FROM public.enquiries WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
 INSERT INTO public.email_outbox(id,recipient,locale,subject,message,reference) VALUES('receipt:'||p_id,r.data->>'email',coalesce(r.data->>'locale','en'),'BLIES — Request received','Your request has been received. Reference: '||p_id||'. The team will review your request.',p_id) ON CONFLICT(id) DO NOTHING;
 SELECT * INTO job FROM public.email_outbox WHERE id='receipt:'||p_id FOR UPDATE;
 IF job.state='sent' THEN RETURN 'sent'; END IF;
 IF job.created<now()-interval '23 hours' THEN RETURN 'expired'; END IF;
 UPDATE public.email_outbox SET state='pending',attempts=0,available=now() WHERE id=job.id AND state<>'processing';
 RETURN 'pending';
END; $$;
REVOKE EXECUTE ON FUNCTION public.blies_resolve_submission(text,text,uuid),public.blies_retry_confirmation(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.blies_resolve_submission(text,text,uuid),public.blies_retry_confirmation(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.blies_shipment_event_email() FROM service_role;
REVOKE EXECUTE ON FUNCTION public.blies_claim_submission(text,text,uuid,text),public.blies_submission_receipt(text,text),public.blies_release_submission(text,uuid),public.blies_submit_enquiry(text,uuid,text,text,text,jsonb,jsonb,uuid,text,boolean),public.blies_claim_emails(integer),public.blies_finish_email(text,boolean,uuid),public.blies_request_status_email(),public.blies_shipment_event_email() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.blies_claim_submission(text,text,uuid,text),public.blies_submission_receipt(text,text),public.blies_release_submission(text,uuid),public.blies_submit_enquiry(text,uuid,text,text,text,jsonb,jsonb,uuid,text,boolean),public.blies_claim_emails(integer),public.blies_finish_email(text,boolean,uuid) TO service_role;
COMMIT;
