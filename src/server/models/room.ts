import { Schema, model, Error } from "mongoose";
import { IRoomUser } from "@/types/room-participant";
import {
  IRoom,
  IRoomSettings,
  RoomEvent,
  RoomFormat,
  ROOM_EVENTS,
  ROOM_FORMATS,
  MATCH_FORMATS,
  SET_FORMATS,
} from "@/types/room";
import { solveSchema } from "@/server/models/solve";

export const roomUserSchema = new Schema<IRoomUser>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  points: { type: Number, required: true, min: 0, default: 0 },
  setWins: { type: Number, required: true, min: 0, default: 0 },
  joinedAt: { type: Date, required: true, default: Date.now },
  competing: { type: Boolean, required: true, default: false },
});

export const roomSettingsSchema = new Schema<IRoomSettings>({
  roomName: { type: String, required: true },
  roomEvent: { type: String, enum: ROOM_EVENTS, required: true, default: "333" },
  roomFormat: { type: String, enum: ROOM_FORMATS, required: true, default: "CASUAL" },
  matchFormat: { type: String, enum: MATCH_FORMATS },
  setFormat: { type: String, enum: SET_FORMATS },
  isPrivate: { type: Boolean, required: true },
  password: { type: String },
  nSets: { type: Number },
  nSolves: { type: Number },
});

// Room schema
export const roomSchema = new Schema<IRoom>(
  {
    host: { type: Schema.Types.ObjectId, ref: "User" },
    users: { type: Map, of: roomUserSchema, required: true },
    solves: [solveSchema], // flattened, not nested arrays
    currentSet: { type: Number, required: true, default: 1 },
    currentSolve: { type: Number, required: true, default: 1 },
    state: { type: String, required: true, default: "WAITING" },
    winners: [{ type: Schema.Types.ObjectId, ref: "User" }],

    settings: { type: roomSettingsSchema, required: true },
  },
  {
    methods: {
      setPassword(password: string) {
        this.settings.password = password;
        return this.save();
      },
      setEvent(event: RoomEvent) {
        if (ROOM_EVENTS.includes(event)) {
          this.settings.roomEvent = event;
          return this.save();
        } else {
          throw new Error.ValidationError(
            new Error(
              `Invalid event value in setEvent(): "${event}". Must be one of: ${ROOM_EVENTS.join(
                ", "
              )}`
            )
          );
        }
      },
      setFormat(format: RoomFormat) {
        if (ROOM_FORMATS.includes(format)) {
          this.settings.roomFormat = format;
          return this.save();
        } else {
          throw new Error.ValidationError(
            new Error(
              `Invalid format value in setFormat(): "${format}". Must be one of: ${ROOM_FORMATS.join(
                ", "
              )}`
            )
          );
        }
      },
    },
  }
);

// Convert schema to model
export const RoomModel = model<IRoom>("Room", roomSchema);
