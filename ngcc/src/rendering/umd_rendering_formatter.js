(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/umd_rendering_formatter", ["require", "exports", "tslib", "canonical-path", "typescript", "@angular/compiler-cli/ngcc/src/rendering/esm5_rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UmdRenderingFormatter = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var canonical_path_1 = require("canonical-path");
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
        function UmdRenderingFormatter(umdHost, isCore) {
            var _this = _super.call(this, umdHost, isCore) || this;
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
            var umdModule = this.umdHost.getUmdModule(file);
            if (!umdModule) {
                return;
            }
            var factoryFunction = umdModule.factoryFn;
            var lastStatement = factoryFunction.body.statements[factoryFunction.body.statements.length - 1];
            var insertionPoint = lastStatement ? lastStatement.getEnd() : factoryFunction.body.getEnd() - 1;
            exports.forEach(function (e) {
                var basePath = utils_1.stripExtension(e.from);
                var relativePath = './' + canonical_path_1.relative(canonical_path_1.dirname(entryPointBasePath), basePath);
                var namedImport = entryPointBasePath !== basePath ?
                    importManager.generateNamedImport(relativePath, e.identifier) :
                    { symbol: e.identifier, moduleImport: null };
                var importNamespace = namedImport.moduleImport ? namedImport.moduleImport + "." : '';
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
                    var importNamespace = namedImport.moduleImport ? namedImport.moduleImport + "." : '';
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
        var parameterString = imports.map(function (i) { return i.qualifier; }).join(',');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW1kX3JlbmRlcmluZ19mb3JtYXR0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3VtZF9yZW5kZXJpbmdfZm9ybWF0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCxpREFBaUQ7SUFFakQsK0JBQWlDO0lBT2pDLDhHQUFrRTtJQUNsRSx3RUFBdUM7SUFLdkM7Ozs7T0FJRztJQUNIO1FBQTJDLGlEQUFzQjtRQUMvRCwrQkFBc0IsT0FBMEIsRUFBRSxNQUFlO1lBQWpFLFlBQ0Usa0JBQU0sT0FBTyxFQUFFLE1BQU0sQ0FBQyxTQUN2QjtZQUZxQixhQUFPLEdBQVAsT0FBTyxDQUFtQjs7UUFFaEQsQ0FBQztRQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O1dBbUJHO1FBQ0gsMENBQVUsR0FBVixVQUFXLE1BQW1CLEVBQUUsT0FBaUIsRUFBRSxJQUFtQjtZQUNwRSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUN4QixPQUFPO2FBQ1I7WUFFRCxrREFBa0Q7WUFDbEQsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDZCxPQUFPO2FBQ1I7WUFFRCxJQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO1lBRTVDLG1GQUFtRjtZQUNuRiwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzdELHFCQUFxQixDQUFDLE1BQU0sRUFBRSxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDeEQsd0JBQXdCLENBQUMsTUFBTSxFQUFFLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMzRCx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzVELENBQUM7UUFFRDs7V0FFRztRQUNILDBDQUFVLEdBQVYsVUFDSSxNQUFtQixFQUFFLGtCQUEwQixFQUFFLE9BQXFCLEVBQ3RFLGFBQTRCLEVBQUUsSUFBbUI7WUFDbkQsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDZCxPQUFPO2FBQ1I7WUFDRCxJQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO1lBQzVDLElBQU0sYUFBYSxHQUNmLGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNoRixJQUFNLGNBQWMsR0FDaEIsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQy9FLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBQSxDQUFDO2dCQUNmLElBQU0sUUFBUSxHQUFHLHNCQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN4QyxJQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcseUJBQVEsQ0FBQyx3QkFBTyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzVFLElBQU0sV0FBVyxHQUFHLGtCQUFrQixLQUFLLFFBQVEsQ0FBQyxDQUFDO29CQUNqRCxhQUFhLENBQUMsbUJBQW1CLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO29CQUMvRCxFQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUMsQ0FBQztnQkFDL0MsSUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUksV0FBVyxDQUFDLFlBQVksTUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZGLElBQU0sU0FBUyxHQUFHLGVBQWEsQ0FBQyxDQUFDLFVBQVUsV0FBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLE1BQU0sTUFBRyxDQUFDO2dCQUN6RixNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNoRCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxnREFBZ0IsR0FBaEIsVUFDSSxNQUFtQixFQUFFLE9BQW1CLEVBQUUsYUFBNEIsRUFDdEUsSUFBbUI7O1lBQ3JCLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xELElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQ2QsT0FBTzthQUNSO1lBQ0QsSUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQztZQUM1QyxJQUFNLGFBQWEsR0FDZixlQUFlLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDaEYsSUFBTSxjQUFjLEdBQ2hCLGFBQWEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQzs7Z0JBQy9FLEtBQWdCLElBQUEsWUFBQSxpQkFBQSxPQUFPLENBQUEsZ0NBQUEscURBQUU7b0JBQXBCLElBQU0sQ0FBQyxvQkFBQTtvQkFDVixJQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ2xGLElBQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFJLFdBQVcsQ0FBQyxZQUFZLE1BQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN2RixJQUFNLFNBQVMsR0FBRyxlQUFhLENBQUMsQ0FBQyxPQUFPLFdBQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxNQUFNLE1BQUcsQ0FBQztvQkFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7aUJBQy9DOzs7Ozs7Ozs7UUFDSCxDQUFDO1FBRUQ7O1dBRUc7UUFDSCw0Q0FBWSxHQUFaLFVBQWEsTUFBbUIsRUFBRSxTQUFpQixFQUFFLElBQW1CO1lBQ3RFLElBQUksU0FBUyxLQUFLLEVBQUUsRUFBRTtnQkFDcEIsT0FBTzthQUNSO1lBQ0QsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDZCxPQUFPO2FBQ1I7WUFDRCxJQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO1lBQzVDLElBQU0sY0FBYyxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFELElBQU0sY0FBYyxHQUNoQixjQUFjLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDckYsTUFBTSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsSUFBSSxHQUFHLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBQ0gsNEJBQUM7SUFBRCxDQUFDLEFBN0dELENBQTJDLGlEQUFzQixHQTZHaEU7SUE3R1ksc0RBQXFCO0lBK0dsQzs7T0FFRztJQUNILFNBQVMsMEJBQTBCLENBQy9CLE1BQW1CLEVBQUUsZUFBc0MsRUFBRSxPQUFpQjtRQUNoRixJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUNwRixJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ2hCLE9BQU87U0FDUjtRQUNELElBQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUM7UUFDekMsSUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckQsbURBQW1EO1lBQ25ELFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztZQUN6QyxxRUFBcUU7WUFDckUsV0FBVyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM3QixJQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsY0FBWSxDQUFDLENBQUMsU0FBUyxPQUFJLEVBQTNCLENBQTJCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0UsTUFBTSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsWUFBWSxHQUFHLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbEcsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUyxxQkFBcUIsQ0FDMUIsTUFBbUIsRUFBRSxlQUFzQyxFQUFFLE9BQWlCO1FBQ2hGLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDaEIsT0FBTztTQUNSO1FBQ0QsSUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQztRQUMzQyxJQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsTUFBSSxDQUFDLENBQUMsU0FBUyxNQUFHLEVBQWxCLENBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEUscUVBQXFFO1FBQ3JFLHlDQUF5QztRQUN6QyxJQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDeEQsSUFBTSxlQUFlLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDbEUsSUFBSSxlQUFlLEtBQUssU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDLHdCQUF3QixDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQ2xGLGlFQUFpRTtZQUNqRSxrREFBa0Q7WUFDbEQsSUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM1RSxNQUFNLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxNQUFJLFlBQVksT0FBSSxDQUFDLENBQUM7U0FDekQ7YUFBTTtZQUNMLG1CQUFtQjtZQUNuQixJQUFNLGNBQWMsR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDeEQscUNBQXFDO2dCQUNyQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7Z0JBQzVDLHlFQUF5RTtnQkFDekUsZUFBZSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNqQyxNQUFNLENBQUMsVUFBVSxDQUNiLGNBQWMsRUFBRSxZQUFZLEdBQUcsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUN0RjtJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsd0JBQXdCLENBQzdCLE1BQW1CLEVBQUUsZUFBc0MsRUFBRSxPQUFpQjtRQUNoRixJQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3hGLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtZQUN0QixPQUFPO1NBQ1I7UUFDRCxJQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzNELG1EQUFtRDtZQUNuRCxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztZQUMvQyxxRUFBcUU7WUFDckUsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ25DLElBQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxZQUFVLG1CQUFtQixDQUFDLENBQUMsQ0FBRyxFQUFsQyxDQUFrQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sQ0FBQyxVQUFVLENBQ2IsY0FBYyxFQUFFLFlBQVksR0FBRyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUYsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUyx1QkFBdUIsQ0FDNUIsTUFBbUIsRUFBRSxlQUFzQyxFQUFFLE9BQWlCO1FBQ2hGLElBQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxNQUEyQixDQUFDO1FBQ2hFLElBQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUNuQixPQUFPO1NBQ1I7UUFFRCx1REFBdUQ7UUFDdkQsSUFBTSxlQUFlLEdBQ2pCLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDO1FBQzlGLElBQUksQ0FBQyxFQUFFLENBQUMsb0JBQW9CLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDN0MsT0FBTztTQUNSO1FBRUQsSUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQztRQUM5QyxJQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLFNBQVMsRUFBWCxDQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEUsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN6QixJQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDcEQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsZUFBZSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1NBQzFEO2FBQU07WUFDTCx1RUFBdUU7WUFDdkUsc0JBQXNCO1lBQ3RCLDRGQUE0RjtZQUM1RixtRUFBbUU7WUFDbkUsSUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFDLFFBQVEsRUFBRSxHQUFHLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hHLE1BQU0sQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1NBQ3BEO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUyxxQkFBcUIsQ0FBQyxLQUFjO1FBQzNDLElBQUksQ0FBQyxFQUFFLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDdEMsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUNELElBQUksQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztZQUN2QyxLQUFLLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsRUFBRTtZQUNoRixPQUFPLEtBQUssQ0FBQztTQUNkO1FBQ0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsVUFBQyxHQUFHLElBQUssT0FBQSxRQUFRLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsRUFBbEMsQ0FBa0MsQ0FBQyxFQUFFO1lBQ3hGLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUN2RixPQUFPLEtBQUssQ0FBQztTQUNkO1FBQ0QsT0FBTyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDO0lBQ3RELENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsZ0JBQWdCLENBQUMsS0FBYztRQUN0QyxJQUFJLENBQUMsRUFBRSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3RDLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUM7WUFDdkMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLEVBQUU7WUFDaEYsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLFVBQUMsR0FBRyxJQUFLLE9BQUEsUUFBUSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsRUFBdkIsQ0FBdUIsQ0FBQyxFQUFFO1lBQzdFLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUN2RixPQUFPLEtBQUssQ0FBQztTQUNkO1FBQ0QsT0FBTyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDO0lBQ3JELENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsbUJBQW1CLENBQUMsS0FBYztRQUN6QyxJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRTtZQUNoRCx1REFBdUQ7WUFDdkQsS0FBSyxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQy9ELHFEQUFxRDtZQUNyRCxLQUFLLEdBQUcsRUFBRSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzFFLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7Z0JBQzdELEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxLQUFLLEtBQUssQ0FBQztTQUN0QzthQUFNO1lBQ0wsT0FBTyxLQUFLLENBQUM7U0FDZDtJQUNILENBQUM7SUFFRCxTQUFTLGlCQUFpQixDQUFDLEtBQWM7UUFDdkMsT0FBTyxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7SUFDL0YsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FxQkc7SUFDSCxTQUFTLG1CQUFtQixDQUFDLENBQVM7UUFDcEMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDO2FBQzNDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO2FBQ2pCLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO2FBQ25CLE9BQU8sQ0FBQyxZQUFZLEVBQUUsVUFBQyxDQUFDLEVBQUUsQ0FBQyxJQUFLLE9BQUEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFmLENBQWUsQ0FBQzthQUNoRCxPQUFPLENBQUMsSUFBSSxFQUFFLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFmLENBQWUsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCxTQUFTLElBQUksQ0FBSSxJQUFhLEVBQUUsSUFBNEM7UUFDMUUsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFBLEtBQUssSUFBSSxPQUFBLElBQUksQ0FBSSxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQXBCLENBQW9CLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBRUQsU0FBUyxxQkFBcUIsQ0FDMUIsSUFBeUIsRUFBRSxJQUE0QztRQUN6RSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsU0FBUyxRQUFRLENBQUMsSUFBbUI7UUFBRSxlQUFrQjthQUFsQixVQUFrQixFQUFsQixxQkFBa0IsRUFBbEIsSUFBa0I7WUFBbEIsOEJBQWtCOztRQUN2RCxPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUNsRSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMvRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtkaXJuYW1lLCByZWxhdGl2ZX0gZnJvbSAnY2Fub25pY2FsLXBhdGgnO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWV4cG9ydH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtJbXBvcnQsIEltcG9ydE1hbmFnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2xhdG9yJztcbmltcG9ydCB7RXhwb3J0SW5mb30gZnJvbSAnLi4vYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtVbWRSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC91bWRfaG9zdCc7XG5cbmltcG9ydCB7RXNtNVJlbmRlcmluZ0Zvcm1hdHRlcn0gZnJvbSAnLi9lc201X3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtzdHJpcEV4dGVuc2lvbn0gZnJvbSAnLi91dGlscyc7XG5cbnR5cGUgQ29tbW9uSnNDb25kaXRpb25hbCA9IHRzLkNvbmRpdGlvbmFsRXhwcmVzc2lvbiZ7d2hlblRydWU6IHRzLkNhbGxFeHByZXNzaW9ufTtcbnR5cGUgQW1kQ29uZGl0aW9uYWwgPSB0cy5Db25kaXRpb25hbEV4cHJlc3Npb24me3doZW5UcnVlOiB0cy5DYWxsRXhwcmVzc2lvbn07XG5cbi8qKlxuICogQSBSZW5kZXJpbmdGb3JtYXR0ZXIgdGhhdCB3b3JrcyB3aXRoIFVNRCBmaWxlcywgaW5zdGVhZCBvZiBgaW1wb3J0YCBhbmQgYGV4cG9ydGAgc3RhdGVtZW50c1xuICogdGhlIG1vZHVsZSBpcyBhbiBJSUZFIHdpdGggYSBmYWN0b3J5IGZ1bmN0aW9uIGNhbGwgd2l0aCBkZXBlbmRlbmNpZXMsIHdoaWNoIGFyZSBkZWZpbmVkIGluIGFcbiAqIHdyYXBwZXIgZnVuY3Rpb24gZm9yIEFNRCwgQ29tbW9uSlMgYW5kIGdsb2JhbCBtb2R1bGUgZm9ybWF0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIFVtZFJlbmRlcmluZ0Zvcm1hdHRlciBleHRlbmRzIEVzbTVSZW5kZXJpbmdGb3JtYXR0ZXIge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgdW1kSG9zdDogVW1kUmVmbGVjdGlvbkhvc3QsIGlzQ29yZTogYm9vbGVhbikge1xuICAgIHN1cGVyKHVtZEhvc3QsIGlzQ29yZSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHRoZSBpbXBvcnRzIHRvIHRoZSBVTUQgbW9kdWxlIElJRkUuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBpbXBvcnRzIGF0IFwicHJlcGVuZGVkXCIgdG8gdGhlIHN0YXJ0IG9mIHRoZSBwYXJhbWV0ZXIgbGlzdCBvZiB0aGUgZmFjdG9yeSBmdW5jdGlvbixcbiAgICogYW5kIHNvIGFsc28gdG8gdGhlIGFyZ3VtZW50cyBwYXNzZWQgdG8gaXQgd2hlbiBpdCBpcyBjYWxsZWQuXG4gICAqIFRoaXMgaXMgYmVjYXVzZSB0aGVyZSBhcmUgc2NlbmFyaW9zIHdoZXJlIHRoZSBmYWN0b3J5IGZ1bmN0aW9uIGRvZXMgbm90IGFjY2VwdCBhcyBtYW55XG4gICAqIHBhcmFtZXRlcnMgYXMgYXJlIHBhc3NlZCBhcyBhcmd1bWVudCBpbiB0aGUgY2FsbC4gRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiAoZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICAgKiAgICAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID9cbiAgICogICAgICAgICBmYWN0b3J5KGV4cG9ydHMscmVxdWlyZSgneCcpLHJlcXVpcmUoJ3onKSkgOlxuICAgKiAgICAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID9cbiAgICogICAgICAgICBkZWZpbmUoWydleHBvcnRzJywgJ3gnLCAneiddLCBmYWN0b3J5KSA6XG4gICAqICAgICAoZ2xvYmFsID0gZ2xvYmFsIHx8IHNlbGYsIGZhY3RvcnkoZ2xvYmFsLm15QnVuZGxlID0ge30sIGdsb2JhbC54KSk7XG4gICAqIH0odGhpcywgKGZ1bmN0aW9uIChleHBvcnRzLCB4KSB7IC4uLiB9XG4gICAqIGBgYFxuICAgKlxuICAgKiAoU2VlIHRoYXQgdGhlIGB6YCBpbXBvcnQgaXMgbm90IGJlaW5nIHVzZWQgYnkgdGhlIGZhY3RvcnkgZnVuY3Rpb24uKVxuICAgKi9cbiAgYWRkSW1wb3J0cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBpbXBvcnRzOiBJbXBvcnRbXSwgZmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGlmIChpbXBvcnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEFzc3VtZSB0aGVyZSBpcyBvbmx5IG9uZSBVTUQgbW9kdWxlIGluIHRoZSBmaWxlXG4gICAgY29uc3QgdW1kTW9kdWxlID0gdGhpcy51bWRIb3N0LmdldFVtZE1vZHVsZShmaWxlKTtcbiAgICBpZiAoIXVtZE1vZHVsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHdyYXBwZXJGdW5jdGlvbiA9IHVtZE1vZHVsZS53cmFwcGVyRm47XG5cbiAgICAvLyBXZSBuZWVkIHRvIGFkZCBuZXcgYHJlcXVpcmUoKWAgY2FsbHMgZm9yIGVhY2ggaW1wb3J0IGluIHRoZSBDb21tb25KUyBpbml0aWFsaXplclxuICAgIHJlbmRlckNvbW1vbkpzRGVwZW5kZW5jaWVzKG91dHB1dCwgd3JhcHBlckZ1bmN0aW9uLCBpbXBvcnRzKTtcbiAgICByZW5kZXJBbWREZXBlbmRlbmNpZXMob3V0cHV0LCB3cmFwcGVyRnVuY3Rpb24sIGltcG9ydHMpO1xuICAgIHJlbmRlckdsb2JhbERlcGVuZGVuY2llcyhvdXRwdXQsIHdyYXBwZXJGdW5jdGlvbiwgaW1wb3J0cyk7XG4gICAgcmVuZGVyRmFjdG9yeVBhcmFtZXRlcnMob3V0cHV0LCB3cmFwcGVyRnVuY3Rpb24sIGltcG9ydHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgZXhwb3J0cyB0byB0aGUgYm90dG9tIG9mIHRoZSBVTUQgbW9kdWxlIGZhY3RvcnkgZnVuY3Rpb24uXG4gICAqL1xuICBhZGRFeHBvcnRzKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZW50cnlQb2ludEJhc2VQYXRoOiBzdHJpbmcsIGV4cG9ydHM6IEV4cG9ydEluZm9bXSxcbiAgICAgIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIsIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCB1bWRNb2R1bGUgPSB0aGlzLnVtZEhvc3QuZ2V0VW1kTW9kdWxlKGZpbGUpO1xuICAgIGlmICghdW1kTW9kdWxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGZhY3RvcnlGdW5jdGlvbiA9IHVtZE1vZHVsZS5mYWN0b3J5Rm47XG4gICAgY29uc3QgbGFzdFN0YXRlbWVudCA9XG4gICAgICAgIGZhY3RvcnlGdW5jdGlvbi5ib2R5LnN0YXRlbWVudHNbZmFjdG9yeUZ1bmN0aW9uLmJvZHkuc3RhdGVtZW50cy5sZW5ndGggLSAxXTtcbiAgICBjb25zdCBpbnNlcnRpb25Qb2ludCA9XG4gICAgICAgIGxhc3RTdGF0ZW1lbnQgPyBsYXN0U3RhdGVtZW50LmdldEVuZCgpIDogZmFjdG9yeUZ1bmN0aW9uLmJvZHkuZ2V0RW5kKCkgLSAxO1xuICAgIGV4cG9ydHMuZm9yRWFjaChlID0+IHtcbiAgICAgIGNvbnN0IGJhc2VQYXRoID0gc3RyaXBFeHRlbnNpb24oZS5mcm9tKTtcbiAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9ICcuLycgKyByZWxhdGl2ZShkaXJuYW1lKGVudHJ5UG9pbnRCYXNlUGF0aCksIGJhc2VQYXRoKTtcbiAgICAgIGNvbnN0IG5hbWVkSW1wb3J0ID0gZW50cnlQb2ludEJhc2VQYXRoICE9PSBiYXNlUGF0aCA/XG4gICAgICAgICAgaW1wb3J0TWFuYWdlci5nZW5lcmF0ZU5hbWVkSW1wb3J0KHJlbGF0aXZlUGF0aCwgZS5pZGVudGlmaWVyKSA6XG4gICAgICAgICAge3N5bWJvbDogZS5pZGVudGlmaWVyLCBtb2R1bGVJbXBvcnQ6IG51bGx9O1xuICAgICAgY29uc3QgaW1wb3J0TmFtZXNwYWNlID0gbmFtZWRJbXBvcnQubW9kdWxlSW1wb3J0ID8gYCR7bmFtZWRJbXBvcnQubW9kdWxlSW1wb3J0fS5gIDogJyc7XG4gICAgICBjb25zdCBleHBvcnRTdHIgPSBgXFxuZXhwb3J0cy4ke2UuaWRlbnRpZmllcn0gPSAke2ltcG9ydE5hbWVzcGFjZX0ke25hbWVkSW1wb3J0LnN5bWJvbH07YDtcbiAgICAgIG91dHB1dC5hcHBlbmRSaWdodChpbnNlcnRpb25Qb2ludCwgZXhwb3J0U3RyKTtcbiAgICB9KTtcbiAgfVxuXG4gIGFkZERpcmVjdEV4cG9ydHMoXG4gICAgICBvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBleHBvcnRzOiBSZWV4cG9ydFtdLCBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyLFxuICAgICAgZmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IHVtZE1vZHVsZSA9IHRoaXMudW1kSG9zdC5nZXRVbWRNb2R1bGUoZmlsZSk7XG4gICAgaWYgKCF1bWRNb2R1bGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZmFjdG9yeUZ1bmN0aW9uID0gdW1kTW9kdWxlLmZhY3RvcnlGbjtcbiAgICBjb25zdCBsYXN0U3RhdGVtZW50ID1cbiAgICAgICAgZmFjdG9yeUZ1bmN0aW9uLmJvZHkuc3RhdGVtZW50c1tmYWN0b3J5RnVuY3Rpb24uYm9keS5zdGF0ZW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGNvbnN0IGluc2VydGlvblBvaW50ID1cbiAgICAgICAgbGFzdFN0YXRlbWVudCA/IGxhc3RTdGF0ZW1lbnQuZ2V0RW5kKCkgOiBmYWN0b3J5RnVuY3Rpb24uYm9keS5nZXRFbmQoKSAtIDE7XG4gICAgZm9yIChjb25zdCBlIG9mIGV4cG9ydHMpIHtcbiAgICAgIGNvbnN0IG5hbWVkSW1wb3J0ID0gaW1wb3J0TWFuYWdlci5nZW5lcmF0ZU5hbWVkSW1wb3J0KGUuZnJvbU1vZHVsZSwgZS5zeW1ib2xOYW1lKTtcbiAgICAgIGNvbnN0IGltcG9ydE5hbWVzcGFjZSA9IG5hbWVkSW1wb3J0Lm1vZHVsZUltcG9ydCA/IGAke25hbWVkSW1wb3J0Lm1vZHVsZUltcG9ydH0uYCA6ICcnO1xuICAgICAgY29uc3QgZXhwb3J0U3RyID0gYFxcbmV4cG9ydHMuJHtlLmFzQWxpYXN9ID0gJHtpbXBvcnROYW1lc3BhY2V9JHtuYW1lZEltcG9ydC5zeW1ib2x9O2A7XG4gICAgICBvdXRwdXQuYXBwZW5kUmlnaHQoaW5zZXJ0aW9uUG9pbnQsIGV4cG9ydFN0cik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgY29uc3RhbnRzIHRvIHRoZSB0b3Agb2YgdGhlIFVNRCBmYWN0b3J5IGZ1bmN0aW9uLlxuICAgKi9cbiAgYWRkQ29uc3RhbnRzKG91dHB1dDogTWFnaWNTdHJpbmcsIGNvbnN0YW50czogc3RyaW5nLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgaWYgKGNvbnN0YW50cyA9PT0gJycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdW1kTW9kdWxlID0gdGhpcy51bWRIb3N0LmdldFVtZE1vZHVsZShmaWxlKTtcbiAgICBpZiAoIXVtZE1vZHVsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmYWN0b3J5RnVuY3Rpb24gPSB1bWRNb2R1bGUuZmFjdG9yeUZuO1xuICAgIGNvbnN0IGZpcnN0U3RhdGVtZW50ID0gZmFjdG9yeUZ1bmN0aW9uLmJvZHkuc3RhdGVtZW50c1swXTtcbiAgICBjb25zdCBpbnNlcnRpb25Qb2ludCA9XG4gICAgICAgIGZpcnN0U3RhdGVtZW50ID8gZmlyc3RTdGF0ZW1lbnQuZ2V0U3RhcnQoKSA6IGZhY3RvcnlGdW5jdGlvbi5ib2R5LmdldFN0YXJ0KCkgKyAxO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluc2VydGlvblBvaW50LCAnXFxuJyArIGNvbnN0YW50cyArICdcXG4nKTtcbiAgfVxufVxuXG4vKipcbiAqIEFkZCBkZXBlbmRlbmNpZXMgdG8gdGhlIENvbW1vbkpTIHBhcnQgb2YgdGhlIFVNRCB3cmFwcGVyIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiByZW5kZXJDb21tb25Kc0RlcGVuZGVuY2llcyhcbiAgICBvdXRwdXQ6IE1hZ2ljU3RyaW5nLCB3cmFwcGVyRnVuY3Rpb246IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbiwgaW1wb3J0czogSW1wb3J0W10pIHtcbiAgY29uc3QgY29uZGl0aW9uYWwgPSBmaW5kKHdyYXBwZXJGdW5jdGlvbi5ib2R5LnN0YXRlbWVudHNbMF0sIGlzQ29tbW9uSlNDb25kaXRpb25hbCk7XG4gIGlmICghY29uZGl0aW9uYWwpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgZmFjdG9yeUNhbGwgPSBjb25kaXRpb25hbC53aGVuVHJ1ZTtcbiAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSBmYWN0b3J5Q2FsbC5hcmd1bWVudHMubGVuZ3RoID4gMCA/XG4gICAgICAvLyBBZGQgZXh0cmEgZGVwZW5kZW5jaWVzIGJlZm9yZSB0aGUgZmlyc3QgYXJndW1lbnRcbiAgICAgIGZhY3RvcnlDYWxsLmFyZ3VtZW50c1swXS5nZXRGdWxsU3RhcnQoKSA6XG4gICAgICAvLyBCYWNrdXAgb25lIGNoYXIgdG8gYWNjb3VudCBmb3IgdGhlIGNsb3NpbmcgcGFyZW50aGVzaXMgb24gdGhlIGNhbGxcbiAgICAgIGZhY3RvcnlDYWxsLmdldEVuZCgpIC0gMTtcbiAgY29uc3QgaW1wb3J0U3RyaW5nID0gaW1wb3J0cy5tYXAoaSA9PiBgcmVxdWlyZSgnJHtpLnNwZWNpZmllcn0nKWApLmpvaW4oJywnKTtcbiAgb3V0cHV0LmFwcGVuZExlZnQoaW5qZWN0aW9uUG9pbnQsIGltcG9ydFN0cmluZyArIChmYWN0b3J5Q2FsbC5hcmd1bWVudHMubGVuZ3RoID4gMCA/ICcsJyA6ICcnKSk7XG59XG5cbi8qKlxuICogQWRkIGRlcGVuZGVuY2llcyB0byB0aGUgQU1EIHBhcnQgb2YgdGhlIFVNRCB3cmFwcGVyIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiByZW5kZXJBbWREZXBlbmRlbmNpZXMoXG4gICAgb3V0cHV0OiBNYWdpY1N0cmluZywgd3JhcHBlckZ1bmN0aW9uOiB0cy5GdW5jdGlvbkV4cHJlc3Npb24sIGltcG9ydHM6IEltcG9ydFtdKSB7XG4gIGNvbnN0IGNvbmRpdGlvbmFsID0gZmluZCh3cmFwcGVyRnVuY3Rpb24uYm9keS5zdGF0ZW1lbnRzWzBdLCBpc0FtZENvbmRpdGlvbmFsKTtcbiAgaWYgKCFjb25kaXRpb25hbCkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBhbWREZWZpbmVDYWxsID0gY29uZGl0aW9uYWwud2hlblRydWU7XG4gIGNvbnN0IGltcG9ydFN0cmluZyA9IGltcG9ydHMubWFwKGkgPT4gYCcke2kuc3BlY2lmaWVyfSdgKS5qb2luKCcsJyk7XG4gIC8vIFRoZSBkZXBlbmRlbmN5IGFycmF5IChpZiBpdCBleGlzdHMpIGlzIHRoZSBzZWNvbmQgdG8gbGFzdCBhcmd1bWVudFxuICAvLyBgZGVmaW5lKGlkPywgZGVwZW5kZW5jaWVzPywgZmFjdG9yeSk7YFxuICBjb25zdCBmYWN0b3J5SW5kZXggPSBhbWREZWZpbmVDYWxsLmFyZ3VtZW50cy5sZW5ndGggLSAxO1xuICBjb25zdCBkZXBlbmRlbmN5QXJyYXkgPSBhbWREZWZpbmVDYWxsLmFyZ3VtZW50c1tmYWN0b3J5SW5kZXggLSAxXTtcbiAgaWYgKGRlcGVuZGVuY3lBcnJheSA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVwZW5kZW5jeUFycmF5KSkge1xuICAgIC8vIE5vIGFycmF5IHByb3ZpZGVkOiBgZGVmaW5lKGZhY3RvcnkpYCBvciBgZGVmaW5lKGlkLCBmYWN0b3J5KWAuXG4gICAgLy8gSW5zZXJ0IGEgbmV3IGFycmF5IGluIGZyb250IHRoZSBgZmFjdG9yeWAgY2FsbC5cbiAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IGFtZERlZmluZUNhbGwuYXJndW1lbnRzW2ZhY3RvcnlJbmRleF0uZ2V0RnVsbFN0YXJ0KCk7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoaW5qZWN0aW9uUG9pbnQsIGBbJHtpbXBvcnRTdHJpbmd9XSxgKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBBbHJlYWR5IGFuIGFycmF5XG4gICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSBkZXBlbmRlbmN5QXJyYXkuZWxlbWVudHMubGVuZ3RoID4gMCA/XG4gICAgICAgIC8vIEFkZCBpbXBvcnRzIGJlZm9yZSB0aGUgZmlyc3QgaXRlbS5cbiAgICAgICAgZGVwZW5kZW5jeUFycmF5LmVsZW1lbnRzWzBdLmdldEZ1bGxTdGFydCgpIDpcbiAgICAgICAgLy8gQmFja3VwIG9uZSBjaGFyIHRvIGFjY291bnQgZm9yIHRoZSBjbG9zaW5nIHNxdWFyZSBicmFja2V0IG9uIHRoZSBhcnJheVxuICAgICAgICBkZXBlbmRlbmN5QXJyYXkuZ2V0RW5kKCkgLSAxO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KFxuICAgICAgICBpbmplY3Rpb25Qb2ludCwgaW1wb3J0U3RyaW5nICsgKGRlcGVuZGVuY3lBcnJheS5lbGVtZW50cy5sZW5ndGggPiAwID8gJywnIDogJycpKTtcbiAgfVxufVxuXG4vKipcbiAqIEFkZCBkZXBlbmRlbmNpZXMgdG8gdGhlIGdsb2JhbCBwYXJ0IG9mIHRoZSBVTUQgd3JhcHBlciBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gcmVuZGVyR2xvYmFsRGVwZW5kZW5jaWVzKFxuICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIHdyYXBwZXJGdW5jdGlvbjogdHMuRnVuY3Rpb25FeHByZXNzaW9uLCBpbXBvcnRzOiBJbXBvcnRbXSkge1xuICBjb25zdCBnbG9iYWxGYWN0b3J5Q2FsbCA9IGZpbmQod3JhcHBlckZ1bmN0aW9uLmJvZHkuc3RhdGVtZW50c1swXSwgaXNHbG9iYWxGYWN0b3J5Q2FsbCk7XG4gIGlmICghZ2xvYmFsRmFjdG9yeUNhbGwpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSBnbG9iYWxGYWN0b3J5Q2FsbC5hcmd1bWVudHMubGVuZ3RoID4gMCA/XG4gICAgICAvLyBBZGQgZXh0cmEgZGVwZW5kZW5jaWVzIGJlZm9yZSB0aGUgZmlyc3QgYXJndW1lbnRcbiAgICAgIGdsb2JhbEZhY3RvcnlDYWxsLmFyZ3VtZW50c1swXS5nZXRGdWxsU3RhcnQoKSA6XG4gICAgICAvLyBCYWNrdXAgb25lIGNoYXIgdG8gYWNjb3VudCBmb3IgdGhlIGNsb3NpbmcgcGFyZW50aGVzaXMgb24gdGhlIGNhbGxcbiAgICAgIGdsb2JhbEZhY3RvcnlDYWxsLmdldEVuZCgpIC0gMTtcbiAgY29uc3QgaW1wb3J0U3RyaW5nID0gaW1wb3J0cy5tYXAoaSA9PiBgZ2xvYmFsLiR7Z2V0R2xvYmFsSWRlbnRpZmllcihpKX1gKS5qb2luKCcsJyk7XG4gIG91dHB1dC5hcHBlbmRMZWZ0KFxuICAgICAgaW5qZWN0aW9uUG9pbnQsIGltcG9ydFN0cmluZyArIChnbG9iYWxGYWN0b3J5Q2FsbC5hcmd1bWVudHMubGVuZ3RoID4gMCA/ICcsJyA6ICcnKSk7XG59XG5cbi8qKlxuICogQWRkIGRlcGVuZGVuY3kgcGFyYW1ldGVycyB0byB0aGUgVU1EIGZhY3RvcnkgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIHJlbmRlckZhY3RvcnlQYXJhbWV0ZXJzKFxuICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIHdyYXBwZXJGdW5jdGlvbjogdHMuRnVuY3Rpb25FeHByZXNzaW9uLCBpbXBvcnRzOiBJbXBvcnRbXSkge1xuICBjb25zdCB3cmFwcGVyQ2FsbCA9IHdyYXBwZXJGdW5jdGlvbi5wYXJlbnQgYXMgdHMuQ2FsbEV4cHJlc3Npb247XG4gIGNvbnN0IHNlY29uZEFyZ3VtZW50ID0gd3JhcHBlckNhbGwuYXJndW1lbnRzWzFdO1xuICBpZiAoIXNlY29uZEFyZ3VtZW50KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gQmUgcmVzaWxpZW50IHRvIHRoZSBmYWN0b3J5IGJlaW5nIGluc2lkZSBwYXJlbnRoZXNlc1xuICBjb25zdCBmYWN0b3J5RnVuY3Rpb24gPVxuICAgICAgdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihzZWNvbmRBcmd1bWVudCkgPyBzZWNvbmRBcmd1bWVudC5leHByZXNzaW9uIDogc2Vjb25kQXJndW1lbnQ7XG4gIGlmICghdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oZmFjdG9yeUZ1bmN0aW9uKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHBhcmFtZXRlcnMgPSBmYWN0b3J5RnVuY3Rpb24ucGFyYW1ldGVycztcbiAgY29uc3QgcGFyYW1ldGVyU3RyaW5nID0gaW1wb3J0cy5tYXAoaSA9PiBpLnF1YWxpZmllcikuam9pbignLCcpO1xuICBpZiAocGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSBwYXJhbWV0ZXJzWzBdLmdldEZ1bGxTdGFydCgpO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluamVjdGlvblBvaW50LCBwYXJhbWV0ZXJTdHJpbmcgKyAnLCcpO1xuICB9IGVsc2Uge1xuICAgIC8vIElmIHRoZXJlIGFyZSBubyBwYXJhbWV0ZXJzIHRoZW4gdGhlIGZhY3RvcnkgZnVuY3Rpb24gd2lsbCBsb29rIGxpa2U6XG4gICAgLy8gZnVuY3Rpb24gKCkgeyAuLi4gfVxuICAgIC8vIFRoZSBBU1QgZG9lcyBub3QgZ2l2ZSB1cyBhIHdheSB0byBmaW5kIHRoZSBpbnNlcnRpb24gcG9pbnQgLSBiZXR3ZWVuIHRoZSB0d28gcGFyZW50aGVzZXMuXG4gICAgLy8gU28gd2UgbXVzdCB1c2UgYSByZWd1bGFyIGV4cHJlc3Npb24gb24gdGhlIHRleHQgb2YgdGhlIGZ1bmN0aW9uLlxuICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gZmFjdG9yeUZ1bmN0aW9uLmdldFN0YXJ0KCkgKyBmYWN0b3J5RnVuY3Rpb24uZ2V0VGV4dCgpLmluZGV4T2YoJygpJykgKyAxO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluamVjdGlvblBvaW50LCBwYXJhbWV0ZXJTdHJpbmcpO1xuICB9XG59XG5cbi8qKlxuICogSXMgdGhpcyBub2RlIHRoZSBDb21tb25KUyBjb25kaXRpb25hbCBleHByZXNzaW9uIGluIHRoZSBVTUQgd3JhcHBlcj9cbiAqL1xuZnVuY3Rpb24gaXNDb21tb25KU0NvbmRpdGlvbmFsKHZhbHVlOiB0cy5Ob2RlKTogdmFsdWUgaXMgQ29tbW9uSnNDb25kaXRpb25hbCB7XG4gIGlmICghdHMuaXNDb25kaXRpb25hbEV4cHJlc3Npb24odmFsdWUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghdHMuaXNCaW5hcnlFeHByZXNzaW9uKHZhbHVlLmNvbmRpdGlvbikgfHxcbiAgICAgIHZhbHVlLmNvbmRpdGlvbi5vcGVyYXRvclRva2VuLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCFvbmVPZkJpbmFyeUNvbmRpdGlvbnModmFsdWUuY29uZGl0aW9uLCAoZXhwKSA9PiBpc1R5cGVPZihleHAsICdleHBvcnRzJywgJ21vZHVsZScpKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24odmFsdWUud2hlblRydWUpIHx8ICF0cy5pc0lkZW50aWZpZXIodmFsdWUud2hlblRydWUuZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHZhbHVlLndoZW5UcnVlLmV4cHJlc3Npb24udGV4dCA9PT0gJ2ZhY3RvcnknO1xufVxuXG4vKipcbiAqIElzIHRoaXMgbm9kZSB0aGUgQU1EIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gaW4gdGhlIFVNRCB3cmFwcGVyP1xuICovXG5mdW5jdGlvbiBpc0FtZENvbmRpdGlvbmFsKHZhbHVlOiB0cy5Ob2RlKTogdmFsdWUgaXMgQW1kQ29uZGl0aW9uYWwge1xuICBpZiAoIXRzLmlzQ29uZGl0aW9uYWxFeHByZXNzaW9uKHZhbHVlKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIXRzLmlzQmluYXJ5RXhwcmVzc2lvbih2YWx1ZS5jb25kaXRpb24pIHx8XG4gICAgICB2YWx1ZS5jb25kaXRpb24ub3BlcmF0b3JUb2tlbi5raW5kICE9PSB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghb25lT2ZCaW5hcnlDb25kaXRpb25zKHZhbHVlLmNvbmRpdGlvbiwgKGV4cCkgPT4gaXNUeXBlT2YoZXhwLCAnZGVmaW5lJykpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbih2YWx1ZS53aGVuVHJ1ZSkgfHwgIXRzLmlzSWRlbnRpZmllcih2YWx1ZS53aGVuVHJ1ZS5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdmFsdWUud2hlblRydWUuZXhwcmVzc2lvbi50ZXh0ID09PSAnZGVmaW5lJztcbn1cblxuLyoqXG4gKiBJcyB0aGlzIG5vZGUgdGhlIGNhbGwgdG8gc2V0dXAgdGhlIGdsb2JhbCBkZXBlbmRlbmNpZXMgaW4gdGhlIFVNRCB3cmFwcGVyP1xuICovXG5mdW5jdGlvbiBpc0dsb2JhbEZhY3RvcnlDYWxsKHZhbHVlOiB0cy5Ob2RlKTogdmFsdWUgaXMgdHMuQ2FsbEV4cHJlc3Npb24ge1xuICBpZiAodHMuaXNDYWxsRXhwcmVzc2lvbih2YWx1ZSkgJiYgISF2YWx1ZS5wYXJlbnQpIHtcbiAgICAvLyBCZSByZXNpbGllbnQgdG8gdGhlIHZhbHVlIGJlaW5nIHBhcnQgb2YgYSBjb21tYSBsaXN0XG4gICAgdmFsdWUgPSBpc0NvbW1hRXhwcmVzc2lvbih2YWx1ZS5wYXJlbnQpID8gdmFsdWUucGFyZW50IDogdmFsdWU7XG4gICAgLy8gQmUgcmVzaWxpZW50IHRvIHRoZSB2YWx1ZSBiZWluZyBpbnNpZGUgcGFyZW50aGVzZXNcbiAgICB2YWx1ZSA9IHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24odmFsdWUucGFyZW50KSA/IHZhbHVlLnBhcmVudCA6IHZhbHVlO1xuICAgIHJldHVybiAhIXZhbHVlLnBhcmVudCAmJiB0cy5pc0NvbmRpdGlvbmFsRXhwcmVzc2lvbih2YWx1ZS5wYXJlbnQpICYmXG4gICAgICAgIHZhbHVlLnBhcmVudC53aGVuRmFsc2UgPT09IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0NvbW1hRXhwcmVzc2lvbih2YWx1ZTogdHMuTm9kZSk6IHZhbHVlIGlzIHRzLkJpbmFyeUV4cHJlc3Npb24ge1xuICByZXR1cm4gdHMuaXNCaW5hcnlFeHByZXNzaW9uKHZhbHVlKSAmJiB2YWx1ZS5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ29tbWFUb2tlbjtcbn1cblxuLyoqXG4gKiBDb21wdXRlIGEgZ2xvYmFsIGlkZW50aWZpZXIgZm9yIHRoZSBnaXZlbiBpbXBvcnQgKGBpYCkuXG4gKlxuICogVGhlIGlkZW50aWZpZXIgdXNlZCB0byBhY2Nlc3MgYSBwYWNrYWdlIHdoZW4gdXNpbmcgdGhlIFwiZ2xvYmFsXCIgZm9ybSBvZiBhIFVNRCBidW5kbGUgdXN1YWxseVxuICogZm9sbG93cyBhIHNwZWNpYWwgZm9ybWF0IHdoZXJlIHNuYWtlLWNhc2UgaXMgY29udmV0ZWQgdG8gY2FtZWxDYXNlIGFuZCBwYXRoIHNlcGFyYXRvcnMgYXJlXG4gKiBjb252ZXJ0ZWQgdG8gZG90cy4gSW4gYWRkaXRpb24gdGhlcmUgYXJlIHNwZWNpYWwgY2FzZXMgc3VjaCBhcyBgQGFuZ3VsYXJgIGlzIG1hcHBlZCB0byBgbmdgLlxuICpcbiAqIEZvciBleGFtcGxlXG4gKlxuICogKiBgQG5zL3BhY2thZ2UvZW50cnktcG9pbnRgID0+IGBucy5wYWNrYWdlLmVudHJ5UG9pbnRgXG4gKiAqIGBAYW5ndWxhci9jb21tb24vdGVzdGluZ2AgPT4gYG5nLmNvbW1vbi50ZXN0aW5nYFxuICogKiBgQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlci1keW5hbWljYCA9PiBgbmcucGxhdGZvcm1Ccm93c2VyRHluYW1pY2BcbiAqXG4gKiBJdCBpcyBwb3NzaWJsZSBmb3IgcGFja2FnZXMgdG8gc3BlY2lmeSBjb21wbGV0ZWx5IGRpZmZlcmVudCBpZGVudGlmaWVycyBmb3IgYXR0YWNoaW5nIHRoZSBwYWNrYWdlXG4gKiB0byB0aGUgZ2xvYmFsLCBhbmQgc28gdGhlcmUgaXMgbm8gZ3VhcmFudGVlZCB3YXkgdG8gY29tcHV0ZSB0aGlzLlxuICogQ3VycmVudGx5LCB0aGlzIGFwcHJvYWNoIGFwcGVhcnMgdG8gd29yayBmb3IgdGhlIGtub3duIHNjZW5hcmlvczsgYWxzbyBpdCBpcyBub3Qga25vd24gaG93IGNvbW1vblxuICogaXQgaXMgdG8gdXNlIGdsb2JhbHMgZm9yIGltcG9ydGluZyBwYWNrYWdlcy5cbiAqXG4gKiBJZiBpdCB0dXJucyBvdXQgdGhhdCB0aGVyZSBhcmUgcGFja2FnZXMgdGhhdCBhcmUgYmVpbmcgdXNlZCB2aWEgZ2xvYmFscywgd2hlcmUgdGhpcyBhcHByb2FjaFxuICogZmFpbHMsIHdlIHNob3VsZCBjb25zaWRlciBpbXBsZW1lbnRpbmcgYSBjb25maWd1cmF0aW9uIGJhc2VkIHNvbHV0aW9uLCBzaW1pbGFyIHRvIHdoYXQgd291bGQgZ29cbiAqIGluIGEgcm9sbHVwIGNvbmZpZ3VyYXRpb24gZm9yIG1hcHBpbmcgaW1wb3J0IHBhdGhzIHRvIGdsb2JhbCBpbmRlbnRpZmllcnMuXG4gKi9cbmZ1bmN0aW9uIGdldEdsb2JhbElkZW50aWZpZXIoaTogSW1wb3J0KTogc3RyaW5nIHtcbiAgcmV0dXJuIGkuc3BlY2lmaWVyLnJlcGxhY2UoL15AYW5ndWxhclxcLy8sICduZy4nKVxuICAgICAgLnJlcGxhY2UoL15ALywgJycpXG4gICAgICAucmVwbGFjZSgvXFwvL2csICcuJylcbiAgICAgIC5yZXBsYWNlKC9bLV9dKyguPykvZywgKF8sIGMpID0+IGMudG9VcHBlckNhc2UoKSlcbiAgICAgIC5yZXBsYWNlKC9eLi8sIGMgPT4gYy50b0xvd2VyQ2FzZSgpKTtcbn1cblxuZnVuY3Rpb24gZmluZDxUPihub2RlOiB0cy5Ob2RlLCB0ZXN0OiAobm9kZTogdHMuTm9kZSkgPT4gbm9kZSBpcyB0cy5Ob2RlICYgVCk6IFR8dW5kZWZpbmVkIHtcbiAgcmV0dXJuIHRlc3Qobm9kZSkgPyBub2RlIDogbm9kZS5mb3JFYWNoQ2hpbGQoY2hpbGQgPT4gZmluZDxUPihjaGlsZCwgdGVzdCkpO1xufVxuXG5mdW5jdGlvbiBvbmVPZkJpbmFyeUNvbmRpdGlvbnMoXG4gICAgbm9kZTogdHMuQmluYXJ5RXhwcmVzc2lvbiwgdGVzdDogKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pID0+IGJvb2xlYW4pIHtcbiAgcmV0dXJuIHRlc3Qobm9kZS5sZWZ0KSB8fCB0ZXN0KG5vZGUucmlnaHQpO1xufVxuXG5mdW5jdGlvbiBpc1R5cGVPZihub2RlOiB0cy5FeHByZXNzaW9uLCAuLi50eXBlczogc3RyaW5nW10pOiBib29sZWFuIHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiB0cy5pc1R5cGVPZkV4cHJlc3Npb24obm9kZS5sZWZ0KSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKG5vZGUubGVmdC5leHByZXNzaW9uKSAmJiB0eXBlcy5pbmRleE9mKG5vZGUubGVmdC5leHByZXNzaW9uLnRleHQpICE9PSAtMTtcbn1cbiJdfQ==