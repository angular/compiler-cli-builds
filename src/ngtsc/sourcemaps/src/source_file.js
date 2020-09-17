(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/sourcemaps/src/source_file", ["require", "exports", "tslib", "convert-source-map", "sourcemap-codec", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/sourcemaps/src/segment_marker"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.computeStartOfLinePositions = exports.ensureOriginalSegmentLinks = exports.extractOriginalSegments = exports.parseMappings = exports.mergeMappings = exports.findLastMappingIndexBefore = exports.SourceFile = exports.removeSourceMapComments = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var convert_source_map_1 = require("convert-source-map");
    var sourcemap_codec_1 = require("sourcemap-codec");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var segment_marker_1 = require("@angular/compiler-cli/src/ngtsc/sourcemaps/src/segment_marker");
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
                sources: sources.map(function (sf) { return file_system_1.relative(sourcePathDir, sf.sourcePath); }),
                names: names,
                mappings: sourcemap_codec_1.encode(mappings),
                sourcesContent: sources.map(function (sf) { return sf.contents; }),
            };
            return sourceMap;
        };
        /**
         * Find the original mapped location for the given `line` and `column` in the generated file.
         *
         * First we search for a mapping whose generated segment is at or directly before the given
         * location. Then we compute the offset between the given location and the matching generated
         * segment. Finally we apply this offset to the original source segment to get the desired
         * original location.
         */
        SourceFile.prototype.getOriginalLocation = function (line, column) {
            if (this.flattenedMappings.length === 0) {
                return null;
            }
            var position;
            if (line < this.startOfLinePositions.length) {
                position = this.startOfLinePositions[line] + column;
            }
            else {
                // The line is off the end of the file, so just assume we are at the end of the file.
                position = this.contents.length;
            }
            var locationSegment = { line: line, column: column, position: position, next: undefined };
            var mappingIndex = findLastMappingIndexBefore(this.flattenedMappings, locationSegment, false, 0);
            if (mappingIndex < 0) {
                mappingIndex = 0;
            }
            var _a = this.flattenedMappings[mappingIndex], originalSegment = _a.originalSegment, originalSource = _a.originalSource, generatedSegment = _a.generatedSegment;
            var offset = locationSegment.position - generatedSegment.position;
            var offsetOriginalSegment = segment_marker_1.offsetSegment(originalSource.startOfLinePositions, originalSegment, offset);
            return {
                file: originalSource.sourcePath,
                line: offsetOriginalSegment.line,
                column: offsetOriginalSegment.column,
            };
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
                        var name_1 = rawMapping.length === 5 ? rawMap.names[rawMapping[4]] : undefined;
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
                        mappings.push({ name: name_1, generatedSegment: generatedSegment, originalSegment: originalSegment, originalSource: originalSource });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX2ZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NvdXJjZW1hcHMvc3JjL3NvdXJjZV9maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCx5REFBeUU7SUFDekUsbURBQW9GO0lBRXBGLDJFQUFvRTtJQUdwRSxnR0FBK0U7SUFFL0UsU0FBZ0IsdUJBQXVCLENBQUMsUUFBZ0I7UUFDdEQsT0FBTywwQ0FBcUIsQ0FBQyxtQ0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRkQsMERBRUM7SUFFRDtRQVdFO1FBQ0ksb0NBQW9DO1FBQzNCLFVBQTBCO1FBQ25DLHdDQUF3QztRQUMvQixRQUFnQjtRQUN6QixvRUFBb0U7UUFDM0QsTUFBeUI7UUFDbEMsb0VBQW9FO1FBQzNELE1BQWU7UUFDeEIsMEZBQTBGO1FBQ2pGLE9BQTRCO1lBUjVCLGVBQVUsR0FBVixVQUFVLENBQWdCO1lBRTFCLGFBQVEsR0FBUixRQUFRLENBQVE7WUFFaEIsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7WUFFekIsV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUVmLFlBQU8sR0FBUCxPQUFPLENBQXFCO1lBQ3ZDLElBQUksQ0FBQyxRQUFRLEdBQUcsdUJBQXVCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLDJCQUEyQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ2xELENBQUM7UUFFRDs7V0FFRztRQUNILDZDQUF3QixHQUF4Qjs7WUFDRSxJQUFNLE9BQU8sR0FBaUIsRUFB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dXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtyZW1vdmVDb21tZW50cywgcmVtb3ZlTWFwRmlsZUNvbW1lbnRzfSBmcm9tICdjb252ZXJ0LXNvdXJjZS1tYXAnO1xuaW1wb3J0IHtkZWNvZGUsIGVuY29kZSwgU291cmNlTWFwTWFwcGluZ3MsIFNvdXJjZU1hcFNlZ21lbnR9IGZyb20gJ3NvdXJjZW1hcC1jb2RlYyc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGRpcm5hbWUsIHJlbGF0aXZlfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5cbmltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICcuL3Jhd19zb3VyY2VfbWFwJztcbmltcG9ydCB7Y29tcGFyZVNlZ21lbnRzLCBvZmZzZXRTZWdtZW50LCBTZWdtZW50TWFya2VyfSBmcm9tICcuL3NlZ21lbnRfbWFya2VyJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZVNvdXJjZU1hcENvbW1lbnRzKGNvbnRlbnRzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcmVtb3ZlTWFwRmlsZUNvbW1lbnRzKHJlbW92ZUNvbW1lbnRzKGNvbnRlbnRzKSkucmVwbGFjZSgvXFxuXFxuJC8sICdcXG4nKTtcbn1cblxuZXhwb3J0IGNsYXNzIFNvdXJjZUZpbGUge1xuICAvKipcbiAgICogVGhlIHBhcnNlZCBtYXBwaW5ncyB0aGF0IGhhdmUgYmVlbiBmbGF0dGVuZWQgc28gdGhhdCBhbnkgaW50ZXJtZWRpYXRlIHNvdXJjZSBtYXBwaW5ncyBoYXZlIGJlZW5cbiAgICogZmxhdHRlbmVkLlxuICAgKlxuICAgKiBUaGUgcmVzdWx0IGlzIHRoYXQgYW55IHNvdXJjZSBmaWxlIG1lbnRpb25lZCBpbiB0aGUgZmxhdHRlbmVkIG1hcHBpbmdzIGhhdmUgbm8gc291cmNlIG1hcCAoYXJlXG4gICAqIHB1cmUgb3JpZ2luYWwgc291cmNlIGZpbGVzKS5cbiAgICovXG4gIHJlYWRvbmx5IGZsYXR0ZW5lZE1hcHBpbmdzOiBNYXBwaW5nW107XG4gIHJlYWRvbmx5IHN0YXJ0T2ZMaW5lUG9zaXRpb25zOiBudW1iZXJbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBUaGUgcGF0aCB0byB0aGlzIHNvdXJjZSBmaWxlLiAqL1xuICAgICAgcmVhZG9ubHkgc291cmNlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICAvKiogVGhlIGNvbnRlbnRzIG9mIHRoaXMgc291cmNlIGZpbGUuICovXG4gICAgICByZWFkb25seSBjb250ZW50czogc3RyaW5nLFxuICAgICAgLyoqIFRoZSByYXcgc291cmNlIG1hcCAoaWYgYW55KSBhc3NvY2lhdGVkIHdpdGggdGhpcyBzb3VyY2UgZmlsZS4gKi9cbiAgICAgIHJlYWRvbmx5IHJhd01hcDogUmF3U291cmNlTWFwfG51bGwsXG4gICAgICAvKiogV2hldGhlciB0aGlzIHNvdXJjZSBmaWxlJ3Mgc291cmNlIG1hcCB3YXMgaW5saW5lIG9yIGV4dGVybmFsLiAqL1xuICAgICAgcmVhZG9ubHkgaW5saW5lOiBib29sZWFuLFxuICAgICAgLyoqIEFueSBzb3VyY2UgZmlsZXMgcmVmZXJlbmNlZCBieSB0aGUgcmF3IHNvdXJjZSBtYXAgYXNzb2NpYXRlZCB3aXRoIHRoaXMgc291cmNlIGZpbGUuICovXG4gICAgICByZWFkb25seSBzb3VyY2VzOiAoU291cmNlRmlsZXxudWxsKVtdKSB7XG4gICAgdGhpcy5jb250ZW50cyA9IHJlbW92ZVNvdXJjZU1hcENvbW1lbnRzKGNvbnRlbnRzKTtcbiAgICB0aGlzLnN0YXJ0T2ZMaW5lUG9zaXRpb25zID0gY29tcHV0ZVN0YXJ0T2ZMaW5lUG9zaXRpb25zKHRoaXMuY29udGVudHMpO1xuICAgIHRoaXMuZmxhdHRlbmVkTWFwcGluZ3MgPSB0aGlzLmZsYXR0ZW5NYXBwaW5ncygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciB0aGUgcmF3IHNvdXJjZSBtYXAgZ2VuZXJhdGVkIGZyb20gdGhlIGZsYXR0ZW5lZCBtYXBwaW5ncy5cbiAgICovXG4gIHJlbmRlckZsYXR0ZW5lZFNvdXJjZU1hcCgpOiBSYXdTb3VyY2VNYXAge1xuICAgIGNvbnN0IHNvdXJjZXM6IFNvdXJjZUZpbGVbXSA9IFtdO1xuICAgIGNvbnN0IG5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgY29uc3QgbWFwcGluZ3M6IFNvdXJjZU1hcE1hcHBpbmdzID0gW107XG5cbiAgICBmb3IgKGNvbnN0IG1hcHBpbmcgb2YgdGhpcy5mbGF0dGVuZWRNYXBwaW5ncykge1xuICAgICAgY29uc3Qgc291cmNlSW5kZXggPSBmaW5kSW5kZXhPckFkZChzb3VyY2VzLCBtYXBwaW5nLm9yaWdpbmFsU291cmNlKTtcbiAgICAgIGNvbnN0IG1hcHBpbmdBcnJheTogU291cmNlTWFwU2VnbWVudCA9IFtcbiAgICAgICAgbWFwcGluZy5nZW5lcmF0ZWRTZWdtZW50LmNvbHVtbixcbiAgICAgICAgc291cmNlSW5kZXgsXG4gICAgICAgIG1hcHBpbmcub3JpZ2luYWxTZWdtZW50LmxpbmUsXG4gICAgICAgIG1hcHBpbmcub3JpZ2luYWxTZWdtZW50LmNvbHVtbixcbiAgICAgIF07XG4gICAgICBpZiAobWFwcGluZy5uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgbmFtZUluZGV4ID0gZmluZEluZGV4T3JBZGQobmFtZXMsIG1hcHBpbmcubmFtZSk7XG4gICAgICAgIG1hcHBpbmdBcnJheS5wdXNoKG5hbWVJbmRleCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEVuc3VyZSBhIG1hcHBpbmcgbGluZSBhcnJheSBmb3IgdGhpcyBtYXBwaW5nLlxuICAgICAgY29uc3QgbGluZSA9IG1hcHBpbmcuZ2VuZXJhdGVkU2VnbWVudC5saW5lO1xuICAgICAgd2hpbGUgKGxpbmUgPj0gbWFwcGluZ3MubGVuZ3RoKSB7XG4gICAgICAgIG1hcHBpbmdzLnB1c2goW10pO1xuICAgICAgfVxuICAgICAgLy8gQWRkIHRoaXMgbWFwcGluZyB0byB0aGUgbGluZVxuICAgICAgbWFwcGluZ3NbbGluZV0ucHVzaChtYXBwaW5nQXJyYXkpO1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZVBhdGhEaXIgPSBkaXJuYW1lKHRoaXMuc291cmNlUGF0aCk7XG4gICAgY29uc3Qgc291cmNlTWFwOiBSYXdTb3VyY2VNYXAgPSB7XG4gICAgICB2ZXJzaW9uOiAzLFxuICAgICAgZmlsZTogcmVsYXRpdmUoc291cmNlUGF0aERpciwgdGhpcy5zb3VyY2VQYXRoKSxcbiAgICAgIHNvdXJjZXM6IHNvdXJjZXMubWFwKHNmID0+IHJlbGF0aXZlKHNvdXJjZVBhdGhEaXIsIHNmLnNvdXJjZVBhdGgpKSxcbiAgICAgIG5hbWVzLFxuICAgICAgbWFwcGluZ3M6IGVuY29kZShtYXBwaW5ncyksXG4gICAgICBzb3VyY2VzQ29udGVudDogc291cmNlcy5tYXAoc2YgPT4gc2YuY29udGVudHMpLFxuICAgIH07XG4gICAgcmV0dXJuIHNvdXJjZU1hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBvcmlnaW5hbCBtYXBwZWQgbG9jYXRpb24gZm9yIHRoZSBnaXZlbiBgbGluZWAgYW5kIGBjb2x1bW5gIGluIHRoZSBnZW5lcmF0ZWQgZmlsZS5cbiAgICpcbiAgICogRmlyc3Qgd2Ugc2VhcmNoIGZvciBhIG1hcHBpbmcgd2hvc2UgZ2VuZXJhdGVkIHNlZ21lbnQgaXMgYXQgb3IgZGlyZWN0bHkgYmVmb3JlIHRoZSBnaXZlblxuICAgKiBsb2NhdGlvbi4gVGhlbiB3ZSBjb21wdXRlIHRoZSBvZmZzZXQgYmV0d2VlbiB0aGUgZ2l2ZW4gbG9jYXRpb24gYW5kIHRoZSBtYXRjaGluZyBnZW5lcmF0ZWRcbiAgICogc2VnbWVudC4gRmluYWxseSB3ZSBhcHBseSB0aGlzIG9mZnNldCB0byB0aGUgb3JpZ2luYWwgc291cmNlIHNlZ21lbnQgdG8gZ2V0IHRoZSBkZXNpcmVkXG4gICAqIG9yaWdpbmFsIGxvY2F0aW9uLlxuICAgKi9cbiAgZ2V0T3JpZ2luYWxMb2NhdGlvbihsaW5lOiBudW1iZXIsIGNvbHVtbjogbnVtYmVyKTpcbiAgICAgIHtmaWxlOiBBYnNvbHV0ZUZzUGF0aCwgbGluZTogbnVtYmVyLCBjb2x1bW46IG51bWJlcn18bnVsbCB7XG4gICAgaWYgKHRoaXMuZmxhdHRlbmVkTWFwcGluZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgcG9zaXRpb246IG51bWJlcjtcbiAgICBpZiAobGluZSA8IHRoaXMuc3RhcnRPZkxpbmVQb3NpdGlvbnMubGVuZ3RoKSB7XG4gICAgICBwb3NpdGlvbiA9IHRoaXMuc3RhcnRPZkxpbmVQb3NpdGlvbnNbbGluZV0gKyBjb2x1bW47XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBsaW5lIGlzIG9mZiB0aGUgZW5kIG9mIHRoZSBmaWxlLCBzbyBqdXN0IGFzc3VtZSB3ZSBhcmUgYXQgdGhlIGVuZCBvZiB0aGUgZmlsZS5cbiAgICAgIHBvc2l0aW9uID0gdGhpcy5jb250ZW50cy5sZW5ndGg7XG4gICAgfVxuXG4gICAgY29uc3QgbG9jYXRpb25TZWdtZW50OiBTZWdtZW50TWFya2VyID0ge2xpbmUsIGNvbHVtbiwgcG9zaXRpb24sIG5leHQ6IHVuZGVmaW5lZH07XG5cbiAgICBsZXQgbWFwcGluZ0luZGV4ID1cbiAgICAgICAgZmluZExhc3RNYXBwaW5nSW5kZXhCZWZvcmUodGhpcy5mbGF0dGVuZWRNYXBwaW5ncywgbG9jYXRpb25TZWdtZW50LCBmYWxzZSwgMCk7XG4gICAgaWYgKG1hcHBpbmdJbmRleCA8IDApIHtcbiAgICAgIG1hcHBpbmdJbmRleCA9IDA7XG4gICAgfVxuICAgIGNvbnN0IHtvcmlnaW5hbFNlZ21lbnQsIG9yaWdpbmFsU291cmNlLCBnZW5lcmF0ZWRTZWdtZW50fSA9XG4gICAgICAgIHRoaXMuZmxhdHRlbmVkTWFwcGluZ3NbbWFwcGluZ0luZGV4XTtcbiAgICBjb25zdCBvZmZzZXQgPSBsb2NhdGlvblNlZ21lbnQucG9zaXRpb24gLSBnZW5lcmF0ZWRTZWdtZW50LnBvc2l0aW9uO1xuICAgIGNvbnN0IG9mZnNldE9yaWdpbmFsU2VnbWVudCA9XG4gICAgICAgIG9mZnNldFNlZ21lbnQob3JpZ2luYWxTb3VyY2Uuc3RhcnRPZkxpbmVQb3NpdGlvbnMsIG9yaWdpbmFsU2VnbWVudCwgb2Zmc2V0KTtcblxuICAgIHJldHVybiB7XG4gICAgICBmaWxlOiBvcmlnaW5hbFNvdXJjZS5zb3VyY2VQYXRoLFxuICAgICAgbGluZTogb2Zmc2V0T3JpZ2luYWxTZWdtZW50LmxpbmUsXG4gICAgICBjb2x1bW46IG9mZnNldE9yaWdpbmFsU2VnbWVudC5jb2x1bW4sXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGbGF0dGVuIHRoZSBwYXJzZWQgbWFwcGluZ3MgZm9yIHRoaXMgc291cmNlIGZpbGUsIHNvIHRoYXQgYWxsIHRoZSBtYXBwaW5ncyBhcmUgdG8gcHVyZSBvcmlnaW5hbFxuICAgKiBzb3VyY2UgZmlsZXMgd2l0aCBubyB0cmFuc2l0aXZlIHNvdXJjZSBtYXBzLlxuICAgKi9cbiAgcHJpdmF0ZSBmbGF0dGVuTWFwcGluZ3MoKTogTWFwcGluZ1tdIHtcbiAgICBjb25zdCBtYXBwaW5ncyA9IHBhcnNlTWFwcGluZ3ModGhpcy5yYXdNYXAsIHRoaXMuc291cmNlcywgdGhpcy5zdGFydE9mTGluZVBvc2l0aW9ucyk7XG4gICAgZW5zdXJlT3JpZ2luYWxTZWdtZW50TGlua3MobWFwcGluZ3MpO1xuICAgIGNvbnN0IGZsYXR0ZW5lZE1hcHBpbmdzOiBNYXBwaW5nW10gPSBbXTtcbiAgICBmb3IgKGxldCBtYXBwaW5nSW5kZXggPSAwOyBtYXBwaW5nSW5kZXggPCBtYXBwaW5ncy5sZW5ndGg7IG1hcHBpbmdJbmRleCsrKSB7XG4gICAgICBjb25zdCBhVG9CbWFwcGluZyA9IG1hcHBpbmdzW21hcHBpbmdJbmRleF07XG4gICAgICBjb25zdCBiU291cmNlID0gYVRvQm1hcHBpbmcub3JpZ2luYWxTb3VyY2U7XG4gICAgICBpZiAoYlNvdXJjZS5mbGF0dGVuZWRNYXBwaW5ncy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gVGhlIGIgc291cmNlIGZpbGUgaGFzIG5vIG1hcHBpbmdzIG9mIGl0cyBvd24gKGkuZS4gaXQgaXMgYSBwdXJlIG9yaWdpbmFsIGZpbGUpXG4gICAgICAgIC8vIHNvIGp1c3QgdXNlIHRoZSBtYXBwaW5nIGFzLWlzLlxuICAgICAgICBmbGF0dGVuZWRNYXBwaW5ncy5wdXNoKGFUb0JtYXBwaW5nKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSBgaW5jb21pbmdTdGFydGAgYW5kIGBpbmNvbWluZ0VuZGAgYXJlIHRoZSBgU2VnbWVudE1hcmtlcmBzIGluIGBCYCB0aGF0IHJlcHJlc2VudCB0aGVcbiAgICAgIC8vIHNlY3Rpb24gb2YgYEJgIHNvdXJjZSBmaWxlIHRoYXQgaXMgYmVpbmcgbWFwcGVkIHRvIGJ5IHRoZSBjdXJyZW50IGBhVG9CbWFwcGluZ2AuXG4gICAgICAvL1xuICAgICAgLy8gRm9yIGV4YW1wbGUsIGNvbnNpZGVyIHRoZSBtYXBwaW5ncyBmcm9tIEEgdG8gQjpcbiAgICAgIC8vXG4gICAgICAvLyBzcmMgQSAgIHNyYyBCICAgICBtYXBwaW5nXG4gICAgICAvL1xuICAgICAgLy8gICBhIC0tLS0tIGEgICAgICAgWzAsIDBdXG4gICAgICAvLyAgIGIgICAgICAgYlxuICAgICAgLy8gICBmIC0gIC8tIGMgICAgICAgWzQsIDJdXG4gICAgICAvLyAgIGcgIFxcIC8gIGRcbiAgICAgIC8vICAgYyAtL1xcICAgZVxuICAgICAgLy8gICBkICAgIFxcLSBmICAgICAgIFsyLCA1XVxuICAgICAgLy8gICBlXG4gICAgICAvL1xuICAgICAgLy8gRm9yIG1hcHBpbmcgWzAsMF0gdGhlIGluY29taW5nIHN0YXJ0IGFuZCBlbmQgYXJlIDAgYW5kIDIgKGkuZS4gdGhlIHJhbmdlIGEsIGIsIGMpXG4gICAgICAvLyBGb3IgbWFwcGluZyBbNCwyXSB0aGUgaW5jb21pbmcgc3RhcnQgYW5kIGVuZCBhcmUgMiBhbmQgNSAoaS5lLiB0aGUgcmFuZ2UgYywgZCwgZSwgZilcbiAgICAgIC8vXG4gICAgICBjb25zdCBpbmNvbWluZ1N0YXJ0ID0gYVRvQm1hcHBpbmcub3JpZ2luYWxTZWdtZW50O1xuICAgICAgY29uc3QgaW5jb21pbmdFbmQgPSBpbmNvbWluZ1N0YXJ0Lm5leHQ7XG5cbiAgICAgIC8vIFRoZSBgb3V0Z29pbmdTdGFydEluZGV4YCBhbmQgYG91dGdvaW5nRW5kSW5kZXhgIGFyZSB0aGUgaW5kaWNlcyBvZiB0aGUgcmFuZ2Ugb2YgbWFwcGluZ3NcbiAgICAgIC8vIHRoYXQgbGVhdmUgYGJgIHRoYXQgd2UgYXJlIGludGVyZXN0ZWQgaW4gbWVyZ2luZyB3aXRoIHRoZSBhVG9CbWFwcGluZy5cbiAgICAgIC8vIFdlIGFjdHVhbGx5IGNhcmUgYWJvdXQgYWxsIHRoZSBtYXJrZXJzIGZyb20gdGhlIGxhc3QgYlRvQ21hcHBpbmcgZGlyZWN0bHkgYmVmb3JlIHRoZVxuICAgICAgLy8gYGluY29taW5nU3RhcnRgIHRvIHRoZSBsYXN0IGJUb0NtYXBpbmcgZGlyZWN0bHkgYmVmb3JlIHRoZSBgaW5jb21pbmdFbmRgLCBpbmNsdXNpdmUuXG4gICAgICAvL1xuICAgICAgLy8gRm9yIGV4YW1wbGUsIGlmIHdlIGNvbnNpZGVyIHRoZSByYW5nZSAyIHRvIDUgZnJvbSBhYm92ZSAoaS5lLiBjLCBkLCBlLCBmKSB3aXRoIHRoZVxuICAgICAgLy8gZm9sbG93aW5nIG1hcHBpbmdzIGZyb20gQiB0byBDOlxuICAgICAgLy9cbiAgICAgIC8vICAgc3JjIEIgICBzcmMgQyAgICAgbWFwcGluZ1xuICAgICAgLy8gICAgIGFcbiAgICAgIC8vICAgICBiIC0tLS0tIGIgICAgICAgWzEsIDBdXG4gICAgICAvLyAgIC0gYyAgICAgICBjXG4gICAgICAvLyAgfCAgZCAgICAgICBkXG4gICAgICAvLyAgfCAgZSAtLS0tLSAxICAgICAgIFs0LCAzXVxuICAgICAgLy8gICAtIGYgIFxcICAgIDJcbiAgICAgIC8vICAgICAgICAgXFwgICAzXG4gICAgICAvLyAgICAgICAgICBcXC0gZSAgICAgICBbNCwgNl1cbiAgICAgIC8vXG4gICAgICAvLyBUaGUgcmFuZ2Ugd2l0aCBgaW5jb21pbmdTdGFydGAgYXQgMiBhbmQgYGluY29taW5nRW5kYCBhdCA1IGhhcyBvdXRnb2luZyBzdGFydCBtYXBwaW5nIG9mXG4gICAgICAvLyBbMSwwXSBhbmQgb3V0Z29pbmcgZW5kIG1hcHBpbmcgb2YgWzQsIDZdLCB3aGljaCBhbHNvIGluY2x1ZGVzIFs0LCAzXS5cbiAgICAgIC8vXG4gICAgICBsZXQgb3V0Z29pbmdTdGFydEluZGV4ID1cbiAgICAgICAgICBmaW5kTGFzdE1hcHBpbmdJbmRleEJlZm9yZShiU291cmNlLmZsYXR0ZW5lZE1hcHBpbmdzLCBpbmNvbWluZ1N0YXJ0LCBmYWxzZSwgMCk7XG4gICAgICBpZiAob3V0Z29pbmdTdGFydEluZGV4IDwgMCkge1xuICAgICAgICBvdXRnb2luZ1N0YXJ0SW5kZXggPSAwO1xuICAgICAgfVxuICAgICAgY29uc3Qgb3V0Z29pbmdFbmRJbmRleCA9IGluY29taW5nRW5kICE9PSB1bmRlZmluZWQgP1xuICAgICAgICAgIGZpbmRMYXN0TWFwcGluZ0luZGV4QmVmb3JlKFxuICAgICAgICAgICAgICBiU291cmNlLmZsYXR0ZW5lZE1hcHBpbmdzLCBpbmNvbWluZ0VuZCwgdHJ1ZSwgb3V0Z29pbmdTdGFydEluZGV4KSA6XG4gICAgICAgICAgYlNvdXJjZS5mbGF0dGVuZWRNYXBwaW5ncy5sZW5ndGggLSAxO1xuXG4gICAgICBmb3IgKGxldCBiVG9DbWFwcGluZ0luZGV4ID0gb3V0Z29pbmdTdGFydEluZGV4OyBiVG9DbWFwcGluZ0luZGV4IDw9IG91dGdvaW5nRW5kSW5kZXg7XG4gICAgICAgICAgIGJUb0NtYXBwaW5nSW5kZXgrKykge1xuICAgICAgICBjb25zdCBiVG9DbWFwcGluZzogTWFwcGluZyA9IGJTb3VyY2UuZmxhdHRlbmVkTWFwcGluZ3NbYlRvQ21hcHBpbmdJbmRleF07XG4gICAgICAgIGZsYXR0ZW5lZE1hcHBpbmdzLnB1c2gobWVyZ2VNYXBwaW5ncyh0aGlzLCBhVG9CbWFwcGluZywgYlRvQ21hcHBpbmcpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZsYXR0ZW5lZE1hcHBpbmdzO1xuICB9XG59XG5cbi8qKlxuICpcbiAqIEBwYXJhbSBtYXBwaW5ncyBUaGUgY29sbGVjdGlvbiBvZiBtYXBwaW5ncyB3aG9zZSBzZWdtZW50LW1hcmtlcnMgd2UgYXJlIHNlYXJjaGluZy5cbiAqIEBwYXJhbSBtYXJrZXIgVGhlIHNlZ21lbnQtbWFya2VyIHRvIG1hdGNoIGFnYWluc3QgdGhvc2Ugb2YgdGhlIGdpdmVuIGBtYXBwaW5nc2AuXG4gKiBAcGFyYW0gZXhjbHVzaXZlIElmIGV4Y2x1c2l2ZSB0aGVuIHdlIG11c3QgZmluZCBhIG1hcHBpbmcgd2l0aCBhIHNlZ21lbnQtbWFya2VyIHRoYXQgaXNcbiAqIGV4Y2x1c2l2ZWx5IGVhcmxpZXIgdGhhbiB0aGUgZ2l2ZW4gYG1hcmtlcmAuXG4gKiBJZiBub3QgZXhjbHVzaXZlIHRoZW4gd2UgY2FuIHJldHVybiB0aGUgaGlnaGVzdCBtYXBwaW5ncyB3aXRoIGFuIGVxdWl2YWxlbnQgc2VnbWVudC1tYXJrZXIgdG8gdGhlXG4gKiBnaXZlbiBgbWFya2VyYC5cbiAqIEBwYXJhbSBsb3dlckluZGV4IElmIHByb3ZpZGVkLCB0aGlzIGlzIHVzZWQgYXMgYSBoaW50IHRoYXQgdGhlIG1hcmtlciB3ZSBhcmUgc2VhcmNoaW5nIGZvciBoYXMgYW5cbiAqIGluZGV4IHRoYXQgaXMgbm8gbG93ZXIgdGhhbiB0aGlzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZExhc3RNYXBwaW5nSW5kZXhCZWZvcmUoXG4gICAgbWFwcGluZ3M6IE1hcHBpbmdbXSwgbWFya2VyOiBTZWdtZW50TWFya2VyLCBleGNsdXNpdmU6IGJvb2xlYW4sIGxvd2VySW5kZXg6IG51bWJlcik6IG51bWJlciB7XG4gIGxldCB1cHBlckluZGV4ID0gbWFwcGluZ3MubGVuZ3RoIC0gMTtcbiAgY29uc3QgdGVzdCA9IGV4Y2x1c2l2ZSA/IC0xIDogMDtcblxuICBpZiAoY29tcGFyZVNlZ21lbnRzKG1hcHBpbmdzW2xvd2VySW5kZXhdLmdlbmVyYXRlZFNlZ21lbnQsIG1hcmtlcikgPiB0ZXN0KSB7XG4gICAgLy8gRXhpdCBlYXJseSBzaW5jZSB0aGUgbWFya2VyIGlzIG91dHNpZGUgdGhlIGFsbG93ZWQgcmFuZ2Ugb2YgbWFwcGluZ3MuXG4gICAgcmV0dXJuIC0xO1xuICB9XG5cbiAgbGV0IG1hdGNoaW5nSW5kZXggPSAtMTtcbiAgd2hpbGUgKGxvd2VySW5kZXggPD0gdXBwZXJJbmRleCkge1xuICAgIGNvbnN0IGluZGV4ID0gKHVwcGVySW5kZXggKyBsb3dlckluZGV4KSA+PiAxO1xuICAgIGlmIChjb21wYXJlU2VnbWVudHMobWFwcGluZ3NbaW5kZXhdLmdlbmVyYXRlZFNlZ21lbnQsIG1hcmtlcikgPD0gdGVzdCkge1xuICAgICAgbWF0Y2hpbmdJbmRleCA9IGluZGV4O1xuICAgICAgbG93ZXJJbmRleCA9IGluZGV4ICsgMTtcbiAgICB9IGVsc2Uge1xuICAgICAgdXBwZXJJbmRleCA9IGluZGV4IC0gMTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG1hdGNoaW5nSW5kZXg7XG59XG5cbi8qKlxuICogQSBNYXBwaW5nIGNvbnNpc3RzIG9mIHR3byBzZWdtZW50IG1hcmtlcnM6IG9uZSBpbiB0aGUgZ2VuZXJhdGVkIHNvdXJjZSBhbmQgb25lIGluIHRoZSBvcmlnaW5hbFxuICogc291cmNlLCB3aGljaCBpbmRpY2F0ZSB0aGUgc3RhcnQgb2YgZWFjaCBzZWdtZW50LiBUaGUgZW5kIG9mIGEgc2VnbWVudCBpcyBpbmRpY2F0ZWQgYnkgdGhlIGZpcnN0XG4gKiBzZWdtZW50IG1hcmtlciBvZiBhbm90aGVyIG1hcHBpbmcgd2hvc2Ugc3RhcnQgaXMgZ3JlYXRlciBvciBlcXVhbCB0byB0aGlzIG9uZS5cbiAqXG4gKiBJdCBtYXkgYWxzbyBpbmNsdWRlIGEgbmFtZSBhc3NvY2lhdGVkIHdpdGggdGhlIHNlZ21lbnQgYmVpbmcgbWFwcGVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1hcHBpbmcge1xuICByZWFkb25seSBnZW5lcmF0ZWRTZWdtZW50OiBTZWdtZW50TWFya2VyO1xuICByZWFkb25seSBvcmlnaW5hbFNvdXJjZTogU291cmNlRmlsZTtcbiAgcmVhZG9ubHkgb3JpZ2luYWxTZWdtZW50OiBTZWdtZW50TWFya2VyO1xuICByZWFkb25seSBuYW1lPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIEZpbmQgdGhlIGluZGV4IG9mIGBpdGVtYCBpbiB0aGUgYGl0ZW1zYCBhcnJheS5cbiAqIElmIGl0IGlzIG5vdCBmb3VuZCwgdGhlbiBwdXNoIGBpdGVtYCB0byB0aGUgZW5kIG9mIHRoZSBhcnJheSBhbmQgcmV0dXJuIGl0cyBuZXcgaW5kZXguXG4gKlxuICogQHBhcmFtIGl0ZW1zIHRoZSBjb2xsZWN0aW9uIGluIHdoaWNoIHRvIGxvb2sgZm9yIGBpdGVtYC5cbiAqIEBwYXJhbSBpdGVtIHRoZSBpdGVtIHRvIGxvb2sgZm9yLlxuICogQHJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBgaXRlbWAgaW4gdGhlIGBpdGVtc2AgYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIGZpbmRJbmRleE9yQWRkPFQ+KGl0ZW1zOiBUW10sIGl0ZW06IFQpOiBudW1iZXIge1xuICBjb25zdCBpdGVtSW5kZXggPSBpdGVtcy5pbmRleE9mKGl0ZW0pO1xuICBpZiAoaXRlbUluZGV4ID4gLTEpIHtcbiAgICByZXR1cm4gaXRlbUluZGV4O1xuICB9IGVsc2Uge1xuICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgcmV0dXJuIGl0ZW1zLmxlbmd0aCAtIDE7XG4gIH1cbn1cblxuXG4vKipcbiAqIE1lcmdlIHR3byBtYXBwaW5ncyB0aGF0IGdvIGZyb20gQSB0byBCIGFuZCBCIHRvIEMsIHRvIHJlc3VsdCBpbiBhIG1hcHBpbmcgdGhhdCBnb2VzIGZyb20gQSB0byBDLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VNYXBwaW5ncyhnZW5lcmF0ZWRTb3VyY2U6IFNvdXJjZUZpbGUsIGFiOiBNYXBwaW5nLCBiYzogTWFwcGluZyk6IE1hcHBpbmcge1xuICBjb25zdCBuYW1lID0gYmMubmFtZSB8fCBhYi5uYW1lO1xuXG4gIC8vIFdlIG5lZWQgdG8gbW9kaWZ5IHRoZSBzZWdtZW50LW1hcmtlcnMgb2YgdGhlIG5ldyBtYXBwaW5nIHRvIHRha2UgaW50byBhY2NvdW50IHRoZSBzaGlmdHMgdGhhdFxuICAvLyBvY2N1ciBkdWUgdG8gdGhlIGNvbWJpbmF0aW9uIG9mIHRoZSB0d28gbWFwcGluZ3MuXG4gIC8vIEZvciBleGFtcGxlOlxuXG4gIC8vICogU2ltcGxlIG1hcCB3aGVyZSB0aGUgQi0+QyBzdGFydHMgYXQgdGhlIHNhbWUgcGxhY2UgdGhlIEEtPkIgZW5kczpcbiAgLy9cbiAgLy8gYGBgXG4gIC8vIEE6IDEgMiBiIGMgZFxuICAvLyAgICAgICAgfCAgICAgICAgQS0+QiBbMiwwXVxuICAvLyAgICAgICAgfCAgICAgICAgICAgICAgfFxuICAvLyBCOiAgICAgYiBjIGQgICAgQS0+QyBbMiwxXVxuICAvLyAgICAgICAgfCAgICAgICAgICAgICAgICB8XG4gIC8vICAgICAgICB8ICAgICAgICBCLT5DIFswLDFdXG4gIC8vIEM6ICAgYSBiIGMgZCBlXG4gIC8vIGBgYFxuXG4gIC8vICogTW9yZSBjb21wbGljYXRlZCBjYXNlIHdoZXJlIGRpZmZzIG9mIHNlZ21lbnQtbWFya2VycyBpcyBuZWVkZWQ6XG4gIC8vXG4gIC8vIGBgYFxuICAvLyBBOiBiIDEgMiBjIGRcbiAgLy8gICAgIFxcXG4gIC8vICAgICAgfCAgICAgICAgICAgIEEtPkIgIFswLDEqXSAgICBbMCwxKl1cbiAgLy8gICAgICB8ICAgICAgICAgICAgICAgICAgIHwgICAgICAgICB8KzNcbiAgLy8gQjogYSBiIDEgMiBjIGQgICAgQS0+QyAgWzAsMV0gICAgIFszLDJdXG4gIC8vICAgIHwgICAgICAvICAgICAgICAgICAgICAgIHwrMSAgICAgICB8XG4gIC8vICAgIHwgICAgIC8gICAgICAgIEItPkMgWzAqLDBdICAgIFs0KiwyXVxuICAvLyAgICB8ICAgIC9cbiAgLy8gQzogYSBiIGMgZCBlXG4gIC8vIGBgYFxuICAvL1xuICAvLyBgWzAsMV1gIG1hcHBpbmcgZnJvbSBBLT5DOlxuICAvLyBUaGUgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSBcIm9yaWdpbmFsIHNlZ21lbnQtbWFya2VyXCIgb2YgQS0+QiAoMSopIGFuZCB0aGUgXCJnZW5lcmF0ZWRcbiAgLy8gc2VnbWVudC1tYXJrZXIgb2YgQi0+QyAoMCopOiBgMSAtIDAgPSArMWAuXG4gIC8vIFNpbmNlIGl0IGlzIHBvc2l0aXZlIHdlIG11c3QgaW5jcmVtZW50IHRoZSBcIm9yaWdpbmFsIHNlZ21lbnQtbWFya2VyXCIgd2l0aCBgMWAgdG8gZ2l2ZSBbMCwxXS5cbiAgLy9cbiAgLy8gYFszLDJdYCBtYXBwaW5nIGZyb20gQS0+QzpcbiAgLy8gVGhlIGRpZmZlcmVuY2UgYmV0d2VlbiB0aGUgXCJvcmlnaW5hbCBzZWdtZW50LW1hcmtlclwiIG9mIEEtPkIgKDEqKSBhbmQgdGhlIFwiZ2VuZXJhdGVkXG4gIC8vIHNlZ21lbnQtbWFya2VyXCIgb2YgQi0+QyAoNCopOiBgMSAtIDQgPSAtM2AuXG4gIC8vIFNpbmNlIGl0IGlzIG5lZ2F0aXZlIHdlIG11c3QgaW5jcmVtZW50IHRoZSBcImdlbmVyYXRlZCBzZWdtZW50LW1hcmtlclwiIHdpdGggYDNgIHRvIGdpdmUgWzMsMl0uXG5cbiAgY29uc3QgZGlmZiA9IGNvbXBhcmVTZWdtZW50cyhiYy5nZW5lcmF0ZWRTZWdtZW50LCBhYi5vcmlnaW5hbFNlZ21lbnQpO1xuICBpZiAoZGlmZiA+IDApIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIGdlbmVyYXRlZFNlZ21lbnQ6XG4gICAgICAgICAgb2Zmc2V0U2VnbWVudChnZW5lcmF0ZWRTb3VyY2Uuc3RhcnRPZkxpbmVQb3NpdGlvbnMsIGFiLmdlbmVyYXRlZFNlZ21lbnQsIGRpZmYpLFxuICAgICAgb3JpZ2luYWxTb3VyY2U6IGJjLm9yaWdpbmFsU291cmNlLFxuICAgICAgb3JpZ2luYWxTZWdtZW50OiBiYy5vcmlnaW5hbFNlZ21lbnQsXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIGdlbmVyYXRlZFNlZ21lbnQ6IGFiLmdlbmVyYXRlZFNlZ21lbnQsXG4gICAgICBvcmlnaW5hbFNvdXJjZTogYmMub3JpZ2luYWxTb3VyY2UsXG4gICAgICBvcmlnaW5hbFNlZ21lbnQ6XG4gICAgICAgICAgb2Zmc2V0U2VnbWVudChiYy5vcmlnaW5hbFNvdXJjZS5zdGFydE9mTGluZVBvc2l0aW9ucywgYmMub3JpZ2luYWxTZWdtZW50LCAtZGlmZiksXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIFBhcnNlIHRoZSBgcmF3TWFwcGluZ3NgIGludG8gYW4gYXJyYXkgb2YgcGFyc2VkIG1hcHBpbmdzLCB3aGljaCByZWZlcmVuY2Ugc291cmNlLWZpbGVzIHByb3ZpZGVkXG4gKiBpbiB0aGUgYHNvdXJjZXNgIHBhcmFtZXRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTWFwcGluZ3MoXG4gICAgcmF3TWFwOiBSYXdTb3VyY2VNYXB8bnVsbCwgc291cmNlczogKFNvdXJjZUZpbGV8bnVsbClbXSxcbiAgICBnZW5lcmF0ZWRTb3VyY2VTdGFydE9mTGluZVBvc2l0aW9uczogbnVtYmVyW10pOiBNYXBwaW5nW10ge1xuICBpZiAocmF3TWFwID09PSBudWxsKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgY29uc3QgcmF3TWFwcGluZ3MgPSBkZWNvZGUocmF3TWFwLm1hcHBpbmdzKTtcbiAgaWYgKHJhd01hcHBpbmdzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgY29uc3QgbWFwcGluZ3M6IE1hcHBpbmdbXSA9IFtdO1xuICBmb3IgKGxldCBnZW5lcmF0ZWRMaW5lID0gMDsgZ2VuZXJhdGVkTGluZSA8IHJhd01hcHBpbmdzLmxlbmd0aDsgZ2VuZXJhdGVkTGluZSsrKSB7XG4gICAgY29uc3QgZ2VuZXJhdGVkTGluZU1hcHBpbmdzID0gcmF3TWFwcGluZ3NbZ2VuZXJhdGVkTGluZV07XG4gICAgZm9yIChjb25zdCByYXdNYXBwaW5nIG9mIGdlbmVyYXRlZExpbmVNYXBwaW5ncykge1xuICAgICAgaWYgKHJhd01hcHBpbmcubGVuZ3RoID49IDQpIHtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxTb3VyY2UgPSBzb3VyY2VzW3Jhd01hcHBpbmdbMV0hXTtcbiAgICAgICAgaWYgKG9yaWdpbmFsU291cmNlID09PSBudWxsIHx8IG9yaWdpbmFsU291cmNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyB0aGUgb3JpZ2luYWwgc291cmNlIGlzIG1pc3Npbmcgc28gaWdub3JlIHRoaXMgbWFwcGluZ1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGdlbmVyYXRlZENvbHVtbiA9IHJhd01hcHBpbmdbMF07XG4gICAgICAgIGNvbnN0IG5hbWUgPSByYXdNYXBwaW5nLmxlbmd0aCA9PT0gNSA/IHJhd01hcC5uYW1lc1tyYXdNYXBwaW5nWzRdXSA6IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgbGluZSA9IHJhd01hcHBpbmdbMl0hO1xuICAgICAgICBjb25zdCBjb2x1bW4gPSByYXdNYXBwaW5nWzNdITtcbiAgICAgICAgY29uc3QgZ2VuZXJhdGVkU2VnbWVudDogU2VnbWVudE1hcmtlciA9IHtcbiAgICAgICAgICBsaW5lOiBnZW5lcmF0ZWRMaW5lLFxuICAgICAgICAgIGNvbHVtbjogZ2VuZXJhdGVkQ29sdW1uLFxuICAgICAgICAgIHBvc2l0aW9uOiBnZW5lcmF0ZWRTb3VyY2VTdGFydE9mTGluZVBvc2l0aW9uc1tnZW5lcmF0ZWRMaW5lXSArIGdlbmVyYXRlZENvbHVtbixcbiAgICAgICAgICBuZXh0OiB1bmRlZmluZWQsXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsU2VnbWVudDogU2VnbWVudE1hcmtlciA9IHtcbiAgICAgICAgICBsaW5lLFxuICAgICAgICAgIGNvbHVtbixcbiAgICAgICAgICBwb3NpdGlvbjogb3JpZ2luYWxTb3VyY2Uuc3RhcnRPZkxpbmVQb3NpdGlvbnNbbGluZV0gKyBjb2x1bW4sXG4gICAgICAgICAgbmV4dDogdW5kZWZpbmVkLFxuICAgICAgICB9O1xuICAgICAgICBtYXBwaW5ncy5wdXNoKHtuYW1lLCBnZW5lcmF0ZWRTZWdtZW50LCBvcmlnaW5hbFNlZ21lbnQsIG9yaWdpbmFsU291cmNlfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBtYXBwaW5ncztcbn1cblxuLyoqXG4gKiBFeHRyYWN0IHRoZSBzZWdtZW50IG1hcmtlcnMgZnJvbSB0aGUgb3JpZ2luYWwgc291cmNlIGZpbGVzIGluIGVhY2ggbWFwcGluZyBvZiBhbiBhcnJheSBvZlxuICogYG1hcHBpbmdzYC5cbiAqXG4gKiBAcGFyYW0gbWFwcGluZ3MgVGhlIG1hcHBpbmdzIHdob3NlIG9yaWdpbmFsIHNlZ21lbnRzIHdlIHdhbnQgdG8gZXh0cmFjdFxuICogQHJldHVybnMgUmV0dXJuIGEgbWFwIGZyb20gb3JpZ2luYWwgc291cmNlLWZpbGVzIChyZWZlcmVuY2VkIGluIHRoZSBgbWFwcGluZ3NgKSB0byBhcnJheXMgb2ZcbiAqIHNlZ21lbnQtbWFya2VycyBzb3J0ZWQgYnkgdGhlaXIgb3JkZXIgaW4gdGhlaXIgc291cmNlIGZpbGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0T3JpZ2luYWxTZWdtZW50cyhtYXBwaW5nczogTWFwcGluZ1tdKTogTWFwPFNvdXJjZUZpbGUsIFNlZ21lbnRNYXJrZXJbXT4ge1xuICBjb25zdCBvcmlnaW5hbFNlZ21lbnRzID0gbmV3IE1hcDxTb3VyY2VGaWxlLCBTZWdtZW50TWFya2VyW10+KCk7XG4gIGZvciAoY29uc3QgbWFwcGluZyBvZiBtYXBwaW5ncykge1xuICAgIGNvbnN0IG9yaWdpbmFsU291cmNlID0gbWFwcGluZy5vcmlnaW5hbFNvdXJjZTtcbiAgICBpZiAoIW9yaWdpbmFsU2VnbWVudHMuaGFzKG9yaWdpbmFsU291cmNlKSkge1xuICAgICAgb3JpZ2luYWxTZWdtZW50cy5zZXQob3JpZ2luYWxTb3VyY2UsIFtdKTtcbiAgICB9XG4gICAgY29uc3Qgc2VnbWVudHMgPSBvcmlnaW5hbFNlZ21lbnRzLmdldChvcmlnaW5hbFNvdXJjZSkhO1xuICAgIHNlZ21lbnRzLnB1c2gobWFwcGluZy5vcmlnaW5hbFNlZ21lbnQpO1xuICB9XG4gIG9yaWdpbmFsU2VnbWVudHMuZm9yRWFjaChzZWdtZW50TWFya2VycyA9PiBzZWdtZW50TWFya2Vycy5zb3J0KGNvbXBhcmVTZWdtZW50cykpO1xuICByZXR1cm4gb3JpZ2luYWxTZWdtZW50cztcbn1cblxuLyoqXG4gKiBVcGRhdGUgdGhlIG9yaWdpbmFsIHNlZ21lbnRzIG9mIGVhY2ggb2YgdGhlIGdpdmVuIGBtYXBwaW5nc2AgdG8gaW5jbHVkZSBhIGxpbmsgdG8gdGhlIG5leHRcbiAqIHNlZ21lbnQgaW4gdGhlIHNvdXJjZSBmaWxlLlxuICpcbiAqIEBwYXJhbSBtYXBwaW5ncyB0aGUgbWFwcGluZ3Mgd2hvc2Ugc2VnbWVudHMgc2hvdWxkIGJlIHVwZGF0ZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZU9yaWdpbmFsU2VnbWVudExpbmtzKG1hcHBpbmdzOiBNYXBwaW5nW10pOiB2b2lkIHtcbiAgY29uc3Qgc2VnbWVudHNCeVNvdXJjZSA9IGV4dHJhY3RPcmlnaW5hbFNlZ21lbnRzKG1hcHBpbmdzKTtcbiAgc2VnbWVudHNCeVNvdXJjZS5mb3JFYWNoKG1hcmtlcnMgPT4ge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWFya2Vycy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgIG1hcmtlcnNbaV0ubmV4dCA9IG1hcmtlcnNbaSArIDFdO1xuICAgIH1cbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlU3RhcnRPZkxpbmVQb3NpdGlvbnMoc3RyOiBzdHJpbmcpIHtcbiAgLy8gVGhlIGAxYCBpcyB0byBpbmRpY2F0ZSBhIG5ld2xpbmUgY2hhcmFjdGVyIGJldHdlZW4gdGhlIGxpbmVzLlxuICAvLyBOb3RlIHRoYXQgaW4gdGhlIGFjdHVhbCBjb250ZW50cyB0aGVyZSBjb3VsZCBiZSBtb3JlIHRoYW4gb25lIGNoYXJhY3RlciB0aGF0IGluZGljYXRlcyBhXG4gIC8vIG5ld2xpbmVcbiAgLy8gLSBlLmcuIFxcclxcbiAtIGJ1dCB0aGF0IGlzIG5vdCBpbXBvcnRhbnQgaGVyZSBzaW5jZSBzZWdtZW50LW1hcmtlcnMgYXJlIGluIGxpbmUvY29sdW1uIHBhaXJzIGFuZFxuICAvLyBzbyBkaWZmZXJlbmNlcyBpbiBsZW5ndGggZHVlIHRvIGV4dHJhIGBcXHJgIGNoYXJhY3RlcnMgZG8gbm90IGFmZmVjdCB0aGUgYWxnb3JpdGhtcy5cbiAgY29uc3QgTkVXTElORV9NQVJLRVJfT0ZGU0VUID0gMTtcbiAgY29uc3QgbGluZUxlbmd0aHMgPSBjb21wdXRlTGluZUxlbmd0aHMoc3RyKTtcbiAgY29uc3Qgc3RhcnRQb3NpdGlvbnMgPSBbMF07ICAvLyBGaXJzdCBsaW5lIHN0YXJ0cyBhdCBwb3NpdGlvbiAwXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZUxlbmd0aHMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgc3RhcnRQb3NpdGlvbnMucHVzaChzdGFydFBvc2l0aW9uc1tpXSArIGxpbmVMZW5ndGhzW2ldICsgTkVXTElORV9NQVJLRVJfT0ZGU0VUKTtcbiAgfVxuICByZXR1cm4gc3RhcnRQb3NpdGlvbnM7XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGVMaW5lTGVuZ3RocyhzdHI6IHN0cmluZyk6IG51bWJlcltdIHtcbiAgcmV0dXJuIChzdHIuc3BsaXQoL1xccj9cXG4vKSkubWFwKHMgPT4gcy5sZW5ndGgpO1xufVxuIl19