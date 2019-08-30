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
    function analyzeDecorators(symbol, decorators, handlers) {
        var e_1, _a, e_2, _b;
        var declaration = symbol.valueDeclaration;
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
                    var _e = handler.analyze(declaration, detected.metadata), analysis = _e.analysis, diagnostics = _e.diagnostics;
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
            name: symbol.name,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVNBLDJFQUFzRTtJQUN0RSwyRUFBZ0c7SUFFaEcsdUVBQStGO0lBSS9GLFNBQWdCLGVBQWUsQ0FBQyxXQUEyQixFQUFFLFVBQXlCO1FBQ3BGLE9BQU8sQ0FBQyxzQkFBUSxDQUFDLFdBQVcsRUFBRSxvQ0FBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBRkQsMENBRUM7SUFFRCxTQUFnQixpQkFBaUIsQ0FDN0IsTUFBbUIsRUFBRSxVQUE4QixFQUNuRCxRQUFzQzs7UUFDeEMsSUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDO1FBQzVDLElBQU0sZ0JBQWdCLEdBQUcsUUFBUTthQUNILEdBQUcsQ0FBQyxVQUFBLE9BQU87WUFDVixJQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN6RCxPQUFPLEVBQUMsT0FBTyxTQUFBLEVBQUUsUUFBUSxVQUFBLEVBQUMsQ0FBQztRQUM3QixDQUFDLENBQUM7YUFDRCxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUV4RCxJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDakMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQU0sVUFBVSxHQUF5RSxFQUFFLENBQUM7UUFDNUYsSUFBSSxjQUFjLEdBQVksS0FBSyxDQUFDO1FBQ3BDLElBQUksaUJBQWlCLEdBQVksS0FBSyxDQUFDO1FBQ3ZDLElBQUksaUJBQWlCLEdBQVksS0FBSyxDQUFDOztZQUV2QyxLQUFrQyxJQUFBLHFCQUFBLGlCQUFBLGdCQUFnQixDQUFBLGtEQUFBLGdGQUFFO2dCQUF6QyxJQUFBLCtCQUFtQixFQUFsQixvQkFBTyxFQUFFLHNCQUFRO2dCQUMzQixJQUFJLGlCQUFpQixJQUFJLE9BQU8sQ0FBQyxVQUFVLEtBQUssNkJBQWlCLENBQUMsSUFBSSxFQUFFO29CQUN0RSxTQUFTO2lCQUNWO3FCQUFNLElBQUksY0FBYyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEtBQUssNkJBQWlCLENBQUMsSUFBSSxFQUFFO29CQUMxRSx3REFBd0Q7b0JBQ3hELFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2lCQUN2QjtnQkFDRCxJQUFJLGlCQUFpQixJQUFJLE9BQU8sQ0FBQyxVQUFVLEtBQUssNkJBQWlCLENBQUMsT0FBTyxFQUFFO29CQUN6RSxNQUFNLElBQUksS0FBSyxDQUFDLHNFQUFzRSxDQUFDLENBQUM7aUJBQ3pGO2dCQUVELFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBQyxPQUFPLFNBQUEsRUFBRSxRQUFRLFVBQUEsRUFBQyxDQUFDLENBQUM7Z0JBQ3JDLElBQUksT0FBTyxDQUFDLFVBQVUsS0FBSyw2QkFBaUIsQ0FBQyxJQUFJLEVBQUU7b0JBQ2pELGNBQWMsR0FBRyxJQUFJLENBQUM7aUJBQ3ZCO3FCQUFNLElBQUksT0FBTyxDQUFDLFVBQVUsS0FBSyw2QkFBaUIsQ0FBQyxNQUFNLEVBQUU7b0JBQzFELGlCQUFpQixHQUFHLElBQUksQ0FBQztpQkFDMUI7cUJBQU0sSUFBSSxPQUFPLENBQUMsVUFBVSxLQUFLLDZCQUFpQixDQUFDLE9BQU8sRUFBRTtvQkFDM0QsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO29CQUN6QixpQkFBaUIsR0FBRyxJQUFJLENBQUM7aUJBQzFCO2FBQ0Y7Ozs7Ozs7OztRQUVELElBQU0sT0FBTyxHQUEyRCxFQUFFLENBQUM7UUFDM0UsSUFBTSxjQUFjLEdBQW9CLEVBQUUsQ0FBQzs7WUFDM0MsS0FBa0MsSUFBQSxlQUFBLGlCQUFBLFVBQVUsQ0FBQSxzQ0FBQSw4REFBRTtnQkFBbkMsSUFBQSx5QkFBbUIsRUFBbEIsb0JBQU8sRUFBRSxzQkFBUTtnQkFDM0IsSUFBSTtvQkFDSSxJQUFBLG9EQUF5RSxFQUF4RSxzQkFBUSxFQUFFLDRCQUE4RCxDQUFDO29CQUNoRixJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUU7d0JBQzdCLGNBQWMsQ0FBQyxJQUFJLE9BQW5CLGNBQWMsbUJBQVMsV0FBVyxHQUFFO3FCQUNyQztvQkFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsT0FBTyxTQUFBLEVBQUUsUUFBUSxVQUFBLEVBQUMsQ0FBQyxDQUFDO2lCQUNuQztnQkFBQyxPQUFPLENBQUMsRUFBRTtvQkFDVixJQUFJLG9DQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFO3dCQUM3QixjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO3FCQUN2Qzt5QkFBTTt3QkFDTCxNQUFNLENBQUMsQ0FBQztxQkFDVDtpQkFDRjthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPO1lBQ0wsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO1lBQ2pCLFdBQVcsYUFBQTtZQUNYLFVBQVUsWUFBQTtZQUNWLE9BQU8sU0FBQTtZQUNQLFdBQVcsRUFBRSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxTQUFTO1NBQ3BFLENBQUM7SUFDSixDQUFDO0lBakVELDhDQWlFQztJQUVELFNBQVMsaUJBQWlCLENBQU8sT0FBdUM7UUFFdEUsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztJQUM1QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7aXNGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIHJlbGF0aXZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDbGFzc1N5bWJvbCwgRGVjb3JhdG9yfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0RlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2Zvcm0nO1xuXG5pbXBvcnQge0FuYWx5emVkQ2xhc3MsIE1hdGNoaW5nSGFuZGxlcn0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1dpdGhpblBhY2thZ2UocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gIHJldHVybiAhcmVsYXRpdmUocGFja2FnZVBhdGgsIGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc291cmNlRmlsZSkpLnN0YXJ0c1dpdGgoJy4uJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplRGVjb3JhdG9ycyhcbiAgICBzeW1ib2w6IENsYXNzU3ltYm9sLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSB8IG51bGwsXG4gICAgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+W10pOiBBbmFseXplZENsYXNzfG51bGwge1xuICBjb25zdCBkZWNsYXJhdGlvbiA9IHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICBjb25zdCBtYXRjaGluZ0hhbmRsZXJzID0gaGFuZGxlcnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGhhbmRsZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGV0ZWN0ZWQgPSBoYW5kbGVyLmRldGVjdChkZWNsYXJhdGlvbiwgZGVjb3JhdG9ycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge2hhbmRsZXIsIGRldGVjdGVkfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaXNNYXRjaGluZ0hhbmRsZXIpO1xuXG4gIGlmIChtYXRjaGluZ0hhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IGRldGVjdGlvbnM6IHtoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPGFueSwgYW55PiwgZGV0ZWN0ZWQ6IERldGVjdFJlc3VsdDxhbnk+fVtdID0gW107XG4gIGxldCBoYXNXZWFrSGFuZGxlcjogYm9vbGVhbiA9IGZhbHNlO1xuICBsZXQgaGFzTm9uV2Vha0hhbmRsZXI6IGJvb2xlYW4gPSBmYWxzZTtcbiAgbGV0IGhhc1ByaW1hcnlIYW5kbGVyOiBib29sZWFuID0gZmFsc2U7XG5cbiAgZm9yIChjb25zdCB7aGFuZGxlciwgZGV0ZWN0ZWR9IG9mIG1hdGNoaW5nSGFuZGxlcnMpIHtcbiAgICBpZiAoaGFzTm9uV2Vha0hhbmRsZXIgJiYgaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9IGVsc2UgaWYgKGhhc1dlYWtIYW5kbGVyICYmIGhhbmRsZXIucHJlY2VkZW5jZSAhPT0gSGFuZGxlclByZWNlZGVuY2UuV0VBSykge1xuICAgICAgLy8gQ2xlYXIgYWxsIHRoZSBXRUFLIGhhbmRsZXJzIGZyb20gdGhlIGxpc3Qgb2YgbWF0Y2hlcy5cbiAgICAgIGRldGVjdGlvbnMubGVuZ3RoID0gMDtcbiAgICB9XG4gICAgaWYgKGhhc1ByaW1hcnlIYW5kbGVyICYmIGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUT0RPLkRpYWdub3N0aWM6IENsYXNzIGhhcyBtdWx0aXBsZSBpbmNvbXBhdGlibGUgQW5ndWxhciBkZWNvcmF0b3JzLmApO1xuICAgIH1cblxuICAgIGRldGVjdGlvbnMucHVzaCh7aGFuZGxlciwgZGV0ZWN0ZWR9KTtcbiAgICBpZiAoaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLKSB7XG4gICAgICBoYXNXZWFrSGFuZGxlciA9IHRydWU7XG4gICAgfSBlbHNlIGlmIChoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLlNIQVJFRCkge1xuICAgICAgaGFzTm9uV2Vha0hhbmRsZXIgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZKSB7XG4gICAgICBoYXNOb25XZWFrSGFuZGxlciA9IHRydWU7XG4gICAgICBoYXNQcmltYXJ5SGFuZGxlciA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbWF0Y2hlczoge2hhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+LCBhbmFseXNpczogYW55fVtdID0gW107XG4gIGNvbnN0IGFsbERpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgZm9yIChjb25zdCB7aGFuZGxlciwgZGV0ZWN0ZWR9IG9mIGRldGVjdGlvbnMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qge2FuYWx5c2lzLCBkaWFnbm9zdGljc30gPSBoYW5kbGVyLmFuYWx5emUoZGVjbGFyYXRpb24sIGRldGVjdGVkLm1ldGFkYXRhKTtcbiAgICAgIGlmIChkaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFsbERpYWdub3N0aWNzLnB1c2goLi4uZGlhZ25vc3RpY3MpO1xuICAgICAgfVxuICAgICAgbWF0Y2hlcy5wdXNoKHtoYW5kbGVyLCBhbmFseXNpc30pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChpc0ZhdGFsRGlhZ25vc3RpY0Vycm9yKGUpKSB7XG4gICAgICAgIGFsbERpYWdub3N0aWNzLnB1c2goZS50b0RpYWdub3N0aWMoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4ge1xuICAgIG5hbWU6IHN5bWJvbC5uYW1lLFxuICAgIGRlY2xhcmF0aW9uLFxuICAgIGRlY29yYXRvcnMsXG4gICAgbWF0Y2hlcyxcbiAgICBkaWFnbm9zdGljczogYWxsRGlhZ25vc3RpY3MubGVuZ3RoID4gMCA/IGFsbERpYWdub3N0aWNzIDogdW5kZWZpbmVkXG4gIH07XG59XG5cbmZ1bmN0aW9uIGlzTWF0Y2hpbmdIYW5kbGVyPEEsIE0+KGhhbmRsZXI6IFBhcnRpYWw8TWF0Y2hpbmdIYW5kbGVyPEEsIE0+Pik6XG4gICAgaGFuZGxlciBpcyBNYXRjaGluZ0hhbmRsZXI8QSwgTT4ge1xuICByZXR1cm4gISFoYW5kbGVyLmRldGVjdGVkO1xufVxuIl19