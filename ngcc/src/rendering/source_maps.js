(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/source_maps", ["require", "exports", "convert-source-map", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/sourcemaps/source_file_loader"], factory);
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
    var source_file_loader_1 = require("@angular/compiler-cli/ngcc/src/sourcemaps/source_file_loader");
    /**
     * Merge the input and output source-maps, replacing the source-map comment in the output file
     * with an appropriate source-map comment pointing to the merged source-map.
     */
    function renderSourceAndMap(fs, sourceFile, generatedMagicString) {
        var _a;
        var generatedPath = file_system_1.absoluteFromSourceFile(sourceFile);
        var generatedMapPath = file_system_1.absoluteFrom(generatedPath + ".map");
        var generatedContent = generatedMagicString.toString();
        var generatedMap = generatedMagicString.generateMap({ file: generatedPath, source: generatedPath, includeContent: true });
        var loader = new source_file_loader_1.SourceFileLoader(fs);
        var generatedFile = loader.loadSourceFile(generatedPath, generatedContent, { map: generatedMap, mapPath: generatedMapPath });
        var rawMergedMap = generatedFile.renderFlattenedSourceMap();
        var mergedMap = convert_source_map_1.fromObject(rawMergedMap);
        if ((_a = generatedFile.sources[0]) === null || _a === void 0 ? void 0 : _a.inline) {
            // The input source-map was inline so make the output one inline too.
            return [{ path: generatedPath, contents: generatedFile.contents + "\n" + mergedMap.toComment() }];
        }
        else {
            var sourceMapComment = convert_source_map_1.generateMapFileComment(file_system_1.basename(generatedPath) + ".map");
            return [
                { path: generatedPath, contents: generatedFile.contents + "\n" + sourceMapComment },
                { path: generatedMapPath, contents: mergedMap.toJSON() }
            ];
        }
    }
    exports.renderSourceAndMap = renderSourceAndMap;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX21hcHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3NvdXJjZV9tYXBzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gseURBQTBGO0lBRzFGLDJFQUEwRztJQUUxRyxtR0FBa0U7SUFTbEU7OztPQUdHO0lBQ0gsU0FBZ0Isa0JBQWtCLENBQzlCLEVBQWMsRUFBRSxVQUF5QixFQUFFLG9CQUFpQzs7UUFDOUUsSUFBTSxhQUFhLEdBQUcsb0NBQXNCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekQsSUFBTSxnQkFBZ0IsR0FBRywwQkFBWSxDQUFJLGFBQWEsU0FBTSxDQUFDLENBQUM7UUFDOUQsSUFBTSxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN6RCxJQUFNLFlBQVksR0FBaUIsb0JBQW9CLENBQUMsV0FBVyxDQUMvRCxFQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUV4RSxJQUFNLE1BQU0sR0FBRyxJQUFJLHFDQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLElBQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQ3ZDLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxFQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFDLENBQUMsQ0FBQztRQUVyRixJQUFNLFlBQVksR0FBaUIsYUFBYSxDQUFDLHdCQUF3QixFQUFFLENBQUM7UUFDNUUsSUFBTSxTQUFTLEdBQUcsK0JBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUUzQyxVQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLDBDQUFFLE1BQU0sRUFBRTtZQUNwQyxxRUFBcUU7WUFDckUsT0FBTyxDQUFDLEVBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUssYUFBYSxDQUFDLFFBQVEsVUFBSyxTQUFTLENBQUMsU0FBUyxFQUFJLEVBQUMsQ0FBQyxDQUFDO1NBQ2pHO2FBQU07WUFDTCxJQUFNLGdCQUFnQixHQUFHLDJDQUFzQixDQUFJLHNCQUFRLENBQUMsYUFBYSxDQUFDLFNBQU0sQ0FBQyxDQUFDO1lBQ2xGLE9BQU87Z0JBQ0wsRUFBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBSyxhQUFhLENBQUMsUUFBUSxVQUFLLGdCQUFrQixFQUFDO2dCQUNqRixFQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUFDO2FBQ3ZELENBQUM7U0FDSDtJQUNILENBQUM7SUF6QkQsZ0RBeUJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtTb3VyY2VNYXBDb252ZXJ0ZXIsIGZyb21PYmplY3QsIGdlbmVyYXRlTWFwRmlsZUNvbW1lbnR9IGZyb20gJ2NvbnZlcnQtc291cmNlLW1hcCc7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtGaWxlU3lzdGVtLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBiYXNlbmFtZSwgYWJzb2x1dGVGcm9tfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtGaWxlVG9Xcml0ZX0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge1NvdXJjZUZpbGVMb2FkZXJ9IGZyb20gJy4uL3NvdXJjZW1hcHMvc291cmNlX2ZpbGVfbG9hZGVyJztcbmltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICcuLi9zb3VyY2VtYXBzL3Jhd19zb3VyY2VfbWFwJztcblxuZXhwb3J0IGludGVyZmFjZSBTb3VyY2VNYXBJbmZvIHtcbiAgc291cmNlOiBzdHJpbmc7XG4gIG1hcDogU291cmNlTWFwQ29udmVydGVyfG51bGw7XG4gIGlzSW5saW5lOiBib29sZWFuO1xufVxuXG4vKipcbiAqIE1lcmdlIHRoZSBpbnB1dCBhbmQgb3V0cHV0IHNvdXJjZS1tYXBzLCByZXBsYWNpbmcgdGhlIHNvdXJjZS1tYXAgY29tbWVudCBpbiB0aGUgb3V0cHV0IGZpbGVcbiAqIHdpdGggYW4gYXBwcm9wcmlhdGUgc291cmNlLW1hcCBjb21tZW50IHBvaW50aW5nIHRvIHRoZSBtZXJnZWQgc291cmNlLW1hcC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclNvdXJjZUFuZE1hcChcbiAgICBmczogRmlsZVN5c3RlbSwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgZ2VuZXJhdGVkTWFnaWNTdHJpbmc6IE1hZ2ljU3RyaW5nKTogRmlsZVRvV3JpdGVbXSB7XG4gIGNvbnN0IGdlbmVyYXRlZFBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNvdXJjZUZpbGUpO1xuICBjb25zdCBnZW5lcmF0ZWRNYXBQYXRoID0gYWJzb2x1dGVGcm9tKGAke2dlbmVyYXRlZFBhdGh9Lm1hcGApO1xuICBjb25zdCBnZW5lcmF0ZWRDb250ZW50ID0gZ2VuZXJhdGVkTWFnaWNTdHJpbmcudG9TdHJpbmcoKTtcbiAgY29uc3QgZ2VuZXJhdGVkTWFwOiBSYXdTb3VyY2VNYXAgPSBnZW5lcmF0ZWRNYWdpY1N0cmluZy5nZW5lcmF0ZU1hcChcbiAgICAgIHtmaWxlOiBnZW5lcmF0ZWRQYXRoLCBzb3VyY2U6IGdlbmVyYXRlZFBhdGgsIGluY2x1ZGVDb250ZW50OiB0cnVlfSk7XG5cbiAgY29uc3QgbG9hZGVyID0gbmV3IFNvdXJjZUZpbGVMb2FkZXIoZnMpO1xuICBjb25zdCBnZW5lcmF0ZWRGaWxlID0gbG9hZGVyLmxvYWRTb3VyY2VGaWxlKFxuICAgICAgZ2VuZXJhdGVkUGF0aCwgZ2VuZXJhdGVkQ29udGVudCwge21hcDogZ2VuZXJhdGVkTWFwLCBtYXBQYXRoOiBnZW5lcmF0ZWRNYXBQYXRofSk7XG5cbiAgY29uc3QgcmF3TWVyZ2VkTWFwOiBSYXdTb3VyY2VNYXAgPSBnZW5lcmF0ZWRGaWxlLnJlbmRlckZsYXR0ZW5lZFNvdXJjZU1hcCgpO1xuICBjb25zdCBtZXJnZWRNYXAgPSBmcm9tT2JqZWN0KHJhd01lcmdlZE1hcCk7XG5cbiAgaWYgKGdlbmVyYXRlZEZpbGUuc291cmNlc1swXT8uaW5saW5lKSB7XG4gICAgLy8gVGhlIGlucHV0IHNvdXJjZS1tYXAgd2FzIGlubGluZSBzbyBtYWtlIHRoZSBvdXRwdXQgb25lIGlubGluZSB0b28uXG4gICAgcmV0dXJuIFt7cGF0aDogZ2VuZXJhdGVkUGF0aCwgY29udGVudHM6IGAke2dlbmVyYXRlZEZpbGUuY29udGVudHN9XFxuJHttZXJnZWRNYXAudG9Db21tZW50KCl9YH1dO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHNvdXJjZU1hcENvbW1lbnQgPSBnZW5lcmF0ZU1hcEZpbGVDb21tZW50KGAke2Jhc2VuYW1lKGdlbmVyYXRlZFBhdGgpfS5tYXBgKTtcbiAgICByZXR1cm4gW1xuICAgICAge3BhdGg6IGdlbmVyYXRlZFBhdGgsIGNvbnRlbnRzOiBgJHtnZW5lcmF0ZWRGaWxlLmNvbnRlbnRzfVxcbiR7c291cmNlTWFwQ29tbWVudH1gfSxcbiAgICAgIHtwYXRoOiBnZW5lcmF0ZWRNYXBQYXRoLCBjb250ZW50czogbWVyZ2VkTWFwLnRvSlNPTigpfVxuICAgIF07XG4gIH1cbn1cbiJdfQ==