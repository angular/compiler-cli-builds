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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFvQkg7O09BRUc7SUFDSDtRQUNFLG1DQUFvQixRQUF5QixFQUFVLGNBQStCO1lBQWxFLGFBQVEsR0FBUixRQUFRLENBQWlCO1lBQVUsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1lBQ3BGLElBQUksUUFBUSxDQUFDLDhCQUE4QixFQUFFO2dCQU0zQyxJQUFJLENBQUMsOEJBQThCLEdBQUcsVUFBQyxLQUFlLEVBQUUsY0FBc0I7b0JBQzFFLE9BQUMsUUFBUSxDQUFDLDhCQUFzRSxDQUM1RSxLQUFLLEVBQUUsY0FBYyxDQUFDO2dCQUQxQixDQUMwQixDQUFDO2FBQ2hDO1lBQ0QsSUFBSSxRQUFRLENBQUMsZUFBZSxLQUFLLFNBQVMsRUFBRTtnQkFDMUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxVQUFDLGFBQXFCLElBQUssT0FBQSxRQUFRLENBQUMsZUFBaUIsQ0FBQyxhQUFhLENBQUMsRUFBekMsQ0FBeUMsQ0FBQzthQUM3RjtRQUNILENBQUM7UUFPRCxpREFBYSxHQUFiLFVBQ0ksUUFBZ0IsRUFBRSxlQUFnQyxFQUNsRCxPQUErQyxFQUMvQyx5QkFBNkM7WUFDL0MsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3RELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDbkQsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekMsSUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNsRSxJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUU7b0JBQ3pCLDBGQUEwRjtvQkFDMUYsNEZBQTRGO29CQUM1RixJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FDOUMsWUFBWSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQztvQkFDdkUsSUFBSSxjQUFjLEtBQUssU0FBUyxFQUFFO3dCQUNoQyw4RUFBOEU7d0JBQzlFLE9BQU8sU0FBUyxDQUFDO3FCQUNsQjtvQkFDRCxPQUFPLFNBQVMsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2lCQUNyRDthQUNGO1lBQ0QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FDOUIsUUFBUSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBRUQseURBQXFCLEdBQXJCLFVBQXNCLE9BQTJCO1lBQy9DLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsNkNBQVMsR0FBVCxVQUNJLFFBQWdCLEVBQUUsSUFBWSxFQUFFLGtCQUEyQixFQUMzRCxPQUE4QyxFQUM5QyxXQUF5QztZQUMzQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFFRCx1REFBbUIsR0FBbkIsY0FBZ0MsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdFLGtEQUFjLEdBQWQsVUFBZSxJQUFZLElBQWMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckYsd0RBQW9CLEdBQXBCLFVBQXFCLFFBQWdCO1lBQ25DLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsNkRBQXlCLEdBQXpCLGNBQXVDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUxRiw4Q0FBVSxHQUFWLGNBQXVCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFM0QsOENBQVUsR0FBVixVQUFXLFFBQWdCO1lBQ3pCLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN0RCwwRkFBMEY7WUFDMUYsd0RBQXdEO1lBQ3hELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO2dCQUNyQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLEVBQS9DLENBQStDLENBQUMsQ0FBQztRQUN2RixDQUFDO1FBRUQsNENBQVEsR0FBUixVQUFTLFFBQWdCLElBQXNCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNGLGdDQUFDO0lBQUQsQ0FBQyxBQTlFRCxJQThFQztJQTlFWSw4REFBeUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuZXhwb3J0IGludGVyZmFjZSBTaGltR2VuZXJhdG9yIHtcbiAgLyoqXG4gICAqIEdldCB0aGUgb3JpZ2luYWwgc291cmNlIGZpbGUgZm9yIHRoZSBnaXZlbiBzaGltIHBhdGgsIHRoZSBjb250ZW50cyBvZiB3aGljaCBkZXRlcm1pbmUgdGhlXG4gICAqIGNvbnRlbnRzIG9mIHRoZSBzaGltIGZpbGUuXG4gICAqXG4gICAqIElmIHRoaXMgcmV0dXJucyBgbnVsbGAgdGhlbiB0aGUgZ2l2ZW4gZmlsZSB3YXMgbm90IGEgc2hpbSBmaWxlIGhhbmRsZWQgYnkgdGhpcyBnZW5lcmF0b3IuXG4gICAqL1xuICBnZXRPcmlnaW5hbFNvdXJjZU9mU2hpbShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nfG51bGw7XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGEgc2hpbSdzIGB0cy5Tb3VyY2VGaWxlYCBmb3IgdGhlIGdpdmVuIG9yaWdpbmFsIGZpbGUuXG4gICAqL1xuICBnZW5lcmF0ZShvcmlnaW5hbDogdHMuU291cmNlRmlsZSwgZ2VuRmlsZU5hbWU6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGU7XG59XG5cbi8qKlxuICogQSB3cmFwcGVyIGFyb3VuZCBhIGB0cy5Db21waWxlckhvc3RgIHdoaWNoIHN1cHBvcnRzIGdlbmVyYXRlZCBmaWxlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIEdlbmVyYXRlZFNoaW1zSG9zdFdyYXBwZXIgaW1wbGVtZW50cyB0cy5Db21waWxlckhvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGRlbGVnYXRlOiB0cy5Db21waWxlckhvc3QsIHByaXZhdGUgc2hpbUdlbmVyYXRvcnM6IFNoaW1HZW5lcmF0b3JbXSkge1xuICAgIGlmIChkZWxlZ2F0ZS5yZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMpIHtcbiAgICAgIC8vIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBUeXBlU2NyaXB0IDIuOSBhbmQgb2xkZXIgc2luY2UgcmV0dXJuXG4gICAgICAvLyB0eXBlIGhhcyBjaGFuZ2VkIGZyb20gKHRzLlJlc29sdmVkVHlwZVJlZmVyZW5jZURpcmVjdGl2ZSB8IHVuZGVmaW5lZClbXVxuICAgICAgLy8gdG8gdHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlW10gaW4gVHlwZXNjcmlwdCAzLjBcbiAgICAgIHR5cGUgdHMzUmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzID0gKG5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZykgPT5cbiAgICAgICAgICB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXTtcbiAgICAgIHRoaXMucmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzID0gKG5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZykgPT5cbiAgICAgICAgICAoZGVsZWdhdGUucmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzIGFzIHRzM1Jlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcykgIShcbiAgICAgICAgICAgICAgbmFtZXMsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICB9XG4gICAgaWYgKGRlbGVnYXRlLmRpcmVjdG9yeUV4aXN0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmRpcmVjdG9yeUV4aXN0cyA9IChkaXJlY3RvcnlOYW1lOiBzdHJpbmcpID0+IGRlbGVnYXRlLmRpcmVjdG9yeUV4aXN0cyAhKGRpcmVjdG9yeU5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcz86XG4gICAgICAobmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKSA9PiB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXTtcblxuICBkaXJlY3RvcnlFeGlzdHM/OiAoZGlyZWN0b3J5TmFtZTogc3RyaW5nKSA9PiBib29sZWFuO1xuXG4gIGdldFNvdXJjZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCxcbiAgICAgIG9uRXJyb3I/OiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkLFxuICAgICAgc2hvdWxkQ3JlYXRlTmV3U291cmNlRmlsZT86IGJvb2xlYW58dW5kZWZpbmVkKTogdHMuU291cmNlRmlsZXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNhbm9uaWNhbCA9IHRoaXMuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zaGltR2VuZXJhdG9ycy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgZ2VuZXJhdG9yID0gdGhpcy5zaGltR2VuZXJhdG9yc1tpXTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsRmlsZSA9IGdlbmVyYXRvci5nZXRPcmlnaW5hbFNvdXJjZU9mU2hpbShjYW5vbmljYWwpO1xuICAgICAgaWYgKG9yaWdpbmFsRmlsZSAhPT0gbnVsbCkge1xuICAgICAgICAvLyBUaGlzIHNoaW0gZ2VuZXJhdG9yIGhhcyByZWNvZ25pemVkIHRoZSBmaWxlbmFtZSBiZWluZyByZXF1ZXN0ZWQsIGFuZCBpcyBub3cgcmVzcG9uc2libGVcbiAgICAgICAgLy8gZm9yIGdlbmVyYXRpbmcgaXRzIGNvbnRlbnRzLCBiYXNlZCBvbiB0aGUgY29udGVudHMgb2YgdGhlIG9yaWdpbmFsIGZpbGUgaXQgaGFzIHJlcXVlc3RlZC5cbiAgICAgICAgY29uc3Qgb3JpZ2luYWxTb3VyY2UgPSB0aGlzLmRlbGVnYXRlLmdldFNvdXJjZUZpbGUoXG4gICAgICAgICAgICBvcmlnaW5hbEZpbGUsIGxhbmd1YWdlVmVyc2lvbiwgb25FcnJvciwgc2hvdWxkQ3JlYXRlTmV3U291cmNlRmlsZSk7XG4gICAgICAgIGlmIChvcmlnaW5hbFNvdXJjZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gVGhlIG9yaWdpbmFsIHJlcXVlc3RlZCBmaWxlIGRvZXNuJ3QgZXhpc3QsIHNvIHRoZSBzaGltIGNhbm5vdCBleGlzdCBlaXRoZXIuXG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZ2VuZXJhdG9yLmdlbmVyYXRlKG9yaWdpbmFsU291cmNlLCBmaWxlTmFtZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldFNvdXJjZUZpbGUoXG4gICAgICAgIGZpbGVOYW1lLCBsYW5ndWFnZVZlcnNpb24sIG9uRXJyb3IsIHNob3VsZENyZWF0ZU5ld1NvdXJjZUZpbGUpO1xuICB9XG5cbiAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lKG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0RGVmYXVsdExpYkZpbGVOYW1lKG9wdGlvbnMpO1xuICB9XG5cbiAgd3JpdGVGaWxlKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgZGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICBvbkVycm9yOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkLFxuICAgICAgc291cmNlRmlsZXM6IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT4pOiB2b2lkIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS53cml0ZUZpbGUoZmlsZU5hbWUsIGRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMpO1xuICB9XG5cbiAgZ2V0Q3VycmVudERpcmVjdG9yeSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXRDdXJyZW50RGlyZWN0b3J5KCk7IH1cblxuICBnZXREaXJlY3RvcmllcyhwYXRoOiBzdHJpbmcpOiBzdHJpbmdbXSB7IHJldHVybiB0aGlzLmRlbGVnYXRlLmdldERpcmVjdG9yaWVzKHBhdGgpOyB9XG5cbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpO1xuICB9XG5cbiAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpOyB9XG5cbiAgZ2V0TmV3TGluZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXROZXdMaW5lKCk7IH1cblxuICBmaWxlRXhpc3RzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBjYW5vbmljYWwgPSB0aGlzLmdldENhbm9uaWNhbEZpbGVOYW1lKGZpbGVOYW1lKTtcbiAgICAvLyBDb25zaWRlciB0aGUgZmlsZSBhcyBleGlzdGluZyB3aGVuZXZlciAxKSBpdCByZWFsbHkgZG9lcyBleGlzdCBpbiB0aGUgZGVsZWdhdGUgaG9zdCwgb3JcbiAgICAvLyAyKSBhdCBsZWFzdCBvbmUgb2YgdGhlIHNoaW0gZ2VuZXJhdG9ycyByZWNvZ25pemVzIGl0LlxuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmZpbGVFeGlzdHMoZmlsZU5hbWUpIHx8XG4gICAgICAgIHRoaXMuc2hpbUdlbmVyYXRvcnMuc29tZShnZW4gPT4gZ2VuLmdldE9yaWdpbmFsU291cmNlT2ZTaGltKGNhbm9uaWNhbCkgIT09IG51bGwpO1xuICB9XG5cbiAgcmVhZEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZ3x1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5yZWFkRmlsZShmaWxlTmFtZSk7IH1cbn1cbiJdfQ==