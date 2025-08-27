import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey); // Server-side client

export async function POST(request) {
  const formData = await request.formData(); // SSLCommerz sends form data
  const val_id = formData.get('val_id');
  const tran_id = formData.get('tran_id');
  const status = formData.get('status');

  if (status !== 'VALID') {
    return NextResponse.json({ message: 'Invalid payment' });
  }

  try {
    // Manual validation (optional: you can call SSLCommerz validation API if needed)
    // For now, trust the IPN status and update Supabase
    const orderId = tran_id.split('_')[1];

    await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', orderId);

    return NextResponse.json({ message: 'Payment validated and order updated' });
  } catch (error) {
    console.error('IPN error:', error);
    return NextResponse.json({ message: 'IPN error' }, { status: 500 });
  }
}