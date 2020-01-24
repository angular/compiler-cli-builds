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
        define("@angular/compiler-cli/src/ngtsc/imports/src/alias", ["require", "exports", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/imports/src/emitter"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var emitter_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/emitter");
    // Escape anything that isn't alphanumeric, '/' or '_'.
    var CHARS_TO_ESCAPE = /[^a-zA-Z0-9/_]/g;
    /**
     * An `AliasingHost` which generates and consumes alias re-exports when module names for each file
     * are determined by a `FileToModuleHost`.
     *
     * When using a `FileToModuleHost`, aliasing prevents issues with transitive dependencies. See the
     * README.md for more details.
     */
    var FileToModuleAliasingHost = /** @class */ (function () {
        function FileToModuleAliasingHost(fileToModuleHost) {
            this.fileToModuleHost = fileToModuleHost;
            /**
             * With a `FileToModuleHost`, aliases are chosen automatically without the need to look through
             * the exports present in a .d.ts file, so we can avoid cluttering the .d.ts files.
             */
            this.aliasExportsInDts = false;
        }
        FileToModuleAliasingHost.prototype.maybeAliasSymbolAs = function (ref, context, ngModuleName, isReExport) {
            if (!isReExport) {
                // Aliasing is used with a FileToModuleHost to prevent transitive dependencies. Thus, aliases
                // only need to be created for directives/pipes which are not direct declarations of an
                // NgModule which exports them.
                return null;
            }
            return this.aliasName(ref.node, context);
        };
        /**
         * Generates an `Expression` to import `decl` from `via`, assuming an export was added when `via`
         * was compiled per `maybeAliasSymbolAs` above.
         */
        FileToModuleAliasingHost.prototype.getAliasIn = function (decl, via, isReExport) {
            if (!isReExport) {
                // Directly exported directives/pipes don't require an alias, per the logic in
                // `maybeAliasSymbolAs`.
                return null;
            }
            // viaModule is the module it'll actually be imported from.
            var moduleName = this.fileToModuleHost.fileNameToModuleName(via.fileName, via.fileName);
            return new compiler_1.ExternalExpr({ moduleName: moduleName, name: this.aliasName(decl, via) });
        };
        /**
         * Generates an alias name based on the full module name of the file which declares the aliased
         * directive/pipe.
         */
        FileToModuleAliasingHost.prototype.aliasName = function (decl, context) {
            // The declared module is used to get the name of the alias.
            var declModule = this.fileToModuleHost.fileNameToModuleName(decl.getSourceFile().fileName, context.fileName);
            var replaced = declModule.replace(CHARS_TO_ESCAPE, '_').replace(/\//g, '$');
            return 'ɵng$' + replaced + '$$' + decl.name.text;
        };
        return FileToModuleAliasingHost;
    }());
    exports.FileToModuleAliasingHost = FileToModuleAliasingHost;
    /**
     * An `AliasingHost` which exports directives from any file containing an NgModule in which they're
     * declared/exported, under a private symbol name.
     *
     * These exports support cases where an NgModule is imported deeply from an absolute module path
     * (that is, it's not part of an Angular Package Format entrypoint), and the compiler needs to
     * import any matched directives/pipes from the same path (to the NgModule file). See README.md for
     * more details.
     */
    var PrivateExportAliasingHost = /** @class */ (function () {
        function PrivateExportAliasingHost(host) {
            this.host = host;
            /**
             * Under private export aliasing, the `AbsoluteModuleStrategy` used for emitting references will
             * will select aliased exports that it finds in the .d.ts file for an NgModule's file. Thus,
             * emitting these exports in .d.ts is a requirement for the `PrivateExportAliasingHost` to
             * function correctly.
             */
            this.aliasExportsInDts = true;
        }
        PrivateExportAliasingHost.prototype.maybeAliasSymbolAs = function (ref, context, ngModuleName) {
            if (ref.hasOwningModuleGuess) {
                // Skip nodes that already have an associated absolute module specifier, since they can be
                // safely imported from that specifier.
                return null;
            }
            // Look for a user-provided export of `decl` in `context`. If one exists, then an alias export
            // is not needed.
            // TODO(alxhub): maybe add a host method to check for the existence of an export without going
            // through the entire list of exports.
            var exports = this.host.getExportsOfModule(context);
            if (exports === null) {
                // Something went wrong, and no exports were available at all. Bail rather than risk creating
                // re-exports when they're not needed.
                throw new Error("Could not determine the exports of: " + context.fileName);
            }
            var found = false;
            exports.forEach(function (value) {
                if (value.node === ref.node) {
                    found = true;
                }
            });
            if (found) {
                // The module exports the declared class directly, no alias is necessary.
                return null;
            }
            return "\u0275ngExport\u0275" + ngModuleName + "\u0275" + ref.node.name.text;
        };
        /**
         * A `PrivateExportAliasingHost` only generates re-exports and does not direct the compiler to
         * directly consume the aliases it creates.
         *
         * Instead, they're consumed indirectly: `AbsoluteModuleStrategy` `ReferenceEmitterStrategy` will
         * select these alias exports automatically when looking for an export of the directive/pipe from
         * the same path as the NgModule was imported.
         *
         * Thus, `getAliasIn` always returns `null`.
         */
        PrivateExportAliasingHost.prototype.getAliasIn = function () { return null; };
        return PrivateExportAliasingHost;
    }());
    exports.PrivateExportAliasingHost = PrivateExportAliasingHost;
    /**
     * A `ReferenceEmitStrategy` which will consume the alias attached to a particular `Reference` to a
     * directive or pipe, if it exists.
     */
    var AliasStrategy = /** @class */ (function () {
        function AliasStrategy() {
        }
        AliasStrategy.prototype.emit = function (ref, context, importMode) {
            if (importMode & emitter_1.ImportFlags.NoAliasing) {
                return null;
            }
            return ref.alias;
        };
        return AliasStrategy;
    }());
    exports.AliasStrategy = AliasStrategy;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxpYXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvc3JjL2FsaWFzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTJEO0lBSzNELCtFQUErRTtJQUkvRSx1REFBdUQ7SUFDdkQsSUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQUM7SUFtRTFDOzs7Ozs7T0FNRztJQUNIO1FBQ0Usa0NBQW9CLGdCQUFrQztZQUFsQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1lBRXREOzs7ZUFHRztZQUNNLHNCQUFpQixHQUFHLEtBQUssQ0FBQztRQU5zQixDQUFDO1FBUTFELHFEQUFrQixHQUFsQixVQUNJLEdBQWdDLEVBQUUsT0FBc0IsRUFBRSxZQUFvQixFQUM5RSxVQUFtQjtZQUNyQixJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLDZGQUE2RjtnQkFDN0YsdUZBQXVGO2dCQUN2RiwrQkFBK0I7Z0JBQy9CLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQ7OztXQUdHO1FBQ0gsNkNBQVUsR0FBVixVQUFXLElBQXNCLEVBQUUsR0FBa0IsRUFBRSxVQUFtQjtZQUN4RSxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLDhFQUE4RTtnQkFDOUUsd0JBQXdCO2dCQUN4QixPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsMkRBQTJEO1lBQzNELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMxRixPQUFPLElBQUksdUJBQVksQ0FBQyxFQUFDLFVBQVUsWUFBQSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBQyxDQUFDLENBQUM7UUFDekUsQ0FBQztRQUVEOzs7V0FHRztRQUNLLDRDQUFTLEdBQWpCLFVBQWtCLElBQXNCLEVBQUUsT0FBc0I7WUFDOUQsNERBQTREO1lBQzVELElBQU0sVUFBVSxHQUNaLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUVoRyxJQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzlFLE9BQU8sTUFBTSxHQUFHLFFBQVEsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDbkQsQ0FBQztRQUNILCtCQUFDO0lBQUQsQ0FBQyxBQWhERCxJQWdEQztJQWhEWSw0REFBd0I7SUFrRHJDOzs7Ozs7OztPQVFHO0lBQ0g7UUFDRSxtQ0FBb0IsSUFBb0I7WUFBcEIsU0FBSSxHQUFKLElBQUksQ0FBZ0I7WUFFeEM7Ozs7O2VBS0c7WUFDTSxzQkFBaUIsR0FBRyxJQUFJLENBQUM7UUFSUyxDQUFDO1FBVTVDLHNEQUFrQixHQUFsQixVQUNJLEdBQWdDLEVBQUUsT0FBc0IsRUFBRSxZQUFvQjtZQUNoRixJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRTtnQkFDNUIsMEZBQTBGO2dCQUMxRix1Q0FBdUM7Z0JBQ3ZDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCw4RkFBOEY7WUFDOUYsaUJBQWlCO1lBQ2pCLDhGQUE4RjtZQUM5RixzQ0FBc0M7WUFDdEMsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN0RCxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7Z0JBQ3BCLDZGQUE2RjtnQkFDN0Ysc0NBQXNDO2dCQUN0QyxNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF1QyxPQUFPLENBQUMsUUFBVSxDQUFDLENBQUM7YUFDNUU7WUFDRCxJQUFJLEtBQUssR0FBWSxLQUFLLENBQUM7WUFDM0IsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEtBQUs7Z0JBQ25CLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxFQUFFO29CQUMzQixLQUFLLEdBQUcsSUFBSSxDQUFDO2lCQUNkO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLEtBQUssRUFBRTtnQkFDVCx5RUFBeUU7Z0JBQ3pFLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxPQUFPLHlCQUFhLFlBQVksY0FBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFNLENBQUM7UUFDM0QsQ0FBQztRQUVEOzs7Ozs7Ozs7V0FTRztRQUNILDhDQUFVLEdBQVYsY0FBcUIsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLGdDQUFDO0lBQUQsQ0FBQyxBQXBERCxJQW9EQztJQXBEWSw4REFBeUI7SUFzRHRDOzs7T0FHRztJQUNIO1FBQUE7UUFRQSxDQUFDO1FBUEMsNEJBQUksR0FBSixVQUFLLEdBQXVCLEVBQUUsT0FBc0IsRUFBRSxVQUF1QjtZQUMzRSxJQUFJLFVBQVUsR0FBRyxxQkFBVyxDQUFDLFVBQVUsRUFBRTtnQkFDdkMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQztRQUNuQixDQUFDO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBUkQsSUFRQztJQVJZLHNDQUFhIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIEV4dGVybmFsRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgUmVmbGVjdGlvbkhvc3QsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHtGaWxlVG9Nb2R1bGVIb3N0LCBJbXBvcnRGbGFncywgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5fSBmcm9tICcuL2VtaXR0ZXInO1xuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4vcmVmZXJlbmNlcyc7XG5cblxuLy8gRXNjYXBlIGFueXRoaW5nIHRoYXQgaXNuJ3QgYWxwaGFudW1lcmljLCAnLycgb3IgJ18nLlxuY29uc3QgQ0hBUlNfVE9fRVNDQVBFID0gL1teYS16QS1aMC05L19dL2c7XG5cbi8qKlxuICogQSBob3N0IGZvciB0aGUgYWxpYXNpbmcgc3lzdGVtLCB3aGljaCBhbGxvd3MgZm9yIGFsdGVybmF0aXZlIGV4cG9ydHMvaW1wb3J0cyBvZiBkaXJlY3RpdmVzL3BpcGVzLlxuICpcbiAqIEdpdmVuIGFuIGltcG9ydCBvZiBhbiBOZ01vZHVsZSAoZS5nLiBgQ29tbW9uTW9kdWxlYCksIHRoZSBjb21waWxlciBtdXN0IGdlbmVyYXRlIGltcG9ydHMgdG8gdGhlXG4gKiBkaXJlY3RpdmVzIGFuZCBwaXBlcyBleHBvcnRlZCBieSB0aGlzIG1vZHVsZSAoZS5nLiBgTmdJZmApIHdoZW4gdGhleSdyZSB1c2VkIGluIGEgcGFydGljdWxhclxuICogdGVtcGxhdGUuIEluIGl0cyBkZWZhdWx0IGNvbmZpZ3VyYXRpb24sIGlmIHRoZSBjb21waWxlciBpcyBub3QgZGlyZWN0bHkgYWJsZSB0byBpbXBvcnQgdGhlXG4gKiBjb21wb25lbnQgZnJvbSBhbm90aGVyIGZpbGUgd2l0aGluIHRoZSBzYW1lIHByb2plY3QsIGl0IHdpbGwgYXR0ZW1wdCB0byBpbXBvcnQgdGhlIGNvbXBvbmVudFxuICogZnJvbSB0aGUgc2FtZSAoYWJzb2x1dGUpIHBhdGggYnkgd2hpY2ggdGhlIG1vZHVsZSB3YXMgaW1wb3J0ZWQuIFNvIGluIHRoZSBhYm92ZSBleGFtcGxlIGlmXG4gKiBgQ29tbW9uTW9kdWxlYCB3YXMgaW1wb3J0ZWQgZnJvbSAnQGFuZ3VsYXIvY29tbW9uJywgdGhlIGNvbXBpbGVyIHdpbGwgYXR0ZW1wdCB0byBpbXBvcnQgYE5nSWZgXG4gKiBmcm9tICdAYW5ndWxhci9jb21tb24nIGFzIHdlbGwuXG4gKlxuICogVGhlIGFsaWFzaW5nIHN5c3RlbSBpbnRlcmFjdHMgd2l0aCB0aGUgYWJvdmUgbG9naWMgaW4gdHdvIGRpc3RpbmN0IHdheXMuXG4gKlxuICogMSkgSXQgY2FuIGJlIHVzZWQgdG8gY3JlYXRlIFwiYWxpYXNcIiByZS1leHBvcnRzIGZyb20gZGlmZmVyZW50IGZpbGVzLCB3aGljaCBjYW4gYmUgdXNlZCB3aGVuIHRoZVxuICogICAgdXNlciBoYXNuJ3QgZXhwb3J0ZWQgdGhlIGRpcmVjdGl2ZShzKSBmcm9tIHRoZSBFUyBtb2R1bGUgY29udGFpbmluZyB0aGUgTmdNb2R1bGUuIFRoZXNlIHJlLVxuICogICAgZXhwb3J0cyBjYW4gYWxzbyBiZSBoZWxwZnVsIHdoZW4gdXNpbmcgYSBgRmlsZVRvTW9kdWxlSG9zdGAsIHdoaWNoIG92ZXJyaWRlcyB0aGUgaW1wb3J0IGxvZ2ljXG4gKiAgICBkZXNjcmliZWQgYWJvdmUuXG4gKlxuICogMikgSXQgY2FuIGJlIHVzZWQgdG8gZ2V0IGFuIGFsdGVybmF0aXZlIGltcG9ydCBleHByZXNzaW9uIGZvciBhIGRpcmVjdGl2ZSBvciBwaXBlLCBpbnN0ZWFkIG9mXG4gKiAgICB0aGUgaW1wb3J0IHRoYXQgdGhlIG5vcm1hbCBsb2dpYyB3b3VsZCBhcHBseS4gVGhlIGFsaWFzIHVzZWQgZGVwZW5kcyBvbiB0aGUgcHJvdmVuYW5jZSBvZiB0aGVcbiAqICAgIGBSZWZlcmVuY2VgIHdoaWNoIHdhcyBvYnRhaW5lZCBmb3IgdGhlIGRpcmVjdGl2ZS9waXBlLCB3aGljaCBpcyB1c3VhbGx5IGEgcHJvcGVydHkgb2YgaG93IGl0XG4gKiAgICBjYW1lIHRvIGJlIGluIGEgdGVtcGxhdGUncyBzY29wZSAoZS5nLiBieSB3aGljaCBOZ01vZHVsZSkuXG4gKlxuICogU2VlIHRoZSBSRUFETUUubWQgZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gaG93IGFsaWFzaW5nIHdvcmtzIHdpdGhpbiB0aGUgY29tcGlsZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWxpYXNpbmdIb3N0IHtcbiAgLyoqXG4gICAqIENvbnRyb2xzIHdoZXRoZXIgYW55IGFsaWFzIHJlLWV4cG9ydHMgYXJlIHJlbmRlcmVkIGludG8gLmQudHMgZmlsZXMuXG4gICAqXG4gICAqIFRoaXMgaXMgbm90IGFsd2F5cyBuZWNlc3NhcnkgZm9yIGFsaWFzaW5nIHRvIGZ1bmN0aW9uIGNvcnJlY3RseSwgc28gdGhpcyBmbGFnIGFsbG93cyBhblxuICAgKiBgQWxpYXNpbmdIb3N0YCB0byBhdm9pZCBjbHV0dGVyaW5nIHRoZSAuZC50cyBmaWxlcyBpZiBleHBvcnRzIGFyZSBub3Qgc3RyaWN0bHkgbmVlZGVkLlxuICAgKi9cbiAgcmVhZG9ubHkgYWxpYXNFeHBvcnRzSW5EdHM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIERldGVybWluZSBhIG5hbWUgYnkgd2hpY2ggYGRlY2xgIHNob3VsZCBiZSByZS1leHBvcnRlZCBmcm9tIGBjb250ZXh0YCwgZGVwZW5kaW5nIG9uIHRoZVxuICAgKiBwYXJ0aWN1bGFyIHNldCBvZiBhbGlhc2luZyBydWxlcyBpbiBwbGFjZS5cbiAgICpcbiAgICogYG1heWJlQWxpYXNTeW1ib2xBc2AgY2FuIHJldHVybiBgbnVsbGAsIGluIHdoaWNoIGNhc2Ugbm8gYWxpYXMgZXhwb3J0IHNob3VsZCBiZSBnZW5lcmF0ZWQuXG4gICAqXG4gICAqIEBwYXJhbSByZWYgYSBgUmVmZXJlbmNlYCB0byB0aGUgZGlyZWN0aXZlL3BpcGUgdG8gY29uc2lkZXIgZm9yIGFsaWFzaW5nLlxuICAgKiBAcGFyYW0gY29udGV4dCB0aGUgYHRzLlNvdXJjZUZpbGVgIGluIHdoaWNoIHRoZSBhbGlhcyByZS1leHBvcnQgbWlnaHQgbmVlZCB0byBiZSBnZW5lcmF0ZWQuXG4gICAqIEBwYXJhbSBuZ01vZHVsZU5hbWUgdGhlIGRlY2xhcmVkIG5hbWUgb2YgdGhlIGBOZ01vZHVsZWAgd2l0aGluIGBjb250ZXh0YCBmb3Igd2hpY2ggdGhlIGFsaWFzXG4gICAqIHdvdWxkIGJlIGdlbmVyYXRlZC5cbiAgICogQHBhcmFtIGlzUmVFeHBvcnQgd2hldGhlciB0aGUgZGlyZWN0aXZlL3BpcGUgdW5kZXIgY29uc2lkZXJhdGlvbiBpcyByZS1leHBvcnRlZCBmcm9tIGFub3RoZXJcbiAgICogTmdNb2R1bGUgKGFzIG9wcG9zZWQgdG8gYmVpbmcgZGVjbGFyZWQgYnkgaXQgZGlyZWN0bHkpLlxuICAgKi9cbiAgbWF5YmVBbGlhc1N5bWJvbEFzKFxuICAgICAgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsIG5nTW9kdWxlTmFtZTogc3RyaW5nLFxuICAgICAgaXNSZUV4cG9ydDogYm9vbGVhbik6IHN0cmluZ3xudWxsO1xuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgYW4gYEV4cHJlc3Npb25gIGJ5IHdoaWNoIGBkZWNsYCBzaG91bGQgYmUgaW1wb3J0ZWQgZnJvbSBgdmlhYCB1c2luZyBhbiBhbGlhcyBleHBvcnRcbiAgICogKHdoaWNoIHNob3VsZCBoYXZlIGJlZW4gcHJldmlvdXNseSBjcmVhdGVkIHdoZW4gY29tcGlsaW5nIGB2aWFgKS5cbiAgICpcbiAgICogYGdldEFsaWFzSW5gIGNhbiByZXR1cm4gYG51bGxgLCBpbiB3aGljaCBjYXNlIG5vIGFsaWFzIGlzIG5lZWRlZCB0byBpbXBvcnQgYGRlY2xgIGZyb20gYHZpYWBcbiAgICogKGFuZCB0aGUgbm9ybWFsIGltcG9ydCBydWxlcyBzaG91bGQgYmUgdXNlZCkuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZGlyZWN0aXZlL3BpcGUgd2hpY2ggaXMgYmVpbmcgaW1wb3J0ZWQsIGFuZCB3aGljaCBtaWdodCBiZVxuICAgKiBhbGlhc2VkLlxuICAgKiBAcGFyYW0gdmlhIHRoZSBgdHMuU291cmNlRmlsZWAgd2hpY2ggbWlnaHQgY29udGFpbiBhbiBhbGlhcyB0byB0aGVcbiAgICovXG4gIGdldEFsaWFzSW4oZGVjbDogQ2xhc3NEZWNsYXJhdGlvbiwgdmlhOiB0cy5Tb3VyY2VGaWxlLCBpc1JlRXhwb3J0OiBib29sZWFuKTogRXhwcmVzc2lvbnxudWxsO1xufVxuXG4vKipcbiAqIEFuIGBBbGlhc2luZ0hvc3RgIHdoaWNoIGdlbmVyYXRlcyBhbmQgY29uc3VtZXMgYWxpYXMgcmUtZXhwb3J0cyB3aGVuIG1vZHVsZSBuYW1lcyBmb3IgZWFjaCBmaWxlXG4gKiBhcmUgZGV0ZXJtaW5lZCBieSBhIGBGaWxlVG9Nb2R1bGVIb3N0YC5cbiAqXG4gKiBXaGVuIHVzaW5nIGEgYEZpbGVUb01vZHVsZUhvc3RgLCBhbGlhc2luZyBwcmV2ZW50cyBpc3N1ZXMgd2l0aCB0cmFuc2l0aXZlIGRlcGVuZGVuY2llcy4gU2VlIHRoZVxuICogUkVBRE1FLm1kIGZvciBtb3JlIGRldGFpbHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWxlVG9Nb2R1bGVBbGlhc2luZ0hvc3QgaW1wbGVtZW50cyBBbGlhc2luZ0hvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZpbGVUb01vZHVsZUhvc3Q6IEZpbGVUb01vZHVsZUhvc3QpIHt9XG5cbiAgLyoqXG4gICAqIFdpdGggYSBgRmlsZVRvTW9kdWxlSG9zdGAsIGFsaWFzZXMgYXJlIGNob3NlbiBhdXRvbWF0aWNhbGx5IHdpdGhvdXQgdGhlIG5lZWQgdG8gbG9vayB0aHJvdWdoXG4gICAqIHRoZSBleHBvcnRzIHByZXNlbnQgaW4gYSAuZC50cyBmaWxlLCBzbyB3ZSBjYW4gYXZvaWQgY2x1dHRlcmluZyB0aGUgLmQudHMgZmlsZXMuXG4gICAqL1xuICByZWFkb25seSBhbGlhc0V4cG9ydHNJbkR0cyA9IGZhbHNlO1xuXG4gIG1heWJlQWxpYXNTeW1ib2xBcyhcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCBuZ01vZHVsZU5hbWU6IHN0cmluZyxcbiAgICAgIGlzUmVFeHBvcnQ6IGJvb2xlYW4pOiBzdHJpbmd8bnVsbCB7XG4gICAgaWYgKCFpc1JlRXhwb3J0KSB7XG4gICAgICAvLyBBbGlhc2luZyBpcyB1c2VkIHdpdGggYSBGaWxlVG9Nb2R1bGVIb3N0IHRvIHByZXZlbnQgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMuIFRodXMsIGFsaWFzZXNcbiAgICAgIC8vIG9ubHkgbmVlZCB0byBiZSBjcmVhdGVkIGZvciBkaXJlY3RpdmVzL3BpcGVzIHdoaWNoIGFyZSBub3QgZGlyZWN0IGRlY2xhcmF0aW9ucyBvZiBhblxuICAgICAgLy8gTmdNb2R1bGUgd2hpY2ggZXhwb3J0cyB0aGVtLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmFsaWFzTmFtZShyZWYubm9kZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGVzIGFuIGBFeHByZXNzaW9uYCB0byBpbXBvcnQgYGRlY2xgIGZyb20gYHZpYWAsIGFzc3VtaW5nIGFuIGV4cG9ydCB3YXMgYWRkZWQgd2hlbiBgdmlhYFxuICAgKiB3YXMgY29tcGlsZWQgcGVyIGBtYXliZUFsaWFzU3ltYm9sQXNgIGFib3ZlLlxuICAgKi9cbiAgZ2V0QWxpYXNJbihkZWNsOiBDbGFzc0RlY2xhcmF0aW9uLCB2aWE6IHRzLlNvdXJjZUZpbGUsIGlzUmVFeHBvcnQ6IGJvb2xlYW4pOiBFeHByZXNzaW9ufG51bGwge1xuICAgIGlmICghaXNSZUV4cG9ydCkge1xuICAgICAgLy8gRGlyZWN0bHkgZXhwb3J0ZWQgZGlyZWN0aXZlcy9waXBlcyBkb24ndCByZXF1aXJlIGFuIGFsaWFzLCBwZXIgdGhlIGxvZ2ljIGluXG4gICAgICAvLyBgbWF5YmVBbGlhc1N5bWJvbEFzYC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICAvLyB2aWFNb2R1bGUgaXMgdGhlIG1vZHVsZSBpdCdsbCBhY3R1YWxseSBiZSBpbXBvcnRlZCBmcm9tLlxuICAgIGNvbnN0IG1vZHVsZU5hbWUgPSB0aGlzLmZpbGVUb01vZHVsZUhvc3QuZmlsZU5hbWVUb01vZHVsZU5hbWUodmlhLmZpbGVOYW1lLCB2aWEuZmlsZU5hbWUpO1xuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxFeHByKHttb2R1bGVOYW1lLCBuYW1lOiB0aGlzLmFsaWFzTmFtZShkZWNsLCB2aWEpfSk7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGVzIGFuIGFsaWFzIG5hbWUgYmFzZWQgb24gdGhlIGZ1bGwgbW9kdWxlIG5hbWUgb2YgdGhlIGZpbGUgd2hpY2ggZGVjbGFyZXMgdGhlIGFsaWFzZWRcbiAgICogZGlyZWN0aXZlL3BpcGUuXG4gICAqL1xuICBwcml2YXRlIGFsaWFzTmFtZShkZWNsOiBDbGFzc0RlY2xhcmF0aW9uLCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nIHtcbiAgICAvLyBUaGUgZGVjbGFyZWQgbW9kdWxlIGlzIHVzZWQgdG8gZ2V0IHRoZSBuYW1lIG9mIHRoZSBhbGlhcy5cbiAgICBjb25zdCBkZWNsTW9kdWxlID1cbiAgICAgICAgdGhpcy5maWxlVG9Nb2R1bGVIb3N0LmZpbGVOYW1lVG9Nb2R1bGVOYW1lKGRlY2wuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lLCBjb250ZXh0LmZpbGVOYW1lKTtcblxuICAgIGNvbnN0IHJlcGxhY2VkID0gZGVjbE1vZHVsZS5yZXBsYWNlKENIQVJTX1RPX0VTQ0FQRSwgJ18nKS5yZXBsYWNlKC9cXC8vZywgJyQnKTtcbiAgICByZXR1cm4gJ8m1bmckJyArIHJlcGxhY2VkICsgJyQkJyArIGRlY2wubmFtZS50ZXh0O1xuICB9XG59XG5cbi8qKlxuICogQW4gYEFsaWFzaW5nSG9zdGAgd2hpY2ggZXhwb3J0cyBkaXJlY3RpdmVzIGZyb20gYW55IGZpbGUgY29udGFpbmluZyBhbiBOZ01vZHVsZSBpbiB3aGljaCB0aGV5J3JlXG4gKiBkZWNsYXJlZC9leHBvcnRlZCwgdW5kZXIgYSBwcml2YXRlIHN5bWJvbCBuYW1lLlxuICpcbiAqIFRoZXNlIGV4cG9ydHMgc3VwcG9ydCBjYXNlcyB3aGVyZSBhbiBOZ01vZHVsZSBpcyBpbXBvcnRlZCBkZWVwbHkgZnJvbSBhbiBhYnNvbHV0ZSBtb2R1bGUgcGF0aFxuICogKHRoYXQgaXMsIGl0J3Mgbm90IHBhcnQgb2YgYW4gQW5ndWxhciBQYWNrYWdlIEZvcm1hdCBlbnRyeXBvaW50KSwgYW5kIHRoZSBjb21waWxlciBuZWVkcyB0b1xuICogaW1wb3J0IGFueSBtYXRjaGVkIGRpcmVjdGl2ZXMvcGlwZXMgZnJvbSB0aGUgc2FtZSBwYXRoICh0byB0aGUgTmdNb2R1bGUgZmlsZSkuIFNlZSBSRUFETUUubWQgZm9yXG4gKiBtb3JlIGRldGFpbHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0IGltcGxlbWVudHMgQWxpYXNpbmdIb3N0IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBob3N0OiBSZWZsZWN0aW9uSG9zdCkge31cblxuICAvKipcbiAgICogVW5kZXIgcHJpdmF0ZSBleHBvcnQgYWxpYXNpbmcsIHRoZSBgQWJzb2x1dGVNb2R1bGVTdHJhdGVneWAgdXNlZCBmb3IgZW1pdHRpbmcgcmVmZXJlbmNlcyB3aWxsXG4gICAqIHdpbGwgc2VsZWN0IGFsaWFzZWQgZXhwb3J0cyB0aGF0IGl0IGZpbmRzIGluIHRoZSAuZC50cyBmaWxlIGZvciBhbiBOZ01vZHVsZSdzIGZpbGUuIFRodXMsXG4gICAqIGVtaXR0aW5nIHRoZXNlIGV4cG9ydHMgaW4gLmQudHMgaXMgYSByZXF1aXJlbWVudCBmb3IgdGhlIGBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0YCB0b1xuICAgKiBmdW5jdGlvbiBjb3JyZWN0bHkuXG4gICAqL1xuICByZWFkb25seSBhbGlhc0V4cG9ydHNJbkR0cyA9IHRydWU7XG5cbiAgbWF5YmVBbGlhc1N5bWJvbEFzKFxuICAgICAgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsIG5nTW9kdWxlTmFtZTogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICAgIGlmIChyZWYuaGFzT3duaW5nTW9kdWxlR3Vlc3MpIHtcbiAgICAgIC8vIFNraXAgbm9kZXMgdGhhdCBhbHJlYWR5IGhhdmUgYW4gYXNzb2NpYXRlZCBhYnNvbHV0ZSBtb2R1bGUgc3BlY2lmaWVyLCBzaW5jZSB0aGV5IGNhbiBiZVxuICAgICAgLy8gc2FmZWx5IGltcG9ydGVkIGZyb20gdGhhdCBzcGVjaWZpZXIuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgLy8gTG9vayBmb3IgYSB1c2VyLXByb3ZpZGVkIGV4cG9ydCBvZiBgZGVjbGAgaW4gYGNvbnRleHRgLiBJZiBvbmUgZXhpc3RzLCB0aGVuIGFuIGFsaWFzIGV4cG9ydFxuICAgIC8vIGlzIG5vdCBuZWVkZWQuXG4gICAgLy8gVE9ETyhhbHhodWIpOiBtYXliZSBhZGQgYSBob3N0IG1ldGhvZCB0byBjaGVjayBmb3IgdGhlIGV4aXN0ZW5jZSBvZiBhbiBleHBvcnQgd2l0aG91dCBnb2luZ1xuICAgIC8vIHRocm91Z2ggdGhlIGVudGlyZSBsaXN0IG9mIGV4cG9ydHMuXG4gICAgY29uc3QgZXhwb3J0cyA9IHRoaXMuaG9zdC5nZXRFeHBvcnRzT2ZNb2R1bGUoY29udGV4dCk7XG4gICAgaWYgKGV4cG9ydHMgPT09IG51bGwpIHtcbiAgICAgIC8vIFNvbWV0aGluZyB3ZW50IHdyb25nLCBhbmQgbm8gZXhwb3J0cyB3ZXJlIGF2YWlsYWJsZSBhdCBhbGwuIEJhaWwgcmF0aGVyIHRoYW4gcmlzayBjcmVhdGluZ1xuICAgICAgLy8gcmUtZXhwb3J0cyB3aGVuIHRoZXkncmUgbm90IG5lZWRlZC5cbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGRldGVybWluZSB0aGUgZXhwb3J0cyBvZjogJHtjb250ZXh0LmZpbGVOYW1lfWApO1xuICAgIH1cbiAgICBsZXQgZm91bmQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBleHBvcnRzLmZvckVhY2godmFsdWUgPT4ge1xuICAgICAgaWYgKHZhbHVlLm5vZGUgPT09IHJlZi5ub2RlKSB7XG4gICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoZm91bmQpIHtcbiAgICAgIC8vIFRoZSBtb2R1bGUgZXhwb3J0cyB0aGUgZGVjbGFyZWQgY2xhc3MgZGlyZWN0bHksIG5vIGFsaWFzIGlzIG5lY2Vzc2FyeS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gYMm1bmdFeHBvcnTJtSR7bmdNb2R1bGVOYW1lfcm1JHtyZWYubm9kZS5uYW1lLnRleHR9YDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIGBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0YCBvbmx5IGdlbmVyYXRlcyByZS1leHBvcnRzIGFuZCBkb2VzIG5vdCBkaXJlY3QgdGhlIGNvbXBpbGVyIHRvXG4gICAqIGRpcmVjdGx5IGNvbnN1bWUgdGhlIGFsaWFzZXMgaXQgY3JlYXRlcy5cbiAgICpcbiAgICogSW5zdGVhZCwgdGhleSdyZSBjb25zdW1lZCBpbmRpcmVjdGx5OiBgQWJzb2x1dGVNb2R1bGVTdHJhdGVneWAgYFJlZmVyZW5jZUVtaXR0ZXJTdHJhdGVneWAgd2lsbFxuICAgKiBzZWxlY3QgdGhlc2UgYWxpYXMgZXhwb3J0cyBhdXRvbWF0aWNhbGx5IHdoZW4gbG9va2luZyBmb3IgYW4gZXhwb3J0IG9mIHRoZSBkaXJlY3RpdmUvcGlwZSBmcm9tXG4gICAqIHRoZSBzYW1lIHBhdGggYXMgdGhlIE5nTW9kdWxlIHdhcyBpbXBvcnRlZC5cbiAgICpcbiAgICogVGh1cywgYGdldEFsaWFzSW5gIGFsd2F5cyByZXR1cm5zIGBudWxsYC5cbiAgICovXG4gIGdldEFsaWFzSW4oKTogbnVsbCB7IHJldHVybiBudWxsOyB9XG59XG5cbi8qKlxuICogQSBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCB3aGljaCB3aWxsIGNvbnN1bWUgdGhlIGFsaWFzIGF0dGFjaGVkIHRvIGEgcGFydGljdWxhciBgUmVmZXJlbmNlYCB0byBhXG4gKiBkaXJlY3RpdmUgb3IgcGlwZSwgaWYgaXQgZXhpc3RzLlxuICovXG5leHBvcnQgY2xhc3MgQWxpYXNTdHJhdGVneSBpbXBsZW1lbnRzIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIGVtaXQocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsIGltcG9ydE1vZGU6IEltcG9ydEZsYWdzKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoaW1wb3J0TW9kZSAmIEltcG9ydEZsYWdzLk5vQWxpYXNpbmcpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiByZWYuYWxpYXM7XG4gIH1cbn1cbiJdfQ==