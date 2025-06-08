import OAuth2Strategy from "passport-oauth2";
import axios from 'axios';
import { PassportStatic } from "passport";

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  wca_id: string;
  avatar_url?: string;
}

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

      const res = await axios.get(userProfileURL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).then((res) => res.data);

      const profile = res.me;

      // TODO - convert this scheme to fetching from the DB and returning the user. If no user currently exists, make one. 
      const user: UserProfile = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        wca_id: profile.wca_id,
        avatar_url: profile.avatar?.thumb_url,
      };

      done(null, user);
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

  // Required for session support
  passportInstance.serializeUser((user, done) => {
    done(null, user);
  });

  passportInstance.deserializeUser((obj: any, done) => {
    done(null, obj);
  });
}
