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
    function createEs2015LinkerPlugin(_a) {
        var fileSystem = _a.fileSystem, logger = _a.logger, options = tslib_1.__rest(_a, ["fileSystem", "logger"]);
        var fileLinker = null;
        return {
            visitor: {
                Program: {
                    /**
                     * Create a new `FileLinker` as we enter each file (`t.Program` in Babel).
                     */
                    enter: function (path) {
                        var _a, _b;
                        assertNull(fileLinker);
                        // Babel can be configured with a `filename` or `relativeFilename` (or both, or neither) -
                        // possibly relative to the optional `cwd` path.
                        var file = path.hub.file;
                        var filename = (_a = file.opts.filename) !== null && _a !== void 0 ? _a : file.opts.filenameRelative;
                        if (!filename) {
                            throw new Error('No filename (nor filenameRelative) provided by Babel. This is required for the linking of partially compiled directives and components.');
                        }
                        var sourceUrl = fileSystem.resolve((_b = file.opts.cwd) !== null && _b !== void 0 ? _b : '.', filename);
                        var linkerEnvironment = linker_1.LinkerEnvironment.create(fileSystem, logger, new babel_ast_host_1.BabelAstHost(), new babel_ast_factory_1.BabelAstFactory(sourceUrl), options);
                        fileLinker = new linker_1.FileLinker(linkerEnvironment, sourceUrl, file.code);
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
                        var calleeName = getCalleeName(call);
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
    function getCalleeName(call) {
        var callee = call.node.callee;
        if (t.isIdentifier(callee)) {
            return callee.name;
        }
        else if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
            return callee.property.name;
        }
        else {
            return null;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXMyMDE1X2xpbmtlcl9wbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL2JhYmVsL3NyYy9lczIwMTVfbGlua2VyX3BsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBU0EsZ0NBQWtDO0lBRWxDLHVEQUFrRjtJQUVsRixrR0FBd0Q7SUFDeEQsNEZBQWtEO0lBQ2xELDBHQUFtRjtJQUluRjs7Ozs7T0FLRztJQUNILFNBQWdCLHdCQUF3QixDQUFDLEVBQXFEO1FBQXBELElBQUEsVUFBVSxnQkFBQSxFQUFFLE1BQU0sWUFBQSxFQUFLLE9BQU8sc0JBQS9CLHdCQUFnQyxDQUFEO1FBRXRFLElBQUksVUFBVSxHQUFrRSxJQUFJLENBQUM7UUFFckYsT0FBTztZQUNMLE9BQU8sRUFBRTtnQkFDUCxPQUFPLEVBQUU7b0JBRVA7O3VCQUVHO29CQUNILEtBQUssRUFBTCxVQUFNLElBQXlCOzt3QkFDN0IsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO3dCQUN2QiwwRkFBMEY7d0JBQzFGLGdEQUFnRDt3QkFDaEQsSUFBTSxJQUFJLEdBQWMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7d0JBQ3RDLElBQU0sUUFBUSxHQUFHLE1BQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLG1DQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7d0JBQ2xFLElBQUksQ0FBQyxRQUFRLEVBQUU7NEJBQ2IsTUFBTSxJQUFJLEtBQUssQ0FDWCx5SUFBeUksQ0FBQyxDQUFDO3lCQUNoSjt3QkFDRCxJQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLE1BQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLG1DQUFJLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQzt3QkFFckUsSUFBTSxpQkFBaUIsR0FBRywwQkFBaUIs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QUcsS0FBSyxJQUFJLEVBQUU7WUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1NBQ3BEO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUyxhQUFhLENBQUksR0FBVztRQUNuQyxJQUFJLEdBQUcsS0FBSyxJQUFJLEVBQUU7WUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO1NBQ3hEO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUyxtQkFBbUIsQ0FBQyxJQUFlLEVBQUUsT0FBZSxFQUFFLElBQVk7UUFDekUsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksZ0JBQWdCLENBQUM7UUFDeEQsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RCxPQUFVLFFBQVEsVUFBSyxLQUFLLENBQUMsT0FBUyxDQUFDO0lBQ3pDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7UGx1Z2luT2JqfSBmcm9tICdAYmFiZWwvY29yZSc7XG5pbXBvcnQge05vZGVQYXRofSBmcm9tICdAYmFiZWwvdHJhdmVyc2UnO1xuaW1wb3J0ICogYXMgdCBmcm9tICdAYmFiZWwvdHlwZXMnO1xuXG5pbXBvcnQge0ZpbGVMaW5rZXIsIGlzRmF0YWxMaW5rZXJFcnJvciwgTGlua2VyRW52aXJvbm1lbnR9IGZyb20gJy4uLy4uLy4uL2xpbmtlcic7XG5cbmltcG9ydCB7QmFiZWxBc3RGYWN0b3J5fSBmcm9tICcuL2FzdC9iYWJlbF9hc3RfZmFjdG9yeSc7XG5pbXBvcnQge0JhYmVsQXN0SG9zdH0gZnJvbSAnLi9hc3QvYmFiZWxfYXN0X2hvc3QnO1xuaW1wb3J0IHtCYWJlbERlY2xhcmF0aW9uU2NvcGUsIENvbnN0YW50U2NvcGVQYXRofSBmcm9tICcuL2JhYmVsX2RlY2xhcmF0aW9uX3Njb3BlJztcbmltcG9ydCB7TGlua2VyUGx1Z2luT3B0aW9uc30gZnJvbSAnLi9saW5rZXJfcGx1Z2luX29wdGlvbnMnO1xuXG5cbi8qKlxuICogQ3JlYXRlIGEgQmFiZWwgcGx1Z2luIHRoYXQgdmlzaXRzIHRoZSBwcm9ncmFtLCBpZGVudGlmeWluZyBhbmQgbGlua2luZyBwYXJ0aWFsIGRlY2xhcmF0aW9ucy5cbiAqXG4gKiBUaGUgcGx1Z2luIGRlbGVnYXRlcyBtb3N0IG9mIGl0cyB3b3JrIHRvIGEgZ2VuZXJpYyBgRmlsZUxpbmtlcmAgZm9yIGVhY2ggZmlsZSAoYHQuUHJvZ3JhbWAgaW5cbiAqIEJhYmVsKSB0aGF0IGlzIHZpc2l0ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFczIwMTVMaW5rZXJQbHVnaW4oe2ZpbGVTeXN0ZW0sIGxvZ2dlciwgLi4ub3B0aW9uc306IExpbmtlclBsdWdpbk9wdGlvbnMpOlxuICAgIFBsdWdpbk9iaiB7XG4gIGxldCBmaWxlTGlua2VyOiBGaWxlTGlua2VyPENvbnN0YW50U2NvcGVQYXRoLCB0LlN0YXRlbWVudCwgdC5FeHByZXNzaW9uPnxudWxsID0gbnVsbDtcblxuICByZXR1cm4ge1xuICAgIHZpc2l0b3I6IHtcbiAgICAgIFByb2dyYW06IHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlIGEgbmV3IGBGaWxlTGlua2VyYCBhcyB3ZSBlbnRlciBlYWNoIGZpbGUgKGB0LlByb2dyYW1gIGluIEJhYmVsKS5cbiAgICAgICAgICovXG4gICAgICAgIGVudGVyKHBhdGg6IE5vZGVQYXRoPHQuUHJvZ3JhbT4pOiB2b2lkIHtcbiAgICAgICAgICBhc3NlcnROdWxsKGZpbGVMaW5rZXIpO1xuICAgICAgICAgIC8vIEJhYmVsIGNhbiBiZSBjb25maWd1cmVkIHdpdGggYSBgZmlsZW5hbWVgIG9yIGByZWxhdGl2ZUZpbGVuYW1lYCAob3IgYm90aCwgb3IgbmVpdGhlcikgLVxuICAgICAgICAgIC8vIHBvc3NpYmx5IHJlbGF0aXZlIHRvIHRoZSBvcHRpb25hbCBgY3dkYCBwYXRoLlxuICAgICAgICAgIGNvbnN0IGZpbGU6IEJhYmVsRmlsZSA9IHBhdGguaHViLmZpbGU7XG4gICAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBmaWxlLm9wdHMuZmlsZW5hbWUgPz8gZmlsZS5vcHRzLmZpbGVuYW1lUmVsYXRpdmU7XG4gICAgICAgICAgaWYgKCFmaWxlbmFtZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgICdObyBmaWxlbmFtZSAobm9yIGZpbGVuYW1lUmVsYXRpdmUpIHByb3ZpZGVkIGJ5IEJhYmVsLiBUaGlzIGlzIHJlcXVpcmVkIGZvciB0aGUgbGlua2luZyBvZiBwYXJ0aWFsbHkgY29tcGlsZWQgZGlyZWN0aXZlcyBhbmQgY29tcG9uZW50cy4nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3Qgc291cmNlVXJsID0gZmlsZVN5c3RlbS5yZXNvbHZlKGZpbGUub3B0cy5jd2QgPz8gJy4nLCBmaWxlbmFtZSk7XG5cbiAgICAgICAgICBjb25zdCBsaW5rZXJFbnZpcm9ubWVudCA9IExpbmtlckVudmlyb25tZW50LmNyZWF0ZTx0LlN0YXRlbWVudCwgdC5FeHByZXNzaW9uPihcbiAgICAgICAgICAgICAgZmlsZVN5c3RlbSwgbG9nZ2VyLCBuZXcgQmFiZWxBc3RIb3N0KCksIG5ldyBCYWJlbEFzdEZhY3Rvcnkoc291cmNlVXJsKSwgb3B0aW9ucyk7XG4gICAgICAgICAgZmlsZUxpbmtlciA9IG5ldyBGaWxlTGlua2VyKGxpbmtlckVudmlyb25tZW50LCBzb3VyY2VVcmwsIGZpbGUuY29kZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIE9uIGV4aXRpbmcgdGhlIGZpbGUsIGluc2VydCBhbnkgc2hhcmVkIGNvbnN0YW50IHN0YXRlbWVudHMgdGhhdCB3ZXJlIGdlbmVyYXRlZCBkdXJpbmdcbiAgICAgICAgICogbGlua2luZyBvZiB0aGUgcGFydGlhbCBkZWNsYXJhdGlvbnMuXG4gICAgICAgICAqL1xuICAgICAgICBleGl0KCk6IHZvaWQge1xuICAgICAgICAgIGFzc2VydE5vdE51bGwoZmlsZUxpbmtlcik7XG4gICAgICAgICAgZm9yIChjb25zdCB7Y29uc3RhbnRTY29wZSwgc3RhdGVtZW50c30gb2YgZmlsZUxpbmtlci5nZXRDb25zdGFudFN0YXRlbWVudHMoKSkge1xuICAgICAgICAgICAgaW5zZXJ0U3RhdGVtZW50cyhjb25zdGFudFNjb3BlLCBzdGF0ZW1lbnRzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZmlsZUxpbmtlciA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAgICogVGVzdCBlYWNoIGNhbGwgZXhwcmVzc2lvbiB0byBzZWUgaWYgaXQgaXMgYSBwYXJ0aWFsIGRlY2xhcmF0aW9uOyBpdCBpZiBpcyB0aGVuIHJlcGxhY2UgaXRcbiAgICAgICAqIHdpdGggdGhlIHJlc3VsdHMgb2YgbGlua2luZyB0aGUgZGVjbGFyYXRpb24uXG4gICAgICAgKi9cbiAgICAgIENhbGxFeHByZXNzaW9uKGNhbGw6IE5vZGVQYXRoPHQuQ2FsbEV4cHJlc3Npb24+KTogdm9pZCB7XG4gICAgICAgIGlmIChmaWxlTGlua2VyID09PSBudWxsKSB7XG4gICAgICAgICAgLy8gQW55IHN0YXRlbWVudHMgdGhhdCBhcmUgaW5zZXJ0ZWQgdXBvbiBwcm9ncmFtIGV4aXQgd2lsbCBiZSB2aXNpdGVkIG91dHNpZGUgb2YgYW4gYWN0aXZlXG4gICAgICAgICAgLy8gbGlua2VyIGNvbnRleHQuIFRoZXNlIGNhbGwgZXhwcmVzc2lvbnMgYXJlIGtub3duIG5vdCB0byBjb250YWluIHBhcnRpYWwgZGVjbGFyYXRpb25zLFxuICAgICAgICAgIC8vIHNvIGl0J3Mgc2FmZSB0byBza2lwIHZpc2l0aW5nIHRob3NlIGNhbGwgZXhwcmVzc2lvbnMuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBjYWxsZWVOYW1lID0gZ2V0Q2FsbGVlTmFtZShjYWxsKTtcbiAgICAgICAgICBpZiAoY2FsbGVlTmFtZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBhcmdzID0gY2FsbC5ub2RlLmFyZ3VtZW50cztcbiAgICAgICAgICBpZiAoIWZpbGVMaW5rZXIuaXNQYXJ0aWFsRGVjbGFyYXRpb24oY2FsbGVlTmFtZSkgfHwgIWlzRXhwcmVzc2lvbkFycmF5KGFyZ3MpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgZGVjbGFyYXRpb25TY29wZSA9IG5ldyBCYWJlbERlY2xhcmF0aW9uU2NvcGUoY2FsbC5zY29wZSk7XG4gICAgICAgICAgY29uc3QgcmVwbGFjZW1lbnQgPSBmaWxlTGlua2VyLmxpbmtQYXJ0aWFsRGVjbGFyYXRpb24oY2FsbGVlTmFtZSwgYXJncywgZGVjbGFyYXRpb25TY29wZSk7XG5cbiAgICAgICAgICBjYWxsLnJlcGxhY2VXaXRoKHJlcGxhY2VtZW50KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGNvbnN0IG5vZGUgPSBpc0ZhdGFsTGlua2VyRXJyb3IoZSkgPyBlLm5vZGUgYXMgdC5Ob2RlIDogY2FsbC5ub2RlO1xuICAgICAgICAgIHRocm93IGJ1aWxkQ29kZUZyYW1lRXJyb3IoY2FsbC5odWIuZmlsZSwgZS5tZXNzYWdlLCBub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBJbnNlcnQgdGhlIGBzdGF0ZW1lbnRzYCBhdCB0aGUgbG9jYXRpb24gZGVmaW5lZCBieSBgcGF0aGAuXG4gKlxuICogVGhlIGFjdHVhbCBpbnNlcnRpb24gc3RyYXRlZ3kgZGVwZW5kcyB1cG9uIHRoZSB0eXBlIG9mIHRoZSBgcGF0aGAuXG4gKi9cbmZ1bmN0aW9uIGluc2VydFN0YXRlbWVudHMocGF0aDogQ29uc3RhbnRTY29wZVBhdGgsIHN0YXRlbWVudHM6IHQuU3RhdGVtZW50W10pOiB2b2lkIHtcbiAgaWYgKHBhdGguaXNGdW5jdGlvbigpKSB7XG4gICAgaW5zZXJ0SW50b0Z1bmN0aW9uKHBhdGgsIHN0YXRlbWVudHMpO1xuICB9IGVsc2UgaWYgKHBhdGguaXNQcm9ncmFtKCkpIHtcbiAgICBpbnNlcnRJbnRvUHJvZ3JhbShwYXRoLCBzdGF0ZW1lbnRzKTtcbiAgfVxufVxuXG4vKipcbiAqIEluc2VydCB0aGUgYHN0YXRlbWVudHNgIGF0IHRoZSB0b3Agb2YgdGhlIGJvZHkgb2YgdGhlIGBmbmAgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGluc2VydEludG9GdW5jdGlvbihmbjogTm9kZVBhdGg8dC5GdW5jdGlvbj4sIHN0YXRlbWVudHM6IHQuU3RhdGVtZW50W10pOiB2b2lkIHtcbiAgY29uc3QgYm9keSA9IGZuLmdldCgnYm9keScpO1xuICBib2R5LnVuc2hpZnRDb250YWluZXIoJ2JvZHknLCBzdGF0ZW1lbnRzKTtcbn1cblxuLyoqXG4gKiBJbnNlcnQgdGhlIGBzdGF0ZW1lbnRzYCBhdCB0aGUgdG9wIG9mIHRoZSBgcHJvZ3JhbWAsIGJlbG93IGFueSBpbXBvcnQgc3RhdGVtZW50cy5cbiAqL1xuZnVuY3Rpb24gaW5zZXJ0SW50b1Byb2dyYW0ocHJvZ3JhbTogTm9kZVBhdGg8dC5Qcm9ncmFtPiwgc3RhdGVtZW50czogdC5TdGF0ZW1lbnRbXSk6IHZvaWQge1xuICBjb25zdCBib2R5ID0gcHJvZ3JhbS5nZXQoJ2JvZHknKTtcbiAgY29uc3QgaW1wb3J0U3RhdGVtZW50cyA9IGJvZHkuZmlsdGVyKHN0YXRlbWVudCA9PiBzdGF0ZW1lbnQuaXNJbXBvcnREZWNsYXJhdGlvbigpKTtcbiAgaWYgKGltcG9ydFN0YXRlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgcHJvZ3JhbS51bnNoaWZ0Q29udGFpbmVyKCdib2R5Jywgc3RhdGVtZW50cyk7XG4gIH0gZWxzZSB7XG4gICAgaW1wb3J0U3RhdGVtZW50c1tpbXBvcnRTdGF0ZW1lbnRzLmxlbmd0aCAtIDFdLmluc2VydEFmdGVyKHN0YXRlbWVudHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldENhbGxlZU5hbWUoY2FsbDogTm9kZVBhdGg8dC5DYWxsRXhwcmVzc2lvbj4pOiBzdHJpbmd8bnVsbCB7XG4gIGNvbnN0IGNhbGxlZSA9IGNhbGwubm9kZS5jYWxsZWU7XG4gIGlmICh0LmlzSWRlbnRpZmllcihjYWxsZWUpKSB7XG4gICAgcmV0dXJuIGNhbGxlZS5uYW1lO1xuICB9IGVsc2UgaWYgKHQuaXNNZW1iZXJFeHByZXNzaW9uKGNhbGxlZSkgJiYgdC5pc0lkZW50aWZpZXIoY2FsbGVlLnByb3BlcnR5KSkge1xuICAgIHJldHVybiBjYWxsZWUucHJvcGVydHkubmFtZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIGFsbCB0aGUgYG5vZGVzYCBhcmUgQmFiZWwgZXhwcmVzc2lvbnMuXG4gKi9cbmZ1bmN0aW9uIGlzRXhwcmVzc2lvbkFycmF5KG5vZGVzOiB0Lk5vZGVbXSk6IG5vZGVzIGlzIHQuRXhwcmVzc2lvbltdIHtcbiAgcmV0dXJuIG5vZGVzLmV2ZXJ5KG5vZGUgPT4gdC5pc0V4cHJlc3Npb24obm9kZSkpO1xufVxuXG4vKipcbiAqIEFzc2VydCB0aGF0IHRoZSBnaXZlbiBgb2JqYCBpcyBgbnVsbGAuXG4gKi9cbmZ1bmN0aW9uIGFzc2VydE51bGw8VD4ob2JqOiBUfG51bGwpOiBhc3NlcnRzIG9iaiBpcyBudWxsIHtcbiAgaWYgKG9iaiAhPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQlVHIC0gZXhwZWN0ZWQgYG9iamAgdG8gYmUgbnVsbCcpO1xuICB9XG59XG5cbi8qKlxuICogQXNzZXJ0IHRoYXQgdGhlIGdpdmVuIGBvYmpgIGlzIG5vdCBgbnVsbGAuXG4gKi9cbmZ1bmN0aW9uIGFzc2VydE5vdE51bGw8VD4ob2JqOiBUfG51bGwpOiBhc3NlcnRzIG9iaiBpcyBUIHtcbiAgaWYgKG9iaiA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQlVHIC0gZXhwZWN0ZWQgYG9iamAgbm90IHRvIGJlIG51bGwnKTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBlcnJvciB0aGF0IGluY2x1ZGVzIHRoZSBjb2RlIGZyYW1lIG9mIHRoZSBgbm9kZWAuXG4gKi9cbmZ1bmN0aW9uIGJ1aWxkQ29kZUZyYW1lRXJyb3IoZmlsZTogQmFiZWxGaWxlLCBtZXNzYWdlOiBzdHJpbmcsIG5vZGU6IHQuTm9kZSk6IHN0cmluZyB7XG4gIGNvbnN0IGZpbGVuYW1lID0gZmlsZS5vcHRzLmZpbGVuYW1lIHx8ICcodW5rbm93biBmaWxlKSc7XG4gIGNvbnN0IGVycm9yID0gZmlsZS5idWlsZENvZGVGcmFtZUVycm9yKG5vZGUsIG1lc3NhZ2UpO1xuICByZXR1cm4gYCR7ZmlsZW5hbWV9OiAke2Vycm9yLm1lc3NhZ2V9YDtcbn1cblxuLyoqXG4gKiBUaGlzIGludGVyZmFjZSBpcyBtYWtpbmcgdXAgZm9yIHRoZSBmYWN0IHRoYXQgdGhlIEJhYmVsIHR5cGluZ3MgZm9yIGBOb2RlUGF0aC5odWIuZmlsZWAgYXJlXG4gKiBsYWNraW5nLlxuICovXG5pbnRlcmZhY2UgQmFiZWxGaWxlIHtcbiAgY29kZTogc3RyaW5nO1xuICBvcHRzOiB7XG4gICAgZmlsZW5hbWU/OiBzdHJpbmcsXG4gICAgZmlsZW5hbWVSZWxhdGl2ZT86IHN0cmluZyxcbiAgICBjd2Q/OiBzdHJpbmcsXG4gIH07XG5cbiAgYnVpbGRDb2RlRnJhbWVFcnJvcihub2RlOiB0Lk5vZGUsIG1lc3NhZ2U6IHN0cmluZyk6IEVycm9yO1xufVxuIl19