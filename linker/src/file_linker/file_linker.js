(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/file_linker", ["require", "exports", "tslib", "@angular/compiler-cli/linker/src/ast/ast_value", "@angular/compiler-cli/linker/src/file_linker/emit_scopes/emit_scope", "@angular/compiler-cli/linker/src/file_linker/emit_scopes/iife_emit_scope", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_linker_selector"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FileLinker = exports.NO_STATEMENTS = void 0;
    var tslib_1 = require("tslib");
    var ast_value_1 = require("@angular/compiler-cli/linker/src/ast/ast_value");
    var emit_scope_1 = require("@angular/compiler-cli/linker/src/file_linker/emit_scopes/emit_scope");
    var iife_emit_scope_1 = require("@angular/compiler-cli/linker/src/file_linker/emit_scopes/iife_emit_scope");
    var partial_linker_selector_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_linker_selector");
    exports.NO_STATEMENTS = [];
    /**
     * This class is responsible for linking all the partial declarations found in a single file.
     */
    var FileLinker = /** @class */ (function () {
        function FileLinker(linkerEnvironment, sourceUrl, code) {
            this.linkerEnvironment = linkerEnvironment;
            this.emitScopes = new Map();
            this.linkerSelector = new partial_linker_selector_1.PartialLinkerSelector((0, partial_linker_selector_1.createLinkerMap)(this.linkerEnvironment, sourceUrl, code), this.linkerEnvironment.logger, this.linkerEnvironment.options.unknownDeclarationVersionHandling);
        }
        /**
         * Return true if the given callee name matches a partial declaration that can be linked.
         */
        FileLinker.prototype.isPartialDeclaration = function (calleeName) {
            return this.linkerSelector.supportsDeclaration(calleeName);
        };
        /**
         * Link the metadata extracted from the args of a call to a partial declaration function.
         *
         * The `declarationScope` is used to determine the scope and strategy of emission of the linked
         * definition and any shared constant statements.
         *
         * @param declarationFn the name of the function used to declare the partial declaration - e.g.
         *     `ɵɵngDeclareDirective`.
         * @param args the arguments passed to the declaration function, should be a single object that
         *     corresponds to the `R3DeclareDirectiveMetadata` or `R3DeclareComponentMetadata` interfaces.
         * @param declarationScope the scope that contains this call to the declaration function.
         */
        FileLinker.prototype.linkPartialDeclaration = function (declarationFn, args, declarationScope) {
            if (args.length !== 1) {
                throw new Error("Invalid function call: It should have only a single object literal argument, but contained " + args.length + ".");
            }
            var metaObj = ast_value_1.AstObject.parse(args[0], this.linkerEnvironment.host);
            var ngImport = metaObj.getNode('ngImport');
            var emitScope = this.getEmitScope(ngImport, declarationScope);
            var minVersion = metaObj.getString('minVersion');
            var version = metaObj.getString('version');
            var linker = this.linkerSelector.getLinker(declarationFn, minVersion, version);
            var definition = linker.linkPartialDeclaration(emitScope.constantPool, metaObj);
            return emitScope.translateDefinition(definition);
        };
        /**
         * Return all the shared constant statements and their associated constant scope references, so
         * that they can be inserted into the source code.
         */
        FileLinker.prototype.getConstantStatements = function () {
            var e_1, _a;
            var results = [];
            try {
                for (var _b = (0, tslib_1.__values)(this.emitScopes.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = (0, tslib_1.__read)(_c.value, 2), constantScope = _d[0], emitScope = _d[1];
                    var statements = emitScope.getConstantStatements();
                    results.push({ constantScope: constantScope, statements: statements });
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return results;
        };
        FileLinker.prototype.getEmitScope = function (ngImport, declarationScope) {
            var constantScope = declarationScope.getConstantScopeRef(ngImport);
            if (constantScope === null) {
                // There is no constant scope so we will emit extra statements into the definition IIFE.
                return new iife_emit_scope_1.IifeEmitScope(ngImport, this.linkerEnvironment.translator, this.linkerEnvironment.factory);
            }
            if (!this.emitScopes.has(constantScope)) {
                this.emitScopes.set(constantScope, new emit_scope_1.EmitScope(ngImport, this.linkerEnvironment.translator));
            }
            return this.emitScopes.get(constantScope);
        };
        return FileLinker;
    }());
    exports.FileLinker = FileLinker;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZV9saW5rZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9maWxlX2xpbmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBU0EsNEVBQTJDO0lBRTNDLGtHQUFtRDtJQUNuRCw0R0FBNEQ7SUFFNUQsZ0lBQWlHO0lBRXBGLFFBQUEsYUFBYSxHQUFvQixFQUFXLENBQUM7SUFFMUQ7O09BRUc7SUFDSDtRQUlFLG9CQUNZLGlCQUE2RCxFQUNyRSxTQUF5QixFQUFFLElBQVk7WUFEL0Isc0JBQWlCLEdBQWpCLGlCQUFpQixDQUE0QztZQUhqRSxlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQXNELENBQUM7WUFLakYsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLCtDQUFxQixDQUMzQyxJQUFBLHlDQUFlLEVBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUN2RixJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVEOztXQUVHO1FBQ0gseUNBQW9CLEdBQXBCLFVBQXFCLFVBQWtCO1lBQ3JDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBRUQ7Ozs7Ozs7Ozs7O1dBV0c7UUFDSCwyQ0FBc0IsR0FBdEIsVUFDSSxhQUFxQixFQUFFLElBQW1CLEVBQzFDLGdCQUErRDtZQUNqRSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUNyQixNQUFNLElBQUksS0FBSyxDQUNYLGdHQUNJLElBQUksQ0FBQyxNQUFNLE1BQUcsQ0FBQyxDQUFDO2FBQ3pCO1lBRUQsSUFBTSxPQUFPLEdBQ1QscUJBQVMsQ0FBQyxLQUFLLENBQW9DLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0YsSUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM3QyxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1lBRWhFLElBQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDbkQsSUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM3QyxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ2pGLElBQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRWxGLE9BQU8sU0FBUyxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25ELENBQUM7UUFFRDs7O1dBR0c7UUFDSCwwQ0FBcUIsR0FBckI7O1lBQ0UsSUFBTSxPQUFPLEdBQWdFLEVBQUUsQ0FBQzs7Z0JBQ2hGLEtBQXlDLElBQUEsS0FBQSxzQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFBLDRCQUFFO29CQUF6RCxJQUFBLEtBQUEsZ0NBQTBCLEVBQXpCLGFBQWEsUUFBQSxFQUFFLFNBQVMsUUFBQTtvQkFDbEMsSUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLHFCQUFxQixFQUFFLENBQUM7b0JBQ3JELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxhQUFhLGVBQUEsRUFBRSxVQUFVLFlBQUEsRUFBQyxDQUFDLENBQUM7aUJBQzNDOzs7Ozs7Ozs7WUFDRCxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO1FBRU8saUNBQVksR0FBcEIsVUFDSSxRQUFxQixFQUFFLGdCQUErRDtZQUV4RixJQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNyRSxJQUFJLGFBQWEsS0FBSyxJQUFJLEVBQUU7Z0JBQzFCLHdGQUF3RjtnQkFDeEYsT0FBTyxJQUFJLCtCQUFhLENBQ3BCLFFBQVEsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNsRjtZQUVELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBRTtnQkFDdkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQ2YsYUFBYSxFQUFFLElBQUksc0JBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7YUFDaEY7WUFDRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBRSxDQUFDO1FBQzdDLENBQUM7UUFDSCxpQkFBQztJQUFELENBQUMsQUFsRkQsSUFrRkM7SUFsRlksZ0NBQVUiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7UjNQYXJ0aWFsRGVjbGFyYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0FzdE9iamVjdH0gZnJvbSAnLi4vYXN0L2FzdF92YWx1ZSc7XG5pbXBvcnQge0RlY2xhcmF0aW9uU2NvcGV9IGZyb20gJy4vZGVjbGFyYXRpb25fc2NvcGUnO1xuaW1wb3J0IHtFbWl0U2NvcGV9IGZyb20gJy4vZW1pdF9zY29wZXMvZW1pdF9zY29wZSc7XG5pbXBvcnQge0lpZmVFbWl0U2NvcGV9IGZyb20gJy4vZW1pdF9zY29wZXMvaWlmZV9lbWl0X3Njb3BlJztcbmltcG9ydCB7TGlua2VyRW52aXJvbm1lbnR9IGZyb20gJy4vbGlua2VyX2Vudmlyb25tZW50JztcbmltcG9ydCB7Y3JlYXRlTGlua2VyTWFwLCBQYXJ0aWFsTGlua2VyU2VsZWN0b3J9IGZyb20gJy4vcGFydGlhbF9saW5rZXJzL3BhcnRpYWxfbGlua2VyX3NlbGVjdG9yJztcblxuZXhwb3J0IGNvbnN0IE5PX1NUQVRFTUVOVFM6IFJlYWRvbmx5PGFueVtdPiA9IFtdIGFzIGNvbnN0O1xuXG4vKipcbiAqIFRoaXMgY2xhc3MgaXMgcmVzcG9uc2libGUgZm9yIGxpbmtpbmcgYWxsIHRoZSBwYXJ0aWFsIGRlY2xhcmF0aW9ucyBmb3VuZCBpbiBhIHNpbmdsZSBmaWxlLlxuICovXG5leHBvcnQgY2xhc3MgRmlsZUxpbmtlcjxUQ29uc3RhbnRTY29wZSwgVFN0YXRlbWVudCwgVEV4cHJlc3Npb24+IHtcbiAgcHJpdmF0ZSBsaW5rZXJTZWxlY3RvcjogUGFydGlhbExpbmtlclNlbGVjdG9yPFRFeHByZXNzaW9uPjtcbiAgcHJpdmF0ZSBlbWl0U2NvcGVzID0gbmV3IE1hcDxUQ29uc3RhbnRTY29wZSwgRW1pdFNjb3BlPFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPj4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgbGlua2VyRW52aXJvbm1lbnQ6IExpbmtlckVudmlyb25tZW50PFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPixcbiAgICAgIHNvdXJjZVVybDogQWJzb2x1dGVGc1BhdGgsIGNvZGU6IHN0cmluZykge1xuICAgIHRoaXMubGlua2VyU2VsZWN0b3IgPSBuZXcgUGFydGlhbExpbmtlclNlbGVjdG9yPFRFeHByZXNzaW9uPihcbiAgICAgICAgY3JlYXRlTGlua2VyTWFwKHRoaXMubGlua2VyRW52aXJvbm1lbnQsIHNvdXJjZVVybCwgY29kZSksIHRoaXMubGlua2VyRW52aXJvbm1lbnQubG9nZ2VyLFxuICAgICAgICB0aGlzLmxpbmtlckVudmlyb25tZW50Lm9wdGlvbnMudW5rbm93bkRlY2xhcmF0aW9uVmVyc2lvbkhhbmRsaW5nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdHJ1ZSBpZiB0aGUgZ2l2ZW4gY2FsbGVlIG5hbWUgbWF0Y2hlcyBhIHBhcnRpYWwgZGVjbGFyYXRpb24gdGhhdCBjYW4gYmUgbGlua2VkLlxuICAgKi9cbiAgaXNQYXJ0aWFsRGVjbGFyYXRpb24oY2FsbGVlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMubGlua2VyU2VsZWN0b3Iuc3VwcG9ydHNEZWNsYXJhdGlvbihjYWxsZWVOYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaW5rIHRoZSBtZXRhZGF0YSBleHRyYWN0ZWQgZnJvbSB0aGUgYXJncyBvZiBhIGNhbGwgdG8gYSBwYXJ0aWFsIGRlY2xhcmF0aW9uIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBUaGUgYGRlY2xhcmF0aW9uU2NvcGVgIGlzIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSBzY29wZSBhbmQgc3RyYXRlZ3kgb2YgZW1pc3Npb24gb2YgdGhlIGxpbmtlZFxuICAgKiBkZWZpbml0aW9uIGFuZCBhbnkgc2hhcmVkIGNvbnN0YW50IHN0YXRlbWVudHMuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbkZuIHRoZSBuYW1lIG9mIHRoZSBmdW5jdGlvbiB1c2VkIHRvIGRlY2xhcmUgdGhlIHBhcnRpYWwgZGVjbGFyYXRpb24gLSBlLmcuXG4gICAqICAgICBgybXJtW5nRGVjbGFyZURpcmVjdGl2ZWAuXG4gICAqIEBwYXJhbSBhcmdzIHRoZSBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBkZWNsYXJhdGlvbiBmdW5jdGlvbiwgc2hvdWxkIGJlIGEgc2luZ2xlIG9iamVjdCB0aGF0XG4gICAqICAgICBjb3JyZXNwb25kcyB0byB0aGUgYFIzRGVjbGFyZURpcmVjdGl2ZU1ldGFkYXRhYCBvciBgUjNEZWNsYXJlQ29tcG9uZW50TWV0YWRhdGFgIGludGVyZmFjZXMuXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvblNjb3BlIHRoZSBzY29wZSB0aGF0IGNvbnRhaW5zIHRoaXMgY2FsbCB0byB0aGUgZGVjbGFyYXRpb24gZnVuY3Rpb24uXG4gICAqL1xuICBsaW5rUGFydGlhbERlY2xhcmF0aW9uKFxuICAgICAgZGVjbGFyYXRpb25Gbjogc3RyaW5nLCBhcmdzOiBURXhwcmVzc2lvbltdLFxuICAgICAgZGVjbGFyYXRpb25TY29wZTogRGVjbGFyYXRpb25TY29wZTxUQ29uc3RhbnRTY29wZSwgVEV4cHJlc3Npb24+KTogVEV4cHJlc3Npb24ge1xuICAgIGlmIChhcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBJbnZhbGlkIGZ1bmN0aW9uIGNhbGw6IEl0IHNob3VsZCBoYXZlIG9ubHkgYSBzaW5nbGUgb2JqZWN0IGxpdGVyYWwgYXJndW1lbnQsIGJ1dCBjb250YWluZWQgJHtcbiAgICAgICAgICAgICAgYXJncy5sZW5ndGh9LmApO1xuICAgIH1cblxuICAgIGNvbnN0IG1ldGFPYmogPVxuICAgICAgICBBc3RPYmplY3QucGFyc2U8UjNQYXJ0aWFsRGVjbGFyYXRpb24sIFRFeHByZXNzaW9uPihhcmdzWzBdLCB0aGlzLmxpbmtlckVudmlyb25tZW50Lmhvc3QpO1xuICAgIGNvbnN0IG5nSW1wb3J0ID0gbWV0YU9iai5nZXROb2RlKCduZ0ltcG9ydCcpO1xuICAgIGNvbnN0IGVtaXRTY29wZSA9IHRoaXMuZ2V0RW1pdFNjb3BlKG5nSW1wb3J0LCBkZWNsYXJhdGlvblNjb3BlKTtcblxuICAgIGNvbnN0IG1pblZlcnNpb24gPSBtZXRhT2JqLmdldFN0cmluZygnbWluVmVyc2lvbicpO1xuICAgIGNvbnN0IHZlcnNpb24gPSBtZXRhT2JqLmdldFN0cmluZygndmVyc2lvbicpO1xuICAgIGNvbnN0IGxpbmtlciA9IHRoaXMubGlua2VyU2VsZWN0b3IuZ2V0TGlua2VyKGRlY2xhcmF0aW9uRm4sIG1pblZlcnNpb24sIHZlcnNpb24pO1xuICAgIGNvbnN0IGRlZmluaXRpb24gPSBsaW5rZXIubGlua1BhcnRpYWxEZWNsYXJhdGlvbihlbWl0U2NvcGUuY29uc3RhbnRQb29sLCBtZXRhT2JqKTtcblxuICAgIHJldHVybiBlbWl0U2NvcGUudHJhbnNsYXRlRGVmaW5pdGlvbihkZWZpbml0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYWxsIHRoZSBzaGFyZWQgY29uc3RhbnQgc3RhdGVtZW50cyBhbmQgdGhlaXIgYXNzb2NpYXRlZCBjb25zdGFudCBzY29wZSByZWZlcmVuY2VzLCBzb1xuICAgKiB0aGF0IHRoZXkgY2FuIGJlIGluc2VydGVkIGludG8gdGhlIHNvdXJjZSBjb2RlLlxuICAgKi9cbiAgZ2V0Q29uc3RhbnRTdGF0ZW1lbnRzKCk6IHtjb25zdGFudFNjb3BlOiBUQ29uc3RhbnRTY29wZSwgc3RhdGVtZW50czogVFN0YXRlbWVudFtdfVtdIHtcbiAgICBjb25zdCByZXN1bHRzOiB7Y29uc3RhbnRTY29wZTogVENvbnN0YW50U2NvcGUsIHN0YXRlbWVudHM6IFRTdGF0ZW1lbnRbXX1bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW2NvbnN0YW50U2NvcGUsIGVtaXRTY29wZV0gb2YgdGhpcy5lbWl0U2NvcGVzLmVudHJpZXMoKSkge1xuICAgICAgY29uc3Qgc3RhdGVtZW50cyA9IGVtaXRTY29wZS5nZXRDb25zdGFudFN0YXRlbWVudHMoKTtcbiAgICAgIHJlc3VsdHMucHVzaCh7Y29uc3RhbnRTY29wZSwgc3RhdGVtZW50c30pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RW1pdFNjb3BlKFxuICAgICAgbmdJbXBvcnQ6IFRFeHByZXNzaW9uLCBkZWNsYXJhdGlvblNjb3BlOiBEZWNsYXJhdGlvblNjb3BlPFRDb25zdGFudFNjb3BlLCBURXhwcmVzc2lvbj4pOlxuICAgICAgRW1pdFNjb3BlPFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPiB7XG4gICAgY29uc3QgY29uc3RhbnRTY29wZSA9IGRlY2xhcmF0aW9uU2NvcGUuZ2V0Q29uc3RhbnRTY29wZVJlZihuZ0ltcG9ydCk7XG4gICAgaWYgKGNvbnN0YW50U2NvcGUgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZXJlIGlzIG5vIGNvbnN0YW50IHNjb3BlIHNvIHdlIHdpbGwgZW1pdCBleHRyYSBzdGF0ZW1lbnRzIGludG8gdGhlIGRlZmluaXRpb24gSUlGRS5cbiAgICAgIHJldHVybiBuZXcgSWlmZUVtaXRTY29wZShcbiAgICAgICAgICBuZ0ltcG9ydCwgdGhpcy5saW5rZXJFbnZpcm9ubWVudC50cmFuc2xhdG9yLCB0aGlzLmxpbmtlckVudmlyb25tZW50LmZhY3RvcnkpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5lbWl0U2NvcGVzLmhhcyhjb25zdGFudFNjb3BlKSkge1xuICAgICAgdGhpcy5lbWl0U2NvcGVzLnNldChcbiAgICAgICAgICBjb25zdGFudFNjb3BlLCBuZXcgRW1pdFNjb3BlKG5nSW1wb3J0LCB0aGlzLmxpbmtlckVudmlyb25tZW50LnRyYW5zbGF0b3IpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZW1pdFNjb3Blcy5nZXQoY29uc3RhbnRTY29wZSkhO1xuICB9XG59XG4iXX0=