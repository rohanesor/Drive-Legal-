import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    state: v.string(),
    vehicleType: v.string(),
    driveScore: v.number(),
  }).index("by_email", ["email"]),

  regions: defineTable({
    country: v.string(),
    state: v.string(),
    city: v.optional(v.string()),
    boundaryGeoJson: v.string(),
    rulesetVersion: v.number(),
  }).index("by_location", ["country", "state"]),

  violationRules: defineTable({
    regionId: v.id("regions"),
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
  }).index("by_region", ["regionId"]),

  aiAdvisories: defineTable({
    userId: v.id("users"),
    query: v.string(),
    response: v.string(),
    language: v.string(),
    source: v.string(),
    confidence: v.string(),
    locationContext: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  emergencyContacts: defineTable({
    regionId: v.id("regions"),
    type: v.string(),
    name: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
  }).index("by_region", ["regionId"]),

  drivingHistory: defineTable({
    userId: v.id("users"),
    timestamp: v.number(),
    lat: v.number(),
    lng: v.number(),
    speed: v.number(),
    eventType: v.string(),
  }).index("by_user", ["userId"]),

  syncLogs: defineTable({
    userId: v.id("users"),
    tableName: v.string(),
    lastSync: v.number(),
  }).index("by_user_table", ["userId", "tableName"]),
});
