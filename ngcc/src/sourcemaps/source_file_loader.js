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
        function SourceFileLoader(fs) {
            this.fs = fs;
        }
        SourceFileLoader.prototype.loadSourceFile = function (sourcePath, contents, mapAndPath, previousPaths) {
            if (contents === void 0) { contents = null; }
            if (mapAndPath === void 0) { mapAndPath = null; }
            if (previousPaths === void 0) { previousPaths = []; }
            if (contents === null) {
                if (!this.fs.exists(sourcePath)) {
                    return null;
                }
                // Track source file paths if we have loaded them from disk so that we don't get into an
                // infinite recursion
                if (previousPaths.includes(sourcePath)) {
                    throw new Error("Circular source file mapping dependency: " + previousPaths.join(' -> ') + " -> " + sourcePath);
                }
                previousPaths = previousPaths.concat([sourcePath]);
                contents = this.fs.readFile(sourcePath);
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
                sources = this.processSources(basePath, mapAndPath.map, previousPaths);
                map = mapAndPath.map;
                inline = mapAndPath.mapPath === null;
            }
            return new source_file_1.SourceFile(sourcePath, contents, map, inline, sources);
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
                    return { map: this.loadRawSourceMap(externalMapPath), mapPath: externalMapPath };
                }
                catch (_a) {
                    return null;
                }
            }
            var impliedMapPath = file_system_1.absoluteFrom(sourcePath + '.map');
            if (this.fs.exists(impliedMapPath)) {
                return { map: this.loadRawSourceMap(impliedMapPath), mapPath: impliedMapPath };
            }
            return null;
        };
        /**
         * Iterate over each of the "sources" for this source file's source map, recursively loading each
         * source file and its associated source map.
         */
        SourceFileLoader.prototype.processSources = function (basePath, map, previousPaths) {
            var _this = this;
            var sourceRoot = this.fs.resolve(this.fs.dirname(basePath), map.sourceRoot || '');
            return map.sources.map(function (source, index) {
                var path = _this.fs.resolve(sourceRoot, source);
                var content = map.sourcesContent && map.sourcesContent[index] || null;
                return _this.loadSourceFile(path, content, null, previousPaths);
            });
        };
        /**
         * Load the source map from the file at `mapPath`, parsing its JSON contents into a `RawSourceMap`
         * object.
         */
        SourceFileLoader.prototype.loadRawSourceMap = function (mapPath) {
            return JSON.parse(this.fs.readFile(mapPath));
        };
        return SourceFileLoader;
    }());
    exports.SourceFileLoader = SourceFileLoader;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX2ZpbGVfbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3NvdXJjZW1hcHMvc291cmNlX2ZpbGVfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gseURBQWtGO0lBRWxGLDJFQUF3RjtJQUd4RixxRkFBeUM7SUFFekM7Ozs7Ozs7O09BUUc7SUFDSDtRQUNFLDBCQUFvQixFQUFjO1lBQWQsT0FBRSxHQUFGLEVBQUUsQ0FBWTtRQUFHLENBQUM7UUFvQnRDLHlDQUFjLEdBQWQsVUFDSSxVQUEwQixFQUFFLFFBQTRCLEVBQUUsVUFBa0MsRUFDNUYsYUFBb0M7WUFEUix5QkFBQSxFQUFBLGVBQTRCO1lBQUUsMkJBQUEsRUFBQSxpQkFBa0M7WUFDNUYsOEJBQUEsRUFBQSxrQkFBb0M7WUFDdEMsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO2dCQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQy9CLE9BQU8sSUFBSSxDQUFDO2lCQUNiO2dCQUVELHdGQUF3RjtnQkFDeEYscUJBQXFCO2dCQUNyQixJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQUMsOENBQ1osYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBTyxVQUFZLENBQUMsQ0FBQztpQkFDcEQ7Z0JBQ0QsYUFBYSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUVuRCxRQUFRLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDekM7WUFFRCx3RUFBd0U7WUFDeEUsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO2dCQUN2QixVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDdkQ7WUFFRCxJQUFJLEdBQUcsR0FBc0IsSUFBSSxDQUFDO1lBQ2xDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQztZQUNsQixJQUFJLE9BQU8sR0FBd0IsRUFBRSxDQUFDO1lBQ3RDLElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDdkIsSUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLE9BQU8sSUFBSSxVQUFVLENBQUM7Z0JBQ2xELE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUN2RSxHQUFHLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQztnQkFDckIsTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDO2FBQ3RDO1lBRUQsT0FBTyxJQUFJLHdCQUFVLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFFRDs7Ozs7O1dBTUc7UUFDSyx3Q0FBYSxHQUFyQixVQUFzQixVQUEwQixFQUFFLFFBQWdCO1lBQ2hFLElBQU0sTUFBTSxHQUFHLGlDQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzNDLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtnQkFDbkIsT0FBTyxFQUFDLEdBQUcsRUFBRSxnQ0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUM7YUFDbkU7WUFFRCxJQUFNLFFBQVEsR0FBRyx3Q0FBbUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDcEQsSUFBSSxRQUFRLEVBQUU7Z0JBQ1osSUFBSTtvQkFDRixJQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM1QyxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztvQkFDL0UsT0FBTyxFQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBQyxDQUFDO2lCQUNoRjtnQkFBQyxXQUFNO29CQUNOLE9BQU8sSUFBSSxDQUFDO2lCQUNiO2FBQ0Y7WUFFRCxJQUFNLGNBQWMsR0FBRywwQkFBWSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsQ0FBQztZQUN6RCxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFO2dCQUNsQyxPQUFPLEVBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFDLENBQUM7YUFDOUU7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRDs7O1dBR0c7UUFDSyx5Q0FBYyxHQUF0QixVQUNJLFFBQXdCLEVBQUUsR0FBaUIsRUFDM0MsYUFBK0I7WUFGbkMsaUJBU0M7WUFOQyxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3BGLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBQyxNQUFNLEVBQUUsS0FBSztnQkFDbkMsSUFBTSxJQUFJLEdBQUcsS0FBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUNqRCxJQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsY0FBYyxJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDO2dCQUN4RSxPQUFPLEtBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDakUsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQ7OztXQUdHO1FBQ0ssMkNBQWdCLEdBQXhCLFVBQXlCLE9BQXVCO1lBQzlDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFDSCx1QkFBQztJQUFELENBQUMsQUFoSEQsSUFnSEM7SUFoSFksNENBQWdCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtjb21tZW50UmVnZXgsIGZyb21Db21tZW50LCBtYXBGaWxlQ29tbWVudFJlZ2V4fSBmcm9tICdjb252ZXJ0LXNvdXJjZS1tYXAnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbSwgQWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICcuL3Jhd19zb3VyY2VfbWFwJztcbmltcG9ydCB7U291cmNlRmlsZX0gZnJvbSAnLi9zb3VyY2VfZmlsZSc7XG5cbi8qKlxuICogVGhpcyBjbGFzcyBjYW4gYmUgdXNlZCB0byBsb2FkIGEgc291cmNlIGZpbGUsIGl0cyBhc3NvY2lhdGVkIHNvdXJjZSBtYXAgYW5kIGFueSB1cHN0cmVhbSBzb3VyY2VzLlxuICpcbiAqIFNpbmNlIGEgc291cmNlIGZpbGUgbWlnaHQgcmVmZXJlbmNlIChvciBpbmNsdWRlKSBhIHNvdXJjZSBtYXAsIHRoaXMgY2xhc3MgY2FuIGxvYWQgdGhvc2UgdG9vLlxuICogU2luY2UgYSBzb3VyY2UgbWFwIG1pZ2h0IHJlZmVyZW5jZSBvdGhlciBzb3VyY2UgZmlsZXMsIHRoZXNlIGFyZSBhbHNvIGxvYWRlZCBhcyBuZWVkZWQuXG4gKlxuICogVGhpcyBpcyBkb25lIHJlY3Vyc2l2ZWx5LiBUaGUgcmVzdWx0IGlzIGEgXCJ0cmVlXCIgb2YgYFNvdXJjZUZpbGVgIG9iamVjdHMsIGVhY2ggY29udGFpbmluZ1xuICogbWFwcGluZ3MgdG8gb3RoZXIgYFNvdXJjZUZpbGVgIG9iamVjdHMgYXMgbmVjZXNzYXJ5LlxuICovXG5leHBvcnQgY2xhc3MgU291cmNlRmlsZUxvYWRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0pIHt9XG5cbiAgLyoqXG4gICAqIExvYWQgYSBzb3VyY2UgZmlsZSwgY29tcHV0ZSBpdHMgc291cmNlIG1hcCwgYW5kIHJlY3Vyc2l2ZWx5IGxvYWQgYW55IHJlZmVyZW5jZWQgc291cmNlIGZpbGVzLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlUGF0aCBUaGUgcGF0aCB0byB0aGUgc291cmNlIGZpbGUgdG8gbG9hZC5cbiAgICogQHBhcmFtIGNvbnRlbnRzIFRoZSBjb250ZW50cyBvZiB0aGUgc291cmNlIGZpbGUgdG8gbG9hZCAoaWYga25vd24pLlxuICAgKiBUaGUgY29udGVudHMgbWF5IGJlIGtub3duIGJlY2F1c2UgdGhlIHNvdXJjZSBmaWxlIHdhcyBpbmxpbmVkIGludG8gYSBzb3VyY2UgbWFwLlxuICAgKiBJZiBpdCBpcyBub3Qga25vd24gdGhlIGNvbnRlbnRzIHdpbGwgYmUgcmVhZCBmcm9tIHRoZSBmaWxlIGF0IHRoZSBgc291cmNlUGF0aGAuXG4gICAqIEBwYXJhbSBtYXBBbmRQYXRoIFRoZSByYXcgc291cmNlLW1hcCBhbmQgdGhlIHBhdGggdG8gdGhlIHNvdXJjZS1tYXAgZmlsZSwgaWYga25vd24uXG4gICAqIEBwYXJhbSBwcmV2aW91c1BhdGhzIEFuIGludGVybmFsIHBhcmFtZXRlciB1c2VkIGZvciBjeWNsaWMgZGVwZW5kZW5jeSB0cmFja2luZy5cbiAgICogQHJldHVybnMgYSBTb3VyY2VGaWxlIGlmIHRoZSBjb250ZW50IGZvciBvbmUgd2FzIHByb3ZpZGVkIG9yIGFibGUgdG8gYmUgbG9hZGVkIGZyb20gZGlzayxcbiAgICogYG51bGxgIG90aGVyd2lzZS5cbiAgICovXG4gIGxvYWRTb3VyY2VGaWxlKHNvdXJjZVBhdGg6IEFic29sdXRlRnNQYXRoLCBjb250ZW50czogc3RyaW5nLCBtYXBBbmRQYXRoOiBNYXBBbmRQYXRoKTogU291cmNlRmlsZTtcbiAgbG9hZFNvdXJjZUZpbGUoc291cmNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIGNvbnRlbnRzOiBzdHJpbmd8bnVsbCk6IFNvdXJjZUZpbGV8bnVsbDtcbiAgbG9hZFNvdXJjZUZpbGUoc291cmNlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBTb3VyY2VGaWxlfG51bGw7XG4gIGxvYWRTb3VyY2VGaWxlKFxuICAgICAgc291cmNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIGNvbnRlbnRzOiBzdHJpbmd8bnVsbCwgbWFwQW5kUGF0aDogbnVsbCxcbiAgICAgIHByZXZpb3VzUGF0aHM6IEFic29sdXRlRnNQYXRoW10pOiBTb3VyY2VGaWxlfG51bGw7XG4gIGxvYWRTb3VyY2VGaWxlKFxuICAgICAgc291cmNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIGNvbnRlbnRzOiBzdHJpbmd8bnVsbCA9IG51bGwsIG1hcEFuZFBhdGg6IE1hcEFuZFBhdGh8bnVsbCA9IG51bGwsXG4gICAgICBwcmV2aW91c1BhdGhzOiBBYnNvbHV0ZUZzUGF0aFtdID0gW10pOiBTb3VyY2VGaWxlfG51bGwge1xuICAgIGlmIChjb250ZW50cyA9PT0gbnVsbCkge1xuICAgICAgaWYgKCF0aGlzLmZzLmV4aXN0cyhzb3VyY2VQYXRoKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgLy8gVHJhY2sgc291cmNlIGZpbGUgcGF0aHMgaWYgd2UgaGF2ZSBsb2FkZWQgdGhlbSBmcm9tIGRpc2sgc28gdGhhdCB3ZSBkb24ndCBnZXQgaW50byBhblxuICAgICAgLy8gaW5maW5pdGUgcmVjdXJzaW9uXG4gICAgICBpZiAocHJldmlvdXNQYXRocy5pbmNsdWRlcyhzb3VyY2VQYXRoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENpcmN1bGFyIHNvdXJjZSBmaWxlIG1hcHBpbmcgZGVwZW5kZW5jeTogJHtcbiAgICAgICAgICAgIHByZXZpb3VzUGF0aHMuam9pbignIC0+ICcpfSAtPiAke3NvdXJjZVBhdGh9YCk7XG4gICAgICB9XG4gICAgICBwcmV2aW91c1BhdGhzID0gcHJldmlvdXNQYXRocy5jb25jYXQoW3NvdXJjZVBhdGhdKTtcblxuICAgICAgY29udGVudHMgPSB0aGlzLmZzLnJlYWRGaWxlKHNvdXJjZVBhdGgpO1xuICAgIH1cblxuICAgIC8vIElmIG5vdCBwcm92aWRlZCB0cnkgdG8gbG9hZCB0aGUgc291cmNlIG1hcCBiYXNlZCBvbiB0aGUgc291cmNlIGl0c2VsZlxuICAgIGlmIChtYXBBbmRQYXRoID09PSBudWxsKSB7XG4gICAgICBtYXBBbmRQYXRoID0gdGhpcy5sb2FkU291cmNlTWFwKHNvdXJjZVBhdGgsIGNvbnRlbnRzKTtcbiAgICB9XG5cbiAgICBsZXQgbWFwOiBSYXdTb3VyY2VNYXB8bnVsbCA9IG51bGw7XG4gICAgbGV0IGlubGluZSA9IHRydWU7XG4gICAgbGV0IHNvdXJjZXM6IChTb3VyY2VGaWxlfG51bGwpW10gPSBbXTtcbiAgICBpZiAobWFwQW5kUGF0aCAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgYmFzZVBhdGggPSBtYXBBbmRQYXRoLm1hcFBhdGggfHwgc291cmNlUGF0aDtcbiAgICAgIHNvdXJjZXMgPSB0aGlzLnByb2Nlc3NTb3VyY2VzKGJhc2VQYXRoLCBtYXBBbmRQYXRoLm1hcCwgcHJldmlvdXNQYXRocyk7XG4gICAgICBtYXAgPSBtYXBBbmRQYXRoLm1hcDtcbiAgICAgIGlubGluZSA9IG1hcEFuZFBhdGgubWFwUGF0aCA9PT0gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFNvdXJjZUZpbGUoc291cmNlUGF0aCwgY29udGVudHMsIG1hcCwgaW5saW5lLCBzb3VyY2VzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBzb3VyY2UgbWFwIGFzc29jaWF0ZWQgd2l0aCB0aGUgc291cmNlIGZpbGUgd2hvc2UgYHNvdXJjZVBhdGhgIGFuZCBgY29udGVudHNgIGFyZVxuICAgKiBwcm92aWRlZC5cbiAgICpcbiAgICogU291cmNlIG1hcHMgY2FuIGJlIGlubGluZSwgYXMgcGFydCBvZiBhIGJhc2U2NCBlbmNvZGVkIGNvbW1lbnQsIG9yIGV4dGVybmFsIGFzIGEgc2VwYXJhdGUgZmlsZVxuICAgKiB3aG9zZSBwYXRoIGlzIGluZGljYXRlZCBpbiBhIGNvbW1lbnQgb3IgaW1wbGllZCBmcm9tIHRoZSBuYW1lIG9mIHRoZSBzb3VyY2UgZmlsZSBpdHNlbGYuXG4gICAqL1xuICBwcml2YXRlIGxvYWRTb3VyY2VNYXAoc291cmNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIGNvbnRlbnRzOiBzdHJpbmcpOiBNYXBBbmRQYXRofG51bGwge1xuICAgIGNvbnN0IGlubGluZSA9IGNvbW1lbnRSZWdleC5leGVjKGNvbnRlbnRzKTtcbiAgICBpZiAoaW5saW5lICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4ge21hcDogZnJvbUNvbW1lbnQoaW5saW5lLnBvcCgpISkuc291cmNlbWFwLCBtYXBQYXRoOiBudWxsfTtcbiAgICB9XG5cbiAgICBjb25zdCBleHRlcm5hbCA9IG1hcEZpbGVDb21tZW50UmVnZXguZXhlYyhjb250ZW50cyk7XG4gICAgaWYgKGV4dGVybmFsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IGV4dGVybmFsWzFdIHx8IGV4dGVybmFsWzJdO1xuICAgICAgICBjb25zdCBleHRlcm5hbE1hcFBhdGggPSB0aGlzLmZzLnJlc29sdmUodGhpcy5mcy5kaXJuYW1lKHNvdXJjZVBhdGgpLCBmaWxlTmFtZSk7XG4gICAgICAgIHJldHVybiB7bWFwOiB0aGlzLmxvYWRSYXdTb3VyY2VNYXAoZXh0ZXJuYWxNYXBQYXRoKSwgbWFwUGF0aDogZXh0ZXJuYWxNYXBQYXRofTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBpbXBsaWVkTWFwUGF0aCA9IGFic29sdXRlRnJvbShzb3VyY2VQYXRoICsgJy5tYXAnKTtcbiAgICBpZiAodGhpcy5mcy5leGlzdHMoaW1wbGllZE1hcFBhdGgpKSB7XG4gICAgICByZXR1cm4ge21hcDogdGhpcy5sb2FkUmF3U291cmNlTWFwKGltcGxpZWRNYXBQYXRoKSwgbWFwUGF0aDogaW1wbGllZE1hcFBhdGh9O1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgb3ZlciBlYWNoIG9mIHRoZSBcInNvdXJjZXNcIiBmb3IgdGhpcyBzb3VyY2UgZmlsZSdzIHNvdXJjZSBtYXAsIHJlY3Vyc2l2ZWx5IGxvYWRpbmcgZWFjaFxuICAgKiBzb3VyY2UgZmlsZSBhbmQgaXRzIGFzc29jaWF0ZWQgc291cmNlIG1hcC5cbiAgICovXG4gIHByaXZhdGUgcHJvY2Vzc1NvdXJjZXMoXG4gICAgICBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIG1hcDogUmF3U291cmNlTWFwLFxuICAgICAgcHJldmlvdXNQYXRoczogQWJzb2x1dGVGc1BhdGhbXSk6IChTb3VyY2VGaWxlfG51bGwpW10ge1xuICAgIGNvbnN0IHNvdXJjZVJvb3QgPSB0aGlzLmZzLnJlc29sdmUodGhpcy5mcy5kaXJuYW1lKGJhc2VQYXRoKSwgbWFwLnNvdXJjZVJvb3QgfHwgJycpO1xuICAgIHJldHVybiBtYXAuc291cmNlcy5tYXAoKHNvdXJjZSwgaW5kZXgpID0+IHtcbiAgICAgIGNvbnN0IHBhdGggPSB0aGlzLmZzLnJlc29sdmUoc291cmNlUm9vdCwgc291cmNlKTtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBtYXAuc291cmNlc0NvbnRlbnQgJiYgbWFwLnNvdXJjZXNDb250ZW50W2luZGV4XSB8fCBudWxsO1xuICAgICAgcmV0dXJuIHRoaXMubG9hZFNvdXJjZUZpbGUocGF0aCwgY29udGVudCwgbnVsbCwgcHJldmlvdXNQYXRocyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTG9hZCB0aGUgc291cmNlIG1hcCBmcm9tIHRoZSBmaWxlIGF0IGBtYXBQYXRoYCwgcGFyc2luZyBpdHMgSlNPTiBjb250ZW50cyBpbnRvIGEgYFJhd1NvdXJjZU1hcGBcbiAgICogb2JqZWN0LlxuICAgKi9cbiAgcHJpdmF0ZSBsb2FkUmF3U291cmNlTWFwKG1hcFBhdGg6IEFic29sdXRlRnNQYXRoKTogUmF3U291cmNlTWFwIHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZSh0aGlzLmZzLnJlYWRGaWxlKG1hcFBhdGgpKTtcbiAgfVxufVxuXG4vKiogQSBzbWFsbCBoZWxwZXIgc3RydWN0dXJlIHRoYXQgaXMgcmV0dXJuZWQgZnJvbSBgbG9hZFNvdXJjZU1hcCgpYC4gKi9cbmludGVyZmFjZSBNYXBBbmRQYXRoIHtcbiAgLyoqIFRoZSBwYXRoIHRvIHRoZSBzb3VyY2UgbWFwIGlmIGl0IHdhcyBleHRlcm5hbCBvciBgbnVsbGAgaWYgaXQgd2FzIGlubGluZS4gKi9cbiAgbWFwUGF0aDogQWJzb2x1dGVGc1BhdGh8bnVsbDtcbiAgLyoqIFRoZSByYXcgc291cmNlIG1hcCBpdHNlbGYuICovXG4gIG1hcDogUmF3U291cmNlTWFwO1xufVxuIl19