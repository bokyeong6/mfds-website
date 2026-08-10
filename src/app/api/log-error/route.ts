import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.error('\n=======================================');
    console.error('🔴 CLIENT-SIDE RUNTIME ERROR DETECTED:');
    console.error(JSON.stringify(body, null, 2));
    console.error('=======================================\n');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
