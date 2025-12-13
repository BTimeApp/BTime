import mongoose from "mongoose";
import { DBLogger } from "@/server/logging/logger";

export const connectToDB = async () => {
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
