import { parseIntNaN } from "@/lib/utils";

export const PENALTIES = ["OK", "+2", "DNF"];
export type Penalty = (typeof PENALTIES)[number];

export interface IResult {
    time: number;
    penalty: Penalty;
}

/** This class represents an entire result
 *
 */
export class Result {
  private time: number;
  private penalty: Penalty;

  constructor(input: string | number, penalty?: Penalty) {
    if (typeof input === "string") {
      this.time = Result.parseTimeString(input);
    } else if (typeof input === "number") {
      //number should only be used internally.
      // Ex: string input of 10000 should parse to 1:00.00, but int input of 10000 will be 10000 centiseconds
      this.time = input;
    } else {
      throw new Error("Invalid input for Time");
    }

    penalty ? (this.penalty = penalty) : (this.penalty = "OK");
  }

  static parseTimeString(input: string): number {
    const numericalStringMatch = input.match(/^(\d*)$/);
    const decimalStringMatch = input.match(/^(\d*)\.(\d*)$/);
    const fullStringMatch = input.match(/^(\d*):(\d*)\.(\d*)$/);

    if (numericalStringMatch) {
      //alays match numerical string if possible
      const paddedInput = input.padStart(6, "0");
      const minutes = parseIntNaN(paddedInput.slice(0, -4));
      const seconds = parseIntNaN(paddedInput.slice(-4, -2));
      const centiseconds = parseIntNaN(paddedInput.slice(-2));

      return (
        minutes * 60 * 100 + seconds * 100 + centiseconds
      );
    } else if (decimalStringMatch) {
      const [, seconds, centiseconds] = decimalStringMatch;
      return (
        parseIntNaN(seconds) * 100 +
        parseIntNaN(centiseconds.padEnd(2, "0").slice(0, 2))
      );
    } else if (fullStringMatch) {
      //[...]m:[...]x.y[...]
      const [, minutes, seconds, centiseconds] = fullStringMatch;
      return (
        parseIntNaN(minutes) * 60 * 100 +
        parseIntNaN(seconds) * 100 +
        parseIntNaN(centiseconds.padEnd(2, "0").slice(0, 2))
      );
    } else {
      throw new Error(`Input could not be parsed as a time. '${input}'`);
    }
  }

  //Gets the time without penalty. Use with caution.
  getTime(): number {
    return this.time;
  }

  getPenalty(): Penalty {
    return this.penalty;
  }

  setPenalty(penalty: Penalty): void {
    this.penalty = penalty;
  }

  static applyPenalty(timeInCentiseconds: number, penalty?: Penalty): number {
    switch (penalty) {
      case undefined:
        return timeInCentiseconds;
      case "OK":
        return timeInCentiseconds;
      case "+2":
        // +2 is 200 centiseconds
        return timeInCentiseconds + 200;
      case "DNF":
        // use +inf as DNF. Consider using max integer?
        return Number.POSITIVE_INFINITY;
      default:
        // should never get triggered
        return NaN;
    }
  }

  toTime(): number {
    return Result.applyPenalty(this.time, this.penalty);
  }

  toSeconds(): number {
    return this.toTime() / 100;
  }

  /** Converts a time (in centiseconds) to a formatted time string (...mm:ss.xx). timeInCentiseconds should NOT have the penalty applied yet.
   *  
   */
  static timeToString(timeInCentiseconds: number, penalty?: Penalty): string {
    const totalTime = Result.applyPenalty(timeInCentiseconds, penalty);

    if (totalTime === Number.POSITIVE_INFINITY) {
      return "DNF";
    }

    const totalSeconds = Math.floor(totalTime / 100);
    const minutes = Math.floor(totalSeconds / 60);
    const centiseconds = totalTime % 100;
    const seconds = totalSeconds % 60;
    let resultString = `${minutes ? minutes + ":" : ""}${seconds.toString().padStart(1, "0")}.${centiseconds
      .toString()
      .padStart(2, "0")}`;
    
    if (penalty && penalty == '+2') {
        resultString += '+';
    }

    return resultString;
  }

  toString(): string {
    return Result.timeToString(this.time, this.penalty);
  }

  static fromIResult(obj: IResult): Result {
    return new Result(obj.time, obj.penalty);
  }

  toIResult(): IResult {
    return {
        time: this.time,
        penalty: this.penalty
    }
  }

  static meanOf(results: Result[]): number {
    return results.reduce((sum, res) => sum + res.toTime(), 0) / results.length;
  }

  static averageOf(results: Result[]): number {
    if (results.length <= 2) return Number.NEGATIVE_INFINITY;

    return results.sort((a, b) => a.compare(b)).slice(1, -1).reduce((sum, res) => sum + res.toTime(), 0) / (results.length - 2);
  }

  compare(other: Result): number {
    const thisTime = this.toTime();
    const otherTime = other.toTime();

    if (thisTime === Number.POSITIVE_INFINITY && otherTime === Number.POSITIVE_INFINITY) {
        // inf - inf = NaN, so handle this case manually
        return 0;
    }

    return thisTime - otherTime;
  }

  equals(other: Result): boolean {
    return this.toTime() === other.toTime();
  }

  isLessThan(other: Result): boolean {
    return this.toTime() < other.toTime();
  }

  isGreaterThan(other: Result): boolean {
    return this.toTime() > other.toTime();
  }
}
