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
        define("@angular/compiler-cli/src/ngtsc/incremental/semantic_graph/src/graph", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/incremental/semantic_graph/src/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SemanticDepGraphUpdater = exports.SemanticDepGraph = exports.OpaqueSymbol = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/incremental/semantic_graph/src/api");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NlbWFudGljX2dyYXBoL3NyYy9ncmFwaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTJEO0lBRzNELDBGQUF3RDtJQWN4RDs7Ozs7T0FLRztJQUNIO1FBQWtDLHdDQUFjO1FBQWhEOztRQUlBLENBQUM7UUFIQywwQ0FBbUIsR0FBbkI7WUFDRSxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFDSCxtQkFBQztJQUFELENBQUMsQUFKRCxDQUFrQyxvQkFBYyxHQUkvQztJQUpZLG9DQUFZO0lBTXpCOztPQUVHO0lBQ0g7UUFBQTtZQUNXLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBK0MsQ0FBQztZQUMvRCxpQkFBWSxHQUFHLElBQUksR0FBRyxFQUFvQyxDQUFDO1FBc0V0RSxDQUFDO1FBcEVDOzs7Ozs7OztXQVFHO1FBQ0gseUNBQWMsR0FBZCxVQUFlLE1BQXNCO1lBQ25DLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFM0MsSUFBSSxNQUFNLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDOUIsOEZBQThGO2dCQUM5RixpREFBaUQ7Z0JBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxHQUFHLEVBQTBCLENBQUMsQ0FBQztpQkFDaEU7Z0JBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FB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QUFTLEdBQVQsVUFBVSxJQUFzQjtZQUM5QixJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuRCxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7Z0JBQ25CLDJGQUEyRjtnQkFDM0YsdUZBQXVGO2dCQUN2RixxREFBcUQ7Z0JBQ3JELE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNuQztZQUNELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFFRDs7V0FFRztRQUNLLGlEQUFlLEdBQXZCLFVBQXdCLElBQXNCO1lBQzVDLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2hDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUM7YUFDdEM7WUFFRCxJQUFNLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0QyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDckMsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUNILDhCQUFDO0lBQUQsQ0FBQyxBQXZHRCxJQXVHQztJQXZHWSwwREFBdUI7SUF5R3BDLFNBQVMsYUFBYSxDQUFDLElBQWdCO1FBQ3JDLElBQUksSUFBSSxZQUFZLHVCQUFZLEVBQUU7WUFDaEMsT0FBVSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsU0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQU0sQ0FBQztTQUN2RDthQUFNO1lBQ0wsT0FBTyxJQUFJLENBQUM7U0FDYjtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge1NlbWFudGljUmVmZXJlbmNlLCBTZW1hbnRpY1N5bWJvbH0gZnJvbSAnLi9hcGknO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlbWFudGljRGVwZW5kZW5jeVJlc3VsdCB7XG4gIC8qKlxuICAgKiBUaGUgZmlsZXMgdGhhdCBuZWVkIHRvIGJlIHJlLWVtaXR0ZWQuXG4gICAqL1xuICBuZWVkc0VtaXQ6IFNldDxBYnNvbHV0ZUZzUGF0aD47XG5cbiAgLyoqXG4gICAqIFRoZSBuZXdseSBidWlsdCBncmFwaCB0aGF0IHJlcHJlc2VudHMgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24uXG4gICAqL1xuICBuZXdHcmFwaDogU2VtYW50aWNEZXBHcmFwaDtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgZGVjbGFyYXRpb24gZm9yIHdoaWNoIG5vIHNlbWFudGljIHN5bWJvbCBoYXMgYmVlbiByZWdpc3RlcmVkLiBGb3IgZXhhbXBsZSxcbiAqIGRlY2xhcmF0aW9ucyBmcm9tIGV4dGVybmFsIGRlcGVuZGVuY2llcyBoYXZlIG5vdCBiZWVuIGV4cGxpY2l0bHkgcmVnaXN0ZXJlZCBhbmQgYXJlIHJlcHJlc2VudGVkXG4gKiBieSB0aGlzIHN5bWJvbC4gVGhpcyBhbGxvd3MgdGhlIHVucmVzb2x2ZWQgc3ltYm9sIHRvIHN0aWxsIGJlIGNvbXBhcmVkIHRvIGEgc3ltYm9sIGZyb20gYSBwcmlvclxuICogY29tcGlsYXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBPcGFxdWVTeW1ib2wgZXh0ZW5kcyBTZW1hbnRpY1N5bWJvbCB7XG4gIGlzUHVibGljQXBpQWZmZWN0ZWQoKTogZmFsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIFRoZSBzZW1hbnRpYyBkZXBlbmRlbmN5IGdyYXBoIG9mIGEgc2luZ2xlIGNvbXBpbGF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgU2VtYW50aWNEZXBHcmFwaCB7XG4gIHJlYWRvbmx5IGZpbGVzID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgTWFwPHN0cmluZywgU2VtYW50aWNTeW1ib2w+PigpO1xuICByZWFkb25seSBzeW1ib2xCeURlY2wgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIFNlbWFudGljU3ltYm9sPigpO1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBzeW1ib2wgZm9yIHRoZSBwcm92aWRlZCBkZWNsYXJhdGlvbiBhcyBjcmVhdGVkIGJ5IHRoZSBmYWN0b3J5IGZ1bmN0aW9uLiBUaGUgc3ltYm9sXG4gICAqIGlzIGdpdmVuIGEgdW5pcXVlIGlkZW50aWZpZXIgaWYgcG9zc2libGUsIHN1Y2ggdGhhdCBpdHMgZXF1aXZhbGVudCBzeW1ib2wgY2FuIGJlIG9idGFpbmVkIGZyb21cbiAgICogYSBwcmlvciBncmFwaCBldmVuIGlmIGl0cyBkZWNsYXJhdGlvbiBub2RlIGhhcyBjaGFuZ2VkIGFjcm9zcyByZWJ1aWxkcy4gU3ltYm9scyB3aXRob3V0IGFuXG4gICAqIGlkZW50aWZpZXIgYXJlIG9ubHkgYWJsZSB0byBmaW5kIHRoZW1zZWx2ZXMgaW4gYSBwcmlvciBncmFwaCBpZiB0aGVpciBkZWNsYXJhdGlvbiBub2RlIGlzXG4gICAqIGlkZW50aWNhbC5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbFxuICAgKi9cbiAgcmVnaXN0ZXJTeW1ib2woc3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IHZvaWQge1xuICAgIHRoaXMuc3ltYm9sQnlEZWNsLnNldChzeW1ib2wuZGVjbCwgc3ltYm9sKTtcblxuICAgIGlmIChzeW1ib2wuaWRlbnRpZmllciAhPT0gbnVsbCkge1xuICAgICAgLy8gSWYgdGhlIHN5bWJvbCBoYXMgYSB1bmlxdWUgaWRlbnRpZmllciwgcmVjb3JkIGl0IGluIHRoZSBmaWxlIHRoYXQgZGVjbGFyZXMgaXQuIFRoaXMgZW5hYmxlc1xuICAgICAgLy8gdGhlIHN5bWJvbCB0byBiZSByZXF1ZXN0ZWQgYnkgaXRzIHVuaXF1ZSBuYW1lLlxuICAgICAgaWYgKCF0aGlzLmZpbGVzLmhhcyhzeW1ib2wucGF0aCkpIHtcbiAgICAgICAgdGhpcy5maWxlcy5zZXQoc3ltYm9sLnBhdGgsIG5ldyBNYXA8c3RyaW5nLCBTZW1hbnRpY1N5bWJvbD4oKSk7XG4gICAgICB9XG4gICAgICB0aGlzLmZpbGVzLmdldChzeW1ib2wucGF0aCkhLnNldChzeW1ib2wuaWRlbnRpZmllciwgc3ltYm9sKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gcmVzb2x2ZSBhIHN5bWJvbCBpbiB0aGlzIGdyYXBoIHRoYXQgcmVwcmVzZW50cyB0aGUgZ2l2ZW4gc3ltYm9sIGZyb20gYW5vdGhlciBncmFwaC5cbiAgICogSWYgbm8gbWF0Y2hpbmcgc3ltYm9sIGNvdWxkIGJlIGZvdW5kLCBudWxsIGlzIHJldHVybmVkLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIFRoZSBzeW1ib2wgZnJvbSBhbm90aGVyIGdyYXBoIGZvciB3aGljaCBpdHMgZXF1aXZhbGVudCBpbiB0aGlzIGdyYXBoIHNob3VsZCBiZVxuICAgKiBmb3VuZC5cbiAgICovXG4gIGdldEVxdWl2YWxlbnRTeW1ib2woc3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IFNlbWFudGljU3ltYm9sfG51bGwge1xuICAgIC8vIEZpcnN0IGxvb2t1cCB0aGUgc3ltYm9sIGJ5IGl0cyBkZWNsYXJhdGlvbi4gSXQgaXMgdHlwaWNhbCBmb3IgdGhlIGRlY2xhcmF0aW9uIHRvIG5vdCBoYXZlXG4gICAgLy8gY2hhbmdlZCBhY3Jvc3MgcmVidWlsZHMsIHNvIHRoaXMgaXMgbGlrZWx5IHRvIGZpbmQgdGhlIHN5bWJvbC4gVXNpbmcgdGhlIGRlY2xhcmF0aW9uIGFsc29cbiAgICAvLyBhbGxvd3MgdG8gZGlmZiBzeW1ib2xzIGZvciB3aGljaCBubyB1bmlxdWUgaWRlbnRpZmllciBjb3VsZCBiZSBkZXRlcm1pbmVkLlxuICAgIGxldCBwcmV2aW91c1N5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sQnlEZWNsKHN5bWJvbC5kZWNsKTtcbiAgICBpZiAocHJldmlvdXNTeW1ib2wgPT09IG51bGwgJiYgc3ltYm9sLmlkZW50aWZpZXIgIT09IG51bGwpIHtcbiAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBjb3VsZCBub3QgYmUgcmVzb2x2ZWQgdG8gYSBzeW1ib2wgaW4gYSBwcmlvciBjb21waWxhdGlvbiwgd2hpY2ggbWF5XG4gICAgICAvLyBoYXBwZW4gYmVjYXVzZSB0aGUgZmlsZSBjb250YWluaW5nIHRoZSBkZWNsYXJhdGlvbiBoYXMgY2hhbmdlZC4gSW4gdGhhdCBjYXNlIHdlIHdhbnQgdG9cbiAgICAgIC8vIGxvb2t1cCB0aGUgc3ltYm9sIGJhc2VkIG9uIGl0cyB1bmlxdWUgaWRlbnRpZmllciwgYXMgdGhhdCBhbGxvd3MgdXMgdG8gc3RpbGwgY29tcGFyZSB0aGVcbiAgICAgIC8vIGNoYW5nZWQgZGVjbGFyYXRpb24gdG8gdGhlIHByaW9yIGNvbXBpbGF0aW9uLlxuICAgICAgcHJldmlvdXNTeW1ib2wgPSB0aGlzLmdldFN5bWJvbEJ5TmFtZShzeW1ib2wucGF0aCwgc3ltYm9sLmlkZW50aWZpZXIpO1xuICAgIH1cblxuICAgIHJldHVybiBwcmV2aW91c1N5bWJvbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byBmaW5kIHRoZSBzeW1ib2wgYnkgaXRzIGlkZW50aWZpZXIuXG4gICAqL1xuICBwcml2YXRlIGdldFN5bWJvbEJ5TmFtZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgaWRlbnRpZmllcjogc3RyaW5nKTogU2VtYW50aWNTeW1ib2x8bnVsbCB7XG4gICAgaWYgKCF0aGlzLmZpbGVzLmhhcyhwYXRoKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGZpbGUgPSB0aGlzLmZpbGVzLmdldChwYXRoKSE7XG4gICAgaWYgKCFmaWxlLmhhcyhpZGVudGlmaWVyKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBmaWxlLmdldChpZGVudGlmaWVyKSE7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gcmVzb2x2ZSB0aGUgZGVjbGFyYXRpb24gdG8gaXRzIHNlbWFudGljIHN5bWJvbC5cbiAgICovXG4gIGdldFN5bWJvbEJ5RGVjbChkZWNsOiBDbGFzc0RlY2xhcmF0aW9uKTogU2VtYW50aWNTeW1ib2x8bnVsbCB7XG4gICAgaWYgKCF0aGlzLnN5bWJvbEJ5RGVjbC5oYXMoZGVjbCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zeW1ib2xCeURlY2wuZ2V0KGRlY2wpITtcbiAgfVxufVxuXG4vKipcbiAqIEltcGxlbWVudHMgdGhlIGxvZ2ljIHRvIGdvIGZyb20gYSBwcmV2aW91cyBkZXBlbmRlbmN5IGdyYXBoIHRvIGEgbmV3IG9uZSwgYWxvbmcgd2l0aCBpbmZvcm1hdGlvblxuICogb24gd2hpY2ggZmlsZXMgaGF2ZSBiZWVuIGFmZmVjdGVkLlxuICovXG5leHBvcnQgY2xhc3MgU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IG5ld0dyYXBoID0gbmV3IFNlbWFudGljRGVwR3JhcGgoKTtcblxuICAvKipcbiAgICogQ29udGFpbnMgb3BhcXVlIHN5bWJvbHMgdGhhdCB3ZXJlIGNyZWF0ZWQgZm9yIGRlY2xhcmF0aW9ucyBmb3Igd2hpY2ggdGhlcmUgd2FzIG5vIHN5bWJvbFxuICAgKiByZWdpc3RlcmVkLCB3aGljaCBoYXBwZW5zIGZvciBlLmcuIGV4dGVybmFsIGRlY2xhcmF0aW9ucy5cbiAgICovXG4gIHByaXZhdGUgcmVhZG9ubHkgb3BhcXVlU3ltYm9scyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgT3BhcXVlU3ltYm9sPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqXG4gICAgICAgKiBUaGUgc2VtYW50aWMgZGVwZW5kZW5jeSBncmFwaCBvZiB0aGUgbW9zdCByZWNlbnRseSBzdWNjZWVkZWQgY29tcGlsYXRpb24sIG9yIG51bGwgaWYgdGhpc1xuICAgICAgICogaXMgdGhlIGluaXRpYWwgYnVpbGQuXG4gICAgICAgKi9cbiAgICAgIHByaXZhdGUgcHJpb3JHcmFwaDogU2VtYW50aWNEZXBHcmFwaHxudWxsKSB7fVxuXG4gIHJlZ2lzdGVyU3ltYm9sKHN5bWJvbDogU2VtYW50aWNTeW1ib2wpOiB2b2lkIHtcbiAgICB0aGlzLm5ld0dyYXBoLnJlZ2lzdGVyU3ltYm9sKHN5bWJvbCk7XG4gIH1cblxuICAvKipcbiAgICogVGFrZXMgYWxsIGZhY3RzIHRoYXQgaGF2ZSBiZWVuIGdhdGhlcmVkIHRvIGNyZWF0ZSBhIG5ldyBzZW1hbnRpYyBkZXBlbmRlbmN5IGdyYXBoLiBJbiB0aGlzXG4gICAqIHByb2Nlc3MsIHRoZSBzZW1hbnRpYyBpbXBhY3Qgb2YgdGhlIGNoYW5nZXMgaXMgZGV0ZXJtaW5lZCB3aGljaCByZXN1bHRzIGluIGEgc2V0IG9mIGZpbGVzIHRoYXRcbiAgICogbmVlZCB0byBiZSBlbWl0dGVkIGFuZC9vciB0eXBlLWNoZWNrZWQuXG4gICAqL1xuICBmaW5hbGl6ZSgpOiBTZW1hbnRpY0RlcGVuZGVuY3lSZXN1bHQge1xuICAgIGlmICh0aGlzLnByaW9yR3JhcGggPT09IG51bGwpIHtcbiAgICAgIC8vIElmIG5vIHByaW9yIGRlcGVuZGVuY3kgZ3JhcGggaXMgYXZhaWxhYmxlIHRoZW4gdGhpcyB3YXMgdGhlIGluaXRpYWwgYnVpbGQsIGluIHdoaWNoIGNhc2VcbiAgICAgIC8vIHdlIGRvbid0IG5lZWQgdG8gZGV0ZXJtaW5lIHRoZSBzZW1hbnRpYyBpbXBhY3QgYXMgZXZlcnl0aGluZyBpcyBhbHJlYWR5IGNvbnNpZGVyZWRcbiAgICAgIC8vIGxvZ2ljYWxseSBjaGFuZ2VkLlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmVlZHNFbWl0OiBuZXcgU2V0PEFic29sdXRlRnNQYXRoPigpLFxuICAgICAgICBuZXdHcmFwaDogdGhpcy5uZXdHcmFwaCxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3QgbmVlZHNFbWl0ID0gdGhpcy5kZXRlcm1pbmVJbnZhbGlkYXRlZEZpbGVzKHRoaXMucHJpb3JHcmFwaCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5lZWRzRW1pdCxcbiAgICAgIG5ld0dyYXBoOiB0aGlzLm5ld0dyYXBoLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGRldGVybWluZUludmFsaWRhdGVkRmlsZXMocHJpb3JHcmFwaDogU2VtYW50aWNEZXBHcmFwaCk6IFNldDxBYnNvbHV0ZUZzUGF0aD4ge1xuICAgIGNvbnN0IGlzUHVibGljQXBpQWZmZWN0ZWQgPSBuZXcgU2V0PFNlbWFudGljU3ltYm9sPigpO1xuXG4gICAgLy8gVGhlIGZpcnN0IHBoYXNlIGlzIHRvIGNvbGxlY3QgYWxsIHN5bWJvbHMgd2hpY2ggaGF2ZSB0aGVpciBwdWJsaWMgQVBJIGFmZmVjdGVkLiBBbnkgc3ltYm9sc1xuICAgIC8vIHRoYXQgY2Fubm90IGJlIG1hdGNoZWQgdXAgd2l0aCBhIHN5bWJvbCBmcm9tIHRoZSBwcmlvciBncmFwaCBhcmUgY29uc2lkZXJlZCBhZmZlY3RlZC5cbiAgICBmb3IgKGNvbnN0IHN5bWJvbCBvZiB0aGlzLm5ld0dyYXBoLnN5bWJvbEJ5RGVjbC52YWx1ZXMoKSkge1xuICAgICAgY29uc3QgcHJldmlvdXNTeW1ib2wgPSBwcmlvckdyYXBoLmdldEVxdWl2YWxlbnRTeW1ib2woc3ltYm9sKTtcbiAgICAgIGlmIChwcmV2aW91c1N5bWJvbCA9PT0gbnVsbCB8fCBzeW1ib2wuaXNQdWJsaWNBcGlBZmZlY3RlZChwcmV2aW91c1N5bWJvbCkpIHtcbiAgICAgICAgaXNQdWJsaWNBcGlBZmZlY3RlZC5hZGQoc3ltYm9sKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGUgc2Vjb25kIHBoYXNlIGlzIHRvIGZpbmQgYWxsIHN5bWJvbHMgZm9yIHdoaWNoIHRoZSBlbWl0IHJlc3VsdCBpcyBhZmZlY3RlZCwgZWl0aGVyIGJlY2F1c2VcbiAgICAvLyB0aGVpciB1c2VkIGRlY2xhcmF0aW9ucyBoYXZlIGNoYW5nZWQgb3IgYW55IG9mIHRob3NlIHVzZWQgZGVjbGFyYXRpb25zIGhhcyBoYWQgaXRzIHB1YmxpYyBBUElcbiAgICAvLyBhZmZlY3RlZCBhcyBkZXRlcm1pbmVkIGluIHRoZSBmaXJzdCBwaGFzZS5cbiAgICBjb25zdCBuZWVkc0VtaXQgPSBuZXcgU2V0PEFic29sdXRlRnNQYXRoPigpO1xuICAgIGZvciAoY29uc3Qgc3ltYm9sIG9mIHRoaXMubmV3R3JhcGguc3ltYm9sQnlEZWNsLnZhbHVlcygpKSB7XG4gICAgICBpZiAoc3ltYm9sLmlzRW1pdEFmZmVjdGVkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHByZXZpb3VzU3ltYm9sID0gcHJpb3JHcmFwaC5nZXRFcXVpdmFsZW50U3ltYm9sKHN5bWJvbCk7XG4gICAgICBpZiAocHJldmlvdXNTeW1ib2wgPT09IG51bGwgfHwgc3ltYm9sLmlzRW1pdEFmZmVjdGVkKHByZXZpb3VzU3ltYm9sLCBpc1B1YmxpY0FwaUFmZmVjdGVkKSkge1xuICAgICAgICBuZWVkc0VtaXQuYWRkKHN5bWJvbC5wYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmVlZHNFbWl0O1xuICB9XG5cbiAgZ2V0U2VtYW50aWNSZWZlcmVuY2UoZGVjbDogQ2xhc3NEZWNsYXJhdGlvbiwgZXhwcjogRXhwcmVzc2lvbik6IFNlbWFudGljUmVmZXJlbmNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3ltYm9sOiB0aGlzLmdldFN5bWJvbChkZWNsKSxcbiAgICAgIGltcG9ydFBhdGg6IGdldEltcG9ydFBhdGgoZXhwciksXG4gICAgfTtcbiAgfVxuXG4gIGdldFN5bWJvbChkZWNsOiBDbGFzc0RlY2xhcmF0aW9uKTogU2VtYW50aWNTeW1ib2wge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMubmV3R3JhcGguZ2V0U3ltYm9sQnlEZWNsKGRlY2wpO1xuICAgIGlmIChzeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIC8vIE5vIHN5bWJvbCBoYXMgYmVlbiByZWNvcmRlZCBmb3IgdGhlIHByb3ZpZGVkIGRlY2xhcmF0aW9uLCB3aGljaCB3b3VsZCBiZSB0aGUgY2FzZSBpZiB0aGVcbiAgICAgIC8vIGRlY2xhcmF0aW9uIGlzIGV4dGVybmFsLiBSZXR1cm4gYW4gb3BhcXVlIHN5bWJvbCBpbiB0aGF0IGNhc2UsIHRvIGFsbG93IHRoZSBleHRlcm5hbFxuICAgICAgLy8gZGVjbGFyYXRpb24gdG8gYmUgY29tcGFyZWQgdG8gYSBwcmlvciBjb21waWxhdGlvbi5cbiAgICAgIHJldHVybiB0aGlzLmdldE9wYXF1ZVN5bWJvbChkZWNsKTtcbiAgICB9XG4gICAgcmV0dXJuIHN5bWJvbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIG9yIGNyZWF0ZXMgYW4gYE9wYXF1ZVN5bWJvbGAgZm9yIHRoZSBwcm92aWRlZCBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0T3BhcXVlU3ltYm9sKGRlY2w6IENsYXNzRGVjbGFyYXRpb24pOiBPcGFxdWVTeW1ib2wge1xuICAgIGlmICh0aGlzLm9wYXF1ZVN5bWJvbHMuaGFzKGRlY2wpKSB7XG4gICAgICByZXR1cm4gdGhpcy5vcGFxdWVTeW1ib2xzLmdldChkZWNsKSE7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ltYm9sID0gbmV3IE9wYXF1ZVN5bWJvbChkZWNsKTtcbiAgICB0aGlzLm9wYXF1ZVN5bWJvbHMuc2V0KGRlY2wsIHN5bWJvbCk7XG4gICAgcmV0dXJuIHN5bWJvbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRJbXBvcnRQYXRoKGV4cHI6IEV4cHJlc3Npb24pOiBzdHJpbmd8bnVsbCB7XG4gIGlmIChleHByIGluc3RhbmNlb2YgRXh0ZXJuYWxFeHByKSB7XG4gICAgcmV0dXJuIGAke2V4cHIudmFsdWUubW9kdWxlTmFtZX1cXCQke2V4cHIudmFsdWUubmFtZX1gO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iXX0=