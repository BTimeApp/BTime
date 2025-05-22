import { Schema, Types, model, Document, PopulatedDoc } from 'mongoose';
import {IUser} from '@/types/user';
import {IRoomUser} from '@/types/roomUser';
import {IRoom, ROOM_EVENTS, ROOM_FORMATS} from '@/types/room';

export const roomUserSchema = new Schema<IRoomUser>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    points: { type: Number, required: true, min: 0, default: 0 },
    setWins: { type: Number, required: true, min: 0, default: 0 },
    joinedAt: {type: Date, required: true, default: Date.now },
});

export const roomSchema = new Schema<IRoom>({
    roomName: { type: String, required: true},
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    competitors: [roomUserSchema],
    spectators: [roomUserSchema],
    event: { type: String, enum: ROOM_EVENTS, required: true, default: '333'}, 
    format: { type: String, enum: ROOM_FORMATS, required: true, default: 'casual'}, 
    isPrivate: { type: Boolean, required: true},
    state: {type: String, required: true, default: "waiting"},
    password: {type: String, required: false},
});

//convert schema to JS type and export
export const RoomModel = model<IRoom>("Room", roomSchema);