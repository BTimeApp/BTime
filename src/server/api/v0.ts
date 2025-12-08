import { Router } from "express";
import { authMiddleware } from "@/server/auth";
import { toIUser, UserDocument, UserModel } from "@/server/models/user";
import { IUser } from "@/types/user";
import { type RedisStores } from "@/server/redis/stores";

/** Adds sub-API routes (v0) to an application. Meant to be used from within the /api route. ([btime]/api/v0/...)
 *
 */
export function v0(stores: RedisStores): Router {
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
      .lean<UserDocument>()
      .then((updatedUser) => {
        if (!updatedUser) {
          //user not found
          res.status(404).json({ success: false, message: "User not found." });
          return;
        }

        const iUser: IUser = toIUser(updatedUser);

        //update the user in server object - this refreshes the user info for things like room creation
        stores.users.setUser(iUser.userInfo);

        res.status(200).json({
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
          res
            .status(400)
            .json({ success: false, message: "Username is already taken." });
          return;
        }

        res.status(500).json({
          success: false,
          message: "User update failed due to server error.",
        });
        return;
      });
  });

  /**
   * Returns room information in paginated format.
   * TODO: implement filtering (i.e. looking up by specific rooms), sorting on certain keys, etc.
   *
   * Inputs
   *  - page        the page "index" to query
   *  - pageSize    the number of rooms to get per page
   *
   * Output (JSON):
   *  - rooms       a list rooms available for this page in room summary format. IRoomSummary[] | null
   *  - totalPages  the total number of pages that exist with the given page size
   *  - total       the total number of rooms that exist
   */
  router.get("/rooms", async (req, res) => {
    // by default, we will return the first 20 rooms
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.limit as string) || 20;
    if (pageSize < 1 || page <= 0) {
      res.status(400);
      return;
    }

    const { roomSummaries, totalPages, totalRooms } =
      await stores.rooms.getRoomsPage(page, pageSize);

    res.json({
      rooms: roomSummaries,
      totalPages,
      total: totalRooms,
    });
  });

  return router;
}
