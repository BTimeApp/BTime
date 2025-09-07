export interface IUser {
  id: string;
  name: string;
  email: string;
  userName: string;
  wcaId?: string;
  avatarURL?: string;
}

export interface IUserInfo {
  id: string; //user id
  userName: string //username
}

export function iUserToIUserInfo(iUser: IUser): IUserInfo {
  return {
    id: iUser.id,
    userName: iUser.userName
  }
}