(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/source_maps", ["require", "exports", "convert-source-map", "source-map", "@angular/compiler-cli/src/ngtsc/path"], factory);
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
    var source_map_1 = require("source-map");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    /**
     * Get the map from the source (note whether it is inline or external)
     */
    function extractSourceMap(fs, logger, file) {
        var inline = convert_source_map_1.commentRegex.test(file.text);
        var external = convert_source_map_1.mapFileCommentRegex.exec(file.text);
        if (inline) {
            var inlineSourceMap = convert_source_map_1.fromSource(file.text);
            return {
                source: convert_source_map_1.removeComments(file.text).replace(/\n\n$/, '\n'),
                map: inlineSourceMap,
                isInline: true,
            };
        }
        else if (external) {
            var externalSourceMap = null;
            try {
                var fileName = external[1] || external[2];
                var filePath = path_1.AbsoluteFsPath.resolve(path_1.AbsoluteFsPath.dirname(path_1.AbsoluteFsPath.fromSourceFile(file)), fileName);
                var mappingFile = fs.readFile(filePath);
                externalSourceMap = convert_source_map_1.fromJSON(mappingFile);
            }
            catch (e) {
                if (e.code === 'ENOENT') {
                    logger.warn("The external map file specified in the source code comment \"" + e.path + "\" was not found on the file system.");
                    var mapPath = path_1.AbsoluteFsPath.fromUnchecked(file.fileName + '.map');
                    if (path_1.PathSegment.basename(e.path) !== path_1.PathSegment.basename(mapPath) && fs.exists(mapPath) &&
                        fs.stat(mapPath).isFile()) {
                        logger.warn("Guessing the map file name from the source file name: \"" + path_1.PathSegment.basename(mapPath) + "\"");
                        try {
                            externalSourceMap = convert_source_map_1.fromObject(JSON.parse(fs.readFile(mapPath)));
                        }
                        catch (e) {
                            logger.error(e);
                        }
                    }
                }
            }
            return {
                source: convert_source_map_1.removeMapFileComments(file.text).replace(/\n\n$/, '\n'),
                map: externalSourceMap,
                isInline: false,
            };
        }
        else {
            return { source: file.text, map: null, isInline: false };
        }
    }
    exports.extractSourceMap = extractSourceMap;
    /**
     * Merge the input and output source-maps, replacing the source-map comment in the output file
     * with an appropriate source-map comment pointing to the merged source-map.
     */
    function renderSourceAndMap(sourceFile, input, output) {
        var outputPath = path_1.AbsoluteFsPath.fromSourceFile(sourceFile);
        var outputMapPath = path_1.AbsoluteFsPath.fromUnchecked(outputPath + ".map");
        var relativeSourcePath = path_1.PathSegment.basename(outputPath);
        var relativeMapPath = relativeSourcePath + ".map";
        var outputMap = output.generateMap({
            source: outputPath,
            includeContent: true,
        });
        // we must set this after generation as magic string does "manipulation" on the path
        outputMap.file = relativeSourcePath;
        var mergedMap = mergeSourceMaps(input.map && input.map.toObject(), JSON.parse(outputMap.toString()));
        var result = [];
        if (input.isInline) {
            result.push({ path: outputPath, contents: output.toString() + "\n" + mergedMap.toComment() });
        }
        else {
            result.push({
                path: outputPath,
                contents: output.toString() + "\n" + convert_source_map_1.generateMapFileComment(relativeMapPath)
            });
            result.push({ path: outputMapPath, contents: mergedMap.toJSON() });
        }
        return result;
    }
    exports.renderSourceAndMap = renderSourceAndMap;
    /**
     * Merge the two specified source-maps into a single source-map that hides the intermediate
     * source-map.
     * E.g. Consider these mappings:
     *
     * ```
     * OLD_SRC -> OLD_MAP -> INTERMEDIATE_SRC -> NEW_MAP -> NEW_SRC
     * ```
     *
     * this will be replaced with:
     *
     * ```
     * OLD_SRC -> MERGED_MAP -> NEW_SRC
     * ```
     */
    function mergeSourceMaps(oldMap, newMap) {
        if (!oldMap) {
            return convert_source_map_1.fromObject(newMap);
        }
        var oldMapConsumer = new source_map_1.SourceMapConsumer(oldMap);
        var newMapConsumer = new source_map_1.SourceMapConsumer(newMap);
        var mergedMapGenerator = source_map_1.SourceMapGenerator.fromSourceMap(newMapConsumer);
        mergedMapGenerator.applySourceMap(oldMapConsumer);
        var merged = convert_source_map_1.fromJSON(mergedMapGenerator.toString());
        return merged;
    }
    exports.mergeSourceMaps = mergeSourceMaps;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX21hcHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3NvdXJjZV9tYXBzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gseURBQTBMO0lBRTFMLHlDQUErRTtJQUUvRSw2REFBb0U7SUFXcEU7O09BRUc7SUFDSCxTQUFnQixnQkFBZ0IsQ0FDNUIsRUFBYyxFQUFFLE1BQWMsRUFBRSxJQUFtQjtRQUNyRCxJQUFNLE1BQU0sR0FBRyxpQ0FBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUMsSUFBTSxRQUFRLEdBQUcsd0NBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVyRCxJQUFJLE1BQU0sRUFBRTtZQUNWLElBQU0sZUFBZSxHQUFHLCtCQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlDLE9BQU87Z0JBQ0wsTUFBTSxFQUFFLG1DQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDO2dCQUN4RCxHQUFHLEVBQUUsZUFBZTtnQkFDcEIsUUFBUSxFQUFFLElBQUk7YUFDZixDQUFDO1NBQ0g7YUFBTSxJQUFJLFFBQVEsRUFBRTtZQUNuQixJQUFJLGlCQUFpQixHQUE0QixJQUFJLENBQUM7WUFDdEQsSUFBSTtnQkFDRixJQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM1QyxJQUFNLFFBQVEsR0FBRyxxQkFBYyxDQUFDLE9BQU8sQ0FDbkMscUJBQWMsQ0FBQyxPQUFPLENBQUMscUJBQWMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsRUFB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QVMsRUFBSSxFQUFDLENBQUMsQ0FBQztTQUM3RjthQUFNO1lBQ0wsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDVixJQUFJLEVBQUUsVUFBVTtnQkFDaEIsUUFBUSxFQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsVUFBSywyQ0FBc0IsQ0FBQyxlQUFlLENBQUc7YUFDN0UsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxNQUFNLEVBQUUsRUFBQyxDQUFDLENBQUM7U0FDbEU7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBL0JELGdEQStCQztJQUdEOzs7Ozs7Ozs7Ozs7OztPQWNHO0lBQ0gsU0FBZ0IsZUFBZSxDQUMzQixNQUEyQixFQUFFLE1BQW9CO1FBQ25ELElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDWCxPQUFPLCtCQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDM0I7UUFDRCxJQUFNLGNBQWMsR0FBRyxJQUFJLDhCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JELElBQU0sY0FBYyxHQUFHLElBQUksOEJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckQsSUFBTSxrQkFBa0IsR0FBRywrQkFBa0IsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDNUUsa0JBQWtCLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ2xELElBQU0sTUFBTSxHQUFHLDZCQUFRLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUN2RCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBWEQsMENBV0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1NvdXJjZU1hcENvbnZlcnRlciwgY29tbWVudFJlZ2V4LCBmcm9tSlNPTiwgZnJvbU9iamVjdCwgZnJvbVNvdXJjZSwgZ2VuZXJhdGVNYXBGaWxlQ29tbWVudCwgbWFwRmlsZUNvbW1lbnRSZWdleCwgcmVtb3ZlQ29tbWVudHMsIHJlbW92ZU1hcEZpbGVDb21tZW50c30gZnJvbSAnY29udmVydC1zb3VyY2UtbWFwJztcbmltcG9ydCBNYWdpY1N0cmluZyBmcm9tICdtYWdpYy1zdHJpbmcnO1xuaW1wb3J0IHtSYXdTb3VyY2VNYXAsIFNvdXJjZU1hcENvbnN1bWVyLCBTb3VyY2VNYXBHZW5lcmF0b3J9IGZyb20gJ3NvdXJjZS1tYXAnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBQYXRoU2VnbWVudH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhdGgnO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi9maWxlX3N5c3RlbS9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtGaWxlVG9Xcml0ZX0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU291cmNlTWFwSW5mbyB7XG4gIHNvdXJjZTogc3RyaW5nO1xuICBtYXA6IFNvdXJjZU1hcENvbnZlcnRlcnxudWxsO1xuICBpc0lubGluZTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIG1hcCBmcm9tIHRoZSBzb3VyY2UgKG5vdGUgd2hldGhlciBpdCBpcyBpbmxpbmUgb3IgZXh0ZXJuYWwpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0U291cmNlTWFwKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgZmlsZTogdHMuU291cmNlRmlsZSk6IFNvdXJjZU1hcEluZm8ge1xuICBjb25zdCBpbmxpbmUgPSBjb21tZW50UmVnZXgudGVzdChmaWxlLnRleHQpO1xuICBjb25zdCBleHRlcm5hbCA9IG1hcEZpbGVDb21tZW50UmVnZXguZXhlYyhmaWxlLnRleHQpO1xuXG4gIGlmIChpbmxpbmUpIHtcbiAgICBjb25zdCBpbmxpbmVTb3VyY2VNYXAgPSBmcm9tU291cmNlKGZpbGUudGV4dCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNvdXJjZTogcmVtb3ZlQ29tbWVudHMoZmlsZS50ZXh0KS5yZXBsYWNlKC9cXG5cXG4kLywgJ1xcbicpLFxuICAgICAgbWFwOiBpbmxpbmVTb3VyY2VNYXAsXG4gICAgICBpc0lubGluZTogdHJ1ZSxcbiAgICB9O1xuICB9IGVsc2UgaWYgKGV4dGVybmFsKSB7XG4gICAgbGV0IGV4dGVybmFsU291cmNlTWFwOiBTb3VyY2VNYXBDb252ZXJ0ZXJ8bnVsbCA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGZpbGVOYW1lID0gZXh0ZXJuYWxbMV0gfHwgZXh0ZXJuYWxbMl07XG4gICAgICBjb25zdCBmaWxlUGF0aCA9IEFic29sdXRlRnNQYXRoLnJlc29sdmUoXG4gICAgICAgICAgQWJzb2x1dGVGc1BhdGguZGlybmFtZShBYnNvbHV0ZUZzUGF0aC5mcm9tU291cmNlRmlsZShmaWxlKSksIGZpbGVOYW1lKTtcbiAgICAgIGNvbnN0IG1hcHBpbmdGaWxlID0gZnMucmVhZEZpbGUoZmlsZVBhdGgpO1xuICAgICAgZXh0ZXJuYWxTb3VyY2VNYXAgPSBmcm9tSlNPTihtYXBwaW5nRmlsZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgICBgVGhlIGV4dGVybmFsIG1hcCBmaWxlIHNwZWNpZmllZCBpbiB0aGUgc291cmNlIGNvZGUgY29tbWVudCBcIiR7ZS5wYXRofVwiIHdhcyBub3QgZm91bmQgb24gdGhlIGZpbGUgc3lzdGVtLmApO1xuICAgICAgICBjb25zdCBtYXBQYXRoID0gQWJzb2x1dGVGc1BhdGguZnJvbVVuY2hlY2tlZChmaWxlLmZpbGVOYW1lICsgJy5tYXAnKTtcbiAgICAgICAgaWYgKFBhdGhTZWdtZW50LmJhc2VuYW1lKGUucGF0aCkgIT09IFBhdGhTZWdtZW50LmJhc2VuYW1lKG1hcFBhdGgpICYmIGZzLmV4aXN0cyhtYXBQYXRoKSAmJlxuICAgICAgICAgICAgZnMuc3RhdChtYXBQYXRoKS5pc0ZpbGUoKSkge1xuICAgICAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICBgR3Vlc3NpbmcgdGhlIG1hcCBmaWxlIG5hbWUgZnJvbSB0aGUgc291cmNlIGZpbGUgbmFtZTogXCIke1BhdGhTZWdtZW50LmJhc2VuYW1lKG1hcFBhdGgpfVwiYCk7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGV4dGVybmFsU291cmNlTWFwID0gZnJvbU9iamVjdChKU09OLnBhcnNlKGZzLnJlYWRGaWxlKG1hcFBhdGgpKSk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlOiByZW1vdmVNYXBGaWxlQ29tbWVudHMoZmlsZS50ZXh0KS5yZXBsYWNlKC9cXG5cXG4kLywgJ1xcbicpLFxuICAgICAgbWFwOiBleHRlcm5hbFNvdXJjZU1hcCxcbiAgICAgIGlzSW5saW5lOiBmYWxzZSxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7c291cmNlOiBmaWxlLnRleHQsIG1hcDogbnVsbCwgaXNJbmxpbmU6IGZhbHNlfTtcbiAgfVxufVxuXG4vKipcbiAqIE1lcmdlIHRoZSBpbnB1dCBhbmQgb3V0cHV0IHNvdXJjZS1tYXBzLCByZXBsYWNpbmcgdGhlIHNvdXJjZS1tYXAgY29tbWVudCBpbiB0aGUgb3V0cHV0IGZpbGVcbiAqIHdpdGggYW4gYXBwcm9wcmlhdGUgc291cmNlLW1hcCBjb21tZW50IHBvaW50aW5nIHRvIHRoZSBtZXJnZWQgc291cmNlLW1hcC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclNvdXJjZUFuZE1hcChcbiAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBpbnB1dDogU291cmNlTWFwSW5mbywgb3V0cHV0OiBNYWdpY1N0cmluZyk6IEZpbGVUb1dyaXRlW10ge1xuICBjb25zdCBvdXRwdXRQYXRoID0gQWJzb2x1dGVGc1BhdGguZnJvbVNvdXJjZUZpbGUoc291cmNlRmlsZSk7XG4gIGNvbnN0IG91dHB1dE1hcFBhdGggPSBBYnNvbHV0ZUZzUGF0aC5mcm9tVW5jaGVja2VkKGAke291dHB1dFBhdGh9Lm1hcGApO1xuICBjb25zdCByZWxhdGl2ZVNvdXJjZVBhdGggPSBQYXRoU2VnbWVudC5iYXNlbmFtZShvdXRwdXRQYXRoKTtcbiAgY29uc3QgcmVsYXRpdmVNYXBQYXRoID0gYCR7cmVsYXRpdmVTb3VyY2VQYXRofS5tYXBgO1xuXG4gIGNvbnN0IG91dHB1dE1hcCA9IG91dHB1dC5nZW5lcmF0ZU1hcCh7XG4gICAgc291cmNlOiBvdXRwdXRQYXRoLFxuICAgIGluY2x1ZGVDb250ZW50OiB0cnVlLFxuICAgIC8vIGhpcmVzOiB0cnVlIC8vIFRPRE86IFRoaXMgcmVzdWx0cyBpbiBhY2N1cmF0ZSBidXQgaHVnZSBzb3VyY2VtYXBzLiBJbnN0ZWFkIHdlIHNob3VsZCBmaXhcbiAgICAvLyB0aGUgbWVyZ2UgYWxnb3JpdGhtLlxuICB9KTtcblxuICAvLyB3ZSBtdXN0IHNldCB0aGlzIGFmdGVyIGdlbmVyYXRpb24gYXMgbWFnaWMgc3RyaW5nIGRvZXMgXCJtYW5pcHVsYXRpb25cIiBvbiB0aGUgcGF0aFxuICBvdXRwdXRNYXAuZmlsZSA9IHJlbGF0aXZlU291cmNlUGF0aDtcblxuICBjb25zdCBtZXJnZWRNYXAgPVxuICAgICAgbWVyZ2VTb3VyY2VNYXBzKGlucHV0Lm1hcCAmJiBpbnB1dC5tYXAudG9PYmplY3QoKSwgSlNPTi5wYXJzZShvdXRwdXRNYXAudG9TdHJpbmcoKSkpO1xuXG4gIGNvbnN0IHJlc3VsdDogRmlsZVRvV3JpdGVbXSA9IFtdO1xuICBpZiAoaW5wdXQuaXNJbmxpbmUpIHtcbiAgICByZXN1bHQucHVzaCh7cGF0aDogb3V0cHV0UGF0aCwgY29udGVudHM6IGAke291dHB1dC50b1N0cmluZygpfVxcbiR7bWVyZ2VkTWFwLnRvQ29tbWVudCgpfWB9KTtcbiAgfSBlbHNlIHtcbiAgICByZXN1bHQucHVzaCh7XG4gICAgICBwYXRoOiBvdXRwdXRQYXRoLFxuICAgICAgY29udGVudHM6IGAke291dHB1dC50b1N0cmluZygpfVxcbiR7Z2VuZXJhdGVNYXBGaWxlQ29tbWVudChyZWxhdGl2ZU1hcFBhdGgpfWBcbiAgICB9KTtcbiAgICByZXN1bHQucHVzaCh7cGF0aDogb3V0cHV0TWFwUGF0aCwgY29udGVudHM6IG1lcmdlZE1hcC50b0pTT04oKX0pO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cblxuLyoqXG4gKiBNZXJnZSB0aGUgdHdvIHNwZWNpZmllZCBzb3VyY2UtbWFwcyBpbnRvIGEgc2luZ2xlIHNvdXJjZS1tYXAgdGhhdCBoaWRlcyB0aGUgaW50ZXJtZWRpYXRlXG4gKiBzb3VyY2UtbWFwLlxuICogRS5nLiBDb25zaWRlciB0aGVzZSBtYXBwaW5nczpcbiAqXG4gKiBgYGBcbiAqIE9MRF9TUkMgLT4gT0xEX01BUCAtPiBJTlRFUk1FRElBVEVfU1JDIC0+IE5FV19NQVAgLT4gTkVXX1NSQ1xuICogYGBgXG4gKlxuICogdGhpcyB3aWxsIGJlIHJlcGxhY2VkIHdpdGg6XG4gKlxuICogYGBgXG4gKiBPTERfU1JDIC0+IE1FUkdFRF9NQVAgLT4gTkVXX1NSQ1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZVNvdXJjZU1hcHMoXG4gICAgb2xkTWFwOiBSYXdTb3VyY2VNYXAgfCBudWxsLCBuZXdNYXA6IFJhd1NvdXJjZU1hcCk6IFNvdXJjZU1hcENvbnZlcnRlciB7XG4gIGlmICghb2xkTWFwKSB7XG4gICAgcmV0dXJuIGZyb21PYmplY3QobmV3TWFwKTtcbiAgfVxuICBjb25zdCBvbGRNYXBDb25zdW1lciA9IG5ldyBTb3VyY2VNYXBDb25zdW1lcihvbGRNYXApO1xuICBjb25zdCBuZXdNYXBDb25zdW1lciA9IG5ldyBTb3VyY2VNYXBDb25zdW1lcihuZXdNYXApO1xuICBjb25zdCBtZXJnZWRNYXBHZW5lcmF0b3IgPSBTb3VyY2VNYXBHZW5lcmF0b3IuZnJvbVNvdXJjZU1hcChuZXdNYXBDb25zdW1lcik7XG4gIG1lcmdlZE1hcEdlbmVyYXRvci5hcHBseVNvdXJjZU1hcChvbGRNYXBDb25zdW1lcik7XG4gIGNvbnN0IG1lcmdlZCA9IGZyb21KU09OKG1lcmdlZE1hcEdlbmVyYXRvci50b1N0cmluZygpKTtcbiAgcmV0dXJuIG1lcmdlZDtcbn1cbiJdfQ==