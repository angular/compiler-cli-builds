(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/sourcemaps/src/source_file_loader", ["require", "exports", "convert-source-map", "@angular/compiler-cli/src/ngtsc/sourcemaps/src/source_file"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SourceFileLoader = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var convert_source_map_1 = require("convert-source-map");
    var source_file_1 = require("@angular/compiler-cli/src/ngtsc/sourcemaps/src/source_file");
    var SCHEME_MATCHER = /^([a-z][a-z0-9.-]*):\/\//i;
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
        function SourceFileLoader(fs, logger, 
        /** A map of URL schemes to base paths. The scheme name should be lowercase. */
        schemeMap) {
            this.fs = fs;
            this.logger = logger;
            this.schemeMap = schemeMap;
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
                return new source_file_1.SourceFile(sourcePath, contents, map, inline, sources, this.fs);
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
            // Only consider a source-map comment from the last non-empty line of the file, in case there
            // are embedded source-map comments elsewhere in the file (as can be the case with bundlers like
            // webpack).
            var lastLine = this.getLastNonEmptyLine(contents);
            var inline = convert_source_map_1.commentRegex.exec(lastLine);
            if (inline !== null) {
                return { map: convert_source_map_1.fromComment(inline.pop()).sourcemap, mapPath: null };
            }
            var external = convert_source_map_1.mapFileCommentRegex.exec(lastLine);
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
            var impliedMapPath = this.fs.resolve(sourcePath + '.map');
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
            var sourceRoot = this.fs.resolve(this.fs.dirname(basePath), this.replaceSchemeWithPath(map.sourceRoot || ''));
            return map.sources.map(function (source, index) {
                var path = _this.fs.resolve(sourceRoot, _this.replaceSchemeWithPath(source));
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
        SourceFileLoader.prototype.getLastNonEmptyLine = function (contents) {
            var trailingWhitespaceIndex = contents.length - 1;
            while (trailingWhitespaceIndex > 0 &&
                (contents[trailingWhitespaceIndex] === '\n' ||
                    contents[trailingWhitespaceIndex] === '\r')) {
                trailingWhitespaceIndex--;
            }
            var lastRealLineIndex = contents.lastIndexOf('\n', trailingWhitespaceIndex - 1);
            if (lastRealLineIndex === -1) {
                lastRealLineIndex = 0;
            }
            return contents.substr(lastRealLineIndex + 1);
        };
        /**
         * Replace any matched URL schemes with their corresponding path held in the schemeMap.
         *
         * Some build tools replace real file paths with scheme prefixed paths - e.g. `webpack://`.
         * We use the `schemeMap` passed to this class to convert such paths to "real" file paths.
         * In some cases, this is not possible, since the file was actually synthesized by the build tool.
         * But the end result is better than prefixing the sourceRoot in front of the scheme.
         */
        SourceFileLoader.prototype.replaceSchemeWithPath = function (path) {
            var _this = this;
            return path.replace(SCHEME_MATCHER, function (_, scheme) { return _this.schemeMap[scheme.toLowerCase()] || ''; });
        };
        return SourceFileLoader;
    }());
    exports.SourceFileLoader = SourceFileLoader;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX2ZpbGVfbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9zb3VyY2VtYXBzL3NyYy9zb3VyY2VfZmlsZV9sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gseURBQWtGO0lBTWxGLDBGQUF5QztJQUV6QyxJQUFNLGNBQWMsR0FBRywyQkFBMkIsQ0FBQztJQUVuRDs7Ozs7Ozs7T0FRRztJQUNIO1FBR0UsMEJBQ1ksRUFBc0IsRUFBVSxNQUFjO1FBQ3RELCtFQUErRTtRQUN2RSxTQUF5QztZQUZ6QyxPQUFFLEdBQUYsRUFBRSxDQUFvQjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7WUFFOUMsY0FBUyxHQUFULFNBQVMsQ0FBZ0M7WUFMN0MsaUJBQVksR0FBcUIsRUFBRSxDQUFDO1FBS1ksQ0FBQztRQTBCekQseUNBQWMsR0FBZCxVQUNJLFVBQTBCLEVBQUUsUUFBNEIsRUFDeEQsVUFBa0M7WUFETix5QkFBQSxFQUFBLGVBQTRCO1lBQ3hELDJCQUFBLEVBQUEsaUJBQWtDO1lBQ3BDLElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEQsSUFBSTtnQkFDRixJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7b0JBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRTt3QkFDL0IsT0FBTyxJQUFJLENBQUM7cUJBQ2I7b0JBQ0QsUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7aUJBQzVDO2dCQUVELHdFQUF3RTtnQkFDeEUsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO29CQUN2QixVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFV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Q2pHLENBQUM7UUFDSCx1QkFBQztJQUFELENBQUMsQUFyTEQsSUFxTEM7SUFyTFksNENBQWdCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2NvbW1lbnRSZWdleCwgZnJvbUNvbW1lbnQsIG1hcEZpbGVDb21tZW50UmVnZXh9IGZyb20gJ2NvbnZlcnQtc291cmNlLW1hcCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIFJlYWRvbmx5RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uL2xvZ2dpbmcnO1xuXG5pbXBvcnQge1Jhd1NvdXJjZU1hcH0gZnJvbSAnLi9yYXdfc291cmNlX21hcCc7XG5pbXBvcnQge1NvdXJjZUZpbGV9IGZyb20gJy4vc291cmNlX2ZpbGUnO1xuXG5jb25zdCBTQ0hFTUVfTUFUQ0hFUiA9IC9eKFthLXpdW2EtejAtOS4tXSopOlxcL1xcLy9pO1xuXG4vKipcbiAqIFRoaXMgY2xhc3MgY2FuIGJlIHVzZWQgdG8gbG9hZCBhIHNvdXJjZSBmaWxlLCBpdHMgYXNzb2NpYXRlZCBzb3VyY2UgbWFwIGFuZCBhbnkgdXBzdHJlYW0gc291cmNlcy5cbiAqXG4gKiBTaW5jZSBhIHNvdXJjZSBmaWxlIG1pZ2h0IHJlZmVyZW5jZSAob3IgaW5jbHVkZSkgYSBzb3VyY2UgbWFwLCB0aGlzIGNsYXNzIGNhbiBsb2FkIHRob3NlIHRvby5cbiAqIFNpbmNlIGEgc291cmNlIG1hcCBtaWdodCByZWZlcmVuY2Ugb3RoZXIgc291cmNlIGZpbGVzLCB0aGVzZSBhcmUgYWxzbyBsb2FkZWQgYXMgbmVlZGVkLlxuICpcbiAqIFRoaXMgaXMgZG9uZSByZWN1cnNpdmVseS4gVGhlIHJlc3VsdCBpcyBhIFwidHJlZVwiIG9mIGBTb3VyY2VGaWxlYCBvYmplY3RzLCBlYWNoIGNvbnRhaW5pbmdcbiAqIG1hcHBpbmdzIHRvIG90aGVyIGBTb3VyY2VGaWxlYCBvYmplY3RzIGFzIG5lY2Vzc2FyeS5cbiAqL1xuZXhwb3J0IGNsYXNzIFNvdXJjZUZpbGVMb2FkZXIge1xuICBwcml2YXRlIGN1cnJlbnRQYXRoczogQWJzb2x1dGVGc1BhdGhbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBmczogUmVhZG9ubHlGaWxlU3lzdGVtLCBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgLyoqIEEgbWFwIG9mIFVSTCBzY2hlbWVzIHRvIGJhc2UgcGF0aHMuIFRoZSBzY2hlbWUgbmFtZSBzaG91bGQgYmUgbG93ZXJjYXNlLiAqL1xuICAgICAgcHJpdmF0ZSBzY2hlbWVNYXA6IFJlY29yZDxzdHJpbmcsIEFic29sdXRlRnNQYXRoPikge31cblxuICAvKipcbiAgICogTG9hZCBhIHNvdXJjZSBmaWxlLCBjb21wdXRlIGl0cyBzb3VyY2UgbWFwLCBhbmQgcmVjdXJzaXZlbHkgbG9hZCBhbnkgcmVmZXJlbmNlZCBzb3VyY2UgZmlsZXMuXG4gICAqXG4gICAqIEBwYXJhbSBzb3VyY2VQYXRoIFRoZSBwYXRoIHRvIHRoZSBzb3VyY2UgZmlsZSB0byBsb2FkLlxuICAgKiBAcGFyYW0gY29udGVudHMgVGhlIGNvbnRlbnRzIG9mIHRoZSBzb3VyY2UgZmlsZSB0byBsb2FkLlxuICAgKiBAcGFyYW0gbWFwQW5kUGF0aCBUaGUgcmF3IHNvdXJjZS1tYXAgYW5kIHRoZSBwYXRoIHRvIHRoZSBzb3VyY2UtbWFwIGZpbGUuXG4gICAqIEByZXR1cm5zIGEgU291cmNlRmlsZSBvYmplY3QgY3JlYXRlZCBmcm9tIHRoZSBgY29udGVudHNgIGFuZCBwcm92aWRlZCBzb3VyY2UtbWFwIGluZm8uXG4gICAqL1xuICBsb2FkU291cmNlRmlsZShzb3VyY2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgY29udGVudHM6IHN0cmluZywgbWFwQW5kUGF0aDogTWFwQW5kUGF0aCk6IFNvdXJjZUZpbGU7XG4gIC8qKlxuICAgKiBUaGUgb3ZlcmxvYWQgdXNlZCBpbnRlcm5hbGx5IHRvIGxvYWQgc291cmNlIGZpbGVzIHJlZmVyZW5jZWQgaW4gYSBzb3VyY2UtbWFwLlxuICAgKlxuICAgKiBJbiB0aGlzIGNhc2UgdGhlcmUgaXMgbm8gZ3VhcmFudGVlIHRoYXQgaXQgd2lsbCByZXR1cm4gYSBub24tbnVsbCBTb3VyY2VNYXAuXG4gICAqXG4gICAqIEBwYXJhbSBzb3VyY2VQYXRoIFRoZSBwYXRoIHRvIHRoZSBzb3VyY2UgZmlsZSB0byBsb2FkLlxuICAgKiBAcGFyYW0gY29udGVudHMgVGhlIGNvbnRlbnRzIG9mIHRoZSBzb3VyY2UgZmlsZSB0byBsb2FkLCBpZiBwcm92aWRlZCBpbmxpbmUuXG4gICAqIElmIGl0IGlzIG5vdCBrbm93biB0aGUgY29udGVudHMgd2lsbCBiZSByZWFkIGZyb20gdGhlIGZpbGUgYXQgdGhlIGBzb3VyY2VQYXRoYC5cbiAgICogQHBhcmFtIG1hcEFuZFBhdGggVGhlIHJhdyBzb3VyY2UtbWFwIGFuZCB0aGUgcGF0aCB0byB0aGUgc291cmNlLW1hcCBmaWxlLlxuICAgKlxuICAgKiBAcmV0dXJucyBhIFNvdXJjZUZpbGUgaWYgdGhlIGNvbnRlbnQgZm9yIG9uZSB3YXMgcHJvdmlkZWQgb3IgYWJsZSB0byBiZSBsb2FkZWQgZnJvbSBkaXNrLFxuICAgKiBgbnVsbGAgb3RoZXJ3aXNlLlxuICAgKi9cbiAgbG9hZFNvdXJjZUZpbGUoc291cmNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIGNvbnRlbnRzPzogc3RyaW5nfG51bGwsIG1hcEFuZFBhdGg/OiBudWxsKTogU291cmNlRmlsZVxuICAgICAgfG51bGw7XG4gIGxvYWRTb3VyY2VGaWxlKFxuICAgICAgc291cmNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIGNvbnRlbnRzOiBzdHJpbmd8bnVsbCA9IG51bGwsXG4gICAgICBtYXBBbmRQYXRoOiBNYXBBbmRQYXRofG51bGwgPSBudWxsKTogU291cmNlRmlsZXxudWxsIHtcbiAgICBjb25zdCBwcmV2aW91c1BhdGhzID0gdGhpcy5jdXJyZW50UGF0aHMuc2xpY2UoKTtcbiAgICB0cnkge1xuICAgICAgaWYgKGNvbnRlbnRzID09PSBudWxsKSB7XG4gICAgICAgIGlmICghdGhpcy5mcy5leGlzdHMoc291cmNlUGF0aCkpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBjb250ZW50cyA9IHRoaXMucmVhZFNvdXJjZUZpbGUoc291cmNlUGF0aCk7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIG5vdCBwcm92aWRlZCB0cnkgdG8gbG9hZCB0aGUgc291cmNlIG1hcCBiYXNlZCBvbiB0aGUgc291cmNlIGl0c2VsZlxuICAgICAgaWYgKG1hcEFuZFBhdGggPT09IG51bGwpIHtcbiAgICAgICAgbWFwQW5kUGF0aCA9IHRoaXMubG9hZFNvdXJjZU1hcChzb3VyY2VQYXRoLCBjb250ZW50cyk7XG4gICAgICB9XG5cbiAgICAgIGxldCBtYXA6IFJhd1NvdXJjZU1hcHxudWxsID0gbnVsbDtcbiAgICAgIGxldCBpbmxpbmUgPSB0cnVlO1xuICAgICAgbGV0IHNvdXJjZXM6IChTb3VyY2VGaWxlfG51bGwpW10gPSBbXTtcbiAgICAgIGlmIChtYXBBbmRQYXRoICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGJhc2VQYXRoID0gbWFwQW5kUGF0aC5tYXBQYXRoIHx8IHNvdXJjZVBhdGg7XG4gICAgICAgIHNvdXJjZXMgPSB0aGlzLnByb2Nlc3NTb3VyY2VzKGJhc2VQYXRoLCBtYXBBbmRQYXRoLm1hcCk7XG4gICAgICAgIG1hcCA9IG1hcEFuZFBhdGgubWFwO1xuICAgICAgICBpbmxpbmUgPSBtYXBBbmRQYXRoLm1hcFBhdGggPT09IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgU291cmNlRmlsZShzb3VyY2VQYXRoLCBjb250ZW50cywgbWFwLCBpbmxpbmUsIHNvdXJjZXMsIHRoaXMuZnMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgYFVuYWJsZSB0byBmdWxseSBsb2FkICR7c291cmNlUGF0aH0gZm9yIHNvdXJjZS1tYXAgZmxhdHRlbmluZzogJHtlLm1lc3NhZ2V9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgLy8gV2UgYXJlIGZpbmlzaGVkIHdpdGggdGhpcyByZWN1cnNpb24gc28gcmV2ZXJ0IHRoZSBwYXRocyBiZWluZyB0cmFja2VkXG4gICAgICB0aGlzLmN1cnJlbnRQYXRocyA9IHByZXZpb3VzUGF0aHM7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIHNvdXJjZSBtYXAgYXNzb2NpYXRlZCB3aXRoIHRoZSBzb3VyY2UgZmlsZSB3aG9zZSBgc291cmNlUGF0aGAgYW5kIGBjb250ZW50c2AgYXJlXG4gICAqIHByb3ZpZGVkLlxuICAgKlxuICAgKiBTb3VyY2UgbWFwcyBjYW4gYmUgaW5saW5lLCBhcyBwYXJ0IG9mIGEgYmFzZTY0IGVuY29kZWQgY29tbWVudCwgb3IgZXh0ZXJuYWwgYXMgYSBzZXBhcmF0ZSBmaWxlXG4gICAqIHdob3NlIHBhdGggaXMgaW5kaWNhdGVkIGluIGEgY29tbWVudCBvciBpbXBsaWVkIGZyb20gdGhlIG5hbWUgb2YgdGhlIHNvdXJjZSBmaWxlIGl0c2VsZi5cbiAgICovXG4gIHByaXZhdGUgbG9hZFNvdXJjZU1hcChzb3VyY2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgY29udGVudHM6IHN0cmluZyk6IE1hcEFuZFBhdGh8bnVsbCB7XG4gICAgLy8gT25seSBjb25zaWRlciBhIHNvdXJjZS1tYXAgY29tbWVudCBmcm9tIHRoZSBsYXN0IG5vbi1lbXB0eSBsaW5lIG9mIHRoZSBmaWxlLCBpbiBjYXNlIHRoZXJlXG4gICAgLy8gYXJlIGVtYmVkZGVkIHNvdXJjZS1tYXAgY29tbWVudHMgZWxzZXdoZXJlIGluIHRoZSBmaWxlIChhcyBjYW4gYmUgdGhlIGNhc2Ugd2l0aCBidW5kbGVycyBsaWtlXG4gICAgLy8gd2VicGFjaykuXG4gICAgY29uc3QgbGFzdExpbmUgPSB0aGlzLmdldExhc3ROb25FbXB0eUxpbmUoY29udGVudHMpO1xuICAgIGNvbnN0IGlubGluZSA9IGNvbW1lbnRSZWdleC5leGVjKGxhc3RMaW5lKTtcbiAgICBpZiAoaW5saW5lICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4ge21hcDogZnJvbUNvbW1lbnQoaW5saW5lLnBvcCgpISkuc291cmNlbWFwLCBtYXBQYXRoOiBudWxsfTtcbiAgICB9XG5cbiAgICBjb25zdCBleHRlcm5hbCA9IG1hcEZpbGVDb21tZW50UmVnZXguZXhlYyhsYXN0TGluZSk7XG4gICAgaWYgKGV4dGVybmFsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IGV4dGVybmFsWzFdIHx8IGV4dGVybmFsWzJdO1xuICAgICAgICBjb25zdCBleHRlcm5hbE1hcFBhdGggPSB0aGlzLmZzLnJlc29sdmUodGhpcy5mcy5kaXJuYW1lKHNvdXJjZVBhdGgpLCBmaWxlTmFtZSk7XG4gICAgICAgIHJldHVybiB7bWFwOiB0aGlzLnJlYWRSYXdTb3VyY2VNYXAoZXh0ZXJuYWxNYXBQYXRoKSwgbWFwUGF0aDogZXh0ZXJuYWxNYXBQYXRofTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgIGBVbmFibGUgdG8gZnVsbHkgbG9hZCAke3NvdXJjZVBhdGh9IGZvciBzb3VyY2UtbWFwIGZsYXR0ZW5pbmc6ICR7ZS5tZXNzYWdlfWApO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBpbXBsaWVkTWFwUGF0aCA9IHRoaXMuZnMucmVzb2x2ZShzb3VyY2VQYXRoICsgJy5tYXAnKTtcbiAgICBpZiAodGhpcy5mcy5leGlzdHMoaW1wbGllZE1hcFBhdGgpKSB7XG4gICAgICByZXR1cm4ge21hcDogdGhpcy5yZWFkUmF3U291cmNlTWFwKGltcGxpZWRNYXBQYXRoKSwgbWFwUGF0aDogaW1wbGllZE1hcFBhdGh9O1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgb3ZlciBlYWNoIG9mIHRoZSBcInNvdXJjZXNcIiBmb3IgdGhpcyBzb3VyY2UgZmlsZSdzIHNvdXJjZSBtYXAsIHJlY3Vyc2l2ZWx5IGxvYWRpbmcgZWFjaFxuICAgKiBzb3VyY2UgZmlsZSBhbmQgaXRzIGFzc29jaWF0ZWQgc291cmNlIG1hcC5cbiAgICovXG4gIHByaXZhdGUgcHJvY2Vzc1NvdXJjZXMoYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoLCBtYXA6IFJhd1NvdXJjZU1hcCk6IChTb3VyY2VGaWxlfG51bGwpW10ge1xuICAgIGNvbnN0IHNvdXJjZVJvb3QgPSB0aGlzLmZzLnJlc29sdmUoXG4gICAgICAgIHRoaXMuZnMuZGlybmFtZShiYXNlUGF0aCksIHRoaXMucmVwbGFjZVNjaGVtZVdpdGhQYXRoKG1hcC5zb3VyY2VSb290IHx8ICcnKSk7XG4gICAgcmV0dXJuIG1hcC5zb3VyY2VzLm1hcCgoc291cmNlLCBpbmRleCkgPT4ge1xuICAgICAgY29uc3QgcGF0aCA9IHRoaXMuZnMucmVzb2x2ZShzb3VyY2VSb290LCB0aGlzLnJlcGxhY2VTY2hlbWVXaXRoUGF0aChzb3VyY2UpKTtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBtYXAuc291cmNlc0NvbnRlbnQgJiYgbWFwLnNvdXJjZXNDb250ZW50W2luZGV4XSB8fCBudWxsO1xuICAgICAgcmV0dXJuIHRoaXMubG9hZFNvdXJjZUZpbGUocGF0aCwgY29udGVudCwgbnVsbCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTG9hZCB0aGUgY29udGVudHMgb2YgdGhlIHNvdXJjZSBmaWxlIGZyb20gZGlzay5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZVBhdGggVGhlIHBhdGggdG8gdGhlIHNvdXJjZSBmaWxlLlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkU291cmNlRmlsZShzb3VyY2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHN0cmluZyB7XG4gICAgdGhpcy50cmFja1BhdGgoc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIHRoaXMuZnMucmVhZEZpbGUoc291cmNlUGF0aCk7XG4gIH1cblxuICAvKipcbiAgICogTG9hZCB0aGUgc291cmNlIG1hcCBmcm9tIHRoZSBmaWxlIGF0IGBtYXBQYXRoYCwgcGFyc2luZyBpdHMgSlNPTiBjb250ZW50cyBpbnRvIGEgYFJhd1NvdXJjZU1hcGBcbiAgICogb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0gbWFwUGF0aCBUaGUgcGF0aCB0byB0aGUgc291cmNlLW1hcCBmaWxlLlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkUmF3U291cmNlTWFwKG1hcFBhdGg6IEFic29sdXRlRnNQYXRoKTogUmF3U291cmNlTWFwIHtcbiAgICB0aGlzLnRyYWNrUGF0aChtYXBQYXRoKTtcbiAgICByZXR1cm4gSlNPTi5wYXJzZSh0aGlzLmZzLnJlYWRGaWxlKG1hcFBhdGgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFjayBzb3VyY2UgZmlsZSBwYXRocyBpZiB3ZSBoYXZlIGxvYWRlZCB0aGVtIGZyb20gZGlzayBzbyB0aGF0IHdlIGRvbid0IGdldCBpbnRvIGFuIGluZmluaXRlXG4gICAqIHJlY3Vyc2lvbi5cbiAgICovXG4gIHByaXZhdGUgdHJhY2tQYXRoKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY3VycmVudFBhdGhzLmluY2x1ZGVzKHBhdGgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENpcmN1bGFyIHNvdXJjZSBmaWxlIG1hcHBpbmcgZGVwZW5kZW5jeTogJHt0aGlzLmN1cnJlbnRQYXRocy5qb2luKCcgLT4gJyl9IC0+ICR7cGF0aH1gKTtcbiAgICB9XG4gICAgdGhpcy5jdXJyZW50UGF0aHMucHVzaChwYXRoKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0TGFzdE5vbkVtcHR5TGluZShjb250ZW50czogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBsZXQgdHJhaWxpbmdXaGl0ZXNwYWNlSW5kZXggPSBjb250ZW50cy5sZW5ndGggLSAxO1xuICAgIHdoaWxlICh0cmFpbGluZ1doaXRlc3BhY2VJbmRleCA+IDAgJiZcbiAgICAgICAgICAgKGNvbnRlbnRzW3RyYWlsaW5nV2hpdGVzcGFjZUluZGV4XSA9PT0gJ1xcbicgfHxcbiAgICAgICAgICAgIGNvbnRlbnRzW3RyYWlsaW5nV2hpdGVzcGFjZUluZGV4XSA9PT0gJ1xccicpKSB7XG4gICAgICB0cmFpbGluZ1doaXRlc3BhY2VJbmRleC0tO1xuICAgIH1cbiAgICBsZXQgbGFzdFJlYWxMaW5lSW5kZXggPSBjb250ZW50cy5sYXN0SW5kZXhPZignXFxuJywgdHJhaWxpbmdXaGl0ZXNwYWNlSW5kZXggLSAxKTtcbiAgICBpZiAobGFzdFJlYWxMaW5lSW5kZXggPT09IC0xKSB7XG4gICAgICBsYXN0UmVhbExpbmVJbmRleCA9IDA7XG4gICAgfVxuICAgIHJldHVybiBjb250ZW50cy5zdWJzdHIobGFzdFJlYWxMaW5lSW5kZXggKyAxKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXBsYWNlIGFueSBtYXRjaGVkIFVSTCBzY2hlbWVzIHdpdGggdGhlaXIgY29ycmVzcG9uZGluZyBwYXRoIGhlbGQgaW4gdGhlIHNjaGVtZU1hcC5cbiAgICpcbiAgICogU29tZSBidWlsZCB0b29scyByZXBsYWNlIHJlYWwgZmlsZSBwYXRocyB3aXRoIHNjaGVtZSBwcmVmaXhlZCBwYXRocyAtIGUuZy4gYHdlYnBhY2s6Ly9gLlxuICAgKiBXZSB1c2UgdGhlIGBzY2hlbWVNYXBgIHBhc3NlZCB0byB0aGlzIGNsYXNzIHRvIGNvbnZlcnQgc3VjaCBwYXRocyB0byBcInJlYWxcIiBmaWxlIHBhdGhzLlxuICAgKiBJbiBzb21lIGNhc2VzLCB0aGlzIGlzIG5vdCBwb3NzaWJsZSwgc2luY2UgdGhlIGZpbGUgd2FzIGFjdHVhbGx5IHN5bnRoZXNpemVkIGJ5IHRoZSBidWlsZCB0b29sLlxuICAgKiBCdXQgdGhlIGVuZCByZXN1bHQgaXMgYmV0dGVyIHRoYW4gcHJlZml4aW5nIHRoZSBzb3VyY2VSb290IGluIGZyb250IG9mIHRoZSBzY2hlbWUuXG4gICAqL1xuICBwcml2YXRlIHJlcGxhY2VTY2hlbWVXaXRoUGF0aChwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBwYXRoLnJlcGxhY2UoXG4gICAgICAgIFNDSEVNRV9NQVRDSEVSLCAoXzogc3RyaW5nLCBzY2hlbWU6IHN0cmluZykgPT4gdGhpcy5zY2hlbWVNYXBbc2NoZW1lLnRvTG93ZXJDYXNlKCldIHx8ICcnKTtcbiAgfVxufVxuXG4vKiogQSBzbWFsbCBoZWxwZXIgc3RydWN0dXJlIHRoYXQgaXMgcmV0dXJuZWQgZnJvbSBgbG9hZFNvdXJjZU1hcCgpYC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWFwQW5kUGF0aCB7XG4gIC8qKiBUaGUgcGF0aCB0byB0aGUgc291cmNlIG1hcCBpZiBpdCB3YXMgZXh0ZXJuYWwgb3IgYG51bGxgIGlmIGl0IHdhcyBpbmxpbmUuICovXG4gIG1hcFBhdGg6IEFic29sdXRlRnNQYXRofG51bGw7XG4gIC8qKiBUaGUgcmF3IHNvdXJjZSBtYXAgaXRzZWxmLiAqL1xuICBtYXA6IFJhd1NvdXJjZU1hcDtcbn1cbiJdfQ==