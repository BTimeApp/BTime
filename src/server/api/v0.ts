import { Application } from "express";
import { Router } from "express";
import { PassportStatic } from "passport";

/** Adds sub-API routes (v0) to an application. Meant to be used from within the /api route. ([btime]/api/v0/...)
 *
 */
export function v0(app: Application, passportInstance: PassportStatic): Router {
  const router = Router();
  router.use("/me", (req, res) => {
    if (req.isAuthenticated()) {
        res.json(req.user);
      } else {
        res.status(401).json({ error: "Not authenticated" });
      }
  });

  return router;
}
