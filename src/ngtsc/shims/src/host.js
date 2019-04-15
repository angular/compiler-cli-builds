/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/shims/src/host", ["require", "exports", "@angular/compiler-cli/src/ngtsc/path/src/types"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var types_1 = require("@angular/compiler-cli/src/ngtsc/path/src/types");
    /**
     * A wrapper around a `ts.CompilerHost` which supports generated files.
     */
    var GeneratedShimsHostWrapper = /** @class */ (function () {
        function GeneratedShimsHostWrapper(delegate, shimGenerators) {
            this.delegate = delegate;
            this.shimGenerators = shimGenerators;
            if (delegate.resolveTypeReferenceDirectives) {
                this.resolveTypeReferenceDirectives = function (names, containingFile) {
                    return delegate.resolveTypeReferenceDirectives(names, containingFile);
                };
            }
            if (delegate.directoryExists !== undefined) {
                this.directoryExists = function (directoryName) { return delegate.directoryExists(directoryName); };
            }
            if (delegate.getDirectories !== undefined) {
                this.getDirectories = function (path) { return delegate.getDirectories(path); };
            }
        }
        GeneratedShimsHostWrapper.prototype.getSourceFile = function (fileName, languageVersion, onError, shouldCreateNewSourceFile) {
            var _this = this;
            for (var i = 0; i < this.shimGenerators.length; i++) {
                var generator = this.shimGenerators[i];
                // TypeScript internal paths are guaranteed to be POSIX-like absolute file paths.
                var absoluteFsPath = types_1.AbsoluteFsPath.fromUnchecked(fileName);
                if (generator.recognize(absoluteFsPath)) {
                    var readFile = function (originalFile) {
                        return _this.delegate.getSourceFile(originalFile, languageVersion, onError, shouldCreateNewSourceFile) ||
                            null;
                    };
                    return generator.generate(absoluteFsPath, readFile) || undefined;
                }
            }
            return this.delegate.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
        };
        GeneratedShimsHostWrapper.prototype.getDefaultLibFileName = function (options) {
            return this.delegate.getDefaultLibFileName(options);
        };
        GeneratedShimsHostWrapper.prototype.writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
            return this.delegate.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
        };
        GeneratedShimsHostWrapper.prototype.getCurrentDirectory = function () { return this.delegate.getCurrentDirectory(); };
        GeneratedShimsHostWrapper.prototype.getCanonicalFileName = function (fileName) {
            return this.delegate.getCanonicalFileName(fileName);
        };
        GeneratedShimsHostWrapper.prototype.useCaseSensitiveFileNames = function () { return this.delegate.useCaseSensitiveFileNames(); };
        GeneratedShimsHostWrapper.prototype.getNewLine = function () { return this.delegate.getNewLine(); };
        GeneratedShimsHostWrapper.prototype.fileExists = function (fileName) {
            // Consider the file as existing whenever
            //  1) it really does exist in the delegate host, or
            //  2) at least one of the shim generators recognizes it
            // Note that we can pass the file name as branded absolute fs path because TypeScript
            // internally only passes POSIX-like paths.
            return this.delegate.fileExists(fileName) ||
                this.shimGenerators.some(function (gen) { return gen.recognize(types_1.AbsoluteFsPath.fromUnchecked(fileName)); });
        };
        GeneratedShimsHostWrapper.prototype.readFile = function (fileName) { return this.delegate.readFile(fileName); };
        return GeneratedShimsHostWrapper;
    }());
    exports.GeneratedShimsHostWrapper = GeneratedShimsHostWrapper;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFHSCx3RUFBb0Q7SUFvQnBEOztPQUVHO0lBQ0g7UUFDRSxtQ0FBb0IsUUFBeUIsRUFBVSxjQUErQjtZQUFsRSxhQUFRLEdBQVIsUUFBUSxDQUFpQjtZQUFVLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtZQUNwRixJQUFJLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRTtnQkFNM0MsSUFBSSxDQUFDLDhCQUE4QixHQUFHLFVBQUMsS0FBZSxFQUFFLGNBQXNCO29CQUMxRSxPQUFDLFFBQVEsQ0FBQyw4QkFBc0UsQ0FDNUUsS0FBSyxFQUFFLGNBQWMsQ0FBQztnQkFEMUIsQ0FDMEIsQ0FBQzthQUNoQztZQUNELElBQUksUUFBUSxDQUFDLGVBQWUsS0FBSyxTQUFTLEVBQUU7Z0JBQzFDLElBQUksQ0FBQyxlQUFlLEdBQUcsVUFBQyxhQUFxQixJQUFLLE9BQUEsUUFBUSxDQUFDLGVBQWlCLENBQUMsYUFBYSxDQUFDLEVBQXpDLENBQXlDLENBQUM7YUFDN0Y7WUFDRCxJQUFJLFFBQVEsQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFO2dCQUN6QyxJQUFJLENBQUMsY0FBYyxHQUFHLFVBQUMsSUFBWSxJQUFLLE9BQUEsUUFBUSxDQUFDLGNBQWdCLENBQUMsSUFBSSxDQUFDLEVBQS9CLENBQStCLENBQUM7YUFDekU7UUFDSCxDQUFDO1FBT0QsaURBQWEsR0FBYixVQUNJLFFBQWdCLEVBQUUsZUFBZ0MsRUFDbEQsT0FBK0MsRUFDL0MseUJBQTZDO1lBSGpELGlCQW9CQztZQWhCQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ25ELElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pDLGlGQUFpRjtnQkFDakYsSUFBTSxjQUFjLEdBQUcsc0JBQWMsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzlELElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsRUFBRTtvQkFDdkMsSUFBTSxRQUFRLEdBQUcsVUFBQyxZQUFvQjt3QkFDcEMsT0FBTyxLQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FDdkIsWUFBWSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUseUJBQXlCLENBQUM7NEJBQ3pFLElBQUksQ0FBQztvQkFDWCxDQUFDLENBQUM7b0JBRUYsT0FBTyxTQUFTLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsSUFBSSxTQUFTLENBQUM7aUJBQ2xFO2FBQ0Y7WUFDRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUM5QixRQUFRLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFFRCx5REFBcUIsR0FBckIsVUFBc0IsT0FBMkI7WUFDL0MsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFFRCw2Q0FBUyxHQUFULFVBQ0ksUUFBZ0IsRUFBRSxJQUFZLEVBQUUsa0JBQTJCLEVBQzNELE9BQThDLEVBQzlDLFdBQW1EO1lBQ3JELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDM0YsQ0FBQztRQUVELHVEQUFtQixHQUFuQixjQUFnQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFJN0Usd0RBQW9CLEdBQXBCLFVBQXFCLFFBQWdCO1lBQ25DLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsNkRBQXlCLEdBQXpCLGNBQXVDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUxRiw4Q0FBVSxHQUFWLGNBQXVCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFM0QsOENBQVUsR0FBVixVQUFXLFFBQWdCO1lBQ3pCLHlDQUF5QztZQUN6QyxvREFBb0Q7WUFDcEQsd0RBQXdEO1lBQ3hELHFGQUFxRjtZQUNyRiwyQ0FBMkM7WUFDM0MsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxzQkFBYyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFyRCxDQUFxRCxDQUFDLENBQUM7UUFDN0YsQ0FBQztRQUVELDRDQUFRLEdBQVIsVUFBUyxRQUFnQixJQUFzQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRixnQ0FBQztJQUFELENBQUMsQUFqRkQsSUFpRkM7SUFqRlksOERBQXlCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL3BhdGgvc3JjL3R5cGVzJztcblxuZXhwb3J0IGludGVyZmFjZSBTaGltR2VuZXJhdG9yIHtcbiAgLyoqXG4gICAqIFJldHVybnMgYHRydWVgIGlmIHRoaXMgZ2VuZXJhdG9yIGlzIGludGVuZGVkIHRvIGhhbmRsZSB0aGUgZ2l2ZW4gZmlsZS5cbiAgICovXG4gIHJlY29nbml6ZShmaWxlTmFtZTogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBhIHNoaW0ncyBgdHMuU291cmNlRmlsZWAgZm9yIHRoZSBnaXZlbiBvcmlnaW5hbCBmaWxlLlxuICAgKlxuICAgKiBgcmVhZEZpbGVgIGlzIGEgZnVuY3Rpb24gd2hpY2ggYWxsb3dzIHRoZSBnZW5lcmF0b3IgdG8gbG9vayB1cCB0aGUgY29udGVudHMgb2YgZXhpc3Rpbmcgc291cmNlXG4gICAqIGZpbGVzLiBJdCByZXR1cm5zIG51bGwgaWYgdGhlIHJlcXVlc3RlZCBmaWxlIGRvZXNuJ3QgZXhpc3QuXG4gICAqXG4gICAqIElmIGBnZW5lcmF0ZWAgcmV0dXJucyBudWxsLCB0aGVuIHRoZSBzaGltIGdlbmVyYXRvciBkZWNsaW5lcyB0byBnZW5lcmF0ZSB0aGUgZmlsZSBhZnRlciBhbGwuXG4gICAqL1xuICBnZW5lcmF0ZShnZW5GaWxlTmFtZTogQWJzb2x1dGVGc1BhdGgsIHJlYWRGaWxlOiAoZmlsZU5hbWU6IHN0cmluZykgPT4gdHMuU291cmNlRmlsZSB8IG51bGwpOlxuICAgICAgdHMuU291cmNlRmlsZXxudWxsO1xufVxuXG4vKipcbiAqIEEgd3JhcHBlciBhcm91bmQgYSBgdHMuQ29tcGlsZXJIb3N0YCB3aGljaCBzdXBwb3J0cyBnZW5lcmF0ZWQgZmlsZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBHZW5lcmF0ZWRTaGltc0hvc3RXcmFwcGVyIGltcGxlbWVudHMgdHMuQ29tcGlsZXJIb3N0IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBkZWxlZ2F0ZTogdHMuQ29tcGlsZXJIb3N0LCBwcml2YXRlIHNoaW1HZW5lcmF0b3JzOiBTaGltR2VuZXJhdG9yW10pIHtcbiAgICBpZiAoZGVsZWdhdGUucmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzKSB7XG4gICAgICAvLyBCYWNrd2FyZCBjb21wYXRpYmlsaXR5IHdpdGggVHlwZVNjcmlwdCAyLjkgYW5kIG9sZGVyIHNpbmNlIHJldHVyblxuICAgICAgLy8gdHlwZSBoYXMgY2hhbmdlZCBmcm9tICh0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmUgfCB1bmRlZmluZWQpW11cbiAgICAgIC8vIHRvIHRzLlJlc29sdmVkVHlwZVJlZmVyZW5jZURpcmVjdGl2ZVtdIGluIFR5cGVzY3JpcHQgMy4wXG4gICAgICB0eXBlIHRzM1Jlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcyA9IChuYW1lczogc3RyaW5nW10sIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpID0+XG4gICAgICAgICAgdHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlW107XG4gICAgICB0aGlzLnJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcyA9IChuYW1lczogc3RyaW5nW10sIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpID0+XG4gICAgICAgICAgKGRlbGVnYXRlLnJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcyBhcyB0czNSZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMpICEoXG4gICAgICAgICAgICAgIG5hbWVzLCBjb250YWluaW5nRmlsZSk7XG4gICAgfVxuICAgIGlmIChkZWxlZ2F0ZS5kaXJlY3RvcnlFeGlzdHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5kaXJlY3RvcnlFeGlzdHMgPSAoZGlyZWN0b3J5TmFtZTogc3RyaW5nKSA9PiBkZWxlZ2F0ZS5kaXJlY3RvcnlFeGlzdHMgIShkaXJlY3RvcnlOYW1lKTtcbiAgICB9XG4gICAgaWYgKGRlbGVnYXRlLmdldERpcmVjdG9yaWVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuZ2V0RGlyZWN0b3JpZXMgPSAocGF0aDogc3RyaW5nKSA9PiBkZWxlZ2F0ZS5nZXREaXJlY3RvcmllcyAhKHBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIHJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcz86XG4gICAgICAobmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKSA9PiB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXTtcblxuICBkaXJlY3RvcnlFeGlzdHM/OiAoZGlyZWN0b3J5TmFtZTogc3RyaW5nKSA9PiBib29sZWFuO1xuXG4gIGdldFNvdXJjZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCxcbiAgICAgIG9uRXJyb3I/OiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkLFxuICAgICAgc2hvdWxkQ3JlYXRlTmV3U291cmNlRmlsZT86IGJvb2xlYW58dW5kZWZpbmVkKTogdHMuU291cmNlRmlsZXx1bmRlZmluZWQge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zaGltR2VuZXJhdG9ycy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgZ2VuZXJhdG9yID0gdGhpcy5zaGltR2VuZXJhdG9yc1tpXTtcbiAgICAgIC8vIFR5cGVTY3JpcHQgaW50ZXJuYWwgcGF0aHMgYXJlIGd1YXJhbnRlZWQgdG8gYmUgUE9TSVgtbGlrZSBhYnNvbHV0ZSBmaWxlIHBhdGhzLlxuICAgICAgY29uc3QgYWJzb2x1dGVGc1BhdGggPSBBYnNvbHV0ZUZzUGF0aC5mcm9tVW5jaGVja2VkKGZpbGVOYW1lKTtcbiAgICAgIGlmIChnZW5lcmF0b3IucmVjb2duaXplKGFic29sdXRlRnNQYXRoKSkge1xuICAgICAgICBjb25zdCByZWFkRmlsZSA9IChvcmlnaW5hbEZpbGU6IHN0cmluZykgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldFNvdXJjZUZpbGUoXG4gICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbEZpbGUsIGxhbmd1YWdlVmVyc2lvbiwgb25FcnJvciwgc2hvdWxkQ3JlYXRlTmV3U291cmNlRmlsZSkgfHxcbiAgICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gZ2VuZXJhdG9yLmdlbmVyYXRlKGFic29sdXRlRnNQYXRoLCByZWFkRmlsZSkgfHwgdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXRTb3VyY2VGaWxlKFxuICAgICAgICBmaWxlTmFtZSwgbGFuZ3VhZ2VWZXJzaW9uLCBvbkVycm9yLCBzaG91bGRDcmVhdGVOZXdTb3VyY2VGaWxlKTtcbiAgfVxuXG4gIGdldERlZmF1bHRMaWJGaWxlTmFtZShvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldERlZmF1bHRMaWJGaWxlTmFtZShvcHRpb25zKTtcbiAgfVxuXG4gIHdyaXRlRmlsZShcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIGRhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgb25FcnJvcjogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCxcbiAgICAgIHNvdXJjZUZpbGVzOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+fHVuZGVmaW5lZCk6IHZvaWQge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLndyaXRlRmlsZShmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gIH1cblxuICBnZXRDdXJyZW50RGlyZWN0b3J5KCk6IHN0cmluZyB7IHJldHVybiB0aGlzLmRlbGVnYXRlLmdldEN1cnJlbnREaXJlY3RvcnkoKTsgfVxuXG4gIGdldERpcmVjdG9yaWVzPzogKHBhdGg6IHN0cmluZykgPT4gc3RyaW5nW107XG5cbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpO1xuICB9XG5cbiAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpOyB9XG5cbiAgZ2V0TmV3TGluZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXROZXdMaW5lKCk7IH1cblxuICBmaWxlRXhpc3RzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBDb25zaWRlciB0aGUgZmlsZSBhcyBleGlzdGluZyB3aGVuZXZlclxuICAgIC8vICAxKSBpdCByZWFsbHkgZG9lcyBleGlzdCBpbiB0aGUgZGVsZWdhdGUgaG9zdCwgb3JcbiAgICAvLyAgMikgYXQgbGVhc3Qgb25lIG9mIHRoZSBzaGltIGdlbmVyYXRvcnMgcmVjb2duaXplcyBpdFxuICAgIC8vIE5vdGUgdGhhdCB3ZSBjYW4gcGFzcyB0aGUgZmlsZSBuYW1lIGFzIGJyYW5kZWQgYWJzb2x1dGUgZnMgcGF0aCBiZWNhdXNlIFR5cGVTY3JpcHRcbiAgICAvLyBpbnRlcm5hbGx5IG9ubHkgcGFzc2VzIFBPU0lYLWxpa2UgcGF0aHMuXG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZmlsZUV4aXN0cyhmaWxlTmFtZSkgfHxcbiAgICAgICAgdGhpcy5zaGltR2VuZXJhdG9ycy5zb21lKGdlbiA9PiBnZW4ucmVjb2duaXplKEFic29sdXRlRnNQYXRoLmZyb21VbmNoZWNrZWQoZmlsZU5hbWUpKSk7XG4gIH1cblxuICByZWFkRmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLmRlbGVnYXRlLnJlYWRGaWxlKGZpbGVOYW1lKTsgfVxufVxuIl19