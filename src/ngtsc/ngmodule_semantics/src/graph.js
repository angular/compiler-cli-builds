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
        define("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/graph", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SemanticDepGraphUpdater = exports.SemanticDepGraph = exports.OpaqueSymbol = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/api");
    /**
     * Represents a declaration for which no semantic symbol has been registered. For example,
     * declarations from external dependencies have not been explicitly registered and are represented
     * by this symbol. This allows the unresolved symbol to still be compared to a symbol from a prior
     * compilation.
     */
    var OpaqueSymbol = /** @class */ (function (_super) {
        tslib_1.__extends(OpaqueSymbol, _super);
        function OpaqueSymbol() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        OpaqueSymbol.prototype.isPublicApiAffected = function () {
            return false;
        };
        return OpaqueSymbol;
    }(api_1.SemanticSymbol));
    exports.OpaqueSymbol = OpaqueSymbol;
    /**
     * The semantic dependency graph of a single compilation.
     */
    var SemanticDepGraph = /** @class */ (function () {
        function SemanticDepGraph() {
            this.files = new Map();
            this.symbolByDecl = new Map();
        }
        /**
         * Registers a symbol for the provided declaration as created by the factory function. The symbol
         * is given a unique identifier if possible, such that its equivalent symbol can be obtained from
         * a prior graph even if its declaration node has changed across rebuilds. Symbols without an
         * identifier are only able to find themselves in a prior graph if their declaration node is
         * identical.
         *
         * @param symbol
         */
        SemanticDepGraph.prototype.registerSymbol = function (symbol) {
            this.symbolByDecl.set(symbol.decl, symbol);
            if (symbol.identifier !== null) {
                // If the symbol has a unique identifier, record it in the file that declares it. This enables
                // the symbol to be requested by its unique name.
                if (!this.files.has(symbol.path)) {
                    this.files.set(symbol.path, new Map());
                }
                this.files.get(symbol.path).set(symbol.identifier, symbol);
            }
        };
        /**
         * Attempts to resolve a symbol in this graph that represents the given symbol from another graph.
         * If no matching symbol could be found, null is returned.
         *
         * @param symbol The symbol from another graph for which its equivalent in this graph should be
         * found.
         */
        SemanticDepGraph.prototype.getEquivalentSymbol = function (symbol) {
            // First lookup the symbol by its declaration. It is typical for the declaration to not have
            // changed across rebuilds, so this is likely to find the symbol. Using the declaration also
            // allows to diff symbols for which no unique identifier could be determined.
            var previousSymbol = this.getSymbolByDecl(symbol.decl);
            if (previousSymbol === null && symbol.identifier !== null) {
                // The declaration could not be resolved to a symbol in a prior compilation, which may
                // happen because the file containing the declaration has changed. In that case we want to
                // lookup the symbol based on its unique identifier, as that allows us to still compare the
                // changed declaration to the prior compilation.
                previousSymbol = this.getSymbolByName(symbol.path, symbol.identifier);
            }
            return previousSymbol;
        };
        /**
         * Attempts to find the symbol by its identifier.
         */
        SemanticDepGraph.prototype.getSymbolByName = function (path, identifier) {
            if (!this.files.has(path)) {
                return null;
            }
            var file = this.files.get(path);
            if (!file.has(identifier)) {
                return null;
            }
            return file.get(identifier);
        };
        /**
         * Attempts to resolve the declaration to its semantic symbol.
         */
        SemanticDepGraph.prototype.getSymbolByDecl = function (decl) {
            if (!this.symbolByDecl.has(decl)) {
                return null;
            }
            return this.symbolByDecl.get(decl);
        };
        return SemanticDepGraph;
    }());
    exports.SemanticDepGraph = SemanticDepGraph;
    /**
     * Implements the logic to go from a previous dependency graph to a new one, along with information
     * on which files have been affected.
     */
    var SemanticDepGraphUpdater = /** @class */ (function () {
        function SemanticDepGraphUpdater(
        /**
         * The semantic dependency graph of the most recently succeeded compilation, or null if this
         * is the initial build.
         */
        priorGraph) {
            this.priorGraph = priorGraph;
            this.newGraph = new SemanticDepGraph();
            /**
             * Contains opaque symbols that were created for declarations for which there was no symbol
             * registered, which happens for e.g. external declarations.
             */
            this.opaqueSymbols = new Map();
        }
        SemanticDepGraphUpdater.prototype.registerSymbol = function (symbol) {
            this.newGraph.registerSymbol(symbol);
        };
        /**
         * Takes all facts that have been gathered to create a new semantic dependency graph. In this
         * process, the semantic impact of the changes is determined which results in a set of files that
         * need to be emitted and/or type-checked.
         */
        SemanticDepGraphUpdater.prototype.finalize = function () {
            if (this.priorGraph === null) {
                // If no prior dependency graph is available then this was the initial build, in which case
                // we don't need to determine the semantic impact as everything is already considered
                // logically changed.
                return {
                    needsEmit: new Set(),
                    newGraph: this.newGraph,
                };
            }
            var needsEmit = this.determineInvalidatedFiles(this.priorGraph);
            return {
                needsEmit: needsEmit,
                newGraph: this.newGraph,
            };
        };
        SemanticDepGraphUpdater.prototype.determineInvalidatedFiles = function (priorGraph) {
            var e_1, _a, e_2, _b;
            var isPublicApiAffected = new Set();
            try {
                // The first phase is to collect all symbols which have their public API affected. Any symbols
                // that cannot be matched up with a symbol from the prior graph are considered affected.
                for (var _c = tslib_1.__values(this.newGraph.symbolByDecl.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var symbol = _d.value;
                    var previousSymbol = priorGraph.getEquivalentSymbol(symbol);
                    if (previousSymbol === null || symbol.isPublicApiAffected(previousSymbol)) {
                        isPublicApiAffected.add(symbol);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // The second phase is to find all symbols for which the emit result is affected, either because
            // their used declarations have changed or any of those used declarations has had its public API
            // affected as determined in the first phase.
            var needsEmit = new Set();
            try {
                for (var _e = tslib_1.__values(this.newGraph.symbolByDecl.values()), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var symbol = _f.value;
                    if (symbol.isEmitAffected === undefined) {
                        continue;
                    }
                    var previousSymbol = priorGraph.getEquivalentSymbol(symbol);
                    if (previousSymbol === null || symbol.isEmitAffected(previousSymbol, isPublicApiAffected)) {
                        needsEmit.add(symbol.path);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return needsEmit;
        };
        SemanticDepGraphUpdater.prototype.getSemanticReference = function (decl, expr) {
            return {
                symbol: this.getSymbol(decl),
                importPath: getImportPath(expr),
            };
        };
        SemanticDepGraphUpdater.prototype.getSymbol = function (decl) {
            var symbol = this.newGraph.getSymbolByDecl(decl);
            if (symbol === null) {
                // No symbol has been recorded for the provided declaration, which would be the case if the
                // declaration is external. Return an opaque symbol in that case, to allow the external
                // declaration to be compared to a prior compilation.
                return this.getOpaqueSymbol(decl);
            }
            return symbol;
        };
        /**
         * Gets or creates an `OpaqueSymbol` for the provided class declaration.
         */
        SemanticDepGraphUpdater.prototype.getOpaqueSymbol = function (decl) {
            if (this.opaqueSymbols.has(decl)) {
                return this.opaqueSymbols.get(decl);
            }
            var symbol = new OpaqueSymbol(decl);
            this.opaqueSymbols.set(decl, symbol);
            return symbol;
        };
        return SemanticDepGraphUpdater;
    }());
    exports.SemanticDepGraphUpdater = SemanticDepGraphUpdater;
    function getImportPath(expr) {
        if (expr instanceof compiler_1.ExternalExpr) {
            return expr.value.moduleName + "$" + expr.value.name;
        }
        else {
            return null;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL25nbW9kdWxlX3NlbWFudGljcy9zcmMvZ3JhcGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUEyRDtJQUszRCxrRkFBd0Q7SUFjeEQ7Ozs7O09BS0c7SUFDSDtRQUFrQyx3Q0FBYztRQUFoRDs7UUFJQSxDQUFDO1FBSEMsMENBQW1CLEdBQW5CO1lBQ0UsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBQ0gsbUJBQUM7SUFBRCxDQUFDLEFBSkQsQ0FBa0Msb0JBQWMsR0FJL0M7SUFKWSxvQ0FBWTtJQU16Qjs7T0FFRztJQUNIO1FBQUE7WUFDVyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQStDLENBQUM7WUFDL0QsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQztRQXNFdEUsQ0FBQztRQXBFQzs7Ozs7Ozs7V0FRRztRQUNILHlDQUFjLEdBQWQsVUFBZSxNQUFzQjtZQUNuQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRTNDLElBQUksTUFBTSxDQUFDLFVBQVUsS0FBSyxJQUFJLEVBQUU7Z0JBQzlCLDhGQUE4RjtnQkFDOUYsaURBQWlEO2dCQUNqRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNoQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksR0FBRyxFQUEwQixDQUFDLENBQUM7aUJBQ2hFO2dCQUNELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQzthQUM3RDtRQUNILENBQUM7UUFFRDs7Ozs7O1dBTUc7UUFDSCw4Q0FBbUIsR0FBbkIsVUFBb0IsTUFBc0I7WUFDeEMsNEZBQTRGO1lBQzVGLDRGQUE0RjtZQUM1Riw2RUFBNkU7WUFDN0UsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkQsSUFBSSxjQUFjLEtBQUssSUFBSSxJQUFJLE1BQU0sQ0FBQyxVQUFVLEtBQUssSUFBSSxFQUFFO2dCQUN6RCxzRkFBc0Y7Z0JBQ3RGLDBGQUEwRjtnQkFDMUYsMkZBQTJGO2dCQUMzRixnREFBZ0Q7Z0JBQ2hELGNBQWMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQ3ZFO1lBRUQsT0FBTyxjQUFjLENBQUM7UUFDeEIsQ0FBQztRQUVEOztXQUVHO1FBQ0ssMENBQWUsR0FBdkIsVUFBd0IsSUFBb0IsRUFBRSxVQUFrQjtZQUM5RCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3pCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDekIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUUsQ0FBQztRQUMvQixDQUFDO1FBRUQ7O1dBRUc7UUFDSCwwQ0FBZSxHQUFmLFVBQWdCLElBQXNCO1lBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDaEMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUM7UUFDdEMsQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQXhFRCxJQXdFQztJQXhFWSw0Q0FBZ0I7SUEwRTdCOzs7T0FHRztJQUNIO1FBU0U7UUFDSTs7O1dBR0c7UUFDSyxVQUFpQztZQUFqQyxlQUFVLEdBQVYsVUFBVSxDQUF1QjtZQWI1QixhQUFRLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBRW5EOzs7ZUFHRztZQUNjLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWtDLENBQUM7UUFPM0IsQ0FBQztRQUVqRCxnREFBYyxHQUFkLFVBQWUsTUFBc0I7WUFDbkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUVEOzs7O1dBSUc7UUFDSCwwQ0FBUSxHQUFSO1lBQ0UsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDNUIsMkZBQTJGO2dCQUMzRixxRkFBcUY7Z0JBQ3JGLHFCQUFxQjtnQkFDckIsT0FBTztvQkFDTCxTQUFTLEVBQUUsSUFBSSxHQUFHLEVBQWtCO29CQUNwQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7aUJBQ3hCLENBQUM7YUFDSDtZQUVELElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbEUsT0FBTztnQkFDTCxTQUFTLFdBQUE7Z0JBQ1QsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2FBQ3hCLENBQUM7UUFDSixDQUFDO1FBRU8sMkRBQXlCLEdBQWpDLFVBQWtDLFVBQTRCOztZQUM1RCxJQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDOztnQkFFdEQsOEZBQThGO2dCQUM5Rix3RkFBd0Y7Z0JBQ3hGLEtBQXFCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBckQsSUFBTSxNQUFNLFdBQUE7b0JBQ2YsSUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUM5RCxJQUFJLGNBQWMsS0FBSyxJQUFJLElBQUksTUFBTSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxFQUFFO3dCQUN6RSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7cUJBQ2pDO2lCQUNGOzs7Ozs7Ozs7WUFFRCxnR0FBZ0c7WUFDaEcsZ0dBQWdHO1lBQ2hHLDZDQUE2QztZQUM3QyxJQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQzs7Z0JBQzVDLEtBQXFCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBckQsSUFBTSxNQUFNLFdBQUE7b0JBQ2YsSUFBSSxNQUFNLENBQUMsY0FBYyxLQUFLLFNBQVMsRUFBRTt3QkFDdkMsU0FBUztxQkFDVjtvQkFFRCxJQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQzlELElBQUksY0FBYyxLQUFLLElBQUksSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFO3dCQUN6RixTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDNUI7aUJBQ0Y7Ozs7Ozs7OztZQUVELE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7UUFFRCxzREFBb0IsR0FBcEIsVUFBcUIsSUFBc0IsRUFBRSxJQUFnQjtZQUMzRCxPQUFPO2dCQUNMLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztnQkFDNUIsVUFBVSxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUM7YUFDaEMsQ0FBQztRQUNKLENBQUM7UUFFRCwyQ0FBUyxHQUFULFVBQVUsSUFBc0I7WUFDOUIsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkQsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO2dCQUNuQiwyRkFBMkY7Z0JBQzNGLHVGQUF1RjtnQkFDdkYscURBQXFEO2dCQUNyRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDbkM7WUFDRCxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO1FBRUQ7O1dBRUc7UUFDSyxpREFBZSxHQUF2QixVQUF3QixJQUFzQjtZQUM1QyxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNoQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDO2FBQ3RDO1lBRUQsSUFBTSxNQUFNLEdBQUcsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFDSCw4QkFBQztJQUFELENBQUMsQUF2R0QsSUF1R0M7SUF2R1ksMERBQXVCO0lBeUdwQyxTQUFTLGFBQWEsQ0FBQyxJQUFnQjtRQUNyQyxJQUFJLElBQUksWUFBWSx1QkFBWSxFQUFFO1lBQ2hDLE9BQVUsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLFNBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFNLENBQUM7U0FDdkQ7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmltcG9ydCB7U2VtYW50aWNSZWZlcmVuY2UsIFNlbWFudGljU3ltYm9sfSBmcm9tICcuL2FwaSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VtYW50aWNEZXBlbmRlbmN5UmVzdWx0IHtcbiAgLyoqXG4gICAqIFRoZSBmaWxlcyB0aGF0IG5lZWQgdG8gYmUgcmUtZW1pdHRlZC5cbiAgICovXG4gIG5lZWRzRW1pdDogU2V0PEFic29sdXRlRnNQYXRoPjtcblxuICAvKipcbiAgICogVGhlIG5ld2x5IGJ1aWx0IGdyYXBoIHRoYXQgcmVwcmVzZW50cyB0aGUgY3VycmVudCBjb21waWxhdGlvbi5cbiAgICovXG4gIG5ld0dyYXBoOiBTZW1hbnRpY0RlcEdyYXBoO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBkZWNsYXJhdGlvbiBmb3Igd2hpY2ggbm8gc2VtYW50aWMgc3ltYm9sIGhhcyBiZWVuIHJlZ2lzdGVyZWQuIEZvciBleGFtcGxlLFxuICogZGVjbGFyYXRpb25zIGZyb20gZXh0ZXJuYWwgZGVwZW5kZW5jaWVzIGhhdmUgbm90IGJlZW4gZXhwbGljaXRseSByZWdpc3RlcmVkIGFuZCBhcmUgcmVwcmVzZW50ZWRcbiAqIGJ5IHRoaXMgc3ltYm9sLiBUaGlzIGFsbG93cyB0aGUgdW5yZXNvbHZlZCBzeW1ib2wgdG8gc3RpbGwgYmUgY29tcGFyZWQgdG8gYSBzeW1ib2wgZnJvbSBhIHByaW9yXG4gKiBjb21waWxhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIE9wYXF1ZVN5bWJvbCBleHRlbmRzIFNlbWFudGljU3ltYm9sIHtcbiAgaXNQdWJsaWNBcGlBZmZlY3RlZCgpOiBmYWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogVGhlIHNlbWFudGljIGRlcGVuZGVuY3kgZ3JhcGggb2YgYSBzaW5nbGUgY29tcGlsYXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBTZW1hbnRpY0RlcEdyYXBoIHtcbiAgcmVhZG9ubHkgZmlsZXMgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBNYXA8c3RyaW5nLCBTZW1hbnRpY1N5bWJvbD4+KCk7XG4gIHJlYWRvbmx5IHN5bWJvbEJ5RGVjbCA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgU2VtYW50aWNTeW1ib2w+KCk7XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIHN5bWJvbCBmb3IgdGhlIHByb3ZpZGVkIGRlY2xhcmF0aW9uIGFzIGNyZWF0ZWQgYnkgdGhlIGZhY3RvcnkgZnVuY3Rpb24uIFRoZSBzeW1ib2xcbiAgICogaXMgZ2l2ZW4gYSB1bmlxdWUgaWRlbnRpZmllciBpZiBwb3NzaWJsZSwgc3VjaCB0aGF0IGl0cyBlcXVpdmFsZW50IHN5bWJvbCBjYW4gYmUgb2J0YWluZWQgZnJvbVxuICAgKiBhIHByaW9yIGdyYXBoIGV2ZW4gaWYgaXRzIGRlY2xhcmF0aW9uIG5vZGUgaGFzIGNoYW5nZWQgYWNyb3NzIHJlYnVpbGRzLiBTeW1ib2xzIHdpdGhvdXQgYW5cbiAgICogaWRlbnRpZmllciBhcmUgb25seSBhYmxlIHRvIGZpbmQgdGhlbXNlbHZlcyBpbiBhIHByaW9yIGdyYXBoIGlmIHRoZWlyIGRlY2xhcmF0aW9uIG5vZGUgaXNcbiAgICogaWRlbnRpY2FsLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sXG4gICAqL1xuICByZWdpc3RlclN5bWJvbChzeW1ib2w6IFNlbWFudGljU3ltYm9sKTogdm9pZCB7XG4gICAgdGhpcy5zeW1ib2xCeURlY2wuc2V0KHN5bWJvbC5kZWNsLCBzeW1ib2wpO1xuXG4gICAgaWYgKHN5bWJvbC5pZGVudGlmaWVyICE9PSBudWxsKSB7XG4gICAgICAvLyBJZiB0aGUgc3ltYm9sIGhhcyBhIHVuaXF1ZSBpZGVudGlmaWVyLCByZWNvcmQgaXQgaW4gdGhlIGZpbGUgdGhhdCBkZWNsYXJlcyBpdC4gVGhpcyBlbmFibGVzXG4gICAgICAvLyB0aGUgc3ltYm9sIHRvIGJlIHJlcXVlc3RlZCBieSBpdHMgdW5pcXVlIG5hbWUuXG4gICAgICBpZiAoIXRoaXMuZmlsZXMuaGFzKHN5bWJvbC5wYXRoKSkge1xuICAgICAgICB0aGlzLmZpbGVzLnNldChzeW1ib2wucGF0aCwgbmV3IE1hcDxzdHJpbmcsIFNlbWFudGljU3ltYm9sPigpKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZmlsZXMuZ2V0KHN5bWJvbC5wYXRoKSEuc2V0KHN5bWJvbC5pZGVudGlmaWVyLCBzeW1ib2wpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byByZXNvbHZlIGEgc3ltYm9sIGluIHRoaXMgZ3JhcGggdGhhdCByZXByZXNlbnRzIHRoZSBnaXZlbiBzeW1ib2wgZnJvbSBhbm90aGVyIGdyYXBoLlxuICAgKiBJZiBubyBtYXRjaGluZyBzeW1ib2wgY291bGQgYmUgZm91bmQsIG51bGwgaXMgcmV0dXJuZWQuXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2wgVGhlIHN5bWJvbCBmcm9tIGFub3RoZXIgZ3JhcGggZm9yIHdoaWNoIGl0cyBlcXVpdmFsZW50IGluIHRoaXMgZ3JhcGggc2hvdWxkIGJlXG4gICAqIGZvdW5kLlxuICAgKi9cbiAgZ2V0RXF1aXZhbGVudFN5bWJvbChzeW1ib2w6IFNlbWFudGljU3ltYm9sKTogU2VtYW50aWNTeW1ib2x8bnVsbCB7XG4gICAgLy8gRmlyc3QgbG9va3VwIHRoZSBzeW1ib2wgYnkgaXRzIGRlY2xhcmF0aW9uLiBJdCBpcyB0eXBpY2FsIGZvciB0aGUgZGVjbGFyYXRpb24gdG8gbm90IGhhdmVcbiAgICAvLyBjaGFuZ2VkIGFjcm9zcyByZWJ1aWxkcywgc28gdGhpcyBpcyBsaWtlbHkgdG8gZmluZCB0aGUgc3ltYm9sLiBVc2luZyB0aGUgZGVjbGFyYXRpb24gYWxzb1xuICAgIC8vIGFsbG93cyB0byBkaWZmIHN5bWJvbHMgZm9yIHdoaWNoIG5vIHVuaXF1ZSBpZGVudGlmaWVyIGNvdWxkIGJlIGRldGVybWluZWQuXG4gICAgbGV0IHByZXZpb3VzU3ltYm9sID0gdGhpcy5nZXRTeW1ib2xCeURlY2woc3ltYm9sLmRlY2wpO1xuICAgIGlmIChwcmV2aW91c1N5bWJvbCA9PT0gbnVsbCAmJiBzeW1ib2wuaWRlbnRpZmllciAhPT0gbnVsbCkge1xuICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIGNvdWxkIG5vdCBiZSByZXNvbHZlZCB0byBhIHN5bWJvbCBpbiBhIHByaW9yIGNvbXBpbGF0aW9uLCB3aGljaCBtYXlcbiAgICAgIC8vIGhhcHBlbiBiZWNhdXNlIHRoZSBmaWxlIGNvbnRhaW5pbmcgdGhlIGRlY2xhcmF0aW9uIGhhcyBjaGFuZ2VkLiBJbiB0aGF0IGNhc2Ugd2Ugd2FudCB0b1xuICAgICAgLy8gbG9va3VwIHRoZSBzeW1ib2wgYmFzZWQgb24gaXRzIHVuaXF1ZSBpZGVudGlmaWVyLCBhcyB0aGF0IGFsbG93cyB1cyB0byBzdGlsbCBjb21wYXJlIHRoZVxuICAgICAgLy8gY2hhbmdlZCBkZWNsYXJhdGlvbiB0byB0aGUgcHJpb3IgY29tcGlsYXRpb24uXG4gICAgICBwcmV2aW91c1N5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sQnlOYW1lKHN5bWJvbC5wYXRoLCBzeW1ib2wuaWRlbnRpZmllcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByZXZpb3VzU3ltYm9sO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHRzIHRvIGZpbmQgdGhlIHN5bWJvbCBieSBpdHMgaWRlbnRpZmllci5cbiAgICovXG4gIHByaXZhdGUgZ2V0U3ltYm9sQnlOYW1lKHBhdGg6IEFic29sdXRlRnNQYXRoLCBpZGVudGlmaWVyOiBzdHJpbmcpOiBTZW1hbnRpY1N5bWJvbHxudWxsIHtcbiAgICBpZiAoIXRoaXMuZmlsZXMuaGFzKHBhdGgpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgZmlsZSA9IHRoaXMuZmlsZXMuZ2V0KHBhdGgpITtcbiAgICBpZiAoIWZpbGUuaGFzKGlkZW50aWZpZXIpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGZpbGUuZ2V0KGlkZW50aWZpZXIpITtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byByZXNvbHZlIHRoZSBkZWNsYXJhdGlvbiB0byBpdHMgc2VtYW50aWMgc3ltYm9sLlxuICAgKi9cbiAgZ2V0U3ltYm9sQnlEZWNsKGRlY2w6IENsYXNzRGVjbGFyYXRpb24pOiBTZW1hbnRpY1N5bWJvbHxudWxsIHtcbiAgICBpZiAoIXRoaXMuc3ltYm9sQnlEZWNsLmhhcyhkZWNsKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnN5bWJvbEJ5RGVjbC5nZXQoZGVjbCkhO1xuICB9XG59XG5cbi8qKlxuICogSW1wbGVtZW50cyB0aGUgbG9naWMgdG8gZ28gZnJvbSBhIHByZXZpb3VzIGRlcGVuZGVuY3kgZ3JhcGggdG8gYSBuZXcgb25lLCBhbG9uZyB3aXRoIGluZm9ybWF0aW9uXG4gKiBvbiB3aGljaCBmaWxlcyBoYXZlIGJlZW4gYWZmZWN0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBTZW1hbnRpY0RlcEdyYXBoVXBkYXRlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgbmV3R3JhcGggPSBuZXcgU2VtYW50aWNEZXBHcmFwaCgpO1xuXG4gIC8qKlxuICAgKiBDb250YWlucyBvcGFxdWUgc3ltYm9scyB0aGF0IHdlcmUgY3JlYXRlZCBmb3IgZGVjbGFyYXRpb25zIGZvciB3aGljaCB0aGVyZSB3YXMgbm8gc3ltYm9sXG4gICAqIHJlZ2lzdGVyZWQsIHdoaWNoIGhhcHBlbnMgZm9yIGUuZy4gZXh0ZXJuYWwgZGVjbGFyYXRpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBvcGFxdWVTeW1ib2xzID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBPcGFxdWVTeW1ib2w+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKipcbiAgICAgICAqIFRoZSBzZW1hbnRpYyBkZXBlbmRlbmN5IGdyYXBoIG9mIHRoZSBtb3N0IHJlY2VudGx5IHN1Y2NlZWRlZCBjb21waWxhdGlvbiwgb3IgbnVsbCBpZiB0aGlzXG4gICAgICAgKiBpcyB0aGUgaW5pdGlhbCBidWlsZC5cbiAgICAgICAqL1xuICAgICAgcHJpdmF0ZSBwcmlvckdyYXBoOiBTZW1hbnRpY0RlcEdyYXBofG51bGwpIHt9XG5cbiAgcmVnaXN0ZXJTeW1ib2woc3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IHZvaWQge1xuICAgIHRoaXMubmV3R3JhcGgucmVnaXN0ZXJTeW1ib2woc3ltYm9sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUYWtlcyBhbGwgZmFjdHMgdGhhdCBoYXZlIGJlZW4gZ2F0aGVyZWQgdG8gY3JlYXRlIGEgbmV3IHNlbWFudGljIGRlcGVuZGVuY3kgZ3JhcGguIEluIHRoaXNcbiAgICogcHJvY2VzcywgdGhlIHNlbWFudGljIGltcGFjdCBvZiB0aGUgY2hhbmdlcyBpcyBkZXRlcm1pbmVkIHdoaWNoIHJlc3VsdHMgaW4gYSBzZXQgb2YgZmlsZXMgdGhhdFxuICAgKiBuZWVkIHRvIGJlIGVtaXR0ZWQgYW5kL29yIHR5cGUtY2hlY2tlZC5cbiAgICovXG4gIGZpbmFsaXplKCk6IFNlbWFudGljRGVwZW5kZW5jeVJlc3VsdCB7XG4gICAgaWYgKHRoaXMucHJpb3JHcmFwaCA9PT0gbnVsbCkge1xuICAgICAgLy8gSWYgbm8gcHJpb3IgZGVwZW5kZW5jeSBncmFwaCBpcyBhdmFpbGFibGUgdGhlbiB0aGlzIHdhcyB0aGUgaW5pdGlhbCBidWlsZCwgaW4gd2hpY2ggY2FzZVxuICAgICAgLy8gd2UgZG9uJ3QgbmVlZCB0byBkZXRlcm1pbmUgdGhlIHNlbWFudGljIGltcGFjdCBhcyBldmVyeXRoaW5nIGlzIGFscmVhZHkgY29uc2lkZXJlZFxuICAgICAgLy8gbG9naWNhbGx5IGNoYW5nZWQuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBuZWVkc0VtaXQ6IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCksXG4gICAgICAgIG5ld0dyYXBoOiB0aGlzLm5ld0dyYXBoLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCBuZWVkc0VtaXQgPSB0aGlzLmRldGVybWluZUludmFsaWRhdGVkRmlsZXModGhpcy5wcmlvckdyYXBoKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmVlZHNFbWl0LFxuICAgICAgbmV3R3JhcGg6IHRoaXMubmV3R3JhcGgsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZGV0ZXJtaW5lSW52YWxpZGF0ZWRGaWxlcyhwcmlvckdyYXBoOiBTZW1hbnRpY0RlcEdyYXBoKTogU2V0PEFic29sdXRlRnNQYXRoPiB7XG4gICAgY29uc3QgaXNQdWJsaWNBcGlBZmZlY3RlZCA9IG5ldyBTZXQ8U2VtYW50aWNTeW1ib2w+KCk7XG5cbiAgICAvLyBUaGUgZmlyc3QgcGhhc2UgaXMgdG8gY29sbGVjdCBhbGwgc3ltYm9scyB3aGljaCBoYXZlIHRoZWlyIHB1YmxpYyBBUEkgYWZmZWN0ZWQuIEFueSBzeW1ib2xzXG4gICAgLy8gdGhhdCBjYW5ub3QgYmUgbWF0Y2hlZCB1cCB3aXRoIGEgc3ltYm9sIGZyb20gdGhlIHByaW9yIGdyYXBoIGFyZSBjb25zaWRlcmVkIGFmZmVjdGVkLlxuICAgIGZvciAoY29uc3Qgc3ltYm9sIG9mIHRoaXMubmV3R3JhcGguc3ltYm9sQnlEZWNsLnZhbHVlcygpKSB7XG4gICAgICBjb25zdCBwcmV2aW91c1N5bWJvbCA9IHByaW9yR3JhcGguZ2V0RXF1aXZhbGVudFN5bWJvbChzeW1ib2wpO1xuICAgICAgaWYgKHByZXZpb3VzU3ltYm9sID09PSBudWxsIHx8IHN5bWJvbC5pc1B1YmxpY0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sKSkge1xuICAgICAgICBpc1B1YmxpY0FwaUFmZmVjdGVkLmFkZChzeW1ib2wpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZSBzZWNvbmQgcGhhc2UgaXMgdG8gZmluZCBhbGwgc3ltYm9scyBmb3Igd2hpY2ggdGhlIGVtaXQgcmVzdWx0IGlzIGFmZmVjdGVkLCBlaXRoZXIgYmVjYXVzZVxuICAgIC8vIHRoZWlyIHVzZWQgZGVjbGFyYXRpb25zIGhhdmUgY2hhbmdlZCBvciBhbnkgb2YgdGhvc2UgdXNlZCBkZWNsYXJhdGlvbnMgaGFzIGhhZCBpdHMgcHVibGljIEFQSVxuICAgIC8vIGFmZmVjdGVkIGFzIGRldGVybWluZWQgaW4gdGhlIGZpcnN0IHBoYXNlLlxuICAgIGNvbnN0IG5lZWRzRW1pdCA9IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCk7XG4gICAgZm9yIChjb25zdCBzeW1ib2wgb2YgdGhpcy5uZXdHcmFwaC5zeW1ib2xCeURlY2wudmFsdWVzKCkpIHtcbiAgICAgIGlmIChzeW1ib2wuaXNFbWl0QWZmZWN0ZWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcHJldmlvdXNTeW1ib2wgPSBwcmlvckdyYXBoLmdldEVxdWl2YWxlbnRTeW1ib2woc3ltYm9sKTtcbiAgICAgIGlmIChwcmV2aW91c1N5bWJvbCA9PT0gbnVsbCB8fCBzeW1ib2wuaXNFbWl0QWZmZWN0ZWQocHJldmlvdXNTeW1ib2wsIGlzUHVibGljQXBpQWZmZWN0ZWQpKSB7XG4gICAgICAgIG5lZWRzRW1pdC5hZGQoc3ltYm9sLnBhdGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBuZWVkc0VtaXQ7XG4gIH1cblxuICBnZXRTZW1hbnRpY1JlZmVyZW5jZShkZWNsOiBDbGFzc0RlY2xhcmF0aW9uLCBleHByOiBFeHByZXNzaW9uKTogU2VtYW50aWNSZWZlcmVuY2Uge1xuICAgIHJldHVybiB7XG4gICAgICBzeW1ib2w6IHRoaXMuZ2V0U3ltYm9sKGRlY2wpLFxuICAgICAgaW1wb3J0UGF0aDogZ2V0SW1wb3J0UGF0aChleHByKSxcbiAgICB9O1xuICB9XG5cbiAgZ2V0U3ltYm9sKGRlY2w6IENsYXNzRGVjbGFyYXRpb24pOiBTZW1hbnRpY1N5bWJvbCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5uZXdHcmFwaC5nZXRTeW1ib2xCeURlY2woZGVjbCk7XG4gICAgaWYgKHN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgLy8gTm8gc3ltYm9sIGhhcyBiZWVuIHJlY29yZGVkIGZvciB0aGUgcHJvdmlkZWQgZGVjbGFyYXRpb24sIHdoaWNoIHdvdWxkIGJlIHRoZSBjYXNlIGlmIHRoZVxuICAgICAgLy8gZGVjbGFyYXRpb24gaXMgZXh0ZXJuYWwuIFJldHVybiBhbiBvcGFxdWUgc3ltYm9sIGluIHRoYXQgY2FzZSwgdG8gYWxsb3cgdGhlIGV4dGVybmFsXG4gICAgICAvLyBkZWNsYXJhdGlvbiB0byBiZSBjb21wYXJlZCB0byBhIHByaW9yIGNvbXBpbGF0aW9uLlxuICAgICAgcmV0dXJuIHRoaXMuZ2V0T3BhcXVlU3ltYm9sKGRlY2wpO1xuICAgIH1cbiAgICByZXR1cm4gc3ltYm9sO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgb3IgY3JlYXRlcyBhbiBgT3BhcXVlU3ltYm9sYCBmb3IgdGhlIHByb3ZpZGVkIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRPcGFxdWVTeW1ib2woZGVjbDogQ2xhc3NEZWNsYXJhdGlvbik6IE9wYXF1ZVN5bWJvbCB7XG4gICAgaWYgKHRoaXMub3BhcXVlU3ltYm9scy5oYXMoZGVjbCkpIHtcbiAgICAgIHJldHVybiB0aGlzLm9wYXF1ZVN5bWJvbHMuZ2V0KGRlY2wpITtcbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2wgPSBuZXcgT3BhcXVlU3ltYm9sKGRlY2wpO1xuICAgIHRoaXMub3BhcXVlU3ltYm9scy5zZXQoZGVjbCwgc3ltYm9sKTtcbiAgICByZXR1cm4gc3ltYm9sO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEltcG9ydFBhdGgoZXhwcjogRXhwcmVzc2lvbik6IHN0cmluZ3xudWxsIHtcbiAgaWYgKGV4cHIgaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpIHtcbiAgICByZXR1cm4gYCR7ZXhwci52YWx1ZS5tb2R1bGVOYW1lfVxcJCR7ZXhwci52YWx1ZS5uYW1lfWA7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==