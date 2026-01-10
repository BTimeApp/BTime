import type { RedisStores } from "@/redis/stores.js";

import { v0 } from "@/api/v0.js";
import { Router } from "express";

/** Adds API routes to an application. Meant to be used from the main server.ts file. ([btime]/api/...)
 *
 */
export function api(stores: RedisStores): Router {
  //assume all auth middleware has been set up already.
  const router = Router();

  //add diff api versions here...
  router.use("/v0", v0(stores));

  return router;
}
