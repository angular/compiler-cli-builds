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
            this.startOfLinePositions = computeStartOfLinePositions(this.contents);
            this.flattenedMappings = this.flattenMappings();
        }
        /**
         * Render the raw source map generated from the flattened mappings.
         */
        SourceFile.prototype.renderFlattenedSourceMap = function () {
            var e_1, _a;
            var sources = [];
            var names = [];
            var mappings = [];
            try {
                for (var _b = tslib_1.__values(this.flattenedMappings), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var mapping = _c.value;
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
                    // Ensure a mapping line array for this mapping.
                    var line = mapping.generatedSegment.line;
                    while (line >= mappings.length) {
                        mappings.push([]);
                    }
                    // Add this mapping to the line
                    mappings[line].push(mappingArray);
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
            var mappings = parseMappings(this.rawMap, this.sources, this.startOfLinePositions);
            ensureOriginalSegmentLinks(mappings);
            var flattenedMappings = [];
            for (var mappingIndex = 0; mappingIndex < mappings.length; mappingIndex++) {
                var aToBmapping = mappings[mappingIndex];
                var bSource = aToBmapping.originalSource;
                if (bSource.flattenedMappings.length === 0) {
                    // The b source file has no mappings of its own (i.e. it is a pure original file)
                    // so just use the mapping as-is.
                    flattenedMappings.push(aToBmapping);
                    continue;
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
                var incomingEnd = incomingStart.next;
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
                var outgoingStartIndex = findLastMappingIndexBefore(bSource.flattenedMappings, incomingStart, false, 0);
                if (outgoingStartIndex < 0) {
                    outgoingStartIndex = 0;
                }
                var outgoingEndIndex = incomingEnd !== undefined ?
                    findLastMappingIndexBefore(bSource.flattenedMappings, incomingEnd, true, outgoingStartIndex) :
                    bSource.flattenedMappings.length - 1;
                for (var bToCmappingIndex = outgoingStartIndex; bToCmappingIndex <= outgoingEndIndex; bToCmappingIndex++) {
                    var bToCmapping = bSource.flattenedMappings[bToCmappingIndex];
                    flattenedMappings.push(mergeMappings(this, aToBmapping, bToCmapping));
                }
            }
            return flattenedMappings;
        };
        return SourceFile;
    }());
    exports.SourceFile = SourceFile;
    /**
     *
     * @param mappings The collection of mappings whose segment-markers we are searching.
     * @param marker The segment-marker to match against those of the given `mappings`.
     * @param exclusive If exclusive then we must find a mapping with a segment-marker that is
     * exclusively earlier than the given `marker`.
     * If not exclusive then we can return the highest mappings with an equivalent segment-marker to the
     * given `marker`.
     * @param lowerIndex If provided, this is used as a hint that the marker we are searching for has an
     * index that is no lower than this.
     */
    function findLastMappingIndexBefore(mappings, marker, exclusive, lowerIndex) {
        var upperIndex = mappings.length - 1;
        var test = exclusive ? -1 : 0;
        if (segment_marker_1.compareSegments(mappings[lowerIndex].generatedSegment, marker) > test) {
            // Exit early since the marker is outside the allowed range of mappings.
            return -1;
        }
        var matchingIndex = -1;
        while (lowerIndex <= upperIndex) {
            var index = (upperIndex + lowerIndex) >> 1;
            if (segment_marker_1.compareSegments(mappings[index].generatedSegment, marker) <= test) {
                matchingIndex = index;
                lowerIndex = index + 1;
            }
            else {
                upperIndex = index - 1;
            }
        }
        return matchingIndex;
    }
    exports.findLastMappingIndexBefore = findLastMappingIndexBefore;
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
        var diff = segment_marker_1.compareSegments(bc.generatedSegment, ab.originalSegment);
        if (diff > 0) {
            return {
                name: name,
                generatedSegment: segment_marker_1.offsetSegment(generatedSource.startOfLinePositions, ab.generatedSegment, diff),
                originalSource: bc.originalSource,
                originalSegment: bc.originalSegment,
            };
        }
        else {
            return {
                name: name,
                generatedSegment: ab.generatedSegment,
                originalSource: bc.originalSource,
                originalSegment: segment_marker_1.offsetSegment(bc.originalSource.startOfLinePositions, bc.originalSegment, -diff),
            };
        }
    }
    exports.mergeMappings = mergeMappings;
    /**
     * Parse the `rawMappings` into an array of parsed mappings, which reference source-files provided
     * in the `sources` parameter.
     */
    function parseMappings(rawMap, sources, generatedSourceStartOfLinePositions) {
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
                        var originalSource = sources[rawMapping[1]];
                        if (originalSource === null || originalSource === undefined) {
                            // the original source is missing so ignore this mapping
                            continue;
                        }
                        var generatedColumn = rawMapping[0];
                        var name = rawMapping.length === 5 ? rawMap.names[rawMapping[4]] : undefined;
                        var line = rawMapping[2];
                        var column = rawMapping[3];
                        var generatedSegment = {
                            line: generatedLine,
                            column: generatedColumn,
                            position: generatedSourceStartOfLinePositions[generatedLine] + generatedColumn,
                            next: undefined,
                        };
                        var originalSegment = {
                            line: line,
                            column: column,
                            position: originalSource.startOfLinePositions[line] + column,
                            next: undefined,
                        };
                        mappings.push({ name: name, generatedSegment: generatedSegment, originalSegment: originalSegment, originalSource: originalSource });
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
    /**
     * Extract the segment markers from the original source files in each mapping of an array of
     * `mappings`.
     *
     * @param mappings The mappings whose original segments we want to extract
     * @returns Return a map from original source-files (referenced in the `mappings`) to arrays of
     * segment-markers sorted by their order in their source file.
     */
    function extractOriginalSegments(mappings) {
        var e_3, _a;
        var originalSegments = new Map();
        try {
            for (var mappings_1 = tslib_1.__values(mappings), mappings_1_1 = mappings_1.next(); !mappings_1_1.done; mappings_1_1 = mappings_1.next()) {
                var mapping = mappings_1_1.value;
                var originalSource = mapping.originalSource;
                if (!originalSegments.has(originalSource)) {
                    originalSegments.set(originalSource, []);
                }
                var segments = originalSegments.get(originalSource);
                segments.push(mapping.originalSegment);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (mappings_1_1 && !mappings_1_1.done && (_a = mappings_1.return)) _a.call(mappings_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        originalSegments.forEach(function (segmentMarkers) { return segmentMarkers.sort(segment_marker_1.compareSegments); });
        return originalSegments;
    }
    exports.extractOriginalSegments = extractOriginalSegments;
    /**
     * Update the original segments of each of the given `mappings` to include a link to the next
     * segment in the source file.
     *
     * @param mappings the mappings whose segments should be updated
     */
    function ensureOriginalSegmentLinks(mappings) {
        var segmentsBySource = extractOriginalSegments(mappings);
        segmentsBySource.forEach(function (markers) {
            for (var i = 0; i < markers.length - 1; i++) {
                markers[i].next = markers[i + 1];
            }
        });
    }
    exports.ensureOriginalSegmentLinks = ensureOriginalSegmentLinks;
    function computeStartOfLinePositions(str) {
        // The `1` is to indicate a newline character between the lines.
        // Note that in the actual contents there could be more than one character that indicates a
        // newline
        // - e.g. \r\n - but that is not important here since segment-markers are in line/column pairs and
        // so differences in length due to extra `\r` characters do not affect the algorithms.
        var NEWLINE_MARKER_OFFSET = 1;
        var lineLengths = computeLineLengths(str);
        var startPositions = [0]; // First line starts at position 0
        for (var i = 0; i < lineLengths.length - 1; i++) {
            startPositions.push(startPositions[i] + lineLengths[i] + NEWLINE_MARKER_OFFSET);
        }
        return startPositions;
    }
    exports.computeStartOfLinePositions = computeStartOfLinePositions;
    function computeLineLengths(str) {
        return (str.split(/\r?\n/)).map(function (s) { return s.length; });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX2ZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvc291cmNlbWFwcy9zb3VyY2VfZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCx5REFBeUU7SUFDekUsbURBQW9GO0lBRXBGLDJFQUFpRjtJQUdqRiwyRkFBK0U7SUFFL0UsU0FBZ0IsdUJBQXVCLENBQUMsUUFBZ0I7UUFDdEQsT0FBTywwQ0FBcUIsQ0FBQyxtQ0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRkQsMERBRUM7SUFFRDtRQVdFO1FBQ0ksb0NBQW9DO1FBQzNCLFVBQTBCO1FBQ25DLHdDQUF3QztRQUMvQixRQUFnQjtRQUN6QixvRUFBb0U7UUFDM0QsTUFBeUI7UUFDbEMsb0VBQW9FO1FBQzNELE1BQWU7UUFDeEIsMEZBQTBGO1FBQ2pGLE9BQTRCO1lBUjVCLGVBQVUsR0FBVixVQUFVLENBQWdCO1lBRTFCLGFBQVEsR0FBUixRQUFRLENBQVE7WUFFaEIsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7WUFFekIsV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUVmLFlBQU8sR0FBUCxPQUFPLENBQXFCO1lBQ3ZDLElBQUksQ0FBQyxRQUFRLEdBQUcsdUJBQXVCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLDJCQUEyQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ2xELENBQUM7UUFFRDs7V0FFRztRQUNILDZDQUF3QixHQUF4Qjs7WUFDRSxJQUFNLE9BQU8sR0FBaUIsRUFBRSxDQUFDO1lB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LENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzNDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzthQUNsQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQVBELGdFQU9DO0lBRUQsU0FBZ0IsMkJBQTJCLENBQUMsR0FBVztRQUNyRCxnRUFBZ0U7UUFDaEUsMkZBQTJGO1FBQzNGLFVBQVU7UUFDVixrR0FBa0c7UUFDbEcsc0ZBQXNGO1FBQ3RGLElBQU0scUJBQXFCLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLElBQU0sV0FBVyxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVDLElBQU0sY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxrQ0FBa0M7UUFDL0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQy9DLGNBQWMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDO1NBQ2pGO1FBQ0QsT0FBTyxjQUFjLENBQUM7SUFDeEIsQ0FBQztJQWJELGtFQWFDO0lBRUQsU0FBUyxrQkFBa0IsQ0FBQyxHQUFXO1FBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLE1BQU0sRUFBUixDQUFRLENBQUMsQ0FBQztJQUNqRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtyZW1vdmVDb21tZW50cywgcmVtb3ZlTWFwRmlsZUNvbW1lbnRzfSBmcm9tICdjb252ZXJ0LXNvdXJjZS1tYXAnO1xuaW1wb3J0IHtTb3VyY2VNYXBNYXBwaW5ncywgU291cmNlTWFwU2VnbWVudCwgZGVjb2RlLCBlbmNvZGV9IGZyb20gJ3NvdXJjZW1hcC1jb2RlYyc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGRpcm5hbWUsIHJlbGF0aXZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuXG5pbXBvcnQge1Jhd1NvdXJjZU1hcH0gZnJvbSAnLi9yYXdfc291cmNlX21hcCc7XG5pbXBvcnQge1NlZ21lbnRNYXJrZXIsIGNvbXBhcmVTZWdtZW50cywgb2Zmc2V0U2VnbWVudH0gZnJvbSAnLi9zZWdtZW50X21hcmtlcic7XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVTb3VyY2VNYXBDb21tZW50cyhjb250ZW50czogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJlbW92ZU1hcEZpbGVDb21tZW50cyhyZW1vdmVDb21tZW50cyhjb250ZW50cykpLnJlcGxhY2UoL1xcblxcbiQvLCAnXFxuJyk7XG59XG5cbmV4cG9ydCBjbGFzcyBTb3VyY2VGaWxlIHtcbiAgLyoqXG4gICAqIFRoZSBwYXJzZWQgbWFwcGluZ3MgdGhhdCBoYXZlIGJlZW4gZmxhdHRlbmVkIHNvIHRoYXQgYW55IGludGVybWVkaWF0ZSBzb3VyY2UgbWFwcGluZ3MgaGF2ZSBiZWVuXG4gICAqIGZsYXR0ZW5lZC5cbiAgICpcbiAgICogVGhlIHJlc3VsdCBpcyB0aGF0IGFueSBzb3VyY2UgZmlsZSBtZW50aW9uZWQgaW4gdGhlIGZsYXR0ZW5lZCBtYXBwaW5ncyBoYXZlIG5vIHNvdXJjZSBtYXAgKGFyZVxuICAgKiBwdXJlIG9yaWdpbmFsIHNvdXJjZSBmaWxlcykuXG4gICAqL1xuICByZWFkb25seSBmbGF0dGVuZWRNYXBwaW5nczogTWFwcGluZ1tdO1xuICByZWFkb25seSBzdGFydE9mTGluZVBvc2l0aW9uczogbnVtYmVyW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogVGhlIHBhdGggdG8gdGhpcyBzb3VyY2UgZmlsZS4gKi9cbiAgICAgIHJlYWRvbmx5IHNvdXJjZVBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgICAgLyoqIFRoZSBjb250ZW50cyBvZiB0aGlzIHNvdXJjZSBmaWxlLiAqL1xuICAgICAgcmVhZG9ubHkgY29udGVudHM6IHN0cmluZyxcbiAgICAgIC8qKiBUaGUgcmF3IHNvdXJjZSBtYXAgKGlmIGFueSkgYXNzb2NpYXRlZCB3aXRoIHRoaXMgc291cmNlIGZpbGUuICovXG4gICAgICByZWFkb25seSByYXdNYXA6IFJhd1NvdXJjZU1hcHxudWxsLFxuICAgICAgLyoqIFdoZXRoZXIgdGhpcyBzb3VyY2UgZmlsZSdzIHNvdXJjZSBtYXAgd2FzIGlubGluZSBvciBleHRlcm5hbC4gKi9cbiAgICAgIHJlYWRvbmx5IGlubGluZTogYm9vbGVhbixcbiAgICAgIC8qKiBBbnkgc291cmNlIGZpbGVzIHJlZmVyZW5jZWQgYnkgdGhlIHJhdyBzb3VyY2UgbWFwIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHNvdXJjZSBmaWxlLiAqL1xuICAgICAgcmVhZG9ubHkgc291cmNlczogKFNvdXJjZUZpbGV8bnVsbClbXSkge1xuICAgIHRoaXMuY29udGVudHMgPSByZW1vdmVTb3VyY2VNYXBDb21tZW50cyhjb250ZW50cyk7XG4gICAgdGhpcy5zdGFydE9mTGluZVBvc2l0aW9ucyA9IGNvbXB1dGVTdGFydE9mTGluZVBvc2l0aW9ucyh0aGlzLmNvbnRlbnRzKTtcbiAgICB0aGlzLmZsYXR0ZW5lZE1hcHBpbmdzID0gdGhpcy5mbGF0dGVuTWFwcGluZ3MoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgdGhlIHJhdyBzb3VyY2UgbWFwIGdlbmVyYXRlZCBmcm9tIHRoZSBmbGF0dGVuZWQgbWFwcGluZ3MuXG4gICAqL1xuICByZW5kZXJGbGF0dGVuZWRTb3VyY2VNYXAoKTogUmF3U291cmNlTWFwIHtcbiAgICBjb25zdCBzb3VyY2VzOiBTb3VyY2VGaWxlW10gPSBbXTtcbiAgICBjb25zdCBuYW1lczogc3RyaW5nW10gPSBbXTtcblxuICAgIGNvbnN0IG1hcHBpbmdzOiBTb3VyY2VNYXBNYXBwaW5ncyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBtYXBwaW5nIG9mIHRoaXMuZmxhdHRlbmVkTWFwcGluZ3MpIHtcbiAgICAgIGNvbnN0IHNvdXJjZUluZGV4ID0gZmluZEluZGV4T3JBZGQoc291cmNlcywgbWFwcGluZy5vcmlnaW5hbFNvdXJjZSk7XG4gICAgICBjb25zdCBtYXBwaW5nQXJyYXk6IFNvdXJjZU1hcFNlZ21lbnQgPSBbXG4gICAgICAgIG1hcHBpbmcuZ2VuZXJhdGVkU2VnbWVudC5jb2x1bW4sXG4gICAgICAgIHNvdXJjZUluZGV4LFxuICAgICAgICBtYXBwaW5nLm9yaWdpbmFsU2VnbWVudC5saW5lLFxuICAgICAgICBtYXBwaW5nLm9yaWdpbmFsU2VnbWVudC5jb2x1bW4sXG4gICAgICBdO1xuICAgICAgaWYgKG1hcHBpbmcubmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnN0IG5hbWVJbmRleCA9IGZpbmRJbmRleE9yQWRkKG5hbWVzLCBtYXBwaW5nLm5hbWUpO1xuICAgICAgICBtYXBwaW5nQXJyYXkucHVzaChuYW1lSW5kZXgpO1xuICAgICAgfVxuXG4gICAgICAvLyBFbnN1cmUgYSBtYXBwaW5nIGxpbmUgYXJyYXkgZm9yIHRoaXMgbWFwcGluZy5cbiAgICAgIGNvbnN0IGxpbmUgPSBtYXBwaW5nLmdlbmVyYXRlZFNlZ21lbnQubGluZTtcbiAgICAgIHdoaWxlIChsaW5lID49IG1hcHBpbmdzLmxlbmd0aCkge1xuICAgICAgICBtYXBwaW5ncy5wdXNoKFtdKTtcbiAgICAgIH1cbiAgICAgIC8vIEFkZCB0aGlzIG1hcHBpbmcgdG8gdGhlIGxpbmVcbiAgICAgIG1hcHBpbmdzW2xpbmVdLnB1c2gobWFwcGluZ0FycmF5KTtcbiAgICB9XG5cbiAgICBjb25zdCBzb3VyY2VQYXRoRGlyID0gZGlybmFtZSh0aGlzLnNvdXJjZVBhdGgpO1xuICAgIGNvbnN0IHNvdXJjZU1hcDogUmF3U291cmNlTWFwID0ge1xuICAgICAgdmVyc2lvbjogMyxcbiAgICAgIGZpbGU6IHJlbGF0aXZlKHNvdXJjZVBhdGhEaXIsIHRoaXMuc291cmNlUGF0aCksXG4gICAgICBzb3VyY2VzOiBzb3VyY2VzLm1hcChzZiA9PiByZWxhdGl2ZShzb3VyY2VQYXRoRGlyLCBzZi5zb3VyY2VQYXRoKSksIG5hbWVzLFxuICAgICAgbWFwcGluZ3M6IGVuY29kZShtYXBwaW5ncyksXG4gICAgICBzb3VyY2VzQ29udGVudDogc291cmNlcy5tYXAoc2YgPT4gc2YuY29udGVudHMpLFxuICAgIH07XG4gICAgcmV0dXJuIHNvdXJjZU1hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGbGF0dGVuIHRoZSBwYXJzZWQgbWFwcGluZ3MgZm9yIHRoaXMgc291cmNlIGZpbGUsIHNvIHRoYXQgYWxsIHRoZSBtYXBwaW5ncyBhcmUgdG8gcHVyZSBvcmlnaW5hbFxuICAgKiBzb3VyY2UgZmlsZXMgd2l0aCBubyB0cmFuc2l0aXZlIHNvdXJjZSBtYXBzLlxuICAgKi9cbiAgcHJpdmF0ZSBmbGF0dGVuTWFwcGluZ3MoKTogTWFwcGluZ1tdIHtcbiAgICBjb25zdCBtYXBwaW5ncyA9IHBhcnNlTWFwcGluZ3ModGhpcy5yYXdNYXAsIHRoaXMuc291cmNlcywgdGhpcy5zdGFydE9mTGluZVBvc2l0aW9ucyk7XG4gICAgZW5zdXJlT3JpZ2luYWxTZWdtZW50TGlua3MobWFwcGluZ3MpO1xuICAgIGNvbnN0IGZsYXR0ZW5lZE1hcHBpbmdzOiBNYXBwaW5nW10gPSBbXTtcbiAgICBmb3IgKGxldCBtYXBwaW5nSW5kZXggPSAwOyBtYXBwaW5nSW5kZXggPCBtYXBwaW5ncy5sZW5ndGg7IG1hcHBpbmdJbmRleCsrKSB7XG4gICAgICBjb25zdCBhVG9CbWFwcGluZyA9IG1hcHBpbmdzW21hcHBpbmdJbmRleF07XG4gICAgICBjb25zdCBiU291cmNlID0gYVRvQm1hcHBpbmcub3JpZ2luYWxTb3VyY2U7XG4gICAgICBpZiAoYlNvdXJjZS5mbGF0dGVuZWRNYXBwaW5ncy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gVGhlIGIgc291cmNlIGZpbGUgaGFzIG5vIG1hcHBpbmdzIG9mIGl0cyBvd24gKGkuZS4gaXQgaXMgYSBwdXJlIG9yaWdpbmFsIGZpbGUpXG4gICAgICAgIC8vIHNvIGp1c3QgdXNlIHRoZSBtYXBwaW5nIGFzLWlzLlxuICAgICAgICBmbGF0dGVuZWRNYXBwaW5ncy5wdXNoKGFUb0JtYXBwaW5nKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSBgaW5jb21pbmdTdGFydGAgYW5kIGBpbmNvbWluZ0VuZGAgYXJlIHRoZSBgU2VnbWVudE1hcmtlcmBzIGluIGBCYCB0aGF0IHJlcHJlc2VudCB0aGVcbiAgICAgIC8vIHNlY3Rpb24gb2YgYEJgIHNvdXJjZSBmaWxlIHRoYXQgaXMgYmVpbmcgbWFwcGVkIHRvIGJ5IHRoZSBjdXJyZW50IGBhVG9CbWFwcGluZ2AuXG4gICAgICAvL1xuICAgICAgLy8gRm9yIGV4YW1wbGUsIGNvbnNpZGVyIHRoZSBtYXBwaW5ncyBmcm9tIEEgdG8gQjpcbiAgICAgIC8vXG4gICAgICAvLyBzcmMgQSAgIHNyYyBCICAgICBtYXBwaW5nXG4gICAgICAvL1xuICAgICAgLy8gICBhIC0tLS0tIGEgICAgICAgWzAsIDBdXG4gICAgICAvLyAgIGIgICAgICAgYlxuICAgICAgLy8gICBmIC0gIC8tIGMgICAgICAgWzQsIDJdXG4gICAgICAvLyAgIGcgIFxcIC8gIGRcbiAgICAgIC8vICAgYyAtL1xcICAgZVxuICAgICAgLy8gICBkICAgIFxcLSBmICAgICAgIFsyLCA1XVxuICAgICAgLy8gICBlXG4gICAgICAvL1xuICAgICAgLy8gRm9yIG1hcHBpbmcgWzAsMF0gdGhlIGluY29taW5nIHN0YXJ0IGFuZCBlbmQgYXJlIDAgYW5kIDIgKGkuZS4gdGhlIHJhbmdlIGEsIGIsIGMpXG4gICAgICAvLyBGb3IgbWFwcGluZyBbNCwyXSB0aGUgaW5jb21pbmcgc3RhcnQgYW5kIGVuZCBhcmUgMiBhbmQgNSAoaS5lLiB0aGUgcmFuZ2UgYywgZCwgZSwgZilcbiAgICAgIC8vXG4gICAgICBjb25zdCBpbmNvbWluZ1N0YXJ0ID0gYVRvQm1hcHBpbmcub3JpZ2luYWxTZWdtZW50O1xuICAgICAgY29uc3QgaW5jb21pbmdFbmQgPSBpbmNvbWluZ1N0YXJ0Lm5leHQ7XG5cbiAgICAgIC8vIFRoZSBgb3V0Z29pbmdTdGFydEluZGV4YCBhbmQgYG91dGdvaW5nRW5kSW5kZXhgIGFyZSB0aGUgaW5kaWNlcyBvZiB0aGUgcmFuZ2Ugb2YgbWFwcGluZ3NcbiAgICAgIC8vIHRoYXQgbGVhdmUgYGJgIHRoYXQgd2UgYXJlIGludGVyZXN0ZWQgaW4gbWVyZ2luZyB3aXRoIHRoZSBhVG9CbWFwcGluZy5cbiAgICAgIC8vIFdlIGFjdHVhbGx5IGNhcmUgYWJvdXQgYWxsIHRoZSBtYXJrZXJzIGZyb20gdGhlIGxhc3QgYlRvQ21hcHBpbmcgZGlyZWN0bHkgYmVmb3JlIHRoZVxuICAgICAgLy8gYGluY29taW5nU3RhcnRgIHRvIHRoZSBsYXN0IGJUb0NtYXBpbmcgZGlyZWN0bHkgYmVmb3JlIHRoZSBgaW5jb21pbmdFbmRgLCBpbmNsdXNpdmUuXG4gICAgICAvL1xuICAgICAgLy8gRm9yIGV4YW1wbGUsIGlmIHdlIGNvbnNpZGVyIHRoZSByYW5nZSAyIHRvIDUgZnJvbSBhYm92ZSAoaS5lLiBjLCBkLCBlLCBmKSB3aXRoIHRoZVxuICAgICAgLy8gZm9sbG93aW5nIG1hcHBpbmdzIGZyb20gQiB0byBDOlxuICAgICAgLy9cbiAgICAgIC8vICAgc3JjIEIgICBzcmMgQyAgICAgbWFwcGluZ1xuICAgICAgLy8gICAgIGFcbiAgICAgIC8vICAgICBiIC0tLS0tIGIgICAgICAgWzEsIDBdXG4gICAgICAvLyAgIC0gYyAgICAgICBjXG4gICAgICAvLyAgfCAgZCAgICAgICBkXG4gICAgICAvLyAgfCAgZSAtLS0tLSAxICAgICAgIFs0LCAzXVxuICAgICAgLy8gICAtIGYgIFxcICAgIDJcbiAgICAgIC8vICAgICAgICAgXFwgICAzXG4gICAgICAvLyAgICAgICAgICBcXC0gZSAgICAgICBbNCwgNl1cbiAgICAgIC8vXG4gICAgICAvLyBUaGUgcmFuZ2Ugd2l0aCBgaW5jb21pbmdTdGFydGAgYXQgMiBhbmQgYGluY29taW5nRW5kYCBhdCA1IGhhcyBvdXRnb2luZyBzdGFydCBtYXBwaW5nIG9mXG4gICAgICAvLyBbMSwwXSBhbmQgb3V0Z29pbmcgZW5kIG1hcHBpbmcgb2YgWzQsIDZdLCB3aGljaCBhbHNvIGluY2x1ZGVzIFs0LCAzXS5cbiAgICAgIC8vXG4gICAgICBsZXQgb3V0Z29pbmdTdGFydEluZGV4ID1cbiAgICAgICAgICBmaW5kTGFzdE1hcHBpbmdJbmRleEJlZm9yZShiU291cmNlLmZsYXR0ZW5lZE1hcHBpbmdzLCBpbmNvbWluZ1N0YXJ0LCBmYWxzZSwgMCk7XG4gICAgICBpZiAob3V0Z29pbmdTdGFydEluZGV4IDwgMCkge1xuICAgICAgICBvdXRnb2luZ1N0YXJ0SW5kZXggPSAwO1xuICAgICAgfVxuICAgICAgY29uc3Qgb3V0Z29pbmdFbmRJbmRleCA9IGluY29taW5nRW5kICE9PSB1bmRlZmluZWQgP1xuICAgICAgICAgIGZpbmRMYXN0TWFwcGluZ0luZGV4QmVmb3JlKFxuICAgICAgICAgICAgICBiU291cmNlLmZsYXR0ZW5lZE1hcHBpbmdzLCBpbmNvbWluZ0VuZCwgdHJ1ZSwgb3V0Z29pbmdTdGFydEluZGV4KSA6XG4gICAgICAgICAgYlNvdXJjZS5mbGF0dGVuZWRNYXBwaW5ncy5sZW5ndGggLSAxO1xuXG4gICAgICBmb3IgKGxldCBiVG9DbWFwcGluZ0luZGV4ID0gb3V0Z29pbmdTdGFydEluZGV4OyBiVG9DbWFwcGluZ0luZGV4IDw9IG91dGdvaW5nRW5kSW5kZXg7XG4gICAgICAgICAgIGJUb0NtYXBwaW5nSW5kZXgrKykge1xuICAgICAgICBjb25zdCBiVG9DbWFwcGluZzogTWFwcGluZyA9IGJTb3VyY2UuZmxhdHRlbmVkTWFwcGluZ3NbYlRvQ21hcHBpbmdJbmRleF07XG4gICAgICAgIGZsYXR0ZW5lZE1hcHBpbmdzLnB1c2gobWVyZ2VNYXBwaW5ncyh0aGlzLCBhVG9CbWFwcGluZywgYlRvQ21hcHBpbmcpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZsYXR0ZW5lZE1hcHBpbmdzO1xuICB9XG59XG5cbi8qKlxuICpcbiAqIEBwYXJhbSBtYXBwaW5ncyBUaGUgY29sbGVjdGlvbiBvZiBtYXBwaW5ncyB3aG9zZSBzZWdtZW50LW1hcmtlcnMgd2UgYXJlIHNlYXJjaGluZy5cbiAqIEBwYXJhbSBtYXJrZXIgVGhlIHNlZ21lbnQtbWFya2VyIHRvIG1hdGNoIGFnYWluc3QgdGhvc2Ugb2YgdGhlIGdpdmVuIGBtYXBwaW5nc2AuXG4gKiBAcGFyYW0gZXhjbHVzaXZlIElmIGV4Y2x1c2l2ZSB0aGVuIHdlIG11c3QgZmluZCBhIG1hcHBpbmcgd2l0aCBhIHNlZ21lbnQtbWFya2VyIHRoYXQgaXNcbiAqIGV4Y2x1c2l2ZWx5IGVhcmxpZXIgdGhhbiB0aGUgZ2l2ZW4gYG1hcmtlcmAuXG4gKiBJZiBub3QgZXhjbHVzaXZlIHRoZW4gd2UgY2FuIHJldHVybiB0aGUgaGlnaGVzdCBtYXBwaW5ncyB3aXRoIGFuIGVxdWl2YWxlbnQgc2VnbWVudC1tYXJrZXIgdG8gdGhlXG4gKiBnaXZlbiBgbWFya2VyYC5cbiAqIEBwYXJhbSBsb3dlckluZGV4IElmIHByb3ZpZGVkLCB0aGlzIGlzIHVzZWQgYXMgYSBoaW50IHRoYXQgdGhlIG1hcmtlciB3ZSBhcmUgc2VhcmNoaW5nIGZvciBoYXMgYW5cbiAqIGluZGV4IHRoYXQgaXMgbm8gbG93ZXIgdGhhbiB0aGlzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZExhc3RNYXBwaW5nSW5kZXhCZWZvcmUoXG4gICAgbWFwcGluZ3M6IE1hcHBpbmdbXSwgbWFya2VyOiBTZWdtZW50TWFya2VyLCBleGNsdXNpdmU6IGJvb2xlYW4sIGxvd2VySW5kZXg6IG51bWJlcik6IG51bWJlciB7XG4gIGxldCB1cHBlckluZGV4ID0gbWFwcGluZ3MubGVuZ3RoIC0gMTtcbiAgY29uc3QgdGVzdCA9IGV4Y2x1c2l2ZSA/IC0xIDogMDtcblxuICBpZiAoY29tcGFyZVNlZ21lbnRzKG1hcHBpbmdzW2xvd2VySW5kZXhdLmdlbmVyYXRlZFNlZ21lbnQsIG1hcmtlcikgPiB0ZXN0KSB7XG4gICAgLy8gRXhpdCBlYXJseSBzaW5jZSB0aGUgbWFya2VyIGlzIG91dHNpZGUgdGhlIGFsbG93ZWQgcmFuZ2Ugb2YgbWFwcGluZ3MuXG4gICAgcmV0dXJuIC0xO1xuICB9XG5cbiAgbGV0IG1hdGNoaW5nSW5kZXggPSAtMTtcbiAgd2hpbGUgKGxvd2VySW5kZXggPD0gdXBwZXJJbmRleCkge1xuICAgIGNvbnN0IGluZGV4ID0gKHVwcGVySW5kZXggKyBsb3dlckluZGV4KSA+PiAxO1xuICAgIGlmIChjb21wYXJlU2VnbWVudHMobWFwcGluZ3NbaW5kZXhdLmdlbmVyYXRlZFNlZ21lbnQsIG1hcmtlcikgPD0gdGVzdCkge1xuICAgICAgbWF0Y2hpbmdJbmRleCA9IGluZGV4O1xuICAgICAgbG93ZXJJbmRleCA9IGluZGV4ICsgMTtcbiAgICB9IGVsc2Uge1xuICAgICAgdXBwZXJJbmRleCA9IGluZGV4IC0gMTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG1hdGNoaW5nSW5kZXg7XG59XG5cbi8qKlxuICogQSBNYXBwaW5nIGNvbnNpc3RzIG9mIHR3byBzZWdtZW50IG1hcmtlcnM6IG9uZSBpbiB0aGUgZ2VuZXJhdGVkIHNvdXJjZSBhbmQgb25lIGluIHRoZSBvcmlnaW5hbFxuICogc291cmNlLCB3aGljaCBpbmRpY2F0ZSB0aGUgc3RhcnQgb2YgZWFjaCBzZWdtZW50LiBUaGUgZW5kIG9mIGEgc2VnbWVudCBpcyBpbmRpY2F0ZWQgYnkgdGhlIGZpcnN0XG4gKiBzZWdtZW50IG1hcmtlciBvZiBhbm90aGVyIG1hcHBpbmcgd2hvc2Ugc3RhcnQgaXMgZ3JlYXRlciBvciBlcXVhbCB0byB0aGlzIG9uZS5cbiAqXG4gKiBJdCBtYXkgYWxzbyBpbmNsdWRlIGEgbmFtZSBhc3NvY2lhdGVkIHdpdGggdGhlIHNlZ21lbnQgYmVpbmcgbWFwcGVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1hcHBpbmcge1xuICByZWFkb25seSBnZW5lcmF0ZWRTZWdtZW50OiBTZWdtZW50TWFya2VyO1xuICByZWFkb25seSBvcmlnaW5hbFNvdXJjZTogU291cmNlRmlsZTtcbiAgcmVhZG9ubHkgb3JpZ2luYWxTZWdtZW50OiBTZWdtZW50TWFya2VyO1xuICByZWFkb25seSBuYW1lPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIEZpbmQgdGhlIGluZGV4IG9mIGBpdGVtYCBpbiB0aGUgYGl0ZW1zYCBhcnJheS5cbiAqIElmIGl0IGlzIG5vdCBmb3VuZCwgdGhlbiBwdXNoIGBpdGVtYCB0byB0aGUgZW5kIG9mIHRoZSBhcnJheSBhbmQgcmV0dXJuIGl0cyBuZXcgaW5kZXguXG4gKlxuICogQHBhcmFtIGl0ZW1zIHRoZSBjb2xsZWN0aW9uIGluIHdoaWNoIHRvIGxvb2sgZm9yIGBpdGVtYC5cbiAqIEBwYXJhbSBpdGVtIHRoZSBpdGVtIHRvIGxvb2sgZm9yLlxuICogQHJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBgaXRlbWAgaW4gdGhlIGBpdGVtc2AgYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIGZpbmRJbmRleE9yQWRkPFQ+KGl0ZW1zOiBUW10sIGl0ZW06IFQpOiBudW1iZXIge1xuICBjb25zdCBpdGVtSW5kZXggPSBpdGVtcy5pbmRleE9mKGl0ZW0pO1xuICBpZiAoaXRlbUluZGV4ID4gLTEpIHtcbiAgICByZXR1cm4gaXRlbUluZGV4O1xuICB9IGVsc2Uge1xuICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgcmV0dXJuIGl0ZW1zLmxlbmd0aCAtIDE7XG4gIH1cbn1cblxuXG4vKipcbiAqIE1lcmdlIHR3byBtYXBwaW5ncyB0aGF0IGdvIGZyb20gQSB0byBCIGFuZCBCIHRvIEMsIHRvIHJlc3VsdCBpbiBhIG1hcHBpbmcgdGhhdCBnb2VzIGZyb20gQSB0byBDLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VNYXBwaW5ncyhnZW5lcmF0ZWRTb3VyY2U6IFNvdXJjZUZpbGUsIGFiOiBNYXBwaW5nLCBiYzogTWFwcGluZyk6IE1hcHBpbmcge1xuICBjb25zdCBuYW1lID0gYmMubmFtZSB8fCBhYi5uYW1lO1xuXG4gIC8vIFdlIG5lZWQgdG8gbW9kaWZ5IHRoZSBzZWdtZW50LW1hcmtlcnMgb2YgdGhlIG5ldyBtYXBwaW5nIHRvIHRha2UgaW50byBhY2NvdW50IHRoZSBzaGlmdHMgdGhhdFxuICAvLyBvY2N1ciBkdWUgdG8gdGhlIGNvbWJpbmF0aW9uIG9mIHRoZSB0d28gbWFwcGluZ3MuXG4gIC8vIEZvciBleGFtcGxlOlxuXG4gIC8vICogU2ltcGxlIG1hcCB3aGVyZSB0aGUgQi0+QyBzdGFydHMgYXQgdGhlIHNhbWUgcGxhY2UgdGhlIEEtPkIgZW5kczpcbiAgLy9cbiAgLy8gYGBgXG4gIC8vIEE6IDEgMiBiIGMgZFxuICAvLyAgICAgICAgfCAgICAgICAgQS0+QiBbMiwwXVxuICAvLyAgICAgICAgfCAgICAgICAgICAgICAgfFxuICAvLyBCOiAgICAgYiBjIGQgICAgQS0+QyBbMiwxXVxuICAvLyAgICAgICAgfCAgICAgICAgICAgICAgICB8XG4gIC8vICAgICAgICB8ICAgICAgICBCLT5DIFswLDFdXG4gIC8vIEM6ICAgYSBiIGMgZCBlXG4gIC8vIGBgYFxuXG4gIC8vICogTW9yZSBjb21wbGljYXRlZCBjYXNlIHdoZXJlIGRpZmZzIG9mIHNlZ21lbnQtbWFya2VycyBpcyBuZWVkZWQ6XG4gIC8vXG4gIC8vIGBgYFxuICAvLyBBOiBiIDEgMiBjIGRcbiAgLy8gICAgIFxcXG4gIC8vICAgICAgfCAgICAgICAgICAgIEEtPkIgIFswLDEqXSAgICBbMCwxKl1cbiAgLy8gICAgICB8ICAgICAgICAgICAgICAgICAgIHwgICAgICAgICB8KzNcbiAgLy8gQjogYSBiIDEgMiBjIGQgICAgQS0+QyAgWzAsMV0gICAgIFszLDJdXG4gIC8vICAgIHwgICAgICAvICAgICAgICAgICAgICAgIHwrMSAgICAgICB8XG4gIC8vICAgIHwgICAgIC8gICAgICAgIEItPkMgWzAqLDBdICAgIFs0KiwyXVxuICAvLyAgICB8ICAgIC9cbiAgLy8gQzogYSBiIGMgZCBlXG4gIC8vIGBgYFxuICAvL1xuICAvLyBgWzAsMV1gIG1hcHBpbmcgZnJvbSBBLT5DOlxuICAvLyBUaGUgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSBcIm9yaWdpbmFsIHNlZ21lbnQtbWFya2VyXCIgb2YgQS0+QiAoMSopIGFuZCB0aGUgXCJnZW5lcmF0ZWRcbiAgLy8gc2VnbWVudC1tYXJrZXIgb2YgQi0+QyAoMCopOiBgMSAtIDAgPSArMWAuXG4gIC8vIFNpbmNlIGl0IGlzIHBvc2l0aXZlIHdlIG11c3QgaW5jcmVtZW50IHRoZSBcIm9yaWdpbmFsIHNlZ21lbnQtbWFya2VyXCIgd2l0aCBgMWAgdG8gZ2l2ZSBbMCwxXS5cbiAgLy9cbiAgLy8gYFszLDJdYCBtYXBwaW5nIGZyb20gQS0+QzpcbiAgLy8gVGhlIGRpZmZlcmVuY2UgYmV0d2VlbiB0aGUgXCJvcmlnaW5hbCBzZWdtZW50LW1hcmtlclwiIG9mIEEtPkIgKDEqKSBhbmQgdGhlIFwiZ2VuZXJhdGVkXG4gIC8vIHNlZ21lbnQtbWFya2VyXCIgb2YgQi0+QyAoNCopOiBgMSAtIDQgPSAtM2AuXG4gIC8vIFNpbmNlIGl0IGlzIG5lZ2F0aXZlIHdlIG11c3QgaW5jcmVtZW50IHRoZSBcImdlbmVyYXRlZCBzZWdtZW50LW1hcmtlclwiIHdpdGggYDNgIHRvIGdpdmUgWzMsMl0uXG5cbiAgY29uc3QgZGlmZiA9IGNvbXBhcmVTZWdtZW50cyhiYy5nZW5lcmF0ZWRTZWdtZW50LCBhYi5vcmlnaW5hbFNlZ21lbnQpO1xuICBpZiAoZGlmZiA+IDApIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIGdlbmVyYXRlZFNlZ21lbnQ6XG4gICAgICAgICAgb2Zmc2V0U2VnbWVudChnZW5lcmF0ZWRTb3VyY2Uuc3RhcnRPZkxpbmVQb3NpdGlvbnMsIGFiLmdlbmVyYXRlZFNlZ21lbnQsIGRpZmYpLFxuICAgICAgb3JpZ2luYWxTb3VyY2U6IGJjLm9yaWdpbmFsU291cmNlLFxuICAgICAgb3JpZ2luYWxTZWdtZW50OiBiYy5vcmlnaW5hbFNlZ21lbnQsXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIGdlbmVyYXRlZFNlZ21lbnQ6IGFiLmdlbmVyYXRlZFNlZ21lbnQsXG4gICAgICBvcmlnaW5hbFNvdXJjZTogYmMub3JpZ2luYWxTb3VyY2UsXG4gICAgICBvcmlnaW5hbFNlZ21lbnQ6XG4gICAgICAgICAgb2Zmc2V0U2VnbWVudChiYy5vcmlnaW5hbFNvdXJjZS5zdGFydE9mTGluZVBvc2l0aW9ucywgYmMub3JpZ2luYWxTZWdtZW50LCAtZGlmZiksXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIFBhcnNlIHRoZSBgcmF3TWFwcGluZ3NgIGludG8gYW4gYXJyYXkgb2YgcGFyc2VkIG1hcHBpbmdzLCB3aGljaCByZWZlcmVuY2Ugc291cmNlLWZpbGVzIHByb3ZpZGVkXG4gKiBpbiB0aGUgYHNvdXJjZXNgIHBhcmFtZXRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTWFwcGluZ3MoXG4gICAgcmF3TWFwOiBSYXdTb3VyY2VNYXAgfCBudWxsLCBzb3VyY2VzOiAoU291cmNlRmlsZSB8IG51bGwpW10sXG4gICAgZ2VuZXJhdGVkU291cmNlU3RhcnRPZkxpbmVQb3NpdGlvbnM6IG51bWJlcltdKTogTWFwcGluZ1tdIHtcbiAgaWYgKHJhd01hcCA9PT0gbnVsbCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGNvbnN0IHJhd01hcHBpbmdzID0gZGVjb2RlKHJhd01hcC5tYXBwaW5ncyk7XG4gIGlmIChyYXdNYXBwaW5ncyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGNvbnN0IG1hcHBpbmdzOiBNYXBwaW5nW10gPSBbXTtcbiAgZm9yIChsZXQgZ2VuZXJhdGVkTGluZSA9IDA7IGdlbmVyYXRlZExpbmUgPCByYXdNYXBwaW5ncy5sZW5ndGg7IGdlbmVyYXRlZExpbmUrKykge1xuICAgIGNvbnN0IGdlbmVyYXRlZExpbmVNYXBwaW5ncyA9IHJhd01hcHBpbmdzW2dlbmVyYXRlZExpbmVdO1xuICAgIGZvciAoY29uc3QgcmF3TWFwcGluZyBvZiBnZW5lcmF0ZWRMaW5lTWFwcGluZ3MpIHtcbiAgICAgIGlmIChyYXdNYXBwaW5nLmxlbmd0aCA+PSA0KSB7XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsU291cmNlID0gc291cmNlc1tyYXdNYXBwaW5nWzFdICFdO1xuICAgICAgICBpZiAob3JpZ2luYWxTb3VyY2UgPT09IG51bGwgfHwgb3JpZ2luYWxTb3VyY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIHRoZSBvcmlnaW5hbCBzb3VyY2UgaXMgbWlzc2luZyBzbyBpZ25vcmUgdGhpcyBtYXBwaW5nXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZ2VuZXJhdGVkQ29sdW1uID0gcmF3TWFwcGluZ1swXTtcbiAgICAgICAgY29uc3QgbmFtZSA9IHJhd01hcHBpbmcubGVuZ3RoID09PSA1ID8gcmF3TWFwLm5hbWVzW3Jhd01hcHBpbmdbNF1dIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBsaW5lID0gcmF3TWFwcGluZ1syXSAhO1xuICAgICAgICBjb25zdCBjb2x1bW4gPSByYXdNYXBwaW5nWzNdICE7XG4gICAgICAgIGNvbnN0IGdlbmVyYXRlZFNlZ21lbnQ6IFNlZ21lbnRNYXJrZXIgPSB7XG4gICAgICAgICAgbGluZTogZ2VuZXJhdGVkTGluZSxcbiAgICAgICAgICBjb2x1bW46IGdlbmVyYXRlZENvbHVtbixcbiAgICAgICAgICBwb3NpdGlvbjogZ2VuZXJhdGVkU291cmNlU3RhcnRPZkxpbmVQb3NpdGlvbnNbZ2VuZXJhdGVkTGluZV0gKyBnZW5lcmF0ZWRDb2x1bW4sXG4gICAgICAgICAgbmV4dDogdW5kZWZpbmVkLFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBvcmlnaW5hbFNlZ21lbnQ6IFNlZ21lbnRNYXJrZXIgPSB7XG4gICAgICAgICAgbGluZSxcbiAgICAgICAgICBjb2x1bW4sXG4gICAgICAgICAgcG9zaXRpb246IG9yaWdpbmFsU291cmNlLnN0YXJ0T2ZMaW5lUG9zaXRpb25zW2xpbmVdICsgY29sdW1uLFxuICAgICAgICAgIG5leHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgfTtcbiAgICAgICAgbWFwcGluZ3MucHVzaCh7bmFtZSwgZ2VuZXJhdGVkU2VnbWVudCwgb3JpZ2luYWxTZWdtZW50LCBvcmlnaW5hbFNvdXJjZX0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gbWFwcGluZ3M7XG59XG5cbi8qKlxuICogRXh0cmFjdCB0aGUgc2VnbWVudCBtYXJrZXJzIGZyb20gdGhlIG9yaWdpbmFsIHNvdXJjZSBmaWxlcyBpbiBlYWNoIG1hcHBpbmcgb2YgYW4gYXJyYXkgb2ZcbiAqIGBtYXBwaW5nc2AuXG4gKlxuICogQHBhcmFtIG1hcHBpbmdzIFRoZSBtYXBwaW5ncyB3aG9zZSBvcmlnaW5hbCBzZWdtZW50cyB3ZSB3YW50IHRvIGV4dHJhY3RcbiAqIEByZXR1cm5zIFJldHVybiBhIG1hcCBmcm9tIG9yaWdpbmFsIHNvdXJjZS1maWxlcyAocmVmZXJlbmNlZCBpbiB0aGUgYG1hcHBpbmdzYCkgdG8gYXJyYXlzIG9mXG4gKiBzZWdtZW50LW1hcmtlcnMgc29ydGVkIGJ5IHRoZWlyIG9yZGVyIGluIHRoZWlyIHNvdXJjZSBmaWxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdE9yaWdpbmFsU2VnbWVudHMobWFwcGluZ3M6IE1hcHBpbmdbXSk6IE1hcDxTb3VyY2VGaWxlLCBTZWdtZW50TWFya2VyW10+IHtcbiAgY29uc3Qgb3JpZ2luYWxTZWdtZW50cyA9IG5ldyBNYXA8U291cmNlRmlsZSwgU2VnbWVudE1hcmtlcltdPigpO1xuICBmb3IgKGNvbnN0IG1hcHBpbmcgb2YgbWFwcGluZ3MpIHtcbiAgICBjb25zdCBvcmlnaW5hbFNvdXJjZSA9IG1hcHBpbmcub3JpZ2luYWxTb3VyY2U7XG4gICAgaWYgKCFvcmlnaW5hbFNlZ21lbnRzLmhhcyhvcmlnaW5hbFNvdXJjZSkpIHtcbiAgICAgIG9yaWdpbmFsU2VnbWVudHMuc2V0KG9yaWdpbmFsU291cmNlLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IHNlZ21lbnRzID0gb3JpZ2luYWxTZWdtZW50cy5nZXQob3JpZ2luYWxTb3VyY2UpICE7XG4gICAgc2VnbWVudHMucHVzaChtYXBwaW5nLm9yaWdpbmFsU2VnbWVudCk7XG4gIH1cbiAgb3JpZ2luYWxTZWdtZW50cy5mb3JFYWNoKHNlZ21lbnRNYXJrZXJzID0+IHNlZ21lbnRNYXJrZXJzLnNvcnQoY29tcGFyZVNlZ21lbnRzKSk7XG4gIHJldHVybiBvcmlnaW5hbFNlZ21lbnRzO1xufVxuXG4vKipcbiAqIFVwZGF0ZSB0aGUgb3JpZ2luYWwgc2VnbWVudHMgb2YgZWFjaCBvZiB0aGUgZ2l2ZW4gYG1hcHBpbmdzYCB0byBpbmNsdWRlIGEgbGluayB0byB0aGUgbmV4dFxuICogc2VnbWVudCBpbiB0aGUgc291cmNlIGZpbGUuXG4gKlxuICogQHBhcmFtIG1hcHBpbmdzIHRoZSBtYXBwaW5ncyB3aG9zZSBzZWdtZW50cyBzaG91bGQgYmUgdXBkYXRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlT3JpZ2luYWxTZWdtZW50TGlua3MobWFwcGluZ3M6IE1hcHBpbmdbXSk6IHZvaWQge1xuICBjb25zdCBzZWdtZW50c0J5U291cmNlID0gZXh0cmFjdE9yaWdpbmFsU2VnbWVudHMobWFwcGluZ3MpO1xuICBzZWdtZW50c0J5U291cmNlLmZvckVhY2gobWFya2VycyA9PiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtYXJrZXJzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgbWFya2Vyc1tpXS5uZXh0ID0gbWFya2Vyc1tpICsgMV07XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVTdGFydE9mTGluZVBvc2l0aW9ucyhzdHI6IHN0cmluZykge1xuICAvLyBUaGUgYDFgIGlzIHRvIGluZGljYXRlIGEgbmV3bGluZSBjaGFyYWN0ZXIgYmV0d2VlbiB0aGUgbGluZXMuXG4gIC8vIE5vdGUgdGhhdCBpbiB0aGUgYWN0dWFsIGNvbnRlbnRzIHRoZXJlIGNvdWxkIGJlIG1vcmUgdGhhbiBvbmUgY2hhcmFjdGVyIHRoYXQgaW5kaWNhdGVzIGFcbiAgLy8gbmV3bGluZVxuICAvLyAtIGUuZy4gXFxyXFxuIC0gYnV0IHRoYXQgaXMgbm90IGltcG9ydGFudCBoZXJlIHNpbmNlIHNlZ21lbnQtbWFya2VycyBhcmUgaW4gbGluZS9jb2x1bW4gcGFpcnMgYW5kXG4gIC8vIHNvIGRpZmZlcmVuY2VzIGluIGxlbmd0aCBkdWUgdG8gZXh0cmEgYFxccmAgY2hhcmFjdGVycyBkbyBub3QgYWZmZWN0IHRoZSBhbGdvcml0aG1zLlxuICBjb25zdCBORVdMSU5FX01BUktFUl9PRkZTRVQgPSAxO1xuICBjb25zdCBsaW5lTGVuZ3RocyA9IGNvbXB1dGVMaW5lTGVuZ3RocyhzdHIpO1xuICBjb25zdCBzdGFydFBvc2l0aW9ucyA9IFswXTsgIC8vIEZpcnN0IGxpbmUgc3RhcnRzIGF0IHBvc2l0aW9uIDBcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lTGVuZ3Rocy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICBzdGFydFBvc2l0aW9ucy5wdXNoKHN0YXJ0UG9zaXRpb25zW2ldICsgbGluZUxlbmd0aHNbaV0gKyBORVdMSU5FX01BUktFUl9PRkZTRVQpO1xuICB9XG4gIHJldHVybiBzdGFydFBvc2l0aW9ucztcbn1cblxuZnVuY3Rpb24gY29tcHV0ZUxpbmVMZW5ndGhzKHN0cjogc3RyaW5nKTogbnVtYmVyW10ge1xuICByZXR1cm4gKHN0ci5zcGxpdCgvXFxyP1xcbi8pKS5tYXAocyA9PiBzLmxlbmd0aCk7XG59XG4iXX0=