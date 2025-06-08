import { Application } from "express";
import { Router } from "express";
import { PassportStatic } from "passport";
import { v0 } from "./v0";


/** Adds API routes to an application. Meant to be used from the main server.ts file. ([btime]/api/...)
 * 
 */
export function api(app: Application, passportInstance: PassportStatic): Router {
    //assume all auth middleware has been set up already.
    const router = Router();

    //add diff api versions here...
    router.use('/v0', v0(app, passportInstance));


    return router;
}