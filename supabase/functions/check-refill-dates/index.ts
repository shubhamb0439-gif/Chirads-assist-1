import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const { data: upcomingRefills, error } = await supabase
      .from('patient_drugs')
      .select('user_id, refill_date, drugs(name)')
      .gte('refill_date', today.toISOString().split('T')[0])
      .lte('refill_date', sevenDaysFromNow.toISOString().split('T')[0]);

    if (error) {
      throw error;
    }

    if (!upcomingRefills || upcomingRefills.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No upcoming refills' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const notificationPromises = upcomingRefills.map(async (refill) => {
      const refillDate = new Date(refill.refill_date);
      const daysUntil = Math.ceil((refillDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const apiUrl = `${supabaseUrl}/functions/v1/send-push-notification`;

      return fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          userId: refill.user_id,
          notification: {
            title: 'Refill Date Approaching',
            body: `Your medication refill is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`,
            tag: `refill_${refill.user_id}_${refill.refill_date}`,
            url: '/'
          }
        })
      });
    });

    await Promise.allSettled(notificationPromises);

    return new Response(
      JSON.stringify({
        message: 'Refill notifications processed',
        count: upcomingRefills.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in check-refill-dates:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});