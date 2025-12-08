import { parseIntNaN } from "@/lib/utils";

/**
 * Store DNF as JS's max number because NaN, Infinity are not JSON serializable
 * see https://stackoverflow.com/questions/57127297/serialization-of-nan-and-infinity-in-json-why-not-supported
 */
export const DNF = Number.MAX_VALUE;

export const PENALTIES = ["OK", "+2", "DNF"];
export type Penalty = (typeof PENALTIES)[number];

export interface IResult {
  time: number; //centiseconds
  penalty: Penalty;
}

/** This class represents an entire result
 *
 */
export class Result {
  private time: number; //centiseconds
  private penalty: Penalty;

  constructor(input: string | number, penalty?: Penalty) {
    if (typeof input === "string") {
      this.time = Result.parseTimeString(input);
    } else if (typeof input === "number") {
      //number should only be used internally.
      // Ex: string input of 10000 should parse to 1:00.00, but int input of 10000 will be 10000 centiseconds
      this.time = input;

      // manually creates a DNF
      if (input >= DNF) {
        this.time = 0;
        penalty = "DNF";
      }
    } else if (input == null) {
      // the most common reason for input being null is JSON serialization not accepting Infinity as a valid numeric value.
      // when we try to send Infinity the number or parse "Infinity" as an number, it becomes null.
      // this is a safeguard against that.
      this.time = 0;
      penalty = "DNF";
    } else {
      console.error(
        "Invalid input for Time! Converting to DNF for now. Please contact BTime team."
      );

      this.time = 0;
      penalty = "DNF";
    }

    this.penalty = penalty ? penalty : "OK";
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

      return minutes * 60 * 100 + seconds * 100 + centiseconds;
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
    if (timeInCentiseconds >= DNF || timeInCentiseconds == null) return DNF;
    switch (penalty) {
      case undefined:
        return timeInCentiseconds;
      case "OK":
        return timeInCentiseconds;
      case "+2":
        // +2 is 200 centiseconds
        return timeInCentiseconds + 200;
      case "DNF":
        // use JS max number as Infinity is unsafe in JSON serialization
        return DNF;
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
  static timeToString(
    timeInCentiseconds: number,
    penalty: Penalty = "OK",
    verbose: boolean = false
  ): string {
    if (verbose) {
      // the total time, post penalty
      const totalTime = Result.applyPenalty(timeInCentiseconds, penalty);
      const totalSeconds = Math.floor(totalTime / 100);
      const penaltiedMinutes = Math.floor(totalSeconds / 60);
      const penaltiedCentiseconds = Math.floor(totalTime) % 100;
      const penaltiedSeconds = totalSeconds % 60;
      const totalResultString = `${
        penaltiedMinutes ? penaltiedMinutes + ":" : ""
      }${
        penaltiedMinutes
          ? penaltiedSeconds.toString().padStart(2, "0")
          : penaltiedSeconds.toString().padStart(1, "0")
      }.${penaltiedCentiseconds.toString().padStart(2, "0")}`;

      // the original time, pre-penalty
      const originalTotalSeconds = Math.floor(timeInCentiseconds / 100);
      const originalMinutes = Math.floor(originalTotalSeconds / 60);
      const originalCentiseconds = Math.floor(timeInCentiseconds) % 100;
      const originalSeconds = originalTotalSeconds % 60;
      const originalResultString = `${
        originalMinutes ? originalMinutes + ":" : ""
      }${
        originalMinutes
          ? originalSeconds.toString().padStart(2, "0")
          : originalSeconds.toString().padStart(1, "0")
      }.${originalCentiseconds.toString().padStart(2, "0")}`;

      //DNF
      if (penalty === "DNF") {
        return `DNF (${originalResultString})`;
      } else if (penalty === "+2") {
        return `${originalResultString} +2 = ${totalResultString}`;
      } else {
        return `${totalResultString}`;
      }
    } else {
      const totalTime = Result.applyPenalty(timeInCentiseconds, penalty);
      if (totalTime >= DNF) {
        return "DNF";
      }

      const totalSeconds = Math.floor(totalTime / 100);
      const minutes = Math.floor(totalSeconds / 60);
      const centiseconds = Math.floor(totalTime) % 100;
      const seconds = totalSeconds % 60;
      let resultString = `${minutes ? minutes + ":" : ""}${
        minutes
          ? seconds.toString().padStart(2, "0")
          : seconds.toString().padStart(1, "0")
      }.${centiseconds.toString().padStart(2, "0")}`;

      if (penalty && penalty == "+2") {
        resultString += "+";
      }

      return resultString;
    }
  }

  toString(verbose: boolean = false): string {
    return Result.timeToString(this.time, this.penalty, verbose);
  }

  static fromIResult(obj?: IResult): Result {
    if (!obj) return new Result(0, "DNF");
    return new Result(obj.time ?? 0, obj.penalty ?? "DNF");
  }

  toIResult(): IResult {
    //for consistency
    if (this.time >= DNF) {
      return {
        time: 0,
        penalty: "DNF",
      };
    }

    return {
      time: this.time,
      penalty: this.penalty,
    };
  }

  /**
   * Returns the sum of a list of results.
   * Any DNF included will DNF the sum.
   */
  static sumOf(results: Result[]): number {
    return results.reduce((sum, res) => sum + res.toTime(), 0);
  }

  static iSumOf(results: IResult[]): number {
    return Result.sumOf(results.map((iResult) => Result.fromIResult(iResult)));
  }

  /**
   * Returns the median of a list of results.
   * Returns mean of median 2 when even number of results
   * A median of 0 is 0
   */
  static medianOf(results: Result[]): number {
    if (results.length === 0) return 0;
    const sortedResults = results.sort((a, b) => a.toTime() - b.toTime());
    const mid = Math.floor(sortedResults.length / 2);
    if (sortedResults.length % 2 === 0) {
      return (
        (sortedResults[mid - 1].toTime() + sortedResults[mid].toTime()) / 2
      );
    } else {
      return sortedResults[mid].toTime();
    }
  }

  static iMedianOf(results: IResult[]): number {
    return Result.medianOf(
      results.map((iResult) => Result.fromIResult(iResult))
    );
  }

  /**
   * Returns the mean of a list of results.
   * Any DNF included will DNF the mean.
   * A mean of 0 is 0
   */
  static meanOf(results: Result[]): number {
    if (results.length === 0) return 0;
    if (
      results.some((result) => result.time >= DNF || result.penalty === "DNF")
    )
      return DNF;
    return results.reduce((sum, res) => sum + res.toTime(), 0) / results.length;
  }

  static iMeanOf(results: IResult[]): number {
    return Result.meanOf(results.map((iResult) => Result.fromIResult(iResult)));
  }

  /**
   * Returns the average of a list of results (where average = mean of all but slowest and fastest)
   * AoN with N <=2 is going to use the mean.
   * DNFing at least 2 solves (or 1 when N <= 2) will DNF the average.
   */
  static averageOf(results: Result[]): number {
    if (results.length <= 2) return Result.meanOf(results);
    if (
      results.filter((result) => result.time >= DNF || result.penalty === "DNF")
        .length >= 2
    )
      return DNF;

    return (
      results
        .sort((a, b) => a.compare(b))
        .slice(1, -1)
        .reduce((sum, res) => sum + res.toTime(), 0) /
      (results.length - 2)
    );
  }

  static iAverageOf(results: IResult[]): number {
    return Result.averageOf(
      results.map((iResult) => Result.fromIResult(iResult))
    );
  }

  /**
   * Returns the fastest result of the list in number format.
   */
  static minOf(results: Result[]): number {
    return Math.min(...results.map((result) => result.toTime()));
  }

  static iMinOf(results: IResult[]): number {
    return Math.min(
      ...results.map((result) =>
        Result.applyPenalty(result.time, result.penalty)
      )
    );
  }

  compare(other: Result): number {
    return this.toTime() - other.toTime();
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

export const DNF_IRESULT = new Result(0, "DNF").toIResult();
