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
    exports.AliasStrategy = exports.PrivateExportAliasingHost = exports.UnifiedModulesAliasingHost = void 0;
    var compiler_1 = require("@angular/compiler");
    var emitter_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/emitter");
    // Escape anything that isn't alphanumeric, '/' or '_'.
    var CHARS_TO_ESCAPE = /[^a-zA-Z0-9/_]/g;
    /**
     * An `AliasingHost` which generates and consumes alias re-exports when module names for each file
     * are determined by a `UnifiedModulesHost`.
     *
     * When using a `UnifiedModulesHost`, aliasing prevents issues with transitive dependencies. See the
     * README.md for more details.
     */
    var UnifiedModulesAliasingHost = /** @class */ (function () {
        function UnifiedModulesAliasingHost(unifiedModulesHost) {
            this.unifiedModulesHost = unifiedModulesHost;
            /**
             * With a `UnifiedModulesHost`, aliases are chosen automatically without the need to look through
             * the exports present in a .d.ts file, so we can avoid cluttering the .d.ts files.
             */
            this.aliasExportsInDts = false;
        }
        UnifiedModulesAliasingHost.prototype.maybeAliasSymbolAs = function (ref, context, ngModuleName, isReExport) {
            if (!isReExport) {
                // Aliasing is used with a UnifiedModulesHost to prevent transitive dependencies. Thus,
                // aliases
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
        UnifiedModulesAliasingHost.prototype.getAliasIn = function (decl, via, isReExport) {
            if (!isReExport) {
                // Directly exported directives/pipes don't require an alias, per the logic in
                // `maybeAliasSymbolAs`.
                return null;
            }
            // viaModule is the module it'll actually be imported from.
            var moduleName = this.unifiedModulesHost.fileNameToModuleName(via.fileName, via.fileName);
            return new compiler_1.ExternalExpr({ moduleName: moduleName, name: this.aliasName(decl, via) });
        };
        /**
         * Generates an alias name based on the full module name of the file which declares the aliased
         * directive/pipe.
         */
        UnifiedModulesAliasingHost.prototype.aliasName = function (decl, context) {
            // The declared module is used to get the name of the alias.
            var declModule = this.unifiedModulesHost.fileNameToModuleName(decl.getSourceFile().fileName, context.fileName);
            var replaced = declModule.replace(CHARS_TO_ESCAPE, '_').replace(/\//g, '$');
            return 'ɵng$' + replaced + '$$' + decl.name.text;
        };
        return UnifiedModulesAliasingHost;
    }());
    exports.UnifiedModulesAliasingHost = UnifiedModulesAliasingHost;
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
        PrivateExportAliasingHost.prototype.getAliasIn = function () {
            return null;
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxpYXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvc3JjL2FsaWFzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUEyRDtJQU0zRCwrRUFBNkQ7SUFLN0QsdURBQXVEO0lBQ3ZELElBQU0sZUFBZSxHQUFHLGlCQUFpQixDQUFDO0lBbUUxQzs7Ozs7O09BTUc7SUFDSDtRQUNFLG9DQUFvQixrQkFBc0M7WUFBdEMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtZQUUxRDs7O2VBR0c7WUFDTSxzQkFBaUIsR0FBRyxLQUFLLENBQUM7UUFOMEIsQ0FBQztRQVE5RCx1REFBa0IsR0FBbEIsVUFDSSxHQUFnQyxFQUFFLE9BQXNCLEVBQUUsWUFBb0IsRUFDOUUsVUFBbUI7WUFDckIsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDZix1RkFBdUY7Z0JBQ3ZGLFVBQVU7Z0JBQ1YsdUZBQXVGO2dCQUN2RiwrQkFBK0I7Z0JBQy9CLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQ7OztXQUdHO1FBQ0gsK0NBQVUsR0FBVixVQUFXLElBQXNCLEVBQUUsR0FBa0IsRUFBRSxVQUFtQjtZQUN4RSxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLDhFQUE4RTtnQkFDOUUsd0JBQXdCO2dCQUN4QixPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsMkRBQTJEO1lBQzNELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM1RixPQUFPLElBQUksdUJBQVksQ0FBQyxFQUFDLFVBQVUsWUFBQSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBQyxDQUFDLENBQUM7UUFDekUsQ0FBQztRQUVEOzs7V0FHRztRQUNLLDhDQUFTLEdBQWpCLFVBQWtCLElBQXNCLEVBQUUsT0FBc0I7WUFDOUQsNERBQTREO1lBQzVELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsQ0FDM0QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFckQsSUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM5RSxPQUFPLE1BQU0sR0FBRyxRQUFRLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ25ELENBQUM7UUFDSCxpQ0FBQztJQUFELENBQUMsQUFqREQsSUFpREM7SUFqRFksZ0VBQTBCO0lBbUR2Qzs7Ozs7Ozs7T0FRRztJQUNIO1FBQ0UsbUNBQW9CLElBQW9CO1lBQXBCLFNBQUksR0FBSixJQUFJLENBQWdCO1lBRXhDOzs7OztlQUtHO1lBQ00sc0JBQWlCLEdBQUcsSUFBSSxDQUFDO1FBUlMsQ0FBQztRQVU1QyxzREFBa0IsR0FBbEIsVUFDSSxHQUFnQyxFQUFFLE9BQXNCLEVBQUUsWUFBb0I7WUFDaEYsSUFBSSxHQUFHLENBQUMsb0JBQW9CLEVBQUU7Z0JBQzVCLDBGQUEwRjtnQkFDMUYsdUNBQXVDO2dCQUN2QyxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsOEZBQThGO1lBQzlGLGlCQUFpQjtZQUNqQiw4RkFBOEY7WUFDOUYsc0NBQXNDO1lBQ3RDLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEQsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO2dCQUNwQiw2RkFBNkY7Z0JBQzdGLHNDQUFzQztnQkFDdEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBdUMsT0FBTyxDQUFDLFFBQVUsQ0FBQyxDQUFDO2FBQzVFO1lBQ0QsSUFBSSxLQUFLLEdBQVksS0FBSyxDQUFDO1lBQzNCLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBQSxLQUFLO2dCQUNuQixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksRUFBRTtvQkFDM0IsS0FBSyxHQUFHLElBQUksQ0FBQztpQkFDZDtZQUNILENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxLQUFLLEVBQUU7Z0JBQ1QseUVBQXlFO2dCQUN6RSxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyx5QkFBYSxZQUFZLGNBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBTSxDQUFDO1FBQzNELENBQUM7UUFFRDs7Ozs7Ozs7O1dBU0c7UUFDSCw4Q0FBVSxHQUFWO1lBQ0UsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0gsZ0NBQUM7SUFBRCxDQUFDLEFBdERELElBc0RDO0lBdERZLDhEQUF5QjtJQXdEdEM7OztPQUdHO0lBQ0g7UUFBQTtRQVFBLENBQUM7UUFQQyw0QkFBSSxHQUFKLFVBQUssR0FBdUIsRUFBRSxPQUFzQixFQUFFLFVBQXVCO1lBQzNFLElBQUksVUFBVSxHQUFHLHFCQUFXLENBQUMsVUFBVSxFQUFFO2dCQUN2QyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBQ25CLENBQUM7UUFDSCxvQkFBQztJQUFELENBQUMsQUFSRCxJQVFDO0lBUlksc0NBQWEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtVbmlmaWVkTW9kdWxlc0hvc3R9IGZyb20gJy4uLy4uL2NvcmUvYXBpJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHtJbXBvcnRGbGFncywgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5fSBmcm9tICcuL2VtaXR0ZXInO1xuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4vcmVmZXJlbmNlcyc7XG5cblxuXG4vLyBFc2NhcGUgYW55dGhpbmcgdGhhdCBpc24ndCBhbHBoYW51bWVyaWMsICcvJyBvciAnXycuXG5jb25zdCBDSEFSU19UT19FU0NBUEUgPSAvW15hLXpBLVowLTkvX10vZztcblxuLyoqXG4gKiBBIGhvc3QgZm9yIHRoZSBhbGlhc2luZyBzeXN0ZW0sIHdoaWNoIGFsbG93cyBmb3IgYWx0ZXJuYXRpdmUgZXhwb3J0cy9pbXBvcnRzIG9mIGRpcmVjdGl2ZXMvcGlwZXMuXG4gKlxuICogR2l2ZW4gYW4gaW1wb3J0IG9mIGFuIE5nTW9kdWxlIChlLmcuIGBDb21tb25Nb2R1bGVgKSwgdGhlIGNvbXBpbGVyIG11c3QgZ2VuZXJhdGUgaW1wb3J0cyB0byB0aGVcbiAqIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIGV4cG9ydGVkIGJ5IHRoaXMgbW9kdWxlIChlLmcuIGBOZ0lmYCkgd2hlbiB0aGV5J3JlIHVzZWQgaW4gYSBwYXJ0aWN1bGFyXG4gKiB0ZW1wbGF0ZS4gSW4gaXRzIGRlZmF1bHQgY29uZmlndXJhdGlvbiwgaWYgdGhlIGNvbXBpbGVyIGlzIG5vdCBkaXJlY3RseSBhYmxlIHRvIGltcG9ydCB0aGVcbiAqIGNvbXBvbmVudCBmcm9tIGFub3RoZXIgZmlsZSB3aXRoaW4gdGhlIHNhbWUgcHJvamVjdCwgaXQgd2lsbCBhdHRlbXB0IHRvIGltcG9ydCB0aGUgY29tcG9uZW50XG4gKiBmcm9tIHRoZSBzYW1lIChhYnNvbHV0ZSkgcGF0aCBieSB3aGljaCB0aGUgbW9kdWxlIHdhcyBpbXBvcnRlZC4gU28gaW4gdGhlIGFib3ZlIGV4YW1wbGUgaWZcbiAqIGBDb21tb25Nb2R1bGVgIHdhcyBpbXBvcnRlZCBmcm9tICdAYW5ndWxhci9jb21tb24nLCB0aGUgY29tcGlsZXIgd2lsbCBhdHRlbXB0IHRvIGltcG9ydCBgTmdJZmBcbiAqIGZyb20gJ0Bhbmd1bGFyL2NvbW1vbicgYXMgd2VsbC5cbiAqXG4gKiBUaGUgYWxpYXNpbmcgc3lzdGVtIGludGVyYWN0cyB3aXRoIHRoZSBhYm92ZSBsb2dpYyBpbiB0d28gZGlzdGluY3Qgd2F5cy5cbiAqXG4gKiAxKSBJdCBjYW4gYmUgdXNlZCB0byBjcmVhdGUgXCJhbGlhc1wiIHJlLWV4cG9ydHMgZnJvbSBkaWZmZXJlbnQgZmlsZXMsIHdoaWNoIGNhbiBiZSB1c2VkIHdoZW4gdGhlXG4gKiAgICB1c2VyIGhhc24ndCBleHBvcnRlZCB0aGUgZGlyZWN0aXZlKHMpIGZyb20gdGhlIEVTIG1vZHVsZSBjb250YWluaW5nIHRoZSBOZ01vZHVsZS4gVGhlc2UgcmUtXG4gKiAgICBleHBvcnRzIGNhbiBhbHNvIGJlIGhlbHBmdWwgd2hlbiB1c2luZyBhIGBVbmlmaWVkTW9kdWxlc0hvc3RgLCB3aGljaCBvdmVycmlkZXMgdGhlIGltcG9ydFxuICogICAgbG9naWMgZGVzY3JpYmVkIGFib3ZlLlxuICpcbiAqIDIpIEl0IGNhbiBiZSB1c2VkIHRvIGdldCBhbiBhbHRlcm5hdGl2ZSBpbXBvcnQgZXhwcmVzc2lvbiBmb3IgYSBkaXJlY3RpdmUgb3IgcGlwZSwgaW5zdGVhZCBvZlxuICogICAgdGhlIGltcG9ydCB0aGF0IHRoZSBub3JtYWwgbG9naWMgd291bGQgYXBwbHkuIFRoZSBhbGlhcyB1c2VkIGRlcGVuZHMgb24gdGhlIHByb3ZlbmFuY2Ugb2YgdGhlXG4gKiAgICBgUmVmZXJlbmNlYCB3aGljaCB3YXMgb2J0YWluZWQgZm9yIHRoZSBkaXJlY3RpdmUvcGlwZSwgd2hpY2ggaXMgdXN1YWxseSBhIHByb3BlcnR5IG9mIGhvdyBpdFxuICogICAgY2FtZSB0byBiZSBpbiBhIHRlbXBsYXRlJ3Mgc2NvcGUgKGUuZy4gYnkgd2hpY2ggTmdNb2R1bGUpLlxuICpcbiAqIFNlZSB0aGUgUkVBRE1FLm1kIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIGhvdyBhbGlhc2luZyB3b3JrcyB3aXRoaW4gdGhlIGNvbXBpbGVyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFsaWFzaW5nSG9zdCB7XG4gIC8qKlxuICAgKiBDb250cm9scyB3aGV0aGVyIGFueSBhbGlhcyByZS1leHBvcnRzIGFyZSByZW5kZXJlZCBpbnRvIC5kLnRzIGZpbGVzLlxuICAgKlxuICAgKiBUaGlzIGlzIG5vdCBhbHdheXMgbmVjZXNzYXJ5IGZvciBhbGlhc2luZyB0byBmdW5jdGlvbiBjb3JyZWN0bHksIHNvIHRoaXMgZmxhZyBhbGxvd3MgYW5cbiAgICogYEFsaWFzaW5nSG9zdGAgdG8gYXZvaWQgY2x1dHRlcmluZyB0aGUgLmQudHMgZmlsZXMgaWYgZXhwb3J0cyBhcmUgbm90IHN0cmljdGx5IG5lZWRlZC5cbiAgICovXG4gIHJlYWRvbmx5IGFsaWFzRXhwb3J0c0luRHRzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgYSBuYW1lIGJ5IHdoaWNoIGBkZWNsYCBzaG91bGQgYmUgcmUtZXhwb3J0ZWQgZnJvbSBgY29udGV4dGAsIGRlcGVuZGluZyBvbiB0aGVcbiAgICogcGFydGljdWxhciBzZXQgb2YgYWxpYXNpbmcgcnVsZXMgaW4gcGxhY2UuXG4gICAqXG4gICAqIGBtYXliZUFsaWFzU3ltYm9sQXNgIGNhbiByZXR1cm4gYG51bGxgLCBpbiB3aGljaCBjYXNlIG5vIGFsaWFzIGV4cG9ydCBzaG91bGQgYmUgZ2VuZXJhdGVkLlxuICAgKlxuICAgKiBAcGFyYW0gcmVmIGEgYFJlZmVyZW5jZWAgdG8gdGhlIGRpcmVjdGl2ZS9waXBlIHRvIGNvbnNpZGVyIGZvciBhbGlhc2luZy5cbiAgICogQHBhcmFtIGNvbnRleHQgdGhlIGB0cy5Tb3VyY2VGaWxlYCBpbiB3aGljaCB0aGUgYWxpYXMgcmUtZXhwb3J0IG1pZ2h0IG5lZWQgdG8gYmUgZ2VuZXJhdGVkLlxuICAgKiBAcGFyYW0gbmdNb2R1bGVOYW1lIHRoZSBkZWNsYXJlZCBuYW1lIG9mIHRoZSBgTmdNb2R1bGVgIHdpdGhpbiBgY29udGV4dGAgZm9yIHdoaWNoIHRoZSBhbGlhc1xuICAgKiB3b3VsZCBiZSBnZW5lcmF0ZWQuXG4gICAqIEBwYXJhbSBpc1JlRXhwb3J0IHdoZXRoZXIgdGhlIGRpcmVjdGl2ZS9waXBlIHVuZGVyIGNvbnNpZGVyYXRpb24gaXMgcmUtZXhwb3J0ZWQgZnJvbSBhbm90aGVyXG4gICAqIE5nTW9kdWxlIChhcyBvcHBvc2VkIHRvIGJlaW5nIGRlY2xhcmVkIGJ5IGl0IGRpcmVjdGx5KS5cbiAgICovXG4gIG1heWJlQWxpYXNTeW1ib2xBcyhcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCBuZ01vZHVsZU5hbWU6IHN0cmluZyxcbiAgICAgIGlzUmVFeHBvcnQ6IGJvb2xlYW4pOiBzdHJpbmd8bnVsbDtcblxuICAvKipcbiAgICogRGV0ZXJtaW5lIGFuIGBFeHByZXNzaW9uYCBieSB3aGljaCBgZGVjbGAgc2hvdWxkIGJlIGltcG9ydGVkIGZyb20gYHZpYWAgdXNpbmcgYW4gYWxpYXMgZXhwb3J0XG4gICAqICh3aGljaCBzaG91bGQgaGF2ZSBiZWVuIHByZXZpb3VzbHkgY3JlYXRlZCB3aGVuIGNvbXBpbGluZyBgdmlhYCkuXG4gICAqXG4gICAqIGBnZXRBbGlhc0luYCBjYW4gcmV0dXJuIGBudWxsYCwgaW4gd2hpY2ggY2FzZSBubyBhbGlhcyBpcyBuZWVkZWQgdG8gaW1wb3J0IGBkZWNsYCBmcm9tIGB2aWFgXG4gICAqIChhbmQgdGhlIG5vcm1hbCBpbXBvcnQgcnVsZXMgc2hvdWxkIGJlIHVzZWQpLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbCB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGRpcmVjdGl2ZS9waXBlIHdoaWNoIGlzIGJlaW5nIGltcG9ydGVkLCBhbmQgd2hpY2ggbWlnaHQgYmVcbiAgICogYWxpYXNlZC5cbiAgICogQHBhcmFtIHZpYSB0aGUgYHRzLlNvdXJjZUZpbGVgIHdoaWNoIG1pZ2h0IGNvbnRhaW4gYW4gYWxpYXMgdG8gdGhlXG4gICAqL1xuICBnZXRBbGlhc0luKGRlY2w6IENsYXNzRGVjbGFyYXRpb24sIHZpYTogdHMuU291cmNlRmlsZSwgaXNSZUV4cG9ydDogYm9vbGVhbik6IEV4cHJlc3Npb258bnVsbDtcbn1cblxuLyoqXG4gKiBBbiBgQWxpYXNpbmdIb3N0YCB3aGljaCBnZW5lcmF0ZXMgYW5kIGNvbnN1bWVzIGFsaWFzIHJlLWV4cG9ydHMgd2hlbiBtb2R1bGUgbmFtZXMgZm9yIGVhY2ggZmlsZVxuICogYXJlIGRldGVybWluZWQgYnkgYSBgVW5pZmllZE1vZHVsZXNIb3N0YC5cbiAqXG4gKiBXaGVuIHVzaW5nIGEgYFVuaWZpZWRNb2R1bGVzSG9zdGAsIGFsaWFzaW5nIHByZXZlbnRzIGlzc3VlcyB3aXRoIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzLiBTZWUgdGhlXG4gKiBSRUFETUUubWQgZm9yIG1vcmUgZGV0YWlscy5cbiAqL1xuZXhwb3J0IGNsYXNzIFVuaWZpZWRNb2R1bGVzQWxpYXNpbmdIb3N0IGltcGxlbWVudHMgQWxpYXNpbmdIb3N0IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSB1bmlmaWVkTW9kdWxlc0hvc3Q6IFVuaWZpZWRNb2R1bGVzSG9zdCkge31cblxuICAvKipcbiAgICogV2l0aCBhIGBVbmlmaWVkTW9kdWxlc0hvc3RgLCBhbGlhc2VzIGFyZSBjaG9zZW4gYXV0b21hdGljYWxseSB3aXRob3V0IHRoZSBuZWVkIHRvIGxvb2sgdGhyb3VnaFxuICAgKiB0aGUgZXhwb3J0cyBwcmVzZW50IGluIGEgLmQudHMgZmlsZSwgc28gd2UgY2FuIGF2b2lkIGNsdXR0ZXJpbmcgdGhlIC5kLnRzIGZpbGVzLlxuICAgKi9cbiAgcmVhZG9ubHkgYWxpYXNFeHBvcnRzSW5EdHMgPSBmYWxzZTtcblxuICBtYXliZUFsaWFzU3ltYm9sQXMoXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPiwgY29udGV4dDogdHMuU291cmNlRmlsZSwgbmdNb2R1bGVOYW1lOiBzdHJpbmcsXG4gICAgICBpc1JlRXhwb3J0OiBib29sZWFuKTogc3RyaW5nfG51bGwge1xuICAgIGlmICghaXNSZUV4cG9ydCkge1xuICAgICAgLy8gQWxpYXNpbmcgaXMgdXNlZCB3aXRoIGEgVW5pZmllZE1vZHVsZXNIb3N0IHRvIHByZXZlbnQgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMuIFRodXMsXG4gICAgICAvLyBhbGlhc2VzXG4gICAgICAvLyBvbmx5IG5lZWQgdG8gYmUgY3JlYXRlZCBmb3IgZGlyZWN0aXZlcy9waXBlcyB3aGljaCBhcmUgbm90IGRpcmVjdCBkZWNsYXJhdGlvbnMgb2YgYW5cbiAgICAgIC8vIE5nTW9kdWxlIHdoaWNoIGV4cG9ydHMgdGhlbS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hbGlhc05hbWUocmVmLm5vZGUsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlcyBhbiBgRXhwcmVzc2lvbmAgdG8gaW1wb3J0IGBkZWNsYCBmcm9tIGB2aWFgLCBhc3N1bWluZyBhbiBleHBvcnQgd2FzIGFkZGVkIHdoZW4gYHZpYWBcbiAgICogd2FzIGNvbXBpbGVkIHBlciBgbWF5YmVBbGlhc1N5bWJvbEFzYCBhYm92ZS5cbiAgICovXG4gIGdldEFsaWFzSW4oZGVjbDogQ2xhc3NEZWNsYXJhdGlvbiwgdmlhOiB0cy5Tb3VyY2VGaWxlLCBpc1JlRXhwb3J0OiBib29sZWFuKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoIWlzUmVFeHBvcnQpIHtcbiAgICAgIC8vIERpcmVjdGx5IGV4cG9ydGVkIGRpcmVjdGl2ZXMvcGlwZXMgZG9uJ3QgcmVxdWlyZSBhbiBhbGlhcywgcGVyIHRoZSBsb2dpYyBpblxuICAgICAgLy8gYG1heWJlQWxpYXNTeW1ib2xBc2AuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgLy8gdmlhTW9kdWxlIGlzIHRoZSBtb2R1bGUgaXQnbGwgYWN0dWFsbHkgYmUgaW1wb3J0ZWQgZnJvbS5cbiAgICBjb25zdCBtb2R1bGVOYW1lID0gdGhpcy51bmlmaWVkTW9kdWxlc0hvc3QuZmlsZU5hbWVUb01vZHVsZU5hbWUodmlhLmZpbGVOYW1lLCB2aWEuZmlsZU5hbWUpO1xuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxFeHByKHttb2R1bGVOYW1lLCBuYW1lOiB0aGlzLmFsaWFzTmFtZShkZWNsLCB2aWEpfSk7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGVzIGFuIGFsaWFzIG5hbWUgYmFzZWQgb24gdGhlIGZ1bGwgbW9kdWxlIG5hbWUgb2YgdGhlIGZpbGUgd2hpY2ggZGVjbGFyZXMgdGhlIGFsaWFzZWRcbiAgICogZGlyZWN0aXZlL3BpcGUuXG4gICAqL1xuICBwcml2YXRlIGFsaWFzTmFtZShkZWNsOiBDbGFzc0RlY2xhcmF0aW9uLCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nIHtcbiAgICAvLyBUaGUgZGVjbGFyZWQgbW9kdWxlIGlzIHVzZWQgdG8gZ2V0IHRoZSBuYW1lIG9mIHRoZSBhbGlhcy5cbiAgICBjb25zdCBkZWNsTW9kdWxlID0gdGhpcy51bmlmaWVkTW9kdWxlc0hvc3QuZmlsZU5hbWVUb01vZHVsZU5hbWUoXG4gICAgICAgIGRlY2wuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lLCBjb250ZXh0LmZpbGVOYW1lKTtcblxuICAgIGNvbnN0IHJlcGxhY2VkID0gZGVjbE1vZHVsZS5yZXBsYWNlKENIQVJTX1RPX0VTQ0FQRSwgJ18nKS5yZXBsYWNlKC9cXC8vZywgJyQnKTtcbiAgICByZXR1cm4gJ8m1bmckJyArIHJlcGxhY2VkICsgJyQkJyArIGRlY2wubmFtZS50ZXh0O1xuICB9XG59XG5cbi8qKlxuICogQW4gYEFsaWFzaW5nSG9zdGAgd2hpY2ggZXhwb3J0cyBkaXJlY3RpdmVzIGZyb20gYW55IGZpbGUgY29udGFpbmluZyBhbiBOZ01vZHVsZSBpbiB3aGljaCB0aGV5J3JlXG4gKiBkZWNsYXJlZC9leHBvcnRlZCwgdW5kZXIgYSBwcml2YXRlIHN5bWJvbCBuYW1lLlxuICpcbiAqIFRoZXNlIGV4cG9ydHMgc3VwcG9ydCBjYXNlcyB3aGVyZSBhbiBOZ01vZHVsZSBpcyBpbXBvcnRlZCBkZWVwbHkgZnJvbSBhbiBhYnNvbHV0ZSBtb2R1bGUgcGF0aFxuICogKHRoYXQgaXMsIGl0J3Mgbm90IHBhcnQgb2YgYW4gQW5ndWxhciBQYWNrYWdlIEZvcm1hdCBlbnRyeXBvaW50KSwgYW5kIHRoZSBjb21waWxlciBuZWVkcyB0b1xuICogaW1wb3J0IGFueSBtYXRjaGVkIGRpcmVjdGl2ZXMvcGlwZXMgZnJvbSB0aGUgc2FtZSBwYXRoICh0byB0aGUgTmdNb2R1bGUgZmlsZSkuIFNlZSBSRUFETUUubWQgZm9yXG4gKiBtb3JlIGRldGFpbHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0IGltcGxlbWVudHMgQWxpYXNpbmdIb3N0IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBob3N0OiBSZWZsZWN0aW9uSG9zdCkge31cblxuICAvKipcbiAgICogVW5kZXIgcHJpdmF0ZSBleHBvcnQgYWxpYXNpbmcsIHRoZSBgQWJzb2x1dGVNb2R1bGVTdHJhdGVneWAgdXNlZCBmb3IgZW1pdHRpbmcgcmVmZXJlbmNlcyB3aWxsXG4gICAqIHdpbGwgc2VsZWN0IGFsaWFzZWQgZXhwb3J0cyB0aGF0IGl0IGZpbmRzIGluIHRoZSAuZC50cyBmaWxlIGZvciBhbiBOZ01vZHVsZSdzIGZpbGUuIFRodXMsXG4gICAqIGVtaXR0aW5nIHRoZXNlIGV4cG9ydHMgaW4gLmQudHMgaXMgYSByZXF1aXJlbWVudCBmb3IgdGhlIGBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0YCB0b1xuICAgKiBmdW5jdGlvbiBjb3JyZWN0bHkuXG4gICAqL1xuICByZWFkb25seSBhbGlhc0V4cG9ydHNJbkR0cyA9IHRydWU7XG5cbiAgbWF5YmVBbGlhc1N5bWJvbEFzKFxuICAgICAgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsIG5nTW9kdWxlTmFtZTogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICAgIGlmIChyZWYuaGFzT3duaW5nTW9kdWxlR3Vlc3MpIHtcbiAgICAgIC8vIFNraXAgbm9kZXMgdGhhdCBhbHJlYWR5IGhhdmUgYW4gYXNzb2NpYXRlZCBhYnNvbHV0ZSBtb2R1bGUgc3BlY2lmaWVyLCBzaW5jZSB0aGV5IGNhbiBiZVxuICAgICAgLy8gc2FmZWx5IGltcG9ydGVkIGZyb20gdGhhdCBzcGVjaWZpZXIuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgLy8gTG9vayBmb3IgYSB1c2VyLXByb3ZpZGVkIGV4cG9ydCBvZiBgZGVjbGAgaW4gYGNvbnRleHRgLiBJZiBvbmUgZXhpc3RzLCB0aGVuIGFuIGFsaWFzIGV4cG9ydFxuICAgIC8vIGlzIG5vdCBuZWVkZWQuXG4gICAgLy8gVE9ETyhhbHhodWIpOiBtYXliZSBhZGQgYSBob3N0IG1ldGhvZCB0byBjaGVjayBmb3IgdGhlIGV4aXN0ZW5jZSBvZiBhbiBleHBvcnQgd2l0aG91dCBnb2luZ1xuICAgIC8vIHRocm91Z2ggdGhlIGVudGlyZSBsaXN0IG9mIGV4cG9ydHMuXG4gICAgY29uc3QgZXhwb3J0cyA9IHRoaXMuaG9zdC5nZXRFeHBvcnRzT2ZNb2R1bGUoY29udGV4dCk7XG4gICAgaWYgKGV4cG9ydHMgPT09IG51bGwpIHtcbiAgICAgIC8vIFNvbWV0aGluZyB3ZW50IHdyb25nLCBhbmQgbm8gZXhwb3J0cyB3ZXJlIGF2YWlsYWJsZSBhdCBhbGwuIEJhaWwgcmF0aGVyIHRoYW4gcmlzayBjcmVhdGluZ1xuICAgICAgLy8gcmUtZXhwb3J0cyB3aGVuIHRoZXkncmUgbm90IG5lZWRlZC5cbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGRldGVybWluZSB0aGUgZXhwb3J0cyBvZjogJHtjb250ZXh0LmZpbGVOYW1lfWApO1xuICAgIH1cbiAgICBsZXQgZm91bmQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBleHBvcnRzLmZvckVhY2godmFsdWUgPT4ge1xuICAgICAgaWYgKHZhbHVlLm5vZGUgPT09IHJlZi5ub2RlKSB7XG4gICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoZm91bmQpIHtcbiAgICAgIC8vIFRoZSBtb2R1bGUgZXhwb3J0cyB0aGUgZGVjbGFyZWQgY2xhc3MgZGlyZWN0bHksIG5vIGFsaWFzIGlzIG5lY2Vzc2FyeS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gYMm1bmdFeHBvcnTJtSR7bmdNb2R1bGVOYW1lfcm1JHtyZWYubm9kZS5uYW1lLnRleHR9YDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIGBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0YCBvbmx5IGdlbmVyYXRlcyByZS1leHBvcnRzIGFuZCBkb2VzIG5vdCBkaXJlY3QgdGhlIGNvbXBpbGVyIHRvXG4gICAqIGRpcmVjdGx5IGNvbnN1bWUgdGhlIGFsaWFzZXMgaXQgY3JlYXRlcy5cbiAgICpcbiAgICogSW5zdGVhZCwgdGhleSdyZSBjb25zdW1lZCBpbmRpcmVjdGx5OiBgQWJzb2x1dGVNb2R1bGVTdHJhdGVneWAgYFJlZmVyZW5jZUVtaXR0ZXJTdHJhdGVneWAgd2lsbFxuICAgKiBzZWxlY3QgdGhlc2UgYWxpYXMgZXhwb3J0cyBhdXRvbWF0aWNhbGx5IHdoZW4gbG9va2luZyBmb3IgYW4gZXhwb3J0IG9mIHRoZSBkaXJlY3RpdmUvcGlwZSBmcm9tXG4gICAqIHRoZSBzYW1lIHBhdGggYXMgdGhlIE5nTW9kdWxlIHdhcyBpbXBvcnRlZC5cbiAgICpcbiAgICogVGh1cywgYGdldEFsaWFzSW5gIGFsd2F5cyByZXR1cm5zIGBudWxsYC5cbiAgICovXG4gIGdldEFsaWFzSW4oKTogbnVsbCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIHdoaWNoIHdpbGwgY29uc3VtZSB0aGUgYWxpYXMgYXR0YWNoZWQgdG8gYSBwYXJ0aWN1bGFyIGBSZWZlcmVuY2VgIHRvIGFcbiAqIGRpcmVjdGl2ZSBvciBwaXBlLCBpZiBpdCBleGlzdHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBBbGlhc1N0cmF0ZWd5IGltcGxlbWVudHMgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5IHtcbiAgZW1pdChyZWY6IFJlZmVyZW5jZTx0cy5Ob2RlPiwgY29udGV4dDogdHMuU291cmNlRmlsZSwgaW1wb3J0TW9kZTogSW1wb3J0RmxhZ3MpOiBFeHByZXNzaW9ufG51bGwge1xuICAgIGlmIChpbXBvcnRNb2RlICYgSW1wb3J0RmxhZ3MuTm9BbGlhc2luZykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlZi5hbGlhcztcbiAgfVxufVxuIl19