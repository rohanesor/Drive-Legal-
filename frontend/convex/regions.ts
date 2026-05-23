import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("regions").collect();
  },
});

export const getByLocation = query({
  args: { country: v.string(), state: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("regions")
      .withIndex("by_location", (q) =>
        q.eq("country", args.country).eq("state", args.state)
      )
      .first();
  },
});

export const upsert = mutation({
  args: {
    country: v.string(),
    state: v.string(),
    city: v.optional(v.string()),
    boundaryGeoJson: v.string(),
    rulesetVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("regions")
      .withIndex("by_location", (q) =>
        q.eq("country", args.country).eq("state", args.state)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("regions", args);
  },
});
