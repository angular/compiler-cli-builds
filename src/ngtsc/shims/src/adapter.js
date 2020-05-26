/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL2FkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQywyRUFBdUY7SUFDdkYsa0ZBQW9EO0lBR3BELDZFQUFxRjtJQUNyRix1RUFBd0M7SUFReEM7Ozs7Ozs7T0FPRztJQUNIO1FBOENFLHFCQUNZLFFBQTZELEVBQ3JFLFdBQTZCLEVBQUUsa0JBQTJDLEVBQzFFLGlCQUF5QyxFQUFFLFVBQTJCOztZQUY5RCxhQUFRLEdBQVIsUUFBUSxDQUFxRDtZQTlDekU7O2VBRUc7WUFDSyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7WUFFekQ7Ozs7O2VBS0c7WUFDSyxlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7WUFFOUQ7Ozs7O2VBS0c7WUFDSyxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7WUFFN0M7OztlQUdHO1lBQ0ssZUFBVSxHQUF3QixFQUFFLENBQUM7WUFFN0M7O2VBRUc7WUFDTSxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFpQixDQUFDO1lBVWxEOztlQUVHO1lBQ00sc0JBQWlCLEdBQWEsRUFBRSxDQUFDOztnQkFNeEMsaUZBQWlGO2dCQUNqRixLQUFrQixJQUFBLHNCQUFBLGlCQUFBLGlCQUFpQixDQUFBLG9EQUFBLG1GQUFFO29CQUFoQyxJQUFNLEdBQUcsOEJBQUE7b0JBQ1osNkZBQTZGO29CQUM3Riw2RkFBNkY7b0JBQzdGLHNCQUFzQjtvQkFDdEIsSUFBTSxPQUFPLEdBQUcsYUFBVyxHQUFHLENBQUMsZUFBZSxXQUFRLENBQUM7b0JBQ3ZELElBQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztv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QUUsTUFBTSxDQUFDLENBQUM7WUFDakMsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUNILGtCQUFDO0lBQUQsQ0FBQyxBQTNNRCxJQTJNQztJQTNNWSxrQ0FBVyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb20sIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2lzRHRzUGF0aH0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5pbXBvcnQge1BlckZpbGVTaGltR2VuZXJhdG9yLCBUb3BMZXZlbFNoaW1HZW5lcmF0b3J9IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7aXNGaWxlU2hpbVNvdXJjZUZpbGUsIGlzU2hpbSwgTmdFeHRlbnNpb24sIHNmRXh0ZW5zaW9uRGF0YX0gZnJvbSAnLi9leHBhbmRvJztcbmltcG9ydCB7bWFrZVNoaW1GaWxlTmFtZX0gZnJvbSAnLi91dGlsJztcblxuaW50ZXJmYWNlIFNoaW1HZW5lcmF0b3JEYXRhIHtcbiAgZ2VuZXJhdG9yOiBQZXJGaWxlU2hpbUdlbmVyYXRvcjtcbiAgdGVzdDogUmVnRXhwO1xuICBzdWZmaXg6IHN0cmluZztcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgYW5kIHRyYWNrcyBzaGltIGZpbGVzIGZvciBlYWNoIG9yaWdpbmFsIGB0cy5Tb3VyY2VGaWxlYC5cbiAqXG4gKiBUaGUgYFNoaW1BZGFwdGVyYCBwcm92aWRlcyBhbiBBUEkgdGhhdCdzIGRlc2lnbmVkIHRvIGJlIHVzZWQgYnkgYSBgdHMuQ29tcGlsZXJIb3N0YFxuICogaW1wbGVtZW50YXRpb24gYW5kIGFsbG93cyBpdCB0byBpbmNsdWRlIHN5bnRoZXRpYyBcInNoaW1cIiBmaWxlcyBpbiB0aGUgcHJvZ3JhbSB0aGF0J3MgYmVpbmdcbiAqIGNyZWF0ZWQuIEl0IHdvcmtzIGZvciBib3RoIGZyZXNobHkgY3JlYXRlZCBwcm9ncmFtcyBhcyB3ZWxsIGFzIHdpdGggcmV1c2Ugb2YgYW4gb2xkZXIgcHJvZ3JhbVxuICogKHdoaWNoIGFscmVhZHkgbWF5IGNvbnRhaW4gc2hpbSBmaWxlcyBhbmQgdGh1cyBoYXZlIGEgZGlmZmVyZW50IGNyZWF0aW9uIGZsb3cpLlxuICovXG5leHBvcnQgY2xhc3MgU2hpbUFkYXB0ZXIge1xuICAvKipcbiAgICogQSBtYXAgb2Ygc2hpbSBmaWxlIG5hbWVzIHRvIHRoZSBgdHMuU291cmNlRmlsZWAgZ2VuZXJhdGVkIGZvciB0aG9zZSBzaGltcy5cbiAgICovXG4gIHByaXZhdGUgc2hpbXMgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCB0cy5Tb3VyY2VGaWxlPigpO1xuXG4gIC8qKlxuICAgKiBBIG1hcCBvZiBzaGltIGZpbGUgbmFtZXMgdG8gZXhpc3Rpbmcgc2hpbXMgd2hpY2ggd2VyZSBwYXJ0IG9mIGEgcHJldmlvdXMgaXRlcmF0aW9uIG9mIHRoaXNcbiAgICogcHJvZ3JhbS5cbiAgICpcbiAgICogTm90IGFsbCBvZiB0aGVzZSBzaGltcyB3aWxsIGJlIGluaGVyaXRlZCBpbnRvIHRoaXMgcHJvZ3JhbS5cbiAgICovXG4gIHByaXZhdGUgcHJpb3JTaGltcyA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIHRzLlNvdXJjZUZpbGU+KCk7XG5cbiAgLyoqXG4gICAqIEZpbGUgbmFtZXMgd2hpY2ggYXJlIGFscmVhZHkga25vd24gdG8gbm90IGJlIHNoaW1zLlxuICAgKlxuICAgKiBUaGlzIGFsbG93cyBmb3Igc2hvcnQtY2lyY3VpdCByZXR1cm5zIHdpdGhvdXQgdGhlIGV4cGVuc2Ugb2YgcnVubmluZyByZWd1bGFyIGV4cHJlc3Npb25zXG4gICAqIGFnYWluc3QgdGhlIGZpbGVuYW1lIHJlcGVhdGVkbHkuXG4gICAqL1xuICBwcml2YXRlIG5vdFNoaW1zID0gbmV3IFNldDxBYnNvbHV0ZUZzUGF0aD4oKTtcblxuICAvKipcbiAgICogVGhlIHNoaW0gZ2VuZXJhdG9ycyBzdXBwb3J0ZWQgYnkgdGhpcyBhZGFwdGVyIGFzIHdlbGwgYXMgZXh0cmEgcHJlY2FsY3VsYXRlZCBkYXRhIGZhY2lsaXRhdGluZ1xuICAgKiB0aGVpciB1c2UuXG4gICAqL1xuICBwcml2YXRlIGdlbmVyYXRvcnM6IFNoaW1HZW5lcmF0b3JEYXRhW10gPSBbXTtcblxuICAvKipcbiAgICogQSBgU2V0YCBvZiBzaGltIGB0cy5Tb3VyY2VGaWxlYHMgd2hpY2ggc2hvdWxkIG5vdCBiZSBlbWl0dGVkLlxuICAgKi9cbiAgcmVhZG9ubHkgaWdub3JlRm9yRW1pdCA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4oKTtcblxuICAvKipcbiAgICogQSBsaXN0IG9mIGV4dHJhIGZpbGVuYW1lcyB3aGljaCBzaG91bGQgYmUgY29uc2lkZXJlZCBpbnB1dHMgdG8gcHJvZ3JhbSBjcmVhdGlvbi5cbiAgICpcbiAgICogVGhpcyBpbmNsdWRlcyBhbnkgdG9wLWxldmVsIHNoaW1zIGdlbmVyYXRlZCBmb3IgdGhlIHByb2dyYW0sIGFzIHdlbGwgYXMgcGVyLWZpbGUgc2hpbSBuYW1lcyBmb3JcbiAgICogdGhvc2UgZmlsZXMgd2hpY2ggYXJlIGluY2x1ZGVkIGluIHRoZSByb290IGZpbGVzIG9mIHRoZSBwcm9ncmFtLlxuICAgKi9cbiAgcmVhZG9ubHkgZXh0cmFJbnB1dEZpbGVzOiBSZWFkb25seUFycmF5PEFic29sdXRlRnNQYXRoPjtcblxuICAvKipcbiAgICogRXh0ZW5zaW9uIHByZWZpeGVzIG9mIGFsbCBpbnN0YWxsZWQgcGVyLWZpbGUgc2hpbXMuXG4gICAqL1xuICByZWFkb25seSBleHRlbnNpb25QcmVmaXhlczogc3RyaW5nW10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZGVsZWdhdGU6IFBpY2s8dHMuQ29tcGlsZXJIb3N0LCAnZ2V0U291cmNlRmlsZSd8J2ZpbGVFeGlzdHMnPixcbiAgICAgIHRzUm9vdEZpbGVzOiBBYnNvbHV0ZUZzUGF0aFtdLCB0b3BMZXZlbEdlbmVyYXRvcnM6IFRvcExldmVsU2hpbUdlbmVyYXRvcltdLFxuICAgICAgcGVyRmlsZUdlbmVyYXRvcnM6IFBlckZpbGVTaGltR2VuZXJhdG9yW10sIG9sZFByb2dyYW06IHRzLlByb2dyYW18bnVsbCkge1xuICAgIC8vIEluaXRpYWxpemUgYHRoaXMuZ2VuZXJhdG9yc2Agd2l0aCBhIHJlZ2V4IHRoYXQgbWF0Y2hlcyBlYWNoIGdlbmVyYXRvcidzIHBhdGhzLlxuICAgIGZvciAoY29uc3QgZ2VuIG9mIHBlckZpbGVHZW5lcmF0b3JzKSB7XG4gICAgICAvLyBUaGlzIHJlZ2V4IG1hdGNoZXMgcGF0aHMgZm9yIHNoaW1zIGZyb20gdGhpcyBnZW5lcmF0b3IuIFRoZSBmaXJzdCAoYW5kIG9ubHkpIGNhcHR1cmUgZ3JvdXBcbiAgICAgIC8vIGV4dHJhY3RzIHRoZSBmaWxlbmFtZSBwcmVmaXgsIHdoaWNoIGNhbiBiZSB1c2VkIHRvIGZpbmQgdGhlIG9yaWdpbmFsIGZpbGUgdGhhdCB3YXMgdXNlZCB0b1xuICAgICAgLy8gZ2VuZXJhdGUgdGhpcyBzaGltLlxuICAgICAgY29uc3QgcGF0dGVybiA9IGBeKC4qKVxcXFwuJHtnZW4uZXh0ZW5zaW9uUHJlZml4fVxcXFwudHMkYDtcbiAgICAgIGNvbnN0IHJlZ2V4cCA9IG5ldyBSZWdFeHAocGF0dGVybiwgJ2knKTtcbiAgICAgIHRoaXMuZ2VuZXJhdG9ycy5wdXNoKHtcbiAgICAgICAgZ2VuZXJhdG9yOiBnZW4sXG4gICAgICAgIHRlc3Q6IHJlZ2V4cCxcbiAgICAgICAgc3VmZml4OiBgLiR7Z2VuLmV4dGVuc2lvblByZWZpeH0udHNgLFxuICAgICAgfSk7XG4gICAgICB0aGlzLmV4dGVuc2lvblByZWZpeGVzLnB1c2goZ2VuLmV4dGVuc2lvblByZWZpeCk7XG4gICAgfVxuICAgIC8vIFByb2Nlc3MgdG9wLWxldmVsIGdlbmVyYXRvcnMgYW5kIHByZS1nZW5lcmF0ZSB0aGVpciBzaGltcy4gQWNjdW11bGF0ZSB0aGUgbGlzdCBvZiBmaWxlbmFtZXNcbiAgICAvLyBhcyBleHRyYSBpbnB1dCBmaWxlcy5cbiAgICBjb25zdCBleHRyYUlucHV0RmlsZXM6IEFic29sdXRlRnNQYXRoW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgZ2VuIG9mIHRvcExldmVsR2VuZXJhdG9ycykge1xuICAgICAgY29uc3Qgc2YgPSBnZW4ubWFrZVRvcExldmVsU2hpbSgpO1xuICAgICAgc2ZFeHRlbnNpb25EYXRhKHNmKS5pc1RvcExldmVsU2hpbSA9IHRydWU7XG5cbiAgICAgIGlmICghZ2VuLnNob3VsZEVtaXQpIHtcbiAgICAgICAgdGhpcy5pZ25vcmVGb3JFbWl0LmFkZChzZik7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZpbGVOYW1lID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgICB0aGlzLnNoaW1zLnNldChmaWxlTmFtZSwgc2YpO1xuICAgICAgZXh0cmFJbnB1dEZpbGVzLnB1c2goZmlsZU5hbWUpO1xuICAgIH1cblxuICAgIC8vIEFkZCB0byB0aGF0IGxpc3QgdGhlIHBlci1maWxlIHNoaW1zIGFzc29jaWF0ZWQgd2l0aCBlYWNoIHJvb3QgZmlsZS4gVGhpcyBpcyBuZWVkZWQgYmVjYXVzZVxuICAgIC8vIHJlZmVyZW5jZSB0YWdnaW5nIGFsb25lIG1heSBub3Qgd29yayBpbiBUUyBjb21waWxhdGlvbnMgdGhhdCBoYXZlIGBub1Jlc29sdmVgIHNldC4gU3VjaFxuICAgIC8vIGNvbXBpbGF0aW9ucyByZWx5IG9uIHRoZSBsaXN0IG9mIGlucHV0IGZpbGVzIGNvbXBsZXRlbHkgZGVzY3JpYmluZyB0aGUgcHJvZ3JhbS5cbiAgICBmb3IgKGNvbnN0IHJvb3RGaWxlIG9mIHRzUm9vdEZpbGVzKSB7XG4gICAgICBmb3IgKGNvbnN0IGdlbiBvZiB0aGlzLmdlbmVyYXRvcnMpIHtcbiAgICAgICAgZXh0cmFJbnB1dEZpbGVzLnB1c2gobWFrZVNoaW1GaWxlTmFtZShyb290RmlsZSwgZ2VuLnN1ZmZpeCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZXh0cmFJbnB1dEZpbGVzID0gZXh0cmFJbnB1dEZpbGVzO1xuXG4gICAgLy8gSWYgYW4gb2xkIHByb2dyYW0gaXMgcHJlc2VudCwgZXh0cmFjdCBhbGwgcGVyLWZpbGUgc2hpbXMgaW50byBhIG1hcCwgd2hpY2ggd2lsbCBiZSB1c2VkIHRvXG4gICAgLy8gZ2VuZXJhdGUgbmV3IHZlcnNpb25zIG9mIHRob3NlIHNoaW1zLlxuICAgIGlmIChvbGRQcm9ncmFtICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IG9sZFNmIG9mIG9sZFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICBpZiAob2xkU2YuaXNEZWNsYXJhdGlvbkZpbGUgfHwgIWlzRmlsZVNoaW1Tb3VyY2VGaWxlKG9sZFNmKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5wcmlvclNoaW1zLnNldChhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKG9sZFNmKSwgb2xkU2YpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9kdWNlIGEgc2hpbSBgdHMuU291cmNlRmlsZWAgaWYgYGZpbGVOYW1lYCByZWZlcnMgdG8gYSBzaGltIGZpbGUgd2hpY2ggc2hvdWxkIGV4aXN0IGluIHRoZVxuICAgKiBwcm9ncmFtLlxuICAgKlxuICAgKiBJZiBgZmlsZU5hbWVgIGRvZXMgbm90IHJlZmVyIHRvIGEgcG90ZW50aWFsIHNoaW0gZmlsZSwgYG51bGxgIGlzIHJldHVybmVkLiBJZiBhIGNvcnJlc3BvbmRpbmdcbiAgICogYmFzZSBmaWxlIGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkLCBgdW5kZWZpbmVkYCBpcyByZXR1cm5lZCBpbnN0ZWFkLlxuICAgKi9cbiAgbWF5YmVHZW5lcmF0ZShmaWxlTmFtZTogQWJzb2x1dGVGc1BhdGgpOiB0cy5Tb3VyY2VGaWxlfG51bGx8dW5kZWZpbmVkIHtcbiAgICAvLyBGYXN0IHBhdGg6IGVpdGhlciB0aGlzIGZpbGVuYW1lIGhhcyBiZWVuIHByb3ZlbiBub3QgdG8gYmUgYSBzaGltIGJlZm9yZSwgb3IgaXQgaXMgYSBrbm93blxuICAgIC8vIHNoaW0gYW5kIG5vIGdlbmVyYXRpb24gaXMgcmVxdWlyZWQuXG4gICAgaWYgKHRoaXMubm90U2hpbXMuaGFzKGZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICh0aGlzLnNoaW1zLmhhcyhmaWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnNoaW1zLmdldChmaWxlTmFtZSkhO1xuICAgIH1cblxuICAgIC8vIC5kLnRzIGZpbGVzIGNhbid0IGJlIHNoaW1zLlxuICAgIGlmIChpc0R0c1BhdGgoZmlsZU5hbWUpKSB7XG4gICAgICB0aGlzLm5vdFNoaW1zLmFkZChmaWxlTmFtZSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBUaGlzIGlzIHRoZSBmaXJzdCB0aW1lIHNlZWluZyB0aGlzIHBhdGguIFRyeSB0byBtYXRjaCBpdCBhZ2FpbnN0IGEgc2hpbSBnZW5lcmF0b3IuXG4gICAgZm9yIChjb25zdCByZWNvcmQgb2YgdGhpcy5nZW5lcmF0b3JzKSB7XG4gICAgICBjb25zdCBtYXRjaCA9IHJlY29yZC50ZXN0LmV4ZWMoZmlsZU5hbWUpO1xuICAgICAgaWYgKG1hdGNoID09PSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgcGF0aCBtYXRjaGVkLiBFeHRyYWN0IHRoZSBmaWxlbmFtZSBwcmVmaXggd2l0aG91dCB0aGUgZXh0ZW5zaW9uLlxuICAgICAgY29uc3QgcHJlZml4ID0gbWF0Y2hbMV07XG4gICAgICAvLyBUaGlzIF9taWdodF8gYmUgYSBzaGltLCBpZiBhbiB1bmRlcmx5aW5nIGJhc2UgZmlsZSBleGlzdHMuIFRoZSBiYXNlIGZpbGUgbWlnaHQgYmUgLnRzIG9yXG4gICAgICAvLyAudHN4LlxuICAgICAgbGV0IGJhc2VGaWxlTmFtZSA9IGFic29sdXRlRnJvbShwcmVmaXggKyAnLnRzJyk7XG4gICAgICBpZiAoIXRoaXMuZGVsZWdhdGUuZmlsZUV4aXN0cyhiYXNlRmlsZU5hbWUpKSB7XG4gICAgICAgIC8vIE5vIC50cyBmaWxlIGJ5IHRoYXQgbmFtZSAtIHRyeSAudHN4LlxuICAgICAgICBiYXNlRmlsZU5hbWUgPSBhYnNvbHV0ZUZyb20ocHJlZml4ICsgJy50c3gnKTtcbiAgICAgICAgaWYgKCF0aGlzLmRlbGVnYXRlLmZpbGVFeGlzdHMoYmFzZUZpbGVOYW1lKSkge1xuICAgICAgICAgIC8vIFRoaXMgaXNuJ3QgYSBzaGltIGFmdGVyIGFsbCBzaW5jZSB0aGVyZSBpcyBubyBvcmlnaW5hbCBmaWxlIHdoaWNoIHdvdWxkIGhhdmUgdHJpZ2dlcmVkXG4gICAgICAgICAgLy8gaXRzIGdlbmVyYXRpb24sIGV2ZW4gdGhvdWdoIHRoZSBwYXRoIGlzIHJpZ2h0LiBUaGVyZSBhcmUgYSBmZXcgcmVhc29ucyB3aHkgdGhpcyBjb3VsZFxuICAgICAgICAgIC8vIG9jY3VyOlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gKiB3aGVuIHJlc29sdmluZyBhbiBpbXBvcnQgdG8gYW4gLm5nZmFjdG9yeS5kLnRzIGZpbGUsIHRoZSBtb2R1bGUgcmVzb2x1dGlvbiBhbGdvcml0aG1cbiAgICAgICAgICAvLyAgIHdpbGwgZmlyc3QgbG9vayBmb3IgYW4gLm5nZmFjdG9yeS50cyBmaWxlIGluIGl0cyBwbGFjZSwgd2hpY2ggd2lsbCBiZSByZXF1ZXN0ZWQgaGVyZS5cbiAgICAgICAgICAvLyAqIHdoZW4gdGhlIHVzZXIgd3JpdGVzIGEgYmFkIGltcG9ydC5cbiAgICAgICAgICAvLyAqIHdoZW4gYSBmaWxlIGlzIHByZXNlbnQgaW4gb25lIGNvbXBpbGF0aW9uIGFuZCByZW1vdmVkIGluIHRoZSBuZXh0IGluY3JlbWVudGFsIHN0ZXAuXG4gICAgICAgICAgLy9cbiAgICAgICAgICAvLyBOb3RlIHRoYXQgdGhpcyBkb2VzIG5vdCBhZGQgdGhlIGZpbGVuYW1lIHRvIGBub3RTaGltc2AsIHNvIHRoaXMgcGF0aCBpcyBub3QgY2FjaGVkLlxuICAgICAgICAgIC8vIFRoYXQncyBva2F5IGFzIHRoZXNlIGNhc2VzIGFib3ZlIGFyZSBlZGdlIGNhc2VzIGFuZCBkbyBub3Qgb2NjdXIgcmVndWxhcmx5IGluIG5vcm1hbFxuICAgICAgICAgIC8vIG9wZXJhdGlvbnMuXG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBSZXRyaWV2ZSB0aGUgb3JpZ2luYWwgZmlsZSBmb3Igd2hpY2ggdGhlIHNoaW0gd2lsbCBiZSBnZW5lcmF0ZWQuXG4gICAgICBjb25zdCBpbnB1dEZpbGUgPSB0aGlzLmRlbGVnYXRlLmdldFNvdXJjZUZpbGUoYmFzZUZpbGVOYW1lLCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0KTtcbiAgICAgIGlmIChpbnB1dEZpbGUgPT09IHVuZGVmaW5lZCB8fCBpc1NoaW0oaW5wdXRGaWxlKSkge1xuICAgICAgICAvLyBTb21ldGhpbmcgc3RyYW5nZSBoYXBwZW5lZCBoZXJlLiBUaGlzIGNhc2UgaXMgYWxzbyBub3QgY2FjaGVkIGluIGBub3RTaGltc2AsIGJ1dCB0aGlzXG4gICAgICAgIC8vIHBhdGggaXMgbm90IGV4cGVjdGVkIHRvIG9jY3VyIGluIHJlYWxpdHkgc28gdGhpcyBzaG91bGRuJ3QgYmUgYSBwcm9ibGVtLlxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICAvLyBBY3R1YWxseSBnZW5lcmF0ZSBhbmQgY2FjaGUgdGhlIHNoaW0uXG4gICAgICByZXR1cm4gdGhpcy5nZW5lcmF0ZVNwZWNpZmljKGZpbGVOYW1lLCByZWNvcmQuZ2VuZXJhdG9yLCBpbnB1dEZpbGUpO1xuICAgIH1cblxuICAgIC8vIE5vIGdlbmVyYXRvciBtYXRjaGVkLlxuICAgIHRoaXMubm90U2hpbXMuYWRkKGZpbGVOYW1lKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVTcGVjaWZpYyhcbiAgICAgIGZpbGVOYW1lOiBBYnNvbHV0ZUZzUGF0aCwgZ2VuZXJhdG9yOiBQZXJGaWxlU2hpbUdlbmVyYXRvcixcbiAgICAgIGlucHV0RmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUge1xuICAgIGxldCBwcmlvclNoaW1TZjogdHMuU291cmNlRmlsZXxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5wcmlvclNoaW1zLmhhcyhmaWxlTmFtZSkpIHtcbiAgICAgIC8vIEluIHRoZSBwcmV2aW91cyBwcm9ncmFtIGEgc2hpbSB3aXRoIHRoaXMgbmFtZSBhbHJlYWR5IGV4aXN0ZWQuIEl0J3MgcGFzc2VkIHRvIHRoZSBzaGltXG4gICAgICAvLyBnZW5lcmF0b3Igd2hpY2ggbWF5IHJldXNlIGl0IGluc3RlYWQgb2YgZ2VuZXJhdGluZyBhIGZyZXNoIHNoaW0uXG5cbiAgICAgIHByaW9yU2hpbVNmID0gdGhpcy5wcmlvclNoaW1zLmdldChmaWxlTmFtZSkhO1xuICAgICAgdGhpcy5wcmlvclNoaW1zLmRlbGV0ZShmaWxlTmFtZSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2hpbVNmID0gZ2VuZXJhdG9yLmdlbmVyYXRlU2hpbUZvckZpbGUoaW5wdXRGaWxlLCBmaWxlTmFtZSwgcHJpb3JTaGltU2YpO1xuXG4gICAgLy8gTWFyayB0aGUgbmV3IGdlbmVyYXRlZCBzb3VyY2UgZmlsZSBhcyBhIHNoaW0gdGhhdCBvcmlnaW5hdGVkIGZyb20gdGhpcyBnZW5lcmF0b3IuXG4gICAgc2ZFeHRlbnNpb25EYXRhKHNoaW1TZikuZmlsZVNoaW0gPSB7XG4gICAgICBleHRlbnNpb246IGdlbmVyYXRvci5leHRlbnNpb25QcmVmaXgsXG4gICAgICBnZW5lcmF0ZWRGcm9tOiBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGlucHV0RmlsZSksXG4gICAgfTtcblxuICAgIGlmICghZ2VuZXJhdG9yLnNob3VsZEVtaXQpIHtcbiAgICAgIHRoaXMuaWdub3JlRm9yRW1pdC5hZGQoc2hpbVNmKTtcbiAgICB9XG5cbiAgICB0aGlzLnNoaW1zLnNldChmaWxlTmFtZSwgc2hpbVNmKTtcbiAgICByZXR1cm4gc2hpbVNmO1xuICB9XG59XG4iXX0=