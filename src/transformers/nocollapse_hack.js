/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/transformers/nocollapse_hack", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // Closure compiler transforms the form `Service.ngInjectableDef = X` into
    // `Service$ngInjectableDef = X`. To prevent this transformation, such assignments need to be
    // annotated with @nocollapse. Unfortunately, a bug in Typescript where comments aren't propagated
    // through the TS transformations precludes adding the comment via the AST. This workaround detects
    // the static assignments to R3 properties such as ngInjectableDef using a regex, as output files
    // are written, and applies the annotation through regex replacement.
    //
    // TODO(alxhub): clean up once fix for TS transformers lands in upstream
    //
    // Typescript reference issue: https://github.com/Microsoft/TypeScript/issues/22497
    // Pattern matching all Render3 property names.
    var R3_DEF_NAME_PATTERN = [
        'ngBaseDef',
        'ɵcmp',
        'ɵdir',
        'ngInjectableDef',
        'ngInjectorDef',
        'ngModuleDef',
        'ngPipeDef',
        'ɵfac',
    ].join('|');
    // Pattern matching `Identifier.property` where property is a Render3 property.
    var R3_DEF_ACCESS_PATTERN = "[^\\s\\.()[\\]]+.(" + R3_DEF_NAME_PATTERN + ")";
    // Pattern matching a source line that contains a Render3 static property assignment.
    // It declares two matching groups - one for the preceding whitespace, the second for the rest
    // of the assignment expression.
    var R3_DEF_LINE_PATTERN = "^(\\s*)(" + R3_DEF_ACCESS_PATTERN + " = .*)$";
    // Regex compilation of R3_DEF_LINE_PATTERN. Matching group 1 yields the whitespace preceding the
    // assignment, matching group 2 gives the rest of the assignment expressions.
    var R3_MATCH_DEFS = new RegExp(R3_DEF_LINE_PATTERN, 'gmu');
    var R3_TSICKLE_DECL_PATTERN = "(\\/\\*\\*[*\\s]*)(@[^*]+\\*\\/\\s+[^.]+\\.(?:" + R3_DEF_NAME_PATTERN + ");)";
    var R3_MATCH_TSICKLE_DECL = new RegExp(R3_TSICKLE_DECL_PATTERN, 'gmu');
    // Replacement string that complements R3_MATCH_DEFS. It inserts `/** @nocollapse */` before the
    // assignment but after any indentation. Note that this will mess up any sourcemaps on this line
    // (though there shouldn't be any, since Render3 properties are synthetic).
    var R3_NOCOLLAPSE_DEFS = '$1\/** @nocollapse *\/ $2';
    var R3_NOCOLLAPSE_TSICKLE_DECL = '$1@nocollapse $2';
    function nocollapseHack(contents) {
        return contents.replace(R3_MATCH_DEFS, R3_NOCOLLAPSE_DEFS)
            .replace(R3_MATCH_TSICKLE_DECL, R3_NOCOLLAPSE_TSICKLE_DECL);
    }
    exports.nocollapseHack = nocollapseHack;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9jb2xsYXBzZV9oYWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvbm9jb2xsYXBzZV9oYWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsMEVBQTBFO0lBQzFFLDZGQUE2RjtJQUM3RixrR0FBa0c7SUFDbEcsbUdBQW1HO0lBQ25HLGlHQUFpRztJQUNqRyxxRUFBcUU7SUFDckUsRUFBRTtJQUNGLHdFQUF3RTtJQUN4RSxFQUFFO0lBQ0YsbUZBQW1GO0lBRW5GLCtDQUErQztJQUMvQyxJQUFNLG1CQUFtQixHQUFHO1FBQzFCLFdBQVc7UUFDWCxNQUFNO1FBQ04sTUFBTTtRQUNOLGlCQUFpQjtRQUNqQixlQUFlO1FBQ2YsYUFBYTtRQUNiLFdBQVc7UUFDWCxNQUFNO0tBQ1AsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFWiwrRUFBK0U7SUFDL0UsSUFBTSxxQkFBcUIsR0FBRyx1QkFBc0IsbUJBQW1CLE1BQUcsQ0FBQztJQUUzRSxxRkFBcUY7SUFDckYsOEZBQThGO0lBQzlGLGdDQUFnQztJQUNoQyxJQUFNLG1CQUFtQixHQUFHLGFBQVcscUJBQXFCLFlBQVMsQ0FBQztJQUV0RSxpR0FBaUc7SUFDakcsNkVBQTZFO0lBQzdFLElBQU0sYUFBYSxHQUFHLElBQUksTUFBTSxDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRTdELElBQU0sdUJBQXVCLEdBQ3pCLG1EQUFpRCxtQkFBbUIsUUFBSyxDQUFDO0lBRTlFLElBQU0scUJBQXFCLEdBQUcsSUFBSSxNQUFNLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFekUsZ0dBQWdHO0lBQ2hHLGdHQUFnRztJQUNoRywyRUFBMkU7SUFDM0UsSUFBTSxrQkFBa0IsR0FBRywyQkFBMkIsQ0FBQztJQUV2RCxJQUFNLDBCQUEwQixHQUFHLGtCQUFrQixDQUFDO0lBRXRELFNBQWdCLGNBQWMsQ0FBQyxRQUFnQjtRQUM3QyxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDO2FBQ3JELE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFIRCx3Q0FHQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8gQ2xvc3VyZSBjb21waWxlciB0cmFuc2Zvcm1zIHRoZSBmb3JtIGBTZXJ2aWNlLm5nSW5qZWN0YWJsZURlZiA9IFhgIGludG9cbi8vIGBTZXJ2aWNlJG5nSW5qZWN0YWJsZURlZiA9IFhgLiBUbyBwcmV2ZW50IHRoaXMgdHJhbnNmb3JtYXRpb24sIHN1Y2ggYXNzaWdubWVudHMgbmVlZCB0byBiZVxuLy8gYW5ub3RhdGVkIHdpdGggQG5vY29sbGFwc2UuIFVuZm9ydHVuYXRlbHksIGEgYnVnIGluIFR5cGVzY3JpcHQgd2hlcmUgY29tbWVudHMgYXJlbid0IHByb3BhZ2F0ZWRcbi8vIHRocm91Z2ggdGhlIFRTIHRyYW5zZm9ybWF0aW9ucyBwcmVjbHVkZXMgYWRkaW5nIHRoZSBjb21tZW50IHZpYSB0aGUgQVNULiBUaGlzIHdvcmthcm91bmQgZGV0ZWN0c1xuLy8gdGhlIHN0YXRpYyBhc3NpZ25tZW50cyB0byBSMyBwcm9wZXJ0aWVzIHN1Y2ggYXMgbmdJbmplY3RhYmxlRGVmIHVzaW5nIGEgcmVnZXgsIGFzIG91dHB1dCBmaWxlc1xuLy8gYXJlIHdyaXR0ZW4sIGFuZCBhcHBsaWVzIHRoZSBhbm5vdGF0aW9uIHRocm91Z2ggcmVnZXggcmVwbGFjZW1lbnQuXG4vL1xuLy8gVE9ETyhhbHhodWIpOiBjbGVhbiB1cCBvbmNlIGZpeCBmb3IgVFMgdHJhbnNmb3JtZXJzIGxhbmRzIGluIHVwc3RyZWFtXG4vL1xuLy8gVHlwZXNjcmlwdCByZWZlcmVuY2UgaXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjI0OTdcblxuLy8gUGF0dGVybiBtYXRjaGluZyBhbGwgUmVuZGVyMyBwcm9wZXJ0eSBuYW1lcy5cbmNvbnN0IFIzX0RFRl9OQU1FX1BBVFRFUk4gPSBbXG4gICduZ0Jhc2VEZWYnLFxuICAnybVjbXAnLFxuICAnybVkaXInLFxuICAnbmdJbmplY3RhYmxlRGVmJyxcbiAgJ25nSW5qZWN0b3JEZWYnLFxuICAnbmdNb2R1bGVEZWYnLFxuICAnbmdQaXBlRGVmJyxcbiAgJ8m1ZmFjJyxcbl0uam9pbignfCcpO1xuXG4vLyBQYXR0ZXJuIG1hdGNoaW5nIGBJZGVudGlmaWVyLnByb3BlcnR5YCB3aGVyZSBwcm9wZXJ0eSBpcyBhIFJlbmRlcjMgcHJvcGVydHkuXG5jb25zdCBSM19ERUZfQUNDRVNTX1BBVFRFUk4gPSBgW15cXFxcc1xcXFwuKClbXFxcXF1dK1xcLigke1IzX0RFRl9OQU1FX1BBVFRFUk59KWA7XG5cbi8vIFBhdHRlcm4gbWF0Y2hpbmcgYSBzb3VyY2UgbGluZSB0aGF0IGNvbnRhaW5zIGEgUmVuZGVyMyBzdGF0aWMgcHJvcGVydHkgYXNzaWdubWVudC5cbi8vIEl0IGRlY2xhcmVzIHR3byBtYXRjaGluZyBncm91cHMgLSBvbmUgZm9yIHRoZSBwcmVjZWRpbmcgd2hpdGVzcGFjZSwgdGhlIHNlY29uZCBmb3IgdGhlIHJlc3Rcbi8vIG9mIHRoZSBhc3NpZ25tZW50IGV4cHJlc3Npb24uXG5jb25zdCBSM19ERUZfTElORV9QQVRURVJOID0gYF4oXFxcXHMqKSgke1IzX0RFRl9BQ0NFU1NfUEFUVEVSTn0gPSAuKikkYDtcblxuLy8gUmVnZXggY29tcGlsYXRpb24gb2YgUjNfREVGX0xJTkVfUEFUVEVSTi4gTWF0Y2hpbmcgZ3JvdXAgMSB5aWVsZHMgdGhlIHdoaXRlc3BhY2UgcHJlY2VkaW5nIHRoZVxuLy8gYXNzaWdubWVudCwgbWF0Y2hpbmcgZ3JvdXAgMiBnaXZlcyB0aGUgcmVzdCBvZiB0aGUgYXNzaWdubWVudCBleHByZXNzaW9ucy5cbmNvbnN0IFIzX01BVENIX0RFRlMgPSBuZXcgUmVnRXhwKFIzX0RFRl9MSU5FX1BBVFRFUk4sICdnbXUnKTtcblxuY29uc3QgUjNfVFNJQ0tMRV9ERUNMX1BBVFRFUk4gPVxuICAgIGAoXFxcXC9cXFxcKlxcXFwqWypcXFxcc10qKShAW14qXStcXFxcKlxcXFwvXFxcXHMrW14uXStcXFxcLig/OiR7UjNfREVGX05BTUVfUEFUVEVSTn0pOylgO1xuXG5jb25zdCBSM19NQVRDSF9UU0lDS0xFX0RFQ0wgPSBuZXcgUmVnRXhwKFIzX1RTSUNLTEVfREVDTF9QQVRURVJOLCAnZ211Jyk7XG5cbi8vIFJlcGxhY2VtZW50IHN0cmluZyB0aGF0IGNvbXBsZW1lbnRzIFIzX01BVENIX0RFRlMuIEl0IGluc2VydHMgYC8qKiBAbm9jb2xsYXBzZSAqL2AgYmVmb3JlIHRoZVxuLy8gYXNzaWdubWVudCBidXQgYWZ0ZXIgYW55IGluZGVudGF0aW9uLiBOb3RlIHRoYXQgdGhpcyB3aWxsIG1lc3MgdXAgYW55IHNvdXJjZW1hcHMgb24gdGhpcyBsaW5lXG4vLyAodGhvdWdoIHRoZXJlIHNob3VsZG4ndCBiZSBhbnksIHNpbmNlIFJlbmRlcjMgcHJvcGVydGllcyBhcmUgc3ludGhldGljKS5cbmNvbnN0IFIzX05PQ09MTEFQU0VfREVGUyA9ICckMVxcLyoqIEBub2NvbGxhcHNlICpcXC8gJDInO1xuXG5jb25zdCBSM19OT0NPTExBUFNFX1RTSUNLTEVfREVDTCA9ICckMUBub2NvbGxhcHNlICQyJztcblxuZXhwb3J0IGZ1bmN0aW9uIG5vY29sbGFwc2VIYWNrKGNvbnRlbnRzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY29udGVudHMucmVwbGFjZShSM19NQVRDSF9ERUZTLCBSM19OT0NPTExBUFNFX0RFRlMpXG4gICAgICAucmVwbGFjZShSM19NQVRDSF9UU0lDS0xFX0RFQ0wsIFIzX05PQ09MTEFQU0VfVFNJQ0tMRV9ERUNMKTtcbn1cbiJdfQ==