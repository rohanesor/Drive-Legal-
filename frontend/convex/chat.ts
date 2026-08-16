import { v } from 'convex/values';
import { mutation, query, action } from './_generated/server';
import { api } from './_generated/api';

export const getAdvisories = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('aiAdvisories')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(50);
  },
});

export const saveAdvisory = mutation({
  args: {
    userId: v.id('users'),
    query: v.string(),
    response: v.string(),
    language: v.string(),
    source: v.string(),
    confidence: v.string(),
    locationContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('aiAdvisories', args);
  },
});

export const askClaude = action({
  args: {
    query: v.string(),
    language: v.string(),
    locationContext: v.optional(v.string()),
    userId: v.optional(v.id('users')),
    history: v.optional(
      v.array(v.object({ role: v.string(), content: v.string() })),
    ),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY not configured');
    }

    const locationInfo = args.locationContext || 'Unknown location';

    const systemPrompt = `You are TrafiAI (DriveLegal AI), an expert Indian traffic law assistant. You help drivers understand traffic rules, fines, penalties, and legal procedures across all Indian states.

## LANGUAGE RULES (CRITICAL)
- **Auto-detect** the language of the user's message.
- **ALWAYS reply in the SAME language** the user writes in.
- If the user writes in Tamil (தமிழ்), reply entirely in Tamil.
- If the user writes in Hindi (हिंदी), reply entirely in Hindi.
- If the user writes in Telugu, Kannada, Malayalam, Bengali, Marathi, or any other Indian language, reply in that language.
- If the user writes in English, reply in English.
- If the user mixes languages (e.g., Tanglish, Hinglish), match their style.
- The app's configured language preference is "${args.language}" — use this ONLY if you cannot detect the language from the message.

## USER LOCATION
The user is currently located at: **${locationInfo}**
Use this to provide state-specific fine amounts, local RTO information, and jurisdiction-relevant laws.

## FOLLOW-UP QUESTION RULES
When a user asks a vague or short question (e.g., "helmet fine", "license", "signal jump", "challan"):
1. **DO NOT say "I don't have information"** — instead, provide general information AND ask 1-2 specific follow-up questions to give a more precise answer.
2. Good follow-up questions include:
   - "Is this your first offense or a repeat offense?" (fine amounts differ)
   - "Are you riding a two-wheeler or driving a four-wheeler?" (rules differ)
   - "Which type of license are you asking about — learner's, permanent, or international?"
   - "Did this happen recently? The fine structure was updated in 2019 under the Motor Vehicle Amendment Act."
3. **Do NOT ask about state/city** if the location is already known from context above.
4. Structure your response as: Brief answer first → then follow-up question.

## RESPONSE FORMAT
- Be conversational, friendly, and helpful (like a knowledgeable friend, not a textbook).
- Always cite the relevant section of the Motor Vehicles Act (e.g., Section 194D for helmet violations).
- Provide exact fine amounts when possible (differentiate between first and subsequent offenses).
- If penalties vary by state, mention the specific amounts for the user's state.
- Use bullet points or numbered lists for clarity when listing multiple points.
- Keep responses concise but complete — aim for 3-6 sentences unless the topic requires more detail.
- End with a helpful tip or reminder when relevant.`;

    const chatMessages = [];
    if (args.history) {
      for (const turn of args.history) {
        chatMessages.push({
          role: turn.role === 'user' ? 'user' : 'assistant',
          content: turn.content,
        });
      }
    }
    chatMessages.push({ role: 'user', content: args.query });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: chatMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || 'No response';

    if (args.userId) {
      await ctx.runMutation(api.chat.saveAdvisory, {
        userId: args.userId,
        query: args.query,
        response: text,
        language: args.language,
        source: 'claude',
        confidence: 'verified',
        locationContext: args.locationContext,
      });
    }

    return { response: text, source: 'claude', confidence: 'verified' };
  },
});
