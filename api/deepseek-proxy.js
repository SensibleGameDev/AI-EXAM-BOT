module.exports = async (req, res) => {
  if (req.method !== 'POST') {
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

  const allowedBody = {
    model: body.model || 'deepseek-chat',
    messages: Array.isArray(body.messages) ? body.messages : [],
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
    max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 4096,
  };

  if (body.response_format && body.response_format.type === 'json_object') {
    allowedBody.response_format = { type: 'json_object' };
  }

  try {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
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
    return res.status(502).json({ error: `Upstream error: ${error.message}` });
  }
};
