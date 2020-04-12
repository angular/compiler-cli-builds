(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/sourcemaps/source_file_loader", ["require", "exports", "convert-source-map", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/sourcemaps/source_file"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var convert_source_map_1 = require("convert-source-map");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var source_file_1 = require("@angular/compiler-cli/ngcc/src/sourcemaps/source_file");
    /**
     * This class can be used to load a source file, its associated source map and any upstream sources.
     *
     * Since a source file might reference (or include) a source map, this class can load those too.
     * Since a source map might reference other source files, these are also loaded as needed.
     *
     * This is done recursively. The result is a "tree" of `SourceFile` objects, each containing
     * mappings to other `SourceFile` objects as necessary.
     */
    var SourceFileLoader = /** @class */ (function () {
        function SourceFileLoader(fs, logger) {
            this.fs = fs;
            this.logger = logger;
            this.currentPaths = [];
        }
        SourceFileLoader.prototype.loadSourceFile = function (sourcePath, contents, mapAndPath) {
            if (contents === void 0) { contents = null; }
            if (mapAndPath === void 0) { mapAndPath = null; }
            var previousPaths = this.currentPaths.slice();
            try {
                if (contents === null) {
                    if (!this.fs.exists(sourcePath)) {
                        return null;
                    }
                    contents = this.readSourceFile(sourcePath);
                }
                // If not provided try to load the source map based on the source itself
                if (mapAndPath === null) {
                    mapAndPath = this.loadSourceMap(sourcePath, contents);
                }
                var map = null;
                var inline = true;
                var sources = [];
                if (mapAndPath !== null) {
                    var basePath = mapAndPath.mapPath || sourcePath;
                    sources = this.processSources(basePath, mapAndPath.map);
                    map = mapAndPath.map;
                    inline = mapAndPath.mapPath === null;
                }
                return new source_file_1.SourceFile(sourcePath, contents, map, inline, sources);
            }
            catch (e) {
                this.logger.warn("Unable to fully load " + sourcePath + " for source-map flattening: " + e.message);
                return null;
            }
            finally {
                // We are finished with this recursion so revert the paths being tracked
                this.currentPaths = previousPaths;
            }
        };
        /**
         * Find the source map associated with the source file whose `sourcePath` and `contents` are
         * provided.
         *
         * Source maps can be inline, as part of a base64 encoded comment, or external as a separate file
         * whose path is indicated in a comment or implied from the name of the source file itself.
         */
        SourceFileLoader.prototype.loadSourceMap = function (sourcePath, contents) {
            var inline = convert_source_map_1.commentRegex.exec(contents);
            if (inline !== null) {
                return { map: convert_source_map_1.fromComment(inline.pop()).sourcemap, mapPath: null };
            }
            var external = convert_source_map_1.mapFileCommentRegex.exec(contents);
            if (external) {
                try {
                    var fileName = external[1] || external[2];
                    var externalMapPath = this.fs.resolve(this.fs.dirname(sourcePath), fileName);
                    return { map: this.readRawSourceMap(externalMapPath), mapPath: externalMapPath };
                }
                catch (e) {
                    this.logger.warn("Unable to fully load " + sourcePath + " for source-map flattening: " + e.message);
                    return null;
                }
            }
            var impliedMapPath = file_system_1.absoluteFrom(sourcePath + '.map');
            if (this.fs.exists(impliedMapPath)) {
                return { map: this.readRawSourceMap(impliedMapPath), mapPath: impliedMapPath };
            }
            return null;
        };
        /**
         * Iterate over each of the "sources" for this source file's source map, recursively loading each
         * source file and its associated source map.
         */
        SourceFileLoader.prototype.processSources = function (basePath, map) {
            var _this = this;
            var sourceRoot = this.fs.resolve(this.fs.dirname(basePath), map.sourceRoot || '');
            return map.sources.map(function (source, index) {
                var path = _this.fs.resolve(sourceRoot, source);
                var content = map.sourcesContent && map.sourcesContent[index] || null;
                return _this.loadSourceFile(path, content, null);
            });
        };
        /**
         * Load the contents of the source file from disk.
         *
         * @param sourcePath The path to the source file.
         */
        SourceFileLoader.prototype.readSourceFile = function (sourcePath) {
            this.trackPath(sourcePath);
            return this.fs.readFile(sourcePath);
        };
        /**
         * Load the source map from the file at `mapPath`, parsing its JSON contents into a `RawSourceMap`
         * object.
         *
         * @param mapPath The path to the source-map file.
         */
        SourceFileLoader.prototype.readRawSourceMap = function (mapPath) {
            this.trackPath(mapPath);
            return JSON.parse(this.fs.readFile(mapPath));
        };
        /**
         * Track source file paths if we have loaded them from disk so that we don't get into an infinite
         * recursion.
         */
        SourceFileLoader.prototype.trackPath = function (path) {
            if (this.currentPaths.includes(path)) {
                throw new Error("Circular source file mapping dependency: " + this.currentPaths.join(' -> ') + " -> " + path);
            }
            this.currentPaths.push(path);
        };
        return SourceFileLoader;
    }());
    exports.SourceFileLoader = SourceFileLoader;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX2ZpbGVfbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3NvdXJjZW1hcHMvc291cmNlX2ZpbGVfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gseURBQWtGO0lBRWxGLDJFQUF3RjtJQUl4RixxRkFBeUM7SUFHekM7Ozs7Ozs7O09BUUc7SUFDSDtRQUdFLDBCQUFvQixFQUFjLEVBQVUsTUFBYztZQUF0QyxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUZsRCxpQkFBWSxHQUFxQixFQUFFLENBQUM7UUFFaUIsQ0FBQztRQTBCOUQseUNBQWMsR0FBZCxVQUNJLFVBQTBCLEVBQUUsUUFBNEIsRUFDeEQsVUFBa0M7WUFETix5QkFBQSxFQUFBLGVBQTRCO1lBQ3hELDJCQUFBLEVBQUEsaUJBQWtDO1lBQ3BDLElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEQsSUFBSTtnQkFDRixJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7b0JBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRTt3QkFDL0IsT0FBTyxJQUFJLENBQUM7cUJBQ2I7b0JBQ0QsUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7aUJBQzVDO2dCQUVELHdFQUF3RTtnQkFDeEUsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO29CQUN2QixVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7aUJBQ3ZEO2dCQUVELElBQUksR0FBRyxHQUFzQixJQUFJLENBQUM7Z0JBQ2xDLElBQUksTUFBTSxHQUFH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a0pDO0lBbEpZLDRDQUFnQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Y29tbWVudFJlZ2V4LCBmcm9tQ29tbWVudCwgbWFwRmlsZUNvbW1lbnRSZWdleH0gZnJvbSAnY29udmVydC1zb3VyY2UtbWFwJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgYWJzb2x1dGVGcm9tfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcblxuaW1wb3J0IHtSYXdTb3VyY2VNYXB9IGZyb20gJy4vcmF3X3NvdXJjZV9tYXAnO1xuaW1wb3J0IHtTb3VyY2VGaWxlfSBmcm9tICcuL3NvdXJjZV9maWxlJztcblxuXG4vKipcbiAqIFRoaXMgY2xhc3MgY2FuIGJlIHVzZWQgdG8gbG9hZCBhIHNvdXJjZSBmaWxlLCBpdHMgYXNzb2NpYXRlZCBzb3VyY2UgbWFwIGFuZCBhbnkgdXBzdHJlYW0gc291cmNlcy5cbiAqXG4gKiBTaW5jZSBhIHNvdXJjZSBmaWxlIG1pZ2h0IHJlZmVyZW5jZSAob3IgaW5jbHVkZSkgYSBzb3VyY2UgbWFwLCB0aGlzIGNsYXNzIGNhbiBsb2FkIHRob3NlIHRvby5cbiAqIFNpbmNlIGEgc291cmNlIG1hcCBtaWdodCByZWZlcmVuY2Ugb3RoZXIgc291cmNlIGZpbGVzLCB0aGVzZSBhcmUgYWxzbyBsb2FkZWQgYXMgbmVlZGVkLlxuICpcbiAqIFRoaXMgaXMgZG9uZSByZWN1cnNpdmVseS4gVGhlIHJlc3VsdCBpcyBhIFwidHJlZVwiIG9mIGBTb3VyY2VGaWxlYCBvYmplY3RzLCBlYWNoIGNvbnRhaW5pbmdcbiAqIG1hcHBpbmdzIHRvIG90aGVyIGBTb3VyY2VGaWxlYCBvYmplY3RzIGFzIG5lY2Vzc2FyeS5cbiAqL1xuZXhwb3J0IGNsYXNzIFNvdXJjZUZpbGVMb2FkZXIge1xuICBwcml2YXRlIGN1cnJlbnRQYXRoczogQWJzb2x1dGVGc1BhdGhbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIpIHt9XG5cbiAgLyoqXG4gICAqIExvYWQgYSBzb3VyY2UgZmlsZSwgY29tcHV0ZSBpdHMgc291cmNlIG1hcCwgYW5kIHJlY3Vyc2l2ZWx5IGxvYWQgYW55IHJlZmVyZW5jZWQgc291cmNlIGZpbGVzLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlUGF0aCBUaGUgcGF0aCB0byB0aGUgc291cmNlIGZpbGUgdG8gbG9hZC5cbiAgICogQHBhcmFtIGNvbnRlbnRzIFRoZSBjb250ZW50cyBvZiB0aGUgc291cmNlIGZpbGUgdG8gbG9hZC5cbiAgICogQHBhcmFtIG1hcEFuZFBhdGggVGhlIHJhdyBzb3VyY2UtbWFwIGFuZCB0aGUgcGF0aCB0byB0aGUgc291cmNlLW1hcCBmaWxlLlxuICAgKiBAcmV0dXJucyBhIFNvdXJjZUZpbGUgb2JqZWN0IGNyZWF0ZWQgZnJvbSB0aGUgYGNvbnRlbnRzYCBhbmQgcHJvdmlkZWQgc291cmNlLW1hcCBpbmZvLlxuICAgKi9cbiAgbG9hZFNvdXJjZUZpbGUoc291cmNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIGNvbnRlbnRzOiBzdHJpbmcsIG1hcEFuZFBhdGg6IE1hcEFuZFBhdGgpOiBTb3VyY2VGaWxlO1xuICAvKipcbiAgICogVGhlIG92ZXJsb2FkIHVzZWQgaW50ZXJuYWxseSB0byBsb2FkIHNvdXJjZSBmaWxlcyByZWZlcmVuY2VkIGluIGEgc291cmNlLW1hcC5cbiAgICpcbiAgICogSW4gdGhpcyBjYXNlIHRoZXJlIGlzIG5vIGd1YXJhbnRlZSB0aGF0IGl0IHdpbGwgcmV0dXJuIGEgbm9uLW51bGwgU291cmNlTWFwLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlUGF0aCBUaGUgcGF0aCB0byB0aGUgc291cmNlIGZpbGUgdG8gbG9hZC5cbiAgICogQHBhcmFtIGNvbnRlbnRzIFRoZSBjb250ZW50cyBvZiB0aGUgc291cmNlIGZpbGUgdG8gbG9hZCwgaWYgcHJvdmlkZWQgaW5saW5lLlxuICAgKiBJZiBpdCBpcyBub3Qga25vd24gdGhlIGNvbnRlbnRzIHdpbGwgYmUgcmVhZCBmcm9tIHRoZSBmaWxlIGF0IHRoZSBgc291cmNlUGF0aGAuXG4gICAqIEBwYXJhbSBtYXBBbmRQYXRoIFRoZSByYXcgc291cmNlLW1hcCBhbmQgdGhlIHBhdGggdG8gdGhlIHNvdXJjZS1tYXAgZmlsZS5cbiAgICpcbiAgICogQHJldHVybnMgYSBTb3VyY2VGaWxlIGlmIHRoZSBjb250ZW50IGZvciBvbmUgd2FzIHByb3ZpZGVkIG9yIGFibGUgdG8gYmUgbG9hZGVkIGZyb20gZGlzayxcbiAgICogYG51bGxgIG90aGVyd2lzZS5cbiAgICovXG4gIGxvYWRTb3VyY2VGaWxlKHNvdXJjZVBhdGg6IEFic29sdXRlRnNQYXRoLCBjb250ZW50cz86IHN0cmluZ3xudWxsLCBtYXBBbmRQYXRoPzogbnVsbCk6IFNvdXJjZUZpbGVcbiAgICAgIHxudWxsO1xuICBsb2FkU291cmNlRmlsZShcbiAgICAgIHNvdXJjZVBhdGg6IEFic29sdXRlRnNQYXRoLCBjb250ZW50czogc3RyaW5nfG51bGwgPSBudWxsLFxuICAgICAgbWFwQW5kUGF0aDogTWFwQW5kUGF0aHxudWxsID0gbnVsbCk6IFNvdXJjZUZpbGV8bnVsbCB7XG4gICAgY29uc3QgcHJldmlvdXNQYXRocyA9IHRoaXMuY3VycmVudFBhdGhzLnNsaWNlKCk7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChjb250ZW50cyA9PT0gbnVsbCkge1xuICAgICAgICBpZiAoIXRoaXMuZnMuZXhpc3RzKHNvdXJjZVBhdGgpKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgY29udGVudHMgPSB0aGlzLnJlYWRTb3VyY2VGaWxlKHNvdXJjZVBhdGgpO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiBub3QgcHJvdmlkZWQgdHJ5IHRvIGxvYWQgdGhlIHNvdXJjZSBtYXAgYmFzZWQgb24gdGhlIHNvdXJjZSBpdHNlbGZcbiAgICAgIGlmIChtYXBBbmRQYXRoID09PSBudWxsKSB7XG4gICAgICAgIG1hcEFuZFBhdGggPSB0aGlzLmxvYWRTb3VyY2VNYXAoc291cmNlUGF0aCwgY29udGVudHMpO1xuICAgICAgfVxuXG4gICAgICBsZXQgbWFwOiBSYXdTb3VyY2VNYXB8bnVsbCA9IG51bGw7XG4gICAgICBsZXQgaW5saW5lID0gdHJ1ZTtcbiAgICAgIGxldCBzb3VyY2VzOiAoU291cmNlRmlsZSB8IG51bGwpW10gPSBbXTtcbiAgICAgIGlmIChtYXBBbmRQYXRoICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGJhc2VQYXRoID0gbWFwQW5kUGF0aC5tYXBQYXRoIHx8IHNvdXJjZVBhdGg7XG4gICAgICAgIHNvdXJjZXMgPSB0aGlzLnByb2Nlc3NTb3VyY2VzKGJhc2VQYXRoLCBtYXBBbmRQYXRoLm1hcCk7XG4gICAgICAgIG1hcCA9IG1hcEFuZFBhdGgubWFwO1xuICAgICAgICBpbmxpbmUgPSBtYXBBbmRQYXRoLm1hcFBhdGggPT09IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgU291cmNlRmlsZShzb3VyY2VQYXRoLCBjb250ZW50cywgbWFwLCBpbmxpbmUsIHNvdXJjZXMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgYFVuYWJsZSB0byBmdWxseSBsb2FkICR7c291cmNlUGF0aH0gZm9yIHNvdXJjZS1tYXAgZmxhdHRlbmluZzogJHtlLm1lc3NhZ2V9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgLy8gV2UgYXJlIGZpbmlzaGVkIHdpdGggdGhpcyByZWN1cnNpb24gc28gcmV2ZXJ0IHRoZSBwYXRocyBiZWluZyB0cmFja2VkXG4gICAgICB0aGlzLmN1cnJlbnRQYXRocyA9IHByZXZpb3VzUGF0aHM7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIHNvdXJjZSBtYXAgYXNzb2NpYXRlZCB3aXRoIHRoZSBzb3VyY2UgZmlsZSB3aG9zZSBgc291cmNlUGF0aGAgYW5kIGBjb250ZW50c2AgYXJlXG4gICAqIHByb3ZpZGVkLlxuICAgKlxuICAgKiBTb3VyY2UgbWFwcyBjYW4gYmUgaW5saW5lLCBhcyBwYXJ0IG9mIGEgYmFzZTY0IGVuY29kZWQgY29tbWVudCwgb3IgZXh0ZXJuYWwgYXMgYSBzZXBhcmF0ZSBmaWxlXG4gICAqIHdob3NlIHBhdGggaXMgaW5kaWNhdGVkIGluIGEgY29tbWVudCBvciBpbXBsaWVkIGZyb20gdGhlIG5hbWUgb2YgdGhlIHNvdXJjZSBmaWxlIGl0c2VsZi5cbiAgICovXG4gIHByaXZhdGUgbG9hZFNvdXJjZU1hcChzb3VyY2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgY29udGVudHM6IHN0cmluZyk6IE1hcEFuZFBhdGh8bnVsbCB7XG4gICAgY29uc3QgaW5saW5lID0gY29tbWVudFJlZ2V4LmV4ZWMoY29udGVudHMpO1xuICAgIGlmIChpbmxpbmUgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7bWFwOiBmcm9tQ29tbWVudChpbmxpbmUucG9wKCkgISkuc291cmNlbWFwLCBtYXBQYXRoOiBudWxsfTtcbiAgICB9XG5cbiAgICBjb25zdCBleHRlcm5hbCA9IG1hcEZpbGVDb21tZW50UmVnZXguZXhlYyhjb250ZW50cyk7XG4gICAgaWYgKGV4dGVybmFsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IGV4dGVybmFsWzFdIHx8IGV4dGVybmFsWzJdO1xuICAgICAgICBjb25zdCBleHRlcm5hbE1hcFBhdGggPSB0aGlzLmZzLnJlc29sdmUodGhpcy5mcy5kaXJuYW1lKHNvdXJjZVBhdGgpLCBmaWxlTmFtZSk7XG4gICAgICAgIHJldHVybiB7bWFwOiB0aGlzLnJlYWRSYXdTb3VyY2VNYXAoZXh0ZXJuYWxNYXBQYXRoKSwgbWFwUGF0aDogZXh0ZXJuYWxNYXBQYXRofTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgIGBVbmFibGUgdG8gZnVsbHkgbG9hZCAke3NvdXJjZVBhdGh9IGZvciBzb3VyY2UtbWFwIGZsYXR0ZW5pbmc6ICR7ZS5tZXNzYWdlfWApO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBpbXBsaWVkTWFwUGF0aCA9IGFic29sdXRlRnJvbShzb3VyY2VQYXRoICsgJy5tYXAnKTtcbiAgICBpZiAodGhpcy5mcy5leGlzdHMoaW1wbGllZE1hcFBhdGgpKSB7XG4gICAgICByZXR1cm4ge21hcDogdGhpcy5yZWFkUmF3U291cmNlTWFwKGltcGxpZWRNYXBQYXRoKSwgbWFwUGF0aDogaW1wbGllZE1hcFBhdGh9O1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgb3ZlciBlYWNoIG9mIHRoZSBcInNvdXJjZXNcIiBmb3IgdGhpcyBzb3VyY2UgZmlsZSdzIHNvdXJjZSBtYXAsIHJlY3Vyc2l2ZWx5IGxvYWRpbmcgZWFjaFxuICAgKiBzb3VyY2UgZmlsZSBhbmQgaXRzIGFzc29jaWF0ZWQgc291cmNlIG1hcC5cbiAgICovXG4gIHByaXZhdGUgcHJvY2Vzc1NvdXJjZXMoYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoLCBtYXA6IFJhd1NvdXJjZU1hcCk6IChTb3VyY2VGaWxlfG51bGwpW10ge1xuICAgIGNvbnN0IHNvdXJjZVJvb3QgPSB0aGlzLmZzLnJlc29sdmUodGhpcy5mcy5kaXJuYW1lKGJhc2VQYXRoKSwgbWFwLnNvdXJjZVJvb3QgfHwgJycpO1xuICAgIHJldHVybiBtYXAuc291cmNlcy5tYXAoKHNvdXJjZSwgaW5kZXgpID0+IHtcbiAgICAgIGNvbnN0IHBhdGggPSB0aGlzLmZzLnJlc29sdmUoc291cmNlUm9vdCwgc291cmNlKTtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBtYXAuc291cmNlc0NvbnRlbnQgJiYgbWFwLnNvdXJjZXNDb250ZW50W2luZGV4XSB8fCBudWxsO1xuICAgICAgcmV0dXJuIHRoaXMubG9hZFNvdXJjZUZpbGUocGF0aCwgY29udGVudCwgbnVsbCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTG9hZCB0aGUgY29udGVudHMgb2YgdGhlIHNvdXJjZSBmaWxlIGZyb20gZGlzay5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZVBhdGggVGhlIHBhdGggdG8gdGhlIHNvdXJjZSBmaWxlLlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkU291cmNlRmlsZShzb3VyY2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHN0cmluZyB7XG4gICAgdGhpcy50cmFja1BhdGgoc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIHRoaXMuZnMucmVhZEZpbGUoc291cmNlUGF0aCk7XG4gIH1cblxuICAvKipcbiAgICogTG9hZCB0aGUgc291cmNlIG1hcCBmcm9tIHRoZSBmaWxlIGF0IGBtYXBQYXRoYCwgcGFyc2luZyBpdHMgSlNPTiBjb250ZW50cyBpbnRvIGEgYFJhd1NvdXJjZU1hcGBcbiAgICogb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0gbWFwUGF0aCBUaGUgcGF0aCB0byB0aGUgc291cmNlLW1hcCBmaWxlLlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkUmF3U291cmNlTWFwKG1hcFBhdGg6IEFic29sdXRlRnNQYXRoKTogUmF3U291cmNlTWFwIHtcbiAgICB0aGlzLnRyYWNrUGF0aChtYXBQYXRoKTtcbiAgICByZXR1cm4gSlNPTi5wYXJzZSh0aGlzLmZzLnJlYWRGaWxlKG1hcFBhdGgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFjayBzb3VyY2UgZmlsZSBwYXRocyBpZiB3ZSBoYXZlIGxvYWRlZCB0aGVtIGZyb20gZGlzayBzbyB0aGF0IHdlIGRvbid0IGdldCBpbnRvIGFuIGluZmluaXRlXG4gICAqIHJlY3Vyc2lvbi5cbiAgICovXG4gIHByaXZhdGUgdHJhY2tQYXRoKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY3VycmVudFBhdGhzLmluY2x1ZGVzKHBhdGgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENpcmN1bGFyIHNvdXJjZSBmaWxlIG1hcHBpbmcgZGVwZW5kZW5jeTogJHt0aGlzLmN1cnJlbnRQYXRocy5qb2luKCcgLT4gJyl9IC0+ICR7cGF0aH1gKTtcbiAgICB9XG4gICAgdGhpcy5jdXJyZW50UGF0aHMucHVzaChwYXRoKTtcbiAgfVxufVxuXG4vKiogQSBzbWFsbCBoZWxwZXIgc3RydWN0dXJlIHRoYXQgaXMgcmV0dXJuZWQgZnJvbSBgbG9hZFNvdXJjZU1hcCgpYC4gKi9cbmludGVyZmFjZSBNYXBBbmRQYXRoIHtcbiAgLyoqIFRoZSBwYXRoIHRvIHRoZSBzb3VyY2UgbWFwIGlmIGl0IHdhcyBleHRlcm5hbCBvciBgbnVsbGAgaWYgaXQgd2FzIGlubGluZS4gKi9cbiAgbWFwUGF0aDogQWJzb2x1dGVGc1BhdGh8bnVsbDtcbiAgLyoqIFRoZSByYXcgc291cmNlIG1hcCBpdHNlbGYuICovXG4gIG1hcDogUmF3U291cmNlTWFwO1xufVxuIl19