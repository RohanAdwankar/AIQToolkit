import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { input_message } = await req.json();
    if (!input_message || typeof input_message !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid input_message' }, { status: 400 });
    }
    // Forward the message to the backend Python server
    const resp = await fetch('http://localhost:8000/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input_message }),
    });
    const data = await resp.json();
    return NextResponse.json({ value: data.value });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to contact backend.' }, { status: 500 });
  }
}
