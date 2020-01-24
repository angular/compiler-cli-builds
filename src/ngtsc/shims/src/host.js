(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/shims/src/host", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    /**
     * A wrapper around a `ts.CompilerHost` which supports generated files.
     */
    var GeneratedShimsHostWrapper = /** @class */ (function () {
        function GeneratedShimsHostWrapper(delegate, shimGenerators) {
            this.delegate = delegate;
            this.shimGenerators = shimGenerators;
            if (delegate.resolveModuleNames !== undefined) {
                this.resolveModuleNames =
                    function (moduleNames, containingFile, reusedNames, redirectedReference, options) {
                        // FIXME: Additional parameters are required in TS3.6, but ignored in 3.5.
                        // Remove the any cast once google3 is fully on TS3.6.
                        return delegate.resolveModuleNames(moduleNames, containingFile, reusedNames, redirectedReference, options);
                    };
            }
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
                var absoluteFsPath = file_system_1.resolve(fileName);
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
                this.shimGenerators.some(function (gen) { return gen.recognize(file_system_1.absoluteFrom(fileName)); });
        };
        GeneratedShimsHostWrapper.prototype.readFile = function (fileName) { return this.delegate.readFile(fileName); };
        return GeneratedShimsHostWrapper;
    }());
    exports.GeneratedShimsHostWrapper = GeneratedShimsHostWrapper;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFRQSwyRUFBd0U7SUFvQnhFOztPQUVHO0lBQ0g7UUFDRSxtQ0FBb0IsUUFBeUIsRUFBVSxjQUErQjtZQUFsRSxhQUFRLEdBQVIsUUFBUSxDQUFpQjtZQUFVLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtZQUNwRixJQUFJLFFBQVEsQ0FBQyxrQkFBa0IsS0FBSyxTQUFTLEVBQUU7Z0JBQzdDLElBQUksQ0FBQyxrQkFBa0I7b0JBQ25CLFVBQUMsV0FBcUIsRUFBRSxjQUFzQixFQUFFLFdBQXFCLEVBQ3BFLG1CQUFnRCxFQUFFLE9BQTRCO3dCQUMzRSwwRUFBMEU7d0JBQzlFLHNEQUFzRDt3QkFDdEQsT0FBQyxRQUFRLENBQUMsa0JBQTRCLENBQ2xDLFdBQVcsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUFFLE9BQU8sQ0FBQztvQkFEM0UsQ0FDMkUsQ0FBQzthQUNqRjtZQUNELElBQUksUUFBUSxDQUFDLDhCQUE4QixFQUFFO2dCQU0zQyxJQUFJLENBQUMsOEJBQThCLEdBQUcsVUFBQyxLQUFlLEVBQUUsY0FBc0I7b0JBQzFFLE9BQUMsUUFBUSxDQUFDLDhCQUFzRSxDQUM1RSxLQUFLLEVBQUUsY0FBYyxDQUFDO2dCQUQxQixDQUMwQixDQUFDO2FBQ2hDO1lBQ0QsSUFBSSxRQUFRLENBQUMsZUFBZSxLQUFLLFNBQVMsRUFBRTtnQkFDMUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxVQUFDLGFBQXFCLElBQUssT0FBQSxRQUFRLENBQUMsZUFBaUIsQ0FBQyxhQUFhLENBQUMsRUFBekMsQ0FBeUMsQ0FBQzthQUM3RjtZQUNELElBQUksUUFBUSxDQUFDLGNBQWMsS0FBSyxTQUFTLEVBQUU7Z0JB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cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBhYnNvbHV0ZUZyb20sIHJlc29sdmV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcblxuZXhwb3J0IGludGVyZmFjZSBTaGltR2VuZXJhdG9yIHtcbiAgLyoqXG4gICAqIFJldHVybnMgYHRydWVgIGlmIHRoaXMgZ2VuZXJhdG9yIGlzIGludGVuZGVkIHRvIGhhbmRsZSB0aGUgZ2l2ZW4gZmlsZS5cbiAgICovXG4gIHJlY29nbml6ZShmaWxlTmFtZTogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBhIHNoaW0ncyBgdHMuU291cmNlRmlsZWAgZm9yIHRoZSBnaXZlbiBvcmlnaW5hbCBmaWxlLlxuICAgKlxuICAgKiBgcmVhZEZpbGVgIGlzIGEgZnVuY3Rpb24gd2hpY2ggYWxsb3dzIHRoZSBnZW5lcmF0b3IgdG8gbG9vayB1cCB0aGUgY29udGVudHMgb2YgZXhpc3Rpbmcgc291cmNlXG4gICAqIGZpbGVzLiBJdCByZXR1cm5zIG51bGwgaWYgdGhlIHJlcXVlc3RlZCBmaWxlIGRvZXNuJ3QgZXhpc3QuXG4gICAqXG4gICAqIElmIGBnZW5lcmF0ZWAgcmV0dXJucyBudWxsLCB0aGVuIHRoZSBzaGltIGdlbmVyYXRvciBkZWNsaW5lcyB0byBnZW5lcmF0ZSB0aGUgZmlsZSBhZnRlciBhbGwuXG4gICAqL1xuICBnZW5lcmF0ZShnZW5GaWxlTmFtZTogQWJzb2x1dGVGc1BhdGgsIHJlYWRGaWxlOiAoZmlsZU5hbWU6IHN0cmluZykgPT4gdHMuU291cmNlRmlsZSB8IG51bGwpOlxuICAgICAgdHMuU291cmNlRmlsZXxudWxsO1xufVxuXG4vKipcbiAqIEEgd3JhcHBlciBhcm91bmQgYSBgdHMuQ29tcGlsZXJIb3N0YCB3aGljaCBzdXBwb3J0cyBnZW5lcmF0ZWQgZmlsZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBHZW5lcmF0ZWRTaGltc0hvc3RXcmFwcGVyIGltcGxlbWVudHMgdHMuQ29tcGlsZXJIb3N0IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBkZWxlZ2F0ZTogdHMuQ29tcGlsZXJIb3N0LCBwcml2YXRlIHNoaW1HZW5lcmF0b3JzOiBTaGltR2VuZXJhdG9yW10pIHtcbiAgICBpZiAoZGVsZWdhdGUucmVzb2x2ZU1vZHVsZU5hbWVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMucmVzb2x2ZU1vZHVsZU5hbWVzID1cbiAgICAgICAgICAobW9kdWxlTmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nLCByZXVzZWROYW1lczogc3RyaW5nW10sXG4gICAgICAgICAgIHJlZGlyZWN0ZWRSZWZlcmVuY2U6IHRzLlJlc29sdmVkUHJvamVjdFJlZmVyZW5jZSwgb3B0aW9ucz86IHRzLkNvbXBpbGVyT3B0aW9ucykgPT5cbiAgICAgICAgICAgICAgLy8gRklYTUU6IEFkZGl0aW9uYWwgcGFyYW1ldGVycyBhcmUgcmVxdWlyZWQgaW4gVFMzLjYsIGJ1dCBpZ25vcmVkIGluIDMuNS5cbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIGFueSBjYXN0IG9uY2UgZ29vZ2xlMyBpcyBmdWxseSBvbiBUUzMuNi5cbiAgICAgICAgICAoZGVsZWdhdGUucmVzb2x2ZU1vZHVsZU5hbWVzIGFzIGFueSkgIShcbiAgICAgICAgICAgICAgbW9kdWxlTmFtZXMsIGNvbnRhaW5pbmdGaWxlLCByZXVzZWROYW1lcywgcmVkaXJlY3RlZFJlZmVyZW5jZSwgb3B0aW9ucyk7XG4gICAgfVxuICAgIGlmIChkZWxlZ2F0ZS5yZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMpIHtcbiAgICAgIC8vIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBUeXBlU2NyaXB0IDIuOSBhbmQgb2xkZXIgc2luY2UgcmV0dXJuXG4gICAgICAvLyB0eXBlIGhhcyBjaGFuZ2VkIGZyb20gKHRzLlJlc29sdmVkVHlwZVJlZmVyZW5jZURpcmVjdGl2ZSB8IHVuZGVmaW5lZClbXVxuICAgICAgLy8gdG8gdHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlW10gaW4gVHlwZXNjcmlwdCAzLjBcbiAgICAgIHR5cGUgdHMzUmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzID0gKG5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZykgPT5cbiAgICAgICAgICB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXTtcbiAgICAgIHRoaXMucmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzID0gKG5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZykgPT5cbiAgICAgICAgICAoZGVsZWdhdGUucmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzIGFzIHRzM1Jlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcykgIShcbiAgICAgICAgICAgICAgbmFtZXMsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICB9XG4gICAgaWYgKGRlbGVnYXRlLmRpcmVjdG9yeUV4aXN0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmRpcmVjdG9yeUV4aXN0cyA9IChkaXJlY3RvcnlOYW1lOiBzdHJpbmcpID0+IGRlbGVnYXRlLmRpcmVjdG9yeUV4aXN0cyAhKGRpcmVjdG9yeU5hbWUpO1xuICAgIH1cbiAgICBpZiAoZGVsZWdhdGUuZ2V0RGlyZWN0b3JpZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5nZXREaXJlY3RvcmllcyA9IChwYXRoOiBzdHJpbmcpID0+IGRlbGVnYXRlLmdldERpcmVjdG9yaWVzICEocGF0aCk7XG4gICAgfVxuICB9XG5cbiAgLy8gRklYTUU6IEFkZGl0aW9uYWwgb3B0aW9ucyBwYXJhbSBpcyBuZWVkZWQgaW4gVFMzLjYsIGJ1dCBub3QgYWxsb293ZWQgaW4gMy41LlxuICAvLyBNYWtlIHRoZSBvcHRpb25zIHBhcmFtIG5vbi1vcHRpb25hbCBvbmNlIGdvb2dsZTMgaXMgZnVsbHkgb24gVFMzLjYuXG4gIHJlc29sdmVNb2R1bGVOYW1lcz86XG4gICAgICAobW9kdWxlTmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nLCByZXVzZWROYW1lczogc3RyaW5nW10sXG4gICAgICAgcmVkaXJlY3RlZFJlZmVyZW5jZTogdHMuUmVzb2x2ZWRQcm9qZWN0UmVmZXJlbmNlLFxuICAgICAgIG9wdGlvbnM/OiB0cy5Db21waWxlck9wdGlvbnMpID0+ICh0cy5SZXNvbHZlZE1vZHVsZSB8IHVuZGVmaW5lZClbXTtcblxuICByZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXM/OlxuICAgICAgKG5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZykgPT4gdHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlW107XG5cbiAgZGlyZWN0b3J5RXhpc3RzPzogKGRpcmVjdG9yeU5hbWU6IHN0cmluZykgPT4gYm9vbGVhbjtcblxuICBnZXRTb3VyY2VGaWxlKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQsXG4gICAgICBvbkVycm9yPzogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCxcbiAgICAgIHNob3VsZENyZWF0ZU5ld1NvdXJjZUZpbGU/OiBib29sZWFufHVuZGVmaW5lZCk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2hpbUdlbmVyYXRvcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGdlbmVyYXRvciA9IHRoaXMuc2hpbUdlbmVyYXRvcnNbaV07XG4gICAgICAvLyBUeXBlU2NyaXB0IGludGVybmFsIHBhdGhzIGFyZSBndWFyYW50ZWVkIHRvIGJlIFBPU0lYLWxpa2UgYWJzb2x1dGUgZmlsZSBwYXRocy5cbiAgICAgIGNvbnN0IGFic29sdXRlRnNQYXRoID0gcmVzb2x2ZShmaWxlTmFtZSk7XG4gICAgICBpZiAoZ2VuZXJhdG9yLnJlY29nbml6ZShhYnNvbHV0ZUZzUGF0aCkpIHtcbiAgICAgICAgY29uc3QgcmVhZEZpbGUgPSAob3JpZ2luYWxGaWxlOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXRTb3VyY2VGaWxlKFxuICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxGaWxlLCBsYW5ndWFnZVZlcnNpb24sIG9uRXJyb3IsIHNob3VsZENyZWF0ZU5ld1NvdXJjZUZpbGUpIHx8XG4gICAgICAgICAgICAgIG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGdlbmVyYXRvci5nZW5lcmF0ZShhYnNvbHV0ZUZzUGF0aCwgcmVhZEZpbGUpIHx8IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0U291cmNlRmlsZShcbiAgICAgICAgZmlsZU5hbWUsIGxhbmd1YWdlVmVyc2lvbiwgb25FcnJvciwgc2hvdWxkQ3JlYXRlTmV3U291cmNlRmlsZSk7XG4gIH1cblxuICBnZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9ucyk7XG4gIH1cblxuICB3cml0ZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBkYXRhOiBzdHJpbmcsIHdyaXRlQnl0ZU9yZGVyTWFyazogYm9vbGVhbixcbiAgICAgIG9uRXJyb3I6ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQsXG4gICAgICBzb3VyY2VGaWxlczogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPnx1bmRlZmluZWQpOiB2b2lkIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS53cml0ZUZpbGUoZmlsZU5hbWUsIGRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMpO1xuICB9XG5cbiAgZ2V0Q3VycmVudERpcmVjdG9yeSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXRDdXJyZW50RGlyZWN0b3J5KCk7IH1cblxuICBnZXREaXJlY3Rvcmllcz86IChwYXRoOiBzdHJpbmcpID0+IHN0cmluZ1tdO1xuXG4gIGdldENhbm9uaWNhbEZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldENhbm9uaWNhbEZpbGVOYW1lKGZpbGVOYW1lKTtcbiAgfVxuXG4gIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmRlbGVnYXRlLnVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTsgfVxuXG4gIGdldE5ld0xpbmUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0TmV3TGluZSgpOyB9XG5cbiAgZmlsZUV4aXN0cyhmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgLy8gQ29uc2lkZXIgdGhlIGZpbGUgYXMgZXhpc3Rpbmcgd2hlbmV2ZXJcbiAgICAvLyAgMSkgaXQgcmVhbGx5IGRvZXMgZXhpc3QgaW4gdGhlIGRlbGVnYXRlIGhvc3QsIG9yXG4gICAgLy8gIDIpIGF0IGxlYXN0IG9uZSBvZiB0aGUgc2hpbSBnZW5lcmF0b3JzIHJlY29nbml6ZXMgaXRcbiAgICAvLyBOb3RlIHRoYXQgd2UgY2FuIHBhc3MgdGhlIGZpbGUgbmFtZSBhcyBicmFuZGVkIGFic29sdXRlIGZzIHBhdGggYmVjYXVzZSBUeXBlU2NyaXB0XG4gICAgLy8gaW50ZXJuYWxseSBvbmx5IHBhc3NlcyBQT1NJWC1saWtlIHBhdGhzLlxuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmZpbGVFeGlzdHMoZmlsZU5hbWUpIHx8XG4gICAgICAgIHRoaXMuc2hpbUdlbmVyYXRvcnMuc29tZShnZW4gPT4gZ2VuLnJlY29nbml6ZShhYnNvbHV0ZUZyb20oZmlsZU5hbWUpKSk7XG4gIH1cblxuICByZWFkRmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLmRlbGVnYXRlLnJlYWRGaWxlKGZpbGVOYW1lKTsgfVxufVxuIl19