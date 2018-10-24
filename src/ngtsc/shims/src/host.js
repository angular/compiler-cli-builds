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
        }
        GeneratedShimsHostWrapper.prototype.getSourceFile = function (fileName, languageVersion, onError, shouldCreateNewSourceFile) {
            var canonical = this.getCanonicalFileName(fileName);
            for (var i = 0; i < this.shimGenerators.length; i++) {
                var generator = this.shimGenerators[i];
                var originalFile = generator.getOriginalSourceOfShim(canonical);
                if (originalFile !== null) {
                    // This shim generator has recognized the filename being requested, and is now responsible
                    // for generating its contents, based on the contents of the original file it has requested.
                    var originalSource = this.delegate.getSourceFile(originalFile, languageVersion, onError, shouldCreateNewSourceFile);
                    if (originalSource === undefined) {
                        // The original requested file doesn't exist, so the shim cannot exist either.
                        return undefined;
                    }
                    return generator.generate(originalSource, fileName);
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
                this.shimGenerators.some(function (gen) { return gen.getOriginalSourceOfShim(canonical) !== null; });
        };
        GeneratedShimsHostWrapper.prototype.readFile = function (fileName) { return this.delegate.readFile(fileName); };
        return GeneratedShimsHostWrapper;
    }());
    exports.GeneratedShimsHostWrapper = GeneratedShimsHostWrapper;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFvQkg7O09BRUc7SUFDSDtRQUNFLG1DQUFvQixRQUF5QixFQUFVLGNBQStCO1lBQWxFLGFBQVEsR0FBUixRQUFRLENBQWlCO1lBQVUsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1lBQ3BGLElBQUksUUFBUSxDQUFDLDhCQUE4QixFQUFFO2dCQU0zQyxJQUFJLENBQUMsOEJBQThCLEdBQUcsVUFBQyxLQUFlLEVBQUUsY0FBc0I7b0JBQzFFLE9BQUMsUUFBUSxDQUFDLDhCQUFzRSxDQUM1RSxLQUFLLEVBQUUsY0FBYyxDQUFDO2dCQUQxQixDQUMwQixDQUFDO2FBQ2hDO1FBQ0gsQ0FBQztRQUtELGlEQUFhLEdBQWIsVUFDSSxRQUFnQixFQUFFLGVBQWdDLEVBQ2xELE9BQStDLEVBQy9DLHlCQUE2QztZQUMvQyxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNuRCxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN6QyxJQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsdUJBQXVCLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ2xFLElBQUksWUFBWSxLQUFLLElBQUksRUFBRTtvQkFDekIsMEZBQTBGO29CQUMxRiw0RkFBNEY7b0JBQzVGLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUM5QyxZQUFZLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO29CQUN2RSxJQUFJLGNBQWMsS0FBSyxTQUFTLEVBQUU7d0JBQ2hDLDhFQUE4RTt3QkFDOUUsT0FBTyxTQUFTLENBQUM7cUJBQ2xCO29CQUNELE9BQU8sU0FBUyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLENBQUM7aUJBQ3JEO2FBQ0Y7WUFDRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUM5QixRQUFRLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFFRCx5REFBcUIsR0FBckIsVUFBc0IsT0FBMkI7WUFDL0MsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFFRCw2Q0FBUyxHQUFULFVBQ0ksUUFBZ0IsRUFBRSxJQUFZLEVBQUUsa0JBQTJCLEVBQzNELE9BQThDLEVBQzlDLFdBQXlDO1lBQzNDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDM0YsQ0FBQztRQUVELHVEQUFtQixHQUFuQixjQUFnQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0Usa0RBQWMsR0FBZCxVQUFlLElBQVksSUFBYyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRix3REFBb0IsR0FBcEIsVUFBcUIsUUFBZ0I7WUFDbkMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFFRCw2REFBeUIsR0FBekIsY0FBdUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTFGLDhDQUFVLEdBQVYsY0FBdUIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzRCw4Q0FBVSxHQUFWLFVBQVcsUUFBZ0I7WUFDekIsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3RELDBGQUEwRjtZQUMxRix3REFBd0Q7WUFDeEQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxLQUFLLElBQUksRUFBL0MsQ0FBK0MsQ0FBQyxDQUFDO1FBQ3ZGLENBQUM7UUFFRCw0Q0FBUSxHQUFSLFVBQVMsUUFBZ0IsSUFBc0IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0YsZ0NBQUM7SUFBRCxDQUFDLEFBekVELElBeUVDO0lBekVZLDhEQUF5QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNoaW1HZW5lcmF0b3Ige1xuICAvKipcbiAgICogR2V0IHRoZSBvcmlnaW5hbCBzb3VyY2UgZmlsZSBmb3IgdGhlIGdpdmVuIHNoaW0gcGF0aCwgdGhlIGNvbnRlbnRzIG9mIHdoaWNoIGRldGVybWluZSB0aGVcbiAgICogY29udGVudHMgb2YgdGhlIHNoaW0gZmlsZS5cbiAgICpcbiAgICogSWYgdGhpcyByZXR1cm5zIGBudWxsYCB0aGVuIHRoZSBnaXZlbiBmaWxlIHdhcyBub3QgYSBzaGltIGZpbGUgaGFuZGxlZCBieSB0aGlzIGdlbmVyYXRvci5cbiAgICovXG4gIGdldE9yaWdpbmFsU291cmNlT2ZTaGltKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmd8bnVsbDtcblxuICAvKipcbiAgICogR2VuZXJhdGUgYSBzaGltJ3MgYHRzLlNvdXJjZUZpbGVgIGZvciB0aGUgZ2l2ZW4gb3JpZ2luYWwgZmlsZS5cbiAgICovXG4gIGdlbmVyYXRlKG9yaWdpbmFsOiB0cy5Tb3VyY2VGaWxlLCBnZW5GaWxlTmFtZTogc3RyaW5nKTogdHMuU291cmNlRmlsZTtcbn1cblxuLyoqXG4gKiBBIHdyYXBwZXIgYXJvdW5kIGEgYHRzLkNvbXBpbGVySG9zdGAgd2hpY2ggc3VwcG9ydHMgZ2VuZXJhdGVkIGZpbGVzLlxuICovXG5leHBvcnQgY2xhc3MgR2VuZXJhdGVkU2hpbXNIb3N0V3JhcHBlciBpbXBsZW1lbnRzIHRzLkNvbXBpbGVySG9zdCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZGVsZWdhdGU6IHRzLkNvbXBpbGVySG9zdCwgcHJpdmF0ZSBzaGltR2VuZXJhdG9yczogU2hpbUdlbmVyYXRvcltdKSB7XG4gICAgaWYgKGRlbGVnYXRlLnJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcykge1xuICAgICAgLy8gQmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aXRoIFR5cGVTY3JpcHQgMi45IGFuZCBvbGRlciBzaW5jZSByZXR1cm5cbiAgICAgIC8vIHR5cGUgaGFzIGNoYW5nZWQgZnJvbSAodHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlIHwgdW5kZWZpbmVkKVtdXG4gICAgICAvLyB0byB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXSBpbiBUeXBlc2NyaXB0IDMuMFxuICAgICAgdHlwZSB0czNSZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMgPSAobmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKSA9PlxuICAgICAgICAgIHRzLlJlc29sdmVkVHlwZVJlZmVyZW5jZURpcmVjdGl2ZVtdO1xuICAgICAgdGhpcy5yZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMgPSAobmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKSA9PlxuICAgICAgICAgIChkZWxlZ2F0ZS5yZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMgYXMgdHMzUmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzKSAhKFxuICAgICAgICAgICAgICBuYW1lcywgY29udGFpbmluZ0ZpbGUpO1xuICAgIH1cbiAgfVxuXG4gIHJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcz86XG4gICAgICAobmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKSA9PiB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXTtcblxuICBnZXRTb3VyY2VGaWxlKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQsXG4gICAgICBvbkVycm9yPzogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCxcbiAgICAgIHNob3VsZENyZWF0ZU5ld1NvdXJjZUZpbGU/OiBib29sZWFufHVuZGVmaW5lZCk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjYW5vbmljYWwgPSB0aGlzLmdldENhbm9uaWNhbEZpbGVOYW1lKGZpbGVOYW1lKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2hpbUdlbmVyYXRvcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGdlbmVyYXRvciA9IHRoaXMuc2hpbUdlbmVyYXRvcnNbaV07XG4gICAgICBjb25zdCBvcmlnaW5hbEZpbGUgPSBnZW5lcmF0b3IuZ2V0T3JpZ2luYWxTb3VyY2VPZlNoaW0oY2Fub25pY2FsKTtcbiAgICAgIGlmIChvcmlnaW5hbEZpbGUgIT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhpcyBzaGltIGdlbmVyYXRvciBoYXMgcmVjb2duaXplZCB0aGUgZmlsZW5hbWUgYmVpbmcgcmVxdWVzdGVkLCBhbmQgaXMgbm93IHJlc3BvbnNpYmxlXG4gICAgICAgIC8vIGZvciBnZW5lcmF0aW5nIGl0cyBjb250ZW50cywgYmFzZWQgb24gdGhlIGNvbnRlbnRzIG9mIHRoZSBvcmlnaW5hbCBmaWxlIGl0IGhhcyByZXF1ZXN0ZWQuXG4gICAgICAgIGNvbnN0IG9yaWdpbmFsU291cmNlID0gdGhpcy5kZWxlZ2F0ZS5nZXRTb3VyY2VGaWxlKFxuICAgICAgICAgICAgb3JpZ2luYWxGaWxlLCBsYW5ndWFnZVZlcnNpb24sIG9uRXJyb3IsIHNob3VsZENyZWF0ZU5ld1NvdXJjZUZpbGUpO1xuICAgICAgICBpZiAob3JpZ2luYWxTb3VyY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIFRoZSBvcmlnaW5hbCByZXF1ZXN0ZWQgZmlsZSBkb2Vzbid0IGV4aXN0LCBzbyB0aGUgc2hpbSBjYW5ub3QgZXhpc3QgZWl0aGVyLlxuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGdlbmVyYXRvci5nZW5lcmF0ZShvcmlnaW5hbFNvdXJjZSwgZmlsZU5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXRTb3VyY2VGaWxlKFxuICAgICAgICBmaWxlTmFtZSwgbGFuZ3VhZ2VWZXJzaW9uLCBvbkVycm9yLCBzaG91bGRDcmVhdGVOZXdTb3VyY2VGaWxlKTtcbiAgfVxuXG4gIGdldERlZmF1bHRMaWJGaWxlTmFtZShvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldERlZmF1bHRMaWJGaWxlTmFtZShvcHRpb25zKTtcbiAgfVxuXG4gIHdyaXRlRmlsZShcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIGRhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgb25FcnJvcjogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCxcbiAgICAgIHNvdXJjZUZpbGVzOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+KTogdm9pZCB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUud3JpdGVGaWxlKGZpbGVOYW1lLCBkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKTtcbiAgfVxuXG4gIGdldEN1cnJlbnREaXJlY3RvcnkoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0Q3VycmVudERpcmVjdG9yeSgpOyB9XG5cbiAgZ2V0RGlyZWN0b3JpZXMocGF0aDogc3RyaW5nKTogc3RyaW5nW10geyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXREaXJlY3RvcmllcyhwYXRoKTsgfVxuXG4gIGdldENhbm9uaWNhbEZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldENhbm9uaWNhbEZpbGVOYW1lKGZpbGVOYW1lKTtcbiAgfVxuXG4gIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmRlbGVnYXRlLnVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTsgfVxuXG4gIGdldE5ld0xpbmUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0TmV3TGluZSgpOyB9XG5cbiAgZmlsZUV4aXN0cyhmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgY2Fub25pY2FsID0gdGhpcy5nZXRDYW5vbmljYWxGaWxlTmFtZShmaWxlTmFtZSk7XG4gICAgLy8gQ29uc2lkZXIgdGhlIGZpbGUgYXMgZXhpc3Rpbmcgd2hlbmV2ZXIgMSkgaXQgcmVhbGx5IGRvZXMgZXhpc3QgaW4gdGhlIGRlbGVnYXRlIGhvc3QsIG9yXG4gICAgLy8gMikgYXQgbGVhc3Qgb25lIG9mIHRoZSBzaGltIGdlbmVyYXRvcnMgcmVjb2duaXplcyBpdC5cbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5maWxlRXhpc3RzKGZpbGVOYW1lKSB8fFxuICAgICAgICB0aGlzLnNoaW1HZW5lcmF0b3JzLnNvbWUoZ2VuID0+IGdlbi5nZXRPcmlnaW5hbFNvdXJjZU9mU2hpbShjYW5vbmljYWwpICE9PSBudWxsKTtcbiAgfVxuXG4gIHJlYWRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmd8dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUucmVhZEZpbGUoZmlsZU5hbWUpOyB9XG59XG4iXX0=