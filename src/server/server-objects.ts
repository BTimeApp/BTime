/**
 * Use this file to store global server objects (best for ephemeral data).
 * Note that anything added here will exist per server process.
 * If the data you intend to add needs to be shared by the whole backend, make a redis store type.
 */

export const isProd = process.env.NODE_ENV === "production";
