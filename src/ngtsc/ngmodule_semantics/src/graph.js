(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/graph", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/api", "@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/symbols"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SemanticDepGraphUpdater = exports.SemanticDepGraph = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/api");
    var symbols_1 = require("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/symbols");
    /**
     * Represents a declaration for which no semantic symbol has been registered. For example,
     * declarations from external dependencies have not been explicitly registered and are represented
     * by this symbol. This allows the unresolved symbol to still be compared to a symbol from a prior
     * compilation.
     */
    var UnresolvedSymbol = /** @class */ (function (_super) {
        tslib_1.__extends(UnresolvedSymbol, _super);
        function UnresolvedSymbol() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        UnresolvedSymbol.prototype.isPublicApiAffected = function () {
            throw new Error('Invalid state: unresolved symbols should not be diffed');
        };
        UnresolvedSymbol.prototype.distribute = function () { };
        return UnresolvedSymbol;
    }(api_1.SemanticSymbol));
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
         * @param decl
         * @param factory
         */
        SemanticDepGraph.prototype.registerSymbol = function (decl, factory) {
            var path = file_system_1.absoluteFromSourceFile(typescript_1.getSourceFile(decl));
            var identifier = getSymbolIdentifier(decl);
            var symbol = factory(path, decl, identifier);
            this.symbolByDecl.set(decl, symbol);
            if (symbol.identifier !== null) {
                // If the symbol has a unique identifier, record it in the file that declares it. This enables
                // the symbol to be requested by its unique name.
                if (!this.files.has(path)) {
                    this.files.set(path, new Map());
                }
                this.files.get(path).set(symbol.identifier, symbol);
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
    function getSymbolIdentifier(decl) {
        if (!ts.isSourceFile(decl.parent)) {
            return null;
        }
        // If this is a top-level class declaration, the class name is used as unique identifier.
        // Other scenarios are currently not supported and causes the symbol not to be identified
        // across rebuilds, unless the declaration node has not changed.
        return decl.name.text;
    }
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
             * Contains unresolved symbols that were created for declarations for which there was no symbol
             * registered, which happens for e.g. external declarations.
             */
            this.unresolvedSymbols = new Map();
        }
        SemanticDepGraphUpdater.prototype.addNgModule = function (metadata) {
            this.newGraph.registerSymbol(metadata.ref.node, function (path, decl, identifier) {
                return new symbols_1.NgModuleSymbol(path, decl, identifier, metadata.declarations.map(function (decl) { return decl.node; }));
            });
        };
        SemanticDepGraphUpdater.prototype.addDirective = function (metadata) {
            this.newGraph.registerSymbol(metadata.ref.node, function (path, decl, identifier) {
                if (metadata.isComponent) {
                    return new symbols_1.ComponentSymbol(path, decl, identifier, metadata.selector, metadata.inputs.propertyNames, metadata.outputs.propertyNames, metadata.exportAs);
                }
                return new symbols_1.DirectiveSymbol(path, decl, identifier, metadata.selector, metadata.inputs.propertyNames, metadata.outputs.propertyNames, metadata.exportAs);
            });
        };
        SemanticDepGraphUpdater.prototype.addPipe = function (metadata) {
            this.newGraph.registerSymbol(metadata.ref.node, function (path, decl, identifier) {
                return new symbols_1.PipeSymbol(path, decl, identifier, metadata.name);
            });
        };
        SemanticDepGraphUpdater.prototype.register = function (component, usedDirectives, usedPipes, isRemotelyScoped) {
            var _this = this;
            var symbol = this.newGraph.getSymbolByDecl(component);
            // The fact that the component is being registered requires that its analysis data has been
            // recorded as a symbol, so it's an error for `symbol` to be missing or not to be a
            // `ComponentSymbol`.
            if (symbol === null) {
                throw new Error("Illegal state: no symbol information available for component " + component.name.text);
            }
            else if (!(symbol instanceof symbols_1.ComponentSymbol)) {
                throw new Error("Illegal state: symbol information should be for a component, got " + symbol.constructor.name + " for " + component.name.text);
            }
            symbol.usedDirectives = usedDirectives.map(function (dir) { return _this.getSymbol(dir); });
            symbol.usedPipes = usedPipes.map(function (pipe) { return _this.getSymbol(pipe); });
            symbol.isRemotelyScoped = isRemotelyScoped;
        };
        /**
         * Takes all facts that have been gathered to create a new semantic dependency graph. In this
         * process, the semantic impact of the changes is determined which results in a set of files that
         * need to be emitted and/or type-checked.
         */
        SemanticDepGraphUpdater.prototype.finalize = function () {
            this.connect();
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
        /**
         * Implements the first phase of the semantic invalidation algorithm by connecting all symbols
         * together.
         */
        SemanticDepGraphUpdater.prototype.connect = function () {
            var e_1, _a;
            var _this = this;
            var symbolResolver = function (decl) { return _this.getSymbol(decl); };
            try {
                for (var _b = tslib_1.__values(this.newGraph.symbolByDecl.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var symbol = _c.value;
                    if (symbol.connect === undefined) {
                        continue;
                    }
                    symbol.connect(symbolResolver);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        SemanticDepGraphUpdater.prototype.determineInvalidatedFiles = function (priorGraph) {
            var e_2, _a, e_3, _b;
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
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_2) throw e_2.error; }
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
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return needsEmit;
        };
        SemanticDepGraphUpdater.prototype.getSymbol = function (decl) {
            var symbol = this.newGraph.getSymbolByDecl(decl);
            if (symbol === null) {
                // No symbol has been recorded for the provided declaration, which would be the case if the
                // declaration is external. Return an unresolved symbol in that case, to allow the external
                // declaration to be compared to a prior compilation.
                return this.getUnresolvedSymbol(decl);
            }
            return symbol;
        };
        /**
         * Gets or creates an `UnresolvedSymbol` for the provided class declaration.
         */
        SemanticDepGraphUpdater.prototype.getUnresolvedSymbol = function (decl) {
            if (this.unresolvedSymbols.has(decl)) {
                return this.unresolvedSymbols.get(decl);
            }
            var path = file_system_1.absoluteFromSourceFile(typescript_1.getSourceFile(decl));
            var identifier = getSymbolIdentifier(decl);
            var symbol = new UnresolvedSymbol(path, decl, identifier);
            this.unresolvedSymbols.set(decl, symbol);
            return symbol;
        };
        return SemanticDepGraphUpdater;
    }());
    exports.SemanticDepGraphUpdater = SemanticDepGraphUpdater;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL25nbW9kdWxlX3NlbWFudGljcy9zcmMvZ3JhcGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUVqQywyRUFBeUU7SUFJekUsa0ZBQXdEO0lBRXhELGtGQUFxRDtJQUNyRCwwRkFBdUY7SUFjdkY7Ozs7O09BS0c7SUFDSDtRQUErQiw0Q0FBYztRQUE3Qzs7UUFNQSxDQUFDO1FBTEMsOENBQW1CLEdBQW5CO1lBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFFRCxxQ0FBVSxHQUFWLGNBQW9CLENBQUM7UUFDdkIsdUJBQUM7SUFBRCxDQUFDLEFBTkQsQ0FBK0Isb0JBQWMsR0FNNUM7SUFFRDs7T0FFRztJQUNIO1FBQUE7WUFDVyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQStDLENBQUM7WUFDL0QsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQztRQThFdEUsQ0FBQztRQTVFQzs7Ozs7Ozs7O1dBU0c7UUFDSCx5Q0FBYyxHQUFkLFVBQ0ksSUFBc0IsRUFDdEIsT0FDa0I7WUFDcEIsSUFBTSxJQUFJLEdBQUcsb0NBQXNCLENBQUMsMEJBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3pELElBQU0sVUFBVSxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTdDLElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUVwQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLEtBQUssSUFBSSxF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RTtnQkFDcEMsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDO2FBQzFDO1lBRUQsSUFBTSxJQUFJLEdBQUcsb0NBQXNCLENBQUMsMEJBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3pELElBQU0sVUFBVSxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdDLElBQU0sTUFBTSxHQUFHLElBQUksZ0JBQWdCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztZQUM1RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN6QyxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBL0pELElBK0pDO0lBL0pZLDBEQUF1QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q29tcG9uZW50UmVzb2x1dGlvblJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9hcGknO1xuaW1wb3J0IHtEaXJlY3RpdmVNZXRhLCBOZ01vZHVsZU1ldGEsIFBpcGVNZXRhfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtnZXRTb3VyY2VGaWxlfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtTZW1hbnRpY1N5bWJvbCwgU3ltYm9sUmVzb2x2ZXJ9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7Q29tcG9uZW50U3ltYm9sLCBEaXJlY3RpdmVTeW1ib2wsIE5nTW9kdWxlU3ltYm9sLCBQaXBlU3ltYm9sfSBmcm9tICcuL3N5bWJvbHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlbWFudGljRGVwZW5kZW5jeVJlc3VsdCB7XG4gIC8qKlxuICAgKiBUaGUgZmlsZXMgdGhhdCBuZWVkIHRvIGJlIHJlLWVtaXR0ZWQuXG4gICAqL1xuICBuZWVkc0VtaXQ6IFNldDxBYnNvbHV0ZUZzUGF0aD47XG5cbiAgLyoqXG4gICAqIFRoZSBuZXdseSBidWlsdCBncmFwaCB0aGF0IHJlcHJlc2VudHMgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24uXG4gICAqL1xuICBuZXdHcmFwaDogU2VtYW50aWNEZXBHcmFwaDtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgZGVjbGFyYXRpb24gZm9yIHdoaWNoIG5vIHNlbWFudGljIHN5bWJvbCBoYXMgYmVlbiByZWdpc3RlcmVkLiBGb3IgZXhhbXBsZSxcbiAqIGRlY2xhcmF0aW9ucyBmcm9tIGV4dGVybmFsIGRlcGVuZGVuY2llcyBoYXZlIG5vdCBiZWVuIGV4cGxpY2l0bHkgcmVnaXN0ZXJlZCBhbmQgYXJlIHJlcHJlc2VudGVkXG4gKiBieSB0aGlzIHN5bWJvbC4gVGhpcyBhbGxvd3MgdGhlIHVucmVzb2x2ZWQgc3ltYm9sIHRvIHN0aWxsIGJlIGNvbXBhcmVkIHRvIGEgc3ltYm9sIGZyb20gYSBwcmlvclxuICogY29tcGlsYXRpb24uXG4gKi9cbmNsYXNzIFVucmVzb2x2ZWRTeW1ib2wgZXh0ZW5kcyBTZW1hbnRpY1N5bWJvbCB7XG4gIGlzUHVibGljQXBpQWZmZWN0ZWQoKTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdGF0ZTogdW5yZXNvbHZlZCBzeW1ib2xzIHNob3VsZCBub3QgYmUgZGlmZmVkJyk7XG4gIH1cblxuICBkaXN0cmlidXRlKCk6IHZvaWQge31cbn1cblxuLyoqXG4gKiBUaGUgc2VtYW50aWMgZGVwZW5kZW5jeSBncmFwaCBvZiBhIHNpbmdsZSBjb21waWxhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIFNlbWFudGljRGVwR3JhcGgge1xuICByZWFkb25seSBmaWxlcyA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIE1hcDxzdHJpbmcsIFNlbWFudGljU3ltYm9sPj4oKTtcbiAgcmVhZG9ubHkgc3ltYm9sQnlEZWNsID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBTZW1hbnRpY1N5bWJvbD4oKTtcblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGEgc3ltYm9sIGZvciB0aGUgcHJvdmlkZWQgZGVjbGFyYXRpb24gYXMgY3JlYXRlZCBieSB0aGUgZmFjdG9yeSBmdW5jdGlvbi4gVGhlIHN5bWJvbFxuICAgKiBpcyBnaXZlbiBhIHVuaXF1ZSBpZGVudGlmaWVyIGlmIHBvc3NpYmxlLCBzdWNoIHRoYXQgaXRzIGVxdWl2YWxlbnQgc3ltYm9sIGNhbiBiZSBvYnRhaW5lZCBmcm9tXG4gICAqIGEgcHJpb3IgZ3JhcGggZXZlbiBpZiBpdHMgZGVjbGFyYXRpb24gbm9kZSBoYXMgY2hhbmdlZCBhY3Jvc3MgcmVidWlsZHMuIFN5bWJvbHMgd2l0aG91dCBhblxuICAgKiBpZGVudGlmaWVyIGFyZSBvbmx5IGFibGUgdG8gZmluZCB0aGVtc2VsdmVzIGluIGEgcHJpb3IgZ3JhcGggaWYgdGhlaXIgZGVjbGFyYXRpb24gbm9kZSBpc1xuICAgKiBpZGVudGljYWwuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsXG4gICAqIEBwYXJhbSBmYWN0b3J5XG4gICAqL1xuICByZWdpc3RlclN5bWJvbChcbiAgICAgIGRlY2w6IENsYXNzRGVjbGFyYXRpb24sXG4gICAgICBmYWN0b3J5OiAocGF0aDogQWJzb2x1dGVGc1BhdGgsIGRlY2w6IENsYXNzRGVjbGFyYXRpb24sIGlkZW50aWZpZXI6IHN0cmluZ3xudWxsKSA9PlxuICAgICAgICAgIFNlbWFudGljU3ltYm9sKTogdm9pZCB7XG4gICAgY29uc3QgcGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoZ2V0U291cmNlRmlsZShkZWNsKSk7XG4gICAgY29uc3QgaWRlbnRpZmllciA9IGdldFN5bWJvbElkZW50aWZpZXIoZGVjbCk7XG5cbiAgICBjb25zdCBzeW1ib2wgPSBmYWN0b3J5KHBhdGgsIGRlY2wsIGlkZW50aWZpZXIpO1xuICAgIHRoaXMuc3ltYm9sQnlEZWNsLnNldChkZWNsLCBzeW1ib2wpO1xuXG4gICAgaWYgKHN5bWJvbC5pZGVudGlmaWVyICE9PSBudWxsKSB7XG4gICAgICAvLyBJZiB0aGUgc3ltYm9sIGhhcyBhIHVuaXF1ZSBpZGVudGlmaWVyLCByZWNvcmQgaXQgaW4gdGhlIGZpbGUgdGhhdCBkZWNsYXJlcyBpdC4gVGhpcyBlbmFibGVzXG4gICAgICAvLyB0aGUgc3ltYm9sIHRvIGJlIHJlcXVlc3RlZCBieSBpdHMgdW5pcXVlIG5hbWUuXG4gICAgICBpZiAoIXRoaXMuZmlsZXMuaGFzKHBhdGgpKSB7XG4gICAgICAgIHRoaXMuZmlsZXMuc2V0KHBhdGgsIG5ldyBNYXA8c3RyaW5nLCBTZW1hbnRpY1N5bWJvbD4oKSk7XG4gICAgICB9XG4gICAgICB0aGlzLmZpbGVzLmdldChwYXRoKSEuc2V0KHN5bWJvbC5pZGVudGlmaWVyLCBzeW1ib2wpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byByZXNvbHZlIGEgc3ltYm9sIGluIHRoaXMgZ3JhcGggdGhhdCByZXByZXNlbnRzIHRoZSBnaXZlbiBzeW1ib2wgZnJvbSBhbm90aGVyIGdyYXBoLlxuICAgKiBJZiBubyBtYXRjaGluZyBzeW1ib2wgY291bGQgYmUgZm91bmQsIG51bGwgaXMgcmV0dXJuZWQuXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2wgVGhlIHN5bWJvbCBmcm9tIGFub3RoZXIgZ3JhcGggZm9yIHdoaWNoIGl0cyBlcXVpdmFsZW50IGluIHRoaXMgZ3JhcGggc2hvdWxkIGJlXG4gICAqIGZvdW5kLlxuICAgKi9cbiAgZ2V0RXF1aXZhbGVudFN5bWJvbChzeW1ib2w6IFNlbWFudGljU3ltYm9sKTogU2VtYW50aWNTeW1ib2x8bnVsbCB7XG4gICAgLy8gRmlyc3QgbG9va3VwIHRoZSBzeW1ib2wgYnkgaXRzIGRlY2xhcmF0aW9uLiBJdCBpcyB0eXBpY2FsIGZvciB0aGUgZGVjbGFyYXRpb24gdG8gbm90IGhhdmVcbiAgICAvLyBjaGFuZ2VkIGFjcm9zcyByZWJ1aWxkcywgc28gdGhpcyBpcyBsaWtlbHkgdG8gZmluZCB0aGUgc3ltYm9sLiBVc2luZyB0aGUgZGVjbGFyYXRpb24gYWxzb1xuICAgIC8vIGFsbG93cyB0byBkaWZmIHN5bWJvbHMgZm9yIHdoaWNoIG5vIHVuaXF1ZSBpZGVudGlmaWVyIGNvdWxkIGJlIGRldGVybWluZWQuXG4gICAgbGV0IHByZXZpb3VzU3ltYm9sID0gdGhpcy5nZXRTeW1ib2xCeURlY2woc3ltYm9sLmRlY2wpO1xuICAgIGlmIChwcmV2aW91c1N5bWJvbCA9PT0gbnVsbCAmJiBzeW1ib2wuaWRlbnRpZmllciAhPT0gbnVsbCkge1xuICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIGNvdWxkIG5vdCBiZSByZXNvbHZlZCB0byBhIHN5bWJvbCBpbiBhIHByaW9yIGNvbXBpbGF0aW9uLCB3aGljaCBtYXlcbiAgICAgIC8vIGhhcHBlbiBiZWNhdXNlIHRoZSBmaWxlIGNvbnRhaW5pbmcgdGhlIGRlY2xhcmF0aW9uIGhhcyBjaGFuZ2VkLiBJbiB0aGF0IGNhc2Ugd2Ugd2FudCB0b1xuICAgICAgLy8gbG9va3VwIHRoZSBzeW1ib2wgYmFzZWQgb24gaXRzIHVuaXF1ZSBpZGVudGlmaWVyLCBhcyB0aGF0IGFsbG93cyB1cyB0byBzdGlsbCBjb21wYXJlIHRoZVxuICAgICAgLy8gY2hhbmdlZCBkZWNsYXJhdGlvbiB0byB0aGUgcHJpb3IgY29tcGlsYXRpb24uXG4gICAgICBwcmV2aW91c1N5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sQnlOYW1lKHN5bWJvbC5wYXRoLCBzeW1ib2wuaWRlbnRpZmllcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByZXZpb3VzU3ltYm9sO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHRzIHRvIGZpbmQgdGhlIHN5bWJvbCBieSBpdHMgaWRlbnRpZmllci5cbiAgICovXG4gIHByaXZhdGUgZ2V0U3ltYm9sQnlOYW1lKHBhdGg6IEFic29sdXRlRnNQYXRoLCBpZGVudGlmaWVyOiBzdHJpbmcpOiBTZW1hbnRpY1N5bWJvbHxudWxsIHtcbiAgICBpZiAoIXRoaXMuZmlsZXMuaGFzKHBhdGgpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgZmlsZSA9IHRoaXMuZmlsZXMuZ2V0KHBhdGgpITtcbiAgICBpZiAoIWZpbGUuaGFzKGlkZW50aWZpZXIpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGZpbGUuZ2V0KGlkZW50aWZpZXIpITtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byByZXNvbHZlIHRoZSBkZWNsYXJhdGlvbiB0byBpdHMgc2VtYW50aWMgc3ltYm9sLlxuICAgKi9cbiAgZ2V0U3ltYm9sQnlEZWNsKGRlY2w6IENsYXNzRGVjbGFyYXRpb24pOiBTZW1hbnRpY1N5bWJvbHxudWxsIHtcbiAgICBpZiAoIXRoaXMuc3ltYm9sQnlEZWNsLmhhcyhkZWNsKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnN5bWJvbEJ5RGVjbC5nZXQoZGVjbCkhO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFN5bWJvbElkZW50aWZpZXIoZGVjbDogQ2xhc3NEZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgaWYgKCF0cy5pc1NvdXJjZUZpbGUoZGVjbC5wYXJlbnQpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBJZiB0aGlzIGlzIGEgdG9wLWxldmVsIGNsYXNzIGRlY2xhcmF0aW9uLCB0aGUgY2xhc3MgbmFtZSBpcyB1c2VkIGFzIHVuaXF1ZSBpZGVudGlmaWVyLlxuICAvLyBPdGhlciBzY2VuYXJpb3MgYXJlIGN1cnJlbnRseSBub3Qgc3VwcG9ydGVkIGFuZCBjYXVzZXMgdGhlIHN5bWJvbCBub3QgdG8gYmUgaWRlbnRpZmllZFxuICAvLyBhY3Jvc3MgcmVidWlsZHMsIHVubGVzcyB0aGUgZGVjbGFyYXRpb24gbm9kZSBoYXMgbm90IGNoYW5nZWQuXG4gIHJldHVybiBkZWNsLm5hbWUudGV4dDtcbn1cblxuLyoqXG4gKiBJbXBsZW1lbnRzIHRoZSBsb2dpYyB0byBnbyBmcm9tIGEgcHJldmlvdXMgZGVwZW5kZW5jeSBncmFwaCB0byBhIG5ldyBvbmUsIGFsb25nIHdpdGggaW5mb3JtYXRpb25cbiAqIG9uIHdoaWNoIGZpbGVzIGhhdmUgYmVlbiBhZmZlY3RlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIFNlbWFudGljRGVwR3JhcGhVcGRhdGVyIGltcGxlbWVudHMgQ29tcG9uZW50UmVzb2x1dGlvblJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSByZWFkb25seSBuZXdHcmFwaCA9IG5ldyBTZW1hbnRpY0RlcEdyYXBoKCk7XG5cbiAgLyoqXG4gICAqIENvbnRhaW5zIHVucmVzb2x2ZWQgc3ltYm9scyB0aGF0IHdlcmUgY3JlYXRlZCBmb3IgZGVjbGFyYXRpb25zIGZvciB3aGljaCB0aGVyZSB3YXMgbm8gc3ltYm9sXG4gICAqIHJlZ2lzdGVyZWQsIHdoaWNoIGhhcHBlbnMgZm9yIGUuZy4gZXh0ZXJuYWwgZGVjbGFyYXRpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkb25seSB1bnJlc29sdmVkU3ltYm9scyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgVW5yZXNvbHZlZFN5bWJvbD4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKlxuICAgICAgICogVGhlIHNlbWFudGljIGRlcGVuZGVuY3kgZ3JhcGggb2YgdGhlIG1vc3QgcmVjZW50bHkgc3VjY2VlZGVkIGNvbXBpbGF0aW9uLCBvciBudWxsIGlmIHRoaXNcbiAgICAgICAqIGlzIHRoZSBpbml0aWFsIGJ1aWxkLlxuICAgICAgICovXG4gICAgICBwcml2YXRlIHByaW9yR3JhcGg6IFNlbWFudGljRGVwR3JhcGh8bnVsbCkge31cblxuICBhZGROZ01vZHVsZShtZXRhZGF0YTogTmdNb2R1bGVNZXRhKTogdm9pZCB7XG4gICAgdGhpcy5uZXdHcmFwaC5yZWdpc3RlclN5bWJvbChtZXRhZGF0YS5yZWYubm9kZSwgKHBhdGgsIGRlY2wsIGlkZW50aWZpZXIpID0+IHtcbiAgICAgIHJldHVybiBuZXcgTmdNb2R1bGVTeW1ib2woXG4gICAgICAgICAgcGF0aCwgZGVjbCwgaWRlbnRpZmllciwgbWV0YWRhdGEuZGVjbGFyYXRpb25zLm1hcChkZWNsID0+IGRlY2wubm9kZSkpO1xuICAgIH0pO1xuICB9XG5cbiAgYWRkRGlyZWN0aXZlKG1ldGFkYXRhOiBEaXJlY3RpdmVNZXRhKTogdm9pZCB7XG4gICAgdGhpcy5uZXdHcmFwaC5yZWdpc3RlclN5bWJvbChtZXRhZGF0YS5yZWYubm9kZSwgKHBhdGgsIGRlY2wsIGlkZW50aWZpZXIpID0+IHtcbiAgICAgIGlmIChtZXRhZGF0YS5pc0NvbXBvbmVudCkge1xuICAgICAgICByZXR1cm4gbmV3IENvbXBvbmVudFN5bWJvbChcbiAgICAgICAgICAgIHBhdGgsIGRlY2wsIGlkZW50aWZpZXIsIG1ldGFkYXRhLnNlbGVjdG9yLCBtZXRhZGF0YS5pbnB1dHMucHJvcGVydHlOYW1lcyxcbiAgICAgICAgICAgIG1ldGFkYXRhLm91dHB1dHMucHJvcGVydHlOYW1lcywgbWV0YWRhdGEuZXhwb3J0QXMpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBEaXJlY3RpdmVTeW1ib2woXG4gICAgICAgICAgcGF0aCwgZGVjbCwgaWRlbnRpZmllciwgbWV0YWRhdGEuc2VsZWN0b3IsIG1ldGFkYXRhLmlucHV0cy5wcm9wZXJ0eU5hbWVzLFxuICAgICAgICAgIG1ldGFkYXRhLm91dHB1dHMucHJvcGVydHlOYW1lcywgbWV0YWRhdGEuZXhwb3J0QXMpO1xuICAgIH0pO1xuICB9XG5cbiAgYWRkUGlwZShtZXRhZGF0YTogUGlwZU1ldGEpOiB2b2lkIHtcbiAgICB0aGlzLm5ld0dyYXBoLnJlZ2lzdGVyU3ltYm9sKG1ldGFkYXRhLnJlZi5ub2RlLCAocGF0aCwgZGVjbCwgaWRlbnRpZmllcikgPT4ge1xuICAgICAgcmV0dXJuIG5ldyBQaXBlU3ltYm9sKHBhdGgsIGRlY2wsIGlkZW50aWZpZXIsIG1ldGFkYXRhLm5hbWUpO1xuICAgIH0pO1xuICB9XG5cbiAgcmVnaXN0ZXIoXG4gICAgICBjb21wb25lbnQ6IENsYXNzRGVjbGFyYXRpb24sIHVzZWREaXJlY3RpdmVzOiBDbGFzc0RlY2xhcmF0aW9uW10sXG4gICAgICB1c2VkUGlwZXM6IENsYXNzRGVjbGFyYXRpb25bXSwgaXNSZW1vdGVseVNjb3BlZDogYm9vbGVhbik6IHZvaWQge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMubmV3R3JhcGguZ2V0U3ltYm9sQnlEZWNsKGNvbXBvbmVudCk7XG5cbiAgICAvLyBUaGUgZmFjdCB0aGF0IHRoZSBjb21wb25lbnQgaXMgYmVpbmcgcmVnaXN0ZXJlZCByZXF1aXJlcyB0aGF0IGl0cyBhbmFseXNpcyBkYXRhIGhhcyBiZWVuXG4gICAgLy8gcmVjb3JkZWQgYXMgYSBzeW1ib2wsIHNvIGl0J3MgYW4gZXJyb3IgZm9yIGBzeW1ib2xgIHRvIGJlIG1pc3Npbmcgb3Igbm90IHRvIGJlIGFcbiAgICAvLyBgQ29tcG9uZW50U3ltYm9sYC5cbiAgICBpZiAoc3ltYm9sID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYElsbGVnYWwgc3RhdGU6IG5vIHN5bWJvbCBpbmZvcm1hdGlvbiBhdmFpbGFibGUgZm9yIGNvbXBvbmVudCAke2NvbXBvbmVudC5uYW1lLnRleHR9YCk7XG4gICAgfSBlbHNlIGlmICghKHN5bWJvbCBpbnN0YW5jZW9mIENvbXBvbmVudFN5bWJvbCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSWxsZWdhbCBzdGF0ZTogc3ltYm9sIGluZm9ybWF0aW9uIHNob3VsZCBiZSBmb3IgYSBjb21wb25lbnQsIGdvdCAke1xuICAgICAgICAgIHN5bWJvbC5jb25zdHJ1Y3Rvci5uYW1lfSBmb3IgJHtjb21wb25lbnQubmFtZS50ZXh0fWApO1xuICAgIH1cblxuICAgIHN5bWJvbC51c2VkRGlyZWN0aXZlcyA9IHVzZWREaXJlY3RpdmVzLm1hcChkaXIgPT4gdGhpcy5nZXRTeW1ib2woZGlyKSk7XG4gICAgc3ltYm9sLnVzZWRQaXBlcyA9IHVzZWRQaXBlcy5tYXAocGlwZSA9PiB0aGlzLmdldFN5bWJvbChwaXBlKSk7XG4gICAgc3ltYm9sLmlzUmVtb3RlbHlTY29wZWQgPSBpc1JlbW90ZWx5U2NvcGVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFRha2VzIGFsbCBmYWN0cyB0aGF0IGhhdmUgYmVlbiBnYXRoZXJlZCB0byBjcmVhdGUgYSBuZXcgc2VtYW50aWMgZGVwZW5kZW5jeSBncmFwaC4gSW4gdGhpc1xuICAgKiBwcm9jZXNzLCB0aGUgc2VtYW50aWMgaW1wYWN0IG9mIHRoZSBjaGFuZ2VzIGlzIGRldGVybWluZWQgd2hpY2ggcmVzdWx0cyBpbiBhIHNldCBvZiBmaWxlcyB0aGF0XG4gICAqIG5lZWQgdG8gYmUgZW1pdHRlZCBhbmQvb3IgdHlwZS1jaGVja2VkLlxuICAgKi9cbiAgZmluYWxpemUoKTogU2VtYW50aWNEZXBlbmRlbmN5UmVzdWx0IHtcbiAgICB0aGlzLmNvbm5lY3QoKTtcblxuICAgIGlmICh0aGlzLnByaW9yR3JhcGggPT09IG51bGwpIHtcbiAgICAgIC8vIElmIG5vIHByaW9yIGRlcGVuZGVuY3kgZ3JhcGggaXMgYXZhaWxhYmxlIHRoZW4gdGhpcyB3YXMgdGhlIGluaXRpYWwgYnVpbGQsIGluIHdoaWNoIGNhc2VcbiAgICAgIC8vIHdlIGRvbid0IG5lZWQgdG8gZGV0ZXJtaW5lIHRoZSBzZW1hbnRpYyBpbXBhY3QgYXMgZXZlcnl0aGluZyBpcyBhbHJlYWR5IGNvbnNpZGVyZWRcbiAgICAgIC8vIGxvZ2ljYWxseSBjaGFuZ2VkLlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmVlZHNFbWl0OiBuZXcgU2V0PEFic29sdXRlRnNQYXRoPigpLFxuICAgICAgICBuZXdHcmFwaDogdGhpcy5uZXdHcmFwaCxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3QgbmVlZHNFbWl0ID0gdGhpcy5kZXRlcm1pbmVJbnZhbGlkYXRlZEZpbGVzKHRoaXMucHJpb3JHcmFwaCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5lZWRzRW1pdCxcbiAgICAgIG5ld0dyYXBoOiB0aGlzLm5ld0dyYXBoLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogSW1wbGVtZW50cyB0aGUgZmlyc3QgcGhhc2Ugb2YgdGhlIHNlbWFudGljIGludmFsaWRhdGlvbiBhbGdvcml0aG0gYnkgY29ubmVjdGluZyBhbGwgc3ltYm9sc1xuICAgKiB0b2dldGhlci5cbiAgICovXG4gIHByaXZhdGUgY29ubmVjdCgpOiB2b2lkIHtcbiAgICBjb25zdCBzeW1ib2xSZXNvbHZlcjogU3ltYm9sUmVzb2x2ZXIgPSBkZWNsID0+IHRoaXMuZ2V0U3ltYm9sKGRlY2wpO1xuXG4gICAgZm9yIChjb25zdCBzeW1ib2wgb2YgdGhpcy5uZXdHcmFwaC5zeW1ib2xCeURlY2wudmFsdWVzKCkpIHtcbiAgICAgIGlmIChzeW1ib2wuY29ubmVjdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBzeW1ib2wuY29ubmVjdChzeW1ib2xSZXNvbHZlcik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBkZXRlcm1pbmVJbnZhbGlkYXRlZEZpbGVzKHByaW9yR3JhcGg6IFNlbWFudGljRGVwR3JhcGgpOiBTZXQ8QWJzb2x1dGVGc1BhdGg+IHtcbiAgICBjb25zdCBpc1B1YmxpY0FwaUFmZmVjdGVkID0gbmV3IFNldDxTZW1hbnRpY1N5bWJvbD4oKTtcblxuICAgIC8vIFRoZSBmaXJzdCBwaGFzZSBpcyB0byBjb2xsZWN0IGFsbCBzeW1ib2xzIHdoaWNoIGhhdmUgdGhlaXIgcHVibGljIEFQSSBhZmZlY3RlZC4gQW55IHN5bWJvbHNcbiAgICAvLyB0aGF0IGNhbm5vdCBiZSBtYXRjaGVkIHVwIHdpdGggYSBzeW1ib2wgZnJvbSB0aGUgcHJpb3IgZ3JhcGggYXJlIGNvbnNpZGVyZWQgYWZmZWN0ZWQuXG4gICAgZm9yIChjb25zdCBzeW1ib2wgb2YgdGhpcy5uZXdHcmFwaC5zeW1ib2xCeURlY2wudmFsdWVzKCkpIHtcbiAgICAgIGNvbnN0IHByZXZpb3VzU3ltYm9sID0gcHJpb3JHcmFwaC5nZXRFcXVpdmFsZW50U3ltYm9sKHN5bWJvbCk7XG4gICAgICBpZiAocHJldmlvdXNTeW1ib2wgPT09IG51bGwgfHwgc3ltYm9sLmlzUHVibGljQXBpQWZmZWN0ZWQocHJldmlvdXNTeW1ib2wpKSB7XG4gICAgICAgIGlzUHVibGljQXBpQWZmZWN0ZWQuYWRkKHN5bWJvbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhlIHNlY29uZCBwaGFzZSBpcyB0byBmaW5kIGFsbCBzeW1ib2xzIGZvciB3aGljaCB0aGUgZW1pdCByZXN1bHQgaXMgYWZmZWN0ZWQsIGVpdGhlciBiZWNhdXNlXG4gICAgLy8gdGhlaXIgdXNlZCBkZWNsYXJhdGlvbnMgaGF2ZSBjaGFuZ2VkIG9yIGFueSBvZiB0aG9zZSB1c2VkIGRlY2xhcmF0aW9ucyBoYXMgaGFkIGl0cyBwdWJsaWMgQVBJXG4gICAgLy8gYWZmZWN0ZWQgYXMgZGV0ZXJtaW5lZCBpbiB0aGUgZmlyc3QgcGhhc2UuXG4gICAgY29uc3QgbmVlZHNFbWl0ID0gbmV3IFNldDxBYnNvbHV0ZUZzUGF0aD4oKTtcbiAgICBmb3IgKGNvbnN0IHN5bWJvbCBvZiB0aGlzLm5ld0dyYXBoLnN5bWJvbEJ5RGVjbC52YWx1ZXMoKSkge1xuICAgICAgaWYgKHN5bWJvbC5pc0VtaXRBZmZlY3RlZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwcmV2aW91c1N5bWJvbCA9IHByaW9yR3JhcGguZ2V0RXF1aXZhbGVudFN5bWJvbChzeW1ib2wpO1xuICAgICAgaWYgKHByZXZpb3VzU3ltYm9sID09PSBudWxsIHx8IHN5bWJvbC5pc0VtaXRBZmZlY3RlZChwcmV2aW91c1N5bWJvbCwgaXNQdWJsaWNBcGlBZmZlY3RlZCkpIHtcbiAgICAgICAgbmVlZHNFbWl0LmFkZChzeW1ib2wucGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5lZWRzRW1pdDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sKGRlY2w6IENsYXNzRGVjbGFyYXRpb24pOiBTZW1hbnRpY1N5bWJvbCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5uZXdHcmFwaC5nZXRTeW1ib2xCeURlY2woZGVjbCk7XG4gICAgaWYgKHN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgLy8gTm8gc3ltYm9sIGhhcyBiZWVuIHJlY29yZGVkIGZvciB0aGUgcHJvdmlkZWQgZGVjbGFyYXRpb24sIHdoaWNoIHdvdWxkIGJlIHRoZSBjYXNlIGlmIHRoZVxuICAgICAgLy8gZGVjbGFyYXRpb24gaXMgZXh0ZXJuYWwuIFJldHVybiBhbiB1bnJlc29sdmVkIHN5bWJvbCBpbiB0aGF0IGNhc2UsIHRvIGFsbG93IHRoZSBleHRlcm5hbFxuICAgICAgLy8gZGVjbGFyYXRpb24gdG8gYmUgY29tcGFyZWQgdG8gYSBwcmlvciBjb21waWxhdGlvbi5cbiAgICAgIHJldHVybiB0aGlzLmdldFVucmVzb2x2ZWRTeW1ib2woZGVjbCk7XG4gICAgfVxuICAgIHJldHVybiBzeW1ib2w7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBvciBjcmVhdGVzIGFuIGBVbnJlc29sdmVkU3ltYm9sYCBmb3IgdGhlIHByb3ZpZGVkIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRVbnJlc29sdmVkU3ltYm9sKGRlY2w6IENsYXNzRGVjbGFyYXRpb24pOiBVbnJlc29sdmVkU3ltYm9sIHtcbiAgICBpZiAodGhpcy51bnJlc29sdmVkU3ltYm9scy5oYXMoZGVjbCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnVucmVzb2x2ZWRTeW1ib2xzLmdldChkZWNsKSE7XG4gICAgfVxuXG4gICAgY29uc3QgcGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoZ2V0U291cmNlRmlsZShkZWNsKSk7XG4gICAgY29uc3QgaWRlbnRpZmllciA9IGdldFN5bWJvbElkZW50aWZpZXIoZGVjbCk7XG4gICAgY29uc3Qgc3ltYm9sID0gbmV3IFVucmVzb2x2ZWRTeW1ib2wocGF0aCwgZGVjbCwgaWRlbnRpZmllcik7XG4gICAgdGhpcy51bnJlc29sdmVkU3ltYm9scy5zZXQoZGVjbCwgc3ltYm9sKTtcbiAgICByZXR1cm4gc3ltYm9sO1xuICB9XG59XG4iXX0=