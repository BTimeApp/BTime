import { Router } from "express";
import { authMiddleware } from "../auth";
import { rooms } from "../server_objects";

/** Adds sub-API routes (v0) to an application. Meant to be used from within the /api route. ([btime]/api/v0/...)
 *
 */
export function v0(): Router {
  const router = Router();

  /**
   * Returns user information. Requires user to be logged in for this to work.
   */
  router.use("/me", authMiddleware, (req, res) => {
    res.json(req.user);
  });


  /** 
   * Returns room information. 
   * TODO: implement filtering (i.e. looking up by specific rooms)
   */
  router.get("/rooms", (req, res) => {
    res.json(Array.from(rooms));
  }) 

  return router;
}
