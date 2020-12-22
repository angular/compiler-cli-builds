(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/babel/src/es2015_linker_plugin", ["require", "exports", "tslib", "@babel/types", "@angular/compiler-cli/linker", "@angular/compiler-cli/linker/babel/src/ast/babel_ast_factory", "@angular/compiler-cli/linker/babel/src/ast/babel_ast_host", "@angular/compiler-cli/linker/babel/src/babel_declaration_scope"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createEs2015LinkerPlugin = void 0;
    var tslib_1 = require("tslib");
    var t = require("@babel/types");
    var linker_1 = require("@angular/compiler-cli/linker");
    var babel_ast_factory_1 = require("@angular/compiler-cli/linker/babel/src/ast/babel_ast_factory");
    var babel_ast_host_1 = require("@angular/compiler-cli/linker/babel/src/ast/babel_ast_host");
    var babel_declaration_scope_1 = require("@angular/compiler-cli/linker/babel/src/babel_declaration_scope");
    /**
     * Create a Babel plugin that visits the program, identifying and linking partial declarations.
     *
     * The plugin delegates most of its work to a generic `FileLinker` for each file (`t.Program` in
     * Babel) that is visited.
     */
    function createEs2015LinkerPlugin(options) {
        if (options === void 0) { options = {}; }
        var fileLinker = null;
        var linkerEnvironment = linker_1.LinkerEnvironment.create(new babel_ast_host_1.BabelAstHost(), new babel_ast_factory_1.BabelAstFactory(), options);
        return {
            visitor: {
                Program: {
                    /**
                     * Create a new `FileLinker` as we enter each file (`t.Program` in Babel).
                     */
                    enter: function (path) {
                        var _a;
                        assertNull(fileLinker);
                        var file = path.hub.file;
                        fileLinker = new linker_1.FileLinker(linkerEnvironment, (_a = file.opts.filename) !== null && _a !== void 0 ? _a : '', file.code);
                    },
                    /**
                     * On exiting the file, insert any shared constant statements that were generated during
                     * linking of the partial declarations.
                     */
                    exit: function () {
                        var e_1, _a;
                        assertNotNull(fileLinker);
                        try {
                            for (var _b = tslib_1.__values(fileLinker.getConstantStatements()), _c = _b.next(); !_c.done; _c = _b.next()) {
                                var _d = _c.value, constantScope = _d.constantScope, statements = _d.statements;
                                insertStatements(constantScope, statements);
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        fileLinker = null;
                    }
                },
                /**
                 * Test each call expression to see if it is a partial declaration; it if is then replace it
                 * with the results of linking the declaration.
                 */
                CallExpression: function (call) {
                    if (fileLinker === null) {
                        // Any statements that are inserted upon program exit will be visited outside of an active
                        // linker context. These call expressions are known not to contain partial declarations,
                        // so it's safe to skip visiting those call expressions.
                        return;
                    }
                    try {
                        var callee = call.node.callee;
                        if (!t.isExpression(callee)) {
                            return;
                        }
                        var calleeName = linkerEnvironment.host.getSymbolName(callee);
                        if (calleeName === null) {
                            return;
                        }
                        var args = call.node.arguments;
                        if (!fileLinker.isPartialDeclaration(calleeName) || !isExpressionArray(args)) {
                            return;
                        }
                        var declarationScope = new babel_declaration_scope_1.BabelDeclarationScope(call.scope);
                        var replacement = fileLinker.linkPartialDeclaration(calleeName, args, declarationScope);
                        call.replaceWith(replacement);
                    }
                    catch (e) {
                        var node = linker_1.isFatalLinkerError(e) ? e.node : call.node;
                        throw buildCodeFrameError(call.hub.file, e.message, node);
                    }
                }
            }
        };
    }
    exports.createEs2015LinkerPlugin = createEs2015LinkerPlugin;
    /**
     * Insert the `statements` at the location defined by `path`.
     *
     * The actual insertion strategy depends upon the type of the `path`.
     */
    function insertStatements(path, statements) {
        if (path.isFunction()) {
            insertIntoFunction(path, statements);
        }
        else if (path.isProgram()) {
            insertIntoProgram(path, statements);
        }
    }
    /**
     * Insert the `statements` at the top of the body of the `fn` function.
     */
    function insertIntoFunction(fn, statements) {
        var body = fn.get('body');
        body.unshiftContainer('body', statements);
    }
    /**
     * Insert the `statements` at the top of the `program`, below any import statements.
     */
    function insertIntoProgram(program, statements) {
        var body = program.get('body');
        var importStatements = body.filter(function (statement) { return statement.isImportDeclaration(); });
        if (importStatements.length === 0) {
            program.unshiftContainer('body', statements);
        }
        else {
            importStatements[importStatements.length - 1].insertAfter(statements);
        }
    }
    /**
     * Return true if all the `nodes` are Babel expressions.
     */
    function isExpressionArray(nodes) {
        return nodes.every(function (node) { return t.isExpression(node); });
    }
    /**
     * Assert that the given `obj` is `null`.
     */
    function assertNull(obj) {
        if (obj !== null) {
            throw new Error('BUG - expected `obj` to be null');
        }
    }
    /**
     * Assert that the given `obj` is not `null`.
     */
    function assertNotNull(obj) {
        if (obj === null) {
            throw new Error('BUG - expected `obj` not to be null');
        }
    }
    /**
     * Create a string representation of an error that includes the code frame of the `node`.
     */
    function buildCodeFrameError(file, message, node) {
        var filename = file.opts.filename || '(unknown file)';
        var error = file.buildCodeFrameError(node, message);
        return filename + ": " + error.message;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXMyMDE1X2xpbmtlcl9wbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL2JhYmVsL3NyYy9lczIwMTVfbGlua2VyX3BsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBU0EsZ0NBQWtDO0lBRWxDLHVEQUFpRztJQUVqRyxrR0FBd0Q7SUFDeEQsNEZBQWtEO0lBQ2xELDBHQUFtRjtJQUVuRjs7Ozs7T0FLRztJQUNILFNBQWdCLHdCQUF3QixDQUFDLE9BQW9DO1FBQXBDLHdCQUFBLEVBQUEsWUFBb0M7UUFDM0UsSUFBSSxVQUFVLEdBQWtFLElBQUksQ0FBQztRQUVyRixJQUFNLGlCQUFpQixHQUFHLDBCQUFpQixDQUFDLE1BQU0sQ0FDOUMsSUFBSSw2QkFBWSxFQUFFLEVBQUUsSUFBSSxtQ0FBZSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFeEQsT0FBTztZQUNMLE9BQU8sRUFBRTtnQkFDUCxPQUFPLEVBQUU7b0JBRVA7O3VCQUVHO29CQUNILEtBQUssRUFBTCxVQUFNLElBQXlCOzt3QkFDN0IsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO3dCQUN2QixJQUFNLElBQUksR0FBYyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQzt3QkFDdEMsVUFBVSxHQUFHLElBQUksbUJBQVUsQ0FBQyxpQkFBaUIsUUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsbUNBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDdEYsQ0FBQztvQkFFRDs7O3VCQUdHO29CQUNILElBQUksRUFBSjs7d0JBQ0UsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDOzs0QkFDMUIsS0FBMEMsSUFBQSxLQUFBLGlCQUFBLFVBQVUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBLGdCQUFBLDRCQUFFO2dDQUFuRSxJQUFBLGFB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QUFFO1lBQ2pDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7U0FDOUM7YUFBTTtZQUNMLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDdkU7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLGlCQUFpQixDQUFDLEtBQWU7UUFDeEMsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBcEIsQ0FBb0IsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsVUFBVSxDQUFJLEdBQVc7UUFDaEMsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FBQztTQUNwRDtJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsYUFBYSxDQUFJLEdBQVc7UUFDbkMsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQztTQUN4RDtJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsbUJBQW1CLENBQUMsSUFBZSxFQUFFLE9BQWUsRUFBRSxJQUFZO1FBQ3pFLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLGdCQUFnQixDQUFDO1FBQ3hELElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdEQsT0FBVSxRQUFRLFVBQUssS0FBSyxDQUFDLE9BQVMsQ0FBQztJQUN6QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1BsdWdpbk9ian0gZnJvbSAnQGJhYmVsL2NvcmUnO1xuaW1wb3J0IHtOb2RlUGF0aH0gZnJvbSAnQGJhYmVsL3RyYXZlcnNlJztcbmltcG9ydCAqIGFzIHQgZnJvbSAnQGJhYmVsL3R5cGVzJztcblxuaW1wb3J0IHtGaWxlTGlua2VyLCBpc0ZhdGFsTGlua2VyRXJyb3IsIExpbmtlckVudmlyb25tZW50LCBMaW5rZXJPcHRpb25zfSBmcm9tICcuLi8uLi8uLi9saW5rZXInO1xuXG5pbXBvcnQge0JhYmVsQXN0RmFjdG9yeX0gZnJvbSAnLi9hc3QvYmFiZWxfYXN0X2ZhY3RvcnknO1xuaW1wb3J0IHtCYWJlbEFzdEhvc3R9IGZyb20gJy4vYXN0L2JhYmVsX2FzdF9ob3N0JztcbmltcG9ydCB7QmFiZWxEZWNsYXJhdGlvblNjb3BlLCBDb25zdGFudFNjb3BlUGF0aH0gZnJvbSAnLi9iYWJlbF9kZWNsYXJhdGlvbl9zY29wZSc7XG5cbi8qKlxuICogQ3JlYXRlIGEgQmFiZWwgcGx1Z2luIHRoYXQgdmlzaXRzIHRoZSBwcm9ncmFtLCBpZGVudGlmeWluZyBhbmQgbGlua2luZyBwYXJ0aWFsIGRlY2xhcmF0aW9ucy5cbiAqXG4gKiBUaGUgcGx1Z2luIGRlbGVnYXRlcyBtb3N0IG9mIGl0cyB3b3JrIHRvIGEgZ2VuZXJpYyBgRmlsZUxpbmtlcmAgZm9yIGVhY2ggZmlsZSAoYHQuUHJvZ3JhbWAgaW5cbiAqIEJhYmVsKSB0aGF0IGlzIHZpc2l0ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFczIwMTVMaW5rZXJQbHVnaW4ob3B0aW9uczogUGFydGlhbDxMaW5rZXJPcHRpb25zPiA9IHt9KTogUGx1Z2luT2JqIHtcbiAgbGV0IGZpbGVMaW5rZXI6IEZpbGVMaW5rZXI8Q29uc3RhbnRTY29wZVBhdGgsIHQuU3RhdGVtZW50LCB0LkV4cHJlc3Npb24+fG51bGwgPSBudWxsO1xuXG4gIGNvbnN0IGxpbmtlckVudmlyb25tZW50ID0gTGlua2VyRW52aXJvbm1lbnQuY3JlYXRlPHQuU3RhdGVtZW50LCB0LkV4cHJlc3Npb24+KFxuICAgICAgbmV3IEJhYmVsQXN0SG9zdCgpLCBuZXcgQmFiZWxBc3RGYWN0b3J5KCksIG9wdGlvbnMpO1xuXG4gIHJldHVybiB7XG4gICAgdmlzaXRvcjoge1xuICAgICAgUHJvZ3JhbToge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGUgYSBuZXcgYEZpbGVMaW5rZXJgIGFzIHdlIGVudGVyIGVhY2ggZmlsZSAoYHQuUHJvZ3JhbWAgaW4gQmFiZWwpLlxuICAgICAgICAgKi9cbiAgICAgICAgZW50ZXIocGF0aDogTm9kZVBhdGg8dC5Qcm9ncmFtPik6IHZvaWQge1xuICAgICAgICAgIGFzc2VydE51bGwoZmlsZUxpbmtlcik7XG4gICAgICAgICAgY29uc3QgZmlsZTogQmFiZWxGaWxlID0gcGF0aC5odWIuZmlsZTtcbiAgICAgICAgICBmaWxlTGlua2VyID0gbmV3IEZpbGVMaW5rZXIobGlua2VyRW52aXJvbm1lbnQsIGZpbGUub3B0cy5maWxlbmFtZSA/PyAnJywgZmlsZS5jb2RlKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogT24gZXhpdGluZyB0aGUgZmlsZSwgaW5zZXJ0IGFueSBzaGFyZWQgY29uc3RhbnQgc3RhdGVtZW50cyB0aGF0IHdlcmUgZ2VuZXJhdGVkIGR1cmluZ1xuICAgICAgICAgKiBsaW5raW5nIG9mIHRoZSBwYXJ0aWFsIGRlY2xhcmF0aW9ucy5cbiAgICAgICAgICovXG4gICAgICAgIGV4aXQoKTogdm9pZCB7XG4gICAgICAgICAgYXNzZXJ0Tm90TnVsbChmaWxlTGlua2VyKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHtjb25zdGFudFNjb3BlLCBzdGF0ZW1lbnRzfSBvZiBmaWxlTGlua2VyLmdldENvbnN0YW50U3RhdGVtZW50cygpKSB7XG4gICAgICAgICAgICBpbnNlcnRTdGF0ZW1lbnRzKGNvbnN0YW50U2NvcGUsIHN0YXRlbWVudHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmaWxlTGlua2VyID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICAgKiBUZXN0IGVhY2ggY2FsbCBleHByZXNzaW9uIHRvIHNlZSBpZiBpdCBpcyBhIHBhcnRpYWwgZGVjbGFyYXRpb247IGl0IGlmIGlzIHRoZW4gcmVwbGFjZSBpdFxuICAgICAgICogd2l0aCB0aGUgcmVzdWx0cyBvZiBsaW5raW5nIHRoZSBkZWNsYXJhdGlvbi5cbiAgICAgICAqL1xuICAgICAgQ2FsbEV4cHJlc3Npb24oY2FsbDogTm9kZVBhdGg8dC5DYWxsRXhwcmVzc2lvbj4pOiB2b2lkIHtcbiAgICAgICAgaWYgKGZpbGVMaW5rZXIgPT09IG51bGwpIHtcbiAgICAgICAgICAvLyBBbnkgc3RhdGVtZW50cyB0aGF0IGFyZSBpbnNlcnRlZCB1cG9uIHByb2dyYW0gZXhpdCB3aWxsIGJlIHZpc2l0ZWQgb3V0c2lkZSBvZiBhbiBhY3RpdmVcbiAgICAgICAgICAvLyBsaW5rZXIgY29udGV4dC4gVGhlc2UgY2FsbCBleHByZXNzaW9ucyBhcmUga25vd24gbm90IHRvIGNvbnRhaW4gcGFydGlhbCBkZWNsYXJhdGlvbnMsXG4gICAgICAgICAgLy8gc28gaXQncyBzYWZlIHRvIHNraXAgdmlzaXRpbmcgdGhvc2UgY2FsbCBleHByZXNzaW9ucy5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGNhbGxlZSA9IGNhbGwubm9kZS5jYWxsZWU7XG4gICAgICAgICAgaWYgKCF0LmlzRXhwcmVzc2lvbihjYWxsZWUpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGNhbGxlZU5hbWUgPSBsaW5rZXJFbnZpcm9ubWVudC5ob3N0LmdldFN5bWJvbE5hbWUoY2FsbGVlKTtcbiAgICAgICAgICBpZiAoY2FsbGVlTmFtZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBhcmdzID0gY2FsbC5ub2RlLmFyZ3VtZW50cztcbiAgICAgICAgICBpZiAoIWZpbGVMaW5rZXIuaXNQYXJ0aWFsRGVjbGFyYXRpb24oY2FsbGVlTmFtZSkgfHwgIWlzRXhwcmVzc2lvbkFycmF5KGFyZ3MpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgZGVjbGFyYXRpb25TY29wZSA9IG5ldyBCYWJlbERlY2xhcmF0aW9uU2NvcGUoY2FsbC5zY29wZSk7XG4gICAgICAgICAgY29uc3QgcmVwbGFjZW1lbnQgPSBmaWxlTGlua2VyLmxpbmtQYXJ0aWFsRGVjbGFyYXRpb24oY2FsbGVlTmFtZSwgYXJncywgZGVjbGFyYXRpb25TY29wZSk7XG5cbiAgICAgICAgICBjYWxsLnJlcGxhY2VXaXRoKHJlcGxhY2VtZW50KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGNvbnN0IG5vZGUgPSBpc0ZhdGFsTGlua2VyRXJyb3IoZSkgPyBlLm5vZGUgYXMgdC5Ob2RlIDogY2FsbC5ub2RlO1xuICAgICAgICAgIHRocm93IGJ1aWxkQ29kZUZyYW1lRXJyb3IoY2FsbC5odWIuZmlsZSwgZS5tZXNzYWdlLCBub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBJbnNlcnQgdGhlIGBzdGF0ZW1lbnRzYCBhdCB0aGUgbG9jYXRpb24gZGVmaW5lZCBieSBgcGF0aGAuXG4gKlxuICogVGhlIGFjdHVhbCBpbnNlcnRpb24gc3RyYXRlZ3kgZGVwZW5kcyB1cG9uIHRoZSB0eXBlIG9mIHRoZSBgcGF0aGAuXG4gKi9cbmZ1bmN0aW9uIGluc2VydFN0YXRlbWVudHMocGF0aDogQ29uc3RhbnRTY29wZVBhdGgsIHN0YXRlbWVudHM6IHQuU3RhdGVtZW50W10pOiB2b2lkIHtcbiAgaWYgKHBhdGguaXNGdW5jdGlvbigpKSB7XG4gICAgaW5zZXJ0SW50b0Z1bmN0aW9uKHBhdGgsIHN0YXRlbWVudHMpO1xuICB9IGVsc2UgaWYgKHBhdGguaXNQcm9ncmFtKCkpIHtcbiAgICBpbnNlcnRJbnRvUHJvZ3JhbShwYXRoLCBzdGF0ZW1lbnRzKTtcbiAgfVxufVxuXG4vKipcbiAqIEluc2VydCB0aGUgYHN0YXRlbWVudHNgIGF0IHRoZSB0b3Agb2YgdGhlIGJvZHkgb2YgdGhlIGBmbmAgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGluc2VydEludG9GdW5jdGlvbihmbjogTm9kZVBhdGg8dC5GdW5jdGlvbj4sIHN0YXRlbWVudHM6IHQuU3RhdGVtZW50W10pOiB2b2lkIHtcbiAgY29uc3QgYm9keSA9IGZuLmdldCgnYm9keScpO1xuICBib2R5LnVuc2hpZnRDb250YWluZXIoJ2JvZHknLCBzdGF0ZW1lbnRzKTtcbn1cblxuLyoqXG4gKiBJbnNlcnQgdGhlIGBzdGF0ZW1lbnRzYCBhdCB0aGUgdG9wIG9mIHRoZSBgcHJvZ3JhbWAsIGJlbG93IGFueSBpbXBvcnQgc3RhdGVtZW50cy5cbiAqL1xuZnVuY3Rpb24gaW5zZXJ0SW50b1Byb2dyYW0ocHJvZ3JhbTogTm9kZVBhdGg8dC5Qcm9ncmFtPiwgc3RhdGVtZW50czogdC5TdGF0ZW1lbnRbXSk6IHZvaWQge1xuICBjb25zdCBib2R5ID0gcHJvZ3JhbS5nZXQoJ2JvZHknKTtcbiAgY29uc3QgaW1wb3J0U3RhdGVtZW50cyA9IGJvZHkuZmlsdGVyKHN0YXRlbWVudCA9PiBzdGF0ZW1lbnQuaXNJbXBvcnREZWNsYXJhdGlvbigpKTtcbiAgaWYgKGltcG9ydFN0YXRlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgcHJvZ3JhbS51bnNoaWZ0Q29udGFpbmVyKCdib2R5Jywgc3RhdGVtZW50cyk7XG4gIH0gZWxzZSB7XG4gICAgaW1wb3J0U3RhdGVtZW50c1tpbXBvcnRTdGF0ZW1lbnRzLmxlbmd0aCAtIDFdLmluc2VydEFmdGVyKHN0YXRlbWVudHMpO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHRydWUgaWYgYWxsIHRoZSBgbm9kZXNgIGFyZSBCYWJlbCBleHByZXNzaW9ucy5cbiAqL1xuZnVuY3Rpb24gaXNFeHByZXNzaW9uQXJyYXkobm9kZXM6IHQuTm9kZVtdKTogbm9kZXMgaXMgdC5FeHByZXNzaW9uW10ge1xuICByZXR1cm4gbm9kZXMuZXZlcnkobm9kZSA9PiB0LmlzRXhwcmVzc2lvbihub2RlKSk7XG59XG5cbi8qKlxuICogQXNzZXJ0IHRoYXQgdGhlIGdpdmVuIGBvYmpgIGlzIGBudWxsYC5cbiAqL1xuZnVuY3Rpb24gYXNzZXJ0TnVsbDxUPihvYmo6IFR8bnVsbCk6IGFzc2VydHMgb2JqIGlzIG51bGwge1xuICBpZiAob2JqICE9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCVUcgLSBleHBlY3RlZCBgb2JqYCB0byBiZSBudWxsJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBBc3NlcnQgdGhhdCB0aGUgZ2l2ZW4gYG9iamAgaXMgbm90IGBudWxsYC5cbiAqL1xuZnVuY3Rpb24gYXNzZXJ0Tm90TnVsbDxUPihvYmo6IFR8bnVsbCk6IGFzc2VydHMgb2JqIGlzIFQge1xuICBpZiAob2JqID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCVUcgLSBleHBlY3RlZCBgb2JqYCBub3QgdG8gYmUgbnVsbCcpO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGFuIGVycm9yIHRoYXQgaW5jbHVkZXMgdGhlIGNvZGUgZnJhbWUgb2YgdGhlIGBub2RlYC5cbiAqL1xuZnVuY3Rpb24gYnVpbGRDb2RlRnJhbWVFcnJvcihmaWxlOiBCYWJlbEZpbGUsIG1lc3NhZ2U6IHN0cmluZywgbm9kZTogdC5Ob2RlKTogc3RyaW5nIHtcbiAgY29uc3QgZmlsZW5hbWUgPSBmaWxlLm9wdHMuZmlsZW5hbWUgfHwgJyh1bmtub3duIGZpbGUpJztcbiAgY29uc3QgZXJyb3IgPSBmaWxlLmJ1aWxkQ29kZUZyYW1lRXJyb3Iobm9kZSwgbWVzc2FnZSk7XG4gIHJldHVybiBgJHtmaWxlbmFtZX06ICR7ZXJyb3IubWVzc2FnZX1gO1xufVxuXG4vKipcbiAqIFRoaXMgaW50ZXJmYWNlIGlzIG1ha2luZyB1cCBmb3IgdGhlIGZhY3QgdGhhdCB0aGUgQmFiZWwgdHlwaW5ncyBmb3IgYE5vZGVQYXRoLmh1Yi5maWxlYCBhcmVcbiAqIGxhY2tpbmcuXG4gKi9cbmludGVyZmFjZSBCYWJlbEZpbGUge1xuICBjb2RlOiBzdHJpbmc7XG4gIG9wdHM6IHtmaWxlbmFtZT86IHN0cmluZzt9O1xuXG4gIGJ1aWxkQ29kZUZyYW1lRXJyb3Iobm9kZTogdC5Ob2RlLCBtZXNzYWdlOiBzdHJpbmcpOiBFcnJvcjtcbn1cbiJdfQ==