import { Schema } from "mongoose";
import { PENALTIES, IResult, ISolve } from "@/types/solve";


const resultSchema = new Schema<IResult>({
    time: { type: Number, required: true },
    penalty: { type: String, enum: PENALTIES, required: true },
});

export const solveSchema = new Schema<ISolve>({
    id: {type: Number, required: true},
    scramble: {type: String, required: true},
    results: {type: Map, of: resultSchema}, //map keys are always strings: https://mongoosejs.com/docs/schematypes.html#maps
});