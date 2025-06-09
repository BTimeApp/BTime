import OAuth2Strategy from "passport-oauth2";
import axios from "axios";
import { PassportStatic } from "passport";
import { UserDocument, UserModel, toIUser } from "@/server/models/user";
import { IUser } from "@/types/user";

export function configureWCAPassport(passportInstance: PassportStatic) {
  const authURL = `${process.env.WCA_SOURCE}/oauth/authorize`;
  const authTokenURL = `${process.env.WCA_SOURCE}/oauth/token`;
  const userProfileURL = `${process.env.WCA_SOURCE}/api/v0/me`;

  const verify = async (
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any, info?: any) => void
  ) => {
    try {
      console.log(`fetching data from ${userProfileURL}...`);

      const res = await axios
        .get(userProfileURL, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        .then((res) => res.data);

      const profile = res.me;

      // query DB and update. If user doesn't exist, create.
      UserModel.findOneAndUpdate(
        {
          wcaIdNo: profile.id,
        },
        {
          name: profile.name,
          wcaIdNo: profile.id,
          wcaId: profile.wca_id,
          avatarURL: profile.avatar?.thumb_url,
          $setOnInsert: { email: profile.email }, //only set email upon insertion (protect against overriding existing email from email OAuth)
        },
        {
          upsert: true,
          useFindAndModify: false,
          setDefaultsOnInsert: true,
          new: true,
        }
      )
        .lean()
        .then((user: UserDocument) => done(null, toIUser(user)))
        .catch((err) => done(err));
    } catch (err) {
      done(err);
    }
  };

  passportInstance.use(
    "wca",
    new OAuth2Strategy(
      {
        //strategy options
        authorizationURL: authURL,
        tokenURL: authTokenURL,
        clientID: process.env.WCA_CLIENT_ID,
        clientSecret: process.env.WCA_CLIENT_SECRET,
        callbackURL: process.env.WCA_CALLBACK_URL,
        skipUserProfile: true,
      },
      verify
    )
  );

  passportInstance.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passportInstance.deserializeUser(async (id: string, done) => {
    //id is the objectId of the user in DB.
    UserModel.findOne({ _id: id })
      .then((user) => {
        // find fail
        if (!user) {
          return done(null, false);
        }

        return done(null, toIUser(user) as Express.User);
      })
      .catch((err) => {
        return done(err);
      });
  });
}
