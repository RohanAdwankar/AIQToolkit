import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { input_message } = await req.json();
    if (!input_message || typeof input_message !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid input_message' }, { status: 400 });
    }
    // Forward the message to the backend Python server using the streaming endpoint
    const resp = await fetch('http://localhost:8000/generate/full', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input_message }),
    });
    // Stream the response and collect raw data
    const reader = resp.body?.getReader();
    let decoder = new TextDecoder();
    let result = '';
    if (reader) {
      let done = false;
      let chunkCount = 0;
      while (!done) {
        const { value: chunk, done: chunkDone } = await reader.read();
        chunkCount++;
        if (chunk) {
          const text = decoder.decode(chunk, { stream: true });
          console.log('Received chunk', chunkCount, 'length:', chunk.length, 'text:', text.slice(0, 200));
          result += text;
        } else {
          console.warn('Received empty chunk from stream at chunk', chunkCount);
        }
        done = chunkDone;
      }
      if (!result) {
        console.warn('No data was collected from the stream.');
      } else {
        console.log('Final result length:', result.length, 'First 500 chars:', result.slice(0, 500));
      }
    } else {
      console.error('No reader available for response body.');
    }
    // Instead of parsing, just return all the raw data for now
    return NextResponse.json({ raw: result });
  } catch (err) {
    console.error('Error in /api/ask route:', err);
    return NextResponse.json({ error: 'Failed to contact backend.', details: String(err) }, { status: 500 });
  }
}
