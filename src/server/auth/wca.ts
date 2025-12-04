import { Router } from "express";
import { PassportStatic } from "passport";
import { Strategy as CustomStrategy } from "passport-custom";
import { UserModel, UserDocument, toIUser } from "@/server/models/user";
import { RedisStores } from "@/server/redis/stores";

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
          const errorText = await tokenResponse.text();
          console.error("WCA token request failed");
          console.error("Status:", tokenResponse.status);
          console.error("Headers:", tokenResponse.headers);
          console.error("Body:", errorText);
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

        UserModel.findOneAndUpdate(
          {
            wcaIdNo: profile.id,
          },
          {
            name: profile.name,
            wcaIdNo: profile.id,
            wcaId: profile.wca_id,
            avatarURL: profile.avatar?.thumb_url,
            $setOnInsert: {
              //only set these fields upon insertion (protect against overriding existing fields from other OAuth/user changing)
              email: profile.email,
              userName: profile.wca_id ?? `BTimeUser${profile.id}`, //null WCAID is possible - fallback to profile id number, which is unique
            },
          },
          {
            upsert: true,
            useFindAndModify: false,
            setDefaultsOnInsert: true,
            new: true,
          }
        )
          .lean<UserDocument>()
          .then((user) => done(null, user ? toIUser(user) : null))
          .catch((err) => done(err));
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
          console.error("Passport error:", err);
          return res.status(500).send("OAuth failed");
        }
        if (!user) {
          console.error("No user returned. Info:", info);
          return res.redirect("/profile");
        }
        req.logIn(user, async (err) => {
          if (err) {
            console.error("Login error:", err);
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
            console.warn("Invalid state param:", e);
          }

          // authentication successful - TODO make this redirect to previous page (or other custom logic)
          const user = req.user;

          if (!user) {
            //this one should never happen...
            console.log("No User in auth wca callback...");
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
