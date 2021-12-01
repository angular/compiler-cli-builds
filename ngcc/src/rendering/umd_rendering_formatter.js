(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/umd_rendering_formatter", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/ngcc/src/rendering/esm5_rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UmdRenderingFormatter = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var esm5_rendering_formatter_1 = require("@angular/compiler-cli/ngcc/src/rendering/esm5_rendering_formatter");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/rendering/utils");
    /**
     * A RenderingFormatter that works with UMD files, instead of `import` and `export` statements
     * the module is an IIFE with a factory function call with dependencies, which are defined in a
     * wrapper function for AMD, CommonJS and global module formats.
     */
    var UmdRenderingFormatter = /** @class */ (function (_super) {
        tslib_1.__extends(UmdRenderingFormatter, _super);
        function UmdRenderingFormatter(fs, umdHost, isCore) {
            var _this = _super.call(this, fs, umdHost, isCore) || this;
            _this.umdHost = umdHost;
            return _this;
        }
        /**
         * Add the imports to the UMD module IIFE.
         *
         * Note that imports at "prepended" to the start of the parameter list of the factory function,
         * and so also to the arguments passed to it when it is called.
         * This is because there are scenarios where the factory function does not accept as many
         * parameters as are passed as argument in the call. For example:
         *
         * ```
         * (function (global, factory) {
         *     typeof exports === 'object' && typeof module !== 'undefined' ?
         *         factory(exports,require('x'),require('z')) :
         *     typeof define === 'function' && define.amd ?
         *         define(['exports', 'x', 'z'], factory) :
         *     (global = global || self, factory(global.myBundle = {}, global.x));
         * }(this, (function (exports, x) { ... }
         * ```
         *
         * (See that the `z` import is not being used by the factory function.)
         */
        UmdRenderingFormatter.prototype.addImports = function (output, imports, file) {
            if (imports.length === 0) {
                return;
            }
            // Assume there is only one UMD module in the file
            var umdModule = this.umdHost.getUmdModule(file);
            if (!umdModule) {
                return;
            }
            var factoryFn = umdModule.factoryFn, factoryCalls = umdModule.factoryCalls;
            // We need to add new `require()` calls for each import in the CommonJS initializer
            renderCommonJsDependencies(output, factoryCalls.commonJs, imports);
            renderCommonJsDependencies(output, factoryCalls.commonJs2, imports);
            renderAmdDependencies(output, factoryCalls.amdDefine, imports);
            renderGlobalDependencies(output, factoryCalls.global, imports);
            renderFactoryParameters(output, factoryFn, imports);
        };
        /**
         * Add the exports to the bottom of the UMD module factory function.
         */
        UmdRenderingFormatter.prototype.addExports = function (output, entryPointBasePath, exports, importManager, file) {
            var _this = this;
            var umdModule = this.umdHost.getUmdModule(file);
            if (!umdModule) {
                return;
            }
            var factoryFunction = umdModule.factoryFn;
            var lastStatement = factoryFunction.body.statements[factoryFunction.body.statements.length - 1];
            var insertionPoint = lastStatement ? lastStatement.getEnd() : factoryFunction.body.getEnd() - 1;
            exports.forEach(function (e) {
                var basePath = utils_1.stripExtension(e.from);
                var relativePath = './' + _this.fs.relative(_this.fs.dirname(entryPointBasePath), basePath);
                var namedImport = entryPointBasePath !== basePath ?
                    importManager.generateNamedImport(relativePath, e.identifier) :
                    { symbol: e.identifier, moduleImport: null };
                var importNamespace = namedImport.moduleImport ? namedImport.moduleImport.text + "." : '';
                var exportStr = "\nexports." + e.identifier + " = " + importNamespace + namedImport.symbol + ";";
                output.appendRight(insertionPoint, exportStr);
            });
        };
        UmdRenderingFormatter.prototype.addDirectExports = function (output, exports, importManager, file) {
            var e_1, _a;
            var umdModule = this.umdHost.getUmdModule(file);
            if (!umdModule) {
                return;
            }
            var factoryFunction = umdModule.factoryFn;
            var lastStatement = factoryFunction.body.statements[factoryFunction.body.statements.length - 1];
            var insertionPoint = lastStatement ? lastStatement.getEnd() : factoryFunction.body.getEnd() - 1;
            try {
                for (var exports_1 = tslib_1.__values(exports), exports_1_1 = exports_1.next(); !exports_1_1.done; exports_1_1 = exports_1.next()) {
                    var e = exports_1_1.value;
                    var namedImport = importManager.generateNamedImport(e.fromModule, e.symbolName);
                    var importNamespace = namedImport.moduleImport ? namedImport.moduleImport.text + "." : '';
                    var exportStr = "\nexports." + e.asAlias + " = " + importNamespace + namedImport.symbol + ";";
                    output.appendRight(insertionPoint, exportStr);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (exports_1_1 && !exports_1_1.done && (_a = exports_1.return)) _a.call(exports_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        /**
         * Add the constants to the top of the UMD factory function.
         */
        UmdRenderingFormatter.prototype.addConstants = function (output, constants, file) {
            if (constants === '') {
                return;
            }
            var umdModule = this.umdHost.getUmdModule(file);
            if (!umdModule) {
                return;
            }
            var factoryFunction = umdModule.factoryFn;
            var firstStatement = factoryFunction.body.statements[0];
            var insertionPoint = firstStatement ? firstStatement.getStart() : factoryFunction.body.getStart() + 1;
            output.appendLeft(insertionPoint, '\n' + constants + '\n');
        };
        return UmdRenderingFormatter;
    }(esm5_rendering_formatter_1.Esm5RenderingFormatter));
    exports.UmdRenderingFormatter = UmdRenderingFormatter;
    /**
     * Add dependencies to the CommonJS/CommonJS2 part of the UMD wrapper function.
     */
    function renderCommonJsDependencies(output, factoryCall, imports) {
        if (factoryCall === null) {
            return;
        }
        var injectionPoint = factoryCall.arguments.length > 0 ?
            // Add extra dependencies before the first argument
            factoryCall.arguments[0].getFullStart() :
            // Backup one char to account for the closing parenthesis on the call
            factoryCall.getEnd() - 1;
        var importString = imports.map(function (i) { return "require('" + i.specifier + "')"; }).join(',');
        output.appendLeft(injectionPoint, importString + (factoryCall.arguments.length > 0 ? ',' : ''));
    }
    /**
     * Add dependencies to the AMD part of the UMD wrapper function.
     */
    function renderAmdDependencies(output, amdDefineCall, imports) {
        if (amdDefineCall === null) {
            return;
        }
        var importString = imports.map(function (i) { return "'" + i.specifier + "'"; }).join(',');
        // The dependency array (if it exists) is the second to last argument
        // `define(id?, dependencies?, factory);`
        var factoryIndex = amdDefineCall.arguments.length - 1;
        var dependencyArray = amdDefineCall.arguments[factoryIndex - 1];
        if (dependencyArray === undefined || !ts.isArrayLiteralExpression(dependencyArray)) {
            // No array provided: `define(factory)` or `define(id, factory)`.
            // Insert a new array in front the `factory` call.
            var injectionPoint = amdDefineCall.arguments[factoryIndex].getFullStart();
            output.appendLeft(injectionPoint, "[" + importString + "],");
        }
        else {
            // Already an array
            var injectionPoint = dependencyArray.elements.length > 0 ?
                // Add imports before the first item.
                dependencyArray.elements[0].getFullStart() :
                // Backup one char to account for the closing square bracket on the array
                dependencyArray.getEnd() - 1;
            output.appendLeft(injectionPoint, importString + (dependencyArray.elements.length > 0 ? ',' : ''));
        }
    }
    /**
     * Add dependencies to the global part of the UMD wrapper function.
     */
    function renderGlobalDependencies(output, factoryCall, imports) {
        if (factoryCall === null) {
            return;
        }
        var injectionPoint = factoryCall.arguments.length > 0 ?
            // Add extra dependencies before the first argument
            factoryCall.arguments[0].getFullStart() :
            // Backup one char to account for the closing parenthesis on the call
            factoryCall.getEnd() - 1;
        var importString = imports.map(function (i) { return "global." + getGlobalIdentifier(i); }).join(',');
        output.appendLeft(injectionPoint, importString + (factoryCall.arguments.length > 0 ? ',' : ''));
    }
    /**
     * Add dependency parameters to the UMD factory function.
     */
    function renderFactoryParameters(output, factoryFunction, imports) {
        var parameters = factoryFunction.parameters;
        var parameterString = imports.map(function (i) { return i.qualifier.text; }).join(',');
        if (parameters.length > 0) {
            var injectionPoint = parameters[0].getFullStart();
            output.appendLeft(injectionPoint, parameterString + ',');
        }
        else {
            // If there are no parameters then the factory function will look like:
            // function () { ... }
            // The AST does not give us a way to find the insertion point - between the two parentheses.
            // So we must use a regular expression on the text of the function.
            var injectionPoint = factoryFunction.getStart() + factoryFunction.getText().indexOf('()') + 1;
            output.appendLeft(injectionPoint, parameterString);
        }
    }
    /**
     * Compute a global identifier for the given import (`i`).
     *
     * The identifier used to access a package when using the "global" form of a UMD bundle usually
     * follows a special format where snake-case is conveted to camelCase and path separators are
     * converted to dots. In addition there are special cases such as `@angular` is mapped to `ng`.
     *
     * For example
     *
     * * `@ns/package/entry-point` => `ns.package.entryPoint`
     * * `@angular/common/testing` => `ng.common.testing`
     * * `@angular/platform-browser-dynamic` => `ng.platformBrowserDynamic`
     *
     * It is possible for packages to specify completely different identifiers for attaching the package
     * to the global, and so there is no guaranteed way to compute this.
     * Currently, this approach appears to work for the known scenarios; also it is not known how common
     * it is to use globals for importing packages.
     *
     * If it turns out that there are packages that are being used via globals, where this approach
     * fails, we should consider implementing a configuration based solution, similar to what would go
     * in a rollup configuration for mapping import paths to global indentifiers.
     */
    function getGlobalIdentifier(i) {
        return i.specifier.replace(/^@angular\//, 'ng.')
            .replace(/^@/, '')
            .replace(/\//g, '.')
            .replace(/[-_]+(.?)/g, function (_, c) { return c.toUpperCase(); })
            .replace(/^./, function (c) { return c.toLowerCase(); });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW1kX3JlbmRlcmluZ19mb3JtYXR0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3VtZF9yZW5kZXJpbmdfZm9ybWF0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFRQSwrQkFBaUM7SUFRakMsOEdBQWtFO0lBQ2xFLHdFQUF1QztJQUV2Qzs7OztPQUlHO0lBQ0g7UUFBMkMsaURBQXNCO1FBQy9ELCtCQUFZLEVBQW9CLEVBQVksT0FBMEIsRUFBRSxNQUFlO1lBQXZGLFlBQ0Usa0JBQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsU0FDM0I7WUFGMkMsYUFBTyxHQUFQLE9BQU8sQ0FBbUI7O1FBRXRFLENBQUM7UUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztXQW1CRztRQUNNLDBDQUFVLEdBQW5CLFVBQW9CLE1BQW1CLEVBQUUsT0FBaUIsRUFBRSxJQUFtQjtZQUM3RSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUN4QixPQUFPO2FBQ1I7WUFFRCxrREFBa0Q7WUFDbEQsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDZCxPQUFPO2FBQ1I7WUFFTSxJQUFBLFNBQVMsR0FBa0IsU0FBUyxVQUEzQixFQUFFLFlBQVksR0FBSSxTQUFTLGFBQWIsQ0FBYztZQUU1QyxtRkFBbUY7WUFDbkYsMEJBQTBCLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbkUsMEJBQTBCLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDcEUscUJBQXFCLENBQUMsTUFBTSxFQUFFLFlBQVks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bUU7WUFDbkUsSUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFDLFFBQVEsRUFBRSxHQUFHLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hHLE1BQU0sQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1NBQ3BEO0lBQ0gsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FxQkc7SUFDSCxTQUFTLG1CQUFtQixDQUFDLENBQVM7UUFDcEMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDO2FBQzNDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO2FBQ2pCLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO2FBQ25CLE9BQU8sQ0FBQyxZQUFZLEVBQUUsVUFBQyxDQUFDLEVBQUUsQ0FBQyxJQUFLLE9BQUEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFmLENBQWUsQ0FBQzthQUNoRCxPQUFPLENBQUMsSUFBSSxFQUFFLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFmLENBQWUsQ0FBQyxDQUFDO0lBQzNDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCBNYWdpY1N0cmluZyBmcm9tICdtYWdpYy1zdHJpbmcnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UGF0aE1hbmlwdWxhdGlvbn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UmVleHBvcnR9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7SW1wb3J0LCBJbXBvcnRNYW5hZ2VyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNsYXRvcic7XG5pbXBvcnQge0V4cG9ydEluZm99IGZyb20gJy4uL2FuYWx5c2lzL3ByaXZhdGVfZGVjbGFyYXRpb25zX2FuYWx5emVyJztcbmltcG9ydCB7VW1kUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvdW1kX2hvc3QnO1xuXG5pbXBvcnQge0VzbTVSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4vZXNtNV9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7c3RyaXBFeHRlbnNpb259IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEEgUmVuZGVyaW5nRm9ybWF0dGVyIHRoYXQgd29ya3Mgd2l0aCBVTUQgZmlsZXMsIGluc3RlYWQgb2YgYGltcG9ydGAgYW5kIGBleHBvcnRgIHN0YXRlbWVudHNcbiAqIHRoZSBtb2R1bGUgaXMgYW4gSUlGRSB3aXRoIGEgZmFjdG9yeSBmdW5jdGlvbiBjYWxsIHdpdGggZGVwZW5kZW5jaWVzLCB3aGljaCBhcmUgZGVmaW5lZCBpbiBhXG4gKiB3cmFwcGVyIGZ1bmN0aW9uIGZvciBBTUQsIENvbW1vbkpTIGFuZCBnbG9iYWwgbW9kdWxlIGZvcm1hdHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBVbWRSZW5kZXJpbmdGb3JtYXR0ZXIgZXh0ZW5kcyBFc201UmVuZGVyaW5nRm9ybWF0dGVyIHtcbiAgY29uc3RydWN0b3IoZnM6IFBhdGhNYW5pcHVsYXRpb24sIHByb3RlY3RlZCB1bWRIb3N0OiBVbWRSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuKSB7XG4gICAgc3VwZXIoZnMsIHVtZEhvc3QsIGlzQ29yZSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHRoZSBpbXBvcnRzIHRvIHRoZSBVTUQgbW9kdWxlIElJRkUuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBpbXBvcnRzIGF0IFwicHJlcGVuZGVkXCIgdG8gdGhlIHN0YXJ0IG9mIHRoZSBwYXJhbWV0ZXIgbGlzdCBvZiB0aGUgZmFjdG9yeSBmdW5jdGlvbixcbiAgICogYW5kIHNvIGFsc28gdG8gdGhlIGFyZ3VtZW50cyBwYXNzZWQgdG8gaXQgd2hlbiBpdCBpcyBjYWxsZWQuXG4gICAqIFRoaXMgaXMgYmVjYXVzZSB0aGVyZSBhcmUgc2NlbmFyaW9zIHdoZXJlIHRoZSBmYWN0b3J5IGZ1bmN0aW9uIGRvZXMgbm90IGFjY2VwdCBhcyBtYW55XG4gICAqIHBhcmFtZXRlcnMgYXMgYXJlIHBhc3NlZCBhcyBhcmd1bWVudCBpbiB0aGUgY2FsbC4gRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiAoZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICAgKiAgICAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID9cbiAgICogICAgICAgICBmYWN0b3J5KGV4cG9ydHMscmVxdWlyZSgneCcpLHJlcXVpcmUoJ3onKSkgOlxuICAgKiAgICAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID9cbiAgICogICAgICAgICBkZWZpbmUoWydleHBvcnRzJywgJ3gnLCAneiddLCBmYWN0b3J5KSA6XG4gICAqICAgICAoZ2xvYmFsID0gZ2xvYmFsIHx8IHNlbGYsIGZhY3RvcnkoZ2xvYmFsLm15QnVuZGxlID0ge30sIGdsb2JhbC54KSk7XG4gICAqIH0odGhpcywgKGZ1bmN0aW9uIChleHBvcnRzLCB4KSB7IC4uLiB9XG4gICAqIGBgYFxuICAgKlxuICAgKiAoU2VlIHRoYXQgdGhlIGB6YCBpbXBvcnQgaXMgbm90IGJlaW5nIHVzZWQgYnkgdGhlIGZhY3RvcnkgZnVuY3Rpb24uKVxuICAgKi9cbiAgb3ZlcnJpZGUgYWRkSW1wb3J0cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBpbXBvcnRzOiBJbXBvcnRbXSwgZmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGlmIChpbXBvcnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEFzc3VtZSB0aGVyZSBpcyBvbmx5IG9uZSBVTUQgbW9kdWxlIGluIHRoZSBmaWxlXG4gICAgY29uc3QgdW1kTW9kdWxlID0gdGhpcy51bWRIb3N0LmdldFVtZE1vZHVsZShmaWxlKTtcbiAgICBpZiAoIXVtZE1vZHVsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHtmYWN0b3J5Rm4sIGZhY3RvcnlDYWxsc30gPSB1bWRNb2R1bGU7XG5cbiAgICAvLyBXZSBuZWVkIHRvIGFkZCBuZXcgYHJlcXVpcmUoKWAgY2FsbHMgZm9yIGVhY2ggaW1wb3J0IGluIHRoZSBDb21tb25KUyBpbml0aWFsaXplclxuICAgIHJlbmRlckNvbW1vbkpzRGVwZW5kZW5jaWVzKG91dHB1dCwgZmFjdG9yeUNhbGxzLmNvbW1vbkpzLCBpbXBvcnRzKTtcbiAgICByZW5kZXJDb21tb25Kc0RlcGVuZGVuY2llcyhvdXRwdXQsIGZhY3RvcnlDYWxscy5jb21tb25KczIsIGltcG9ydHMpO1xuICAgIHJlbmRlckFtZERlcGVuZGVuY2llcyhvdXRwdXQsIGZhY3RvcnlDYWxscy5hbWREZWZpbmUsIGltcG9ydHMpO1xuICAgIHJlbmRlckdsb2JhbERlcGVuZGVuY2llcyhvdXRwdXQsIGZhY3RvcnlDYWxscy5nbG9iYWwsIGltcG9ydHMpO1xuICAgIHJlbmRlckZhY3RvcnlQYXJhbWV0ZXJzKG91dHB1dCwgZmFjdG9yeUZuLCBpbXBvcnRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIGV4cG9ydHMgdG8gdGhlIGJvdHRvbSBvZiB0aGUgVU1EIG1vZHVsZSBmYWN0b3J5IGZ1bmN0aW9uLlxuICAgKi9cbiAgb3ZlcnJpZGUgYWRkRXhwb3J0cyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGVudHJ5UG9pbnRCYXNlUGF0aDogc3RyaW5nLCBleHBvcnRzOiBFeHBvcnRJbmZvW10sXG4gICAgICBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgY29uc3QgdW1kTW9kdWxlID0gdGhpcy51bWRIb3N0LmdldFVtZE1vZHVsZShmaWxlKTtcbiAgICBpZiAoIXVtZE1vZHVsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmYWN0b3J5RnVuY3Rpb24gPSB1bWRNb2R1bGUuZmFjdG9yeUZuO1xuICAgIGNvbnN0IGxhc3RTdGF0ZW1lbnQgPVxuICAgICAgICBmYWN0b3J5RnVuY3Rpb24uYm9keS5zdGF0ZW1lbnRzW2ZhY3RvcnlGdW5jdGlvbi5ib2R5LnN0YXRlbWVudHMubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgaW5zZXJ0aW9uUG9pbnQgPVxuICAgICAgICBsYXN0U3RhdGVtZW50ID8gbGFzdFN0YXRlbWVudC5nZXRFbmQoKSA6IGZhY3RvcnlGdW5jdGlvbi5ib2R5LmdldEVuZCgpIC0gMTtcbiAgICBleHBvcnRzLmZvckVhY2goZSA9PiB7XG4gICAgICBjb25zdCBiYXNlUGF0aCA9IHN0cmlwRXh0ZW5zaW9uKGUuZnJvbSk7XG4gICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSAnLi8nICsgdGhpcy5mcy5yZWxhdGl2ZSh0aGlzLmZzLmRpcm5hbWUoZW50cnlQb2ludEJhc2VQYXRoKSwgYmFzZVBhdGgpO1xuICAgICAgY29uc3QgbmFtZWRJbXBvcnQgPSBlbnRyeVBvaW50QmFzZVBhdGggIT09IGJhc2VQYXRoID9cbiAgICAgICAgICBpbXBvcnRNYW5hZ2VyLmdlbmVyYXRlTmFtZWRJbXBvcnQocmVsYXRpdmVQYXRoLCBlLmlkZW50aWZpZXIpIDpcbiAgICAgICAgICB7c3ltYm9sOiBlLmlkZW50aWZpZXIsIG1vZHVsZUltcG9ydDogbnVsbH07XG4gICAgICBjb25zdCBpbXBvcnROYW1lc3BhY2UgPSBuYW1lZEltcG9ydC5tb2R1bGVJbXBvcnQgPyBgJHtuYW1lZEltcG9ydC5tb2R1bGVJbXBvcnQudGV4dH0uYCA6ICcnO1xuICAgICAgY29uc3QgZXhwb3J0U3RyID0gYFxcbmV4cG9ydHMuJHtlLmlkZW50aWZpZXJ9ID0gJHtpbXBvcnROYW1lc3BhY2V9JHtuYW1lZEltcG9ydC5zeW1ib2x9O2A7XG4gICAgICBvdXRwdXQuYXBwZW5kUmlnaHQoaW5zZXJ0aW9uUG9pbnQsIGV4cG9ydFN0cik7XG4gICAgfSk7XG4gIH1cblxuICBvdmVycmlkZSBhZGREaXJlY3RFeHBvcnRzKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZXhwb3J0czogUmVleHBvcnRbXSwgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlcixcbiAgICAgIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCB1bWRNb2R1bGUgPSB0aGlzLnVtZEhvc3QuZ2V0VW1kTW9kdWxlKGZpbGUpO1xuICAgIGlmICghdW1kTW9kdWxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGZhY3RvcnlGdW5jdGlvbiA9IHVtZE1vZHVsZS5mYWN0b3J5Rm47XG4gICAgY29uc3QgbGFzdFN0YXRlbWVudCA9XG4gICAgICAgIGZhY3RvcnlGdW5jdGlvbi5ib2R5LnN0YXRlbWVudHNbZmFjdG9yeUZ1bmN0aW9uLmJvZHkuc3RhdGVtZW50cy5sZW5ndGggLSAxXTtcbiAgICBjb25zdCBpbnNlcnRpb25Qb2ludCA9XG4gICAgICAgIGxhc3RTdGF0ZW1lbnQgPyBsYXN0U3RhdGVtZW50LmdldEVuZCgpIDogZmFjdG9yeUZ1bmN0aW9uLmJvZHkuZ2V0RW5kKCkgLSAxO1xuICAgIGZvciAoY29uc3QgZSBvZiBleHBvcnRzKSB7XG4gICAgICBjb25zdCBuYW1lZEltcG9ydCA9IGltcG9ydE1hbmFnZXIuZ2VuZXJhdGVOYW1lZEltcG9ydChlLmZyb21Nb2R1bGUsIGUuc3ltYm9sTmFtZSk7XG4gICAgICBjb25zdCBpbXBvcnROYW1lc3BhY2UgPSBuYW1lZEltcG9ydC5tb2R1bGVJbXBvcnQgPyBgJHtuYW1lZEltcG9ydC5tb2R1bGVJbXBvcnQudGV4dH0uYCA6ICcnO1xuICAgICAgY29uc3QgZXhwb3J0U3RyID0gYFxcbmV4cG9ydHMuJHtlLmFzQWxpYXN9ID0gJHtpbXBvcnROYW1lc3BhY2V9JHtuYW1lZEltcG9ydC5zeW1ib2x9O2A7XG4gICAgICBvdXRwdXQuYXBwZW5kUmlnaHQoaW5zZXJ0aW9uUG9pbnQsIGV4cG9ydFN0cik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgY29uc3RhbnRzIHRvIHRoZSB0b3Agb2YgdGhlIFVNRCBmYWN0b3J5IGZ1bmN0aW9uLlxuICAgKi9cbiAgb3ZlcnJpZGUgYWRkQ29uc3RhbnRzKG91dHB1dDogTWFnaWNTdHJpbmcsIGNvbnN0YW50czogc3RyaW5nLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgaWYgKGNvbnN0YW50cyA9PT0gJycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdW1kTW9kdWxlID0gdGhpcy51bWRIb3N0LmdldFVtZE1vZHVsZShmaWxlKTtcbiAgICBpZiAoIXVtZE1vZHVsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmYWN0b3J5RnVuY3Rpb24gPSB1bWRNb2R1bGUuZmFjdG9yeUZuO1xuICAgIGNvbnN0IGZpcnN0U3RhdGVtZW50ID0gZmFjdG9yeUZ1bmN0aW9uLmJvZHkuc3RhdGVtZW50c1swXTtcbiAgICBjb25zdCBpbnNlcnRpb25Qb2ludCA9XG4gICAgICAgIGZpcnN0U3RhdGVtZW50ID8gZmlyc3RTdGF0ZW1lbnQuZ2V0U3RhcnQoKSA6IGZhY3RvcnlGdW5jdGlvbi5ib2R5LmdldFN0YXJ0KCkgKyAxO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluc2VydGlvblBvaW50LCAnXFxuJyArIGNvbnN0YW50cyArICdcXG4nKTtcbiAgfVxufVxuXG4vKipcbiAqIEFkZCBkZXBlbmRlbmNpZXMgdG8gdGhlIENvbW1vbkpTL0NvbW1vbkpTMiBwYXJ0IG9mIHRoZSBVTUQgd3JhcHBlciBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gcmVuZGVyQ29tbW9uSnNEZXBlbmRlbmNpZXMoXG4gICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZmFjdG9yeUNhbGw6IHRzLkNhbGxFeHByZXNzaW9ufG51bGwsIGltcG9ydHM6IEltcG9ydFtdKSB7XG4gIGlmIChmYWN0b3J5Q2FsbCA9PT0gbnVsbCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGluamVjdGlvblBvaW50ID0gZmFjdG9yeUNhbGwuYXJndW1lbnRzLmxlbmd0aCA+IDAgP1xuICAgICAgLy8gQWRkIGV4dHJhIGRlcGVuZGVuY2llcyBiZWZvcmUgdGhlIGZpcnN0IGFyZ3VtZW50XG4gICAgICBmYWN0b3J5Q2FsbC5hcmd1bWVudHNbMF0uZ2V0RnVsbFN0YXJ0KCkgOlxuICAgICAgLy8gQmFja3VwIG9uZSBjaGFyIHRvIGFjY291bnQgZm9yIHRoZSBjbG9zaW5nIHBhcmVudGhlc2lzIG9uIHRoZSBjYWxsXG4gICAgICBmYWN0b3J5Q2FsbC5nZXRFbmQoKSAtIDE7XG4gIGNvbnN0IGltcG9ydFN0cmluZyA9IGltcG9ydHMubWFwKGkgPT4gYHJlcXVpcmUoJyR7aS5zcGVjaWZpZXJ9JylgKS5qb2luKCcsJyk7XG4gIG91dHB1dC5hcHBlbmRMZWZ0KGluamVjdGlvblBvaW50LCBpbXBvcnRTdHJpbmcgKyAoZmFjdG9yeUNhbGwuYXJndW1lbnRzLmxlbmd0aCA+IDAgPyAnLCcgOiAnJykpO1xufVxuXG4vKipcbiAqIEFkZCBkZXBlbmRlbmNpZXMgdG8gdGhlIEFNRCBwYXJ0IG9mIHRoZSBVTUQgd3JhcHBlciBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gcmVuZGVyQW1kRGVwZW5kZW5jaWVzKFxuICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGFtZERlZmluZUNhbGw6IHRzLkNhbGxFeHByZXNzaW9ufG51bGwsIGltcG9ydHM6IEltcG9ydFtdKSB7XG4gIGlmIChhbWREZWZpbmVDYWxsID09PSBudWxsKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgaW1wb3J0U3RyaW5nID0gaW1wb3J0cy5tYXAoaSA9PiBgJyR7aS5zcGVjaWZpZXJ9J2ApLmpvaW4oJywnKTtcbiAgLy8gVGhlIGRlcGVuZGVuY3kgYXJyYXkgKGlmIGl0IGV4aXN0cykgaXMgdGhlIHNlY29uZCB0byBsYXN0IGFyZ3VtZW50XG4gIC8vIGBkZWZpbmUoaWQ/LCBkZXBlbmRlbmNpZXM/LCBmYWN0b3J5KTtgXG4gIGNvbnN0IGZhY3RvcnlJbmRleCA9IGFtZERlZmluZUNhbGwuYXJndW1lbnRzLmxlbmd0aCAtIDE7XG4gIGNvbnN0IGRlcGVuZGVuY3lBcnJheSA9IGFtZERlZmluZUNhbGwuYXJndW1lbnRzW2ZhY3RvcnlJbmRleCAtIDFdO1xuICBpZiAoZGVwZW5kZW5jeUFycmF5ID09PSB1bmRlZmluZWQgfHwgIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZXBlbmRlbmN5QXJyYXkpKSB7XG4gICAgLy8gTm8gYXJyYXkgcHJvdmlkZWQ6IGBkZWZpbmUoZmFjdG9yeSlgIG9yIGBkZWZpbmUoaWQsIGZhY3RvcnkpYC5cbiAgICAvLyBJbnNlcnQgYSBuZXcgYXJyYXkgaW4gZnJvbnQgdGhlIGBmYWN0b3J5YCBjYWxsLlxuICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gYW1kRGVmaW5lQ2FsbC5hcmd1bWVudHNbZmFjdG9yeUluZGV4XS5nZXRGdWxsU3RhcnQoKTtcbiAgICBvdXRwdXQuYXBwZW5kTGVmdChpbmplY3Rpb25Qb2ludCwgYFske2ltcG9ydFN0cmluZ31dLGApO1xuICB9IGVsc2Uge1xuICAgIC8vIEFscmVhZHkgYW4gYXJyYXlcbiAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IGRlcGVuZGVuY3lBcnJheS5lbGVtZW50cy5sZW5ndGggPiAwID9cbiAgICAgICAgLy8gQWRkIGltcG9ydHMgYmVmb3JlIHRoZSBmaXJzdCBpdGVtLlxuICAgICAgICBkZXBlbmRlbmN5QXJyYXkuZWxlbWVudHNbMF0uZ2V0RnVsbFN0YXJ0KCkgOlxuICAgICAgICAvLyBCYWNrdXAgb25lIGNoYXIgdG8gYWNjb3VudCBmb3IgdGhlIGNsb3Npbmcgc3F1YXJlIGJyYWNrZXQgb24gdGhlIGFycmF5XG4gICAgICAgIGRlcGVuZGVuY3lBcnJheS5nZXRFbmQoKSAtIDE7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoXG4gICAgICAgIGluamVjdGlvblBvaW50LCBpbXBvcnRTdHJpbmcgKyAoZGVwZW5kZW5jeUFycmF5LmVsZW1lbnRzLmxlbmd0aCA+IDAgPyAnLCcgOiAnJykpO1xuICB9XG59XG5cbi8qKlxuICogQWRkIGRlcGVuZGVuY2llcyB0byB0aGUgZ2xvYmFsIHBhcnQgb2YgdGhlIFVNRCB3cmFwcGVyIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiByZW5kZXJHbG9iYWxEZXBlbmRlbmNpZXMoXG4gICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZmFjdG9yeUNhbGw6IHRzLkNhbGxFeHByZXNzaW9ufG51bGwsIGltcG9ydHM6IEltcG9ydFtdKSB7XG4gIGlmIChmYWN0b3J5Q2FsbCA9PT0gbnVsbCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGluamVjdGlvblBvaW50ID0gZmFjdG9yeUNhbGwuYXJndW1lbnRzLmxlbmd0aCA+IDAgP1xuICAgICAgLy8gQWRkIGV4dHJhIGRlcGVuZGVuY2llcyBiZWZvcmUgdGhlIGZpcnN0IGFyZ3VtZW50XG4gICAgICBmYWN0b3J5Q2FsbC5hcmd1bWVudHNbMF0uZ2V0RnVsbFN0YXJ0KCkgOlxuICAgICAgLy8gQmFja3VwIG9uZSBjaGFyIHRvIGFjY291bnQgZm9yIHRoZSBjbG9zaW5nIHBhcmVudGhlc2lzIG9uIHRoZSBjYWxsXG4gICAgICBmYWN0b3J5Q2FsbC5nZXRFbmQoKSAtIDE7XG4gIGNvbnN0IGltcG9ydFN0cmluZyA9IGltcG9ydHMubWFwKGkgPT4gYGdsb2JhbC4ke2dldEdsb2JhbElkZW50aWZpZXIoaSl9YCkuam9pbignLCcpO1xuICBvdXRwdXQuYXBwZW5kTGVmdChpbmplY3Rpb25Qb2ludCwgaW1wb3J0U3RyaW5nICsgKGZhY3RvcnlDYWxsLmFyZ3VtZW50cy5sZW5ndGggPiAwID8gJywnIDogJycpKTtcbn1cblxuLyoqXG4gKiBBZGQgZGVwZW5kZW5jeSBwYXJhbWV0ZXJzIHRvIHRoZSBVTUQgZmFjdG9yeSBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gcmVuZGVyRmFjdG9yeVBhcmFtZXRlcnMoXG4gICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZmFjdG9yeUZ1bmN0aW9uOiB0cy5GdW5jdGlvbkV4cHJlc3Npb24sIGltcG9ydHM6IEltcG9ydFtdKSB7XG4gIGNvbnN0IHBhcmFtZXRlcnMgPSBmYWN0b3J5RnVuY3Rpb24ucGFyYW1ldGVycztcbiAgY29uc3QgcGFyYW1ldGVyU3RyaW5nID0gaW1wb3J0cy5tYXAoaSA9PiBpLnF1YWxpZmllci50ZXh0KS5qb2luKCcsJyk7XG4gIGlmIChwYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHBhcmFtZXRlcnNbMF0uZ2V0RnVsbFN0YXJ0KCk7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoaW5qZWN0aW9uUG9pbnQsIHBhcmFtZXRlclN0cmluZyArICcsJyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gSWYgdGhlcmUgYXJlIG5vIHBhcmFtZXRlcnMgdGhlbiB0aGUgZmFjdG9yeSBmdW5jdGlvbiB3aWxsIGxvb2sgbGlrZTpcbiAgICAvLyBmdW5jdGlvbiAoKSB7IC4uLiB9XG4gICAgLy8gVGhlIEFTVCBkb2VzIG5vdCBnaXZlIHVzIGEgd2F5IHRvIGZpbmQgdGhlIGluc2VydGlvbiBwb2ludCAtIGJldHdlZW4gdGhlIHR3byBwYXJlbnRoZXNlcy5cbiAgICAvLyBTbyB3ZSBtdXN0IHVzZSBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBvbiB0aGUgdGV4dCBvZiB0aGUgZnVuY3Rpb24uXG4gICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSBmYWN0b3J5RnVuY3Rpb24uZ2V0U3RhcnQoKSArIGZhY3RvcnlGdW5jdGlvbi5nZXRUZXh0KCkuaW5kZXhPZignKCknKSArIDE7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoaW5qZWN0aW9uUG9pbnQsIHBhcmFtZXRlclN0cmluZyk7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21wdXRlIGEgZ2xvYmFsIGlkZW50aWZpZXIgZm9yIHRoZSBnaXZlbiBpbXBvcnQgKGBpYCkuXG4gKlxuICogVGhlIGlkZW50aWZpZXIgdXNlZCB0byBhY2Nlc3MgYSBwYWNrYWdlIHdoZW4gdXNpbmcgdGhlIFwiZ2xvYmFsXCIgZm9ybSBvZiBhIFVNRCBidW5kbGUgdXN1YWxseVxuICogZm9sbG93cyBhIHNwZWNpYWwgZm9ybWF0IHdoZXJlIHNuYWtlLWNhc2UgaXMgY29udmV0ZWQgdG8gY2FtZWxDYXNlIGFuZCBwYXRoIHNlcGFyYXRvcnMgYXJlXG4gKiBjb252ZXJ0ZWQgdG8gZG90cy4gSW4gYWRkaXRpb24gdGhlcmUgYXJlIHNwZWNpYWwgY2FzZXMgc3VjaCBhcyBgQGFuZ3VsYXJgIGlzIG1hcHBlZCB0byBgbmdgLlxuICpcbiAqIEZvciBleGFtcGxlXG4gKlxuICogKiBgQG5zL3BhY2thZ2UvZW50cnktcG9pbnRgID0+IGBucy5wYWNrYWdlLmVudHJ5UG9pbnRgXG4gKiAqIGBAYW5ndWxhci9jb21tb24vdGVzdGluZ2AgPT4gYG5nLmNvbW1vbi50ZXN0aW5nYFxuICogKiBgQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlci1keW5hbWljYCA9PiBgbmcucGxhdGZvcm1Ccm93c2VyRHluYW1pY2BcbiAqXG4gKiBJdCBpcyBwb3NzaWJsZSBmb3IgcGFja2FnZXMgdG8gc3BlY2lmeSBjb21wbGV0ZWx5IGRpZmZlcmVudCBpZGVudGlmaWVycyBmb3IgYXR0YWNoaW5nIHRoZSBwYWNrYWdlXG4gKiB0byB0aGUgZ2xvYmFsLCBhbmQgc28gdGhlcmUgaXMgbm8gZ3VhcmFudGVlZCB3YXkgdG8gY29tcHV0ZSB0aGlzLlxuICogQ3VycmVudGx5LCB0aGlzIGFwcHJvYWNoIGFwcGVhcnMgdG8gd29yayBmb3IgdGhlIGtub3duIHNjZW5hcmlvczsgYWxzbyBpdCBpcyBub3Qga25vd24gaG93IGNvbW1vblxuICogaXQgaXMgdG8gdXNlIGdsb2JhbHMgZm9yIGltcG9ydGluZyBwYWNrYWdlcy5cbiAqXG4gKiBJZiBpdCB0dXJucyBvdXQgdGhhdCB0aGVyZSBhcmUgcGFja2FnZXMgdGhhdCBhcmUgYmVpbmcgdXNlZCB2aWEgZ2xvYmFscywgd2hlcmUgdGhpcyBhcHByb2FjaFxuICogZmFpbHMsIHdlIHNob3VsZCBjb25zaWRlciBpbXBsZW1lbnRpbmcgYSBjb25maWd1cmF0aW9uIGJhc2VkIHNvbHV0aW9uLCBzaW1pbGFyIHRvIHdoYXQgd291bGQgZ29cbiAqIGluIGEgcm9sbHVwIGNvbmZpZ3VyYXRpb24gZm9yIG1hcHBpbmcgaW1wb3J0IHBhdGhzIHRvIGdsb2JhbCBpbmRlbnRpZmllcnMuXG4gKi9cbmZ1bmN0aW9uIGdldEdsb2JhbElkZW50aWZpZXIoaTogSW1wb3J0KTogc3RyaW5nIHtcbiAgcmV0dXJuIGkuc3BlY2lmaWVyLnJlcGxhY2UoL15AYW5ndWxhclxcLy8sICduZy4nKVxuICAgICAgLnJlcGxhY2UoL15ALywgJycpXG4gICAgICAucmVwbGFjZSgvXFwvL2csICcuJylcbiAgICAgIC5yZXBsYWNlKC9bLV9dKyguPykvZywgKF8sIGMpID0+IGMudG9VcHBlckNhc2UoKSlcbiAgICAgIC5yZXBsYWNlKC9eLi8sIGMgPT4gYy50b0xvd2VyQ2FzZSgpKTtcbn1cbiJdfQ==