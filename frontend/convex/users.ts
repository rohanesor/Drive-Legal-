import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    state: v.string(),
    vehicleType: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) return existing;

    return await ctx.db.insert("users", {
      ...args,
      driveScore: 100,
    });
  },
});

export const updateDriveScore = mutation({
  args: {
    userId: v.id("users"),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { driveScore: args.score });
  },
});
