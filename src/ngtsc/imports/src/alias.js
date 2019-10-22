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
        define("@angular/compiler-cli/src/ngtsc/imports/src/alias", ["require", "exports", "@angular/compiler"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
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
            return ref.alias;
        };
        return AliasStrategy;
    }());
    exports.AliasStrategy = AliasStrategy;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxpYXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvc3JjL2FsaWFzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTJEO0lBTzNELHVEQUF1RDtJQUN2RCxJQUFNLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQztJQW1FMUM7Ozs7OztPQU1HO0lBQ0g7UUFDRSxrQ0FBb0IsZ0JBQWtDO1lBQWxDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7WUFFdEQ7OztlQUdHO1lBQ00sc0JBQWlCLEdBQUcsS0FBSyxDQUFDO1FBTnNCLENBQUM7UUFRMUQscURBQWtCLEdBQWxCLFVBQ0ksR0FBZ0MsRUFBRSxPQUFzQixFQUFFLFlBQW9CLEVBQzlFLFVBQW1CO1lBQ3JCLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2YsNkZBQTZGO2dCQUM3Rix1RkFBdUY7Z0JBQ3ZGLCtCQUErQjtnQkFDL0IsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFFRDs7O1dBR0c7UUFDSCw2Q0FBVSxHQUFWLFVBQVcsSUFBc0IsRUFBRSxHQUFrQixFQUFFLFVBQW1CO1lBQ3hFLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2YsOEVBQThFO2dCQUM5RSx3QkFBd0I7Z0JBQ3hCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCwyREFBMkQ7WUFDM0QsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFGLE9BQU8sSUFBSSx1QkFBWSxDQUFDLEVBQUMsVUFBVSxZQUFBLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFDLENBQUMsQ0FBQztRQUN6RSxDQUFDO1FBRUQ7OztXQUdHO1FBQ0ssNENBQVMsR0FBakIsVUFBa0IsSUFBc0IsRUFBRSxPQUFzQjtZQUM5RCw0REFBNEQ7WUFDNUQsSUFBTSxVQUFVLEdBQ1osSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRWhHLElBQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDOUUsT0FBTyxNQUFNLEdBQUcsUUFBUSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztRQUNuRCxDQUFDO1FBQ0gsK0JBQUM7SUFBRCxDQUFDLEFBaERELElBZ0RDO0lBaERZLDREQUF3QjtJQWtEckM7Ozs7Ozs7O09BUUc7SUFDSDtRQUNFLG1DQUFvQixJQUFvQjtZQUFwQixTQUFJLEdBQUosSUFBSSxDQUFnQjtZQUV4Qzs7Ozs7ZUFLRztZQUNNLHNCQUFpQixHQUFHLElBQUksQ0FBQztRQVJTLENBQUM7UUFVNUMsc0RBQWtCLEdBQWxCLFVBQ0ksR0FBZ0MsRUFBRSxPQUFzQixFQUFFLFlBQW9CO1lBQ2hGLElBQUksR0FBRyxDQUFDLG9CQUFvQixFQUFFO2dCQUM1QiwwRkFBMEY7Z0JBQzFGLHVDQUF1QztnQkFDdkMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELDhGQUE4RjtZQUM5RixpQkFBaUI7WUFDakIsOEZBQThGO1lBQzlGLHNDQUFzQztZQUN0QyxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RELElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtnQkFDcEIsNkZBQTZGO2dCQUM3RixzQ0FBc0M7Z0JBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXVDLE9BQU8sQ0FBQyxRQUFVLENBQUMsQ0FBQzthQUM1RTtZQUNELElBQUksS0FBSyxHQUFZLEtBQUssQ0FBQztZQUMzQixPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSztnQkFDbkIsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEVBQUU7b0JBQzNCLEtBQUssR0FBRyxJQUFJLENBQUM7aUJBQ2Q7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksS0FBSyxFQUFFO2dCQUNULHlFQUF5RTtnQkFDekUsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8seUJBQWEsWUFBWSxjQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQU0sQ0FBQztRQUMzRCxDQUFDO1FBRUQ7Ozs7Ozs7OztXQVNHO1FBQ0gsOENBQVUsR0FBVixjQUFxQixPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckMsZ0NBQUM7SUFBRCxDQUFDLEFBcERELElBb0RDO0lBcERZLDhEQUF5QjtJQXNEdEM7OztPQUdHO0lBQ0g7UUFBQTtRQUlBLENBQUM7UUFIQyw0QkFBSSxHQUFKLFVBQUssR0FBdUIsRUFBRSxPQUFzQixFQUFFLFVBQXNCO1lBQzFFLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQztRQUNuQixDQUFDO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBSkQsSUFJQztJQUpZLHNDQUFhIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIEV4dGVybmFsRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgUmVmbGVjdGlvbkhvc3QsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7RmlsZVRvTW9kdWxlSG9zdCwgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5fSBmcm9tICcuL2VtaXR0ZXInO1xuaW1wb3J0IHtJbXBvcnRNb2RlLCBSZWZlcmVuY2V9IGZyb20gJy4vcmVmZXJlbmNlcyc7XG5cbi8vIEVzY2FwZSBhbnl0aGluZyB0aGF0IGlzbid0IGFscGhhbnVtZXJpYywgJy8nIG9yICdfJy5cbmNvbnN0IENIQVJTX1RPX0VTQ0FQRSA9IC9bXmEtekEtWjAtOS9fXS9nO1xuXG4vKipcbiAqIEEgaG9zdCBmb3IgdGhlIGFsaWFzaW5nIHN5c3RlbSwgd2hpY2ggYWxsb3dzIGZvciBhbHRlcm5hdGl2ZSBleHBvcnRzL2ltcG9ydHMgb2YgZGlyZWN0aXZlcy9waXBlcy5cbiAqXG4gKiBHaXZlbiBhbiBpbXBvcnQgb2YgYW4gTmdNb2R1bGUgKGUuZy4gYENvbW1vbk1vZHVsZWApLCB0aGUgY29tcGlsZXIgbXVzdCBnZW5lcmF0ZSBpbXBvcnRzIHRvIHRoZVxuICogZGlyZWN0aXZlcyBhbmQgcGlwZXMgZXhwb3J0ZWQgYnkgdGhpcyBtb2R1bGUgKGUuZy4gYE5nSWZgKSB3aGVuIHRoZXkncmUgdXNlZCBpbiBhIHBhcnRpY3VsYXJcbiAqIHRlbXBsYXRlLiBJbiBpdHMgZGVmYXVsdCBjb25maWd1cmF0aW9uLCBpZiB0aGUgY29tcGlsZXIgaXMgbm90IGRpcmVjdGx5IGFibGUgdG8gaW1wb3J0IHRoZVxuICogY29tcG9uZW50IGZyb20gYW5vdGhlciBmaWxlIHdpdGhpbiB0aGUgc2FtZSBwcm9qZWN0LCBpdCB3aWxsIGF0dGVtcHQgdG8gaW1wb3J0IHRoZSBjb21wb25lbnRcbiAqIGZyb20gdGhlIHNhbWUgKGFic29sdXRlKSBwYXRoIGJ5IHdoaWNoIHRoZSBtb2R1bGUgd2FzIGltcG9ydGVkLiBTbyBpbiB0aGUgYWJvdmUgZXhhbXBsZSBpZlxuICogYENvbW1vbk1vZHVsZWAgd2FzIGltcG9ydGVkIGZyb20gJ0Bhbmd1bGFyL2NvbW1vbicsIHRoZSBjb21waWxlciB3aWxsIGF0dGVtcHQgdG8gaW1wb3J0IGBOZ0lmYFxuICogZnJvbSAnQGFuZ3VsYXIvY29tbW9uJyBhcyB3ZWxsLlxuICpcbiAqIFRoZSBhbGlhc2luZyBzeXN0ZW0gaW50ZXJhY3RzIHdpdGggdGhlIGFib3ZlIGxvZ2ljIGluIHR3byBkaXN0aW5jdCB3YXlzLlxuICpcbiAqIDEpIEl0IGNhbiBiZSB1c2VkIHRvIGNyZWF0ZSBcImFsaWFzXCIgcmUtZXhwb3J0cyBmcm9tIGRpZmZlcmVudCBmaWxlcywgd2hpY2ggY2FuIGJlIHVzZWQgd2hlbiB0aGVcbiAqICAgIHVzZXIgaGFzbid0IGV4cG9ydGVkIHRoZSBkaXJlY3RpdmUocykgZnJvbSB0aGUgRVMgbW9kdWxlIGNvbnRhaW5pbmcgdGhlIE5nTW9kdWxlLiBUaGVzZSByZS1cbiAqICAgIGV4cG9ydHMgY2FuIGFsc28gYmUgaGVscGZ1bCB3aGVuIHVzaW5nIGEgYEZpbGVUb01vZHVsZUhvc3RgLCB3aGljaCBvdmVycmlkZXMgdGhlIGltcG9ydCBsb2dpY1xuICogICAgZGVzY3JpYmVkIGFib3ZlLlxuICpcbiAqIDIpIEl0IGNhbiBiZSB1c2VkIHRvIGdldCBhbiBhbHRlcm5hdGl2ZSBpbXBvcnQgZXhwcmVzc2lvbiBmb3IgYSBkaXJlY3RpdmUgb3IgcGlwZSwgaW5zdGVhZCBvZlxuICogICAgdGhlIGltcG9ydCB0aGF0IHRoZSBub3JtYWwgbG9naWMgd291bGQgYXBwbHkuIFRoZSBhbGlhcyB1c2VkIGRlcGVuZHMgb24gdGhlIHByb3ZlbmFuY2Ugb2YgdGhlXG4gKiAgICBgUmVmZXJlbmNlYCB3aGljaCB3YXMgb2J0YWluZWQgZm9yIHRoZSBkaXJlY3RpdmUvcGlwZSwgd2hpY2ggaXMgdXN1YWxseSBhIHByb3BlcnR5IG9mIGhvdyBpdFxuICogICAgY2FtZSB0byBiZSBpbiBhIHRlbXBsYXRlJ3Mgc2NvcGUgKGUuZy4gYnkgd2hpY2ggTmdNb2R1bGUpLlxuICpcbiAqIFNlZSB0aGUgUkVBRE1FLm1kIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIGhvdyBhbGlhc2luZyB3b3JrcyB3aXRoaW4gdGhlIGNvbXBpbGVyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFsaWFzaW5nSG9zdCB7XG4gIC8qKlxuICAgKiBDb250cm9scyB3aGV0aGVyIGFueSBhbGlhcyByZS1leHBvcnRzIGFyZSByZW5kZXJlZCBpbnRvIC5kLnRzIGZpbGVzLlxuICAgKlxuICAgKiBUaGlzIGlzIG5vdCBhbHdheXMgbmVjZXNzYXJ5IGZvciBhbGlhc2luZyB0byBmdW5jdGlvbiBjb3JyZWN0bHksIHNvIHRoaXMgZmxhZyBhbGxvd3MgYW5cbiAgICogYEFsaWFzaW5nSG9zdGAgdG8gYXZvaWQgY2x1dHRlcmluZyB0aGUgLmQudHMgZmlsZXMgaWYgZXhwb3J0cyBhcmUgbm90IHN0cmljdGx5IG5lZWRlZC5cbiAgICovXG4gIHJlYWRvbmx5IGFsaWFzRXhwb3J0c0luRHRzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgYSBuYW1lIGJ5IHdoaWNoIGBkZWNsYCBzaG91bGQgYmUgcmUtZXhwb3J0ZWQgZnJvbSBgY29udGV4dGAsIGRlcGVuZGluZyBvbiB0aGVcbiAgICogcGFydGljdWxhciBzZXQgb2YgYWxpYXNpbmcgcnVsZXMgaW4gcGxhY2UuXG4gICAqXG4gICAqIGBtYXliZUFsaWFzU3ltYm9sQXNgIGNhbiByZXR1cm4gYG51bGxgLCBpbiB3aGljaCBjYXNlIG5vIGFsaWFzIGV4cG9ydCBzaG91bGQgYmUgZ2VuZXJhdGVkLlxuICAgKlxuICAgKiBAcGFyYW0gcmVmIGEgYFJlZmVyZW5jZWAgdG8gdGhlIGRpcmVjdGl2ZS9waXBlIHRvIGNvbnNpZGVyIGZvciBhbGlhc2luZy5cbiAgICogQHBhcmFtIGNvbnRleHQgdGhlIGB0cy5Tb3VyY2VGaWxlYCBpbiB3aGljaCB0aGUgYWxpYXMgcmUtZXhwb3J0IG1pZ2h0IG5lZWQgdG8gYmUgZ2VuZXJhdGVkLlxuICAgKiBAcGFyYW0gbmdNb2R1bGVOYW1lIHRoZSBkZWNsYXJlZCBuYW1lIG9mIHRoZSBgTmdNb2R1bGVgIHdpdGhpbiBgY29udGV4dGAgZm9yIHdoaWNoIHRoZSBhbGlhc1xuICAgKiB3b3VsZCBiZSBnZW5lcmF0ZWQuXG4gICAqIEBwYXJhbSBpc1JlRXhwb3J0IHdoZXRoZXIgdGhlIGRpcmVjdGl2ZS9waXBlIHVuZGVyIGNvbnNpZGVyYXRpb24gaXMgcmUtZXhwb3J0ZWQgZnJvbSBhbm90aGVyXG4gICAqIE5nTW9kdWxlIChhcyBvcHBvc2VkIHRvIGJlaW5nIGRlY2xhcmVkIGJ5IGl0IGRpcmVjdGx5KS5cbiAgICovXG4gIG1heWJlQWxpYXNTeW1ib2xBcyhcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCBuZ01vZHVsZU5hbWU6IHN0cmluZyxcbiAgICAgIGlzUmVFeHBvcnQ6IGJvb2xlYW4pOiBzdHJpbmd8bnVsbDtcblxuICAvKipcbiAgICogRGV0ZXJtaW5lIGFuIGBFeHByZXNzaW9uYCBieSB3aGljaCBgZGVjbGAgc2hvdWxkIGJlIGltcG9ydGVkIGZyb20gYHZpYWAgdXNpbmcgYW4gYWxpYXMgZXhwb3J0XG4gICAqICh3aGljaCBzaG91bGQgaGF2ZSBiZWVuIHByZXZpb3VzbHkgY3JlYXRlZCB3aGVuIGNvbXBpbGluZyBgdmlhYCkuXG4gICAqXG4gICAqIGBnZXRBbGlhc0luYCBjYW4gcmV0dXJuIGBudWxsYCwgaW4gd2hpY2ggY2FzZSBubyBhbGlhcyBpcyBuZWVkZWQgdG8gaW1wb3J0IGBkZWNsYCBmcm9tIGB2aWFgXG4gICAqIChhbmQgdGhlIG5vcm1hbCBpbXBvcnQgcnVsZXMgc2hvdWxkIGJlIHVzZWQpLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbCB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGRpcmVjdGl2ZS9waXBlIHdoaWNoIGlzIGJlaW5nIGltcG9ydGVkLCBhbmQgd2hpY2ggbWlnaHQgYmVcbiAgICogYWxpYXNlZC5cbiAgICogQHBhcmFtIHZpYSB0aGUgYHRzLlNvdXJjZUZpbGVgIHdoaWNoIG1pZ2h0IGNvbnRhaW4gYW4gYWxpYXMgdG8gdGhlXG4gICAqL1xuICBnZXRBbGlhc0luKGRlY2w6IENsYXNzRGVjbGFyYXRpb24sIHZpYTogdHMuU291cmNlRmlsZSwgaXNSZUV4cG9ydDogYm9vbGVhbik6IEV4cHJlc3Npb258bnVsbDtcbn1cblxuLyoqXG4gKiBBbiBgQWxpYXNpbmdIb3N0YCB3aGljaCBnZW5lcmF0ZXMgYW5kIGNvbnN1bWVzIGFsaWFzIHJlLWV4cG9ydHMgd2hlbiBtb2R1bGUgbmFtZXMgZm9yIGVhY2ggZmlsZVxuICogYXJlIGRldGVybWluZWQgYnkgYSBgRmlsZVRvTW9kdWxlSG9zdGAuXG4gKlxuICogV2hlbiB1c2luZyBhIGBGaWxlVG9Nb2R1bGVIb3N0YCwgYWxpYXNpbmcgcHJldmVudHMgaXNzdWVzIHdpdGggdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMuIFNlZSB0aGVcbiAqIFJFQURNRS5tZCBmb3IgbW9yZSBkZXRhaWxzLlxuICovXG5leHBvcnQgY2xhc3MgRmlsZVRvTW9kdWxlQWxpYXNpbmdIb3N0IGltcGxlbWVudHMgQWxpYXNpbmdIb3N0IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmaWxlVG9Nb2R1bGVIb3N0OiBGaWxlVG9Nb2R1bGVIb3N0KSB7fVxuXG4gIC8qKlxuICAgKiBXaXRoIGEgYEZpbGVUb01vZHVsZUhvc3RgLCBhbGlhc2VzIGFyZSBjaG9zZW4gYXV0b21hdGljYWxseSB3aXRob3V0IHRoZSBuZWVkIHRvIGxvb2sgdGhyb3VnaFxuICAgKiB0aGUgZXhwb3J0cyBwcmVzZW50IGluIGEgLmQudHMgZmlsZSwgc28gd2UgY2FuIGF2b2lkIGNsdXR0ZXJpbmcgdGhlIC5kLnRzIGZpbGVzLlxuICAgKi9cbiAgcmVhZG9ubHkgYWxpYXNFeHBvcnRzSW5EdHMgPSBmYWxzZTtcblxuICBtYXliZUFsaWFzU3ltYm9sQXMoXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPiwgY29udGV4dDogdHMuU291cmNlRmlsZSwgbmdNb2R1bGVOYW1lOiBzdHJpbmcsXG4gICAgICBpc1JlRXhwb3J0OiBib29sZWFuKTogc3RyaW5nfG51bGwge1xuICAgIGlmICghaXNSZUV4cG9ydCkge1xuICAgICAgLy8gQWxpYXNpbmcgaXMgdXNlZCB3aXRoIGEgRmlsZVRvTW9kdWxlSG9zdCB0byBwcmV2ZW50IHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzLiBUaHVzLCBhbGlhc2VzXG4gICAgICAvLyBvbmx5IG5lZWQgdG8gYmUgY3JlYXRlZCBmb3IgZGlyZWN0aXZlcy9waXBlcyB3aGljaCBhcmUgbm90IGRpcmVjdCBkZWNsYXJhdGlvbnMgb2YgYW5cbiAgICAgIC8vIE5nTW9kdWxlIHdoaWNoIGV4cG9ydHMgdGhlbS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hbGlhc05hbWUocmVmLm5vZGUsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlcyBhbiBgRXhwcmVzc2lvbmAgdG8gaW1wb3J0IGBkZWNsYCBmcm9tIGB2aWFgLCBhc3N1bWluZyBhbiBleHBvcnQgd2FzIGFkZGVkIHdoZW4gYHZpYWBcbiAgICogd2FzIGNvbXBpbGVkIHBlciBgbWF5YmVBbGlhc1N5bWJvbEFzYCBhYm92ZS5cbiAgICovXG4gIGdldEFsaWFzSW4oZGVjbDogQ2xhc3NEZWNsYXJhdGlvbiwgdmlhOiB0cy5Tb3VyY2VGaWxlLCBpc1JlRXhwb3J0OiBib29sZWFuKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoIWlzUmVFeHBvcnQpIHtcbiAgICAgIC8vIERpcmVjdGx5IGV4cG9ydGVkIGRpcmVjdGl2ZXMvcGlwZXMgZG9uJ3QgcmVxdWlyZSBhbiBhbGlhcywgcGVyIHRoZSBsb2dpYyBpblxuICAgICAgLy8gYG1heWJlQWxpYXNTeW1ib2xBc2AuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgLy8gdmlhTW9kdWxlIGlzIHRoZSBtb2R1bGUgaXQnbGwgYWN0dWFsbHkgYmUgaW1wb3J0ZWQgZnJvbS5cbiAgICBjb25zdCBtb2R1bGVOYW1lID0gdGhpcy5maWxlVG9Nb2R1bGVIb3N0LmZpbGVOYW1lVG9Nb2R1bGVOYW1lKHZpYS5maWxlTmFtZSwgdmlhLmZpbGVOYW1lKTtcbiAgICByZXR1cm4gbmV3IEV4dGVybmFsRXhwcih7bW9kdWxlTmFtZSwgbmFtZTogdGhpcy5hbGlhc05hbWUoZGVjbCwgdmlhKX0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlcyBhbiBhbGlhcyBuYW1lIGJhc2VkIG9uIHRoZSBmdWxsIG1vZHVsZSBuYW1lIG9mIHRoZSBmaWxlIHdoaWNoIGRlY2xhcmVzIHRoZSBhbGlhc2VkXG4gICAqIGRpcmVjdGl2ZS9waXBlLlxuICAgKi9cbiAgcHJpdmF0ZSBhbGlhc05hbWUoZGVjbDogQ2xhc3NEZWNsYXJhdGlvbiwgY29udGV4dDogdHMuU291cmNlRmlsZSk6IHN0cmluZyB7XG4gICAgLy8gVGhlIGRlY2xhcmVkIG1vZHVsZSBpcyB1c2VkIHRvIGdldCB0aGUgbmFtZSBvZiB0aGUgYWxpYXMuXG4gICAgY29uc3QgZGVjbE1vZHVsZSA9XG4gICAgICAgIHRoaXMuZmlsZVRvTW9kdWxlSG9zdC5maWxlTmFtZVRvTW9kdWxlTmFtZShkZWNsLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSwgY29udGV4dC5maWxlTmFtZSk7XG5cbiAgICBjb25zdCByZXBsYWNlZCA9IGRlY2xNb2R1bGUucmVwbGFjZShDSEFSU19UT19FU0NBUEUsICdfJykucmVwbGFjZSgvXFwvL2csICckJyk7XG4gICAgcmV0dXJuICfJtW5nJCcgKyByZXBsYWNlZCArICckJCcgKyBkZWNsLm5hbWUudGV4dDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGBBbGlhc2luZ0hvc3RgIHdoaWNoIGV4cG9ydHMgZGlyZWN0aXZlcyBmcm9tIGFueSBmaWxlIGNvbnRhaW5pbmcgYW4gTmdNb2R1bGUgaW4gd2hpY2ggdGhleSdyZVxuICogZGVjbGFyZWQvZXhwb3J0ZWQsIHVuZGVyIGEgcHJpdmF0ZSBzeW1ib2wgbmFtZS5cbiAqXG4gKiBUaGVzZSBleHBvcnRzIHN1cHBvcnQgY2FzZXMgd2hlcmUgYW4gTmdNb2R1bGUgaXMgaW1wb3J0ZWQgZGVlcGx5IGZyb20gYW4gYWJzb2x1dGUgbW9kdWxlIHBhdGhcbiAqICh0aGF0IGlzLCBpdCdzIG5vdCBwYXJ0IG9mIGFuIEFuZ3VsYXIgUGFja2FnZSBGb3JtYXQgZW50cnlwb2ludCksIGFuZCB0aGUgY29tcGlsZXIgbmVlZHMgdG9cbiAqIGltcG9ydCBhbnkgbWF0Y2hlZCBkaXJlY3RpdmVzL3BpcGVzIGZyb20gdGhlIHNhbWUgcGF0aCAodG8gdGhlIE5nTW9kdWxlIGZpbGUpLiBTZWUgUkVBRE1FLm1kIGZvclxuICogbW9yZSBkZXRhaWxzLlxuICovXG5leHBvcnQgY2xhc3MgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdCBpbXBsZW1lbnRzIEFsaWFzaW5nSG9zdCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaG9zdDogUmVmbGVjdGlvbkhvc3QpIHt9XG5cbiAgLyoqXG4gICAqIFVuZGVyIHByaXZhdGUgZXhwb3J0IGFsaWFzaW5nLCB0aGUgYEFic29sdXRlTW9kdWxlU3RyYXRlZ3lgIHVzZWQgZm9yIGVtaXR0aW5nIHJlZmVyZW5jZXMgd2lsbFxuICAgKiB3aWxsIHNlbGVjdCBhbGlhc2VkIGV4cG9ydHMgdGhhdCBpdCBmaW5kcyBpbiB0aGUgLmQudHMgZmlsZSBmb3IgYW4gTmdNb2R1bGUncyBmaWxlLiBUaHVzLFxuICAgKiBlbWl0dGluZyB0aGVzZSBleHBvcnRzIGluIC5kLnRzIGlzIGEgcmVxdWlyZW1lbnQgZm9yIHRoZSBgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdGAgdG9cbiAgICogZnVuY3Rpb24gY29ycmVjdGx5LlxuICAgKi9cbiAgcmVhZG9ubHkgYWxpYXNFeHBvcnRzSW5EdHMgPSB0cnVlO1xuXG4gIG1heWJlQWxpYXNTeW1ib2xBcyhcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCBuZ01vZHVsZU5hbWU6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgICBpZiAocmVmLmhhc093bmluZ01vZHVsZUd1ZXNzKSB7XG4gICAgICAvLyBTa2lwIG5vZGVzIHRoYXQgYWxyZWFkeSBoYXZlIGFuIGFzc29jaWF0ZWQgYWJzb2x1dGUgbW9kdWxlIHNwZWNpZmllciwgc2luY2UgdGhleSBjYW4gYmVcbiAgICAgIC8vIHNhZmVseSBpbXBvcnRlZCBmcm9tIHRoYXQgc3BlY2lmaWVyLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIC8vIExvb2sgZm9yIGEgdXNlci1wcm92aWRlZCBleHBvcnQgb2YgYGRlY2xgIGluIGBjb250ZXh0YC4gSWYgb25lIGV4aXN0cywgdGhlbiBhbiBhbGlhcyBleHBvcnRcbiAgICAvLyBpcyBub3QgbmVlZGVkLlxuICAgIC8vIFRPRE8oYWx4aHViKTogbWF5YmUgYWRkIGEgaG9zdCBtZXRob2QgdG8gY2hlY2sgZm9yIHRoZSBleGlzdGVuY2Ugb2YgYW4gZXhwb3J0IHdpdGhvdXQgZ29pbmdcbiAgICAvLyB0aHJvdWdoIHRoZSBlbnRpcmUgbGlzdCBvZiBleHBvcnRzLlxuICAgIGNvbnN0IGV4cG9ydHMgPSB0aGlzLmhvc3QuZ2V0RXhwb3J0c09mTW9kdWxlKGNvbnRleHQpO1xuICAgIGlmIChleHBvcnRzID09PSBudWxsKSB7XG4gICAgICAvLyBTb21ldGhpbmcgd2VudCB3cm9uZywgYW5kIG5vIGV4cG9ydHMgd2VyZSBhdmFpbGFibGUgYXQgYWxsLiBCYWlsIHJhdGhlciB0aGFuIHJpc2sgY3JlYXRpbmdcbiAgICAgIC8vIHJlLWV4cG9ydHMgd2hlbiB0aGV5J3JlIG5vdCBuZWVkZWQuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBkZXRlcm1pbmUgdGhlIGV4cG9ydHMgb2Y6ICR7Y29udGV4dC5maWxlTmFtZX1gKTtcbiAgICB9XG4gICAgbGV0IGZvdW5kOiBib29sZWFuID0gZmFsc2U7XG4gICAgZXhwb3J0cy5mb3JFYWNoKHZhbHVlID0+IHtcbiAgICAgIGlmICh2YWx1ZS5ub2RlID09PSByZWYubm9kZSkge1xuICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGZvdW5kKSB7XG4gICAgICAvLyBUaGUgbW9kdWxlIGV4cG9ydHMgdGhlIGRlY2xhcmVkIGNsYXNzIGRpcmVjdGx5LCBubyBhbGlhcyBpcyBuZWNlc3NhcnkuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGDJtW5nRXhwb3J0ybUke25nTW9kdWxlTmFtZX3JtSR7cmVmLm5vZGUubmFtZS50ZXh0fWA7XG4gIH1cblxuICAvKipcbiAgICogQSBgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdGAgb25seSBnZW5lcmF0ZXMgcmUtZXhwb3J0cyBhbmQgZG9lcyBub3QgZGlyZWN0IHRoZSBjb21waWxlciB0b1xuICAgKiBkaXJlY3RseSBjb25zdW1lIHRoZSBhbGlhc2VzIGl0IGNyZWF0ZXMuXG4gICAqXG4gICAqIEluc3RlYWQsIHRoZXkncmUgY29uc3VtZWQgaW5kaXJlY3RseTogYEFic29sdXRlTW9kdWxlU3RyYXRlZ3lgIGBSZWZlcmVuY2VFbWl0dGVyU3RyYXRlZ3lgIHdpbGxcbiAgICogc2VsZWN0IHRoZXNlIGFsaWFzIGV4cG9ydHMgYXV0b21hdGljYWxseSB3aGVuIGxvb2tpbmcgZm9yIGFuIGV4cG9ydCBvZiB0aGUgZGlyZWN0aXZlL3BpcGUgZnJvbVxuICAgKiB0aGUgc2FtZSBwYXRoIGFzIHRoZSBOZ01vZHVsZSB3YXMgaW1wb3J0ZWQuXG4gICAqXG4gICAqIFRodXMsIGBnZXRBbGlhc0luYCBhbHdheXMgcmV0dXJucyBgbnVsbGAuXG4gICAqL1xuICBnZXRBbGlhc0luKCk6IG51bGwgeyByZXR1cm4gbnVsbDsgfVxufVxuXG4vKipcbiAqIEEgYFJlZmVyZW5jZUVtaXRTdHJhdGVneWAgd2hpY2ggd2lsbCBjb25zdW1lIHRoZSBhbGlhcyBhdHRhY2hlZCB0byBhIHBhcnRpY3VsYXIgYFJlZmVyZW5jZWAgdG8gYVxuICogZGlyZWN0aXZlIG9yIHBpcGUsIGlmIGl0IGV4aXN0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIEFsaWFzU3RyYXRlZ3kgaW1wbGVtZW50cyBSZWZlcmVuY2VFbWl0U3RyYXRlZ3kge1xuICBlbWl0KHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCBpbXBvcnRNb2RlOiBJbXBvcnRNb2RlKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICByZXR1cm4gcmVmLmFsaWFzO1xuICB9XG59XG4iXX0=