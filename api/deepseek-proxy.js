module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Server key is not configured' });
  }

  let body = req.body;
  try {
    if (typeof body === 'string') body = JSON.parse(body);
    if (!body || typeof body !== 'object') throw new Error('empty');
  } catch {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 40 ||
      body.messages.some(m => !m || !['system', 'user', 'assistant'].includes(m.role) || typeof m.content !== 'string') ||
      JSON.stringify(body.messages).length > 120000) {
    return res.status(400).json({ error: 'Invalid or oversized messages' });
  }

  const allowedBody = {
    model: 'deepseek-chat',
    messages: body.messages.map(({ role, content }) => ({ role, content })),
    temperature: Number.isFinite(body.temperature) ? Math.max(0, Math.min(2, body.temperature)) : 0.7,
    max_tokens: Number.isFinite(body.max_tokens) ? Math.max(1, Math.min(4096, Math.floor(body.max_tokens))) : 4096,
  };

  if (body.response_format && body.response_format.type === 'json_object') {
    allowedBody.response_format = { type: 'json_object' };
  }

  try {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      signal: AbortSignal.timeout(55000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(allowedBody),
    });

    const text = await resp.text();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(resp.status).send(text);
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(error.name === 'TimeoutError' ? 504 : 502).json({
      error: error.name === 'TimeoutError' ? 'AI request timed out. Try a shorter request.' : 'AI service is temporarily unavailable',
    });
  }
};
