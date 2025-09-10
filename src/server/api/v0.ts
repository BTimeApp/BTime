import { Router } from "express";
import { authMiddleware } from "@/server/auth";
import { rooms, users } from "@/server/server-objects";
import { IRoomSummary, roomToSummary } from "@/types/room-listing-info";
import { toIUser, UserDocument, UserModel } from "@/server/models/user";
import { IUser } from "@/types/user";

/** Adds sub-API routes (v0) to an application. Meant to be used from within the /api route. ([btime]/api/v0/...)
 *
 */
export function v0(): Router {
  const router = Router();

  /**
   * Returns user information. Requires user to be logged in for this to work.
   */
  router.get("/me", authMiddleware, (req, res) => {
    res.json(req.user);
  });

  /**
   * Updates user information.
   */
  router.put("/me", authMiddleware, (req, res) => {
    const userId = req.user?.userInfo.id;
    if (!userId) {
      res
        .status(400)
        .json({ success: false, message: "Req.user object had no ID." });
      return;
    }

    if (!req.body) {
      res
        .status(400)
        .json({ success: false, message: "Nonexistent request body field." });
      return;
    }

    const allowedUpdateFields = ["userName", "name"];
    const updates: Partial<Record<string, string>> = {};
    for (const key of allowedUpdateFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    UserModel.findOneAndUpdate(
      { _id: userId },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .lean()
      .then((updatedUser: UserDocument | null) => {
        if (!updatedUser) {
          //user not found
          res.status(404).json({ success: false, message: "User not found." });
          return;
        }

        const iUser: IUser = toIUser(updatedUser);

        //update the user in server object - this refreshes the user info for things like room creation
        users.set(iUser.userInfo.id, iUser.userInfo);

        res
          .status(200)
          .json({
            success: true,
            message: "Successful profile update!",
            updatedUser: iUser,
          });
        return;
      })
      .catch((err) => {
        if (err.name === "ValidationError") {
          res.status(400).json({ success: false, message: err.message });
          return;
        }
      
        if (err.code === 11000 && err.keyPattern?.userName) {
          res.status(400).json({ success: false, message: "Username is already taken." });
          return;
        }

        res
          .status(500)
          .json({
            success: false,
            message: "User update failed due to server error.",
          });
        return;
      });
  });

  /**
   * Returns room information.
   * TODO: implement filtering (i.e. looking up by specific rooms), pagination, etc.
   */
  router.get("/rooms", (req, res) => {
    //preserve the [[id, value]] structure while converting full room info to room summaries.
    const roomSummaryList: [string, IRoomSummary][] = Array.from(rooms).map(
      (x) => [x[0], roomToSummary(x[1])]
    );
    res.send(roomSummaryList);
  });

  return router;
}
