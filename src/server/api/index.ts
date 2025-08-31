import { Router } from "express";
import { v0 } from "@/server/api/v0";


/** Adds API routes to an application. Meant to be used from the main server.ts file. ([btime]/api/...)
 * 
 */
export function api(): Router {
    //assume all auth middleware has been set up already.
    const router = Router();

    //add diff api versions here...
    router.use('/v0', v0());


    return router;
}