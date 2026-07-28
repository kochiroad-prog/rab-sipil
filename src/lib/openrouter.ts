const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function askOpenRouter(messages: ChatMessage[], model = 'openai/gpt-4o-mini') {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY belum di-set di environment variables')
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // opsional, dipakai OpenRouter untuk ranking/analytics
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'Estimator Sipil & Konstruksi',
    },
    body: JSON.stringify({ model, messages }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenRouter error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content as string | undefined
}
