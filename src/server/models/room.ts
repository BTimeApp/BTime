import { Schema, model, Error } from 'mongoose';
import { IRoomUser } from '@/types/roomUser';
import { IRoom, MATCH_FORMATS, ROOM_EVENTS, ROOM_FORMATS, RoomEvent, RoomFormat, SET_FORMATS } from '@/types/room';
import { solveSchema } from '@/server/models/solve';

export const roomUserSchema = new Schema<IRoomUser>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    points: { type: Number, required: true, min: 0, default: 0 },
    setWins: { type: Number, required: true, min: 0, default: 0 },
    joinedAt: {type: Date, required: true, default: Date.now },
    competing: {type: Boolean, required: true, default: false},
});

export const roomSchema = new Schema<IRoom>({
    roomName: { type: String, required: true},
    host: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    users: { type: Map, of: roomUserSchema, required: true},
    solves: [[solveSchema]],
    currentSet: {type: Number, required: true, default: 1}, 
    currentSolve: {type: Number, required: true, default: 1}, 
    roomEvent: { type: String, enum: ROOM_EVENTS, required: true, default: '333'}, 
    roomFormat: { type: String, enum: ROOM_FORMATS, required: true, default: 'casual'},
    matchFormat: { type: String, enum: MATCH_FORMATS, required: false},
    setFormat: {type: String, enum: SET_FORMATS, required: false}, 
    nSets: { type: Number, required: false},
    nSolves: {type: Number, required: false}, 
    isPrivate: { type: Boolean, required: true},
    state: {type: String, required: true, default: "waiting"},
    password: {type: String, required: false},
}, {
    methods: {
        setPassword(password: string) {
            this.password = password;
            return this.save();
        },
        setEvent(event: RoomEvent) {
            if (ROOM_EVENTS.includes(event)) {
                this.roomEvent = event;
                return this.save();
            } else {
                throw new Error.ValidationError(
                    new Error(`Invalid event value in setEvent(): "${event}". Must be one of: ${ROOM_EVENTS.join(', ')}`)
                  );
            }
        },
        setFormat(format: RoomFormat) {
            if (ROOM_FORMATS.includes(format)) {
                this.roomFormat = format;
                return this.save();
            } else {
                throw new Error.ValidationError(
                    new Error(`Invalid format value in setFormat(): "${format}". Must be one of: ${ROOM_FORMATS.join(', ')}`)
                )
            }
        }
    },
});

//convert schema to JS type and export
export const RoomModel = model<IRoom>("Room", roomSchema);