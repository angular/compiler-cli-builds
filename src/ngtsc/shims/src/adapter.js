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
        define("@angular/compiler-cli/src/ngtsc/shims/src/adapter", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/shims/src/expando", "@angular/compiler-cli/src/ngtsc/shims/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ShimAdapter = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var expando_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/expando");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/util");
    /**
     * Generates and tracks shim files for each original `ts.SourceFile`.
     *
     * The `ShimAdapter` provides an API that's designed to be used by a `ts.CompilerHost`
     * implementation and allows it to include synthetic "shim" files in the program that's being
     * created. It works for both freshly created programs as well as with reuse of an older program
     * (which already may contain shim files and thus have a different creation flow).
     */
    var ShimAdapter = /** @class */ (function () {
        function ShimAdapter(delegate, tsRootFiles, topLevelGenerators, perFileGenerators, oldProgram) {
            var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e;
            this.delegate = delegate;
            /**
             * A map of shim file names to the `ts.SourceFile` generated for those shims.
             */
            this.shims = new Map();
            /**
             * A map of shim file names to existing shims which were part of a previous iteration of this
             * program.
             *
             * Not all of these shims will be inherited into this program.
             */
            this.priorShims = new Map();
            /**
             * File names which are already known to not be shims.
             *
             * This allows for short-circuit returns without the expense of running regular expressions
             * against the filename repeatedly.
             */
            this.notShims = new Set();
            /**
             * The shim generators supported by this adapter as well as extra precalculated data facilitating
             * their use.
             */
            this.generators = [];
            /**
             * A `Set` of shim `ts.SourceFile`s which should not be emitted.
             */
            this.ignoreForEmit = new Set();
            /**
             * Extension prefixes of all installed per-file shims.
             */
            this.extensionPrefixes = [];
            try {
                // Initialize `this.generators` with a regex that matches each generator's paths.
                for (var perFileGenerators_1 = tslib_1.__values(perFileGenerators), perFileGenerators_1_1 = perFileGenerators_1.next(); !perFileGenerators_1_1.done; perFileGenerators_1_1 = perFileGenerators_1.next()) {
                    var gen = perFileGenerators_1_1.value;
                    // This regex matches paths for shims from this generator. The first (and only) capture group
                    // extracts the filename prefix, which can be used to find the original file that was used to
                    // generate this shim.
                    var pattern = "^(.*)\\." + gen.extensionPrefix + "\\.ts$";
                    var regexp = new RegExp(pattern, 'i');
                    this.generators.push({
                        generator: gen,
                        test: regexp,
                        suffix: "." + gen.extensionPrefix + ".ts",
                    });
                    this.extensionPrefixes.push(gen.extensionPrefix);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (perFileGenerators_1_1 && !perFileGenerators_1_1.done && (_a = perFileGenerators_1.return)) _a.call(perFileGenerators_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // Process top-level generators and pre-generate their shims. Accumulate the list of filenames
            // as extra input files.
            var extraInputFiles = [];
            try {
                for (var topLevelGenerators_1 = tslib_1.__values(topLevelGenerators), topLevelGenerators_1_1 = topLevelGenerators_1.next(); !topLevelGenerators_1_1.done; topLevelGenerators_1_1 = topLevelGenerators_1.next()) {
                    var gen = topLevelGenerators_1_1.value;
                    var sf = gen.makeTopLevelShim();
                    expando_1.sfExtensionData(sf).isTopLevelShim = true;
                    if (!gen.shouldEmit) {
                        this.ignoreForEmit.add(sf);
                    }
                    var fileName = file_system_1.absoluteFromSourceFile(sf);
                    this.shims.set(fileName, sf);
                    extraInputFiles.push(fileName);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (topLevelGenerators_1_1 && !topLevelGenerators_1_1.done && (_b = topLevelGenerators_1.return)) _b.call(topLevelGenerators_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                // Add to that list the per-file shims associated with each root file. This is needed because
                // reference tagging alone may not work in TS compilations that have `noResolve` set. Such
                // compilations rely on the list of input files completely describing the program.
                for (var tsRootFiles_1 = tslib_1.__values(tsRootFiles), tsRootFiles_1_1 = tsRootFiles_1.next(); !tsRootFiles_1_1.done; tsRootFiles_1_1 = tsRootFiles_1.next()) {
                    var rootFile = tsRootFiles_1_1.value;
                    try {
                        for (var _f = (e_4 = void 0, tslib_1.__values(this.generators)), _g = _f.next(); !_g.done; _g = _f.next()) {
                            var gen = _g.value;
                            extraInputFiles.push(util_1.makeShimFileName(rootFile, gen.suffix));
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (_g && !_g.done && (_d = _f.return)) _d.call(_f);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (tsRootFiles_1_1 && !tsRootFiles_1_1.done && (_c = tsRootFiles_1.return)) _c.call(tsRootFiles_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            this.extraInputFiles = extraInputFiles;
            // If an old program is present, extract all per-file shims into a map, which will be used to
            // generate new versions of those shims.
            if (oldProgram !== null) {
                try {
                    for (var _h = tslib_1.__values(oldProgram.getSourceFiles()), _j = _h.next(); !_j.done; _j = _h.next()) {
                        var oldSf = _j.value;
                        if (oldSf.isDeclarationFile || !expando_1.isFileShimSourceFile(oldSf)) {
                            continue;
                        }
                        this.priorShims.set(file_system_1.absoluteFromSourceFile(oldSf), oldSf);
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_j && !_j.done && (_e = _h.return)) _e.call(_h);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
            }
        }
        /**
         * Produce a shim `ts.SourceFile` if `fileName` refers to a shim file which should exist in the
         * program.
         *
         * If `fileName` does not refer to a potential shim file, `null` is returned. If a corresponding
         * base file could not be determined, `undefined` is returned instead.
         */
        ShimAdapter.prototype.maybeGenerate = function (fileName) {
            var e_6, _a;
            // Fast path: either this filename has been proven not to be a shim before, or it is a known
            // shim and no generation is required.
            if (this.notShims.has(fileName)) {
                return null;
            }
            else if (this.shims.has(fileName)) {
                return this.shims.get(fileName);
            }
            // .d.ts files can't be shims.
            if (typescript_1.isDtsPath(fileName)) {
                this.notShims.add(fileName);
                return null;
            }
            try {
                // This is the first time seeing this path. Try to match it against a shim generator.
                for (var _b = tslib_1.__values(this.generators), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var record = _c.value;
                    var match = record.test.exec(fileName);
                    if (match === null) {
                        continue;
                    }
                    // The path matched. Extract the filename prefix without the extension.
                    var prefix = match[1];
                    // This _might_ be a shim, if an underlying base file exists. The base file might be .ts or
                    // .tsx.
                    var baseFileName = file_system_1.absoluteFrom(prefix + '.ts');
                    if (!this.delegate.fileExists(baseFileName)) {
                        // No .ts file by that name - try .tsx.
                        baseFileName = file_system_1.absoluteFrom(prefix + '.tsx');
                        if (!this.delegate.fileExists(baseFileName)) {
                            // This isn't a shim after all since there is no original file which would have triggered
                            // its generation, even though the path is right. There are a few reasons why this could
                            // occur:
                            //
                            // * when resolving an import to an .ngfactory.d.ts file, the module resolution algorithm
                            //   will first look for an .ngfactory.ts file in its place, which will be requested here.
                            // * when the user writes a bad import.
                            // * when a file is present in one compilation and removed in the next incremental step.
                            //
                            // Note that this does not add the filename to `notShims`, so this path is not cached.
                            // That's okay as these cases above are edge cases and do not occur regularly in normal
                            // operations.
                            return undefined;
                        }
                    }
                    // Retrieve the original file for which the shim will be generated.
                    var inputFile = this.delegate.getSourceFile(baseFileName, ts.ScriptTarget.Latest);
                    if (inputFile === undefined || expando_1.isShim(inputFile)) {
                        // Something strange happened here. This case is also not cached in `notShims`, but this
                        // path is not expected to occur in reality so this shouldn't be a problem.
                        return undefined;
                    }
                    // Actually generate and cache the shim.
                    return this.generateSpecific(fileName, record.generator, inputFile);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_6) throw e_6.error; }
            }
            // No generator matched.
            this.notShims.add(fileName);
            return null;
        };
        ShimAdapter.prototype.generateSpecific = function (fileName, generator, inputFile) {
            var priorShimSf = null;
            if (this.priorShims.has(fileName)) {
                // In the previous program a shim with this name already existed. It's passed to the shim
                // generator which may reuse it instead of generating a fresh shim.
                priorShimSf = this.priorShims.get(fileName);
                this.priorShims.delete(fileName);
            }
            var shimSf = generator.generateShimForFile(inputFile, fileName, priorShimSf);
            // Mark the new generated source file as a shim that originated from this generator.
            expando_1.sfExtensionData(shimSf).fileShim = {
                extension: generator.extensionPrefix,
                generatedFrom: file_system_1.absoluteFromSourceFile(inputFile),
            };
            if (!generator.shouldEmit) {
                this.ignoreForEmit.add(shimSf);
            }
            this.shims.set(fileName, shimSf);
            return shimSf;
        };
        return ShimAdapter;
    }());
    exports.ShimAdapter = ShimAdapter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL2FkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQywyRUFBdUY7SUFDdkYsa0ZBQW9EO0lBR3BELDZFQUFxRjtJQUNyRix1RUFBd0M7SUFReEM7Ozs7Ozs7T0FPRztJQUNIO1FBOENFLHFCQUNZLFFBQTZELEVBQ3JFLFdBQTZCLEVBQUUsa0JBQTJDLEVBQzFFLGlCQUF5QyxFQUFFLFVBQTJCOztZQUY5RCxhQUFRLEdBQVIsUUFBUSxDQUFxRDtZQTlDekU7O2VBRUc7WUFDSyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7WUFFekQ7Ozs7O2VBS0c7WUFDSyxlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7WUFFOUQ7Ozs7O2VBS0c7WUFDSyxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7WUFFN0M7OztlQUdHO1lBQ0ssZUFBVSxHQUF3QixFQUFFLENBQUM7WUFFN0M7O2VBRUc7WUFDTSxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFpQixDQUFDO1lBVWxEOztlQUVHO1lBQ00sc0JBQWlCLEdBQWEsRUFBRSxDQUFDOztnQkFNeEMsaUZBQWlGO2dCQUNqRixLQUFrQixJQUFBLHNCQUFBLGlCQUFBLGlCQUFpQixDQUFBLG9EQUFBLG1GQUFFO29CQUFoQyxJQUFNLEdBQUcsOEJBQUE7b0JBQ1osNkZBQTZGO29CQUM3Riw2RkFBNkY7b0JBQzdGLHNCQUFzQjtvQkFDdEIsSUFBTSxPQUFPLEdBQUcsYUFBVyxHQUFHLENBQUMsZUFBZSxXQUFRLENBQUM7b0JBQ3ZELElBQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztv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QUUsTUFBTSxDQUFDLENBQUM7WUFDakMsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUNILGtCQUFDO0lBQUQsQ0FBQyxBQTNNRCxJQTJNQztJQTNNWSxrQ0FBVyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtpc0R0c1BhdGh9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtQZXJGaWxlU2hpbUdlbmVyYXRvciwgVG9wTGV2ZWxTaGltR2VuZXJhdG9yfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge2lzRmlsZVNoaW1Tb3VyY2VGaWxlLCBpc1NoaW0sIE5nRXh0ZW5zaW9uLCBzZkV4dGVuc2lvbkRhdGF9IGZyb20gJy4vZXhwYW5kbyc7XG5pbXBvcnQge21ha2VTaGltRmlsZU5hbWV9IGZyb20gJy4vdXRpbCc7XG5cbmludGVyZmFjZSBTaGltR2VuZXJhdG9yRGF0YSB7XG4gIGdlbmVyYXRvcjogUGVyRmlsZVNoaW1HZW5lcmF0b3I7XG4gIHRlc3Q6IFJlZ0V4cDtcbiAgc3VmZml4OiBzdHJpbmc7XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIGFuZCB0cmFja3Mgc2hpbSBmaWxlcyBmb3IgZWFjaCBvcmlnaW5hbCBgdHMuU291cmNlRmlsZWAuXG4gKlxuICogVGhlIGBTaGltQWRhcHRlcmAgcHJvdmlkZXMgYW4gQVBJIHRoYXQncyBkZXNpZ25lZCB0byBiZSB1c2VkIGJ5IGEgYHRzLkNvbXBpbGVySG9zdGBcbiAqIGltcGxlbWVudGF0aW9uIGFuZCBhbGxvd3MgaXQgdG8gaW5jbHVkZSBzeW50aGV0aWMgXCJzaGltXCIgZmlsZXMgaW4gdGhlIHByb2dyYW0gdGhhdCdzIGJlaW5nXG4gKiBjcmVhdGVkLiBJdCB3b3JrcyBmb3IgYm90aCBmcmVzaGx5IGNyZWF0ZWQgcHJvZ3JhbXMgYXMgd2VsbCBhcyB3aXRoIHJldXNlIG9mIGFuIG9sZGVyIHByb2dyYW1cbiAqICh3aGljaCBhbHJlYWR5IG1heSBjb250YWluIHNoaW0gZmlsZXMgYW5kIHRodXMgaGF2ZSBhIGRpZmZlcmVudCBjcmVhdGlvbiBmbG93KS5cbiAqL1xuZXhwb3J0IGNsYXNzIFNoaW1BZGFwdGVyIHtcbiAgLyoqXG4gICAqIEEgbWFwIG9mIHNoaW0gZmlsZSBuYW1lcyB0byB0aGUgYHRzLlNvdXJjZUZpbGVgIGdlbmVyYXRlZCBmb3IgdGhvc2Ugc2hpbXMuXG4gICAqL1xuICBwcml2YXRlIHNoaW1zID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgdHMuU291cmNlRmlsZT4oKTtcblxuICAvKipcbiAgICogQSBtYXAgb2Ygc2hpbSBmaWxlIG5hbWVzIHRvIGV4aXN0aW5nIHNoaW1zIHdoaWNoIHdlcmUgcGFydCBvZiBhIHByZXZpb3VzIGl0ZXJhdGlvbiBvZiB0aGlzXG4gICAqIHByb2dyYW0uXG4gICAqXG4gICAqIE5vdCBhbGwgb2YgdGhlc2Ugc2hpbXMgd2lsbCBiZSBpbmhlcml0ZWQgaW50byB0aGlzIHByb2dyYW0uXG4gICAqL1xuICBwcml2YXRlIHByaW9yU2hpbXMgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCB0cy5Tb3VyY2VGaWxlPigpO1xuXG4gIC8qKlxuICAgKiBGaWxlIG5hbWVzIHdoaWNoIGFyZSBhbHJlYWR5IGtub3duIHRvIG5vdCBiZSBzaGltcy5cbiAgICpcbiAgICogVGhpcyBhbGxvd3MgZm9yIHNob3J0LWNpcmN1aXQgcmV0dXJucyB3aXRob3V0IHRoZSBleHBlbnNlIG9mIHJ1bm5pbmcgcmVndWxhciBleHByZXNzaW9uc1xuICAgKiBhZ2FpbnN0IHRoZSBmaWxlbmFtZSByZXBlYXRlZGx5LlxuICAgKi9cbiAgcHJpdmF0ZSBub3RTaGltcyA9IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCk7XG5cbiAgLyoqXG4gICAqIFRoZSBzaGltIGdlbmVyYXRvcnMgc3VwcG9ydGVkIGJ5IHRoaXMgYWRhcHRlciBhcyB3ZWxsIGFzIGV4dHJhIHByZWNhbGN1bGF0ZWQgZGF0YSBmYWNpbGl0YXRpbmdcbiAgICogdGhlaXIgdXNlLlxuICAgKi9cbiAgcHJpdmF0ZSBnZW5lcmF0b3JzOiBTaGltR2VuZXJhdG9yRGF0YVtdID0gW107XG5cbiAgLyoqXG4gICAqIEEgYFNldGAgb2Ygc2hpbSBgdHMuU291cmNlRmlsZWBzIHdoaWNoIHNob3VsZCBub3QgYmUgZW1pdHRlZC5cbiAgICovXG4gIHJlYWRvbmx5IGlnbm9yZUZvckVtaXQgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KCk7XG5cbiAgLyoqXG4gICAqIEEgbGlzdCBvZiBleHRyYSBmaWxlbmFtZXMgd2hpY2ggc2hvdWxkIGJlIGNvbnNpZGVyZWQgaW5wdXRzIHRvIHByb2dyYW0gY3JlYXRpb24uXG4gICAqXG4gICAqIFRoaXMgaW5jbHVkZXMgYW55IHRvcC1sZXZlbCBzaGltcyBnZW5lcmF0ZWQgZm9yIHRoZSBwcm9ncmFtLCBhcyB3ZWxsIGFzIHBlci1maWxlIHNoaW0gbmFtZXMgZm9yXG4gICAqIHRob3NlIGZpbGVzIHdoaWNoIGFyZSBpbmNsdWRlZCBpbiB0aGUgcm9vdCBmaWxlcyBvZiB0aGUgcHJvZ3JhbS5cbiAgICovXG4gIHJlYWRvbmx5IGV4dHJhSW5wdXRGaWxlczogUmVhZG9ubHlBcnJheTxBYnNvbHV0ZUZzUGF0aD47XG5cbiAgLyoqXG4gICAqIEV4dGVuc2lvbiBwcmVmaXhlcyBvZiBhbGwgaW5zdGFsbGVkIHBlci1maWxlIHNoaW1zLlxuICAgKi9cbiAgcmVhZG9ubHkgZXh0ZW5zaW9uUHJlZml4ZXM6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGRlbGVnYXRlOiBQaWNrPHRzLkNvbXBpbGVySG9zdCwgJ2dldFNvdXJjZUZpbGUnfCdmaWxlRXhpc3RzJz4sXG4gICAgICB0c1Jvb3RGaWxlczogQWJzb2x1dGVGc1BhdGhbXSwgdG9wTGV2ZWxHZW5lcmF0b3JzOiBUb3BMZXZlbFNoaW1HZW5lcmF0b3JbXSxcbiAgICAgIHBlckZpbGVHZW5lcmF0b3JzOiBQZXJGaWxlU2hpbUdlbmVyYXRvcltdLCBvbGRQcm9ncmFtOiB0cy5Qcm9ncmFtfG51bGwpIHtcbiAgICAvLyBJbml0aWFsaXplIGB0aGlzLmdlbmVyYXRvcnNgIHdpdGggYSByZWdleCB0aGF0IG1hdGNoZXMgZWFjaCBnZW5lcmF0b3IncyBwYXRocy5cbiAgICBmb3IgKGNvbnN0IGdlbiBvZiBwZXJGaWxlR2VuZXJhdG9ycykge1xuICAgICAgLy8gVGhpcyByZWdleCBtYXRjaGVzIHBhdGhzIGZvciBzaGltcyBmcm9tIHRoaXMgZ2VuZXJhdG9yLiBUaGUgZmlyc3QgKGFuZCBvbmx5KSBjYXB0dXJlIGdyb3VwXG4gICAgICAvLyBleHRyYWN0cyB0aGUgZmlsZW5hbWUgcHJlZml4LCB3aGljaCBjYW4gYmUgdXNlZCB0byBmaW5kIHRoZSBvcmlnaW5hbCBmaWxlIHRoYXQgd2FzIHVzZWQgdG9cbiAgICAgIC8vIGdlbmVyYXRlIHRoaXMgc2hpbS5cbiAgICAgIGNvbnN0IHBhdHRlcm4gPSBgXiguKilcXFxcLiR7Z2VuLmV4dGVuc2lvblByZWZpeH1cXFxcLnRzJGA7XG4gICAgICBjb25zdCByZWdleHAgPSBuZXcgUmVnRXhwKHBhdHRlcm4sICdpJyk7XG4gICAgICB0aGlzLmdlbmVyYXRvcnMucHVzaCh7XG4gICAgICAgIGdlbmVyYXRvcjogZ2VuLFxuICAgICAgICB0ZXN0OiByZWdleHAsXG4gICAgICAgIHN1ZmZpeDogYC4ke2dlbi5leHRlbnNpb25QcmVmaXh9LnRzYCxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5leHRlbnNpb25QcmVmaXhlcy5wdXNoKGdlbi5leHRlbnNpb25QcmVmaXgpO1xuICAgIH1cbiAgICAvLyBQcm9jZXNzIHRvcC1sZXZlbCBnZW5lcmF0b3JzIGFuZCBwcmUtZ2VuZXJhdGUgdGhlaXIgc2hpbXMuIEFjY3VtdWxhdGUgdGhlIGxpc3Qgb2YgZmlsZW5hbWVzXG4gICAgLy8gYXMgZXh0cmEgaW5wdXQgZmlsZXMuXG4gICAgY29uc3QgZXh0cmFJbnB1dEZpbGVzOiBBYnNvbHV0ZUZzUGF0aFtdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGdlbiBvZiB0b3BMZXZlbEdlbmVyYXRvcnMpIHtcbiAgICAgIGNvbnN0IHNmID0gZ2VuLm1ha2VUb3BMZXZlbFNoaW0oKTtcbiAgICAgIHNmRXh0ZW5zaW9uRGF0YShzZikuaXNUb3BMZXZlbFNoaW0gPSB0cnVlO1xuXG4gICAgICBpZiAoIWdlbi5zaG91bGRFbWl0KSB7XG4gICAgICAgIHRoaXMuaWdub3JlRm9yRW1pdC5hZGQoc2YpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBmaWxlTmFtZSA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgICAgdGhpcy5zaGltcy5zZXQoZmlsZU5hbWUsIHNmKTtcbiAgICAgIGV4dHJhSW5wdXRGaWxlcy5wdXNoKGZpbGVOYW1lKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdG8gdGhhdCBsaXN0IHRoZSBwZXItZmlsZSBzaGltcyBhc3NvY2lhdGVkIHdpdGggZWFjaCByb290IGZpbGUuIFRoaXMgaXMgbmVlZGVkIGJlY2F1c2VcbiAgICAvLyByZWZlcmVuY2UgdGFnZ2luZyBhbG9uZSBtYXkgbm90IHdvcmsgaW4gVFMgY29tcGlsYXRpb25zIHRoYXQgaGF2ZSBgbm9SZXNvbHZlYCBzZXQuIFN1Y2hcbiAgICAvLyBjb21waWxhdGlvbnMgcmVseSBvbiB0aGUgbGlzdCBvZiBpbnB1dCBmaWxlcyBjb21wbGV0ZWx5IGRlc2NyaWJpbmcgdGhlIHByb2dyYW0uXG4gICAgZm9yIChjb25zdCByb290RmlsZSBvZiB0c1Jvb3RGaWxlcykge1xuICAgICAgZm9yIChjb25zdCBnZW4gb2YgdGhpcy5nZW5lcmF0b3JzKSB7XG4gICAgICAgIGV4dHJhSW5wdXRGaWxlcy5wdXNoKG1ha2VTaGltRmlsZU5hbWUocm9vdEZpbGUsIGdlbi5zdWZmaXgpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmV4dHJhSW5wdXRGaWxlcyA9IGV4dHJhSW5wdXRGaWxlcztcblxuICAgIC8vIElmIGFuIG9sZCBwcm9ncmFtIGlzIHByZXNlbnQsIGV4dHJhY3QgYWxsIHBlci1maWxlIHNoaW1zIGludG8gYSBtYXAsIHdoaWNoIHdpbGwgYmUgdXNlZCB0b1xuICAgIC8vIGdlbmVyYXRlIG5ldyB2ZXJzaW9ucyBvZiB0aG9zZSBzaGltcy5cbiAgICBpZiAob2xkUHJvZ3JhbSAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBvbGRTZiBvZiBvbGRQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgICAgaWYgKG9sZFNmLmlzRGVjbGFyYXRpb25GaWxlIHx8ICFpc0ZpbGVTaGltU291cmNlRmlsZShvbGRTZikpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucHJpb3JTaGltcy5zZXQoYWJzb2x1dGVGcm9tU291cmNlRmlsZShvbGRTZiksIG9sZFNmKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHJvZHVjZSBhIHNoaW0gYHRzLlNvdXJjZUZpbGVgIGlmIGBmaWxlTmFtZWAgcmVmZXJzIHRvIGEgc2hpbSBmaWxlIHdoaWNoIHNob3VsZCBleGlzdCBpbiB0aGVcbiAgICogcHJvZ3JhbS5cbiAgICpcbiAgICogSWYgYGZpbGVOYW1lYCBkb2VzIG5vdCByZWZlciB0byBhIHBvdGVudGlhbCBzaGltIGZpbGUsIGBudWxsYCBpcyByZXR1cm5lZC4gSWYgYSBjb3JyZXNwb25kaW5nXG4gICAqIGJhc2UgZmlsZSBjb3VsZCBub3QgYmUgZGV0ZXJtaW5lZCwgYHVuZGVmaW5lZGAgaXMgcmV0dXJuZWQgaW5zdGVhZC5cbiAgICovXG4gIG1heWJlR2VuZXJhdGUoZmlsZU5hbWU6IEFic29sdXRlRnNQYXRoKTogdHMuU291cmNlRmlsZXxudWxsfHVuZGVmaW5lZCB7XG4gICAgLy8gRmFzdCBwYXRoOiBlaXRoZXIgdGhpcyBmaWxlbmFtZSBoYXMgYmVlbiBwcm92ZW4gbm90IHRvIGJlIGEgc2hpbSBiZWZvcmUsIG9yIGl0IGlzIGEga25vd25cbiAgICAvLyBzaGltIGFuZCBubyBnZW5lcmF0aW9uIGlzIHJlcXVpcmVkLlxuICAgIGlmICh0aGlzLm5vdFNoaW1zLmhhcyhmaWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAodGhpcy5zaGltcy5oYXMoZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5zaGltcy5nZXQoZmlsZU5hbWUpITtcbiAgICB9XG5cbiAgICAvLyAuZC50cyBmaWxlcyBjYW4ndCBiZSBzaGltcy5cbiAgICBpZiAoaXNEdHNQYXRoKGZpbGVOYW1lKSkge1xuICAgICAgdGhpcy5ub3RTaGltcy5hZGQoZmlsZU5hbWUpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBpcyB0aGUgZmlyc3QgdGltZSBzZWVpbmcgdGhpcyBwYXRoLiBUcnkgdG8gbWF0Y2ggaXQgYWdhaW5zdCBhIHNoaW0gZ2VuZXJhdG9yLlxuICAgIGZvciAoY29uc3QgcmVjb3JkIG9mIHRoaXMuZ2VuZXJhdG9ycykge1xuICAgICAgY29uc3QgbWF0Y2ggPSByZWNvcmQudGVzdC5leGVjKGZpbGVOYW1lKTtcbiAgICAgIGlmIChtYXRjaCA9PT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIHBhdGggbWF0Y2hlZC4gRXh0cmFjdCB0aGUgZmlsZW5hbWUgcHJlZml4IHdpdGhvdXQgdGhlIGV4dGVuc2lvbi5cbiAgICAgIGNvbnN0IHByZWZpeCA9IG1hdGNoWzFdO1xuICAgICAgLy8gVGhpcyBfbWlnaHRfIGJlIGEgc2hpbSwgaWYgYW4gdW5kZXJseWluZyBiYXNlIGZpbGUgZXhpc3RzLiBUaGUgYmFzZSBmaWxlIG1pZ2h0IGJlIC50cyBvclxuICAgICAgLy8gLnRzeC5cbiAgICAgIGxldCBiYXNlRmlsZU5hbWUgPSBhYnNvbHV0ZUZyb20ocHJlZml4ICsgJy50cycpO1xuICAgICAgaWYgKCF0aGlzLmRlbGVnYXRlLmZpbGVFeGlzdHMoYmFzZUZpbGVOYW1lKSkge1xuICAgICAgICAvLyBObyAudHMgZmlsZSBieSB0aGF0IG5hbWUgLSB0cnkgLnRzeC5cbiAgICAgICAgYmFzZUZpbGVOYW1lID0gYWJzb2x1dGVGcm9tKHByZWZpeCArICcudHN4Jyk7XG4gICAgICAgIGlmICghdGhpcy5kZWxlZ2F0ZS5maWxlRXhpc3RzKGJhc2VGaWxlTmFtZSkpIHtcbiAgICAgICAgICAvLyBUaGlzIGlzbid0IGEgc2hpbSBhZnRlciBhbGwgc2luY2UgdGhlcmUgaXMgbm8gb3JpZ2luYWwgZmlsZSB3aGljaCB3b3VsZCBoYXZlIHRyaWdnZXJlZFxuICAgICAgICAgIC8vIGl0cyBnZW5lcmF0aW9uLCBldmVuIHRob3VnaCB0aGUgcGF0aCBpcyByaWdodC4gVGhlcmUgYXJlIGEgZmV3IHJlYXNvbnMgd2h5IHRoaXMgY291bGRcbiAgICAgICAgICAvLyBvY2N1cjpcbiAgICAgICAgICAvL1xuICAgICAgICAgIC8vICogd2hlbiByZXNvbHZpbmcgYW4gaW1wb3J0IHRvIGFuIC5uZ2ZhY3RvcnkuZC50cyBmaWxlLCB0aGUgbW9kdWxlIHJlc29sdXRpb24gYWxnb3JpdGhtXG4gICAgICAgICAgLy8gICB3aWxsIGZpcnN0IGxvb2sgZm9yIGFuIC5uZ2ZhY3RvcnkudHMgZmlsZSBpbiBpdHMgcGxhY2UsIHdoaWNoIHdpbGwgYmUgcmVxdWVzdGVkIGhlcmUuXG4gICAgICAgICAgLy8gKiB3aGVuIHRoZSB1c2VyIHdyaXRlcyBhIGJhZCBpbXBvcnQuXG4gICAgICAgICAgLy8gKiB3aGVuIGEgZmlsZSBpcyBwcmVzZW50IGluIG9uZSBjb21waWxhdGlvbiBhbmQgcmVtb3ZlZCBpbiB0aGUgbmV4dCBpbmNyZW1lbnRhbCBzdGVwLlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gTm90ZSB0aGF0IHRoaXMgZG9lcyBub3QgYWRkIHRoZSBmaWxlbmFtZSB0byBgbm90U2hpbXNgLCBzbyB0aGlzIHBhdGggaXMgbm90IGNhY2hlZC5cbiAgICAgICAgICAvLyBUaGF0J3Mgb2theSBhcyB0aGVzZSBjYXNlcyBhYm92ZSBhcmUgZWRnZSBjYXNlcyBhbmQgZG8gbm90IG9jY3VyIHJlZ3VsYXJseSBpbiBub3JtYWxcbiAgICAgICAgICAvLyBvcGVyYXRpb25zLlxuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gUmV0cmlldmUgdGhlIG9yaWdpbmFsIGZpbGUgZm9yIHdoaWNoIHRoZSBzaGltIHdpbGwgYmUgZ2VuZXJhdGVkLlxuICAgICAgY29uc3QgaW5wdXRGaWxlID0gdGhpcy5kZWxlZ2F0ZS5nZXRTb3VyY2VGaWxlKGJhc2VGaWxlTmFtZSwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCk7XG4gICAgICBpZiAoaW5wdXRGaWxlID09PSB1bmRlZmluZWQgfHwgaXNTaGltKGlucHV0RmlsZSkpIHtcbiAgICAgICAgLy8gU29tZXRoaW5nIHN0cmFuZ2UgaGFwcGVuZWQgaGVyZS4gVGhpcyBjYXNlIGlzIGFsc28gbm90IGNhY2hlZCBpbiBgbm90U2hpbXNgLCBidXQgdGhpc1xuICAgICAgICAvLyBwYXRoIGlzIG5vdCBleHBlY3RlZCB0byBvY2N1ciBpbiByZWFsaXR5IHNvIHRoaXMgc2hvdWxkbid0IGJlIGEgcHJvYmxlbS5cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgLy8gQWN0dWFsbHkgZ2VuZXJhdGUgYW5kIGNhY2hlIHRoZSBzaGltLlxuICAgICAgcmV0dXJuIHRoaXMuZ2VuZXJhdGVTcGVjaWZpYyhmaWxlTmFtZSwgcmVjb3JkLmdlbmVyYXRvciwgaW5wdXRGaWxlKTtcbiAgICB9XG5cbiAgICAvLyBObyBnZW5lcmF0b3IgbWF0Y2hlZC5cbiAgICB0aGlzLm5vdFNoaW1zLmFkZChmaWxlTmFtZSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlU3BlY2lmaWMoXG4gICAgICBmaWxlTmFtZTogQWJzb2x1dGVGc1BhdGgsIGdlbmVyYXRvcjogUGVyRmlsZVNoaW1HZW5lcmF0b3IsXG4gICAgICBpbnB1dEZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICBsZXQgcHJpb3JTaGltU2Y6IHRzLlNvdXJjZUZpbGV8bnVsbCA9IG51bGw7XG4gICAgaWYgKHRoaXMucHJpb3JTaGltcy5oYXMoZmlsZU5hbWUpKSB7XG4gICAgICAvLyBJbiB0aGUgcHJldmlvdXMgcHJvZ3JhbSBhIHNoaW0gd2l0aCB0aGlzIG5hbWUgYWxyZWFkeSBleGlzdGVkLiBJdCdzIHBhc3NlZCB0byB0aGUgc2hpbVxuICAgICAgLy8gZ2VuZXJhdG9yIHdoaWNoIG1heSByZXVzZSBpdCBpbnN0ZWFkIG9mIGdlbmVyYXRpbmcgYSBmcmVzaCBzaGltLlxuXG4gICAgICBwcmlvclNoaW1TZiA9IHRoaXMucHJpb3JTaGltcy5nZXQoZmlsZU5hbWUpITtcbiAgICAgIHRoaXMucHJpb3JTaGltcy5kZWxldGUoZmlsZU5hbWUpO1xuICAgIH1cblxuICAgIGNvbnN0IHNoaW1TZiA9IGdlbmVyYXRvci5nZW5lcmF0ZVNoaW1Gb3JGaWxlKGlucHV0RmlsZSwgZmlsZU5hbWUsIHByaW9yU2hpbVNmKTtcblxuICAgIC8vIE1hcmsgdGhlIG5ldyBnZW5lcmF0ZWQgc291cmNlIGZpbGUgYXMgYSBzaGltIHRoYXQgb3JpZ2luYXRlZCBmcm9tIHRoaXMgZ2VuZXJhdG9yLlxuICAgIHNmRXh0ZW5zaW9uRGF0YShzaGltU2YpLmZpbGVTaGltID0ge1xuICAgICAgZXh0ZW5zaW9uOiBnZW5lcmF0b3IuZXh0ZW5zaW9uUHJlZml4LFxuICAgICAgZ2VuZXJhdGVkRnJvbTogYWJzb2x1dGVGcm9tU291cmNlRmlsZShpbnB1dEZpbGUpLFxuICAgIH07XG5cbiAgICBpZiAoIWdlbmVyYXRvci5zaG91bGRFbWl0KSB7XG4gICAgICB0aGlzLmlnbm9yZUZvckVtaXQuYWRkKHNoaW1TZik7XG4gICAgfVxuXG4gICAgdGhpcy5zaGltcy5zZXQoZmlsZU5hbWUsIHNoaW1TZik7XG4gICAgcmV0dXJuIHNoaW1TZjtcbiAgfVxufVxuIl19