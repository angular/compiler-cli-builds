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
    function analyzeDecorators(classSymbol, decorators, handlers) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVNBLDJFQUFzRTtJQUN0RSwyRUFBZ0c7SUFFaEcsdUVBQStGO0lBSy9GLFNBQWdCLGVBQWUsQ0FBQyxXQUEyQixFQUFFLFVBQXlCO1FBQ3BGLE9BQU8sQ0FBQyxzQkFBUSxDQUFDLFdBQVcsRUFBRSxvQ0FBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBRkQsMENBRUM7SUFFRCxTQUFnQixpQkFBaUIsQ0FDN0IsV0FBNEIsRUFBRSxVQUE4QixFQUM1RCxRQUFzQzs7UUFDeEMsSUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQztRQUM3RCxJQUFNLGdCQUFnQixHQUFHLFFBQVE7YUFDSCxHQUFHLENBQUMsVUFBQSxPQUFPO1lBQ1YsSUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDekQsT0FBTyxFQUFDLE9BQU8sU0FBQSxFQUFFLFFBQVEsVUFBQSxFQUFDLENBQUM7UUFDN0IsQ0FBQyxDQUFDO2FBQ0QsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFFeEQsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ2pDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxJQUFNLFVBQVUsR0FBeUUsRUFBRSxDQUFDO1FBQzVGLElBQUksY0FBYyxHQUFZLEtBQUssQ0FBQztRQUNwQyxJQUFJLGlCQUFpQixHQUFZLEtBQUssQ0FBQztRQUN2QyxJQUFJLGlCQUFpQixHQUFZLEtBQUssQ0FBQzs7WUFFdkMsS0FBa0MsSUFBQSxxQkFBQSxpQkFBQSxnQkFBZ0IsQ0FBQSxrREFBQSxnRkFBRTtnQkFBekMsSUFBQSwrQkFBbUIsRUFBbEIsb0JBQU8sRUFBRSxzQkFBUTtnQkFDM0IsSUFBSSxpQkFBaUIsSUFBSSxPQUFPLENBQUMsVUFBVSxLQUFLLDZCQUFpQixDQUFDLElBQUksRUFBRTtvQkFDdEUsU0FBUztpQkFDVjtxQkFBTSxJQUFJLGNBQWMsSUFBSSxPQUFPLENBQUMsVUFBVSxLQUFLLDZCQUFpQixDQUFDLElBQUksRUFBRTtvQkFDMUUsd0RBQXdEO29CQUN4RCxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztpQkFDdkI7Z0JBQ0QsSUFBSSxpQkFBaUIsSUFBSSxPQUFPLENBQUMsVUFBVSxLQUFLLDZCQUFpQixDQUFDLE9BQU8sRUFBRTtvQkFDekUsTUFBTSxJQUFJLEtBQUssQ0FBQyxzRUFBc0UsQ0FBQyxDQUFDO2lCQUN6RjtnQkFFRCxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUMsT0FBTyxTQUFBLEVBQUUsUUFBUSxVQUFBLEVBQUMsQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEtBQUssNkJBQWlCLENBQUMsSUFBSSxFQUFFO29CQUNqRCxjQUFjLEdBQUcsSUFBSSxDQUFDO2lCQUN2QjtxQkFBTSxJQUFJLE9BQU8sQ0FBQyxVQUFVLEtBQUssNkJBQWlCLENBQUMsTUFBTSxFQUFFO29CQUMxRCxpQkFBaUIsR0FBRyxJQUFJLENBQUM7aUJBQzFCO3FCQUFNLElBQUksT0FBTyxDQUFDLFVBQVUsS0FBSyw2QkFBaUIsQ0FBQyxPQUFPLEVBQUU7b0JBQzNELGlCQUFpQixHQUFHLElBQUksQ0FBQztvQkFDekIsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO2lCQUMxQjthQUNGOzs7Ozs7Ozs7UUFFRCxJQUFNLE9BQU8sR0FBMkQsRUFBRSxDQUFDO1FBQzNFLElBQU0sY0FBYyxHQUFvQixFQUFFLENBQUM7O1lBQzNDLEtBQWtDLElBQUEsZUFBQSxpQkFBQSxVQUFVLENBQUEsc0NBQUEsOERBQUU7Z0JBQW5DLElBQUEseUJBQW1CLEVBQWxCLG9CQUFPLEVBQUUsc0JBQVE7Z0JBQzNCLElBQUk7b0JBQ0ksSUFBQSxvREFBeUUsRUFBeEUsc0JBQVEsRUFBRSw0QkFBOEQsQ0FBQztvQkFDaEYsSUFBSSxXQUFXLEtBQUssU0FBUyxFQUFFO3dCQUM3QixjQUFjLENBQUMsSUFBSSxPQUFuQixjQUFjLG1CQUFTLFdBQVcsR0FBRTtxQkFDckM7b0JBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sU0FBQSxFQUFFLFFBQVEsVUFBQSxFQUFDLENBQUMsQ0FBQztpQkFDbkM7Z0JBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ1YsSUFBSSxvQ0FBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRTt3QkFDN0IsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztxQkFDdkM7eUJBQU07d0JBQ0wsTUFBTSxDQUFDLENBQUM7cUJBQ1Q7aUJBQ0Y7YUFDRjs7Ozs7Ozs7O1FBQ0QsT0FBTztZQUNMLElBQUksRUFBRSxXQUFXLENBQUMsSUFBSTtZQUN0QixXQUFXLGFBQUE7WUFDWCxVQUFVLFlBQUE7WUFDVixPQUFPLFNBQUE7WUFDUCxXQUFXLEVBQUUsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUNwRSxDQUFDO0lBQ0osQ0FBQztJQWpFRCw4Q0FpRUM7SUFFRCxTQUFTLGlCQUFpQixDQUFPLE9BQXVDO1FBRXRFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7SUFDNUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2lzRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCByZWxhdGl2ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RGVjb3JhdG9yfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0RlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtOZ2NjQ2xhc3NTeW1ib2x9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcblxuaW1wb3J0IHtBbmFseXplZENsYXNzLCBNYXRjaGluZ0hhbmRsZXJ9IGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNXaXRoaW5QYWNrYWdlKHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gIXJlbGF0aXZlKHBhY2thZ2VQYXRoLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNvdXJjZUZpbGUpKS5zdGFydHNXaXRoKCcuLicpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZURlY29yYXRvcnMoXG4gICAgY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCwgZGVjb3JhdG9yczogRGVjb3JhdG9yW10gfCBudWxsLFxuICAgIGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPGFueSwgYW55PltdKTogQW5hbHl6ZWRDbGFzc3xudWxsIHtcbiAgY29uc3QgZGVjbGFyYXRpb24gPSBjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuICBjb25zdCBtYXRjaGluZ0hhbmRsZXJzID0gaGFuZGxlcnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGhhbmRsZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGV0ZWN0ZWQgPSBoYW5kbGVyLmRldGVjdChkZWNsYXJhdGlvbiwgZGVjb3JhdG9ycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge2hhbmRsZXIsIGRldGVjdGVkfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaXNNYXRjaGluZ0hhbmRsZXIpO1xuXG4gIGlmIChtYXRjaGluZ0hhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IGRldGVjdGlvbnM6IHtoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPGFueSwgYW55PiwgZGV0ZWN0ZWQ6IERldGVjdFJlc3VsdDxhbnk+fVtdID0gW107XG4gIGxldCBoYXNXZWFrSGFuZGxlcjogYm9vbGVhbiA9IGZhbHNlO1xuICBsZXQgaGFzTm9uV2Vha0hhbmRsZXI6IGJvb2xlYW4gPSBmYWxzZTtcbiAgbGV0IGhhc1ByaW1hcnlIYW5kbGVyOiBib29sZWFuID0gZmFsc2U7XG5cbiAgZm9yIChjb25zdCB7aGFuZGxlciwgZGV0ZWN0ZWR9IG9mIG1hdGNoaW5nSGFuZGxlcnMpIHtcbiAgICBpZiAoaGFzTm9uV2Vha0hhbmRsZXIgJiYgaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9IGVsc2UgaWYgKGhhc1dlYWtIYW5kbGVyICYmIGhhbmRsZXIucHJlY2VkZW5jZSAhPT0gSGFuZGxlclByZWNlZGVuY2UuV0VBSykge1xuICAgICAgLy8gQ2xlYXIgYWxsIHRoZSBXRUFLIGhhbmRsZXJzIGZyb20gdGhlIGxpc3Qgb2YgbWF0Y2hlcy5cbiAgICAgIGRldGVjdGlvbnMubGVuZ3RoID0gMDtcbiAgICB9XG4gICAgaWYgKGhhc1ByaW1hcnlIYW5kbGVyICYmIGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUT0RPLkRpYWdub3N0aWM6IENsYXNzIGhhcyBtdWx0aXBsZSBpbmNvbXBhdGlibGUgQW5ndWxhciBkZWNvcmF0b3JzLmApO1xuICAgIH1cblxuICAgIGRldGVjdGlvbnMucHVzaCh7aGFuZGxlciwgZGV0ZWN0ZWR9KTtcbiAgICBpZiAoaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLKSB7XG4gICAgICBoYXNXZWFrSGFuZGxlciA9IHRydWU7XG4gICAgfSBlbHNlIGlmIChoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLlNIQVJFRCkge1xuICAgICAgaGFzTm9uV2Vha0hhbmRsZXIgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZKSB7XG4gICAgICBoYXNOb25XZWFrSGFuZGxlciA9IHRydWU7XG4gICAgICBoYXNQcmltYXJ5SGFuZGxlciA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbWF0Y2hlczoge2hhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+LCBhbmFseXNpczogYW55fVtdID0gW107XG4gIGNvbnN0IGFsbERpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgZm9yIChjb25zdCB7aGFuZGxlciwgZGV0ZWN0ZWR9IG9mIGRldGVjdGlvbnMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qge2FuYWx5c2lzLCBkaWFnbm9zdGljc30gPSBoYW5kbGVyLmFuYWx5emUoZGVjbGFyYXRpb24sIGRldGVjdGVkLm1ldGFkYXRhKTtcbiAgICAgIGlmIChkaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFsbERpYWdub3N0aWNzLnB1c2goLi4uZGlhZ25vc3RpY3MpO1xuICAgICAgfVxuICAgICAgbWF0Y2hlcy5wdXNoKHtoYW5kbGVyLCBhbmFseXNpc30pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChpc0ZhdGFsRGlhZ25vc3RpY0Vycm9yKGUpKSB7XG4gICAgICAgIGFsbERpYWdub3N0aWNzLnB1c2goZS50b0RpYWdub3N0aWMoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4ge1xuICAgIG5hbWU6IGNsYXNzU3ltYm9sLm5hbWUsXG4gICAgZGVjbGFyYXRpb24sXG4gICAgZGVjb3JhdG9ycyxcbiAgICBtYXRjaGVzLFxuICAgIGRpYWdub3N0aWNzOiBhbGxEaWFnbm9zdGljcy5sZW5ndGggPiAwID8gYWxsRGlhZ25vc3RpY3MgOiB1bmRlZmluZWRcbiAgfTtcbn1cblxuZnVuY3Rpb24gaXNNYXRjaGluZ0hhbmRsZXI8QSwgTT4oaGFuZGxlcjogUGFydGlhbDxNYXRjaGluZ0hhbmRsZXI8QSwgTT4+KTpcbiAgICBoYW5kbGVyIGlzIE1hdGNoaW5nSGFuZGxlcjxBLCBNPiB7XG4gIHJldHVybiAhIWhhbmRsZXIuZGV0ZWN0ZWQ7XG59XG4iXX0=