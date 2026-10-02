export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');

    if (!q || !q.trim()) {
      return new Response('Missing text query', { status: 400 });
    }

    const cleanText = q.slice(0, 200);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(cleanText)}`;

    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return new Response('TTS upstream error', { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response('Internal TTS Server Error', { status: 500 });
  }
}
