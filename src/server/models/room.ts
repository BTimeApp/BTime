import { Schema, model, Error } from 'mongoose';
import { IRoomUser } from '@/types/roomUser';
import { IRoom, ROOM_EVENTS, ROOM_FORMATS, RoomEvent, RoomFormat } from '@/types/room';
import { solveSchema } from '@/server/models/solve';

export const roomUserSchema = new Schema<IRoomUser>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    points: { type: Number, required: true, min: 0, default: 0 },
    setWins: { type: Number, required: true, min: 0, default: 0 },
    joinedAt: {type: Date, required: true, default: Date.now },
});

export const roomSchema = new Schema<IRoom>({
    roomName: { type: String, required: true},
    host: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    competitors: [roomUserSchema],
    spectators: [roomUserSchema],
    solves: [solveSchema],
    roomEvent: { type: String, enum: ROOM_EVENTS, required: true, default: '333'}, 
    roomFormat: { type: String, enum: ROOM_FORMATS, required: true, default: 'casual'}, 
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