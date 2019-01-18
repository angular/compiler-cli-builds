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
        define("@angular/compiler-cli/src/ngtsc/shims/src/host", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
        }
        GeneratedShimsHostWrapper.prototype.getSourceFile = function (fileName, languageVersion, onError, shouldCreateNewSourceFile) {
            var _this = this;
            for (var i = 0; i < this.shimGenerators.length; i++) {
                var generator = this.shimGenerators[i];
                if (generator.recognize(fileName)) {
                    var readFile = function (originalFile) {
                        return _this.delegate.getSourceFile(originalFile, languageVersion, onError, shouldCreateNewSourceFile) ||
                            null;
                    };
                    return generator.generate(fileName, readFile) || undefined;
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
        GeneratedShimsHostWrapper.prototype.getDirectories = function (path) { return this.delegate.getDirectories(path); };
        GeneratedShimsHostWrapper.prototype.getCanonicalFileName = function (fileName) {
            return this.delegate.getCanonicalFileName(fileName);
        };
        GeneratedShimsHostWrapper.prototype.useCaseSensitiveFileNames = function () { return this.delegate.useCaseSensitiveFileNames(); };
        GeneratedShimsHostWrapper.prototype.getNewLine = function () { return this.delegate.getNewLine(); };
        GeneratedShimsHostWrapper.prototype.fileExists = function (fileName) {
            var canonical = this.getCanonicalFileName(fileName);
            // Consider the file as existing whenever 1) it really does exist in the delegate host, or
            // 2) at least one of the shim generators recognizes it.
            return this.delegate.fileExists(fileName) ||
                this.shimGenerators.some(function (gen) { return gen.recognize(canonical); });
        };
        GeneratedShimsHostWrapper.prototype.readFile = function (fileName) { return this.delegate.readFile(fileName); };
        return GeneratedShimsHostWrapper;
    }());
    exports.GeneratedShimsHostWrapper = GeneratedShimsHostWrapper;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFzQkg7O09BRUc7SUFDSDtRQUNFLG1DQUFvQixRQUF5QixFQUFVLGNBQStCO1lBQWxFLGFBQVEsR0FBUixRQUFRLENBQWlCO1lBQVUsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1lBQ3BGLElBQUksUUFBUSxDQUFDLDhCQUE4QixFQUFFO2dCQU0zQyxJQUFJLENBQUMsOEJBQThCLEdBQUcsVUFBQyxLQUFlLEVBQUUsY0FBc0I7b0JBQzFFLE9BQUMsUUFBUSxDQUFDLDhCQUFzRSxDQUM1RSxLQUFLLEVBQUUsY0FBYyxDQUFDO2dCQUQxQixDQUMwQixDQUFDO2FBQ2hDO1lBQ0QsSUFBSSxRQUFRLENBQUMsZUFBZSxLQUFLLFNBQVMsRUFBRTtnQkFDMUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxVQUFDLGFBQXFCLElBQUssT0FBQSxRQUFRLENBQUMsZUFBaUIsQ0FBQyxhQUFhLENBQUMsRUFBekMsQ0FBeUMsQ0FBQzthQUM3RjtRQUNILENBQUM7UUFPRCxpREFBYSxHQUFiLFVBQ0ksUUFBZ0IsRUFBRSxlQUFnQyxFQUNsRCxPQUErQyxFQUMvQyx5QkFBNkM7WUFIakQsaUJBa0JDO1lBZEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNuRCxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ2pDLElBQU0sUUFBUSxHQUFHLFVBQUMsWUFBb0I7d0JBQ3BDLE9BQU8sS0FBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQ3ZCLFlBQVksRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixDQUFDOzRCQUN6RSxJQUFJLENBQUM7b0JBQ1gsQ0FBQyxDQUFDO29CQUVGLE9BQU8sU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksU0FBUyxDQUFDO2lCQUM1RDthQUNGO1lBQ0QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FDOUIsUUFBUSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBRUQseURBQXFCLEdBQXJCLFVBQXNCLE9BQTJCO1lBQy9DLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsNkNBQVMsR0FBVCxVQUNJLFFBQWdCLEVBQUUsSUFBWSxFQUFFLGtCQUEyQixFQUMzRCxPQUE4QyxFQUM5QyxXQUF5QztZQUMzQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFFRCx1REFBbUIsR0FBbkIsY0FBZ0MsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdFLGtEQUFjLEdBQWQsVUFBZSxJQUFZLElBQWMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckYsd0RBQW9CLEdBQXBCLFVBQXFCLFFBQWdCO1lBQ25DLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsNkRBQXlCLEdBQXpCLGNBQXVDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUxRiw4Q0FBVSxHQUFWLGNBQXVCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFM0QsOENBQVUsR0FBVixVQUFXLFFBQWdCO1lBQ3pCLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN0RCwwRkFBMEY7WUFDMUYsd0RBQXdEO1lBQ3hELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO2dCQUNyQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEdBQUcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQXhCLENBQXdCLENBQUMsQ0FBQztRQUNoRSxDQUFDO1FBRUQsNENBQVEsR0FBUixVQUFTLFFBQWdCLElBQXNCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNGLGdDQUFDO0lBQUQsQ0FBQyxBQTFFRCxJQTBFQztJQTFFWSw4REFBeUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNoaW1HZW5lcmF0b3Ige1xuICAvKipcbiAgICogUmV0dXJucyBgdHJ1ZWAgaWYgdGhpcyBnZW5lcmF0b3IgaXMgaW50ZW5kZWQgdG8gaGFuZGxlIHRoZSBnaXZlbiBmaWxlLlxuICAgKi9cbiAgcmVjb2duaXplKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBhIHNoaW0ncyBgdHMuU291cmNlRmlsZWAgZm9yIHRoZSBnaXZlbiBvcmlnaW5hbCBmaWxlLlxuICAgKlxuICAgKiBgcmVhZEZpbGVgIGlzIGEgZnVuY3Rpb24gd2hpY2ggYWxsb3dzIHRoZSBnZW5lcmF0b3IgdG8gbG9vayB1cCB0aGUgY29udGVudHMgb2YgZXhpc3Rpbmcgc291cmNlXG4gICAqIGZpbGVzLiBJdCByZXR1cm5zIG51bGwgaWYgdGhlIHJlcXVlc3RlZCBmaWxlIGRvZXNuJ3QgZXhpc3QuXG4gICAqXG4gICAqIElmIGBnZW5lcmF0ZWAgcmV0dXJucyBudWxsLCB0aGVuIHRoZSBzaGltIGdlbmVyYXRvciBkZWNsaW5lcyB0byBnZW5lcmF0ZSB0aGUgZmlsZSBhZnRlciBhbGwuXG4gICAqL1xuICBnZW5lcmF0ZShnZW5GaWxlTmFtZTogc3RyaW5nLCByZWFkRmlsZTogKGZpbGVOYW1lOiBzdHJpbmcpID0+IHRzLlNvdXJjZUZpbGUgfCBudWxsKTogdHMuU291cmNlRmlsZVxuICAgICAgfG51bGw7XG59XG5cbi8qKlxuICogQSB3cmFwcGVyIGFyb3VuZCBhIGB0cy5Db21waWxlckhvc3RgIHdoaWNoIHN1cHBvcnRzIGdlbmVyYXRlZCBmaWxlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIEdlbmVyYXRlZFNoaW1zSG9zdFdyYXBwZXIgaW1wbGVtZW50cyB0cy5Db21waWxlckhvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGRlbGVnYXRlOiB0cy5Db21waWxlckhvc3QsIHByaXZhdGUgc2hpbUdlbmVyYXRvcnM6IFNoaW1HZW5lcmF0b3JbXSkge1xuICAgIGlmIChkZWxlZ2F0ZS5yZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMpIHtcbiAgICAgIC8vIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBUeXBlU2NyaXB0IDIuOSBhbmQgb2xkZXIgc2luY2UgcmV0dXJuXG4gICAgICAvLyB0eXBlIGhhcyBjaGFuZ2VkIGZyb20gKHRzLlJlc29sdmVkVHlwZVJlZmVyZW5jZURpcmVjdGl2ZSB8IHVuZGVmaW5lZClbXVxuICAgICAgLy8gdG8gdHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlW10gaW4gVHlwZXNjcmlwdCAzLjBcbiAgICAgIHR5cGUgdHMzUmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzID0gKG5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZykgPT5cbiAgICAgICAgICB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXTtcbiAgICAgIHRoaXMucmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzID0gKG5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZykgPT5cbiAgICAgICAgICAoZGVsZWdhdGUucmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzIGFzIHRzM1Jlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcykgIShcbiAgICAgICAgICAgICAgbmFtZXMsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICB9XG4gICAgaWYgKGRlbGVnYXRlLmRpcmVjdG9yeUV4aXN0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmRpcmVjdG9yeUV4aXN0cyA9IChkaXJlY3RvcnlOYW1lOiBzdHJpbmcpID0+IGRlbGVnYXRlLmRpcmVjdG9yeUV4aXN0cyAhKGRpcmVjdG9yeU5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcz86XG4gICAgICAobmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKSA9PiB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXTtcblxuICBkaXJlY3RvcnlFeGlzdHM/OiAoZGlyZWN0b3J5TmFtZTogc3RyaW5nKSA9PiBib29sZWFuO1xuXG4gIGdldFNvdXJjZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCxcbiAgICAgIG9uRXJyb3I/OiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkLFxuICAgICAgc2hvdWxkQ3JlYXRlTmV3U291cmNlRmlsZT86IGJvb2xlYW58dW5kZWZpbmVkKTogdHMuU291cmNlRmlsZXx1bmRlZmluZWQge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zaGltR2VuZXJhdG9ycy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgZ2VuZXJhdG9yID0gdGhpcy5zaGltR2VuZXJhdG9yc1tpXTtcbiAgICAgIGlmIChnZW5lcmF0b3IucmVjb2duaXplKGZpbGVOYW1lKSkge1xuICAgICAgICBjb25zdCByZWFkRmlsZSA9IChvcmlnaW5hbEZpbGU6IHN0cmluZykgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldFNvdXJjZUZpbGUoXG4gICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbEZpbGUsIGxhbmd1YWdlVmVyc2lvbiwgb25FcnJvciwgc2hvdWxkQ3JlYXRlTmV3U291cmNlRmlsZSkgfHxcbiAgICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gZ2VuZXJhdG9yLmdlbmVyYXRlKGZpbGVOYW1lLCByZWFkRmlsZSkgfHwgdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXRTb3VyY2VGaWxlKFxuICAgICAgICBmaWxlTmFtZSwgbGFuZ3VhZ2VWZXJzaW9uLCBvbkVycm9yLCBzaG91bGRDcmVhdGVOZXdTb3VyY2VGaWxlKTtcbiAgfVxuXG4gIGdldERlZmF1bHRMaWJGaWxlTmFtZShvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldERlZmF1bHRMaWJGaWxlTmFtZShvcHRpb25zKTtcbiAgfVxuXG4gIHdyaXRlRmlsZShcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIGRhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgb25FcnJvcjogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCxcbiAgICAgIHNvdXJjZUZpbGVzOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+KTogdm9pZCB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUud3JpdGVGaWxlKGZpbGVOYW1lLCBkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKTtcbiAgfVxuXG4gIGdldEN1cnJlbnREaXJlY3RvcnkoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0Q3VycmVudERpcmVjdG9yeSgpOyB9XG5cbiAgZ2V0RGlyZWN0b3JpZXMocGF0aDogc3RyaW5nKTogc3RyaW5nW10geyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXREaXJlY3RvcmllcyhwYXRoKTsgfVxuXG4gIGdldENhbm9uaWNhbEZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldENhbm9uaWNhbEZpbGVOYW1lKGZpbGVOYW1lKTtcbiAgfVxuXG4gIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmRlbGVnYXRlLnVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTsgfVxuXG4gIGdldE5ld0xpbmUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0TmV3TGluZSgpOyB9XG5cbiAgZmlsZUV4aXN0cyhmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgY2Fub25pY2FsID0gdGhpcy5nZXRDYW5vbmljYWxGaWxlTmFtZShmaWxlTmFtZSk7XG4gICAgLy8gQ29uc2lkZXIgdGhlIGZpbGUgYXMgZXhpc3Rpbmcgd2hlbmV2ZXIgMSkgaXQgcmVhbGx5IGRvZXMgZXhpc3QgaW4gdGhlIGRlbGVnYXRlIGhvc3QsIG9yXG4gICAgLy8gMikgYXQgbGVhc3Qgb25lIG9mIHRoZSBzaGltIGdlbmVyYXRvcnMgcmVjb2duaXplcyBpdC5cbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5maWxlRXhpc3RzKGZpbGVOYW1lKSB8fFxuICAgICAgICB0aGlzLnNoaW1HZW5lcmF0b3JzLnNvbWUoZ2VuID0+IGdlbi5yZWNvZ25pemUoY2Fub25pY2FsKSk7XG4gIH1cblxuICByZWFkRmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLmRlbGVnYXRlLnJlYWRGaWxlKGZpbGVOYW1lKTsgfVxufVxuIl19