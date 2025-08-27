import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  const { id } = params;

  let orderId = id;
  if (!orderId) {
    console.error('Invalid order ID (undefined) in fail callback');
    const url = new URL(request.url || (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
    orderId = url.pathname.split('/')[2];
    if (!orderId) {
      console.warn('Falling back to orders list due to missing orderId');
      return NextResponse.redirect(new URL('/orders?payment=error', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
    }
  }

  const formData = await request.formData();
  const error_msg = formData.get('error');
  console.log('Payment failure for order', orderId, ':', error_msg);

  const failUrl = new URL(`/orders/${orderId}?payment=fail`, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
  console.log('Redirecting to:', failUrl.toString());
  return NextResponse.redirect(failUrl);
}