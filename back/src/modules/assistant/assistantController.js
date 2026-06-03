import { chatRequestSchema } from './assistantSchemas.js';
import { runAssistantChat } from './assistantService.js';

const zodErrors = (error) => error.issues?.map((item) => ({
  path: item.path.join('.'),
  message: item.message,
}));

const getAssistantErrorResponse = (error) => {
  const message = String(error?.message || '');
  const status = Number(error?.status || error?.code || 0);

  if (message.includes('OPENAI_API_KEY')) {
    return { status: 503, error: 'AI assistant is not configured' };
  }

  if (message.includes('GEMINI_API_KEY')) {
    return { status: 503, error: 'Gemini assistant is not configured' };
  }

  if (status === 429 || message.includes('429') || message.toLowerCase().includes('quota')) {
    return {
      status: 429,
      error: 'OpenAI quota or rate limit reached. Check your OpenAI billing, usage limits, or try again later.',
    };
  }

  if (status === 401 || message.includes('401')) {
    return {
      status: 503,
      error: 'AI provider API key is invalid or unauthorized.',
    };
  }

  if (status >= 500) {
    return {
      status: 502,
      error: 'OpenAI service is temporarily unavailable.',
    };
  }

  return { status: 500, error: 'Unable to process assistant chat' };
};

export const chatWithAssistant = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const payload = chatRequestSchema.parse(req.body || {});
    const result = await runAssistantChat({
      user: req.user,
      message: payload.message,
      context: payload.context,
      conversationId: payload.conversationId,
    });

    return res.json(result);
  } catch (error) {
    console.error('[assistant] chat error', {
      userId: req.user?.id,
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    });

    if (error.issues) {
      return res.status(400).json({ error: 'Invalid assistant request', details: zodErrors(error) });
    }

    const response = getAssistantErrorResponse(error);
    return res.status(response.status).json({ error: response.error });
  }
};
