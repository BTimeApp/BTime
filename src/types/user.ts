export interface IUser {
  userInfo: IUserInfo;
  userPrivateInfo: IUserPrivateInfo;
}

/**
 * Public information about a user. This is intended to be "public information" that other users can view about you. Things like rankings or stats don't count
 */
export interface IUserInfo {
  id: string; //user id
  userName: string; //username
  avatarURL?: string;
}

/**
 * Private information about a user. This information should never be exposed to other users through websocket
 */
export interface IUserPrivateInfo {
  email: string;
  wcaId?: string;
  name: string;
}
