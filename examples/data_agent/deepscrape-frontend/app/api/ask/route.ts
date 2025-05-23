import { NextRequest } from 'next/server';

export const runtime = 'edge'; // Ensure edge runtime for streaming

export async function POST(req: NextRequest) {
  const { input_message } = await req.json();
  if (!input_message || typeof input_message !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing or invalid input_message' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Connect to the Python backend and stream the response
  const backendResp = await fetch('http://localhost:8000/generate/full?filter_steps=LLM_NEW_TOKEN', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input_message }),
  });

  if (!backendResp.body) {
    return new Response(JSON.stringify({ error: 'No response body from backend.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create a ReadableStream that forwards each chunk as an SSE event
  const stream = new ReadableStream({
    async start(controller) {
      // backendResp.body is guaranteed not null here
      const reader = backendResp.body!.getReader();
      const encoder = new TextEncoder();
      let decoder = new TextDecoder();
      let done = false;
      try {
        while (!done) {
          const { value, done: chunkDone } = await reader.read();
          done = chunkDone;
          if (value) {
            const text = decoder.decode(value, { stream: true });
            // Send as SSE event
            controller.enqueue(encoder.encode(`data: ${text.replace(/\n/g, '\ndata: ')}\n\n`));
          }
        }
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`event: error\ndata: ${String(err)}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      // CORS for local dev
      'Access-Control-Allow-Origin': '*',
    },
  });
}
