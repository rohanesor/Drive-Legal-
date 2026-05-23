import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByRegion = query({
  args: { regionId: v.id("regions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emergencyContacts")
      .withIndex("by_region", (q) => q.eq("regionId", args.regionId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    regionId: v.id("regions"),
    type: v.string(),
    name: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("emergencyContacts", args);
  },
});

export const upsertMany = mutation({
  args: {
    contacts: v.array(
      v.object({
        type: v.string(),
        name: v.string(),
        phone: v.string(),
        address: v.optional(v.string()),
      })
    ),
    regionId: v.id("regions"),
  },
  handler: async (ctx, args) => {
    for (const c of args.contacts) {
      await ctx.db.insert("emergencyContacts", { ...c, regionId: args.regionId });
    }
  },
});
