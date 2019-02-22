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
            // Consider the file as existing whenever 1) it really does exist in the delegate host, or
            // 2) at least one of the shim generators recognizes it.
            return this.delegate.fileExists(fileName) ||
                this.shimGenerators.some(function (gen) { return gen.recognize(fileName); });
        };
        GeneratedShimsHostWrapper.prototype.readFile = function (fileName) { return this.delegate.readFile(fileName); };
        return GeneratedShimsHostWrapper;
    }());
    exports.GeneratedShimsHostWrapper = GeneratedShimsHostWrapper;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFzQkg7O09BRUc7SUFDSDtRQUNFLG1DQUFvQixRQUF5QixFQUFVLGNBQStCO1lBQWxFLGFBQVEsR0FBUixRQUFRLENBQWlCO1lBQVUsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1lBQ3BGLElBQUksUUFBUSxDQUFDLDhCQUE4QixFQUFFO2dCQU0zQyxJQUFJLENBQUMsOEJBQThCLEdBQUcsVUFBQyxLQUFlLEVBQUUsY0FBc0I7b0JBQzFFLE9BQUMsUUFBUSxDQUFDLDhCQUFzRSxDQUM1RSxLQUFLLEVBQUUsY0FBYyxDQUFDO2dCQUQxQixDQUMwQixDQUFDO2FBQ2hDO1lBQ0QsSUFBSSxRQUFRLENBQUMsZUFBZSxLQUFLLFNBQVMsRUFBRTtnQkFDMUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxVQUFDLGFBQXFCLElBQUssT0FBQSxRQUFRLENBQUMsZUFBaUIsQ0FBQyxhQUFhLENBQUMsRUFBekMsQ0FBeUMsQ0FBQzthQUM3RjtRQUNILENBQUM7UUFPRCxpREFBYSxHQUFiLFVBQ0ksUUFBZ0IsRUFBRSxlQUFnQyxFQUNsRCxPQUErQyxFQUMvQyx5QkFBNkM7WUFIakQsaUJBa0JDO1lBZEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNuRCxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ2pDLElBQU0sUUFBUSxHQUFHLFVBQUMsWUFBb0I7d0JBQ3BDLE9BQU8sS0FBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQ3ZCLFlBQVksRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixDQUFDOzRCQUN6RSxJQUFJLENBQUM7b0JBQ1gsQ0FBQyxDQUFDO29CQUVGLE9BQU8sU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksU0FBUyxDQUFDO2lCQUM1RDthQUNGO1lBQ0QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FDOUIsUUFBUSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBRUQseURBQXFCLEdBQXJCLFVBQXNCLE9BQTJCO1lBQy9DLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsNkNBQVMsR0FBVCxVQUNJLFFBQWdCLEVBQUUsSUFBWSxFQUFFLGtCQUEyQixFQUMzRCxPQUE4QyxFQUM5QyxXQUF5QztZQUMzQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFFRCx1REFBbUIsR0FBbkIsY0FBZ0MsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdFLGtEQUFjLEdBQWQsVUFBZSxJQUFZLElBQWMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckYsd0RBQW9CLEdBQXBCLFVBQXFCLFFBQWdCO1lBQ25DLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsNkRBQXlCLEdBQXpCLGNBQXVDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUxRiw4Q0FBVSxHQUFWLGNBQXVCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFM0QsOENBQVUsR0FBVixVQUFXLFFBQWdCO1lBQ3pCLDBGQUEwRjtZQUMxRix3REFBd0Q7WUFDeEQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBdkIsQ0FBdUIsQ0FBQyxDQUFDO1FBQy9ELENBQUM7UUFFRCw0Q0FBUSxHQUFSLFVBQVMsUUFBZ0IsSUFBc0IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0YsZ0NBQUM7SUFBRCxDQUFDLEFBekVELElBeUVDO0lBekVZLDhEQUF5QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2hpbUdlbmVyYXRvciB7XG4gIC8qKlxuICAgKiBSZXR1cm5zIGB0cnVlYCBpZiB0aGlzIGdlbmVyYXRvciBpcyBpbnRlbmRlZCB0byBoYW5kbGUgdGhlIGdpdmVuIGZpbGUuXG4gICAqL1xuICByZWNvZ25pemUoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGEgc2hpbSdzIGB0cy5Tb3VyY2VGaWxlYCBmb3IgdGhlIGdpdmVuIG9yaWdpbmFsIGZpbGUuXG4gICAqXG4gICAqIGByZWFkRmlsZWAgaXMgYSBmdW5jdGlvbiB3aGljaCBhbGxvd3MgdGhlIGdlbmVyYXRvciB0byBsb29rIHVwIHRoZSBjb250ZW50cyBvZiBleGlzdGluZyBzb3VyY2VcbiAgICogZmlsZXMuIEl0IHJldHVybnMgbnVsbCBpZiB0aGUgcmVxdWVzdGVkIGZpbGUgZG9lc24ndCBleGlzdC5cbiAgICpcbiAgICogSWYgYGdlbmVyYXRlYCByZXR1cm5zIG51bGwsIHRoZW4gdGhlIHNoaW0gZ2VuZXJhdG9yIGRlY2xpbmVzIHRvIGdlbmVyYXRlIHRoZSBmaWxlIGFmdGVyIGFsbC5cbiAgICovXG4gIGdlbmVyYXRlKGdlbkZpbGVOYW1lOiBzdHJpbmcsIHJlYWRGaWxlOiAoZmlsZU5hbWU6IHN0cmluZykgPT4gdHMuU291cmNlRmlsZSB8IG51bGwpOiB0cy5Tb3VyY2VGaWxlXG4gICAgICB8bnVsbDtcbn1cblxuLyoqXG4gKiBBIHdyYXBwZXIgYXJvdW5kIGEgYHRzLkNvbXBpbGVySG9zdGAgd2hpY2ggc3VwcG9ydHMgZ2VuZXJhdGVkIGZpbGVzLlxuICovXG5leHBvcnQgY2xhc3MgR2VuZXJhdGVkU2hpbXNIb3N0V3JhcHBlciBpbXBsZW1lbnRzIHRzLkNvbXBpbGVySG9zdCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZGVsZWdhdGU6IHRzLkNvbXBpbGVySG9zdCwgcHJpdmF0ZSBzaGltR2VuZXJhdG9yczogU2hpbUdlbmVyYXRvcltdKSB7XG4gICAgaWYgKGRlbGVnYXRlLnJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcykge1xuICAgICAgLy8gQmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aXRoIFR5cGVTY3JpcHQgMi45IGFuZCBvbGRlciBzaW5jZSByZXR1cm5cbiAgICAgIC8vIHR5cGUgaGFzIGNoYW5nZWQgZnJvbSAodHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlIHwgdW5kZWZpbmVkKVtdXG4gICAgICAvLyB0byB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXSBpbiBUeXBlc2NyaXB0IDMuMFxuICAgICAgdHlwZSB0czNSZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMgPSAobmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKSA9PlxuICAgICAgICAgIHRzLlJlc29sdmVkVHlwZVJlZmVyZW5jZURpcmVjdGl2ZVtdO1xuICAgICAgdGhpcy5yZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMgPSAobmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKSA9PlxuICAgICAgICAgIChkZWxlZ2F0ZS5yZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMgYXMgdHMzUmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzKSAhKFxuICAgICAgICAgICAgICBuYW1lcywgY29udGFpbmluZ0ZpbGUpO1xuICAgIH1cbiAgICBpZiAoZGVsZWdhdGUuZGlyZWN0b3J5RXhpc3RzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuZGlyZWN0b3J5RXhpc3RzID0gKGRpcmVjdG9yeU5hbWU6IHN0cmluZykgPT4gZGVsZWdhdGUuZGlyZWN0b3J5RXhpc3RzICEoZGlyZWN0b3J5TmFtZSk7XG4gICAgfVxuICB9XG5cbiAgcmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzPzpcbiAgICAgIChuYW1lczogc3RyaW5nW10sIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpID0+IHRzLlJlc29sdmVkVHlwZVJlZmVyZW5jZURpcmVjdGl2ZVtdO1xuXG4gIGRpcmVjdG9yeUV4aXN0cz86IChkaXJlY3RvcnlOYW1lOiBzdHJpbmcpID0+IGJvb2xlYW47XG5cbiAgZ2V0U291cmNlRmlsZShcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIGxhbmd1YWdlVmVyc2lvbjogdHMuU2NyaXB0VGFyZ2V0LFxuICAgICAgb25FcnJvcj86ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQsXG4gICAgICBzaG91bGRDcmVhdGVOZXdTb3VyY2VGaWxlPzogYm9vbGVhbnx1bmRlZmluZWQpOiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNoaW1HZW5lcmF0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBnZW5lcmF0b3IgPSB0aGlzLnNoaW1HZW5lcmF0b3JzW2ldO1xuICAgICAgaWYgKGdlbmVyYXRvci5yZWNvZ25pemUoZmlsZU5hbWUpKSB7XG4gICAgICAgIGNvbnN0IHJlYWRGaWxlID0gKG9yaWdpbmFsRmlsZTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0U291cmNlRmlsZShcbiAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsRmlsZSwgbGFuZ3VhZ2VWZXJzaW9uLCBvbkVycm9yLCBzaG91bGRDcmVhdGVOZXdTb3VyY2VGaWxlKSB8fFxuICAgICAgICAgICAgICBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBnZW5lcmF0b3IuZ2VuZXJhdGUoZmlsZU5hbWUsIHJlYWRGaWxlKSB8fCB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldFNvdXJjZUZpbGUoXG4gICAgICAgIGZpbGVOYW1lLCBsYW5ndWFnZVZlcnNpb24sIG9uRXJyb3IsIHNob3VsZENyZWF0ZU5ld1NvdXJjZUZpbGUpO1xuICB9XG5cbiAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lKG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0RGVmYXVsdExpYkZpbGVOYW1lKG9wdGlvbnMpO1xuICB9XG5cbiAgd3JpdGVGaWxlKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgZGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICBvbkVycm9yOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkLFxuICAgICAgc291cmNlRmlsZXM6IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT4pOiB2b2lkIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS53cml0ZUZpbGUoZmlsZU5hbWUsIGRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMpO1xuICB9XG5cbiAgZ2V0Q3VycmVudERpcmVjdG9yeSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXRDdXJyZW50RGlyZWN0b3J5KCk7IH1cblxuICBnZXREaXJlY3RvcmllcyhwYXRoOiBzdHJpbmcpOiBzdHJpbmdbXSB7IHJldHVybiB0aGlzLmRlbGVnYXRlLmdldERpcmVjdG9yaWVzKHBhdGgpOyB9XG5cbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpO1xuICB9XG5cbiAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpOyB9XG5cbiAgZ2V0TmV3TGluZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXROZXdMaW5lKCk7IH1cblxuICBmaWxlRXhpc3RzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBDb25zaWRlciB0aGUgZmlsZSBhcyBleGlzdGluZyB3aGVuZXZlciAxKSBpdCByZWFsbHkgZG9lcyBleGlzdCBpbiB0aGUgZGVsZWdhdGUgaG9zdCwgb3JcbiAgICAvLyAyKSBhdCBsZWFzdCBvbmUgb2YgdGhlIHNoaW0gZ2VuZXJhdG9ycyByZWNvZ25pemVzIGl0LlxuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmZpbGVFeGlzdHMoZmlsZU5hbWUpIHx8XG4gICAgICAgIHRoaXMuc2hpbUdlbmVyYXRvcnMuc29tZShnZW4gPT4gZ2VuLnJlY29nbml6ZShmaWxlTmFtZSkpO1xuICB9XG5cbiAgcmVhZEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZ3x1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5yZWFkRmlsZShmaWxlTmFtZSk7IH1cbn1cbiJdfQ==