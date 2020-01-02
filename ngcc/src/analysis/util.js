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
    var NOT_YET_KNOWN = null;
    function analyzeDecorators(classSymbol, decorators, handlers, flags) {
        var e_1, _a, e_2, _b, e_3, _c;
        var declaration = classSymbol.declaration.valueDeclaration;
        var matchingHandlers = [];
        try {
            for (var handlers_1 = tslib_1.__values(handlers), handlers_1_1 = handlers_1.next(); !handlers_1_1.done; handlers_1_1 = handlers_1.next()) {
                var handler = handlers_1_1.value;
                var detected = handler.detect(declaration, decorators);
                if (detected !== undefined) {
                    matchingHandlers.push({
                        handler: handler,
                        detected: detected,
                        analysis: NOT_YET_KNOWN,
                        resolution: NOT_YET_KNOWN,
                    });
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (handlers_1_1 && !handlers_1_1.done && (_a = handlers_1.return)) _a.call(handlers_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (matchingHandlers.length === 0) {
            return null;
        }
        var detections = [];
        var hasWeakHandler = false;
        var hasNonWeakHandler = false;
        var hasPrimaryHandler = false;
        try {
            for (var matchingHandlers_1 = tslib_1.__values(matchingHandlers), matchingHandlers_1_1 = matchingHandlers_1.next(); !matchingHandlers_1_1.done; matchingHandlers_1_1 = matchingHandlers_1.next()) {
                var match = matchingHandlers_1_1.value;
                var handler = match.handler;
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
                detections.push(match);
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
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (matchingHandlers_1_1 && !matchingHandlers_1_1.done && (_b = matchingHandlers_1.return)) _b.call(matchingHandlers_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        var matches = [];
        var allDiagnostics = [];
        try {
            for (var detections_1 = tslib_1.__values(detections), detections_1_1 = detections_1.next(); !detections_1_1.done; detections_1_1 = detections_1.next()) {
                var match = detections_1_1.value;
                try {
                    var _d = match.handler.analyze(declaration, match.detected.metadata, flags), analysis = _d.analysis, diagnostics = _d.diagnostics;
                    if (diagnostics !== undefined) {
                        allDiagnostics.push.apply(allDiagnostics, tslib_1.__spread(diagnostics));
                    }
                    if (analysis !== undefined) {
                        match.analysis = analysis;
                        if (match.handler.register !== undefined) {
                            match.handler.register(declaration, analysis);
                        }
                    }
                    matches.push(match);
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
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (detections_1_1 && !detections_1_1.done && (_c = detections_1.return)) _c.call(detections_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return {
            name: classSymbol.name,
            declaration: declaration,
            decorators: decorators,
            matches: matches,
            diagnostics: allDiagnostics.length > 0 ? allDiagnostics : undefined,
        };
    }
    exports.analyzeDecorators = analyzeDecorators;
    var NoopDependencyTracker = /** @class */ (function () {
        function NoopDependencyTracker() {
        }
        NoopDependencyTracker.prototype.addDependency = function () { };
        NoopDependencyTracker.prototype.addResourceDependency = function () { };
        NoopDependencyTracker.prototype.addTransitiveDependency = function () { };
        NoopDependencyTracker.prototype.addTransitiveResources = function () { };
        return NoopDependencyTracker;
    }());
    exports.NOOP_DEPENDENCY_TRACKER = new NoopDependencyTracker();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVNBLDJFQUFzRTtJQUN0RSwyRUFBZ0c7SUFHaEcsdUVBQStGO0lBSy9GLFNBQWdCLGVBQWUsQ0FBQyxXQUEyQixFQUFFLFVBQXlCO1FBQ3BGLE9BQU8sQ0FBQyxzQkFBUSxDQUFDLFdBQVcsRUFBRSxvQ0FBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBRkQsMENBRUM7SUFFRCxJQUFNLGFBQWEsR0FBc0IsSUFBb0MsQ0FBQztJQUU5RSxTQUFnQixpQkFBaUIsQ0FDN0IsV0FBNEIsRUFBRSxVQUE4QixFQUM1RCxRQUF1RCxFQUFFLEtBQW9COztRQUUvRSxJQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDO1FBQzdELElBQU0sZ0JBQWdCLEdBQWlELEVBQUUsQ0FBQzs7WUFDMUUsS0FBc0IsSUFBQSxhQUFBLGlCQUFBLFFBQVEsQ0FBQSxrQ0FBQSx3REFBRTtnQkFBM0IsSUFBTSxPQUFPLHFCQUFBO2dCQUNoQixJQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDekQsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFO29CQUMxQixnQkFBZ0IsQ0FBQyxJQUFJLENBQUM7d0JBQ3BCLE9BQU8sU0FBQTt3QkFDUCxRQUFRLFVBQUE7d0JBQ1IsUUFBUSxFQUFFLGFBQWE7d0JBQ3ZCLFVBQVUsRUFBRSxhQUFhO3FCQUMxQixDQUFDLENBQUM7aUJBQ0o7YUFDRjs7Ozs7Ozs7O1FBRUQsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFF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QztJQUNKLENBQUM7SUFqRkQsOENBaUZDO0lBRUQ7UUFBQTtRQUtBLENBQUM7UUFKQyw2Q0FBYSxHQUFiLGNBQXVCLENBQUM7UUFDeEIscURBQXFCLEdBQXJCLGNBQStCLENBQUM7UUFDaEMsdURBQXVCLEdBQXZCLGNBQWlDLENBQUM7UUFDbEMsc0RBQXNCLEdBQXRCLGNBQWdDLENBQUM7UUFDbkMsNEJBQUM7SUFBRCxDQUFDLEFBTEQsSUFLQztJQUVZLFFBQUEsdUJBQXVCLEdBQXNCLElBQUkscUJBQXFCLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2lzRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCByZWxhdGl2ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RGVwZW5kZW5jeVRyYWNrZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9pbmNyZW1lbnRhbC9hcGknO1xuaW1wb3J0IHtEZWNvcmF0b3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7RGVjb3JhdG9ySGFuZGxlciwgSGFuZGxlckZsYWdzLCBIYW5kbGVyUHJlY2VkZW5jZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge05nY2NDbGFzc1N5bWJvbH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuXG5pbXBvcnQge0FuYWx5emVkQ2xhc3MsIE1hdGNoaW5nSGFuZGxlcn0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1dpdGhpblBhY2thZ2UocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gIHJldHVybiAhcmVsYXRpdmUocGFja2FnZVBhdGgsIGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc291cmNlRmlsZSkpLnN0YXJ0c1dpdGgoJy4uJyk7XG59XG5cbmNvbnN0IE5PVF9ZRVRfS05PV046IFJlYWRvbmx5PHVua25vd24+ID0gbnVsbCBhcyB1bmtub3duIGFzIFJlYWRvbmx5PHVua25vd24+O1xuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZURlY29yYXRvcnMoXG4gICAgY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCwgZGVjb3JhdG9yczogRGVjb3JhdG9yW10gfCBudWxsLFxuICAgIGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIHVua25vd24+W10sIGZsYWdzPzogSGFuZGxlckZsYWdzKTogQW5hbHl6ZWRDbGFzc3xcbiAgICBudWxsIHtcbiAgY29uc3QgZGVjbGFyYXRpb24gPSBjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuICBjb25zdCBtYXRjaGluZ0hhbmRsZXJzOiBNYXRjaGluZ0hhbmRsZXI8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj5bXSA9IFtdO1xuICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgaGFuZGxlcnMpIHtcbiAgICBjb25zdCBkZXRlY3RlZCA9IGhhbmRsZXIuZGV0ZWN0KGRlY2xhcmF0aW9uLCBkZWNvcmF0b3JzKTtcbiAgICBpZiAoZGV0ZWN0ZWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbWF0Y2hpbmdIYW5kbGVycy5wdXNoKHtcbiAgICAgICAgaGFuZGxlcixcbiAgICAgICAgZGV0ZWN0ZWQsXG4gICAgICAgIGFuYWx5c2lzOiBOT1RfWUVUX0tOT1dOLFxuICAgICAgICByZXNvbHV0aW9uOiBOT1RfWUVUX0tOT1dOLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKG1hdGNoaW5nSGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBkZXRlY3Rpb25zOiBNYXRjaGluZ0hhbmRsZXI8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj5bXSA9IFtdO1xuICBsZXQgaGFzV2Vha0hhbmRsZXI6IGJvb2xlYW4gPSBmYWxzZTtcbiAgbGV0IGhhc05vbldlYWtIYW5kbGVyOiBib29sZWFuID0gZmFsc2U7XG4gIGxldCBoYXNQcmltYXJ5SGFuZGxlcjogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIGZvciAoY29uc3QgbWF0Y2ggb2YgbWF0Y2hpbmdIYW5kbGVycykge1xuICAgIGNvbnN0IHtoYW5kbGVyfSA9IG1hdGNoO1xuICAgIGlmIChoYXNOb25XZWFrSGFuZGxlciAmJiBoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLldFQUspIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH0gZWxzZSBpZiAoaGFzV2Vha0hhbmRsZXIgJiYgaGFuZGxlci5wcmVjZWRlbmNlICE9PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLKSB7XG4gICAgICAvLyBDbGVhciBhbGwgdGhlIFdFQUsgaGFuZGxlcnMgZnJvbSB0aGUgbGlzdCBvZiBtYXRjaGVzLlxuICAgICAgZGV0ZWN0aW9ucy5sZW5ndGggPSAwO1xuICAgIH1cbiAgICBpZiAoaGFzUHJpbWFyeUhhbmRsZXIgJiYgaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRPRE8uRGlhZ25vc3RpYzogQ2xhc3MgaGFzIG11bHRpcGxlIGluY29tcGF0aWJsZSBBbmd1bGFyIGRlY29yYXRvcnMuYCk7XG4gICAgfVxuXG4gICAgZGV0ZWN0aW9ucy5wdXNoKG1hdGNoKTtcbiAgICBpZiAoaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLKSB7XG4gICAgICBoYXNXZWFrSGFuZGxlciA9IHRydWU7XG4gICAgfSBlbHNlIGlmIChoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLlNIQVJFRCkge1xuICAgICAgaGFzTm9uV2Vha0hhbmRsZXIgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZKSB7XG4gICAgICBoYXNOb25XZWFrSGFuZGxlciA9IHRydWU7XG4gICAgICBoYXNQcmltYXJ5SGFuZGxlciA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbWF0Y2hlczogTWF0Y2hpbmdIYW5kbGVyPHVua25vd24sIHVua25vd24sIHVua25vd24+W10gPSBbXTtcbiAgY29uc3QgYWxsRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBmb3IgKGNvbnN0IG1hdGNoIG9mIGRldGVjdGlvbnMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qge2FuYWx5c2lzLCBkaWFnbm9zdGljc30gPVxuICAgICAgICAgIG1hdGNoLmhhbmRsZXIuYW5hbHl6ZShkZWNsYXJhdGlvbiwgbWF0Y2guZGV0ZWN0ZWQubWV0YWRhdGEsIGZsYWdzKTtcbiAgICAgIGlmIChkaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFsbERpYWdub3N0aWNzLnB1c2goLi4uZGlhZ25vc3RpY3MpO1xuICAgICAgfVxuICAgICAgaWYgKGFuYWx5c2lzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbWF0Y2guYW5hbHlzaXMgPSBhbmFseXNpcztcbiAgICAgICAgaWYgKG1hdGNoLmhhbmRsZXIucmVnaXN0ZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIG1hdGNoLmhhbmRsZXIucmVnaXN0ZXIoZGVjbGFyYXRpb24sIGFuYWx5c2lzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbWF0Y2hlcy5wdXNoKG1hdGNoKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoaXNGYXRhbERpYWdub3N0aWNFcnJvcihlKSkge1xuICAgICAgICBhbGxEaWFnbm9zdGljcy5wdXNoKGUudG9EaWFnbm9zdGljKCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBjbGFzc1N5bWJvbC5uYW1lLFxuICAgIGRlY2xhcmF0aW9uLFxuICAgIGRlY29yYXRvcnMsXG4gICAgbWF0Y2hlcyxcbiAgICBkaWFnbm9zdGljczogYWxsRGlhZ25vc3RpY3MubGVuZ3RoID4gMCA/IGFsbERpYWdub3N0aWNzIDogdW5kZWZpbmVkLFxuICB9O1xufVxuXG5jbGFzcyBOb29wRGVwZW5kZW5jeVRyYWNrZXIgaW1wbGVtZW50cyBEZXBlbmRlbmN5VHJhY2tlciB7XG4gIGFkZERlcGVuZGVuY3koKTogdm9pZCB7fVxuICBhZGRSZXNvdXJjZURlcGVuZGVuY3koKTogdm9pZCB7fVxuICBhZGRUcmFuc2l0aXZlRGVwZW5kZW5jeSgpOiB2b2lkIHt9XG4gIGFkZFRyYW5zaXRpdmVSZXNvdXJjZXMoKTogdm9pZCB7fVxufVxuXG5leHBvcnQgY29uc3QgTk9PUF9ERVBFTkRFTkNZX1RSQUNLRVI6IERlcGVuZGVuY3lUcmFja2VyID0gbmV3IE5vb3BEZXBlbmRlbmN5VHJhY2tlcigpO1xuIl19