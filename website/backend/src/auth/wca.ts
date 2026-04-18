
import type { RedisStores } from "@/redis/stores.js";
import type { PassportStatic } from "passport";

import { AuthLogger } from "@/logging/logger.js";
import { toIUser } from "@/models/user.js";
import { db } from "@/database/database.js";
import { users } from "@/database/schema.js";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { Strategy as CustomStrategy } from "passport-custom";

export function createWCAAuth(
  passport: PassportStatic,
  stores: RedisStores
): Router {
  // add WCA auth strategy to passport
  passport.use(
    "wca",
    new CustomStrategy(async (req, done) => {
      try {
        const code = req.query.code as string;
        if (!code) {
          return done(new Error("Missing code parameter"));
        }

        const tokenParams = new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: process.env.WCA_CALLBACK_URL!,
          client_id: process.env.WCA_CLIENT_ID!,
          client_secret: process.env.WCA_CLIENT_SECRET!,
        });

        const tokenResponse = await fetch(
          `${process.env.WCA_SOURCE}/oauth/token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
            },
            body: tokenParams.toString(),
          }
        );

        if (!tokenResponse.ok) {
          AuthLogger.error({ tokenResponse }, "WCA token request failed");
          throw new Error(
            `WCA token request failed with status ${tokenResponse.status}`
          );
        }

        const tokenData = await tokenResponse.json();

        const profileResponse = await fetch(
          `${process.env.WCA_SOURCE}/api/v0/me`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              Accept: "application/json",
            },
          }
        );
        const profileData = await profileResponse.json();
        const profile = profileData.me;

        const existingUser = await db.query.users.findFirst({
          where: eq(users.wcaIdNo, profile.id)
        });

        let user;
        if (existingUser) {
          [user] = await db.update(users).set({
            name: profile.name,
            wcaId: profile.wca_id,
            avatarURL: profile.avatar?.thumb_url,
            updatedAt: new Date(),
          }).where(eq(users.id, existingUser.id)).returning();
        } else {
          [user] = await db.insert(users).values({
            name: profile.name,
            wcaIdNo: profile.id,
            wcaId: profile.wca_id,
            avatarURL: profile.avatar?.thumb_url,
            email: profile.email,
            userName: profile.wca_id ?? `BTimeUser${profile.id}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning();
        }

        return done(null, user ? toIUser(user) : null);
      } catch (err) {
        return done(err as Error);
      }
    })
  );

  // add routes to router
  const router = Router();

  router.get("/", (req, res) => {
    const redirectTo = req.query.redirect?.toString() || "/";
    const state = encodeURIComponent(JSON.stringify({ redirectTo }));
    const authUrl = `${process.env.WCA_SOURCE}/oauth/authorize?client_id=${process.env.WCA_CLIENT_ID}&redirect_uri=${process.env.WCA_CALLBACK_URL}&response_type=code&scope=public+email&state=${state}`;
    res.redirect(authUrl);
  });

  router.get("/callback", (req, res, next) => {
    passport.authenticate(
      "wca",
      { failureRedirect: "/profile", session: true },
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err: any, user: any, info: any) => {
        if (err) {
          AuthLogger.error({ err }, "Passport error");
          return res.status(500).send("OAuth failed");
        }
        if (!user) {
          AuthLogger.error({ info }, "No user returned");
          return res.redirect("/profile");
        }
        req.logIn(user, async (err) => {
          if (err) {
            AuthLogger.error({ err }, "Login error");
            return res.redirect("/profile");
          }

          let redirectTo = "/";

          try {
            if (req.query.state) {
              const state = JSON.parse(
                decodeURIComponent(req.query.state as string)
              );
              if (state.redirectTo && typeof state.redirectTo === "string") {
                redirectTo = state.redirectTo;
              }
            }
          } catch (e) {
            AuthLogger.warn({ e }, "WCAAuth received invalid state param");
          }

          // authentication successful
          const user = req.user;

          if (!user) {
            //this one should never happen...
            AuthLogger.warn("No User in auth wca callback...");
          } else {
            await stores.users.setUser(user.userInfo);
          }

          res.redirect(redirectTo);
        });
      }
    )(req, res, next);
  });

  return router;
}
