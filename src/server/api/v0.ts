import { Application } from "express";
import { Router } from "express";
import { PassportStatic } from "passport";
import { authMiddleware } from "../auth";

/** Adds sub-API routes (v0) to an application. Meant to be used from within the /api route. ([btime]/api/v0/...)
 *
 */
export function v0(app: Application, passportInstance: PassportStatic): Router {
  const router = Router();

  router.use("/me", authMiddleware, (req, res) => {
    res.json(req.user);
  });


  return router;
}
