import mongoose from "mongoose";
import { DBLogger } from "@/logging/logger.js";

export const connectToDB = async () => {
  if (!process.env.DB_URI) {
    throw new Error("DB_URI must be set in environment");
  }
  await mongoose
    .connect(process.env.DB_URI)
    .then(() => {
      DBLogger.info("Connected to DB.");
    })
    .catch((err) => {
      DBLogger.error({ err }, "Error when connecting to DB");
      process.exit();
    });
};
