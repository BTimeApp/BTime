import { Router } from "express";
import { v0 } from "@/server/api/v0";
import { RedisStores } from "@/server/redis/stores";

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
