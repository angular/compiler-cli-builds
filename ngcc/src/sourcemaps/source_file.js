(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/sourcemaps/source_file", ["require", "exports", "tslib", "convert-source-map", "sourcemap-codec", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/sourcemaps/segment_marker"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var convert_source_map_1 = require("convert-source-map");
    var sourcemap_codec_1 = require("sourcemap-codec");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var segment_marker_1 = require("@angular/compiler-cli/ngcc/src/sourcemaps/segment_marker");
    function removeSourceMapComments(contents) {
        return convert_source_map_1.removeMapFileComments(convert_source_map_1.removeComments(contents)).replace(/\n\n$/, '\n');
    }
    exports.removeSourceMapComments = removeSourceMapComments;
    var SourceFile = /** @class */ (function () {
        function SourceFile(
        /** The path to this source file. */
        sourcePath, 
        /** The contents of this source file. */
        contents, 
        /** The raw source map (if any) associated with this source file. */
        rawMap, 
        /** Whether this source file's source map was inline or external. */
        inline, 
        /** Any source files referenced by the raw source map associated with this source file. */
        sources) {
            this.sourcePath = sourcePath;
            this.contents = contents;
            this.rawMap = rawMap;
            this.inline = inline;
            this.sources = sources;
            this.contents = removeSourceMapComments(contents);
            this.lineLengths = computeLineLengths(this.contents);
            this.flattenedMappings = this.flattenMappings();
        }
        /**
         * Render the raw source map generated from the flattened mappings.
         */
        SourceFile.prototype.renderFlattenedSourceMap = function () {
            var e_1, _a;
            var sources = [];
            var names = [];
            // Ensure a mapping line array for each line in the generated source.
            var mappings = this.lineLengths.map(function () { return []; });
            try {
                for (var _b = tslib_1.__values(this.flattenedMappings), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var mapping = _c.value;
                    var mappingLine = mappings[mapping.generatedSegment.line];
                    var sourceIndex = findIndexOrAdd(sources, mapping.originalSource);
                    var mappingArray = [
                        mapping.generatedSegment.column,
                        sourceIndex,
                        mapping.originalSegment.line,
                        mapping.originalSegment.column,
                    ];
                    if (mapping.name !== undefined) {
                        var nameIndex = findIndexOrAdd(names, mapping.name);
                        mappingArray.push(nameIndex);
                    }
                    mappingLine.push(mappingArray);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var sourcePathDir = file_system_1.dirname(this.sourcePath);
            var sourceMap = {
                version: 3,
                file: file_system_1.relative(sourcePathDir, this.sourcePath),
                sources: sources.map(function (sf) { return file_system_1.relative(sourcePathDir, sf.sourcePath); }), names: names,
                mappings: sourcemap_codec_1.encode(mappings),
                sourcesContent: sources.map(function (sf) { return sf.contents; }),
            };
            return sourceMap;
        };
        /**
         * Flatten the parsed mappings for this source file, so that all the mappings are to pure original
         * source files with no transitive source maps.
         */
        SourceFile.prototype.flattenMappings = function () {
            var mappings = parseMappings(this.rawMap, this.sources);
            var originalSegments = extractOriginalSegments(mappings);
            var flattenedMappings = [];
            var _loop_1 = function (mappingIndex) {
                var aToBmapping = mappings[mappingIndex];
                var bSource = aToBmapping.originalSource;
                if (bSource.flattenedMappings.length === 0) {
                    // The b source file has no mappings of its own (i.e. it is a pure original file)
                    // so just use the mapping as-is.
                    flattenedMappings.push(aToBmapping);
                    return "continue";
                }
                // The `incomingStart` and `incomingEnd` are the `SegmentMarker`s in `B` that represent the
                // section of `B` source file that is being mapped to by the current `aToBmapping`.
                //
                // For example, consider the mappings from A to B:
                //
                // src A   src B     mapping
                //
                //   a ----- a       [0, 0]
                //   b       b
                //   f -  /- c       [4, 2]
                //   g  \ /  d
                //   c -/\   e
                //   d    \- f       [2, 5]
                //   e
                //
                // For mapping [0,0] the incoming start and end are 0 and 2 (i.e. the range a, b, c)
                // For mapping [4,2] the incoming start and end are 2 and 5 (i.e. the range c, d, e, f)
                //
                var incomingStart = aToBmapping.originalSegment;
                var incomingEndIndex = originalSegments.indexOf(incomingStart) + 1;
                var incomingEnd = incomingEndIndex < originalSegments.length ?
                    originalSegments[incomingEndIndex] :
                    undefined;
                // The `outgoingStartIndex` and `outgoingEndIndex` are the indices of the range of mappings
                // that leave `b` that we are interested in merging with the aToBmapping.
                // We actually care about all the markers from the last bToCmapping directly before the
                // `incomingStart` to the last bToCmaping directly before the `incomingEnd`, inclusive.
                //
                // For example, if we consider the range 2 to 5 from above (i.e. c, d, e, f) with the
                // following mappings from B to C:
                //
                //   src B   src C     mapping
                //     a
                //     b ----- b       [1, 0]
                //   - c       c
                //  |  d       d
                //  |  e ----- 1       [4, 3]
                //   - f  \    2
                //         \   3
                //          \- e       [4, 6]
                //
                // The range with `incomingStart` at 2 and `incomingEnd` at 5 has outgoing start mapping of
                // [1,0] and outgoing end mapping of [4, 6], which also includes [4, 3].
                //
                var outgoingStartIndex = findLastIndex(bSource.flattenedMappings, function (mapping) { return segment_marker_1.compareSegments(mapping.generatedSegment, incomingStart) <= 0; });
                if (outgoingStartIndex < 0) {
                    outgoingStartIndex = 0;
                }
                var outgoingEndIndex = incomingEnd !== undefined ?
                    findLastIndex(bSource.flattenedMappings, function (mapping) { return segment_marker_1.compareSegments(mapping.generatedSegment, incomingEnd) < 0; }) :
                    bSource.flattenedMappings.length - 1;
                for (var bToCmappingIndex = outgoingStartIndex; bToCmappingIndex <= outgoingEndIndex; bToCmappingIndex++) {
                    var bToCmapping = bSource.flattenedMappings[bToCmappingIndex];
                    flattenedMappings.push(mergeMappings(this_1, aToBmapping, bToCmapping));
                }
            };
            var this_1 = this;
            for (var mappingIndex = 0; mappingIndex < mappings.length; mappingIndex++) {
                _loop_1(mappingIndex);
            }
            return flattenedMappings;
        };
        return SourceFile;
    }());
    exports.SourceFile = SourceFile;
    function findLastIndex(items, predicate) {
        for (var index = items.length - 1; index >= 0; index--) {
            if (predicate(items[index])) {
                return index;
            }
        }
        return -1;
    }
    /**
     * Find the index of `item` in the `items` array.
     * If it is not found, then push `item` to the end of the array and return its new index.
     *
     * @param items the collection in which to look for `item`.
     * @param item the item to look for.
     * @returns the index of the `item` in the `items` array.
     */
    function findIndexOrAdd(items, item) {
        var itemIndex = items.indexOf(item);
        if (itemIndex > -1) {
            return itemIndex;
        }
        else {
            items.push(item);
            return items.length - 1;
        }
    }
    /**
     * Merge two mappings that go from A to B and B to C, to result in a mapping that goes from A to C.
     */
    function mergeMappings(generatedSource, ab, bc) {
        var name = bc.name || ab.name;
        // We need to modify the segment-markers of the new mapping to take into account the shifts that
        // occur due to the combination of the two mappings.
        // For example:
        // * Simple map where the B->C starts at the same place the A->B ends:
        //
        // ```
        // A: 1 2 b c d
        //        |        A->B [2,0]
        //        |              |
        // B:     b c d    A->C [2,1]
        //        |                |
        //        |        B->C [0,1]
        // C:   a b c d e
        // ```
        // * More complicated case where diffs of segment-markers is needed:
        //
        // ```
        // A: b 1 2 c d
        //     \
        //      |            A->B  [0,1*]    [0,1*]
        //      |                   |         |+3
        // B: a b 1 2 c d    A->C  [0,1]     [3,2]
        //    |      /                |+1       |
        //    |     /        B->C [0*,0]    [4*,2]
        //    |    /
        // C: a b c d e
        // ```
        //
        // `[0,1]` mapping from A->C:
        // The difference between the "original segment-marker" of A->B (1*) and the "generated
        // segment-marker of B->C (0*): `1 - 0 = +1`.
        // Since it is positive we must increment the "original segment-marker" with `1` to give [0,1].
        //
        // `[3,2]` mapping from A->C:
        // The difference between the "original segment-marker" of A->B (1*) and the "generated
        // segment-marker" of B->C (4*): `1 - 4 = -3`.
        // Since it is negative we must increment the "generated segment-marker" with `3` to give [3,2].
        var diff = segment_marker_1.segmentDiff(ab.originalSource.lineLengths, ab.originalSegment, bc.generatedSegment);
        if (diff > 0) {
            return {
                name: name,
                generatedSegment: segment_marker_1.offsetSegment(generatedSource.lineLengths, ab.generatedSegment, diff),
                originalSource: bc.originalSource,
                originalSegment: bc.originalSegment,
            };
        }
        else {
            return {
                name: name,
                generatedSegment: ab.generatedSegment,
                originalSource: bc.originalSource,
                originalSegment: segment_marker_1.offsetSegment(bc.originalSource.lineLengths, bc.originalSegment, -diff),
            };
        }
    }
    exports.mergeMappings = mergeMappings;
    /**
     * Parse the `rawMappings` into an array of parsed mappings, which reference source-files provided
     * in the `sources` parameter.
     */
    function parseMappings(rawMap, sources) {
        var e_2, _a;
        if (rawMap === null) {
            return [];
        }
        var rawMappings = sourcemap_codec_1.decode(rawMap.mappings);
        if (rawMappings === null) {
            return [];
        }
        var mappings = [];
        for (var generatedLine = 0; generatedLine < rawMappings.length; generatedLine++) {
            var generatedLineMappings = rawMappings[generatedLine];
            try {
                for (var generatedLineMappings_1 = (e_2 = void 0, tslib_1.__values(generatedLineMappings)), generatedLineMappings_1_1 = generatedLineMappings_1.next(); !generatedLineMappings_1_1.done; generatedLineMappings_1_1 = generatedLineMappings_1.next()) {
                    var rawMapping = generatedLineMappings_1_1.value;
                    if (rawMapping.length >= 4) {
                        var generatedColumn = rawMapping[0];
                        var name = rawMapping.length === 5 ? rawMap.names[rawMapping[4]] : undefined;
                        var mapping = {
                            generatedSegment: { line: generatedLine, column: generatedColumn },
                            originalSource: sources[rawMapping[1]],
                            originalSegment: { line: rawMapping[2], column: rawMapping[3] }, name: name
                        };
                        mappings.push(mapping);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (generatedLineMappings_1_1 && !generatedLineMappings_1_1.done && (_a = generatedLineMappings_1.return)) _a.call(generatedLineMappings_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        return mappings;
    }
    exports.parseMappings = parseMappings;
    function extractOriginalSegments(mappings) {
        return mappings.map(function (mapping) { return mapping.originalSegment; }).sort(segment_marker_1.compareSegments);
    }
    exports.extractOriginalSegments = extractOriginalSegments;
    function computeLineLengths(str) {
        return (str.split(/\r?\n/)).map(function (s) { return s.length; });
    }
    exports.computeLineLengths = computeLineLengths;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX2ZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvc291cmNlbWFwcy9zb3VyY2VfZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCx5REFBeUU7SUFDekUsbURBQW9GO0lBQ3BGLDJFQUFpRjtJQUVqRiwyRkFBNEY7SUFFNUYsU0FBZ0IsdUJBQXVCLENBQUMsUUFBZ0I7UUFDdEQsT0FBTywwQ0FBcUIsQ0FBQyxtQ0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRkQsMERBRUM7SUFFRDtRQVdFO1FBQ0ksb0NBQW9DO1FBQzNCLFVBQTBCO1FBQ25DLHdDQUF3QztRQUMvQixRQUFnQjtRQUN6QixvRUFBb0U7UUFDM0QsTUFBeUI7UUFDbEMsb0VBQW9FO1FBQzNELE1BQWU7UUFDeEIsMEZBQTBGO1FBQ2pGLE9BQTRCO1lBUjVCLGVBQVUsR0FBVixVQUFVLENBQWdCO1lBRTFCLGFBQVEsR0FBUixRQUFRLENBQVE7WUFFaEIsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7WUFFekIsV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUVmLFlBQU8sR0FBUCxPQUFPLENBQXFCO1lBQ3ZDLElBQUksQ0FBQyxRQUFRLEdBQUcsdUJBQXVCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDckQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUNsRCxDQUFDO1FBRUQ7O1dBRUc7UUFDSCw2Q0FBd0IsR0FBeEI7O1lBQ0UsSUFBTSxPQUFPLEdBQWlCLEVBQUUsQ0FBQztZQUNq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LENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO3dCQUMvRSxJQUFNLE9BQU8sR0FBWTs0QkFDdkIsZ0JBQWdCLEVBQUUsRUFBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUM7NEJBQ2hFLGNBQWMsRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBRyxDQUFHOzRCQUMxQyxlQUFlLEVBQUUsRUFBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBRyxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFHLEVBQUMsRUFBRSxJQUFJLE1BQUE7eUJBQ3hFLENBQUM7d0JBQ0YsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztxQkFDeEI7aUJBQ0Y7Ozs7Ozs7OztTQUNGO1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQTVCRCxzQ0E0QkM7SUFFRCxTQUFnQix1QkFBdUIsQ0FBQyxRQUFtQjtRQUN6RCxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBQSxPQUFPLElBQUksT0FBQSxPQUFPLENBQUMsZUFBZSxFQUF2QixDQUF1QixDQUFDLENBQUMsSUFBSSxDQUFDLGdDQUFlLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRkQsMERBRUM7SUFFRCxTQUFnQixrQkFBa0IsQ0FBQyxHQUFXO1FBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLE1BQU0sRUFBUixDQUFRLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRkQsZ0RBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge3JlbW92ZUNvbW1lbnRzLCByZW1vdmVNYXBGaWxlQ29tbWVudHN9IGZyb20gJ2NvbnZlcnQtc291cmNlLW1hcCc7XG5pbXBvcnQge1NvdXJjZU1hcE1hcHBpbmdzLCBTb3VyY2VNYXBTZWdtZW50LCBkZWNvZGUsIGVuY29kZX0gZnJvbSAnc291cmNlbWFwLWNvZGVjJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGRpcm5hbWUsIHJlbGF0aXZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtSYXdTb3VyY2VNYXB9IGZyb20gJy4vcmF3X3NvdXJjZV9tYXAnO1xuaW1wb3J0IHtTZWdtZW50TWFya2VyLCBjb21wYXJlU2VnbWVudHMsIG9mZnNldFNlZ21lbnQsIHNlZ21lbnREaWZmfSBmcm9tICcuL3NlZ21lbnRfbWFya2VyJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZVNvdXJjZU1hcENvbW1lbnRzKGNvbnRlbnRzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcmVtb3ZlTWFwRmlsZUNvbW1lbnRzKHJlbW92ZUNvbW1lbnRzKGNvbnRlbnRzKSkucmVwbGFjZSgvXFxuXFxuJC8sICdcXG4nKTtcbn1cblxuZXhwb3J0IGNsYXNzIFNvdXJjZUZpbGUge1xuICAvKipcbiAgICogVGhlIHBhcnNlZCBtYXBwaW5ncyB0aGF0IGhhdmUgYmVlbiBmbGF0dGVuZWQgc28gdGhhdCBhbnkgaW50ZXJtZWRpYXRlIHNvdXJjZSBtYXBwaW5ncyBoYXZlIGJlZW5cbiAgICogZmxhdHRlbmVkLlxuICAgKlxuICAgKiBUaGUgcmVzdWx0IGlzIHRoYXQgYW55IHNvdXJjZSBmaWxlIG1lbnRpb25lZCBpbiB0aGUgZmxhdHRlbmVkIG1hcHBpbmdzIGhhdmUgbm8gc291cmNlIG1hcCAoYXJlXG4gICAqIHB1cmUgb3JpZ2luYWwgc291cmNlIGZpbGVzKS5cbiAgICovXG4gIHJlYWRvbmx5IGZsYXR0ZW5lZE1hcHBpbmdzOiBNYXBwaW5nW107XG4gIHJlYWRvbmx5IGxpbmVMZW5ndGhzOiBudW1iZXJbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBUaGUgcGF0aCB0byB0aGlzIHNvdXJjZSBmaWxlLiAqL1xuICAgICAgcmVhZG9ubHkgc291cmNlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICAvKiogVGhlIGNvbnRlbnRzIG9mIHRoaXMgc291cmNlIGZpbGUuICovXG4gICAgICByZWFkb25seSBjb250ZW50czogc3RyaW5nLFxuICAgICAgLyoqIFRoZSByYXcgc291cmNlIG1hcCAoaWYgYW55KSBhc3NvY2lhdGVkIHdpdGggdGhpcyBzb3VyY2UgZmlsZS4gKi9cbiAgICAgIHJlYWRvbmx5IHJhd01hcDogUmF3U291cmNlTWFwfG51bGwsXG4gICAgICAvKiogV2hldGhlciB0aGlzIHNvdXJjZSBmaWxlJ3Mgc291cmNlIG1hcCB3YXMgaW5saW5lIG9yIGV4dGVybmFsLiAqL1xuICAgICAgcmVhZG9ubHkgaW5saW5lOiBib29sZWFuLFxuICAgICAgLyoqIEFueSBzb3VyY2UgZmlsZXMgcmVmZXJlbmNlZCBieSB0aGUgcmF3IHNvdXJjZSBtYXAgYXNzb2NpYXRlZCB3aXRoIHRoaXMgc291cmNlIGZpbGUuICovXG4gICAgICByZWFkb25seSBzb3VyY2VzOiAoU291cmNlRmlsZXxudWxsKVtdKSB7XG4gICAgdGhpcy5jb250ZW50cyA9IHJlbW92ZVNvdXJjZU1hcENvbW1lbnRzKGNvbnRlbnRzKTtcbiAgICB0aGlzLmxpbmVMZW5ndGhzID0gY29tcHV0ZUxpbmVMZW5ndGhzKHRoaXMuY29udGVudHMpO1xuICAgIHRoaXMuZmxhdHRlbmVkTWFwcGluZ3MgPSB0aGlzLmZsYXR0ZW5NYXBwaW5ncygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciB0aGUgcmF3IHNvdXJjZSBtYXAgZ2VuZXJhdGVkIGZyb20gdGhlIGZsYXR0ZW5lZCBtYXBwaW5ncy5cbiAgICovXG4gIHJlbmRlckZsYXR0ZW5lZFNvdXJjZU1hcCgpOiBSYXdTb3VyY2VNYXAge1xuICAgIGNvbnN0IHNvdXJjZXM6IFNvdXJjZUZpbGVbXSA9IFtdO1xuICAgIGNvbnN0IG5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgLy8gRW5zdXJlIGEgbWFwcGluZyBsaW5lIGFycmF5IGZvciBlYWNoIGxpbmUgaW4gdGhlIGdlbmVyYXRlZCBzb3VyY2UuXG4gICAgY29uc3QgbWFwcGluZ3M6IFNvdXJjZU1hcE1hcHBpbmdzID0gdGhpcy5saW5lTGVuZ3Rocy5tYXAoKCkgPT4gW10pO1xuXG4gICAgZm9yIChjb25zdCBtYXBwaW5nIG9mIHRoaXMuZmxhdHRlbmVkTWFwcGluZ3MpIHtcbiAgICAgIGNvbnN0IG1hcHBpbmdMaW5lID0gbWFwcGluZ3NbbWFwcGluZy5nZW5lcmF0ZWRTZWdtZW50LmxpbmVdO1xuICAgICAgY29uc3Qgc291cmNlSW5kZXggPSBmaW5kSW5kZXhPckFkZChzb3VyY2VzLCBtYXBwaW5nLm9yaWdpbmFsU291cmNlKTtcbiAgICAgIGNvbnN0IG1hcHBpbmdBcnJheTogU291cmNlTWFwU2VnbWVudCA9IFtcbiAgICAgICAgbWFwcGluZy5nZW5lcmF0ZWRTZWdtZW50LmNvbHVtbixcbiAgICAgICAgc291cmNlSW5kZXgsXG4gICAgICAgIG1hcHBpbmcub3JpZ2luYWxTZWdtZW50LmxpbmUsXG4gICAgICAgIG1hcHBpbmcub3JpZ2luYWxTZWdtZW50LmNvbHVtbixcbiAgICAgIF07XG4gICAgICBpZiAobWFwcGluZy5uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgbmFtZUluZGV4ID0gZmluZEluZGV4T3JBZGQobmFtZXMsIG1hcHBpbmcubmFtZSk7XG4gICAgICAgIG1hcHBpbmdBcnJheS5wdXNoKG5hbWVJbmRleCk7XG4gICAgICB9XG4gICAgICBtYXBwaW5nTGluZS5wdXNoKG1hcHBpbmdBcnJheSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc291cmNlUGF0aERpciA9IGRpcm5hbWUodGhpcy5zb3VyY2VQYXRoKTtcbiAgICBjb25zdCBzb3VyY2VNYXA6IFJhd1NvdXJjZU1hcCA9IHtcbiAgICAgIHZlcnNpb246IDMsXG4gICAgICBmaWxlOiByZWxhdGl2ZShzb3VyY2VQYXRoRGlyLCB0aGlzLnNvdXJjZVBhdGgpLFxuICAgICAgc291cmNlczogc291cmNlcy5tYXAoc2YgPT4gcmVsYXRpdmUoc291cmNlUGF0aERpciwgc2Yuc291cmNlUGF0aCkpLCBuYW1lcyxcbiAgICAgIG1hcHBpbmdzOiBlbmNvZGUobWFwcGluZ3MpLFxuICAgICAgc291cmNlc0NvbnRlbnQ6IHNvdXJjZXMubWFwKHNmID0+IHNmLmNvbnRlbnRzKSxcbiAgICB9O1xuICAgIHJldHVybiBzb3VyY2VNYXA7XG4gIH1cblxuICAvKipcbiAgICogRmxhdHRlbiB0aGUgcGFyc2VkIG1hcHBpbmdzIGZvciB0aGlzIHNvdXJjZSBmaWxlLCBzbyB0aGF0IGFsbCB0aGUgbWFwcGluZ3MgYXJlIHRvIHB1cmUgb3JpZ2luYWxcbiAgICogc291cmNlIGZpbGVzIHdpdGggbm8gdHJhbnNpdGl2ZSBzb3VyY2UgbWFwcy5cbiAgICovXG4gIHByaXZhdGUgZmxhdHRlbk1hcHBpbmdzKCk6IE1hcHBpbmdbXSB7XG4gICAgY29uc3QgbWFwcGluZ3MgPSBwYXJzZU1hcHBpbmdzKHRoaXMucmF3TWFwLCB0aGlzLnNvdXJjZXMpO1xuICAgIGNvbnN0IG9yaWdpbmFsU2VnbWVudHMgPSBleHRyYWN0T3JpZ2luYWxTZWdtZW50cyhtYXBwaW5ncyk7XG4gICAgY29uc3QgZmxhdHRlbmVkTWFwcGluZ3M6IE1hcHBpbmdbXSA9IFtdO1xuICAgIGZvciAobGV0IG1hcHBpbmdJbmRleCA9IDA7IG1hcHBpbmdJbmRleCA8IG1hcHBpbmdzLmxlbmd0aDsgbWFwcGluZ0luZGV4KyspIHtcbiAgICAgIGNvbnN0IGFUb0JtYXBwaW5nID0gbWFwcGluZ3NbbWFwcGluZ0luZGV4XTtcbiAgICAgIGNvbnN0IGJTb3VyY2UgPSBhVG9CbWFwcGluZy5vcmlnaW5hbFNvdXJjZTtcbiAgICAgIGlmIChiU291cmNlLmZsYXR0ZW5lZE1hcHBpbmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyBUaGUgYiBzb3VyY2UgZmlsZSBoYXMgbm8gbWFwcGluZ3Mgb2YgaXRzIG93biAoaS5lLiBpdCBpcyBhIHB1cmUgb3JpZ2luYWwgZmlsZSlcbiAgICAgICAgLy8gc28ganVzdCB1c2UgdGhlIG1hcHBpbmcgYXMtaXMuXG4gICAgICAgIGZsYXR0ZW5lZE1hcHBpbmdzLnB1c2goYVRvQm1hcHBpbmcpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIGBpbmNvbWluZ1N0YXJ0YCBhbmQgYGluY29taW5nRW5kYCBhcmUgdGhlIGBTZWdtZW50TWFya2VyYHMgaW4gYEJgIHRoYXQgcmVwcmVzZW50IHRoZVxuICAgICAgLy8gc2VjdGlvbiBvZiBgQmAgc291cmNlIGZpbGUgdGhhdCBpcyBiZWluZyBtYXBwZWQgdG8gYnkgdGhlIGN1cnJlbnQgYGFUb0JtYXBwaW5nYC5cbiAgICAgIC8vXG4gICAgICAvLyBGb3IgZXhhbXBsZSwgY29uc2lkZXIgdGhlIG1hcHBpbmdzIGZyb20gQSB0byBCOlxuICAgICAgLy9cbiAgICAgIC8vIHNyYyBBICAgc3JjIEIgICAgIG1hcHBpbmdcbiAgICAgIC8vXG4gICAgICAvLyAgIGEgLS0tLS0gYSAgICAgICBbMCwgMF1cbiAgICAgIC8vICAgYiAgICAgICBiXG4gICAgICAvLyAgIGYgLSAgLy0gYyAgICAgICBbNCwgMl1cbiAgICAgIC8vICAgZyAgXFwgLyAgZFxuICAgICAgLy8gICBjIC0vXFwgICBlXG4gICAgICAvLyAgIGQgICAgXFwtIGYgICAgICAgWzIsIDVdXG4gICAgICAvLyAgIGVcbiAgICAgIC8vXG4gICAgICAvLyBGb3IgbWFwcGluZyBbMCwwXSB0aGUgaW5jb21pbmcgc3RhcnQgYW5kIGVuZCBhcmUgMCBhbmQgMiAoaS5lLiB0aGUgcmFuZ2UgYSwgYiwgYylcbiAgICAgIC8vIEZvciBtYXBwaW5nIFs0LDJdIHRoZSBpbmNvbWluZyBzdGFydCBhbmQgZW5kIGFyZSAyIGFuZCA1IChpLmUuIHRoZSByYW5nZSBjLCBkLCBlLCBmKVxuICAgICAgLy9cbiAgICAgIGNvbnN0IGluY29taW5nU3RhcnQgPSBhVG9CbWFwcGluZy5vcmlnaW5hbFNlZ21lbnQ7XG4gICAgICBjb25zdCBpbmNvbWluZ0VuZEluZGV4ID0gb3JpZ2luYWxTZWdtZW50cy5pbmRleE9mKGluY29taW5nU3RhcnQpICsgMTtcbiAgICAgIGNvbnN0IGluY29taW5nRW5kID0gaW5jb21pbmdFbmRJbmRleCA8IG9yaWdpbmFsU2VnbWVudHMubGVuZ3RoID9cbiAgICAgICAgICBvcmlnaW5hbFNlZ21lbnRzW2luY29taW5nRW5kSW5kZXhdIDpcbiAgICAgICAgICB1bmRlZmluZWQ7XG5cbiAgICAgIC8vIFRoZSBgb3V0Z29pbmdTdGFydEluZGV4YCBhbmQgYG91dGdvaW5nRW5kSW5kZXhgIGFyZSB0aGUgaW5kaWNlcyBvZiB0aGUgcmFuZ2Ugb2YgbWFwcGluZ3NcbiAgICAgIC8vIHRoYXQgbGVhdmUgYGJgIHRoYXQgd2UgYXJlIGludGVyZXN0ZWQgaW4gbWVyZ2luZyB3aXRoIHRoZSBhVG9CbWFwcGluZy5cbiAgICAgIC8vIFdlIGFjdHVhbGx5IGNhcmUgYWJvdXQgYWxsIHRoZSBtYXJrZXJzIGZyb20gdGhlIGxhc3QgYlRvQ21hcHBpbmcgZGlyZWN0bHkgYmVmb3JlIHRoZVxuICAgICAgLy8gYGluY29taW5nU3RhcnRgIHRvIHRoZSBsYXN0IGJUb0NtYXBpbmcgZGlyZWN0bHkgYmVmb3JlIHRoZSBgaW5jb21pbmdFbmRgLCBpbmNsdXNpdmUuXG4gICAgICAvL1xuICAgICAgLy8gRm9yIGV4YW1wbGUsIGlmIHdlIGNvbnNpZGVyIHRoZSByYW5nZSAyIHRvIDUgZnJvbSBhYm92ZSAoaS5lLiBjLCBkLCBlLCBmKSB3aXRoIHRoZVxuICAgICAgLy8gZm9sbG93aW5nIG1hcHBpbmdzIGZyb20gQiB0byBDOlxuICAgICAgLy9cbiAgICAgIC8vICAgc3JjIEIgICBzcmMgQyAgICAgbWFwcGluZ1xuICAgICAgLy8gICAgIGFcbiAgICAgIC8vICAgICBiIC0tLS0tIGIgICAgICAgWzEsIDBdXG4gICAgICAvLyAgIC0gYyAgICAgICBjXG4gICAgICAvLyAgfCAgZCAgICAgICBkXG4gICAgICAvLyAgfCAgZSAtLS0tLSAxICAgICAgIFs0LCAzXVxuICAgICAgLy8gICAtIGYgIFxcICAgIDJcbiAgICAgIC8vICAgICAgICAgXFwgICAzXG4gICAgICAvLyAgICAgICAgICBcXC0gZSAgICAgICBbNCwgNl1cbiAgICAgIC8vXG4gICAgICAvLyBUaGUgcmFuZ2Ugd2l0aCBgaW5jb21pbmdTdGFydGAgYXQgMiBhbmQgYGluY29taW5nRW5kYCBhdCA1IGhhcyBvdXRnb2luZyBzdGFydCBtYXBwaW5nIG9mXG4gICAgICAvLyBbMSwwXSBhbmQgb3V0Z29pbmcgZW5kIG1hcHBpbmcgb2YgWzQsIDZdLCB3aGljaCBhbHNvIGluY2x1ZGVzIFs0LCAzXS5cbiAgICAgIC8vXG4gICAgICBsZXQgb3V0Z29pbmdTdGFydEluZGV4ID0gZmluZExhc3RJbmRleChcbiAgICAgICAgICBiU291cmNlLmZsYXR0ZW5lZE1hcHBpbmdzLFxuICAgICAgICAgIG1hcHBpbmcgPT4gY29tcGFyZVNlZ21lbnRzKG1hcHBpbmcuZ2VuZXJhdGVkU2VnbWVudCwgaW5jb21pbmdTdGFydCkgPD0gMCk7XG4gICAgICBpZiAob3V0Z29pbmdTdGFydEluZGV4IDwgMCkge1xuICAgICAgICBvdXRnb2luZ1N0YXJ0SW5kZXggPSAwO1xuICAgICAgfVxuICAgICAgY29uc3Qgb3V0Z29pbmdFbmRJbmRleCA9IGluY29taW5nRW5kICE9PSB1bmRlZmluZWQgP1xuICAgICAgICAgIGZpbmRMYXN0SW5kZXgoXG4gICAgICAgICAgICAgIGJTb3VyY2UuZmxhdHRlbmVkTWFwcGluZ3MsXG4gICAgICAgICAgICAgIG1hcHBpbmcgPT4gY29tcGFyZVNlZ21lbnRzKG1hcHBpbmcuZ2VuZXJhdGVkU2VnbWVudCwgaW5jb21pbmdFbmQpIDwgMCkgOlxuICAgICAgICAgIGJTb3VyY2UuZmxhdHRlbmVkTWFwcGluZ3MubGVuZ3RoIC0gMTtcblxuICAgICAgZm9yIChsZXQgYlRvQ21hcHBpbmdJbmRleCA9IG91dGdvaW5nU3RhcnRJbmRleDsgYlRvQ21hcHBpbmdJbmRleCA8PSBvdXRnb2luZ0VuZEluZGV4O1xuICAgICAgICAgICBiVG9DbWFwcGluZ0luZGV4KyspIHtcbiAgICAgICAgY29uc3QgYlRvQ21hcHBpbmc6IE1hcHBpbmcgPSBiU291cmNlLmZsYXR0ZW5lZE1hcHBpbmdzW2JUb0NtYXBwaW5nSW5kZXhdO1xuICAgICAgICBmbGF0dGVuZWRNYXBwaW5ncy5wdXNoKG1lcmdlTWFwcGluZ3ModGhpcywgYVRvQm1hcHBpbmcsIGJUb0NtYXBwaW5nKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmbGF0dGVuZWRNYXBwaW5ncztcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kTGFzdEluZGV4PFQ+KGl0ZW1zOiBUW10sIHByZWRpY2F0ZTogKGl0ZW06IFQpID0+IGJvb2xlYW4pOiBudW1iZXIge1xuICBmb3IgKGxldCBpbmRleCA9IGl0ZW1zLmxlbmd0aCAtIDE7IGluZGV4ID49IDA7IGluZGV4LS0pIHtcbiAgICBpZiAocHJlZGljYXRlKGl0ZW1zW2luZGV4XSkpIHtcbiAgICAgIHJldHVybiBpbmRleDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIC0xO1xufVxuXG4vKipcbiAqIEEgTWFwcGluZyBjb25zaXN0cyBvZiB0d28gc2VnbWVudCBtYXJrZXJzOiBvbmUgaW4gdGhlIGdlbmVyYXRlZCBzb3VyY2UgYW5kIG9uZSBpbiB0aGUgb3JpZ2luYWxcbiAqIHNvdXJjZSwgd2hpY2ggaW5kaWNhdGUgdGhlIHN0YXJ0IG9mIGVhY2ggc2VnbWVudC4gVGhlIGVuZCBvZiBhIHNlZ21lbnQgaXMgaW5kaWNhdGVkIGJ5IHRoZSBmaXJzdFxuICogc2VnbWVudCBtYXJrZXIgb2YgYW5vdGhlciBtYXBwaW5nIHdob3NlIHN0YXJ0IGlzIGdyZWF0ZXIgb3IgZXF1YWwgdG8gdGhpcyBvbmUuXG4gKlxuICogSXQgbWF5IGFsc28gaW5jbHVkZSBhIG5hbWUgYXNzb2NpYXRlZCB3aXRoIHRoZSBzZWdtZW50IGJlaW5nIG1hcHBlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNYXBwaW5nIHtcbiAgcmVhZG9ubHkgZ2VuZXJhdGVkU2VnbWVudDogU2VnbWVudE1hcmtlcjtcbiAgcmVhZG9ubHkgb3JpZ2luYWxTb3VyY2U6IFNvdXJjZUZpbGU7XG4gIHJlYWRvbmx5IG9yaWdpbmFsU2VnbWVudDogU2VnbWVudE1hcmtlcjtcbiAgcmVhZG9ubHkgbmFtZT86IHN0cmluZztcbn1cblxuLyoqXG4gKiBGaW5kIHRoZSBpbmRleCBvZiBgaXRlbWAgaW4gdGhlIGBpdGVtc2AgYXJyYXkuXG4gKiBJZiBpdCBpcyBub3QgZm91bmQsIHRoZW4gcHVzaCBgaXRlbWAgdG8gdGhlIGVuZCBvZiB0aGUgYXJyYXkgYW5kIHJldHVybiBpdHMgbmV3IGluZGV4LlxuICpcbiAqIEBwYXJhbSBpdGVtcyB0aGUgY29sbGVjdGlvbiBpbiB3aGljaCB0byBsb29rIGZvciBgaXRlbWAuXG4gKiBAcGFyYW0gaXRlbSB0aGUgaXRlbSB0byBsb29rIGZvci5cbiAqIEByZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgYGl0ZW1gIGluIHRoZSBgaXRlbXNgIGFycmF5LlxuICovXG5mdW5jdGlvbiBmaW5kSW5kZXhPckFkZDxUPihpdGVtczogVFtdLCBpdGVtOiBUKTogbnVtYmVyIHtcbiAgY29uc3QgaXRlbUluZGV4ID0gaXRlbXMuaW5kZXhPZihpdGVtKTtcbiAgaWYgKGl0ZW1JbmRleCA+IC0xKSB7XG4gICAgcmV0dXJuIGl0ZW1JbmRleDtcbiAgfSBlbHNlIHtcbiAgICBpdGVtcy5wdXNoKGl0ZW0pO1xuICAgIHJldHVybiBpdGVtcy5sZW5ndGggLSAxO1xuICB9XG59XG5cblxuLyoqXG4gKiBNZXJnZSB0d28gbWFwcGluZ3MgdGhhdCBnbyBmcm9tIEEgdG8gQiBhbmQgQiB0byBDLCB0byByZXN1bHQgaW4gYSBtYXBwaW5nIHRoYXQgZ29lcyBmcm9tIEEgdG8gQy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlTWFwcGluZ3MoZ2VuZXJhdGVkU291cmNlOiBTb3VyY2VGaWxlLCBhYjogTWFwcGluZywgYmM6IE1hcHBpbmcpOiBNYXBwaW5nIHtcbiAgY29uc3QgbmFtZSA9IGJjLm5hbWUgfHwgYWIubmFtZTtcblxuICAvLyBXZSBuZWVkIHRvIG1vZGlmeSB0aGUgc2VnbWVudC1tYXJrZXJzIG9mIHRoZSBuZXcgbWFwcGluZyB0byB0YWtlIGludG8gYWNjb3VudCB0aGUgc2hpZnRzIHRoYXRcbiAgLy8gb2NjdXIgZHVlIHRvIHRoZSBjb21iaW5hdGlvbiBvZiB0aGUgdHdvIG1hcHBpbmdzLlxuICAvLyBGb3IgZXhhbXBsZTpcblxuICAvLyAqIFNpbXBsZSBtYXAgd2hlcmUgdGhlIEItPkMgc3RhcnRzIGF0IHRoZSBzYW1lIHBsYWNlIHRoZSBBLT5CIGVuZHM6XG4gIC8vXG4gIC8vIGBgYFxuICAvLyBBOiAxIDIgYiBjIGRcbiAgLy8gICAgICAgIHwgICAgICAgIEEtPkIgWzIsMF1cbiAgLy8gICAgICAgIHwgICAgICAgICAgICAgIHxcbiAgLy8gQjogICAgIGIgYyBkICAgIEEtPkMgWzIsMV1cbiAgLy8gICAgICAgIHwgICAgICAgICAgICAgICAgfFxuICAvLyAgICAgICAgfCAgICAgICAgQi0+QyBbMCwxXVxuICAvLyBDOiAgIGEgYiBjIGQgZVxuICAvLyBgYGBcblxuICAvLyAqIE1vcmUgY29tcGxpY2F0ZWQgY2FzZSB3aGVyZSBkaWZmcyBvZiBzZWdtZW50LW1hcmtlcnMgaXMgbmVlZGVkOlxuICAvL1xuICAvLyBgYGBcbiAgLy8gQTogYiAxIDIgYyBkXG4gIC8vICAgICBcXFxuICAvLyAgICAgIHwgICAgICAgICAgICBBLT5CICBbMCwxKl0gICAgWzAsMSpdXG4gIC8vICAgICAgfCAgICAgICAgICAgICAgICAgICB8ICAgICAgICAgfCszXG4gIC8vIEI6IGEgYiAxIDIgYyBkICAgIEEtPkMgIFswLDFdICAgICBbMywyXVxuICAvLyAgICB8ICAgICAgLyAgICAgICAgICAgICAgICB8KzEgICAgICAgfFxuICAvLyAgICB8ICAgICAvICAgICAgICBCLT5DIFswKiwwXSAgICBbNCosMl1cbiAgLy8gICAgfCAgICAvXG4gIC8vIEM6IGEgYiBjIGQgZVxuICAvLyBgYGBcbiAgLy9cbiAgLy8gYFswLDFdYCBtYXBwaW5nIGZyb20gQS0+QzpcbiAgLy8gVGhlIGRpZmZlcmVuY2UgYmV0d2VlbiB0aGUgXCJvcmlnaW5hbCBzZWdtZW50LW1hcmtlclwiIG9mIEEtPkIgKDEqKSBhbmQgdGhlIFwiZ2VuZXJhdGVkXG4gIC8vIHNlZ21lbnQtbWFya2VyIG9mIEItPkMgKDAqKTogYDEgLSAwID0gKzFgLlxuICAvLyBTaW5jZSBpdCBpcyBwb3NpdGl2ZSB3ZSBtdXN0IGluY3JlbWVudCB0aGUgXCJvcmlnaW5hbCBzZWdtZW50LW1hcmtlclwiIHdpdGggYDFgIHRvIGdpdmUgWzAsMV0uXG4gIC8vXG4gIC8vIGBbMywyXWAgbWFwcGluZyBmcm9tIEEtPkM6XG4gIC8vIFRoZSBkaWZmZXJlbmNlIGJldHdlZW4gdGhlIFwib3JpZ2luYWwgc2VnbWVudC1tYXJrZXJcIiBvZiBBLT5CICgxKikgYW5kIHRoZSBcImdlbmVyYXRlZFxuICAvLyBzZWdtZW50LW1hcmtlclwiIG9mIEItPkMgKDQqKTogYDEgLSA0ID0gLTNgLlxuICAvLyBTaW5jZSBpdCBpcyBuZWdhdGl2ZSB3ZSBtdXN0IGluY3JlbWVudCB0aGUgXCJnZW5lcmF0ZWQgc2VnbWVudC1tYXJrZXJcIiB3aXRoIGAzYCB0byBnaXZlIFszLDJdLlxuXG4gIGNvbnN0IGRpZmYgPSBzZWdtZW50RGlmZihhYi5vcmlnaW5hbFNvdXJjZS5saW5lTGVuZ3RocywgYWIub3JpZ2luYWxTZWdtZW50LCBiYy5nZW5lcmF0ZWRTZWdtZW50KTtcbiAgaWYgKGRpZmYgPiAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICBnZW5lcmF0ZWRTZWdtZW50OiBvZmZzZXRTZWdtZW50KGdlbmVyYXRlZFNvdXJjZS5saW5lTGVuZ3RocywgYWIuZ2VuZXJhdGVkU2VnbWVudCwgZGlmZiksXG4gICAgICBvcmlnaW5hbFNvdXJjZTogYmMub3JpZ2luYWxTb3VyY2UsXG4gICAgICBvcmlnaW5hbFNlZ21lbnQ6IGJjLm9yaWdpbmFsU2VnbWVudCxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgZ2VuZXJhdGVkU2VnbWVudDogYWIuZ2VuZXJhdGVkU2VnbWVudCxcbiAgICAgIG9yaWdpbmFsU291cmNlOiBiYy5vcmlnaW5hbFNvdXJjZSxcbiAgICAgIG9yaWdpbmFsU2VnbWVudDogb2Zmc2V0U2VnbWVudChiYy5vcmlnaW5hbFNvdXJjZS5saW5lTGVuZ3RocywgYmMub3JpZ2luYWxTZWdtZW50LCAtZGlmZiksXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIFBhcnNlIHRoZSBgcmF3TWFwcGluZ3NgIGludG8gYW4gYXJyYXkgb2YgcGFyc2VkIG1hcHBpbmdzLCB3aGljaCByZWZlcmVuY2Ugc291cmNlLWZpbGVzIHByb3ZpZGVkXG4gKiBpbiB0aGUgYHNvdXJjZXNgIHBhcmFtZXRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTWFwcGluZ3MoXG4gICAgcmF3TWFwOiBSYXdTb3VyY2VNYXAgfCBudWxsLCBzb3VyY2VzOiAoU291cmNlRmlsZSB8IG51bGwpW10pOiBNYXBwaW5nW10ge1xuICBpZiAocmF3TWFwID09PSBudWxsKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgY29uc3QgcmF3TWFwcGluZ3MgPSBkZWNvZGUocmF3TWFwLm1hcHBpbmdzKTtcbiAgaWYgKHJhd01hcHBpbmdzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgY29uc3QgbWFwcGluZ3M6IE1hcHBpbmdbXSA9IFtdO1xuICBmb3IgKGxldCBnZW5lcmF0ZWRMaW5lID0gMDsgZ2VuZXJhdGVkTGluZSA8IHJhd01hcHBpbmdzLmxlbmd0aDsgZ2VuZXJhdGVkTGluZSsrKSB7XG4gICAgY29uc3QgZ2VuZXJhdGVkTGluZU1hcHBpbmdzID0gcmF3TWFwcGluZ3NbZ2VuZXJhdGVkTGluZV07XG4gICAgZm9yIChjb25zdCByYXdNYXBwaW5nIG9mIGdlbmVyYXRlZExpbmVNYXBwaW5ncykge1xuICAgICAgaWYgKHJhd01hcHBpbmcubGVuZ3RoID49IDQpIHtcbiAgICAgICAgY29uc3QgZ2VuZXJhdGVkQ29sdW1uID0gcmF3TWFwcGluZ1swXTtcbiAgICAgICAgY29uc3QgbmFtZSA9IHJhd01hcHBpbmcubGVuZ3RoID09PSA1ID8gcmF3TWFwLm5hbWVzW3Jhd01hcHBpbmdbNF1dIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBtYXBwaW5nOiBNYXBwaW5nID0ge1xuICAgICAgICAgIGdlbmVyYXRlZFNlZ21lbnQ6IHtsaW5lOiBnZW5lcmF0ZWRMaW5lLCBjb2x1bW46IGdlbmVyYXRlZENvbHVtbn0sXG4gICAgICAgICAgb3JpZ2luYWxTb3VyY2U6IHNvdXJjZXNbcmF3TWFwcGluZ1sxXSAhXSAhLFxuICAgICAgICAgIG9yaWdpbmFsU2VnbWVudDoge2xpbmU6IHJhd01hcHBpbmdbMl0gISwgY29sdW1uOiByYXdNYXBwaW5nWzNdICF9LCBuYW1lXG4gICAgICAgIH07XG4gICAgICAgIG1hcHBpbmdzLnB1c2gobWFwcGluZyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBtYXBwaW5ncztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RPcmlnaW5hbFNlZ21lbnRzKG1hcHBpbmdzOiBNYXBwaW5nW10pOiBTZWdtZW50TWFya2VyW10ge1xuICByZXR1cm4gbWFwcGluZ3MubWFwKG1hcHBpbmcgPT4gbWFwcGluZy5vcmlnaW5hbFNlZ21lbnQpLnNvcnQoY29tcGFyZVNlZ21lbnRzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVMaW5lTGVuZ3RocyhzdHI6IHN0cmluZyk6IG51bWJlcltdIHtcbiAgcmV0dXJuIChzdHIuc3BsaXQoL1xccj9cXG4vKSkubWFwKHMgPT4gcy5sZW5ndGgpO1xufVxuIl19