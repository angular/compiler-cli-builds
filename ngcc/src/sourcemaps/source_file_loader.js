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
    exports.SourceFileLoader = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX2ZpbGVfbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3NvdXJjZW1hcHMvc291cmNlX2ZpbGVfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILHlEQUFrRjtJQUVsRiwyRUFBd0Y7SUFJeEYscUZBQXlDO0lBRXpDOzs7Ozs7OztPQVFHO0lBQ0g7UUFHRSwwQkFBb0IsRUFBYyxFQUFVLE1BQWM7WUFBdEMsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7WUFGbEQsaUJBQVksR0FBcUIsRUFBRSxDQUFDO1FBRWlCLENBQUM7UUEwQjlELHlDQUFjLEdBQWQsVUFDSSxVQUEwQixFQUFFLFFBQTRCLEVBQ3hELFVBQWtDO1lBRE4seUJBQUEsRUFBQSxlQUE0QjtZQUN4RCwyQkFBQSxFQUFBLGlCQUFrQztZQUNwQyxJQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2hELElBQUk7Z0JBQ0YsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO29CQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUU7d0JBQy9CLE9BQU8sSUFBSSxDQUFDO3FCQUNiO29CQUNELFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2lCQUM1QztnQkFFRCx3RUFBd0U7Z0JBQ3hFLElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtvQkFDdkIsVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2lCQUN2RDtnQkFFRCxJQUFJLEdBQUcsR0FBc0IsSUFBSSxDQUFDO2dCQUNsQyxJQUFJLE1BQU0sR0FB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QWtKQztJQWxKWSw0Q0FBZ0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2NvbW1lbnRSZWdleCwgZnJvbUNvbW1lbnQsIG1hcEZpbGVDb21tZW50UmVnZXh9IGZyb20gJ2NvbnZlcnQtc291cmNlLW1hcCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5cbmltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICcuL3Jhd19zb3VyY2VfbWFwJztcbmltcG9ydCB7U291cmNlRmlsZX0gZnJvbSAnLi9zb3VyY2VfZmlsZSc7XG5cbi8qKlxuICogVGhpcyBjbGFzcyBjYW4gYmUgdXNlZCB0byBsb2FkIGEgc291cmNlIGZpbGUsIGl0cyBhc3NvY2lhdGVkIHNvdXJjZSBtYXAgYW5kIGFueSB1cHN0cmVhbSBzb3VyY2VzLlxuICpcbiAqIFNpbmNlIGEgc291cmNlIGZpbGUgbWlnaHQgcmVmZXJlbmNlIChvciBpbmNsdWRlKSBhIHNvdXJjZSBtYXAsIHRoaXMgY2xhc3MgY2FuIGxvYWQgdGhvc2UgdG9vLlxuICogU2luY2UgYSBzb3VyY2UgbWFwIG1pZ2h0IHJlZmVyZW5jZSBvdGhlciBzb3VyY2UgZmlsZXMsIHRoZXNlIGFyZSBhbHNvIGxvYWRlZCBhcyBuZWVkZWQuXG4gKlxuICogVGhpcyBpcyBkb25lIHJlY3Vyc2l2ZWx5LiBUaGUgcmVzdWx0IGlzIGEgXCJ0cmVlXCIgb2YgYFNvdXJjZUZpbGVgIG9iamVjdHMsIGVhY2ggY29udGFpbmluZ1xuICogbWFwcGluZ3MgdG8gb3RoZXIgYFNvdXJjZUZpbGVgIG9iamVjdHMgYXMgbmVjZXNzYXJ5LlxuICovXG5leHBvcnQgY2xhc3MgU291cmNlRmlsZUxvYWRlciB7XG4gIHByaXZhdGUgY3VycmVudFBhdGhzOiBBYnNvbHV0ZUZzUGF0aFtdID0gW107XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcikge31cblxuICAvKipcbiAgICogTG9hZCBhIHNvdXJjZSBmaWxlLCBjb21wdXRlIGl0cyBzb3VyY2UgbWFwLCBhbmQgcmVjdXJzaXZlbHkgbG9hZCBhbnkgcmVmZXJlbmNlZCBzb3VyY2UgZmlsZXMuXG4gICAqXG4gICAqIEBwYXJhbSBzb3VyY2VQYXRoIFRoZSBwYXRoIHRvIHRoZSBzb3VyY2UgZmlsZSB0byBsb2FkLlxuICAgKiBAcGFyYW0gY29udGVudHMgVGhlIGNvbnRlbnRzIG9mIHRoZSBzb3VyY2UgZmlsZSB0byBsb2FkLlxuICAgKiBAcGFyYW0gbWFwQW5kUGF0aCBUaGUgcmF3IHNvdXJjZS1tYXAgYW5kIHRoZSBwYXRoIHRvIHRoZSBzb3VyY2UtbWFwIGZpbGUuXG4gICAqIEByZXR1cm5zIGEgU291cmNlRmlsZSBvYmplY3QgY3JlYXRlZCBmcm9tIHRoZSBgY29udGVudHNgIGFuZCBwcm92aWRlZCBzb3VyY2UtbWFwIGluZm8uXG4gICAqL1xuICBsb2FkU291cmNlRmlsZShzb3VyY2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgY29udGVudHM6IHN0cmluZywgbWFwQW5kUGF0aDogTWFwQW5kUGF0aCk6IFNvdXJjZUZpbGU7XG4gIC8qKlxuICAgKiBUaGUgb3ZlcmxvYWQgdXNlZCBpbnRlcm5hbGx5IHRvIGxvYWQgc291cmNlIGZpbGVzIHJlZmVyZW5jZWQgaW4gYSBzb3VyY2UtbWFwLlxuICAgKlxuICAgKiBJbiB0aGlzIGNhc2UgdGhlcmUgaXMgbm8gZ3VhcmFudGVlIHRoYXQgaXQgd2lsbCByZXR1cm4gYSBub24tbnVsbCBTb3VyY2VNYXAuXG4gICAqXG4gICAqIEBwYXJhbSBzb3VyY2VQYXRoIFRoZSBwYXRoIHRvIHRoZSBzb3VyY2UgZmlsZSB0byBsb2FkLlxuICAgKiBAcGFyYW0gY29udGVudHMgVGhlIGNvbnRlbnRzIG9mIHRoZSBzb3VyY2UgZmlsZSB0byBsb2FkLCBpZiBwcm92aWRlZCBpbmxpbmUuXG4gICAqIElmIGl0IGlzIG5vdCBrbm93biB0aGUgY29udGVudHMgd2lsbCBiZSByZWFkIGZyb20gdGhlIGZpbGUgYXQgdGhlIGBzb3VyY2VQYXRoYC5cbiAgICogQHBhcmFtIG1hcEFuZFBhdGggVGhlIHJhdyBzb3VyY2UtbWFwIGFuZCB0aGUgcGF0aCB0byB0aGUgc291cmNlLW1hcCBmaWxlLlxuICAgKlxuICAgKiBAcmV0dXJucyBhIFNvdXJjZUZpbGUgaWYgdGhlIGNvbnRlbnQgZm9yIG9uZSB3YXMgcHJvdmlkZWQgb3IgYWJsZSB0byBiZSBsb2FkZWQgZnJvbSBkaXNrLFxuICAgKiBgbnVsbGAgb3RoZXJ3aXNlLlxuICAgKi9cbiAgbG9hZFNvdXJjZUZpbGUoc291cmNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIGNvbnRlbnRzPzogc3RyaW5nfG51bGwsIG1hcEFuZFBhdGg/OiBudWxsKTogU291cmNlRmlsZVxuICAgICAgfG51bGw7XG4gIGxvYWRTb3VyY2VGaWxlKFxuICAgICAgc291cmNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIGNvbnRlbnRzOiBzdHJpbmd8bnVsbCA9IG51bGwsXG4gICAgICBtYXBBbmRQYXRoOiBNYXBBbmRQYXRofG51bGwgPSBudWxsKTogU291cmNlRmlsZXxudWxsIHtcbiAgICBjb25zdCBwcmV2aW91c1BhdGhzID0gdGhpcy5jdXJyZW50UGF0aHMuc2xpY2UoKTtcbiAgICB0cnkge1xuICAgICAgaWYgKGNvbnRlbnRzID09PSBudWxsKSB7XG4gICAgICAgIGlmICghdGhpcy5mcy5leGlzdHMoc291cmNlUGF0aCkpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBjb250ZW50cyA9IHRoaXMucmVhZFNvdXJjZUZpbGUoc291cmNlUGF0aCk7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIG5vdCBwcm92aWRlZCB0cnkgdG8gbG9hZCB0aGUgc291cmNlIG1hcCBiYXNlZCBvbiB0aGUgc291cmNlIGl0c2VsZlxuICAgICAgaWYgKG1hcEFuZFBhdGggPT09IG51bGwpIHtcbiAgICAgICAgbWFwQW5kUGF0aCA9IHRoaXMubG9hZFNvdXJjZU1hcChzb3VyY2VQYXRoLCBjb250ZW50cyk7XG4gICAgICB9XG5cbiAgICAgIGxldCBtYXA6IFJhd1NvdXJjZU1hcHxudWxsID0gbnVsbDtcbiAgICAgIGxldCBpbmxpbmUgPSB0cnVlO1xuICAgICAgbGV0IHNvdXJjZXM6IChTb3VyY2VGaWxlfG51bGwpW10gPSBbXTtcbiAgICAgIGlmIChtYXBBbmRQYXRoICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGJhc2VQYXRoID0gbWFwQW5kUGF0aC5tYXBQYXRoIHx8IHNvdXJjZVBhdGg7XG4gICAgICAgIHNvdXJjZXMgPSB0aGlzLnByb2Nlc3NTb3VyY2VzKGJhc2VQYXRoLCBtYXBBbmRQYXRoLm1hcCk7XG4gICAgICAgIG1hcCA9IG1hcEFuZFBhdGgubWFwO1xuICAgICAgICBpbmxpbmUgPSBtYXBBbmRQYXRoLm1hcFBhdGggPT09IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgU291cmNlRmlsZShzb3VyY2VQYXRoLCBjb250ZW50cywgbWFwLCBpbmxpbmUsIHNvdXJjZXMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgYFVuYWJsZSB0byBmdWxseSBsb2FkICR7c291cmNlUGF0aH0gZm9yIHNvdXJjZS1tYXAgZmxhdHRlbmluZzogJHtlLm1lc3NhZ2V9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgLy8gV2UgYXJlIGZpbmlzaGVkIHdpdGggdGhpcyByZWN1cnNpb24gc28gcmV2ZXJ0IHRoZSBwYXRocyBiZWluZyB0cmFja2VkXG4gICAgICB0aGlzLmN1cnJlbnRQYXRocyA9IHByZXZpb3VzUGF0aHM7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIHNvdXJjZSBtYXAgYXNzb2NpYXRlZCB3aXRoIHRoZSBzb3VyY2UgZmlsZSB3aG9zZSBgc291cmNlUGF0aGAgYW5kIGBjb250ZW50c2AgYXJlXG4gICAqIHByb3ZpZGVkLlxuICAgKlxuICAgKiBTb3VyY2UgbWFwcyBjYW4gYmUgaW5saW5lLCBhcyBwYXJ0IG9mIGEgYmFzZTY0IGVuY29kZWQgY29tbWVudCwgb3IgZXh0ZXJuYWwgYXMgYSBzZXBhcmF0ZSBmaWxlXG4gICAqIHdob3NlIHBhdGggaXMgaW5kaWNhdGVkIGluIGEgY29tbWVudCBvciBpbXBsaWVkIGZyb20gdGhlIG5hbWUgb2YgdGhlIHNvdXJjZSBmaWxlIGl0c2VsZi5cbiAgICovXG4gIHByaXZhdGUgbG9hZFNvdXJjZU1hcChzb3VyY2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgY29udGVudHM6IHN0cmluZyk6IE1hcEFuZFBhdGh8bnVsbCB7XG4gICAgY29uc3QgaW5saW5lID0gY29tbWVudFJlZ2V4LmV4ZWMoY29udGVudHMpO1xuICAgIGlmIChpbmxpbmUgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7bWFwOiBmcm9tQ29tbWVudChpbmxpbmUucG9wKCkhKS5zb3VyY2VtYXAsIG1hcFBhdGg6IG51bGx9O1xuICAgIH1cblxuICAgIGNvbnN0IGV4dGVybmFsID0gbWFwRmlsZUNvbW1lbnRSZWdleC5leGVjKGNvbnRlbnRzKTtcbiAgICBpZiAoZXh0ZXJuYWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGZpbGVOYW1lID0gZXh0ZXJuYWxbMV0gfHwgZXh0ZXJuYWxbMl07XG4gICAgICAgIGNvbnN0IGV4dGVybmFsTWFwUGF0aCA9IHRoaXMuZnMucmVzb2x2ZSh0aGlzLmZzLmRpcm5hbWUoc291cmNlUGF0aCksIGZpbGVOYW1lKTtcbiAgICAgICAgcmV0dXJuIHttYXA6IHRoaXMucmVhZFJhd1NvdXJjZU1hcChleHRlcm5hbE1hcFBhdGgpLCBtYXBQYXRoOiBleHRlcm5hbE1hcFBhdGh9O1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYFVuYWJsZSB0byBmdWxseSBsb2FkICR7c291cmNlUGF0aH0gZm9yIHNvdXJjZS1tYXAgZmxhdHRlbmluZzogJHtlLm1lc3NhZ2V9YCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGltcGxpZWRNYXBQYXRoID0gYWJzb2x1dGVGcm9tKHNvdXJjZVBhdGggKyAnLm1hcCcpO1xuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhpbXBsaWVkTWFwUGF0aCkpIHtcbiAgICAgIHJldHVybiB7bWFwOiB0aGlzLnJlYWRSYXdTb3VyY2VNYXAoaW1wbGllZE1hcFBhdGgpLCBtYXBQYXRoOiBpbXBsaWVkTWFwUGF0aH07XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSBvdmVyIGVhY2ggb2YgdGhlIFwic291cmNlc1wiIGZvciB0aGlzIHNvdXJjZSBmaWxlJ3Mgc291cmNlIG1hcCwgcmVjdXJzaXZlbHkgbG9hZGluZyBlYWNoXG4gICAqIHNvdXJjZSBmaWxlIGFuZCBpdHMgYXNzb2NpYXRlZCBzb3VyY2UgbWFwLlxuICAgKi9cbiAgcHJpdmF0ZSBwcm9jZXNzU291cmNlcyhiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIG1hcDogUmF3U291cmNlTWFwKTogKFNvdXJjZUZpbGV8bnVsbClbXSB7XG4gICAgY29uc3Qgc291cmNlUm9vdCA9IHRoaXMuZnMucmVzb2x2ZSh0aGlzLmZzLmRpcm5hbWUoYmFzZVBhdGgpLCBtYXAuc291cmNlUm9vdCB8fCAnJyk7XG4gICAgcmV0dXJuIG1hcC5zb3VyY2VzLm1hcCgoc291cmNlLCBpbmRleCkgPT4ge1xuICAgICAgY29uc3QgcGF0aCA9IHRoaXMuZnMucmVzb2x2ZShzb3VyY2VSb290LCBzb3VyY2UpO1xuICAgICAgY29uc3QgY29udGVudCA9IG1hcC5zb3VyY2VzQ29udGVudCAmJiBtYXAuc291cmNlc0NvbnRlbnRbaW5kZXhdIHx8IG51bGw7XG4gICAgICByZXR1cm4gdGhpcy5sb2FkU291cmNlRmlsZShwYXRoLCBjb250ZW50LCBudWxsKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2FkIHRoZSBjb250ZW50cyBvZiB0aGUgc291cmNlIGZpbGUgZnJvbSBkaXNrLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlUGF0aCBUaGUgcGF0aCB0byB0aGUgc291cmNlIGZpbGUuXG4gICAqL1xuICBwcml2YXRlIHJlYWRTb3VyY2VGaWxlKHNvdXJjZVBhdGg6IEFic29sdXRlRnNQYXRoKTogc3RyaW5nIHtcbiAgICB0aGlzLnRyYWNrUGF0aChzb3VyY2VQYXRoKTtcbiAgICByZXR1cm4gdGhpcy5mcy5yZWFkRmlsZShzb3VyY2VQYXRoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2FkIHRoZSBzb3VyY2UgbWFwIGZyb20gdGhlIGZpbGUgYXQgYG1hcFBhdGhgLCBwYXJzaW5nIGl0cyBKU09OIGNvbnRlbnRzIGludG8gYSBgUmF3U291cmNlTWFwYFxuICAgKiBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSBtYXBQYXRoIFRoZSBwYXRoIHRvIHRoZSBzb3VyY2UtbWFwIGZpbGUuXG4gICAqL1xuICBwcml2YXRlIHJlYWRSYXdTb3VyY2VNYXAobWFwUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBSYXdTb3VyY2VNYXAge1xuICAgIHRoaXMudHJhY2tQYXRoKG1hcFBhdGgpO1xuICAgIHJldHVybiBKU09OLnBhcnNlKHRoaXMuZnMucmVhZEZpbGUobWFwUGF0aCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYWNrIHNvdXJjZSBmaWxlIHBhdGhzIGlmIHdlIGhhdmUgbG9hZGVkIHRoZW0gZnJvbSBkaXNrIHNvIHRoYXQgd2UgZG9uJ3QgZ2V0IGludG8gYW4gaW5maW5pdGVcbiAgICogcmVjdXJzaW9uLlxuICAgKi9cbiAgcHJpdmF0ZSB0cmFja1BhdGgocGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jdXJyZW50UGF0aHMuaW5jbHVkZXMocGF0aCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQ2lyY3VsYXIgc291cmNlIGZpbGUgbWFwcGluZyBkZXBlbmRlbmN5OiAke3RoaXMuY3VycmVudFBhdGhzLmpvaW4oJyAtPiAnKX0gLT4gJHtwYXRofWApO1xuICAgIH1cbiAgICB0aGlzLmN1cnJlbnRQYXRocy5wdXNoKHBhdGgpO1xuICB9XG59XG5cbi8qKiBBIHNtYWxsIGhlbHBlciBzdHJ1Y3R1cmUgdGhhdCBpcyByZXR1cm5lZCBmcm9tIGBsb2FkU291cmNlTWFwKClgLiAqL1xuaW50ZXJmYWNlIE1hcEFuZFBhdGgge1xuICAvKiogVGhlIHBhdGggdG8gdGhlIHNvdXJjZSBtYXAgaWYgaXQgd2FzIGV4dGVybmFsIG9yIGBudWxsYCBpZiBpdCB3YXMgaW5saW5lLiAqL1xuICBtYXBQYXRoOiBBYnNvbHV0ZUZzUGF0aHxudWxsO1xuICAvKiogVGhlIHJhdyBzb3VyY2UgbWFwIGl0c2VsZi4gKi9cbiAgbWFwOiBSYXdTb3VyY2VNYXA7XG59XG4iXX0=