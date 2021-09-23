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
        (0, tslib_1.__extends)(UmdRenderingFormatter, _super);
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
            var wrapperFunction = umdModule.wrapperFn;
            // We need to add new `require()` calls for each import in the CommonJS initializer
            renderCommonJsDependencies(output, wrapperFunction, imports);
            renderAmdDependencies(output, wrapperFunction, imports);
            renderGlobalDependencies(output, wrapperFunction, imports);
            renderFactoryParameters(output, wrapperFunction, imports);
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
                var basePath = (0, utils_1.stripExtension)(e.from);
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
                for (var exports_1 = (0, tslib_1.__values)(exports), exports_1_1 = exports_1.next(); !exports_1_1.done; exports_1_1 = exports_1.next()) {
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
     * Add dependencies to the CommonJS part of the UMD wrapper function.
     */
    function renderCommonJsDependencies(output, wrapperFunction, imports) {
        var conditional = find(wrapperFunction.body.statements[0], isCommonJSConditional);
        if (!conditional) {
            return;
        }
        var factoryCall = conditional.whenTrue;
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
    function renderAmdDependencies(output, wrapperFunction, imports) {
        var conditional = find(wrapperFunction.body.statements[0], isAmdConditional);
        if (!conditional) {
            return;
        }
        var amdDefineCall = conditional.whenTrue;
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
    function renderGlobalDependencies(output, wrapperFunction, imports) {
        var globalFactoryCall = find(wrapperFunction.body.statements[0], isGlobalFactoryCall);
        if (!globalFactoryCall) {
            return;
        }
        var injectionPoint = globalFactoryCall.arguments.length > 0 ?
            // Add extra dependencies before the first argument
            globalFactoryCall.arguments[0].getFullStart() :
            // Backup one char to account for the closing parenthesis on the call
            globalFactoryCall.getEnd() - 1;
        var importString = imports.map(function (i) { return "global." + getGlobalIdentifier(i); }).join(',');
        output.appendLeft(injectionPoint, importString + (globalFactoryCall.arguments.length > 0 ? ',' : ''));
    }
    /**
     * Add dependency parameters to the UMD factory function.
     */
    function renderFactoryParameters(output, wrapperFunction, imports) {
        var wrapperCall = wrapperFunction.parent;
        var secondArgument = wrapperCall.arguments[1];
        if (!secondArgument) {
            return;
        }
        // Be resilient to the factory being inside parentheses
        var factoryFunction = ts.isParenthesizedExpression(secondArgument) ? secondArgument.expression : secondArgument;
        if (!ts.isFunctionExpression(factoryFunction)) {
            return;
        }
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
     * Is this node the CommonJS conditional expression in the UMD wrapper?
     */
    function isCommonJSConditional(value) {
        if (!ts.isConditionalExpression(value)) {
            return false;
        }
        if (!ts.isBinaryExpression(value.condition) ||
            value.condition.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) {
            return false;
        }
        if (!oneOfBinaryConditions(value.condition, function (exp) { return isTypeOf(exp, 'exports', 'module'); })) {
            return false;
        }
        if (!ts.isCallExpression(value.whenTrue) || !ts.isIdentifier(value.whenTrue.expression)) {
            return false;
        }
        return value.whenTrue.expression.text === 'factory';
    }
    /**
     * Is this node the AMD conditional expression in the UMD wrapper?
     */
    function isAmdConditional(value) {
        if (!ts.isConditionalExpression(value)) {
            return false;
        }
        if (!ts.isBinaryExpression(value.condition) ||
            value.condition.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) {
            return false;
        }
        if (!oneOfBinaryConditions(value.condition, function (exp) { return isTypeOf(exp, 'define'); })) {
            return false;
        }
        if (!ts.isCallExpression(value.whenTrue) || !ts.isIdentifier(value.whenTrue.expression)) {
            return false;
        }
        return value.whenTrue.expression.text === 'define';
    }
    /**
     * Is this node the call to setup the global dependencies in the UMD wrapper?
     */
    function isGlobalFactoryCall(value) {
        if (ts.isCallExpression(value) && !!value.parent) {
            // Be resilient to the value being part of a comma list
            value = isCommaExpression(value.parent) ? value.parent : value;
            // Be resilient to the value being inside parentheses
            value = ts.isParenthesizedExpression(value.parent) ? value.parent : value;
            return !!value.parent && ts.isConditionalExpression(value.parent) &&
                value.parent.whenFalse === value;
        }
        else {
            return false;
        }
    }
    function isCommaExpression(value) {
        return ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.CommaToken;
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
    function find(node, test) {
        return test(node) ? node : node.forEachChild(function (child) { return find(child, test); });
    }
    function oneOfBinaryConditions(node, test) {
        return test(node.left) || test(node.right);
    }
    function isTypeOf(node) {
        var types = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            types[_i - 1] = arguments[_i];
        }
        return ts.isBinaryExpression(node) && ts.isTypeOfExpression(node.left) &&
            ts.isIdentifier(node.left.expression) && types.indexOf(node.left.expression.text) !== -1;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW1kX3JlbmRlcmluZ19mb3JtYXR0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3VtZF9yZW5kZXJpbmdfZm9ybWF0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFRQSwrQkFBaUM7SUFRakMsOEdBQWtFO0lBQ2xFLHdFQUF1QztJQUt2Qzs7OztPQUlHO0lBQ0g7UUFBMkMsc0RBQXNCO1FBQy9ELCtCQUFZLEVBQW9CLEVBQVksT0FBMEIsRUFBRSxNQUFlO1lBQXZGLFlBQ0Usa0JBQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsU0FDM0I7WUFGMkMsYUFBTyxHQUFQLE9BQU8sQ0FBbUI7O1FBRXRFLENBQUM7UUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztXQW1CRztRQUNNLDBDQUFVLEdBQW5CLFVBQW9CLE1BQW1CLEVBQUUsT0FBaUIsRUFBRSxJQUFtQjtZQUM3RSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUN4QixPQUFPO2FBQ1I7WUFFRCxrREFBa0Q7WUFDbEQsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDZCxPQUFPO2FBQ1I7WUFFRCxJQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO1lBRTVDLG1GQUFtRjtZQUNuRiwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzdELHFCQUFxQixDQUFDLE1BQU0sRUFBRSxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDeEQsd0JBQXdCLENBQUMsTUFBTSxFQUFFLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMzRCx1QkFBdUIsQ0FBQyxNQUFN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LElBQUksQ0FBQyxJQUFJLENBQUM7WUFDbEUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDL0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtQYXRoTWFuaXB1bGF0aW9ufSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtSZWV4cG9ydH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtJbXBvcnQsIEltcG9ydE1hbmFnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2xhdG9yJztcbmltcG9ydCB7RXhwb3J0SW5mb30gZnJvbSAnLi4vYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtVbWRSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC91bWRfaG9zdCc7XG5cbmltcG9ydCB7RXNtNVJlbmRlcmluZ0Zvcm1hdHRlcn0gZnJvbSAnLi9lc201X3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtzdHJpcEV4dGVuc2lvbn0gZnJvbSAnLi91dGlscyc7XG5cbnR5cGUgQ29tbW9uSnNDb25kaXRpb25hbCA9IHRzLkNvbmRpdGlvbmFsRXhwcmVzc2lvbiZ7d2hlblRydWU6IHRzLkNhbGxFeHByZXNzaW9ufTtcbnR5cGUgQW1kQ29uZGl0aW9uYWwgPSB0cy5Db25kaXRpb25hbEV4cHJlc3Npb24me3doZW5UcnVlOiB0cy5DYWxsRXhwcmVzc2lvbn07XG5cbi8qKlxuICogQSBSZW5kZXJpbmdGb3JtYXR0ZXIgdGhhdCB3b3JrcyB3aXRoIFVNRCBmaWxlcywgaW5zdGVhZCBvZiBgaW1wb3J0YCBhbmQgYGV4cG9ydGAgc3RhdGVtZW50c1xuICogdGhlIG1vZHVsZSBpcyBhbiBJSUZFIHdpdGggYSBmYWN0b3J5IGZ1bmN0aW9uIGNhbGwgd2l0aCBkZXBlbmRlbmNpZXMsIHdoaWNoIGFyZSBkZWZpbmVkIGluIGFcbiAqIHdyYXBwZXIgZnVuY3Rpb24gZm9yIEFNRCwgQ29tbW9uSlMgYW5kIGdsb2JhbCBtb2R1bGUgZm9ybWF0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIFVtZFJlbmRlcmluZ0Zvcm1hdHRlciBleHRlbmRzIEVzbTVSZW5kZXJpbmdGb3JtYXR0ZXIge1xuICBjb25zdHJ1Y3RvcihmczogUGF0aE1hbmlwdWxhdGlvbiwgcHJvdGVjdGVkIHVtZEhvc3Q6IFVtZFJlZmxlY3Rpb25Ib3N0LCBpc0NvcmU6IGJvb2xlYW4pIHtcbiAgICBzdXBlcihmcywgdW1kSG9zdCwgaXNDb3JlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIGltcG9ydHMgdG8gdGhlIFVNRCBtb2R1bGUgSUlGRS5cbiAgICpcbiAgICogTm90ZSB0aGF0IGltcG9ydHMgYXQgXCJwcmVwZW5kZWRcIiB0byB0aGUgc3RhcnQgb2YgdGhlIHBhcmFtZXRlciBsaXN0IG9mIHRoZSBmYWN0b3J5IGZ1bmN0aW9uLFxuICAgKiBhbmQgc28gYWxzbyB0byB0aGUgYXJndW1lbnRzIHBhc3NlZCB0byBpdCB3aGVuIGl0IGlzIGNhbGxlZC5cbiAgICogVGhpcyBpcyBiZWNhdXNlIHRoZXJlIGFyZSBzY2VuYXJpb3Mgd2hlcmUgdGhlIGZhY3RvcnkgZnVuY3Rpb24gZG9lcyBub3QgYWNjZXB0IGFzIG1hbnlcbiAgICogcGFyYW1ldGVycyBhcyBhcmUgcGFzc2VkIGFzIGFyZ3VtZW50IGluIHRoZSBjYWxsLiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIChmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gICAqICAgICB0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgP1xuICAgKiAgICAgICAgIGZhY3RvcnkoZXhwb3J0cyxyZXF1aXJlKCd4JykscmVxdWlyZSgneicpKSA6XG4gICAqICAgICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgP1xuICAgKiAgICAgICAgIGRlZmluZShbJ2V4cG9ydHMnLCAneCcsICd6J10sIGZhY3RvcnkpIDpcbiAgICogICAgIChnbG9iYWwgPSBnbG9iYWwgfHwgc2VsZiwgZmFjdG9yeShnbG9iYWwubXlCdW5kbGUgPSB7fSwgZ2xvYmFsLngpKTtcbiAgICogfSh0aGlzLCAoZnVuY3Rpb24gKGV4cG9ydHMsIHgpIHsgLi4uIH1cbiAgICogYGBgXG4gICAqXG4gICAqIChTZWUgdGhhdCB0aGUgYHpgIGltcG9ydCBpcyBub3QgYmVpbmcgdXNlZCBieSB0aGUgZmFjdG9yeSBmdW5jdGlvbi4pXG4gICAqL1xuICBvdmVycmlkZSBhZGRJbXBvcnRzKG91dHB1dDogTWFnaWNTdHJpbmcsIGltcG9ydHM6IEltcG9ydFtdLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgaWYgKGltcG9ydHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQXNzdW1lIHRoZXJlIGlzIG9ubHkgb25lIFVNRCBtb2R1bGUgaW4gdGhlIGZpbGVcbiAgICBjb25zdCB1bWRNb2R1bGUgPSB0aGlzLnVtZEhvc3QuZ2V0VW1kTW9kdWxlKGZpbGUpO1xuICAgIGlmICghdW1kTW9kdWxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgd3JhcHBlckZ1bmN0aW9uID0gdW1kTW9kdWxlLndyYXBwZXJGbjtcblxuICAgIC8vIFdlIG5lZWQgdG8gYWRkIG5ldyBgcmVxdWlyZSgpYCBjYWxscyBmb3IgZWFjaCBpbXBvcnQgaW4gdGhlIENvbW1vbkpTIGluaXRpYWxpemVyXG4gICAgcmVuZGVyQ29tbW9uSnNEZXBlbmRlbmNpZXMob3V0cHV0LCB3cmFwcGVyRnVuY3Rpb24sIGltcG9ydHMpO1xuICAgIHJlbmRlckFtZERlcGVuZGVuY2llcyhvdXRwdXQsIHdyYXBwZXJGdW5jdGlvbiwgaW1wb3J0cyk7XG4gICAgcmVuZGVyR2xvYmFsRGVwZW5kZW5jaWVzKG91dHB1dCwgd3JhcHBlckZ1bmN0aW9uLCBpbXBvcnRzKTtcbiAgICByZW5kZXJGYWN0b3J5UGFyYW1ldGVycyhvdXRwdXQsIHdyYXBwZXJGdW5jdGlvbiwgaW1wb3J0cyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHRoZSBleHBvcnRzIHRvIHRoZSBib3R0b20gb2YgdGhlIFVNRCBtb2R1bGUgZmFjdG9yeSBmdW5jdGlvbi5cbiAgICovXG4gIG92ZXJyaWRlIGFkZEV4cG9ydHMoXG4gICAgICBvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBlbnRyeVBvaW50QmFzZVBhdGg6IHN0cmluZywgZXhwb3J0czogRXhwb3J0SW5mb1tdLFxuICAgICAgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlciwgZmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IHVtZE1vZHVsZSA9IHRoaXMudW1kSG9zdC5nZXRVbWRNb2R1bGUoZmlsZSk7XG4gICAgaWYgKCF1bWRNb2R1bGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZmFjdG9yeUZ1bmN0aW9uID0gdW1kTW9kdWxlLmZhY3RvcnlGbjtcbiAgICBjb25zdCBsYXN0U3RhdGVtZW50ID1cbiAgICAgICAgZmFjdG9yeUZ1bmN0aW9uLmJvZHkuc3RhdGVtZW50c1tmYWN0b3J5RnVuY3Rpb24uYm9keS5zdGF0ZW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGNvbnN0IGluc2VydGlvblBvaW50ID1cbiAgICAgICAgbGFzdFN0YXRlbWVudCA/IGxhc3RTdGF0ZW1lbnQuZ2V0RW5kKCkgOiBmYWN0b3J5RnVuY3Rpb24uYm9keS5nZXRFbmQoKSAtIDE7XG4gICAgZXhwb3J0cy5mb3JFYWNoKGUgPT4ge1xuICAgICAgY29uc3QgYmFzZVBhdGggPSBzdHJpcEV4dGVuc2lvbihlLmZyb20pO1xuICAgICAgY29uc3QgcmVsYXRpdmVQYXRoID0gJy4vJyArIHRoaXMuZnMucmVsYXRpdmUodGhpcy5mcy5kaXJuYW1lKGVudHJ5UG9pbnRCYXNlUGF0aCksIGJhc2VQYXRoKTtcbiAgICAgIGNvbnN0IG5hbWVkSW1wb3J0ID0gZW50cnlQb2ludEJhc2VQYXRoICE9PSBiYXNlUGF0aCA/XG4gICAgICAgICAgaW1wb3J0TWFuYWdlci5nZW5lcmF0ZU5hbWVkSW1wb3J0KHJlbGF0aXZlUGF0aCwgZS5pZGVudGlmaWVyKSA6XG4gICAgICAgICAge3N5bWJvbDogZS5pZGVudGlmaWVyLCBtb2R1bGVJbXBvcnQ6IG51bGx9O1xuICAgICAgY29uc3QgaW1wb3J0TmFtZXNwYWNlID0gbmFtZWRJbXBvcnQubW9kdWxlSW1wb3J0ID8gYCR7bmFtZWRJbXBvcnQubW9kdWxlSW1wb3J0LnRleHR9LmAgOiAnJztcbiAgICAgIGNvbnN0IGV4cG9ydFN0ciA9IGBcXG5leHBvcnRzLiR7ZS5pZGVudGlmaWVyfSA9ICR7aW1wb3J0TmFtZXNwYWNlfSR7bmFtZWRJbXBvcnQuc3ltYm9sfTtgO1xuICAgICAgb3V0cHV0LmFwcGVuZFJpZ2h0KGluc2VydGlvblBvaW50LCBleHBvcnRTdHIpO1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgYWRkRGlyZWN0RXhwb3J0cyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGV4cG9ydHM6IFJlZXhwb3J0W10sIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIsXG4gICAgICBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgY29uc3QgdW1kTW9kdWxlID0gdGhpcy51bWRIb3N0LmdldFVtZE1vZHVsZShmaWxlKTtcbiAgICBpZiAoIXVtZE1vZHVsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmYWN0b3J5RnVuY3Rpb24gPSB1bWRNb2R1bGUuZmFjdG9yeUZuO1xuICAgIGNvbnN0IGxhc3RTdGF0ZW1lbnQgPVxuICAgICAgICBmYWN0b3J5RnVuY3Rpb24uYm9keS5zdGF0ZW1lbnRzW2ZhY3RvcnlGdW5jdGlvbi5ib2R5LnN0YXRlbWVudHMubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgaW5zZXJ0aW9uUG9pbnQgPVxuICAgICAgICBsYXN0U3RhdGVtZW50ID8gbGFzdFN0YXRlbWVudC5nZXRFbmQoKSA6IGZhY3RvcnlGdW5jdGlvbi5ib2R5LmdldEVuZCgpIC0gMTtcbiAgICBmb3IgKGNvbnN0IGUgb2YgZXhwb3J0cykge1xuICAgICAgY29uc3QgbmFtZWRJbXBvcnQgPSBpbXBvcnRNYW5hZ2VyLmdlbmVyYXRlTmFtZWRJbXBvcnQoZS5mcm9tTW9kdWxlLCBlLnN5bWJvbE5hbWUpO1xuICAgICAgY29uc3QgaW1wb3J0TmFtZXNwYWNlID0gbmFtZWRJbXBvcnQubW9kdWxlSW1wb3J0ID8gYCR7bmFtZWRJbXBvcnQubW9kdWxlSW1wb3J0LnRleHR9LmAgOiAnJztcbiAgICAgIGNvbnN0IGV4cG9ydFN0ciA9IGBcXG5leHBvcnRzLiR7ZS5hc0FsaWFzfSA9ICR7aW1wb3J0TmFtZXNwYWNlfSR7bmFtZWRJbXBvcnQuc3ltYm9sfTtgO1xuICAgICAgb3V0cHV0LmFwcGVuZFJpZ2h0KGluc2VydGlvblBvaW50LCBleHBvcnRTdHIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIGNvbnN0YW50cyB0byB0aGUgdG9wIG9mIHRoZSBVTUQgZmFjdG9yeSBmdW5jdGlvbi5cbiAgICovXG4gIG92ZXJyaWRlIGFkZENvbnN0YW50cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBjb25zdGFudHM6IHN0cmluZywgZmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGlmIChjb25zdGFudHMgPT09ICcnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHVtZE1vZHVsZSA9IHRoaXMudW1kSG9zdC5nZXRVbWRNb2R1bGUoZmlsZSk7XG4gICAgaWYgKCF1bWRNb2R1bGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZmFjdG9yeUZ1bmN0aW9uID0gdW1kTW9kdWxlLmZhY3RvcnlGbjtcbiAgICBjb25zdCBmaXJzdFN0YXRlbWVudCA9IGZhY3RvcnlGdW5jdGlvbi5ib2R5LnN0YXRlbWVudHNbMF07XG4gICAgY29uc3QgaW5zZXJ0aW9uUG9pbnQgPVxuICAgICAgICBmaXJzdFN0YXRlbWVudCA/IGZpcnN0U3RhdGVtZW50LmdldFN0YXJ0KCkgOiBmYWN0b3J5RnVuY3Rpb24uYm9keS5nZXRTdGFydCgpICsgMTtcbiAgICBvdXRwdXQuYXBwZW5kTGVmdChpbnNlcnRpb25Qb2ludCwgJ1xcbicgKyBjb25zdGFudHMgKyAnXFxuJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBBZGQgZGVwZW5kZW5jaWVzIHRvIHRoZSBDb21tb25KUyBwYXJ0IG9mIHRoZSBVTUQgd3JhcHBlciBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gcmVuZGVyQ29tbW9uSnNEZXBlbmRlbmNpZXMoXG4gICAgb3V0cHV0OiBNYWdpY1N0cmluZywgd3JhcHBlckZ1bmN0aW9uOiB0cy5GdW5jdGlvbkV4cHJlc3Npb24sIGltcG9ydHM6IEltcG9ydFtdKSB7XG4gIGNvbnN0IGNvbmRpdGlvbmFsID0gZmluZCh3cmFwcGVyRnVuY3Rpb24uYm9keS5zdGF0ZW1lbnRzWzBdLCBpc0NvbW1vbkpTQ29uZGl0aW9uYWwpO1xuICBpZiAoIWNvbmRpdGlvbmFsKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGZhY3RvcnlDYWxsID0gY29uZGl0aW9uYWwud2hlblRydWU7XG4gIGNvbnN0IGluamVjdGlvblBvaW50ID0gZmFjdG9yeUNhbGwuYXJndW1lbnRzLmxlbmd0aCA+IDAgP1xuICAgICAgLy8gQWRkIGV4dHJhIGRlcGVuZGVuY2llcyBiZWZvcmUgdGhlIGZpcnN0IGFyZ3VtZW50XG4gICAgICBmYWN0b3J5Q2FsbC5hcmd1bWVudHNbMF0uZ2V0RnVsbFN0YXJ0KCkgOlxuICAgICAgLy8gQmFja3VwIG9uZSBjaGFyIHRvIGFjY291bnQgZm9yIHRoZSBjbG9zaW5nIHBhcmVudGhlc2lzIG9uIHRoZSBjYWxsXG4gICAgICBmYWN0b3J5Q2FsbC5nZXRFbmQoKSAtIDE7XG4gIGNvbnN0IGltcG9ydFN0cmluZyA9IGltcG9ydHMubWFwKGkgPT4gYHJlcXVpcmUoJyR7aS5zcGVjaWZpZXJ9JylgKS5qb2luKCcsJyk7XG4gIG91dHB1dC5hcHBlbmRMZWZ0KGluamVjdGlvblBvaW50LCBpbXBvcnRTdHJpbmcgKyAoZmFjdG9yeUNhbGwuYXJndW1lbnRzLmxlbmd0aCA+IDAgPyAnLCcgOiAnJykpO1xufVxuXG4vKipcbiAqIEFkZCBkZXBlbmRlbmNpZXMgdG8gdGhlIEFNRCBwYXJ0IG9mIHRoZSBVTUQgd3JhcHBlciBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gcmVuZGVyQW1kRGVwZW5kZW5jaWVzKFxuICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIHdyYXBwZXJGdW5jdGlvbjogdHMuRnVuY3Rpb25FeHByZXNzaW9uLCBpbXBvcnRzOiBJbXBvcnRbXSkge1xuICBjb25zdCBjb25kaXRpb25hbCA9IGZpbmQod3JhcHBlckZ1bmN0aW9uLmJvZHkuc3RhdGVtZW50c1swXSwgaXNBbWRDb25kaXRpb25hbCk7XG4gIGlmICghY29uZGl0aW9uYWwpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgYW1kRGVmaW5lQ2FsbCA9IGNvbmRpdGlvbmFsLndoZW5UcnVlO1xuICBjb25zdCBpbXBvcnRTdHJpbmcgPSBpbXBvcnRzLm1hcChpID0+IGAnJHtpLnNwZWNpZmllcn0nYCkuam9pbignLCcpO1xuICAvLyBUaGUgZGVwZW5kZW5jeSBhcnJheSAoaWYgaXQgZXhpc3RzKSBpcyB0aGUgc2Vjb25kIHRvIGxhc3QgYXJndW1lbnRcbiAgLy8gYGRlZmluZShpZD8sIGRlcGVuZGVuY2llcz8sIGZhY3RvcnkpO2BcbiAgY29uc3QgZmFjdG9yeUluZGV4ID0gYW1kRGVmaW5lQ2FsbC5hcmd1bWVudHMubGVuZ3RoIC0gMTtcbiAgY29uc3QgZGVwZW5kZW5jeUFycmF5ID0gYW1kRGVmaW5lQ2FsbC5hcmd1bWVudHNbZmFjdG9yeUluZGV4IC0gMV07XG4gIGlmIChkZXBlbmRlbmN5QXJyYXkgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGRlcGVuZGVuY3lBcnJheSkpIHtcbiAgICAvLyBObyBhcnJheSBwcm92aWRlZDogYGRlZmluZShmYWN0b3J5KWAgb3IgYGRlZmluZShpZCwgZmFjdG9yeSlgLlxuICAgIC8vIEluc2VydCBhIG5ldyBhcnJheSBpbiBmcm9udCB0aGUgYGZhY3RvcnlgIGNhbGwuXG4gICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSBhbWREZWZpbmVDYWxsLmFyZ3VtZW50c1tmYWN0b3J5SW5kZXhdLmdldEZ1bGxTdGFydCgpO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluamVjdGlvblBvaW50LCBgWyR7aW1wb3J0U3RyaW5nfV0sYCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQWxyZWFkeSBhbiBhcnJheVxuICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gZGVwZW5kZW5jeUFycmF5LmVsZW1lbnRzLmxlbmd0aCA+IDAgP1xuICAgICAgICAvLyBBZGQgaW1wb3J0cyBiZWZvcmUgdGhlIGZpcnN0IGl0ZW0uXG4gICAgICAgIGRlcGVuZGVuY3lBcnJheS5lbGVtZW50c1swXS5nZXRGdWxsU3RhcnQoKSA6XG4gICAgICAgIC8vIEJhY2t1cCBvbmUgY2hhciB0byBhY2NvdW50IGZvciB0aGUgY2xvc2luZyBzcXVhcmUgYnJhY2tldCBvbiB0aGUgYXJyYXlcbiAgICAgICAgZGVwZW5kZW5jeUFycmF5LmdldEVuZCgpIC0gMTtcbiAgICBvdXRwdXQuYXBwZW5kTGVmdChcbiAgICAgICAgaW5qZWN0aW9uUG9pbnQsIGltcG9ydFN0cmluZyArIChkZXBlbmRlbmN5QXJyYXkuZWxlbWVudHMubGVuZ3RoID4gMCA/ICcsJyA6ICcnKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBZGQgZGVwZW5kZW5jaWVzIHRvIHRoZSBnbG9iYWwgcGFydCBvZiB0aGUgVU1EIHdyYXBwZXIgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIHJlbmRlckdsb2JhbERlcGVuZGVuY2llcyhcbiAgICBvdXRwdXQ6IE1hZ2ljU3RyaW5nLCB3cmFwcGVyRnVuY3Rpb246IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbiwgaW1wb3J0czogSW1wb3J0W10pIHtcbiAgY29uc3QgZ2xvYmFsRmFjdG9yeUNhbGwgPSBmaW5kKHdyYXBwZXJGdW5jdGlvbi5ib2R5LnN0YXRlbWVudHNbMF0sIGlzR2xvYmFsRmFjdG9yeUNhbGwpO1xuICBpZiAoIWdsb2JhbEZhY3RvcnlDYWxsKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGluamVjdGlvblBvaW50ID0gZ2xvYmFsRmFjdG9yeUNhbGwuYXJndW1lbnRzLmxlbmd0aCA+IDAgP1xuICAgICAgLy8gQWRkIGV4dHJhIGRlcGVuZGVuY2llcyBiZWZvcmUgdGhlIGZpcnN0IGFyZ3VtZW50XG4gICAgICBnbG9iYWxGYWN0b3J5Q2FsbC5hcmd1bWVudHNbMF0uZ2V0RnVsbFN0YXJ0KCkgOlxuICAgICAgLy8gQmFja3VwIG9uZSBjaGFyIHRvIGFjY291bnQgZm9yIHRoZSBjbG9zaW5nIHBhcmVudGhlc2lzIG9uIHRoZSBjYWxsXG4gICAgICBnbG9iYWxGYWN0b3J5Q2FsbC5nZXRFbmQoKSAtIDE7XG4gIGNvbnN0IGltcG9ydFN0cmluZyA9IGltcG9ydHMubWFwKGkgPT4gYGdsb2JhbC4ke2dldEdsb2JhbElkZW50aWZpZXIoaSl9YCkuam9pbignLCcpO1xuICBvdXRwdXQuYXBwZW5kTGVmdChcbiAgICAgIGluamVjdGlvblBvaW50LCBpbXBvcnRTdHJpbmcgKyAoZ2xvYmFsRmFjdG9yeUNhbGwuYXJndW1lbnRzLmxlbmd0aCA+IDAgPyAnLCcgOiAnJykpO1xufVxuXG4vKipcbiAqIEFkZCBkZXBlbmRlbmN5IHBhcmFtZXRlcnMgdG8gdGhlIFVNRCBmYWN0b3J5IGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiByZW5kZXJGYWN0b3J5UGFyYW1ldGVycyhcbiAgICBvdXRwdXQ6IE1hZ2ljU3RyaW5nLCB3cmFwcGVyRnVuY3Rpb246IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbiwgaW1wb3J0czogSW1wb3J0W10pIHtcbiAgY29uc3Qgd3JhcHBlckNhbGwgPSB3cmFwcGVyRnVuY3Rpb24ucGFyZW50IGFzIHRzLkNhbGxFeHByZXNzaW9uO1xuICBjb25zdCBzZWNvbmRBcmd1bWVudCA9IHdyYXBwZXJDYWxsLmFyZ3VtZW50c1sxXTtcbiAgaWYgKCFzZWNvbmRBcmd1bWVudCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEJlIHJlc2lsaWVudCB0byB0aGUgZmFjdG9yeSBiZWluZyBpbnNpZGUgcGFyZW50aGVzZXNcbiAgY29uc3QgZmFjdG9yeUZ1bmN0aW9uID1cbiAgICAgIHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24oc2Vjb25kQXJndW1lbnQpID8gc2Vjb25kQXJndW1lbnQuZXhwcmVzc2lvbiA6IHNlY29uZEFyZ3VtZW50O1xuICBpZiAoIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGZhY3RvcnlGdW5jdGlvbikpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBwYXJhbWV0ZXJzID0gZmFjdG9yeUZ1bmN0aW9uLnBhcmFtZXRlcnM7XG4gIGNvbnN0IHBhcmFtZXRlclN0cmluZyA9IGltcG9ydHMubWFwKGkgPT4gaS5xdWFsaWZpZXIudGV4dCkuam9pbignLCcpO1xuICBpZiAocGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSBwYXJhbWV0ZXJzWzBdLmdldEZ1bGxTdGFydCgpO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluamVjdGlvblBvaW50LCBwYXJhbWV0ZXJTdHJpbmcgKyAnLCcpO1xuICB9IGVsc2Uge1xuICAgIC8vIElmIHRoZXJlIGFyZSBubyBwYXJhbWV0ZXJzIHRoZW4gdGhlIGZhY3RvcnkgZnVuY3Rpb24gd2lsbCBsb29rIGxpa2U6XG4gICAgLy8gZnVuY3Rpb24gKCkgeyAuLi4gfVxuICAgIC8vIFRoZSBBU1QgZG9lcyBub3QgZ2l2ZSB1cyBhIHdheSB0byBmaW5kIHRoZSBpbnNlcnRpb24gcG9pbnQgLSBiZXR3ZWVuIHRoZSB0d28gcGFyZW50aGVzZXMuXG4gICAgLy8gU28gd2UgbXVzdCB1c2UgYSByZWd1bGFyIGV4cHJlc3Npb24gb24gdGhlIHRleHQgb2YgdGhlIGZ1bmN0aW9uLlxuICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gZmFjdG9yeUZ1bmN0aW9uLmdldFN0YXJ0KCkgKyBmYWN0b3J5RnVuY3Rpb24uZ2V0VGV4dCgpLmluZGV4T2YoJygpJykgKyAxO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluamVjdGlvblBvaW50LCBwYXJhbWV0ZXJTdHJpbmcpO1xuICB9XG59XG5cbi8qKlxuICogSXMgdGhpcyBub2RlIHRoZSBDb21tb25KUyBjb25kaXRpb25hbCBleHByZXNzaW9uIGluIHRoZSBVTUQgd3JhcHBlcj9cbiAqL1xuZnVuY3Rpb24gaXNDb21tb25KU0NvbmRpdGlvbmFsKHZhbHVlOiB0cy5Ob2RlKTogdmFsdWUgaXMgQ29tbW9uSnNDb25kaXRpb25hbCB7XG4gIGlmICghdHMuaXNDb25kaXRpb25hbEV4cHJlc3Npb24odmFsdWUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghdHMuaXNCaW5hcnlFeHByZXNzaW9uKHZhbHVlLmNvbmRpdGlvbikgfHxcbiAgICAgIHZhbHVlLmNvbmRpdGlvbi5vcGVyYXRvclRva2VuLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCFvbmVPZkJpbmFyeUNvbmRpdGlvbnModmFsdWUuY29uZGl0aW9uLCAoZXhwKSA9PiBpc1R5cGVPZihleHAsICdleHBvcnRzJywgJ21vZHVsZScpKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24odmFsdWUud2hlblRydWUpIHx8ICF0cy5pc0lkZW50aWZpZXIodmFsdWUud2hlblRydWUuZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHZhbHVlLndoZW5UcnVlLmV4cHJlc3Npb24udGV4dCA9PT0gJ2ZhY3RvcnknO1xufVxuXG4vKipcbiAqIElzIHRoaXMgbm9kZSB0aGUgQU1EIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gaW4gdGhlIFVNRCB3cmFwcGVyP1xuICovXG5mdW5jdGlvbiBpc0FtZENvbmRpdGlvbmFsKHZhbHVlOiB0cy5Ob2RlKTogdmFsdWUgaXMgQW1kQ29uZGl0aW9uYWwge1xuICBpZiAoIXRzLmlzQ29uZGl0aW9uYWxFeHByZXNzaW9uKHZhbHVlKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIXRzLmlzQmluYXJ5RXhwcmVzc2lvbih2YWx1ZS5jb25kaXRpb24pIHx8XG4gICAgICB2YWx1ZS5jb25kaXRpb24ub3BlcmF0b3JUb2tlbi5raW5kICE9PSB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghb25lT2ZCaW5hcnlDb25kaXRpb25zKHZhbHVlLmNvbmRpdGlvbiwgKGV4cCkgPT4gaXNUeXBlT2YoZXhwLCAnZGVmaW5lJykpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbih2YWx1ZS53aGVuVHJ1ZSkgfHwgIXRzLmlzSWRlbnRpZmllcih2YWx1ZS53aGVuVHJ1ZS5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdmFsdWUud2hlblRydWUuZXhwcmVzc2lvbi50ZXh0ID09PSAnZGVmaW5lJztcbn1cblxuLyoqXG4gKiBJcyB0aGlzIG5vZGUgdGhlIGNhbGwgdG8gc2V0dXAgdGhlIGdsb2JhbCBkZXBlbmRlbmNpZXMgaW4gdGhlIFVNRCB3cmFwcGVyP1xuICovXG5mdW5jdGlvbiBpc0dsb2JhbEZhY3RvcnlDYWxsKHZhbHVlOiB0cy5Ob2RlKTogdmFsdWUgaXMgdHMuQ2FsbEV4cHJlc3Npb24ge1xuICBpZiAodHMuaXNDYWxsRXhwcmVzc2lvbih2YWx1ZSkgJiYgISF2YWx1ZS5wYXJlbnQpIHtcbiAgICAvLyBCZSByZXNpbGllbnQgdG8gdGhlIHZhbHVlIGJlaW5nIHBhcnQgb2YgYSBjb21tYSBsaXN0XG4gICAgdmFsdWUgPSBpc0NvbW1hRXhwcmVzc2lvbih2YWx1ZS5wYXJlbnQpID8gdmFsdWUucGFyZW50IDogdmFsdWU7XG4gICAgLy8gQmUgcmVzaWxpZW50IHRvIHRoZSB2YWx1ZSBiZWluZyBpbnNpZGUgcGFyZW50aGVzZXNcbiAgICB2YWx1ZSA9IHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24odmFsdWUucGFyZW50KSA/IHZhbHVlLnBhcmVudCA6IHZhbHVlO1xuICAgIHJldHVybiAhIXZhbHVlLnBhcmVudCAmJiB0cy5pc0NvbmRpdGlvbmFsRXhwcmVzc2lvbih2YWx1ZS5wYXJlbnQpICYmXG4gICAgICAgIHZhbHVlLnBhcmVudC53aGVuRmFsc2UgPT09IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0NvbW1hRXhwcmVzc2lvbih2YWx1ZTogdHMuTm9kZSk6IHZhbHVlIGlzIHRzLkJpbmFyeUV4cHJlc3Npb24ge1xuICByZXR1cm4gdHMuaXNCaW5hcnlFeHByZXNzaW9uKHZhbHVlKSAmJiB2YWx1ZS5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ29tbWFUb2tlbjtcbn1cblxuLyoqXG4gKiBDb21wdXRlIGEgZ2xvYmFsIGlkZW50aWZpZXIgZm9yIHRoZSBnaXZlbiBpbXBvcnQgKGBpYCkuXG4gKlxuICogVGhlIGlkZW50aWZpZXIgdXNlZCB0byBhY2Nlc3MgYSBwYWNrYWdlIHdoZW4gdXNpbmcgdGhlIFwiZ2xvYmFsXCIgZm9ybSBvZiBhIFVNRCBidW5kbGUgdXN1YWxseVxuICogZm9sbG93cyBhIHNwZWNpYWwgZm9ybWF0IHdoZXJlIHNuYWtlLWNhc2UgaXMgY29udmV0ZWQgdG8gY2FtZWxDYXNlIGFuZCBwYXRoIHNlcGFyYXRvcnMgYXJlXG4gKiBjb252ZXJ0ZWQgdG8gZG90cy4gSW4gYWRkaXRpb24gdGhlcmUgYXJlIHNwZWNpYWwgY2FzZXMgc3VjaCBhcyBgQGFuZ3VsYXJgIGlzIG1hcHBlZCB0byBgbmdgLlxuICpcbiAqIEZvciBleGFtcGxlXG4gKlxuICogKiBgQG5zL3BhY2thZ2UvZW50cnktcG9pbnRgID0+IGBucy5wYWNrYWdlLmVudHJ5UG9pbnRgXG4gKiAqIGBAYW5ndWxhci9jb21tb24vdGVzdGluZ2AgPT4gYG5nLmNvbW1vbi50ZXN0aW5nYFxuICogKiBgQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlci1keW5hbWljYCA9PiBgbmcucGxhdGZvcm1Ccm93c2VyRHluYW1pY2BcbiAqXG4gKiBJdCBpcyBwb3NzaWJsZSBmb3IgcGFja2FnZXMgdG8gc3BlY2lmeSBjb21wbGV0ZWx5IGRpZmZlcmVudCBpZGVudGlmaWVycyBmb3IgYXR0YWNoaW5nIHRoZSBwYWNrYWdlXG4gKiB0byB0aGUgZ2xvYmFsLCBhbmQgc28gdGhlcmUgaXMgbm8gZ3VhcmFudGVlZCB3YXkgdG8gY29tcHV0ZSB0aGlzLlxuICogQ3VycmVudGx5LCB0aGlzIGFwcHJvYWNoIGFwcGVhcnMgdG8gd29yayBmb3IgdGhlIGtub3duIHNjZW5hcmlvczsgYWxzbyBpdCBpcyBub3Qga25vd24gaG93IGNvbW1vblxuICogaXQgaXMgdG8gdXNlIGdsb2JhbHMgZm9yIGltcG9ydGluZyBwYWNrYWdlcy5cbiAqXG4gKiBJZiBpdCB0dXJucyBvdXQgdGhhdCB0aGVyZSBhcmUgcGFja2FnZXMgdGhhdCBhcmUgYmVpbmcgdXNlZCB2aWEgZ2xvYmFscywgd2hlcmUgdGhpcyBhcHByb2FjaFxuICogZmFpbHMsIHdlIHNob3VsZCBjb25zaWRlciBpbXBsZW1lbnRpbmcgYSBjb25maWd1cmF0aW9uIGJhc2VkIHNvbHV0aW9uLCBzaW1pbGFyIHRvIHdoYXQgd291bGQgZ29cbiAqIGluIGEgcm9sbHVwIGNvbmZpZ3VyYXRpb24gZm9yIG1hcHBpbmcgaW1wb3J0IHBhdGhzIHRvIGdsb2JhbCBpbmRlbnRpZmllcnMuXG4gKi9cbmZ1bmN0aW9uIGdldEdsb2JhbElkZW50aWZpZXIoaTogSW1wb3J0KTogc3RyaW5nIHtcbiAgcmV0dXJuIGkuc3BlY2lmaWVyLnJlcGxhY2UoL15AYW5ndWxhclxcLy8sICduZy4nKVxuICAgICAgLnJlcGxhY2UoL15ALywgJycpXG4gICAgICAucmVwbGFjZSgvXFwvL2csICcuJylcbiAgICAgIC5yZXBsYWNlKC9bLV9dKyguPykvZywgKF8sIGMpID0+IGMudG9VcHBlckNhc2UoKSlcbiAgICAgIC5yZXBsYWNlKC9eLi8sIGMgPT4gYy50b0xvd2VyQ2FzZSgpKTtcbn1cblxuZnVuY3Rpb24gZmluZDxUPihub2RlOiB0cy5Ob2RlLCB0ZXN0OiAobm9kZTogdHMuTm9kZSkgPT4gbm9kZSBpcyB0cy5Ob2RlICYgVCk6IFR8dW5kZWZpbmVkIHtcbiAgcmV0dXJuIHRlc3Qobm9kZSkgPyBub2RlIDogbm9kZS5mb3JFYWNoQ2hpbGQoY2hpbGQgPT4gZmluZDxUPihjaGlsZCwgdGVzdCkpO1xufVxuXG5mdW5jdGlvbiBvbmVPZkJpbmFyeUNvbmRpdGlvbnMoXG4gICAgbm9kZTogdHMuQmluYXJ5RXhwcmVzc2lvbiwgdGVzdDogKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pID0+IGJvb2xlYW4pIHtcbiAgcmV0dXJuIHRlc3Qobm9kZS5sZWZ0KSB8fCB0ZXN0KG5vZGUucmlnaHQpO1xufVxuXG5mdW5jdGlvbiBpc1R5cGVPZihub2RlOiB0cy5FeHByZXNzaW9uLCAuLi50eXBlczogc3RyaW5nW10pOiBib29sZWFuIHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiB0cy5pc1R5cGVPZkV4cHJlc3Npb24obm9kZS5sZWZ0KSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKG5vZGUubGVmdC5leHByZXNzaW9uKSAmJiB0eXBlcy5pbmRleE9mKG5vZGUubGVmdC5leHByZXNzaW9uLnRleHQpICE9PSAtMTtcbn1cbiJdfQ==