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
        define("@angular/compiler-cli/src/ngtsc/scope/src/dependency", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * Reads Angular metadata from classes declared in .d.ts files and computes an `ExportScope`.
     *
     * Given an NgModule declared in a .d.ts file, this resolver can produce a transitive `ExportScope`
     * of all of the directives/pipes it exports. It does this by reading metadata off of Ivy static
     * fields on directives, components, pipes, and NgModules.
     */
    var MetadataDtsModuleScopeResolver = /** @class */ (function () {
        /**
         * @param dtsMetaReader a `MetadataReader` which can read metadata from `.d.ts` files.
         */
        function MetadataDtsModuleScopeResolver(dtsMetaReader, aliasingHost) {
            this.dtsMetaReader = dtsMetaReader;
            this.aliasingHost = aliasingHost;
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
            var meta = this.dtsMetaReader.getNgModuleMetadata(ref);
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
                    var directive = this.dtsMetaReader.getDirectiveMetadata(exportRef);
                    if (directive !== null) {
                        var isReExport = !declarations.has(exportRef.node);
                        directives.push(this.maybeAlias(directive, sourceFile, isReExport));
                        continue;
                    }
                    // Attempt to process the export as a pipe.
                    var pipe = this.dtsMetaReader.getPipeMetadata(exportRef);
                    if (pipe !== null) {
                        var isReExport = !declarations.has(exportRef.node);
                        pipes.push(this.maybeAlias(pipe, sourceFile, isReExport));
                        continue;
                    }
                    // Attempt to process the export as a module.
                    var exportScope_1 = this.resolve(exportRef);
                    if (exportScope_1 !== null) {
                        // It is a module. Add exported directives and pipes to the current scope. This might
                        // involve rewriting the `Reference`s to those types to have an alias expression if one is
                        // required.
                        if (this.aliasingHost === null) {
                            // Fast path when aliases aren't required.
                            directives.push.apply(directives, tslib_1.__spread(exportScope_1.exported.directives));
                            pipes.push.apply(pipes, tslib_1.__spread(exportScope_1.exported.pipes));
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
                                for (var _j = (e_3 = void 0, tslib_1.__values(exportScope_1.exported.directives)), _k = _j.next(); !_k.done; _k = _j.next()) {
                                    var directive_1 = _k.value;
                                    directives.push(this.maybeAlias(directive_1, sourceFile, /* isReExport */ true));
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
                                for (var _l = (e_4 = void 0, tslib_1.__values(exportScope_1.exported.pipes)), _m = _l.next(); !_m.done; _m = _l.next()) {
                                    var pipe_1 = _m.value;
                                    pipes.push(this.maybeAlias(pipe_1, sourceFile, /* isReExport */ true));
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
            var exportScope = {
                exported: { directives: directives, pipes: pipes },
            };
            this.cache.set(clazz, exportScope);
            return exportScope;
        };
        MetadataDtsModuleScopeResolver.prototype.maybeAlias = function (dirOrPipe, maybeAliasFrom, isReExport) {
            var ref = dirOrPipe.ref;
            if (this.aliasingHost === null || ref.node.getSourceFile() === maybeAliasFrom) {
                return dirOrPipe;
            }
            var alias = this.aliasingHost.getAliasIn(ref.node, maybeAliasFrom, isReExport);
            if (alias === null) {
                return dirOrPipe;
            }
            return tslib_1.__assign(tslib_1.__assign({}, dirOrPipe), { ref: ref.cloneWithAlias(alias) });
        };
        return MetadataDtsModuleScopeResolver;
    }());
    exports.MetadataDtsModuleScopeResolver = MetadataDtsModuleScopeResolver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2NvcGUvc3JjL2RlcGVuZGVuY3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBY0g7Ozs7OztPQU1HO0lBQ0g7UUFNRTs7V0FFRztRQUNILHdDQUFvQixhQUE2QixFQUFVLFlBQStCO1lBQXRFLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtZQUFVLGlCQUFZLEdBQVosWUFBWSxDQUFtQjtZQVIxRjs7ZUFFRztZQUNLLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBc0MsQ0FBQztRQUsrQixDQUFDO1FBRTlGOzs7Ozs7V0FNRztRQUNILGdEQUFPLEdBQVAsVUFBUSxHQUFnQzs7WUFDdEMsSUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztZQUN2QixJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyw4Q0FBNEMsR0FBRyxDQUFDLFNBQVMsY0FDckUsVUFBVSxDQUFDLFFBQVEsNEJBQXlCLENBQUMsQ0FBQzthQUNuRDtZQUVELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3pCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFHLENBQUM7YUFDaEM7WUFFRCxzRkFBc0Y7WUFDdEYsSUFBTSxVQUFVLEdBQW9CLEVBQUUsQ0FBQztZQUN2QyxJQUFNLEtBQUssR0FBZSxFQUFFLENBQUM7WUFFN0IsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN6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ZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBbGlhc2luZ0hvc3QsIFJlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0RpcmVjdGl2ZU1ldGEsIE1ldGFkYXRhUmVhZGVyLCBQaXBlTWV0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHtFeHBvcnRTY29wZX0gZnJvbSAnLi9hcGknO1xuXG5leHBvcnQgaW50ZXJmYWNlIER0c01vZHVsZVNjb3BlUmVzb2x2ZXIge1xuICByZXNvbHZlKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogRXhwb3J0U2NvcGV8bnVsbDtcbn1cblxuLyoqXG4gKiBSZWFkcyBBbmd1bGFyIG1ldGFkYXRhIGZyb20gY2xhc3NlcyBkZWNsYXJlZCBpbiAuZC50cyBmaWxlcyBhbmQgY29tcHV0ZXMgYW4gYEV4cG9ydFNjb3BlYC5cbiAqXG4gKiBHaXZlbiBhbiBOZ01vZHVsZSBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUsIHRoaXMgcmVzb2x2ZXIgY2FuIHByb2R1Y2UgYSB0cmFuc2l0aXZlIGBFeHBvcnRTY29wZWBcbiAqIG9mIGFsbCBvZiB0aGUgZGlyZWN0aXZlcy9waXBlcyBpdCBleHBvcnRzLiBJdCBkb2VzIHRoaXMgYnkgcmVhZGluZyBtZXRhZGF0YSBvZmYgb2YgSXZ5IHN0YXRpY1xuICogZmllbGRzIG9uIGRpcmVjdGl2ZXMsIGNvbXBvbmVudHMsIHBpcGVzLCBhbmQgTmdNb2R1bGVzLlxuICovXG5leHBvcnQgY2xhc3MgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyIGltcGxlbWVudHMgRHRzTW9kdWxlU2NvcGVSZXNvbHZlciB7XG4gIC8qKlxuICAgKiBDYWNoZSB3aGljaCBob2xkcyBmdWxseSByZXNvbHZlZCBzY29wZXMgZm9yIE5nTW9kdWxlIGNsYXNzZXMgZnJvbSAuZC50cyBmaWxlcy5cbiAgICovXG4gIHByaXZhdGUgY2FjaGUgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIEV4cG9ydFNjb3BlfG51bGw+KCk7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBkdHNNZXRhUmVhZGVyIGEgYE1ldGFkYXRhUmVhZGVyYCB3aGljaCBjYW4gcmVhZCBtZXRhZGF0YSBmcm9tIGAuZC50c2AgZmlsZXMuXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGR0c01ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIGFsaWFzaW5nSG9zdDogQWxpYXNpbmdIb3N0fG51bGwpIHt9XG5cbiAgLyoqXG4gICAqIFJlc29sdmUgYSBgUmVmZXJlbmNlYCdkIE5nTW9kdWxlIGZyb20gYSAuZC50cyBmaWxlIGFuZCBwcm9kdWNlIGEgdHJhbnNpdGl2ZSBgRXhwb3J0U2NvcGVgXG4gICAqIGxpc3RpbmcgdGhlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIHRoYXQgTmdNb2R1bGUgZXhwb3J0cyB0byBvdGhlcnMuXG4gICAqXG4gICAqIFRoaXMgb3BlcmF0aW9uIHJlbGllcyBvbiBhIGBSZWZlcmVuY2VgIGluc3RlYWQgb2YgYSBkaXJlY3QgVHlwZVNjcnB0IG5vZGUgYXMgdGhlIGBSZWZlcmVuY2Vgc1xuICAgKiBwcm9kdWNlZCBkZXBlbmQgb24gaG93IHRoZSBvcmlnaW5hbCBOZ01vZHVsZSB3YXMgaW1wb3J0ZWQuXG4gICAqL1xuICByZXNvbHZlKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogRXhwb3J0U2NvcGV8bnVsbCB7XG4gICAgY29uc3QgY2xhenogPSByZWYubm9kZTtcbiAgICBjb25zdCBzb3VyY2VGaWxlID0gY2xhenouZ2V0U291cmNlRmlsZSgpO1xuICAgIGlmICghc291cmNlRmlsZS5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBEZWJ1ZyBlcnJvcjogRHRzTW9kdWxlU2NvcGVSZXNvbHZlci5yZWFkKCR7cmVmLmRlYnVnTmFtZX0gZnJvbSAke1xuICAgICAgICAgIHNvdXJjZUZpbGUuZmlsZU5hbWV9KSwgYnV0IG5vdCBhIC5kLnRzIGZpbGVgKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jYWNoZS5oYXMoY2xhenopKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZS5nZXQoY2xhenopICE7XG4gICAgfVxuXG4gICAgLy8gQnVpbGQgdXAgdGhlIGV4cG9ydCBzY29wZSAtIHRob3NlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIG1hZGUgdmlzaWJsZSBieSB0aGlzIG1vZHVsZS5cbiAgICBjb25zdCBkaXJlY3RpdmVzOiBEaXJlY3RpdmVNZXRhW10gPSBbXTtcbiAgICBjb25zdCBwaXBlczogUGlwZU1ldGFbXSA9IFtdO1xuXG4gICAgY29uc3QgbWV0YSA9IHRoaXMuZHRzTWV0YVJlYWRlci5nZXROZ01vZHVsZU1ldGFkYXRhKHJlZik7XG4gICAgaWYgKG1ldGEgPT09IG51bGwpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KGNsYXp6LCBudWxsKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGRlY2xhcmF0aW9ucyA9IG5ldyBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4oKTtcbiAgICBmb3IgKGNvbnN0IGRlY2xSZWYgb2YgbWV0YS5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIGRlY2xhcmF0aW9ucy5hZGQoZGVjbFJlZi5ub2RlKTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IHRoZSAnZXhwb3J0cycgZmllbGQgb2YgdGhlIE5nTW9kdWxlJ3MgbWV0YWRhdGEgaXMgaW1wb3J0YW50LiBJbXBvcnRzIGFuZCBkZWNsYXJhdGlvbnNcbiAgICAvLyBkb24ndCBhZmZlY3QgdGhlIGV4cG9ydCBzY29wZS5cbiAgICBmb3IgKGNvbnN0IGV4cG9ydFJlZiBvZiBtZXRhLmV4cG9ydHMpIHtcbiAgICAgIC8vIEF0dGVtcHQgdG8gcHJvY2VzcyB0aGUgZXhwb3J0IGFzIGEgZGlyZWN0aXZlLlxuICAgICAgY29uc3QgZGlyZWN0aXZlID0gdGhpcy5kdHNNZXRhUmVhZGVyLmdldERpcmVjdGl2ZU1ldGFkYXRhKGV4cG9ydFJlZik7XG4gICAgICBpZiAoZGlyZWN0aXZlICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGlzUmVFeHBvcnQgPSAhZGVjbGFyYXRpb25zLmhhcyhleHBvcnRSZWYubm9kZSk7XG4gICAgICAgIGRpcmVjdGl2ZXMucHVzaCh0aGlzLm1heWJlQWxpYXMoZGlyZWN0aXZlLCBzb3VyY2VGaWxlLCBpc1JlRXhwb3J0KSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBBdHRlbXB0IHRvIHByb2Nlc3MgdGhlIGV4cG9ydCBhcyBhIHBpcGUuXG4gICAgICBjb25zdCBwaXBlID0gdGhpcy5kdHNNZXRhUmVhZGVyLmdldFBpcGVNZXRhZGF0YShleHBvcnRSZWYpO1xuICAgICAgaWYgKHBpcGUgIT09IG51bGwpIHtcbiAgICAgICAgY29uc3QgaXNSZUV4cG9ydCA9ICFkZWNsYXJhdGlvbnMuaGFzKGV4cG9ydFJlZi5ub2RlKTtcbiAgICAgICAgcGlwZXMucHVzaCh0aGlzLm1heWJlQWxpYXMocGlwZSwgc291cmNlRmlsZSwgaXNSZUV4cG9ydCkpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gQXR0ZW1wdCB0byBwcm9jZXNzIHRoZSBleHBvcnQgYXMgYSBtb2R1bGUuXG4gICAgICBjb25zdCBleHBvcnRTY29wZSA9IHRoaXMucmVzb2x2ZShleHBvcnRSZWYpO1xuICAgICAgaWYgKGV4cG9ydFNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgIC8vIEl0IGlzIGEgbW9kdWxlLiBBZGQgZXhwb3J0ZWQgZGlyZWN0aXZlcyBhbmQgcGlwZXMgdG8gdGhlIGN1cnJlbnQgc2NvcGUuIFRoaXMgbWlnaHRcbiAgICAgICAgLy8gaW52b2x2ZSByZXdyaXRpbmcgdGhlIGBSZWZlcmVuY2VgcyB0byB0aG9zZSB0eXBlcyB0byBoYXZlIGFuIGFsaWFzIGV4cHJlc3Npb24gaWYgb25lIGlzXG4gICAgICAgIC8vIHJlcXVpcmVkLlxuICAgICAgICBpZiAodGhpcy5hbGlhc2luZ0hvc3QgPT09IG51bGwpIHtcbiAgICAgICAgICAvLyBGYXN0IHBhdGggd2hlbiBhbGlhc2VzIGFyZW4ndCByZXF1aXJlZC5cbiAgICAgICAgICBkaXJlY3RpdmVzLnB1c2goLi4uZXhwb3J0U2NvcGUuZXhwb3J0ZWQuZGlyZWN0aXZlcyk7XG4gICAgICAgICAgcGlwZXMucHVzaCguLi5leHBvcnRTY29wZS5leHBvcnRlZC5waXBlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gSXQncyBuZWNlc3NhcnkgdG8gcmV3cml0ZSB0aGUgYFJlZmVyZW5jZWBzIHRvIGFkZCBhbGlhcyBleHByZXNzaW9ucy4gVGhpcyB3YXksIGltcG9ydHNcbiAgICAgICAgICAvLyBnZW5lcmF0ZWQgdG8gdGhlc2UgZGlyZWN0aXZlcyBhbmQgcGlwZXMgd2lsbCB1c2UgYSBzaGFsbG93IGltcG9ydCB0byBgc291cmNlRmlsZWBcbiAgICAgICAgICAvLyBpbnN0ZWFkIG9mIGEgZGVlcCBpbXBvcnQgZGlyZWN0bHkgdG8gdGhlIGRpcmVjdGl2ZSBvciBwaXBlIGNsYXNzLlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gT25lIGltcG9ydGFudCBjaGVjayBoZXJlIGlzIHdoZXRoZXIgdGhlIGRpcmVjdGl2ZS9waXBlIGlzIGRlY2xhcmVkIGluIHRoZSBzYW1lXG4gICAgICAgICAgLy8gc291cmNlIGZpbGUgYXMgdGhlIHJlLWV4cG9ydGluZyBOZ01vZHVsZS4gVGhpcyBjYW4gaGFwcGVuIGlmIGJvdGggYSBkaXJlY3RpdmUsIGl0c1xuICAgICAgICAgIC8vIE5nTW9kdWxlLCBhbmQgdGhlIHJlLWV4cG9ydGluZyBOZ01vZHVsZSBhcmUgYWxsIGluIHRoZSBzYW1lIGZpbGUuIEluIHRoaXMgY2FzZSxcbiAgICAgICAgICAvLyBubyBpbXBvcnQgYWxpYXMgaXMgbmVlZGVkIGFzIGl0IHdvdWxkIGdvIHRvIHRoZSBzYW1lIGZpbGUgYW55d2F5LlxuICAgICAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIGV4cG9ydFNjb3BlLmV4cG9ydGVkLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgICAgIGRpcmVjdGl2ZXMucHVzaCh0aGlzLm1heWJlQWxpYXMoZGlyZWN0aXZlLCBzb3VyY2VGaWxlLCAvKiBpc1JlRXhwb3J0ICovIHRydWUpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yIChjb25zdCBwaXBlIG9mIGV4cG9ydFNjb3BlLmV4cG9ydGVkLnBpcGVzKSB7XG4gICAgICAgICAgICBwaXBlcy5wdXNoKHRoaXMubWF5YmVBbGlhcyhwaXBlLCBzb3VyY2VGaWxlLCAvKiBpc1JlRXhwb3J0ICovIHRydWUpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAvLyBUaGUgZXhwb3J0IHdhcyBub3QgYSBkaXJlY3RpdmUsIGEgcGlwZSwgb3IgYSBtb2R1bGUuIFRoaXMgaXMgYW4gZXJyb3IuXG4gICAgICAvLyBUT0RPKGFseGh1Yik6IHByb2R1Y2UgYSB0cy5EaWFnbm9zdGljXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cG9ydGVkIHZhbHVlICR7ZXhwb3J0UmVmLmRlYnVnTmFtZX0gd2FzIG5vdCBhIGRpcmVjdGl2ZSwgcGlwZSwgb3IgbW9kdWxlYCk7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwb3J0U2NvcGU6IEV4cG9ydFNjb3BlID0ge1xuICAgICAgZXhwb3J0ZWQ6IHtkaXJlY3RpdmVzLCBwaXBlc30sXG4gICAgfTtcbiAgICB0aGlzLmNhY2hlLnNldChjbGF6eiwgZXhwb3J0U2NvcGUpO1xuICAgIHJldHVybiBleHBvcnRTY29wZTtcbiAgfVxuXG4gIHByaXZhdGUgbWF5YmVBbGlhczxUIGV4dGVuZHMgRGlyZWN0aXZlTWV0YXxQaXBlTWV0YT4oXG4gICAgICBkaXJPclBpcGU6IFQsIG1heWJlQWxpYXNGcm9tOiB0cy5Tb3VyY2VGaWxlLCBpc1JlRXhwb3J0OiBib29sZWFuKTogVCB7XG4gICAgY29uc3QgcmVmID0gZGlyT3JQaXBlLnJlZjtcbiAgICBpZiAodGhpcy5hbGlhc2luZ0hvc3QgPT09IG51bGwgfHwgcmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpID09PSBtYXliZUFsaWFzRnJvbSkge1xuICAgICAgcmV0dXJuIGRpck9yUGlwZTtcbiAgICB9XG5cbiAgICBjb25zdCBhbGlhcyA9IHRoaXMuYWxpYXNpbmdIb3N0LmdldEFsaWFzSW4ocmVmLm5vZGUsIG1heWJlQWxpYXNGcm9tLCBpc1JlRXhwb3J0KTtcbiAgICBpZiAoYWxpYXMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBkaXJPclBpcGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLmRpck9yUGlwZSxcbiAgICAgIHJlZjogcmVmLmNsb25lV2l0aEFsaWFzKGFsaWFzKSxcbiAgICB9O1xuICB9XG59XG4iXX0=