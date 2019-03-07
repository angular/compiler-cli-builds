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
        define("@angular/compiler-cli/src/ngtsc/scope/src/dependency", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/scope/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/scope/src/util");
    /**
     * Reads Angular metadata from classes declared in .d.ts files and computes an `ExportScope`.
     *
     * Given an NgModule declared in a .d.ts file, this resolver can produce a transitive `ExportScope`
     * of all of the directives/pipes it exports. It does this by reading metadata off of Ivy static
     * fields on directives, components, pipes, and NgModules.
     */
    var MetadataDtsModuleScopeResolver = /** @class */ (function () {
        function MetadataDtsModuleScopeResolver(checker, reflector, aliasGenerator) {
            this.checker = checker;
            this.reflector = reflector;
            this.aliasGenerator = aliasGenerator;
            /**
             * Cache which holds fully resolved scopes for NgModule classes from .d.ts files.
             */
            this.cache = new Map();
        }
        /**
         * Resolve a `Reference`'d NgModule from a .d.ts file and produce a transitive `ExportScope`
         * listing the directives and pipes which that NgModule exports to others.
         *
         * This operation relies on a `Reference` instead of a direct TypeScrpt node as the `Reference`s
         * produced depend on how the original NgModule was imported.
         */
        MetadataDtsModuleScopeResolver.prototype.resolve = function (ref) {
            var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
            var clazz = ref.node;
            var sourceFile = clazz.getSourceFile();
            if (!sourceFile.isDeclarationFile) {
                throw new Error("Debug error: DtsModuleScopeResolver.read(" + ref.debugName + " from " + sourceFile.fileName + "), but not a .d.ts file");
            }
            if (this.cache.has(clazz)) {
                return this.cache.get(clazz);
            }
            // Build up the export scope - those directives and pipes made visible by this module.
            var directives = [];
            var pipes = [];
            var meta = this.readModuleMetadataFromClass(ref);
            if (meta === null) {
                this.cache.set(clazz, null);
                return null;
            }
            var declarations = new Set();
            try {
                for (var _e = tslib_1.__values(meta.declarations), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var declRef = _f.value;
                    declarations.add(declRef.node);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            try {
                // Only the 'exports' field of the NgModule's metadata is important. Imports and declarations
                // don't affect the export scope.
                for (var _g = tslib_1.__values(meta.exports), _h = _g.next(); !_h.done; _h = _g.next()) {
                    var exportRef = _h.value;
                    // Attempt to process the export as a directive.
                    var directive = this.readScopeDirectiveFromClassWithDef(exportRef);
                    if (directive !== null) {
                        if (!declarations.has(exportRef.node)) {
                            directives.push(this.maybeAlias(directive, sourceFile));
                        }
                        else {
                            directives.push(directive);
                        }
                        continue;
                    }
                    // Attempt to process the export as a pipe.
                    var pipe = this.readScopePipeFromClassWithDef(exportRef);
                    if (pipe !== null) {
                        if (!declarations.has(exportRef.node)) {
                            pipes.push(this.maybeAlias(pipe, sourceFile));
                        }
                        else {
                            pipes.push(pipe);
                        }
                        continue;
                    }
                    // Attempt to process the export as a module.
                    var exportScope = this.resolve(exportRef);
                    if (exportScope !== null) {
                        // It is a module. Add exported directives and pipes to the current scope. This might
                        // involve rewriting the `Reference`s to those types to have an alias expression if one is
                        // required.
                        if (this.aliasGenerator === null) {
                            // Fast path when aliases aren't required.
                            directives.push.apply(directives, tslib_1.__spread(exportScope.exported.directives));
                            pipes.push.apply(pipes, tslib_1.__spread(exportScope.exported.pipes));
                        }
                        else {
                            try {
                                // It's necessary to rewrite the `Reference`s to add alias expressions. This way, imports
                                // generated to these directives and pipes will use a shallow import to `sourceFile`
                                // instead of a deep import directly to the directive or pipe class.
                                //
                                // One important check here is whether the directive/pipe is declared in the same
                                // source file as the re-exporting NgModule. This can happen if both a directive, its
                                // NgModule, and the re-exporting NgModule are all in the same file. In this case,
                                // no import alias is needed as it would go to the same file anyway.
                                for (var _j = tslib_1.__values(exportScope.exported.directives), _k = _j.next(); !_k.done; _k = _j.next()) {
                                    var directive_1 = _k.value;
                                    directives.push(this.maybeAlias(directive_1, sourceFile));
                                }
                            }
                            catch (e_3_1) { e_3 = { error: e_3_1 }; }
                            finally {
                                try {
                                    if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
                                }
                                finally { if (e_3) throw e_3.error; }
                            }
                            try {
                                for (var _l = tslib_1.__values(exportScope.exported.pipes), _m = _l.next(); !_m.done; _m = _l.next()) {
                                    var pipe_1 = _m.value;
                                    pipes.push(this.maybeAlias(pipe_1, sourceFile));
                                }
                            }
                            catch (e_4_1) { e_4 = { error: e_4_1 }; }
                            finally {
                                try {
                                    if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
                                }
                                finally { if (e_4) throw e_4.error; }
                            }
                        }
                    }
                    continue;
                    // The export was not a directive, a pipe, or a module. This is an error.
                    // TODO(alxhub): produce a ts.Diagnostic
                    throw new Error("Exported value " + exportRef.debugName + " was not a directive, pipe, or module");
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return {
                exported: { directives: directives, pipes: pipes },
            };
        };
        /**
         * Read the metadata from a class that has already been compiled somehow (either it's in a .d.ts
         * file, or in a .ts file with a handwritten definition).
         *
         * @param ref `Reference` to the class of interest, with the context of how it was obtained.
         */
        MetadataDtsModuleScopeResolver.prototype.readModuleMetadataFromClass = function (ref) {
            var clazz = ref.node;
            var resolutionContext = clazz.getSourceFile().fileName;
            // This operation is explicitly not memoized, as it depends on `ref.ownedByModuleGuess`.
            // TODO(alxhub): investigate caching of .d.ts module metadata.
            var ngModuleDef = this.reflector.getMembersOfClass(clazz).find(function (member) { return member.name === 'ngModuleDef' && member.isStatic; });
            if (ngModuleDef === undefined) {
                return null;
            }
            else if (
            // Validate that the shape of the ngModuleDef type is correct.
            ngModuleDef.type === null || !ts.isTypeReferenceNode(ngModuleDef.type) ||
                ngModuleDef.type.typeArguments === undefined ||
                ngModuleDef.type.typeArguments.length !== 4) {
                return null;
            }
            // Read the ModuleData out of the type arguments.
            var _a = tslib_1.__read(ngModuleDef.type.typeArguments, 4), _ = _a[0], declarationMetadata = _a[1], importMetadata = _a[2], exportMetadata = _a[3];
            return {
                declarations: util_1.extractReferencesFromType(this.checker, declarationMetadata, ref.ownedByModuleGuess, resolutionContext),
                exports: util_1.extractReferencesFromType(this.checker, exportMetadata, ref.ownedByModuleGuess, resolutionContext),
                imports: util_1.extractReferencesFromType(this.checker, importMetadata, ref.ownedByModuleGuess, resolutionContext),
            };
        };
        /**
         * Read directive (or component) metadata from a referenced class in a .d.ts file.
         */
        MetadataDtsModuleScopeResolver.prototype.readScopeDirectiveFromClassWithDef = function (ref) {
            var clazz = ref.node;
            var def = this.reflector.getMembersOfClass(clazz).find(function (field) {
                return field.isStatic && (field.name === 'ngComponentDef' || field.name === 'ngDirectiveDef');
            });
            if (def === undefined) {
                // No definition could be found.
                return null;
            }
            else if (def.type === null || !ts.isTypeReferenceNode(def.type) ||
                def.type.typeArguments === undefined || def.type.typeArguments.length < 2) {
                // The type metadata was the wrong shape.
                return null;
            }
            var selector = util_1.readStringType(def.type.typeArguments[1]);
            if (selector === null) {
                return null;
            }
            return tslib_1.__assign({ ref: ref, name: clazz.name.text, isComponent: def.name === 'ngComponentDef', selector: selector, exportAs: util_1.readStringArrayType(def.type.typeArguments[2]), inputs: util_1.readStringMapType(def.type.typeArguments[3]), outputs: util_1.readStringMapType(def.type.typeArguments[4]), queries: util_1.readStringArrayType(def.type.typeArguments[5]) }, util_1.extractDirectiveGuards(clazz, this.reflector));
        };
        /**
         * Read pipe metadata from a referenced class in a .d.ts file.
         */
        MetadataDtsModuleScopeResolver.prototype.readScopePipeFromClassWithDef = function (ref) {
            var def = this.reflector.getMembersOfClass(ref.node).find(function (field) { return field.isStatic && field.name === 'ngPipeDef'; });
            if (def === undefined) {
                // No definition could be found.
                return null;
            }
            else if (def.type === null || !ts.isTypeReferenceNode(def.type) ||
                def.type.typeArguments === undefined || def.type.typeArguments.length < 2) {
                // The type metadata was the wrong shape.
                return null;
            }
            var type = def.type.typeArguments[1];
            if (!ts.isLiteralTypeNode(type) || !ts.isStringLiteral(type.literal)) {
                // The type metadata was the wrong type.
                return null;
            }
            var name = type.literal.text;
            return { ref: ref, name: name };
        };
        MetadataDtsModuleScopeResolver.prototype.maybeAlias = function (dirOrPipe, maybeAliasFrom) {
            if (this.aliasGenerator === null) {
                return dirOrPipe;
            }
            var ref = dirOrPipe.ref;
            if (ref.node.getSourceFile() !== maybeAliasFrom) {
                return tslib_1.__assign({}, dirOrPipe, { ref: ref.cloneWithAlias(this.aliasGenerator.aliasTo(ref.node, maybeAliasFrom)) });
            }
            else {
                return dirOrPipe;
            }
        };
        return MetadataDtsModuleScopeResolver;
    }());
    exports.MetadataDtsModuleScopeResolver = MetadataDtsModuleScopeResolver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2NvcGUvc3JjL2RlcGVuZGVuY3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBTWpDLHVFQUFpSTtJQU1qSTs7Ozs7O09BTUc7SUFDSDtRQU1FLHdDQUNZLE9BQXVCLEVBQVUsU0FBeUIsRUFDMUQsY0FBbUM7WUFEbkMsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMxRCxtQkFBYyxHQUFkLGNBQWMsQ0FBcUI7WUFQL0M7O2VBRUc7WUFDSyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXlDLENBQUM7UUFJZixDQUFDO1FBRW5EOzs7Ozs7V0FNRztRQUNILGdEQUFPLEdBQVAsVUFBUSxHQUFtQzs7WUFDekMsSUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztZQUN2QixJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDakMsTUFBTSxJQUFJLEtBQUssQ0FDWCw4Q0FBNEMsR0FBRyxDQUFDLFNBQVMsY0FBUyxVQUFVLENBQUMsUUFBUSw0QkFBeUIsQ0FBQyxDQUFDO2FBQ3JIO1lBRUQsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDekIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUcsQ0FBQzthQUNoQztZQUVELHNGQUFzRjtZQUN0RixJQUFNLFVBQVUsR0FBcUIsRUFBRSxDQUFDO1lBQ3hDLElBQU0sS0FBSyxHQUFnQixFQUFFLENBQUM7WUFFOUIsSUFBTSxJQUFJLEdBQUcs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Z0JBQy9DLDRCQUNLLFNBQVMsSUFDWixHQUFHLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLElBQzlFO2FBQ0g7aUJBQU07Z0JBQ0wsT0FBTyxTQUFTLENBQUM7YUFDbEI7UUFDSCxDQUFDO1FBQ0gscUNBQUM7SUFBRCxDQUFDLEFBek5ELElBeU5DO0lBek5ZLHdFQUE4QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWxpYXNHZW5lcmF0b3IsIFJlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHtFeHBvcnRTY29wZSwgU2NvcGVEaXJlY3RpdmUsIFNjb3BlUGlwZX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtleHRyYWN0RGlyZWN0aXZlR3VhcmRzLCBleHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlLCByZWFkU3RyaW5nQXJyYXlUeXBlLCByZWFkU3RyaW5nTWFwVHlwZSwgcmVhZFN0cmluZ1R5cGV9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRHRzTW9kdWxlU2NvcGVSZXNvbHZlciB7XG4gIHJlc29sdmUocmVmOiBSZWZlcmVuY2U8dHMuQ2xhc3NEZWNsYXJhdGlvbj4pOiBFeHBvcnRTY29wZXxudWxsO1xufVxuXG4vKipcbiAqIFJlYWRzIEFuZ3VsYXIgbWV0YWRhdGEgZnJvbSBjbGFzc2VzIGRlY2xhcmVkIGluIC5kLnRzIGZpbGVzIGFuZCBjb21wdXRlcyBhbiBgRXhwb3J0U2NvcGVgLlxuICpcbiAqIEdpdmVuIGFuIE5nTW9kdWxlIGRlY2xhcmVkIGluIGEgLmQudHMgZmlsZSwgdGhpcyByZXNvbHZlciBjYW4gcHJvZHVjZSBhIHRyYW5zaXRpdmUgYEV4cG9ydFNjb3BlYFxuICogb2YgYWxsIG9mIHRoZSBkaXJlY3RpdmVzL3BpcGVzIGl0IGV4cG9ydHMuIEl0IGRvZXMgdGhpcyBieSByZWFkaW5nIG1ldGFkYXRhIG9mZiBvZiBJdnkgc3RhdGljXG4gKiBmaWVsZHMgb24gZGlyZWN0aXZlcywgY29tcG9uZW50cywgcGlwZXMsIGFuZCBOZ01vZHVsZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXIge1xuICAvKipcbiAgICogQ2FjaGUgd2hpY2ggaG9sZHMgZnVsbHkgcmVzb2x2ZWQgc2NvcGVzIGZvciBOZ01vZHVsZSBjbGFzc2VzIGZyb20gLmQudHMgZmlsZXMuXG4gICAqL1xuICBwcml2YXRlIGNhY2hlID0gbmV3IE1hcDx0cy5DbGFzc0RlY2xhcmF0aW9uLCBFeHBvcnRTY29wZXxudWxsPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgICAgcHJpdmF0ZSBhbGlhc0dlbmVyYXRvcjogQWxpYXNHZW5lcmF0b3J8bnVsbCkge31cblxuICAvKipcbiAgICogUmVzb2x2ZSBhIGBSZWZlcmVuY2VgJ2QgTmdNb2R1bGUgZnJvbSBhIC5kLnRzIGZpbGUgYW5kIHByb2R1Y2UgYSB0cmFuc2l0aXZlIGBFeHBvcnRTY29wZWBcbiAgICogbGlzdGluZyB0aGUgZGlyZWN0aXZlcyBhbmQgcGlwZXMgd2hpY2ggdGhhdCBOZ01vZHVsZSBleHBvcnRzIHRvIG90aGVycy5cbiAgICpcbiAgICogVGhpcyBvcGVyYXRpb24gcmVsaWVzIG9uIGEgYFJlZmVyZW5jZWAgaW5zdGVhZCBvZiBhIGRpcmVjdCBUeXBlU2NycHQgbm9kZSBhcyB0aGUgYFJlZmVyZW5jZWBzXG4gICAqIHByb2R1Y2VkIGRlcGVuZCBvbiBob3cgdGhlIG9yaWdpbmFsIE5nTW9kdWxlIHdhcyBpbXBvcnRlZC5cbiAgICovXG4gIHJlc29sdmUocmVmOiBSZWZlcmVuY2U8dHMuQ2xhc3NEZWNsYXJhdGlvbj4pOiBFeHBvcnRTY29wZXxudWxsIHtcbiAgICBjb25zdCBjbGF6eiA9IHJlZi5ub2RlO1xuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSBjbGF6ei5nZXRTb3VyY2VGaWxlKCk7XG4gICAgaWYgKCFzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYERlYnVnIGVycm9yOiBEdHNNb2R1bGVTY29wZVJlc29sdmVyLnJlYWQoJHtyZWYuZGVidWdOYW1lfSBmcm9tICR7c291cmNlRmlsZS5maWxlTmFtZX0pLCBidXQgbm90IGEgLmQudHMgZmlsZWApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNhY2hlLmhhcyhjbGF6eikpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlLmdldChjbGF6eikgITtcbiAgICB9XG5cbiAgICAvLyBCdWlsZCB1cCB0aGUgZXhwb3J0IHNjb3BlIC0gdGhvc2UgZGlyZWN0aXZlcyBhbmQgcGlwZXMgbWFkZSB2aXNpYmxlIGJ5IHRoaXMgbW9kdWxlLlxuICAgIGNvbnN0IGRpcmVjdGl2ZXM6IFNjb3BlRGlyZWN0aXZlW10gPSBbXTtcbiAgICBjb25zdCBwaXBlczogU2NvcGVQaXBlW10gPSBbXTtcblxuICAgIGNvbnN0IG1ldGEgPSB0aGlzLnJlYWRNb2R1bGVNZXRhZGF0YUZyb21DbGFzcyhyZWYpO1xuICAgIGlmIChtZXRhID09PSBudWxsKSB7XG4gICAgICB0aGlzLmNhY2hlLnNldChjbGF6eiwgbnVsbCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSBuZXcgU2V0PHRzLkRlY2xhcmF0aW9uPigpO1xuICAgIGZvciAoY29uc3QgZGVjbFJlZiBvZiBtZXRhLmRlY2xhcmF0aW9ucykge1xuICAgICAgZGVjbGFyYXRpb25zLmFkZChkZWNsUmVmLm5vZGUpO1xuICAgIH1cblxuICAgIC8vIE9ubHkgdGhlICdleHBvcnRzJyBmaWVsZCBvZiB0aGUgTmdNb2R1bGUncyBtZXRhZGF0YSBpcyBpbXBvcnRhbnQuIEltcG9ydHMgYW5kIGRlY2xhcmF0aW9uc1xuICAgIC8vIGRvbid0IGFmZmVjdCB0aGUgZXhwb3J0IHNjb3BlLlxuICAgIGZvciAoY29uc3QgZXhwb3J0UmVmIG9mIG1ldGEuZXhwb3J0cykge1xuICAgICAgLy8gQXR0ZW1wdCB0byBwcm9jZXNzIHRoZSBleHBvcnQgYXMgYSBkaXJlY3RpdmUuXG4gICAgICBjb25zdCBkaXJlY3RpdmUgPSB0aGlzLnJlYWRTY29wZURpcmVjdGl2ZUZyb21DbGFzc1dpdGhEZWYoZXhwb3J0UmVmKTtcbiAgICAgIGlmIChkaXJlY3RpdmUgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKCFkZWNsYXJhdGlvbnMuaGFzKGV4cG9ydFJlZi5ub2RlKSkge1xuICAgICAgICAgIGRpcmVjdGl2ZXMucHVzaCh0aGlzLm1heWJlQWxpYXMoZGlyZWN0aXZlLCBzb3VyY2VGaWxlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGlyZWN0aXZlcy5wdXNoKGRpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIEF0dGVtcHQgdG8gcHJvY2VzcyB0aGUgZXhwb3J0IGFzIGEgcGlwZS5cbiAgICAgIGNvbnN0IHBpcGUgPSB0aGlzLnJlYWRTY29wZVBpcGVGcm9tQ2xhc3NXaXRoRGVmKGV4cG9ydFJlZik7XG4gICAgICBpZiAocGlwZSAhPT0gbnVsbCkge1xuICAgICAgICBpZiAoIWRlY2xhcmF0aW9ucy5oYXMoZXhwb3J0UmVmLm5vZGUpKSB7XG4gICAgICAgICAgcGlwZXMucHVzaCh0aGlzLm1heWJlQWxpYXMocGlwZSwgc291cmNlRmlsZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBpcGVzLnB1c2gocGlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIEF0dGVtcHQgdG8gcHJvY2VzcyB0aGUgZXhwb3J0IGFzIGEgbW9kdWxlLlxuICAgICAgY29uc3QgZXhwb3J0U2NvcGUgPSB0aGlzLnJlc29sdmUoZXhwb3J0UmVmKTtcbiAgICAgIGlmIChleHBvcnRTY29wZSAhPT0gbnVsbCkge1xuICAgICAgICAvLyBJdCBpcyBhIG1vZHVsZS4gQWRkIGV4cG9ydGVkIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHRvIHRoZSBjdXJyZW50IHNjb3BlLiBUaGlzIG1pZ2h0XG4gICAgICAgIC8vIGludm9sdmUgcmV3cml0aW5nIHRoZSBgUmVmZXJlbmNlYHMgdG8gdGhvc2UgdHlwZXMgdG8gaGF2ZSBhbiBhbGlhcyBleHByZXNzaW9uIGlmIG9uZSBpc1xuICAgICAgICAvLyByZXF1aXJlZC5cbiAgICAgICAgaWYgKHRoaXMuYWxpYXNHZW5lcmF0b3IgPT09IG51bGwpIHtcbiAgICAgICAgICAvLyBGYXN0IHBhdGggd2hlbiBhbGlhc2VzIGFyZW4ndCByZXF1aXJlZC5cbiAgICAgICAgICBkaXJlY3RpdmVzLnB1c2goLi4uZXhwb3J0U2NvcGUuZXhwb3J0ZWQuZGlyZWN0aXZlcyk7XG4gICAgICAgICAgcGlwZXMucHVzaCguLi5leHBvcnRTY29wZS5leHBvcnRlZC5waXBlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gSXQncyBuZWNlc3NhcnkgdG8gcmV3cml0ZSB0aGUgYFJlZmVyZW5jZWBzIHRvIGFkZCBhbGlhcyBleHByZXNzaW9ucy4gVGhpcyB3YXksIGltcG9ydHNcbiAgICAgICAgICAvLyBnZW5lcmF0ZWQgdG8gdGhlc2UgZGlyZWN0aXZlcyBhbmQgcGlwZXMgd2lsbCB1c2UgYSBzaGFsbG93IGltcG9ydCB0byBgc291cmNlRmlsZWBcbiAgICAgICAgICAvLyBpbnN0ZWFkIG9mIGEgZGVlcCBpbXBvcnQgZGlyZWN0bHkgdG8gdGhlIGRpcmVjdGl2ZSBvciBwaXBlIGNsYXNzLlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gT25lIGltcG9ydGFudCBjaGVjayBoZXJlIGlzIHdoZXRoZXIgdGhlIGRpcmVjdGl2ZS9waXBlIGlzIGRlY2xhcmVkIGluIHRoZSBzYW1lXG4gICAgICAgICAgLy8gc291cmNlIGZpbGUgYXMgdGhlIHJlLWV4cG9ydGluZyBOZ01vZHVsZS4gVGhpcyBjYW4gaGFwcGVuIGlmIGJvdGggYSBkaXJlY3RpdmUsIGl0c1xuICAgICAgICAgIC8vIE5nTW9kdWxlLCBhbmQgdGhlIHJlLWV4cG9ydGluZyBOZ01vZHVsZSBhcmUgYWxsIGluIHRoZSBzYW1lIGZpbGUuIEluIHRoaXMgY2FzZSxcbiAgICAgICAgICAvLyBubyBpbXBvcnQgYWxpYXMgaXMgbmVlZGVkIGFzIGl0IHdvdWxkIGdvIHRvIHRoZSBzYW1lIGZpbGUgYW55d2F5LlxuICAgICAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIGV4cG9ydFNjb3BlLmV4cG9ydGVkLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgICAgIGRpcmVjdGl2ZXMucHVzaCh0aGlzLm1heWJlQWxpYXMoZGlyZWN0aXZlLCBzb3VyY2VGaWxlKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBleHBvcnRTY29wZS5leHBvcnRlZC5waXBlcykge1xuICAgICAgICAgICAgcGlwZXMucHVzaCh0aGlzLm1heWJlQWxpYXMocGlwZSwgc291cmNlRmlsZSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29udGludWU7XG5cbiAgICAgIC8vIFRoZSBleHBvcnQgd2FzIG5vdCBhIGRpcmVjdGl2ZSwgYSBwaXBlLCBvciBhIG1vZHVsZS4gVGhpcyBpcyBhbiBlcnJvci5cbiAgICAgIC8vIFRPRE8oYWx4aHViKTogcHJvZHVjZSBhIHRzLkRpYWdub3N0aWNcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwb3J0ZWQgdmFsdWUgJHtleHBvcnRSZWYuZGVidWdOYW1lfSB3YXMgbm90IGEgZGlyZWN0aXZlLCBwaXBlLCBvciBtb2R1bGVgKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgZXhwb3J0ZWQ6IHtkaXJlY3RpdmVzLCBwaXBlc30sXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIHRoZSBtZXRhZGF0YSBmcm9tIGEgY2xhc3MgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIGNvbXBpbGVkIHNvbWVob3cgKGVpdGhlciBpdCdzIGluIGEgLmQudHNcbiAgICogZmlsZSwgb3IgaW4gYSAudHMgZmlsZSB3aXRoIGEgaGFuZHdyaXR0ZW4gZGVmaW5pdGlvbikuXG4gICAqXG4gICAqIEBwYXJhbSByZWYgYFJlZmVyZW5jZWAgdG8gdGhlIGNsYXNzIG9mIGludGVyZXN0LCB3aXRoIHRoZSBjb250ZXh0IG9mIGhvdyBpdCB3YXMgb2J0YWluZWQuXG4gICAqL1xuICBwcml2YXRlIHJlYWRNb2R1bGVNZXRhZGF0YUZyb21DbGFzcyhyZWY6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4pOiBSYXdEZXBlbmRlbmN5TWV0YWRhdGF8bnVsbCB7XG4gICAgY29uc3QgY2xhenogPSByZWYubm9kZTtcbiAgICBjb25zdCByZXNvbHV0aW9uQ29udGV4dCA9IGNsYXp6LmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICAvLyBUaGlzIG9wZXJhdGlvbiBpcyBleHBsaWNpdGx5IG5vdCBtZW1vaXplZCwgYXMgaXQgZGVwZW5kcyBvbiBgcmVmLm93bmVkQnlNb2R1bGVHdWVzc2AuXG4gICAgLy8gVE9ETyhhbHhodWIpOiBpbnZlc3RpZ2F0ZSBjYWNoaW5nIG9mIC5kLnRzIG1vZHVsZSBtZXRhZGF0YS5cbiAgICBjb25zdCBuZ01vZHVsZURlZiA9IHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KS5maW5kKFxuICAgICAgICBtZW1iZXIgPT4gbWVtYmVyLm5hbWUgPT09ICduZ01vZHVsZURlZicgJiYgbWVtYmVyLmlzU3RhdGljKTtcbiAgICBpZiAobmdNb2R1bGVEZWYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgLy8gVmFsaWRhdGUgdGhhdCB0aGUgc2hhcGUgb2YgdGhlIG5nTW9kdWxlRGVmIHR5cGUgaXMgY29ycmVjdC5cbiAgICAgICAgbmdNb2R1bGVEZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShuZ01vZHVsZURlZi50eXBlKSB8fFxuICAgICAgICBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoICE9PSA0KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBSZWFkIHRoZSBNb2R1bGVEYXRhIG91dCBvZiB0aGUgdHlwZSBhcmd1bWVudHMuXG4gICAgY29uc3QgW18sIGRlY2xhcmF0aW9uTWV0YWRhdGEsIGltcG9ydE1ldGFkYXRhLCBleHBvcnRNZXRhZGF0YV0gPSBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHM7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRlY2xhcmF0aW9uczogZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShcbiAgICAgICAgICB0aGlzLmNoZWNrZXIsIGRlY2xhcmF0aW9uTWV0YWRhdGEsIHJlZi5vd25lZEJ5TW9kdWxlR3Vlc3MsIHJlc29sdXRpb25Db250ZXh0KSxcbiAgICAgIGV4cG9ydHM6IGV4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoXG4gICAgICAgICAgdGhpcy5jaGVja2VyLCBleHBvcnRNZXRhZGF0YSwgcmVmLm93bmVkQnlNb2R1bGVHdWVzcywgcmVzb2x1dGlvbkNvbnRleHQpLFxuICAgICAgaW1wb3J0czogZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShcbiAgICAgICAgICB0aGlzLmNoZWNrZXIsIGltcG9ydE1ldGFkYXRhLCByZWYub3duZWRCeU1vZHVsZUd1ZXNzLCByZXNvbHV0aW9uQ29udGV4dCksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIGRpcmVjdGl2ZSAob3IgY29tcG9uZW50KSBtZXRhZGF0YSBmcm9tIGEgcmVmZXJlbmNlZCBjbGFzcyBpbiBhIC5kLnRzIGZpbGUuXG4gICAqL1xuICBwcml2YXRlIHJlYWRTY29wZURpcmVjdGl2ZUZyb21DbGFzc1dpdGhEZWYocmVmOiBSZWZlcmVuY2U8dHMuQ2xhc3NEZWNsYXJhdGlvbj4pOiBTY29wZURpcmVjdGl2ZVxuICAgICAgfG51bGwge1xuICAgIGNvbnN0IGNsYXp6ID0gcmVmLm5vZGU7XG4gICAgY29uc3QgZGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIGZpZWxkID0+XG4gICAgICAgICAgICBmaWVsZC5pc1N0YXRpYyAmJiAoZmllbGQubmFtZSA9PT0gJ25nQ29tcG9uZW50RGVmJyB8fCBmaWVsZC5uYW1lID09PSAnbmdEaXJlY3RpdmVEZWYnKSk7XG4gICAgaWYgKGRlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBObyBkZWZpbml0aW9uIGNvdWxkIGJlIGZvdW5kLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgZGVmLnR5cGUgPT09IG51bGwgfHwgIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZGVmLnR5cGUpIHx8XG4gICAgICAgIGRlZi50eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fCBkZWYudHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIC8vIFRoZSB0eXBlIG1ldGFkYXRhIHdhcyB0aGUgd3Jvbmcgc2hhcGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgc2VsZWN0b3IgPSByZWFkU3RyaW5nVHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzFdKTtcbiAgICBpZiAoc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICByZWYsXG4gICAgICBuYW1lOiBjbGF6ei5uYW1lICEudGV4dCxcbiAgICAgIGlzQ29tcG9uZW50OiBkZWYubmFtZSA9PT0gJ25nQ29tcG9uZW50RGVmJywgc2VsZWN0b3IsXG4gICAgICBleHBvcnRBczogcmVhZFN0cmluZ0FycmF5VHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzJdKSxcbiAgICAgIGlucHV0czogcmVhZFN0cmluZ01hcFR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1szXSksXG4gICAgICBvdXRwdXRzOiByZWFkU3RyaW5nTWFwVHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzRdKSxcbiAgICAgIHF1ZXJpZXM6IHJlYWRTdHJpbmdBcnJheVR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1s1XSksXG4gICAgICAuLi5leHRyYWN0RGlyZWN0aXZlR3VhcmRzKGNsYXp6LCB0aGlzLnJlZmxlY3RvciksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIHBpcGUgbWV0YWRhdGEgZnJvbSBhIHJlZmVyZW5jZWQgY2xhc3MgaW4gYSAuZC50cyBmaWxlLlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkU2NvcGVQaXBlRnJvbUNsYXNzV2l0aERlZihyZWY6IFJlZmVyZW5jZTx0cy5DbGFzc0RlY2xhcmF0aW9uPik6IFNjb3BlUGlwZXxudWxsIHtcbiAgICBjb25zdCBkZWYgPSB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhyZWYubm9kZSkuZmluZChcbiAgICAgICAgZmllbGQgPT4gZmllbGQuaXNTdGF0aWMgJiYgZmllbGQubmFtZSA9PT0gJ25nUGlwZURlZicpO1xuICAgIGlmIChkZWYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gTm8gZGVmaW5pdGlvbiBjb3VsZCBiZSBmb3VuZC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIGRlZi50eXBlID09PSBudWxsIHx8ICF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGRlZi50eXBlKSB8fFxuICAgICAgICBkZWYudHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgZGVmLnR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAvLyBUaGUgdHlwZSBtZXRhZGF0YSB3YXMgdGhlIHdyb25nIHNoYXBlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHR5cGUgPSBkZWYudHlwZS50eXBlQXJndW1lbnRzWzFdO1xuICAgIGlmICghdHMuaXNMaXRlcmFsVHlwZU5vZGUodHlwZSkgfHwgIXRzLmlzU3RyaW5nTGl0ZXJhbCh0eXBlLmxpdGVyYWwpKSB7XG4gICAgICAvLyBUaGUgdHlwZSBtZXRhZGF0YSB3YXMgdGhlIHdyb25nIHR5cGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgbmFtZSA9IHR5cGUubGl0ZXJhbC50ZXh0O1xuICAgIHJldHVybiB7cmVmLCBuYW1lfTtcbiAgfVxuXG4gIHByaXZhdGUgbWF5YmVBbGlhczxUIGV4dGVuZHMgU2NvcGVEaXJlY3RpdmV8U2NvcGVQaXBlPihcbiAgICAgIGRpck9yUGlwZTogVCwgbWF5YmVBbGlhc0Zyb206IHRzLlNvdXJjZUZpbGUpOiBUIHtcbiAgICBpZiAodGhpcy5hbGlhc0dlbmVyYXRvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGRpck9yUGlwZTtcbiAgICB9XG4gICAgY29uc3QgcmVmID0gZGlyT3JQaXBlLnJlZjtcbiAgICBpZiAocmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpICE9PSBtYXliZUFsaWFzRnJvbSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4uZGlyT3JQaXBlLFxuICAgICAgICByZWY6IHJlZi5jbG9uZVdpdGhBbGlhcyh0aGlzLmFsaWFzR2VuZXJhdG9yLmFsaWFzVG8ocmVmLm5vZGUsIG1heWJlQWxpYXNGcm9tKSksXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZGlyT3JQaXBlO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJhdyBtZXRhZGF0YSByZWFkIGZyb20gdGhlIC5kLnRzIGluZm8gb2YgYW4gbmdNb2R1bGVEZWYgZmllbGQgb24gYSBjb21waWxlZCBOZ01vZHVsZSBjbGFzcy5cbiAqL1xuaW50ZXJmYWNlIFJhd0RlcGVuZGVuY3lNZXRhZGF0YSB7XG4gIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlPHRzLkNsYXNzRGVjbGFyYXRpb24+W107XG4gIGltcG9ydHM6IFJlZmVyZW5jZTx0cy5DbGFzc0RlY2xhcmF0aW9uPltdO1xuICBleHBvcnRzOiBSZWZlcmVuY2U8dHMuQ2xhc3NEZWNsYXJhdGlvbj5bXTtcbn1cbiJdfQ==