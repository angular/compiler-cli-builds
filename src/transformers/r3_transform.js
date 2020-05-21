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
        define("@angular/compiler-cli/src/transformers/r3_transform", ["require", "exports", "tslib", "@angular/compiler-cli/src/transformers/node_emitter"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getAngularClassTransformerFactory = void 0;
    var tslib_1 = require("tslib");
    var node_emitter_1 = require("@angular/compiler-cli/src/transformers/node_emitter");
    /**
     * Returns a transformer that adds the requested static methods specified by modules.
     */
    function getAngularClassTransformerFactory(modules, annotateForClosureCompiler) {
        if (modules.length === 0) {
            // If no modules are specified, just return an identity transform.
            return function () { return function (sf) { return sf; }; };
        }
        var moduleMap = new Map(modules.map(function (m) { return [m.fileName, m]; }));
        return function (context) {
            return function (sourceFile) {
                var module = moduleMap.get(sourceFile.fileName);
                if (module && module.statements.length > 0) {
                    var _a = tslib_1.__read(node_emitter_1.updateSourceFile(sourceFile, module, annotateForClosureCompiler), 1), newSourceFile = _a[0];
                    return newSourceFile;
                }
                return sourceFile;
            };
        };
    }
    exports.getAngularClassTransformerFactory = getAngularClassTransformerFactory;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicjNfdHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvcjNfdHJhbnNmb3JtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFLSCxvRkFBZ0Q7SUFLaEQ7O09BRUc7SUFDSCxTQUFnQixpQ0FBaUMsQ0FDN0MsT0FBd0IsRUFBRSwwQkFBbUM7UUFDL0QsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN4QixrRUFBa0U7WUFDbEUsT0FBTyxjQUFNLE9BQUEsVUFBQSxFQUFFLElBQUksT0FBQSxFQUFFLEVBQUYsQ0FBRSxFQUFSLENBQVEsQ0FBQztTQUN2QjtRQUNELElBQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQTBCLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFmLENBQWUsQ0FBQyxDQUFDLENBQUM7UUFDdEYsT0FBTyxVQUFTLE9BQWlDO1lBQy9DLE9BQU8sVUFBUyxVQUF5QjtnQkFDdkMsSUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2xELElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtvQkFDcEMsSUFBQSxLQUFBLGVBQWtCLCtCQUFnQixDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsMEJBQTBCLENBQUMsSUFBQSxFQUFqRixhQUFhLFFBQW9FLENBQUM7b0JBQ3pGLE9BQU8sYUFBYSxDQUFDO2lCQUN0QjtnQkFDRCxPQUFPLFVBQVUsQ0FBQztZQUNwQixDQUFDLENBQUM7UUFDSixDQUFDLENBQUM7SUFDSixDQUFDO0lBakJELDhFQWlCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtQYXJ0aWFsTW9kdWxlLCBTdGF0ZW1lbnQsIFN0YXRpY1N5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7dXBkYXRlU291cmNlRmlsZX0gZnJvbSAnLi9ub2RlX2VtaXR0ZXInO1xuXG5leHBvcnQgdHlwZSBUcmFuc2Zvcm1lciA9IChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKSA9PiB0cy5Tb3VyY2VGaWxlO1xuZXhwb3J0IHR5cGUgVHJhbnNmb3JtZXJGYWN0b3J5ID0gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT4gVHJhbnNmb3JtZXI7XG5cbi8qKlxuICogUmV0dXJucyBhIHRyYW5zZm9ybWVyIHRoYXQgYWRkcyB0aGUgcmVxdWVzdGVkIHN0YXRpYyBtZXRob2RzIHNwZWNpZmllZCBieSBtb2R1bGVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QW5ndWxhckNsYXNzVHJhbnNmb3JtZXJGYWN0b3J5KFxuICAgIG1vZHVsZXM6IFBhcnRpYWxNb2R1bGVbXSwgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4pOiBUcmFuc2Zvcm1lckZhY3Rvcnkge1xuICBpZiAobW9kdWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAvLyBJZiBubyBtb2R1bGVzIGFyZSBzcGVjaWZpZWQsIGp1c3QgcmV0dXJuIGFuIGlkZW50aXR5IHRyYW5zZm9ybS5cbiAgICByZXR1cm4gKCkgPT4gc2YgPT4gc2Y7XG4gIH1cbiAgY29uc3QgbW9kdWxlTWFwID0gbmV3IE1hcChtb2R1bGVzLm1hcDxbc3RyaW5nLCBQYXJ0aWFsTW9kdWxlXT4obSA9PiBbbS5maWxlTmFtZSwgbV0pKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkge1xuICAgIHJldHVybiBmdW5jdGlvbihzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gICAgICBjb25zdCBtb2R1bGUgPSBtb2R1bGVNYXAuZ2V0KHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgICAgaWYgKG1vZHVsZSAmJiBtb2R1bGUuc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IFtuZXdTb3VyY2VGaWxlXSA9IHVwZGF0ZVNvdXJjZUZpbGUoc291cmNlRmlsZSwgbW9kdWxlLCBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcik7XG4gICAgICAgIHJldHVybiBuZXdTb3VyY2VGaWxlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHNvdXJjZUZpbGU7XG4gICAgfTtcbiAgfTtcbn1cbiJdfQ==