import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getLastSync = query({
  args: { userId: v.id("users"), tableName: v.string() },
  handler: async (ctx, args) => {
    const log = await ctx.db
      .query("syncLogs")
      .withIndex("by_user_table", (q) =>
        q.eq("userId", args.userId).eq("tableName", args.tableName)
      )
      .first();
    return log?.lastSync ?? 0;
  },
});

export const recordSync = mutation({
  args: {
    userId: v.id("users"),
    tableName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("syncLogs")
      .withIndex("by_user_table", (q) =>
        q.eq("userId", args.userId).eq("tableName", args.tableName)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { lastSync: now });
    } else {
      await ctx.db.insert("syncLogs", {
        userId: args.userId,
        tableName: args.tableName,
        lastSync: now,
      });
    }
  },
});

export const getPendingSyncTables = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("syncLogs")
      .withIndex("by_user_table", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
