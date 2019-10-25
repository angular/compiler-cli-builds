(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/util", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/transform"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    function isWithinPackage(packagePath, sourceFile) {
        return !file_system_1.relative(packagePath, file_system_1.absoluteFromSourceFile(sourceFile)).startsWith('..');
    }
    exports.isWithinPackage = isWithinPackage;
    function analyzeDecorators(classSymbol, decorators, handlers, flags) {
        var e_1, _a, e_2, _b;
        var declaration = classSymbol.declaration.valueDeclaration;
        var matchingHandlers = handlers
            .map(function (handler) {
            var detected = handler.detect(declaration, decorators);
            return { handler: handler, detected: detected };
        })
            .filter(isMatchingHandler);
        if (matchingHandlers.length === 0) {
            return null;
        }
        var detections = [];
        var hasWeakHandler = false;
        var hasNonWeakHandler = false;
        var hasPrimaryHandler = false;
        try {
            for (var matchingHandlers_1 = tslib_1.__values(matchingHandlers), matchingHandlers_1_1 = matchingHandlers_1.next(); !matchingHandlers_1_1.done; matchingHandlers_1_1 = matchingHandlers_1.next()) {
                var _c = matchingHandlers_1_1.value, handler = _c.handler, detected = _c.detected;
                if (hasNonWeakHandler && handler.precedence === transform_1.HandlerPrecedence.WEAK) {
                    continue;
                }
                else if (hasWeakHandler && handler.precedence !== transform_1.HandlerPrecedence.WEAK) {
                    // Clear all the WEAK handlers from the list of matches.
                    detections.length = 0;
                }
                if (hasPrimaryHandler && handler.precedence === transform_1.HandlerPrecedence.PRIMARY) {
                    throw new Error("TODO.Diagnostic: Class has multiple incompatible Angular decorators.");
                }
                detections.push({ handler: handler, detected: detected });
                if (handler.precedence === transform_1.HandlerPrecedence.WEAK) {
                    hasWeakHandler = true;
                }
                else if (handler.precedence === transform_1.HandlerPrecedence.SHARED) {
                    hasNonWeakHandler = true;
                }
                else if (handler.precedence === transform_1.HandlerPrecedence.PRIMARY) {
                    hasNonWeakHandler = true;
                    hasPrimaryHandler = true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (matchingHandlers_1_1 && !matchingHandlers_1_1.done && (_a = matchingHandlers_1.return)) _a.call(matchingHandlers_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var matches = [];
        var allDiagnostics = [];
        try {
            for (var detections_1 = tslib_1.__values(detections), detections_1_1 = detections_1.next(); !detections_1_1.done; detections_1_1 = detections_1.next()) {
                var _d = detections_1_1.value, handler = _d.handler, detected = _d.detected;
                try {
                    var _e = handler.analyze(declaration, detected.metadata, flags), analysis = _e.analysis, diagnostics = _e.diagnostics;
                    if (diagnostics !== undefined) {
                        allDiagnostics.push.apply(allDiagnostics, tslib_1.__spread(diagnostics));
                    }
                    matches.push({ handler: handler, analysis: analysis });
                }
                catch (e) {
                    if (diagnostics_1.isFatalDiagnosticError(e)) {
                        allDiagnostics.push(e.toDiagnostic());
                    }
                    else {
                        throw e;
                    }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (detections_1_1 && !detections_1_1.done && (_b = detections_1.return)) _b.call(detections_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return {
            name: classSymbol.name,
            declaration: declaration,
            decorators: decorators,
            matches: matches,
            diagnostics: allDiagnostics.length > 0 ? allDiagnostics : undefined
        };
    }
    exports.analyzeDecorators = analyzeDecorators;
    function isMatchingHandler(handler) {
        return !!handler.detected;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVNBLDJFQUFzRTtJQUN0RSwyRUFBZ0c7SUFFaEcsdUVBQTZHO0lBSzdHLFNBQWdCLGVBQWUsQ0FBQyxXQUEyQixFQUFFLFVBQXlCO1FBQ3BGLE9BQU8sQ0FBQyxzQkFBUSxDQUFDLFdBQVcsRUFBRSxvQ0FBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBRkQsMENBRUM7SUFFRCxTQUFnQixpQkFBaUIsQ0FDN0IsV0FBNEIsRUFBRSxVQUE4QixFQUM1RCxRQUFzQyxFQUFFLEtBQW9COztRQUM5RCxJQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDO1FBQzdELElBQU0sZ0JBQWdCLEdBQUcsUUFBUTthQUNILEdBQUcsQ0FBQyxVQUFBLE9BQU87WUFDVixJQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN6RCxPQUFPLEVBQUMsT0FBTyxTQUFBLEVBQUUsUUFBUSxVQUFBLEVBQUMsQ0FBQztRQUM3QixDQUFDLENBQUM7YUFDRCxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUV4RCxJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDakMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQU0sVUFBVSxHQUF5RSxFQUFFLENBQUM7UUFDNUYsSUFBSSxjQUFjLEdBQVksS0FBSyxDQUFDO1FBQ3BDLElBQUksaUJBQWlCLEdBQVksS0FBSyxDQUFDO1FBQ3ZDLElBQUksaUJBQWlCLEdBQVksS0FBSyxDQUFDOztZQUV2QyxLQUFrQyxJQUFBLHFCQUFBLGlCQUFBLGdCQUFnQixDQUFBLGtEQUFBLGdGQUFFO2dCQUF6QyxJQUFBLCtCQUFtQixFQUFsQixvQkFBTyxFQUFFLHNCQUFRO2dCQUMzQixJQUFJLGlCQUFpQixJQUFJLE9BQU8sQ0FBQyxVQUFVLEtBQUssNkJBQWlCLENBQUMsSUFBSSxFQUFFO29CQUN0RSxTQUFTO2lCQUNWO3FCQUFNLElBQUksY0FBYyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEtBQUssNkJBQWlCLENBQUMsSUFBSSxFQUFFO29CQUMxRSx3REFBd0Q7b0JBQ3hELFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2lCQUN2QjtnQkFDRCxJQUFJLGlCQUFpQixJQUFJLE9BQU8sQ0FBQyxVQUFVLEtBQUssNkJBQWlCLENBQUMsT0FBTyxFQUFFO29CQUN6RSxNQUFNLElBQUksS0FBSyxDQUFDLHNFQUFzRSxDQUFDLENBQUM7aUJBQ3pGO2dCQUVELFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBQyxPQUFPLFNBQUEsRUFBRSxRQUFRLFVBQUEsRUFBQyxDQUFDLENBQUM7Z0JBQ3JDLElBQUksT0FBTyxDQUFDLFVBQVUsS0FBSyw2QkFBaUIsQ0FBQyxJQUFJLEVBQUU7b0JBQ2pELGNBQWMsR0FBRyxJQUFJLENBQUM7aUJBQ3ZCO3FCQUFNLElBQUksT0FBTyxDQUFDLFVBQVUsS0FBSyw2QkFBaUIsQ0FBQyxNQUFNLEVBQUU7b0JBQzFELGlCQUFpQixHQUFHLElBQUksQ0FBQztpQkFDMUI7cUJBQU0sSUFBSSxPQUFPLENBQUMsVUFBVSxLQUFLLDZCQUFpQixDQUFDLE9BQU8sRUFBRTtvQkFDM0QsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO29CQUN6QixpQkFBaUIsR0FBRyxJQUFJLENBQUM7aUJBQzFCO2FBQ0Y7Ozs7Ozs7OztRQUVELElBQU0sT0FBTyxHQUEyRCxFQUFFLENBQUM7UUFDM0UsSUFBTSxjQUFjLEdBQW9CLEVBQUUsQ0FBQzs7WUFDM0MsS0FBa0MsSUFBQSxlQUFBLGlCQUFBLFVBQVUsQ0FBQSxzQ0FBQSw4REFBRTtnQkFBbkMsSUFBQSx5QkFBbUIsRUFBbEIsb0JBQU8sRUFBRSxzQkFBUTtnQkFDM0IsSUFBSTtvQkFDSSxJQUFBLDJEQUFnRixFQUEvRSxzQkFBUSxFQUFFLDRCQUFxRSxDQUFDO29CQUN2RixJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUU7d0JBQzdCLGNBQWMsQ0FBQyxJQUFJLE9BQW5CLGNBQWMsbUJBQVMsV0FBVyxHQUFFO3FCQUNyQztvQkFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsT0FBTyxTQUFBLEVBQUUsUUFBUSxVQUFBLEVBQUMsQ0FBQyxDQUFDO2lCQUNuQztnQkFBQyxPQUFPLENBQUMsRUFBRTtvQkFDVixJQUFJLG9DQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFO3dCQUM3QixjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO3FCQUN2Qzt5QkFBTTt3QkFDTCxNQUFNLENBQUMsQ0FBQztxQkFDVDtpQkFDRjthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPO1lBQ0wsSUFBSSxFQUFFLFdBQVcsQ0FBQyxJQUFJO1lBQ3RCLFdBQVcsYUFBQTtZQUNYLFVBQVUsWUFBQTtZQUNWLE9BQU8sU0FBQTtZQUNQLFdBQVcsRUFBRSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxTQUFTO1NBQ3BFLENBQUM7SUFDSixDQUFDO0lBakVELDhDQWlFQztJQUVELFNBQVMsaUJBQWlCLENBQU8sT0FBdUM7UUFFdEUsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztJQUM1QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7aXNGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIHJlbGF0aXZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEZWNvcmF0b3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7RGVjb3JhdG9ySGFuZGxlciwgRGV0ZWN0UmVzdWx0LCBIYW5kbGVyRmxhZ3MsIEhhbmRsZXJQcmVjZWRlbmNlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNmb3JtJztcbmltcG9ydCB7TmdjY0NsYXNzU3ltYm9sfSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5cbmltcG9ydCB7QW5hbHl6ZWRDbGFzcywgTWF0Y2hpbmdIYW5kbGVyfSBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGlzV2l0aGluUGFja2FnZShwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBib29sZWFuIHtcbiAgcmV0dXJuICFyZWxhdGl2ZShwYWNrYWdlUGF0aCwgYWJzb2x1dGVGcm9tU291cmNlRmlsZShzb3VyY2VGaWxlKSkuc3RhcnRzV2l0aCgnLi4nKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVEZWNvcmF0b3JzKFxuICAgIGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wsIGRlY29yYXRvcnM6IERlY29yYXRvcltdIHwgbnVsbCxcbiAgICBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT5bXSwgZmxhZ3M/OiBIYW5kbGVyRmxhZ3MpOiBBbmFseXplZENsYXNzfG51bGwge1xuICBjb25zdCBkZWNsYXJhdGlvbiA9IGNsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb247XG4gIGNvbnN0IG1hdGNoaW5nSGFuZGxlcnMgPSBoYW5kbGVyc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoaGFuZGxlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXRlY3RlZCA9IGhhbmRsZXIuZGV0ZWN0KGRlY2xhcmF0aW9uLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7aGFuZGxlciwgZGV0ZWN0ZWR9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihpc01hdGNoaW5nSGFuZGxlcik7XG5cbiAgaWYgKG1hdGNoaW5nSGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgZGV0ZWN0aW9uczoge2hhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+LCBkZXRlY3RlZDogRGV0ZWN0UmVzdWx0PGFueT59W10gPSBbXTtcbiAgbGV0IGhhc1dlYWtIYW5kbGVyOiBib29sZWFuID0gZmFsc2U7XG4gIGxldCBoYXNOb25XZWFrSGFuZGxlcjogYm9vbGVhbiA9IGZhbHNlO1xuICBsZXQgaGFzUHJpbWFyeUhhbmRsZXI6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBmb3IgKGNvbnN0IHtoYW5kbGVyLCBkZXRlY3RlZH0gb2YgbWF0Y2hpbmdIYW5kbGVycykge1xuICAgIGlmIChoYXNOb25XZWFrSGFuZGxlciAmJiBoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLldFQUspIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH0gZWxzZSBpZiAoaGFzV2Vha0hhbmRsZXIgJiYgaGFuZGxlci5wcmVjZWRlbmNlICE9PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLKSB7XG4gICAgICAvLyBDbGVhciBhbGwgdGhlIFdFQUsgaGFuZGxlcnMgZnJvbSB0aGUgbGlzdCBvZiBtYXRjaGVzLlxuICAgICAgZGV0ZWN0aW9ucy5sZW5ndGggPSAwO1xuICAgIH1cbiAgICBpZiAoaGFzUHJpbWFyeUhhbmRsZXIgJiYgaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRPRE8uRGlhZ25vc3RpYzogQ2xhc3MgaGFzIG11bHRpcGxlIGluY29tcGF0aWJsZSBBbmd1bGFyIGRlY29yYXRvcnMuYCk7XG4gICAgfVxuXG4gICAgZGV0ZWN0aW9ucy5wdXNoKHtoYW5kbGVyLCBkZXRlY3RlZH0pO1xuICAgIGlmIChoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLldFQUspIHtcbiAgICAgIGhhc1dlYWtIYW5kbGVyID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuU0hBUkVEKSB7XG4gICAgICBoYXNOb25XZWFrSGFuZGxlciA9IHRydWU7XG4gICAgfSBlbHNlIGlmIChoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlkpIHtcbiAgICAgIGhhc05vbldlYWtIYW5kbGVyID0gdHJ1ZTtcbiAgICAgIGhhc1ByaW1hcnlIYW5kbGVyID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBtYXRjaGVzOiB7aGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT4sIGFuYWx5c2lzOiBhbnl9W10gPSBbXTtcbiAgY29uc3QgYWxsRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHtoYW5kbGVyLCBkZXRlY3RlZH0gb2YgZGV0ZWN0aW9ucykge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7YW5hbHlzaXMsIGRpYWdub3N0aWNzfSA9IGhhbmRsZXIuYW5hbHl6ZShkZWNsYXJhdGlvbiwgZGV0ZWN0ZWQubWV0YWRhdGEsIGZsYWdzKTtcbiAgICAgIGlmIChkaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFsbERpYWdub3N0aWNzLnB1c2goLi4uZGlhZ25vc3RpY3MpO1xuICAgICAgfVxuICAgICAgbWF0Y2hlcy5wdXNoKHtoYW5kbGVyLCBhbmFseXNpc30pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChpc0ZhdGFsRGlhZ25vc3RpY0Vycm9yKGUpKSB7XG4gICAgICAgIGFsbERpYWdub3N0aWNzLnB1c2goZS50b0RpYWdub3N0aWMoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4ge1xuICAgIG5hbWU6IGNsYXNzU3ltYm9sLm5hbWUsXG4gICAgZGVjbGFyYXRpb24sXG4gICAgZGVjb3JhdG9ycyxcbiAgICBtYXRjaGVzLFxuICAgIGRpYWdub3N0aWNzOiBhbGxEaWFnbm9zdGljcy5sZW5ndGggPiAwID8gYWxsRGlhZ25vc3RpY3MgOiB1bmRlZmluZWRcbiAgfTtcbn1cblxuZnVuY3Rpb24gaXNNYXRjaGluZ0hhbmRsZXI8QSwgTT4oaGFuZGxlcjogUGFydGlhbDxNYXRjaGluZ0hhbmRsZXI8QSwgTT4+KTpcbiAgICBoYW5kbGVyIGlzIE1hdGNoaW5nSGFuZGxlcjxBLCBNPiB7XG4gIHJldHVybiAhIWhhbmRsZXIuZGV0ZWN0ZWQ7XG59XG4iXX0=