/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <reference types="node" />
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/perf/src/recorder", ["require", "exports", "@angular/compiler-cli/src/ngtsc/perf/src/api", "@angular/compiler-cli/src/ngtsc/perf/src/clock"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DelegatingPerfRecorder = exports.ActivePerfRecorder = void 0;
    var api_1 = require("@angular/compiler-cli/src/ngtsc/perf/src/api");
    var clock_1 = require("@angular/compiler-cli/src/ngtsc/perf/src/clock");
    /**
     * A `PerfRecorder` that actively tracks performance statistics.
     */
    var ActivePerfRecorder = /** @class */ (function () {
        function ActivePerfRecorder(zeroTime) {
            this.zeroTime = zeroTime;
            this.currentPhase = api_1.PerfPhase.Unaccounted;
            this.currentPhaseEntered = this.zeroTime;
            this.counters = Array(api_1.PerfEvent.LAST).fill(0);
            this.phaseTime = Array(api_1.PerfPhase.LAST).fill(0);
            this.bytes = Array(api_1.PerfCheckpoint.LAST).fill(0);
            // Take an initial memory snapshot before any other compilation work begins.
            this.memory(api_1.PerfCheckpoint.Initial);
        }
        /**
         * Creates an `ActivePerfRecoder` with its zero point set to the current time.
         */
        ActivePerfRecorder.zeroedToNow = function () {
            return new ActivePerfRecorder((0, clock_1.mark)());
        };
        ActivePerfRecorder.prototype.reset = function () {
            this.counters = Array(api_1.PerfEvent.LAST).fill(0);
            this.phaseTime = Array(api_1.PerfPhase.LAST).fill(0);
            this.bytes = Array(api_1.PerfCheckpoint.LAST).fill(0);
            this.zeroTime = (0, clock_1.mark)();
            this.currentPhase = api_1.PerfPhase.Unaccounted;
            this.currentPhaseEntered = this.zeroTime;
        };
        ActivePerfRecorder.prototype.memory = function (after) {
            this.bytes[after] = process.memoryUsage().heapUsed;
        };
        ActivePerfRecorder.prototype.phase = function (phase) {
            var previous = this.currentPhase;
            this.phaseTime[this.currentPhase] += (0, clock_1.timeSinceInMicros)(this.currentPhaseEntered);
            this.currentPhase = phase;
            this.currentPhaseEntered = (0, clock_1.mark)();
            return previous;
        };
        ActivePerfRecorder.prototype.inPhase = function (phase, fn) {
            var previousPhase = this.phase(phase);
            try {
                return fn();
            }
            finally {
                this.phase(previousPhase);
            }
        };
        ActivePerfRecorder.prototype.eventCount = function (counter, incrementBy) {
            if (incrementBy === void 0) { incrementBy = 1; }
            this.counters[counter] += incrementBy;
        };
        /**
         * Return the current performance metrics as a serializable object.
         */
        ActivePerfRecorder.prototype.finalize = function () {
            // Track the last segment of time spent in `this.currentPhase` in the time array.
            this.phase(api_1.PerfPhase.Unaccounted);
            var results = {
                events: {},
                phases: {},
                memory: {},
            };
            for (var i = 0; i < this.phaseTime.length; i++) {
                if (this.phaseTime[i] > 0) {
                    results.phases[api_1.PerfPhase[i]] = this.phaseTime[i];
                }
            }
            for (var i = 0; i < this.phaseTime.length; i++) {
                if (this.counters[i] > 0) {
                    results.events[api_1.PerfEvent[i]] = this.counters[i];
                }
            }
            for (var i = 0; i < this.bytes.length; i++) {
                if (this.bytes[i] > 0) {
                    results.memory[api_1.PerfCheckpoint[i]] = this.bytes[i];
                }
            }
            return results;
        };
        return ActivePerfRecorder;
    }());
    exports.ActivePerfRecorder = ActivePerfRecorder;
    /**
     * A `PerfRecorder` that delegates to a target `PerfRecorder` which can be updated later.
     *
     * `DelegatingPerfRecorder` is useful when a compiler class that needs a `PerfRecorder` can outlive
     * the current compilation. This is true for most compiler classes as resource-only changes reuse
     * the same `NgCompiler` for a new compilation.
     */
    var DelegatingPerfRecorder = /** @class */ (function () {
        function DelegatingPerfRecorder(target) {
            this.target = target;
        }
        DelegatingPerfRecorder.prototype.eventCount = function (counter, incrementBy) {
            this.target.eventCount(counter, incrementBy);
        };
        DelegatingPerfRecorder.prototype.phase = function (phase) {
            return this.target.phase(phase);
        };
        DelegatingPerfRecorder.prototype.inPhase = function (phase, fn) {
            // Note: this doesn't delegate to `this.target.inPhase` but instead is implemented manually here
            // to avoid adding an additional frame of noise to the stack when debugging.
            var previousPhase = this.target.phase(phase);
            try {
                return fn();
            }
            finally {
                this.target.phase(previousPhase);
            }
        };
        DelegatingPerfRecorder.prototype.memory = function (after) {
            this.target.memory(after);
        };
        DelegatingPerfRecorder.prototype.reset = function () {
            this.target.reset();
        };
        return DelegatingPerfRecorder;
    }());
    exports.DelegatingPerfRecorder = DelegatingPerfRecorder;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb3JkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BlcmYvc3JjL3JlY29yZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUNILDhCQUE4Qjs7Ozs7Ozs7Ozs7OztJQUU5QixvRUFBeUU7SUFDekUsd0VBQXdEO0lBV3hEOztPQUVHO0lBQ0g7UUFlRSw0QkFBNEIsUUFBZ0I7WUFBaEIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtZQVZwQyxpQkFBWSxHQUFHLGVBQVMsQ0FBQyxXQUFXLENBQUM7WUFDckMsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQVUxQyxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxlQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlDLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLGVBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsb0JBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFaEQsNEVBQTRFO1lBQzVFLElBQUksQ0FBQyxNQUFNLENBQUMsb0JBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBZEQ7O1dBRUc7UUFDSSw4QkFBVyxHQUFsQjtZQUNFLE9BQU8sSUFBSSxrQkFBa0IsQ0FBQyxJQUFBLFlBQUksR0FBRSxDQUFDLENBQUM7UUFDeEMsQ0FBQztRQVdELGtDQUFLLEdBQUw7WUFDRSxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxlQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlD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Q0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN0QixDQUFDO1FBQ0gsNkJBQUM7SUFBRCxDQUFDLEFBN0JELElBNkJDO0lBN0JZLHdEQUFzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJub2RlXCIgLz5cblxuaW1wb3J0IHtQZXJmQ2hlY2twb2ludCwgUGVyZkV2ZW50LCBQZXJmUGhhc2UsIFBlcmZSZWNvcmRlcn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtIclRpbWUsIG1hcmssIHRpbWVTaW5jZUluTWljcm9zfSBmcm9tICcuL2Nsb2NrJztcblxuLyoqXG4gKiBTZXJpYWxpemFibGUgcGVyZm9ybWFuY2UgZGF0YSBmb3IgdGhlIGNvbXBpbGF0aW9uLCB1c2luZyBzdHJpbmcgbmFtZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGVyZlJlc3VsdHMge1xuICBldmVudHM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj47XG4gIHBoYXNlczogUmVjb3JkPHN0cmluZywgbnVtYmVyPjtcbiAgbWVtb3J5OiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+O1xufVxuXG4vKipcbiAqIEEgYFBlcmZSZWNvcmRlcmAgdGhhdCBhY3RpdmVseSB0cmFja3MgcGVyZm9ybWFuY2Ugc3RhdGlzdGljcy5cbiAqL1xuZXhwb3J0IGNsYXNzIEFjdGl2ZVBlcmZSZWNvcmRlciBpbXBsZW1lbnRzIFBlcmZSZWNvcmRlciB7XG4gIHByaXZhdGUgY291bnRlcnM6IG51bWJlcltdO1xuICBwcml2YXRlIHBoYXNlVGltZTogbnVtYmVyW107XG4gIHByaXZhdGUgYnl0ZXM6IG51bWJlcltdO1xuXG4gIHByaXZhdGUgY3VycmVudFBoYXNlID0gUGVyZlBoYXNlLlVuYWNjb3VudGVkO1xuICBwcml2YXRlIGN1cnJlbnRQaGFzZUVudGVyZWQgPSB0aGlzLnplcm9UaW1lO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGBBY3RpdmVQZXJmUmVjb2RlcmAgd2l0aCBpdHMgemVybyBwb2ludCBzZXQgdG8gdGhlIGN1cnJlbnQgdGltZS5cbiAgICovXG4gIHN0YXRpYyB6ZXJvZWRUb05vdygpOiBBY3RpdmVQZXJmUmVjb3JkZXIge1xuICAgIHJldHVybiBuZXcgQWN0aXZlUGVyZlJlY29yZGVyKG1hcmsoKSk7XG4gIH1cblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKHByaXZhdGUgemVyb1RpbWU6IEhyVGltZSkge1xuICAgIHRoaXMuY291bnRlcnMgPSBBcnJheShQZXJmRXZlbnQuTEFTVCkuZmlsbCgwKTtcbiAgICB0aGlzLnBoYXNlVGltZSA9IEFycmF5KFBlcmZQaGFzZS5MQVNUKS5maWxsKDApO1xuICAgIHRoaXMuYnl0ZXMgPSBBcnJheShQZXJmQ2hlY2twb2ludC5MQVNUKS5maWxsKDApO1xuXG4gICAgLy8gVGFrZSBhbiBpbml0aWFsIG1lbW9yeSBzbmFwc2hvdCBiZWZvcmUgYW55IG90aGVyIGNvbXBpbGF0aW9uIHdvcmsgYmVnaW5zLlxuICAgIHRoaXMubWVtb3J5KFBlcmZDaGVja3BvaW50LkluaXRpYWwpO1xuICB9XG5cbiAgcmVzZXQoKTogdm9pZCB7XG4gICAgdGhpcy5jb3VudGVycyA9IEFycmF5KFBlcmZFdmVudC5MQVNUKS5maWxsKDApO1xuICAgIHRoaXMucGhhc2VUaW1lID0gQXJyYXkoUGVyZlBoYXNlLkxBU1QpLmZpbGwoMCk7XG4gICAgdGhpcy5ieXRlcyA9IEFycmF5KFBlcmZDaGVja3BvaW50LkxBU1QpLmZpbGwoMCk7XG4gICAgdGhpcy56ZXJvVGltZSA9IG1hcmsoKTtcbiAgICB0aGlzLmN1cnJlbnRQaGFzZSA9IFBlcmZQaGFzZS5VbmFjY291bnRlZDtcbiAgICB0aGlzLmN1cnJlbnRQaGFzZUVudGVyZWQgPSB0aGlzLnplcm9UaW1lO1xuICB9XG5cbiAgbWVtb3J5KGFmdGVyOiBQZXJmQ2hlY2twb2ludCk6IHZvaWQge1xuICAgIHRoaXMuYnl0ZXNbYWZ0ZXJdID0gcHJvY2Vzcy5tZW1vcnlVc2FnZSgpLmhlYXBVc2VkO1xuICB9XG5cbiAgcGhhc2UocGhhc2U6IFBlcmZQaGFzZSk6IFBlcmZQaGFzZSB7XG4gICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLmN1cnJlbnRQaGFzZTtcbiAgICB0aGlzLnBoYXNlVGltZVt0aGlzLmN1cnJlbnRQaGFzZV0gKz0gdGltZVNpbmNlSW5NaWNyb3ModGhpcy5jdXJyZW50UGhhc2VFbnRlcmVkKTtcbiAgICB0aGlzLmN1cnJlbnRQaGFzZSA9IHBoYXNlO1xuICAgIHRoaXMuY3VycmVudFBoYXNlRW50ZXJlZCA9IG1hcmsoKTtcbiAgICByZXR1cm4gcHJldmlvdXM7XG4gIH1cblxuICBpblBoYXNlPFQ+KHBoYXNlOiBQZXJmUGhhc2UsIGZuOiAoKSA9PiBUKTogVCB7XG4gICAgY29uc3QgcHJldmlvdXNQaGFzZSA9IHRoaXMucGhhc2UocGhhc2UpO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZm4oKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5waGFzZShwcmV2aW91c1BoYXNlKTtcbiAgICB9XG4gIH1cblxuICBldmVudENvdW50KGNvdW50ZXI6IFBlcmZFdmVudCwgaW5jcmVtZW50Qnk6IG51bWJlciA9IDEpOiB2b2lkIHtcbiAgICB0aGlzLmNvdW50ZXJzW2NvdW50ZXJdICs9IGluY3JlbWVudEJ5O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgY3VycmVudCBwZXJmb3JtYW5jZSBtZXRyaWNzIGFzIGEgc2VyaWFsaXphYmxlIG9iamVjdC5cbiAgICovXG4gIGZpbmFsaXplKCk6IFBlcmZSZXN1bHRzIHtcbiAgICAvLyBUcmFjayB0aGUgbGFzdCBzZWdtZW50IG9mIHRpbWUgc3BlbnQgaW4gYHRoaXMuY3VycmVudFBoYXNlYCBpbiB0aGUgdGltZSBhcnJheS5cbiAgICB0aGlzLnBoYXNlKFBlcmZQaGFzZS5VbmFjY291bnRlZCk7XG5cbiAgICBjb25zdCByZXN1bHRzOiBQZXJmUmVzdWx0cyA9IHtcbiAgICAgIGV2ZW50czoge30sXG4gICAgICBwaGFzZXM6IHt9LFxuICAgICAgbWVtb3J5OiB7fSxcbiAgICB9O1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnBoYXNlVGltZS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHRoaXMucGhhc2VUaW1lW2ldID4gMCkge1xuICAgICAgICByZXN1bHRzLnBoYXNlc1tQZXJmUGhhc2VbaV1dID0gdGhpcy5waGFzZVRpbWVbaV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnBoYXNlVGltZS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHRoaXMuY291bnRlcnNbaV0gPiAwKSB7XG4gICAgICAgIHJlc3VsdHMuZXZlbnRzW1BlcmZFdmVudFtpXV0gPSB0aGlzLmNvdW50ZXJzW2ldO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5ieXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHRoaXMuYnl0ZXNbaV0gPiAwKSB7XG4gICAgICAgIHJlc3VsdHMubWVtb3J5W1BlcmZDaGVja3BvaW50W2ldXSA9IHRoaXMuYnl0ZXNbaV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBQZXJmUmVjb3JkZXJgIHRoYXQgZGVsZWdhdGVzIHRvIGEgdGFyZ2V0IGBQZXJmUmVjb3JkZXJgIHdoaWNoIGNhbiBiZSB1cGRhdGVkIGxhdGVyLlxuICpcbiAqIGBEZWxlZ2F0aW5nUGVyZlJlY29yZGVyYCBpcyB1c2VmdWwgd2hlbiBhIGNvbXBpbGVyIGNsYXNzIHRoYXQgbmVlZHMgYSBgUGVyZlJlY29yZGVyYCBjYW4gb3V0bGl2ZVxuICogdGhlIGN1cnJlbnQgY29tcGlsYXRpb24uIFRoaXMgaXMgdHJ1ZSBmb3IgbW9zdCBjb21waWxlciBjbGFzc2VzIGFzIHJlc291cmNlLW9ubHkgY2hhbmdlcyByZXVzZVxuICogdGhlIHNhbWUgYE5nQ29tcGlsZXJgIGZvciBhIG5ldyBjb21waWxhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIERlbGVnYXRpbmdQZXJmUmVjb3JkZXIgaW1wbGVtZW50cyBQZXJmUmVjb3JkZXIge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgdGFyZ2V0OiBQZXJmUmVjb3JkZXIpIHt9XG5cbiAgZXZlbnRDb3VudChjb3VudGVyOiBQZXJmRXZlbnQsIGluY3JlbWVudEJ5PzogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy50YXJnZXQuZXZlbnRDb3VudChjb3VudGVyLCBpbmNyZW1lbnRCeSk7XG4gIH1cblxuICBwaGFzZShwaGFzZTogUGVyZlBoYXNlKTogUGVyZlBoYXNlIHtcbiAgICByZXR1cm4gdGhpcy50YXJnZXQucGhhc2UocGhhc2UpO1xuICB9XG5cbiAgaW5QaGFzZTxUPihwaGFzZTogUGVyZlBoYXNlLCBmbjogKCkgPT4gVCk6IFQge1xuICAgIC8vIE5vdGU6IHRoaXMgZG9lc24ndCBkZWxlZ2F0ZSB0byBgdGhpcy50YXJnZXQuaW5QaGFzZWAgYnV0IGluc3RlYWQgaXMgaW1wbGVtZW50ZWQgbWFudWFsbHkgaGVyZVxuICAgIC8vIHRvIGF2b2lkIGFkZGluZyBhbiBhZGRpdGlvbmFsIGZyYW1lIG9mIG5vaXNlIHRvIHRoZSBzdGFjayB3aGVuIGRlYnVnZ2luZy5cbiAgICBjb25zdCBwcmV2aW91c1BoYXNlID0gdGhpcy50YXJnZXQucGhhc2UocGhhc2UpO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZm4oKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy50YXJnZXQucGhhc2UocHJldmlvdXNQaGFzZSk7XG4gICAgfVxuICB9XG5cbiAgbWVtb3J5KGFmdGVyOiBQZXJmQ2hlY2twb2ludCk6IHZvaWQge1xuICAgIHRoaXMudGFyZ2V0Lm1lbW9yeShhZnRlcik7XG4gIH1cblxuICByZXNldCgpOiB2b2lkIHtcbiAgICB0aGlzLnRhcmdldC5yZXNldCgpO1xuICB9XG59XG4iXX0=