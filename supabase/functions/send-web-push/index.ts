import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.55.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@renflix.onrender.com';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface WebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: {
    id: string;
    user_id: string;
    title?: string | null;
    message?: string | null;
    type?: string | null;
    created_at?: string | null;
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const expected = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  if (req.headers.get('authorization') !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json() as WebhookPayload;
  const record = payload.record;
  if (!record?.user_id) return Response.json({ ok: true, sent: 0 });

  const { data: subscriptions, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, subscription')
    .eq('user_id', record.user_id);

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  let sent = 0;
  for (const row of subscriptions || []) {
    try {
      await webpush.sendNotification(
        row.subscription,
        JSON.stringify({
          id: record.id,
          title: `RENFLIX · ${record.title || 'Notification'}`,
          body: record.message || 'You have a new notification.',
          url: '/notifications',
          tag: record.id,
        }),
      );
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', row.id);
      } else {
        console.error('Web Push delivery failed', row.endpoint, error);
      }
    }
  }

  return Response.json({ ok: true, sent });
});
