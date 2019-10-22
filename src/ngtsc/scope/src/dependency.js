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
                    var exportScope = this.resolve(exportRef);
                    if (exportScope !== null) {
                        // It is a module. Add exported directives and pipes to the current scope. This might
                        // involve rewriting the `Reference`s to those types to have an alias expression if one is
                        // required.
                        if (this.aliasingHost === null) {
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
                                for (var _j = (e_3 = void 0, tslib_1.__values(exportScope.exported.directives)), _k = _j.next(); !_k.done; _k = _j.next()) {
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
                                for (var _l = (e_4 = void 0, tslib_1.__values(exportScope.exported.pipes)), _m = _l.next(); !_m.done; _m = _l.next()) {
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
            return {
                exported: { directives: directives, pipes: pipes },
            };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2NvcGUvc3JjL2RlcGVuZGVuY3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBY0g7Ozs7OztPQU1HO0lBQ0g7UUFNRTs7V0FFRztRQUNILHdDQUFvQixhQUE2QixFQUFVLFlBQStCO1lBQXRFLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtZQUFVLGlCQUFZLEdBQVosWUFBWSxDQUFtQjtZQVIxRjs7ZUFFRztZQUNLLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBc0MsQ0FBQztRQUsrQixDQUFDO1FBRTlGOzs7Ozs7V0FNRztRQUNILGdEQUFPLEdBQVAsVUFBUSxHQUFnQzs7WUFDdEMsSUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztZQUN2QixJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDakMsTUFBTSxJQUFJLEtBQUssQ0FDWCw4Q0FBNEMsR0FBRyxDQUFDLFNBQVMsY0FBUyxVQUFVLENBQUMsUUFBUSw0QkFBeUIsQ0FBQyxDQUFDO2FBQ3JIO1lBRUQsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDekIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUcsQ0FBQzthQUNoQztZQUVELHNGQUFzRjtZQUN0RixJQUFNLFVBQVUsR0FBb0IsRUFBRSxDQUFDO1lBQ3ZDLElBQU0sS0FBSyxHQUFlLEVBQUUsQ0FBQztZQUU3QixJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3pE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QyxVQUFVLENBQUMsTUFBSSxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2lDQUN0RTs7Ozs7Ozs7O3lCQUNGO3FCQUNGO29CQUNELFNBQVM7b0JBRVQseUVBQXlFO29CQUN6RSx3Q0FBd0M7b0JBQ3hDLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQWtCLFNBQVMsQ0FBQyxTQUFTLDBDQUF1QyxDQUFDLENBQUM7aUJBQy9GOzs7Ozs7Ozs7WUFFRCxPQUFPO2dCQUNMLFFBQVEsRUFBRSxFQUFDLFVBQVUsWUFBQSxFQUFFLEtBQUssT0FBQSxFQUFDO2FBQzlCLENBQUM7UUFDSixDQUFDO1FBRU8sbURBQVUsR0FBbEIsVUFDSSxTQUFZLEVBQUUsY0FBNkIsRUFBRSxVQUFtQjtZQUNsRSxJQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDO1lBQzFCLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsS0FBSyxjQUFjLEVBQUU7Z0JBQzdFLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUQsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDakYsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFO2dCQUNsQixPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUVELDZDQUNLLFNBQVMsS0FDWixHQUFHLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFDOUI7UUFDSixDQUFDO1FBQ0gscUNBQUM7SUFBRCxDQUFDLEFBeEhELElBd0hDO0lBeEhZLHdFQUE4QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWxpYXNpbmdIb3N0LCBSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEaXJlY3RpdmVNZXRhLCBNZXRhZGF0YVJlYWRlciwgUGlwZU1ldGF9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmltcG9ydCB7RXhwb3J0U2NvcGV9IGZyb20gJy4vYXBpJztcblxuZXhwb3J0IGludGVyZmFjZSBEdHNNb2R1bGVTY29wZVJlc29sdmVyIHtcbiAgcmVzb2x2ZShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IEV4cG9ydFNjb3BlfG51bGw7XG59XG5cbi8qKlxuICogUmVhZHMgQW5ndWxhciBtZXRhZGF0YSBmcm9tIGNsYXNzZXMgZGVjbGFyZWQgaW4gLmQudHMgZmlsZXMgYW5kIGNvbXB1dGVzIGFuIGBFeHBvcnRTY29wZWAuXG4gKlxuICogR2l2ZW4gYW4gTmdNb2R1bGUgZGVjbGFyZWQgaW4gYSAuZC50cyBmaWxlLCB0aGlzIHJlc29sdmVyIGNhbiBwcm9kdWNlIGEgdHJhbnNpdGl2ZSBgRXhwb3J0U2NvcGVgXG4gKiBvZiBhbGwgb2YgdGhlIGRpcmVjdGl2ZXMvcGlwZXMgaXQgZXhwb3J0cy4gSXQgZG9lcyB0aGlzIGJ5IHJlYWRpbmcgbWV0YWRhdGEgb2ZmIG9mIEl2eSBzdGF0aWNcbiAqIGZpZWxkcyBvbiBkaXJlY3RpdmVzLCBjb21wb25lbnRzLCBwaXBlcywgYW5kIE5nTW9kdWxlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlciBpbXBsZW1lbnRzIER0c01vZHVsZVNjb3BlUmVzb2x2ZXIge1xuICAvKipcbiAgICogQ2FjaGUgd2hpY2ggaG9sZHMgZnVsbHkgcmVzb2x2ZWQgc2NvcGVzIGZvciBOZ01vZHVsZSBjbGFzc2VzIGZyb20gLmQudHMgZmlsZXMuXG4gICAqL1xuICBwcml2YXRlIGNhY2hlID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBFeHBvcnRTY29wZXxudWxsPigpO1xuXG4gIC8qKlxuICAgKiBAcGFyYW0gZHRzTWV0YVJlYWRlciBhIGBNZXRhZGF0YVJlYWRlcmAgd2hpY2ggY2FuIHJlYWQgbWV0YWRhdGEgZnJvbSBgLmQudHNgIGZpbGVzLlxuICAgKi9cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBkdHNNZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlciwgcHJpdmF0ZSBhbGlhc2luZ0hvc3Q6IEFsaWFzaW5nSG9zdHxudWxsKSB7fVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGEgYFJlZmVyZW5jZWAnZCBOZ01vZHVsZSBmcm9tIGEgLmQudHMgZmlsZSBhbmQgcHJvZHVjZSBhIHRyYW5zaXRpdmUgYEV4cG9ydFNjb3BlYFxuICAgKiBsaXN0aW5nIHRoZSBkaXJlY3RpdmVzIGFuZCBwaXBlcyB3aGljaCB0aGF0IE5nTW9kdWxlIGV4cG9ydHMgdG8gb3RoZXJzLlxuICAgKlxuICAgKiBUaGlzIG9wZXJhdGlvbiByZWxpZXMgb24gYSBgUmVmZXJlbmNlYCBpbnN0ZWFkIG9mIGEgZGlyZWN0IFR5cGVTY3JwdCBub2RlIGFzIHRoZSBgUmVmZXJlbmNlYHNcbiAgICogcHJvZHVjZWQgZGVwZW5kIG9uIGhvdyB0aGUgb3JpZ2luYWwgTmdNb2R1bGUgd2FzIGltcG9ydGVkLlxuICAgKi9cbiAgcmVzb2x2ZShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IEV4cG9ydFNjb3BlfG51bGwge1xuICAgIGNvbnN0IGNsYXp6ID0gcmVmLm5vZGU7XG4gICAgY29uc3Qgc291cmNlRmlsZSA9IGNsYXp6LmdldFNvdXJjZUZpbGUoKTtcbiAgICBpZiAoIXNvdXJjZUZpbGUuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRGVidWcgZXJyb3I6IER0c01vZHVsZVNjb3BlUmVzb2x2ZXIucmVhZCgke3JlZi5kZWJ1Z05hbWV9IGZyb20gJHtzb3VyY2VGaWxlLmZpbGVOYW1lfSksIGJ1dCBub3QgYSAuZC50cyBmaWxlYCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY2FjaGUuaGFzKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGUuZ2V0KGNsYXp6KSAhO1xuICAgIH1cblxuICAgIC8vIEJ1aWxkIHVwIHRoZSBleHBvcnQgc2NvcGUgLSB0aG9zZSBkaXJlY3RpdmVzIGFuZCBwaXBlcyBtYWRlIHZpc2libGUgYnkgdGhpcyBtb2R1bGUuXG4gICAgY29uc3QgZGlyZWN0aXZlczogRGlyZWN0aXZlTWV0YVtdID0gW107XG4gICAgY29uc3QgcGlwZXM6IFBpcGVNZXRhW10gPSBbXTtcblxuICAgIGNvbnN0IG1ldGEgPSB0aGlzLmR0c01ldGFSZWFkZXIuZ2V0TmdNb2R1bGVNZXRhZGF0YShyZWYpO1xuICAgIGlmIChtZXRhID09PSBudWxsKSB7XG4gICAgICB0aGlzLmNhY2hlLnNldChjbGF6eiwgbnVsbCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KCk7XG4gICAgZm9yIChjb25zdCBkZWNsUmVmIG9mIG1ldGEuZGVjbGFyYXRpb25zKSB7XG4gICAgICBkZWNsYXJhdGlvbnMuYWRkKGRlY2xSZWYubm9kZSk7XG4gICAgfVxuXG4gICAgLy8gT25seSB0aGUgJ2V4cG9ydHMnIGZpZWxkIG9mIHRoZSBOZ01vZHVsZSdzIG1ldGFkYXRhIGlzIGltcG9ydGFudC4gSW1wb3J0cyBhbmQgZGVjbGFyYXRpb25zXG4gICAgLy8gZG9uJ3QgYWZmZWN0IHRoZSBleHBvcnQgc2NvcGUuXG4gICAgZm9yIChjb25zdCBleHBvcnRSZWYgb2YgbWV0YS5leHBvcnRzKSB7XG4gICAgICAvLyBBdHRlbXB0IHRvIHByb2Nlc3MgdGhlIGV4cG9ydCBhcyBhIGRpcmVjdGl2ZS5cbiAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHRoaXMuZHRzTWV0YVJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShleHBvcnRSZWYpO1xuICAgICAgaWYgKGRpcmVjdGl2ZSAhPT0gbnVsbCkge1xuICAgICAgICBjb25zdCBpc1JlRXhwb3J0ID0gIWRlY2xhcmF0aW9ucy5oYXMoZXhwb3J0UmVmLm5vZGUpO1xuICAgICAgICBkaXJlY3RpdmVzLnB1c2godGhpcy5tYXliZUFsaWFzKGRpcmVjdGl2ZSwgc291cmNlRmlsZSwgaXNSZUV4cG9ydCkpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gQXR0ZW1wdCB0byBwcm9jZXNzIHRoZSBleHBvcnQgYXMgYSBwaXBlLlxuICAgICAgY29uc3QgcGlwZSA9IHRoaXMuZHRzTWV0YVJlYWRlci5nZXRQaXBlTWV0YWRhdGEoZXhwb3J0UmVmKTtcbiAgICAgIGlmIChwaXBlICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGlzUmVFeHBvcnQgPSAhZGVjbGFyYXRpb25zLmhhcyhleHBvcnRSZWYubm9kZSk7XG4gICAgICAgIHBpcGVzLnB1c2godGhpcy5tYXliZUFsaWFzKHBpcGUsIHNvdXJjZUZpbGUsIGlzUmVFeHBvcnQpKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIEF0dGVtcHQgdG8gcHJvY2VzcyB0aGUgZXhwb3J0IGFzIGEgbW9kdWxlLlxuICAgICAgY29uc3QgZXhwb3J0U2NvcGUgPSB0aGlzLnJlc29sdmUoZXhwb3J0UmVmKTtcbiAgICAgIGlmIChleHBvcnRTY29wZSAhPT0gbnVsbCkge1xuICAgICAgICAvLyBJdCBpcyBhIG1vZHVsZS4gQWRkIGV4cG9ydGVkIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHRvIHRoZSBjdXJyZW50IHNjb3BlLiBUaGlzIG1pZ2h0XG4gICAgICAgIC8vIGludm9sdmUgcmV3cml0aW5nIHRoZSBgUmVmZXJlbmNlYHMgdG8gdGhvc2UgdHlwZXMgdG8gaGF2ZSBhbiBhbGlhcyBleHByZXNzaW9uIGlmIG9uZSBpc1xuICAgICAgICAvLyByZXF1aXJlZC5cbiAgICAgICAgaWYgKHRoaXMuYWxpYXNpbmdIb3N0ID09PSBudWxsKSB7XG4gICAgICAgICAgLy8gRmFzdCBwYXRoIHdoZW4gYWxpYXNlcyBhcmVuJ3QgcmVxdWlyZWQuXG4gICAgICAgICAgZGlyZWN0aXZlcy5wdXNoKC4uLmV4cG9ydFNjb3BlLmV4cG9ydGVkLmRpcmVjdGl2ZXMpO1xuICAgICAgICAgIHBpcGVzLnB1c2goLi4uZXhwb3J0U2NvcGUuZXhwb3J0ZWQucGlwZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEl0J3MgbmVjZXNzYXJ5IHRvIHJld3JpdGUgdGhlIGBSZWZlcmVuY2VgcyB0byBhZGQgYWxpYXMgZXhwcmVzc2lvbnMuIFRoaXMgd2F5LCBpbXBvcnRzXG4gICAgICAgICAgLy8gZ2VuZXJhdGVkIHRvIHRoZXNlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdpbGwgdXNlIGEgc2hhbGxvdyBpbXBvcnQgdG8gYHNvdXJjZUZpbGVgXG4gICAgICAgICAgLy8gaW5zdGVhZCBvZiBhIGRlZXAgaW1wb3J0IGRpcmVjdGx5IHRvIHRoZSBkaXJlY3RpdmUgb3IgcGlwZSBjbGFzcy5cbiAgICAgICAgICAvL1xuICAgICAgICAgIC8vIE9uZSBpbXBvcnRhbnQgY2hlY2sgaGVyZSBpcyB3aGV0aGVyIHRoZSBkaXJlY3RpdmUvcGlwZSBpcyBkZWNsYXJlZCBpbiB0aGUgc2FtZVxuICAgICAgICAgIC8vIHNvdXJjZSBmaWxlIGFzIHRoZSByZS1leHBvcnRpbmcgTmdNb2R1bGUuIFRoaXMgY2FuIGhhcHBlbiBpZiBib3RoIGEgZGlyZWN0aXZlLCBpdHNcbiAgICAgICAgICAvLyBOZ01vZHVsZSwgYW5kIHRoZSByZS1leHBvcnRpbmcgTmdNb2R1bGUgYXJlIGFsbCBpbiB0aGUgc2FtZSBmaWxlLiBJbiB0aGlzIGNhc2UsXG4gICAgICAgICAgLy8gbm8gaW1wb3J0IGFsaWFzIGlzIG5lZWRlZCBhcyBpdCB3b3VsZCBnbyB0byB0aGUgc2FtZSBmaWxlIGFueXdheS5cbiAgICAgICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBleHBvcnRTY29wZS5leHBvcnRlZC5kaXJlY3RpdmVzKSB7XG4gICAgICAgICAgICBkaXJlY3RpdmVzLnB1c2godGhpcy5tYXliZUFsaWFzKGRpcmVjdGl2ZSwgc291cmNlRmlsZSwgLyogaXNSZUV4cG9ydCAqLyB0cnVlKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBleHBvcnRTY29wZS5leHBvcnRlZC5waXBlcykge1xuICAgICAgICAgICAgcGlwZXMucHVzaCh0aGlzLm1heWJlQWxpYXMocGlwZSwgc291cmNlRmlsZSwgLyogaXNSZUV4cG9ydCAqLyB0cnVlKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcblxuICAgICAgLy8gVGhlIGV4cG9ydCB3YXMgbm90IGEgZGlyZWN0aXZlLCBhIHBpcGUsIG9yIGEgbW9kdWxlLiBUaGlzIGlzIGFuIGVycm9yLlxuICAgICAgLy8gVE9ETyhhbHhodWIpOiBwcm9kdWNlIGEgdHMuRGlhZ25vc3RpY1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBvcnRlZCB2YWx1ZSAke2V4cG9ydFJlZi5kZWJ1Z05hbWV9IHdhcyBub3QgYSBkaXJlY3RpdmUsIHBpcGUsIG9yIG1vZHVsZWApO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBleHBvcnRlZDoge2RpcmVjdGl2ZXMsIHBpcGVzfSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBtYXliZUFsaWFzPFQgZXh0ZW5kcyBEaXJlY3RpdmVNZXRhfFBpcGVNZXRhPihcbiAgICAgIGRpck9yUGlwZTogVCwgbWF5YmVBbGlhc0Zyb206IHRzLlNvdXJjZUZpbGUsIGlzUmVFeHBvcnQ6IGJvb2xlYW4pOiBUIHtcbiAgICBjb25zdCByZWYgPSBkaXJPclBpcGUucmVmO1xuICAgIGlmICh0aGlzLmFsaWFzaW5nSG9zdCA9PT0gbnVsbCB8fCByZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkgPT09IG1heWJlQWxpYXNGcm9tKSB7XG4gICAgICByZXR1cm4gZGlyT3JQaXBlO1xuICAgIH1cblxuICAgIGNvbnN0IGFsaWFzID0gdGhpcy5hbGlhc2luZ0hvc3QuZ2V0QWxpYXNJbihyZWYubm9kZSwgbWF5YmVBbGlhc0Zyb20sIGlzUmVFeHBvcnQpO1xuICAgIGlmIChhbGlhcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGRpck9yUGlwZTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgLi4uZGlyT3JQaXBlLFxuICAgICAgcmVmOiByZWYuY2xvbmVXaXRoQWxpYXMoYWxpYXMpLFxuICAgIH07XG4gIH1cbn1cbiJdfQ==