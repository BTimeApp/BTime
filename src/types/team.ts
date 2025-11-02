import { IUserInfo } from "@/types/user";

export interface ITeam {
  name: string;
  members: Record<string, IUserInfo>; 
}
