import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

export const getAdvisories = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiAdvisories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

export const saveAdvisory = mutation({
  args: {
    userId: v.id("users"),
    query: v.string(),
    response: v.string(),
    language: v.string(),
    source: v.string(),
    confidence: v.string(),
    locationContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiAdvisories", args);
  },
});

export const askClaude = action({
  args: {
    query: v.string(),
    language: v.string(),
    locationContext: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error("CLAUDE_API_KEY not configured");
    }

    const systemPrompt = `You are DriveLegal AI, a legal mobility assistant for drivers.
Answer traffic law questions accurately with citations.
User language: ${args.language}
${args.locationContext ? `Location context: ${args.locationContext}` : ""}
Provide: clear answer, legal basis, fine amount if applicable, and confidence level.`;

    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: args.query }],
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "No response";

    if (args.userId) {
      await ctx.runMutation(api.chat.saveAdvisory, {
        userId: args.userId,
        query: args.query,
        response: text,
        language: args.language,
        source: "claude",
        confidence: "verified",
        locationContext: args.locationContext,
      });
    }

    return { response: text, source: "claude", confidence: "verified" };
  },
});
