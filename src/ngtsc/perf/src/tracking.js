(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/perf/src/tracking", ["require", "exports", "fs", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/perf/src/clock"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PerfLogEventType = exports.PerfTracker = void 0;
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    /// <reference types="node" />
    var fs = require("fs");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var clock_1 = require("@angular/compiler-cli/src/ngtsc/perf/src/clock");
    var PerfTracker = /** @class */ (function () {
        function PerfTracker(zeroTime) {
            this.zeroTime = zeroTime;
            this.nextSpanId = 1;
            this.log = [];
            this.enabled = true;
        }
        PerfTracker.zeroedToNow = function () {
            return new PerfTracker(clock_1.mark());
        };
        PerfTracker.prototype.mark = function (name, node, category, detail) {
            var msg = this.makeLogMessage(PerfLogEventType.MARK, name, node, category, detail, undefined);
            this.log.push(msg);
        };
        PerfTracker.prototype.start = function (name, node, category, detail) {
            var span = this.nextSpanId++;
            var msg = this.makeLogMessage(PerfLogEventType.SPAN_OPEN, name, node, category, detail, span);
            this.log.push(msg);
            return span;
        };
        PerfTracker.prototype.stop = function (span) {
            this.log.push({
                type: PerfLogEventType.SPAN_CLOSE,
                span: span,
                stamp: clock_1.timeSinceInMicros(this.zeroTime),
            });
        };
        PerfTracker.prototype.makeLogMessage = function (type, name, node, category, detail, span) {
            var msg = {
                type: type,
                name: name,
                stamp: clock_1.timeSinceInMicros(this.zeroTime),
            };
            if (category !== undefined) {
                msg.category = category;
            }
            if (detail !== undefined) {
                msg.detail = detail;
            }
            if (span !== undefined) {
                msg.span = span;
            }
            if (node !== undefined) {
                msg.file = node.getSourceFile().fileName;
                if (!ts.isSourceFile(node)) {
                    var name_1 = ts.getNameOfDeclaration(node);
                    if (name_1 !== undefined && ts.isIdentifier(name_1)) {
                        msg.declaration = name_1.text;
                    }
                }
            }
            return msg;
        };
        PerfTracker.prototype.asJson = function () {
            return this.log;
        };
        PerfTracker.prototype.serializeToFile = function (target, host) {
            var json = JSON.stringify(this.log, null, 2);
            if (target.startsWith('ts:')) {
                target = target.substr('ts:'.length);
                var outFile = file_system_1.resolve(host.getCurrentDirectory(), target);
                host.writeFile(outFile, json, false);
            }
            else {
                var outFile = file_system_1.resolve(host.getCurrentDirectory(), target);
                fs.writeFileSync(outFile, json);
            }
        };
        return PerfTracker;
    }());
    exports.PerfTracker = PerfTracker;
    var PerfLogEventType;
    (function (PerfLogEventType) {
        PerfLogEventType[PerfLogEventType["SPAN_OPEN"] = 0] = "SPAN_OPEN";
        PerfLogEventType[PerfLogEventType["SPAN_CLOSE"] = 1] = "SPAN_CLOSE";
        PerfLogEventType[PerfLogEventType["MARK"] = 2] = "MARK";
    })(PerfLogEventType = exports.PerfLogEventType || (exports.PerfLogEventType = {}));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhY2tpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BlcmYvc3JjL3RyYWNraW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhCQUE4QjtJQUM5Qix1QkFBeUI7SUFDekIsK0JBQWlDO0lBQ2pDLDJFQUEwQztJQUUxQyx3RUFBd0Q7SUFFeEQ7UUFNRSxxQkFBNEIsUUFBZ0I7WUFBaEIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtZQUxwQyxlQUFVLEdBQUcsQ0FBQyxDQUFDO1lBQ2YsUUFBRyxHQUFtQixFQUFFLENBQUM7WUFFeEIsWUFBTyxHQUFHLElBQUksQ0FBQztRQUV1QixDQUFDO1FBRXpDLHVCQUFXLEdBQWxCO1lBQ0UsT0FBTyxJQUFJLFdBQVcsQ0FBQyxZQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFFRCwwQkFBSSxHQUFKLFVBQUssSUFBWSxFQUFFLElBQW1DLEVBQUUsUUFBaUIsRUFBRSxNQUFlO1lBRXhGLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNoRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQixDQUFDO1FBRUQsMkJBQUssR0FBTCxVQUFNLElBQVksRUFBRSxJQUFtQyxFQUFFLFFBQWlCLEVBQUUsTUFBZTtZQUV6RixJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDL0IsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFR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SlcsZ0JBQWdCLEdBQWhCLHdCQUFnQixLQUFoQix3QkFBZ0IsUUFJM0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge3Jlc29sdmV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UGVyZlJlY29yZGVyfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0hyVGltZSwgbWFyaywgdGltZVNpbmNlSW5NaWNyb3N9IGZyb20gJy4vY2xvY2snO1xuXG5leHBvcnQgY2xhc3MgUGVyZlRyYWNrZXIgaW1wbGVtZW50cyBQZXJmUmVjb3JkZXIge1xuICBwcml2YXRlIG5leHRTcGFuSWQgPSAxO1xuICBwcml2YXRlIGxvZzogUGVyZkxvZ0V2ZW50W10gPSBbXTtcblxuICByZWFkb25seSBlbmFibGVkID0gdHJ1ZTtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKHByaXZhdGUgemVyb1RpbWU6IEhyVGltZSkge31cblxuICBzdGF0aWMgemVyb2VkVG9Ob3coKTogUGVyZlRyYWNrZXIge1xuICAgIHJldHVybiBuZXcgUGVyZlRyYWNrZXIobWFyaygpKTtcbiAgfVxuXG4gIG1hcmsobmFtZTogc3RyaW5nLCBub2RlPzogdHMuU291cmNlRmlsZXx0cy5EZWNsYXJhdGlvbiwgY2F0ZWdvcnk/OiBzdHJpbmcsIGRldGFpbD86IHN0cmluZyk6XG4gICAgICB2b2lkIHtcbiAgICBjb25zdCBtc2cgPSB0aGlzLm1ha2VMb2dNZXNzYWdlKFBlcmZMb2dFdmVudFR5cGUuTUFSSywgbmFtZSwgbm9kZSwgY2F0ZWdvcnksIGRldGFpbCwgdW5kZWZpbmVkKTtcbiAgICB0aGlzLmxvZy5wdXNoKG1zZyk7XG4gIH1cblxuICBzdGFydChuYW1lOiBzdHJpbmcsIG5vZGU/OiB0cy5Tb3VyY2VGaWxlfHRzLkRlY2xhcmF0aW9uLCBjYXRlZ29yeT86IHN0cmluZywgZGV0YWlsPzogc3RyaW5nKTpcbiAgICAgIG51bWJlciB7XG4gICAgY29uc3Qgc3BhbiA9IHRoaXMubmV4dFNwYW5JZCsrO1xuICAgIGNvbnN0IG1zZyA9IHRoaXMubWFrZUxvZ01lc3NhZ2UoUGVyZkxvZ0V2ZW50VHlwZS5TUEFOX09QRU4sIG5hbWUsIG5vZGUsIGNhdGVnb3J5LCBkZXRhaWwsIHNwYW4pO1xuICAgIHRoaXMubG9nLnB1c2gobXNnKTtcbiAgICByZXR1cm4gc3BhbjtcbiAgfVxuXG4gIHN0b3Aoc3BhbjogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5sb2cucHVzaCh7XG4gICAgICB0eXBlOiBQZXJmTG9nRXZlbnRUeXBlLlNQQU5fQ0xPU0UsXG4gICAgICBzcGFuLFxuICAgICAgc3RhbXA6IHRpbWVTaW5jZUluTWljcm9zKHRoaXMuemVyb1RpbWUpLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBtYWtlTG9nTWVzc2FnZShcbiAgICAgIHR5cGU6IFBlcmZMb2dFdmVudFR5cGUsIG5hbWU6IHN0cmluZywgbm9kZTogdHMuU291cmNlRmlsZXx0cy5EZWNsYXJhdGlvbnx1bmRlZmluZWQsXG4gICAgICBjYXRlZ29yeTogc3RyaW5nfHVuZGVmaW5lZCwgZGV0YWlsOiBzdHJpbmd8dW5kZWZpbmVkLCBzcGFuOiBudW1iZXJ8dW5kZWZpbmVkKTogUGVyZkxvZ0V2ZW50IHtcbiAgICBjb25zdCBtc2c6IFBlcmZMb2dFdmVudCA9IHtcbiAgICAgIHR5cGUsXG4gICAgICBuYW1lLFxuICAgICAgc3RhbXA6IHRpbWVTaW5jZUluTWljcm9zKHRoaXMuemVyb1RpbWUpLFxuICAgIH07XG4gICAgaWYgKGNhdGVnb3J5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG1zZy5jYXRlZ29yeSA9IGNhdGVnb3J5O1xuICAgIH1cbiAgICBpZiAoZGV0YWlsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG1zZy5kZXRhaWwgPSBkZXRhaWw7XG4gICAgfVxuICAgIGlmIChzcGFuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG1zZy5zcGFuID0gc3BhbjtcbiAgICB9XG4gICAgaWYgKG5vZGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbXNnLmZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICAgIGlmICghdHMuaXNTb3VyY2VGaWxlKG5vZGUpKSB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSB0cy5nZXROYW1lT2ZEZWNsYXJhdGlvbihub2RlKTtcbiAgICAgICAgaWYgKG5hbWUgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0lkZW50aWZpZXIobmFtZSkpIHtcbiAgICAgICAgICBtc2cuZGVjbGFyYXRpb24gPSBuYW1lLnRleHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1zZztcbiAgfVxuXG4gIGFzSnNvbigpOiB1bmtub3duIHtcbiAgICByZXR1cm4gdGhpcy5sb2c7XG4gIH1cblxuICBzZXJpYWxpemVUb0ZpbGUodGFyZ2V0OiBzdHJpbmcsIGhvc3Q6IHRzLkNvbXBpbGVySG9zdCk6IHZvaWQge1xuICAgIGNvbnN0IGpzb24gPSBKU09OLnN0cmluZ2lmeSh0aGlzLmxvZywgbnVsbCwgMik7XG5cbiAgICBpZiAodGFyZ2V0LnN0YXJ0c1dpdGgoJ3RzOicpKSB7XG4gICAgICB0YXJnZXQgPSB0YXJnZXQuc3Vic3RyKCd0czonLmxlbmd0aCk7XG4gICAgICBjb25zdCBvdXRGaWxlID0gcmVzb2x2ZShob3N0LmdldEN1cnJlbnREaXJlY3RvcnkoKSwgdGFyZ2V0KTtcbiAgICAgIGhvc3Qud3JpdGVGaWxlKG91dEZpbGUsIGpzb24sIGZhbHNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgb3V0RmlsZSA9IHJlc29sdmUoaG9zdC5nZXRDdXJyZW50RGlyZWN0b3J5KCksIHRhcmdldCk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKG91dEZpbGUsIGpzb24pO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBlcmZMb2dFdmVudCB7XG4gIG5hbWU/OiBzdHJpbmc7XG4gIHNwYW4/OiBudW1iZXI7XG4gIGZpbGU/OiBzdHJpbmc7XG4gIGRlY2xhcmF0aW9uPzogc3RyaW5nO1xuICB0eXBlOiBQZXJmTG9nRXZlbnRUeXBlO1xuICBjYXRlZ29yeT86IHN0cmluZztcbiAgZGV0YWlsPzogc3RyaW5nO1xuICBzdGFtcDogbnVtYmVyO1xufVxuXG5leHBvcnQgZW51bSBQZXJmTG9nRXZlbnRUeXBlIHtcbiAgU1BBTl9PUEVOLFxuICBTUEFOX0NMT1NFLFxuICBNQVJLLFxufVxuIl19