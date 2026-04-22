import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  userName: varchar("userName", { length: 25 }).notNull().unique(),
  email: text("email").notNull(),
  wcaId: varchar("wcaId", { length: 20 }),
  wcaIdNo: integer("wcaIdNo"),
  avatarURL: text("avatarURL"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
