import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, system_prompt } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Messages array required' }, { status: 400 });
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return Response.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const apiMessages = [];
    if (system_prompt) {
      apiMessages.push({ role: 'system', content: system_prompt });
    }
    for (const msg of messages) {
      apiMessages.push({ role: msg.role, content: msg.content });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'bizwin.lol AI Mentor',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v3.2',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 4000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      return Response.json({ error: 'AI request failed' }, { status: response.status });
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {
                // Skip unparseable chunks
              }
            }
          }
        } catch (err) {
          console.error('Stream error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Chat API error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
