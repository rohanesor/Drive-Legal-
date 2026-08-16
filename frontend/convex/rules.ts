import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getByRegion = query({
  args: { regionId: v.id('regions') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('violationRules')
      .withIndex('by_region', (q) => q.eq('regionId', args.regionId))
      .collect();
  },
});

export const upsertRule = mutation({
  args: {
    regionId: v.id('regions'),
    code: v.string(),
    title: v.string(),
    description: v.string(),
    fineAmount: v.number(),
    currency: v.string(),
    compoundable: v.boolean(),
    vehicleTypes: v.array(v.string()),
    conditions: v.optional(v.string()),
    lawReference: v.string(),
    severity: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('violationRules', args);
  },
});

export const upsertMany = mutation({
  args: {
    rules: v.array(
      v.object({
        code: v.string(),
        title: v.string(),
        description: v.string(),
        fineAmount: v.number(),
        currency: v.string(),
        compoundable: v.boolean(),
        vehicleTypes: v.array(v.string()),
        conditions: v.optional(v.string()),
        lawReference: v.string(),
        severity: v.string(),
      }),
    ),
    regionId: v.id('regions'),
  },
  handler: async (ctx, args) => {
    for (const rule of args.rules) {
      await ctx.db.insert('violationRules', {
        ...rule,
        regionId: args.regionId,
      });
    }
  },
});
