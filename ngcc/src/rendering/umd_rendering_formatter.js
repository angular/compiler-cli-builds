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
         *  Add the imports to the UMD module IIFE.
         */
        UmdRenderingFormatter.prototype.addImports = function (output, imports, file) {
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
        // Backup one char to account for the closing parenthesis on the call
        var injectionPoint = factoryCall.getEnd() - 1;
        var importString = imports.map(function (i) { return "require('" + i.specifier + "')"; }).join(',');
        output.appendLeft(injectionPoint, (factoryCall.arguments.length > 0 ? ',' : '') + importString);
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
            // Already an array, add imports to the end of the array.
            // Backup one char to account for the closing square bracket on the array
            var injectionPoint = dependencyArray.getEnd() - 1;
            output.appendLeft(injectionPoint, (dependencyArray.elements.length > 0 ? ',' : '') + importString);
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
        // Backup one char to account for the closing parenthesis after the argument list of the call.
        var injectionPoint = globalFactoryCall.getEnd() - 1;
        var importString = imports.map(function (i) { return "global." + getGlobalIdentifier(i); }).join(',');
        output.appendLeft(injectionPoint, (globalFactoryCall.arguments.length > 0 ? ',' : '') + importString);
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
            var injectionPoint = parameters[parameters.length - 1].getEnd();
            output.appendLeft(injectionPoint, ',' + parameterString);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW1kX3JlbmRlcmluZ19mb3JtYXR0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3VtZF9yZW5kZXJpbmdfZm9ybWF0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlEQUFpRDtJQUNqRCwrQkFBaUM7SUFLakMsOEdBQWtFO0lBQ2xFLHdFQUF1QztJQU12Qzs7OztPQUlHO0lBQ0g7UUFBMkMsaURBQXNCO1FBQy9ELCtCQUFzQixPQUEwQixFQUFFLE1BQWU7WUFBakUsWUFBcUUsa0JBQU0sT0FBTyxFQUFFLE1BQU0sQ0FBQyxTQUFHO1lBQXhFLGFBQU8sR0FBUCxPQUFPLENBQW1COztRQUE2QyxDQUFDO1FBRTlGOztXQUVHO1FBQ0gsMENBQVUsR0FBVixVQUFXLE1BQW1CLEVBQUUsT0FBaUIsRUFBRSxJQUFtQjtZQUNwRSxrREFBa0Q7WUFDbEQsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDZCxPQUFPO2FBQ1I7WUFFRCxJQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO1lBRTVDLG1GQUFtRjtZQUNuRiwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzdELHFCQUFxQixDQUFDLE1BQU0sRUFBRSxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDeEQsd0JBQXdCLENBQUMsTUFBTSxFQUFFLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMzRCx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzVELENBQUM7UUFFRDs7V0FFRztRQUNILDBDQUFVLEdBQVYs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Q0FBQyxVQUFBLEtBQUssSUFBSSxPQUFBLElBQUksQ0FBSSxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQXBCLENBQW9CLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBRUQsU0FBUyxxQkFBcUIsQ0FDMUIsSUFBeUIsRUFBRSxJQUE0QztRQUN6RSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsU0FBUyxRQUFRLENBQUMsSUFBbUI7UUFBRSxlQUFrQjthQUFsQixVQUFrQixFQUFsQixxQkFBa0IsRUFBbEIsSUFBa0I7WUFBbEIsOEJBQWtCOztRQUN2RCxPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUNsRSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMvRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtkaXJuYW1lLCByZWxhdGl2ZX0gZnJvbSAnY2Fub25pY2FsLXBhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCB7SW1wb3J0LCBJbXBvcnRNYW5hZ2VyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNsYXRvcic7XG5pbXBvcnQge0V4cG9ydEluZm99IGZyb20gJy4uL2FuYWx5c2lzL3ByaXZhdGVfZGVjbGFyYXRpb25zX2FuYWx5emVyJztcbmltcG9ydCB7VW1kUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvdW1kX2hvc3QnO1xuaW1wb3J0IHtFc201UmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuL2VzbTVfcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge3N0cmlwRXh0ZW5zaW9ufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7UmVleHBvcnR9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9pbXBvcnRzJztcblxudHlwZSBDb21tb25Kc0NvbmRpdGlvbmFsID0gdHMuQ29uZGl0aW9uYWxFeHByZXNzaW9uICYge3doZW5UcnVlOiB0cy5DYWxsRXhwcmVzc2lvbn07XG50eXBlIEFtZENvbmRpdGlvbmFsID0gdHMuQ29uZGl0aW9uYWxFeHByZXNzaW9uICYge3doZW5UcnVlOiB0cy5DYWxsRXhwcmVzc2lvbn07XG5cbi8qKlxuICogQSBSZW5kZXJpbmdGb3JtYXR0ZXIgdGhhdCB3b3JrcyB3aXRoIFVNRCBmaWxlcywgaW5zdGVhZCBvZiBgaW1wb3J0YCBhbmQgYGV4cG9ydGAgc3RhdGVtZW50c1xuICogdGhlIG1vZHVsZSBpcyBhbiBJSUZFIHdpdGggYSBmYWN0b3J5IGZ1bmN0aW9uIGNhbGwgd2l0aCBkZXBlbmRlbmNpZXMsIHdoaWNoIGFyZSBkZWZpbmVkIGluIGFcbiAqIHdyYXBwZXIgZnVuY3Rpb24gZm9yIEFNRCwgQ29tbW9uSlMgYW5kIGdsb2JhbCBtb2R1bGUgZm9ybWF0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIFVtZFJlbmRlcmluZ0Zvcm1hdHRlciBleHRlbmRzIEVzbTVSZW5kZXJpbmdGb3JtYXR0ZXIge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgdW1kSG9zdDogVW1kUmVmbGVjdGlvbkhvc3QsIGlzQ29yZTogYm9vbGVhbikgeyBzdXBlcih1bWRIb3N0LCBpc0NvcmUpOyB9XG5cbiAgLyoqXG4gICAqICBBZGQgdGhlIGltcG9ydHMgdG8gdGhlIFVNRCBtb2R1bGUgSUlGRS5cbiAgICovXG4gIGFkZEltcG9ydHMob3V0cHV0OiBNYWdpY1N0cmluZywgaW1wb3J0czogSW1wb3J0W10sIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICAvLyBBc3N1bWUgdGhlcmUgaXMgb25seSBvbmUgVU1EIG1vZHVsZSBpbiB0aGUgZmlsZVxuICAgIGNvbnN0IHVtZE1vZHVsZSA9IHRoaXMudW1kSG9zdC5nZXRVbWRNb2R1bGUoZmlsZSk7XG4gICAgaWYgKCF1bWRNb2R1bGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB3cmFwcGVyRnVuY3Rpb24gPSB1bWRNb2R1bGUud3JhcHBlckZuO1xuXG4gICAgLy8gV2UgbmVlZCB0byBhZGQgbmV3IGByZXF1aXJlKClgIGNhbGxzIGZvciBlYWNoIGltcG9ydCBpbiB0aGUgQ29tbW9uSlMgaW5pdGlhbGl6ZXJcbiAgICByZW5kZXJDb21tb25Kc0RlcGVuZGVuY2llcyhvdXRwdXQsIHdyYXBwZXJGdW5jdGlvbiwgaW1wb3J0cyk7XG4gICAgcmVuZGVyQW1kRGVwZW5kZW5jaWVzKG91dHB1dCwgd3JhcHBlckZ1bmN0aW9uLCBpbXBvcnRzKTtcbiAgICByZW5kZXJHbG9iYWxEZXBlbmRlbmNpZXMob3V0cHV0LCB3cmFwcGVyRnVuY3Rpb24sIGltcG9ydHMpO1xuICAgIHJlbmRlckZhY3RvcnlQYXJhbWV0ZXJzKG91dHB1dCwgd3JhcHBlckZ1bmN0aW9uLCBpbXBvcnRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIGV4cG9ydHMgdG8gdGhlIGJvdHRvbSBvZiB0aGUgVU1EIG1vZHVsZSBmYWN0b3J5IGZ1bmN0aW9uLlxuICAgKi9cbiAgYWRkRXhwb3J0cyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGVudHJ5UG9pbnRCYXNlUGF0aDogc3RyaW5nLCBleHBvcnRzOiBFeHBvcnRJbmZvW10sXG4gICAgICBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgY29uc3QgdW1kTW9kdWxlID0gdGhpcy51bWRIb3N0LmdldFVtZE1vZHVsZShmaWxlKTtcbiAgICBpZiAoIXVtZE1vZHVsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmYWN0b3J5RnVuY3Rpb24gPSB1bWRNb2R1bGUuZmFjdG9yeUZuO1xuICAgIGNvbnN0IGxhc3RTdGF0ZW1lbnQgPVxuICAgICAgICBmYWN0b3J5RnVuY3Rpb24uYm9keS5zdGF0ZW1lbnRzW2ZhY3RvcnlGdW5jdGlvbi5ib2R5LnN0YXRlbWVudHMubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgaW5zZXJ0aW9uUG9pbnQgPVxuICAgICAgICBsYXN0U3RhdGVtZW50ID8gbGFzdFN0YXRlbWVudC5nZXRFbmQoKSA6IGZhY3RvcnlGdW5jdGlvbi5ib2R5LmdldEVuZCgpIC0gMTtcbiAgICBleHBvcnRzLmZvckVhY2goZSA9PiB7XG4gICAgICBjb25zdCBiYXNlUGF0aCA9IHN0cmlwRXh0ZW5zaW9uKGUuZnJvbSk7XG4gICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSAnLi8nICsgcmVsYXRpdmUoZGlybmFtZShlbnRyeVBvaW50QmFzZVBhdGgpLCBiYXNlUGF0aCk7XG4gICAgICBjb25zdCBuYW1lZEltcG9ydCA9IGVudHJ5UG9pbnRCYXNlUGF0aCAhPT0gYmFzZVBhdGggP1xuICAgICAgICAgIGltcG9ydE1hbmFnZXIuZ2VuZXJhdGVOYW1lZEltcG9ydChyZWxhdGl2ZVBhdGgsIGUuaWRlbnRpZmllcikgOlxuICAgICAgICAgIHtzeW1ib2w6IGUuaWRlbnRpZmllciwgbW9kdWxlSW1wb3J0OiBudWxsfTtcbiAgICAgIGNvbnN0IGltcG9ydE5hbWVzcGFjZSA9IG5hbWVkSW1wb3J0Lm1vZHVsZUltcG9ydCA/IGAke25hbWVkSW1wb3J0Lm1vZHVsZUltcG9ydH0uYCA6ICcnO1xuICAgICAgY29uc3QgZXhwb3J0U3RyID0gYFxcbmV4cG9ydHMuJHtlLmlkZW50aWZpZXJ9ID0gJHtpbXBvcnROYW1lc3BhY2V9JHtuYW1lZEltcG9ydC5zeW1ib2x9O2A7XG4gICAgICBvdXRwdXQuYXBwZW5kUmlnaHQoaW5zZXJ0aW9uUG9pbnQsIGV4cG9ydFN0cik7XG4gICAgfSk7XG4gIH1cblxuICBhZGREaXJlY3RFeHBvcnRzKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZXhwb3J0czogUmVleHBvcnRbXSwgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlcixcbiAgICAgIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCB1bWRNb2R1bGUgPSB0aGlzLnVtZEhvc3QuZ2V0VW1kTW9kdWxlKGZpbGUpO1xuICAgIGlmICghdW1kTW9kdWxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGZhY3RvcnlGdW5jdGlvbiA9IHVtZE1vZHVsZS5mYWN0b3J5Rm47XG4gICAgY29uc3QgbGFzdFN0YXRlbWVudCA9XG4gICAgICAgIGZhY3RvcnlGdW5jdGlvbi5ib2R5LnN0YXRlbWVudHNbZmFjdG9yeUZ1bmN0aW9uLmJvZHkuc3RhdGVtZW50cy5sZW5ndGggLSAxXTtcbiAgICBjb25zdCBpbnNlcnRpb25Qb2ludCA9XG4gICAgICAgIGxhc3RTdGF0ZW1lbnQgPyBsYXN0U3RhdGVtZW50LmdldEVuZCgpIDogZmFjdG9yeUZ1bmN0aW9uLmJvZHkuZ2V0RW5kKCkgLSAxO1xuICAgIGZvciAoY29uc3QgZSBvZiBleHBvcnRzKSB7XG4gICAgICBjb25zdCBuYW1lZEltcG9ydCA9IGltcG9ydE1hbmFnZXIuZ2VuZXJhdGVOYW1lZEltcG9ydChlLmZyb21Nb2R1bGUsIGUuc3ltYm9sTmFtZSk7XG4gICAgICBjb25zdCBpbXBvcnROYW1lc3BhY2UgPSBuYW1lZEltcG9ydC5tb2R1bGVJbXBvcnQgPyBgJHtuYW1lZEltcG9ydC5tb2R1bGVJbXBvcnR9LmAgOiAnJztcbiAgICAgIGNvbnN0IGV4cG9ydFN0ciA9IGBcXG5leHBvcnRzLiR7ZS5hc0FsaWFzfSA9ICR7aW1wb3J0TmFtZXNwYWNlfSR7bmFtZWRJbXBvcnQuc3ltYm9sfTtgO1xuICAgICAgb3V0cHV0LmFwcGVuZFJpZ2h0KGluc2VydGlvblBvaW50LCBleHBvcnRTdHIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIGNvbnN0YW50cyB0byB0aGUgdG9wIG9mIHRoZSBVTUQgZmFjdG9yeSBmdW5jdGlvbi5cbiAgICovXG4gIGFkZENvbnN0YW50cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBjb25zdGFudHM6IHN0cmluZywgZmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGlmIChjb25zdGFudHMgPT09ICcnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHVtZE1vZHVsZSA9IHRoaXMudW1kSG9zdC5nZXRVbWRNb2R1bGUoZmlsZSk7XG4gICAgaWYgKCF1bWRNb2R1bGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZmFjdG9yeUZ1bmN0aW9uID0gdW1kTW9kdWxlLmZhY3RvcnlGbjtcbiAgICBjb25zdCBmaXJzdFN0YXRlbWVudCA9IGZhY3RvcnlGdW5jdGlvbi5ib2R5LnN0YXRlbWVudHNbMF07XG4gICAgY29uc3QgaW5zZXJ0aW9uUG9pbnQgPVxuICAgICAgICBmaXJzdFN0YXRlbWVudCA/IGZpcnN0U3RhdGVtZW50LmdldFN0YXJ0KCkgOiBmYWN0b3J5RnVuY3Rpb24uYm9keS5nZXRTdGFydCgpICsgMTtcbiAgICBvdXRwdXQuYXBwZW5kTGVmdChpbnNlcnRpb25Qb2ludCwgJ1xcbicgKyBjb25zdGFudHMgKyAnXFxuJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBBZGQgZGVwZW5kZW5jaWVzIHRvIHRoZSBDb21tb25KUyBwYXJ0IG9mIHRoZSBVTUQgd3JhcHBlciBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gcmVuZGVyQ29tbW9uSnNEZXBlbmRlbmNpZXMoXG4gICAgb3V0cHV0OiBNYWdpY1N0cmluZywgd3JhcHBlckZ1bmN0aW9uOiB0cy5GdW5jdGlvbkV4cHJlc3Npb24sIGltcG9ydHM6IEltcG9ydFtdKSB7XG4gIGNvbnN0IGNvbmRpdGlvbmFsID0gZmluZCh3cmFwcGVyRnVuY3Rpb24uYm9keS5zdGF0ZW1lbnRzWzBdLCBpc0NvbW1vbkpTQ29uZGl0aW9uYWwpO1xuICBpZiAoIWNvbmRpdGlvbmFsKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGZhY3RvcnlDYWxsID0gY29uZGl0aW9uYWwud2hlblRydWU7XG4gIC8vIEJhY2t1cCBvbmUgY2hhciB0byBhY2NvdW50IGZvciB0aGUgY2xvc2luZyBwYXJlbnRoZXNpcyBvbiB0aGUgY2FsbFxuICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IGZhY3RvcnlDYWxsLmdldEVuZCgpIC0gMTtcbiAgY29uc3QgaW1wb3J0U3RyaW5nID0gaW1wb3J0cy5tYXAoaSA9PiBgcmVxdWlyZSgnJHtpLnNwZWNpZmllcn0nKWApLmpvaW4oJywnKTtcbiAgb3V0cHV0LmFwcGVuZExlZnQoaW5qZWN0aW9uUG9pbnQsIChmYWN0b3J5Q2FsbC5hcmd1bWVudHMubGVuZ3RoID4gMCA/ICcsJyA6ICcnKSArIGltcG9ydFN0cmluZyk7XG59XG5cbi8qKlxuICogQWRkIGRlcGVuZGVuY2llcyB0byB0aGUgQU1EIHBhcnQgb2YgdGhlIFVNRCB3cmFwcGVyIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiByZW5kZXJBbWREZXBlbmRlbmNpZXMoXG4gICAgb3V0cHV0OiBNYWdpY1N0cmluZywgd3JhcHBlckZ1bmN0aW9uOiB0cy5GdW5jdGlvbkV4cHJlc3Npb24sIGltcG9ydHM6IEltcG9ydFtdKSB7XG4gIGNvbnN0IGNvbmRpdGlvbmFsID0gZmluZCh3cmFwcGVyRnVuY3Rpb24uYm9keS5zdGF0ZW1lbnRzWzBdLCBpc0FtZENvbmRpdGlvbmFsKTtcbiAgaWYgKCFjb25kaXRpb25hbCkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBhbWREZWZpbmVDYWxsID0gY29uZGl0aW9uYWwud2hlblRydWU7XG4gIGNvbnN0IGltcG9ydFN0cmluZyA9IGltcG9ydHMubWFwKGkgPT4gYCcke2kuc3BlY2lmaWVyfSdgKS5qb2luKCcsJyk7XG4gIC8vIFRoZSBkZXBlbmRlbmN5IGFycmF5IChpZiBpdCBleGlzdHMpIGlzIHRoZSBzZWNvbmQgdG8gbGFzdCBhcmd1bWVudFxuICAvLyBgZGVmaW5lKGlkPywgZGVwZW5kZW5jaWVzPywgZmFjdG9yeSk7YFxuICBjb25zdCBmYWN0b3J5SW5kZXggPSBhbWREZWZpbmVDYWxsLmFyZ3VtZW50cy5sZW5ndGggLSAxO1xuICBjb25zdCBkZXBlbmRlbmN5QXJyYXkgPSBhbWREZWZpbmVDYWxsLmFyZ3VtZW50c1tmYWN0b3J5SW5kZXggLSAxXTtcbiAgaWYgKGRlcGVuZGVuY3lBcnJheSA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVwZW5kZW5jeUFycmF5KSkge1xuICAgIC8vIE5vIGFycmF5IHByb3ZpZGVkOiBgZGVmaW5lKGZhY3RvcnkpYCBvciBgZGVmaW5lKGlkLCBmYWN0b3J5KWAuXG4gICAgLy8gSW5zZXJ0IGEgbmV3IGFycmF5IGluIGZyb250IHRoZSBgZmFjdG9yeWAgY2FsbC5cbiAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IGFtZERlZmluZUNhbGwuYXJndW1lbnRzW2ZhY3RvcnlJbmRleF0uZ2V0RnVsbFN0YXJ0KCk7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoaW5qZWN0aW9uUG9pbnQsIGBbJHtpbXBvcnRTdHJpbmd9XSxgKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBBbHJlYWR5IGFuIGFycmF5LCBhZGQgaW1wb3J0cyB0byB0aGUgZW5kIG9mIHRoZSBhcnJheS5cbiAgICAvLyBCYWNrdXAgb25lIGNoYXIgdG8gYWNjb3VudCBmb3IgdGhlIGNsb3Npbmcgc3F1YXJlIGJyYWNrZXQgb24gdGhlIGFycmF5XG4gICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSBkZXBlbmRlbmN5QXJyYXkuZ2V0RW5kKCkgLSAxO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KFxuICAgICAgICBpbmplY3Rpb25Qb2ludCwgKGRlcGVuZGVuY3lBcnJheS5lbGVtZW50cy5sZW5ndGggPiAwID8gJywnIDogJycpICsgaW1wb3J0U3RyaW5nKTtcbiAgfVxufVxuXG4vKipcbiAqIEFkZCBkZXBlbmRlbmNpZXMgdG8gdGhlIGdsb2JhbCBwYXJ0IG9mIHRoZSBVTUQgd3JhcHBlciBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gcmVuZGVyR2xvYmFsRGVwZW5kZW5jaWVzKFxuICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIHdyYXBwZXJGdW5jdGlvbjogdHMuRnVuY3Rpb25FeHByZXNzaW9uLCBpbXBvcnRzOiBJbXBvcnRbXSkge1xuICBjb25zdCBnbG9iYWxGYWN0b3J5Q2FsbCA9IGZpbmQod3JhcHBlckZ1bmN0aW9uLmJvZHkuc3RhdGVtZW50c1swXSwgaXNHbG9iYWxGYWN0b3J5Q2FsbCk7XG4gIGlmICghZ2xvYmFsRmFjdG9yeUNhbGwpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgLy8gQmFja3VwIG9uZSBjaGFyIHRvIGFjY291bnQgZm9yIHRoZSBjbG9zaW5nIHBhcmVudGhlc2lzIGFmdGVyIHRoZSBhcmd1bWVudCBsaXN0IG9mIHRoZSBjYWxsLlxuICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IGdsb2JhbEZhY3RvcnlDYWxsLmdldEVuZCgpIC0gMTtcbiAgY29uc3QgaW1wb3J0U3RyaW5nID0gaW1wb3J0cy5tYXAoaSA9PiBgZ2xvYmFsLiR7Z2V0R2xvYmFsSWRlbnRpZmllcihpKX1gKS5qb2luKCcsJyk7XG4gIG91dHB1dC5hcHBlbmRMZWZ0KFxuICAgICAgaW5qZWN0aW9uUG9pbnQsIChnbG9iYWxGYWN0b3J5Q2FsbC5hcmd1bWVudHMubGVuZ3RoID4gMCA/ICcsJyA6ICcnKSArIGltcG9ydFN0cmluZyk7XG59XG5cbi8qKlxuICogQWRkIGRlcGVuZGVuY3kgcGFyYW1ldGVycyB0byB0aGUgVU1EIGZhY3RvcnkgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIHJlbmRlckZhY3RvcnlQYXJhbWV0ZXJzKFxuICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIHdyYXBwZXJGdW5jdGlvbjogdHMuRnVuY3Rpb25FeHByZXNzaW9uLCBpbXBvcnRzOiBJbXBvcnRbXSkge1xuICBjb25zdCB3cmFwcGVyQ2FsbCA9IHdyYXBwZXJGdW5jdGlvbi5wYXJlbnQgYXMgdHMuQ2FsbEV4cHJlc3Npb247XG4gIGNvbnN0IHNlY29uZEFyZ3VtZW50ID0gd3JhcHBlckNhbGwuYXJndW1lbnRzWzFdO1xuICBpZiAoIXNlY29uZEFyZ3VtZW50KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gQmUgcmVzaWxpZW50IHRvIHRoZSBmYWN0b3J5IGJlaW5nIGluc2lkZSBwYXJlbnRoZXNlc1xuICBjb25zdCBmYWN0b3J5RnVuY3Rpb24gPVxuICAgICAgdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihzZWNvbmRBcmd1bWVudCkgPyBzZWNvbmRBcmd1bWVudC5leHByZXNzaW9uIDogc2Vjb25kQXJndW1lbnQ7XG4gIGlmICghdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oZmFjdG9yeUZ1bmN0aW9uKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHBhcmFtZXRlcnMgPSBmYWN0b3J5RnVuY3Rpb24ucGFyYW1ldGVycztcbiAgY29uc3QgcGFyYW1ldGVyU3RyaW5nID0gaW1wb3J0cy5tYXAoaSA9PiBpLnF1YWxpZmllcikuam9pbignLCcpO1xuICBpZiAocGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSBwYXJhbWV0ZXJzW3BhcmFtZXRlcnMubGVuZ3RoIC0gMV0uZ2V0RW5kKCk7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoaW5qZWN0aW9uUG9pbnQsICcsJyArIHBhcmFtZXRlclN0cmluZyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gSWYgdGhlcmUgYXJlIG5vIHBhcmFtZXRlcnMgdGhlbiB0aGUgZmFjdG9yeSBmdW5jdGlvbiB3aWxsIGxvb2sgbGlrZTpcbiAgICAvLyBmdW5jdGlvbiAoKSB7IC4uLiB9XG4gICAgLy8gVGhlIEFTVCBkb2VzIG5vdCBnaXZlIHVzIGEgd2F5IHRvIGZpbmQgdGhlIGluc2VydGlvbiBwb2ludCAtIGJldHdlZW4gdGhlIHR3byBwYXJlbnRoZXNlcy5cbiAgICAvLyBTbyB3ZSBtdXN0IHVzZSBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBvbiB0aGUgdGV4dCBvZiB0aGUgZnVuY3Rpb24uXG4gICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSBmYWN0b3J5RnVuY3Rpb24uZ2V0U3RhcnQoKSArIGZhY3RvcnlGdW5jdGlvbi5nZXRUZXh0KCkuaW5kZXhPZignKCknKSArIDE7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoaW5qZWN0aW9uUG9pbnQsIHBhcmFtZXRlclN0cmluZyk7XG4gIH1cbn1cblxuLyoqXG4gKiBJcyB0aGlzIG5vZGUgdGhlIENvbW1vbkpTIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gaW4gdGhlIFVNRCB3cmFwcGVyP1xuICovXG5mdW5jdGlvbiBpc0NvbW1vbkpTQ29uZGl0aW9uYWwodmFsdWU6IHRzLk5vZGUpOiB2YWx1ZSBpcyBDb21tb25Kc0NvbmRpdGlvbmFsIHtcbiAgaWYgKCF0cy5pc0NvbmRpdGlvbmFsRXhwcmVzc2lvbih2YWx1ZSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCF0cy5pc0JpbmFyeUV4cHJlc3Npb24odmFsdWUuY29uZGl0aW9uKSB8fFxuICAgICAgdmFsdWUuY29uZGl0aW9uLm9wZXJhdG9yVG9rZW4ua2luZCAhPT0gdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbikge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIW9uZU9mQmluYXJ5Q29uZGl0aW9ucyh2YWx1ZS5jb25kaXRpb24sIChleHApID0+IGlzVHlwZU9mKGV4cCwgJ2V4cG9ydHMnLCAnbW9kdWxlJykpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbih2YWx1ZS53aGVuVHJ1ZSkgfHwgIXRzLmlzSWRlbnRpZmllcih2YWx1ZS53aGVuVHJ1ZS5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdmFsdWUud2hlblRydWUuZXhwcmVzc2lvbi50ZXh0ID09PSAnZmFjdG9yeSc7XG59XG5cbi8qKlxuICogSXMgdGhpcyBub2RlIHRoZSBBTUQgY29uZGl0aW9uYWwgZXhwcmVzc2lvbiBpbiB0aGUgVU1EIHdyYXBwZXI/XG4gKi9cbmZ1bmN0aW9uIGlzQW1kQ29uZGl0aW9uYWwodmFsdWU6IHRzLk5vZGUpOiB2YWx1ZSBpcyBBbWRDb25kaXRpb25hbCB7XG4gIGlmICghdHMuaXNDb25kaXRpb25hbEV4cHJlc3Npb24odmFsdWUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghdHMuaXNCaW5hcnlFeHByZXNzaW9uKHZhbHVlLmNvbmRpdGlvbikgfHxcbiAgICAgIHZhbHVlLmNvbmRpdGlvbi5vcGVyYXRvclRva2VuLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCFvbmVPZkJpbmFyeUNvbmRpdGlvbnModmFsdWUuY29uZGl0aW9uLCAoZXhwKSA9PiBpc1R5cGVPZihleHAsICdkZWZpbmUnKSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKHZhbHVlLndoZW5UcnVlKSB8fCAhdHMuaXNJZGVudGlmaWVyKHZhbHVlLndoZW5UcnVlLmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB2YWx1ZS53aGVuVHJ1ZS5leHByZXNzaW9uLnRleHQgPT09ICdkZWZpbmUnO1xufVxuXG4vKipcbiAqIElzIHRoaXMgbm9kZSB0aGUgY2FsbCB0byBzZXR1cCB0aGUgZ2xvYmFsIGRlcGVuZGVuY2llcyBpbiB0aGUgVU1EIHdyYXBwZXI/XG4gKi9cbmZ1bmN0aW9uIGlzR2xvYmFsRmFjdG9yeUNhbGwodmFsdWU6IHRzLk5vZGUpOiB2YWx1ZSBpcyB0cy5DYWxsRXhwcmVzc2lvbiB7XG4gIGlmICh0cy5pc0NhbGxFeHByZXNzaW9uKHZhbHVlKSAmJiAhIXZhbHVlLnBhcmVudCkge1xuICAgIC8vIEJlIHJlc2lsaWVudCB0byB0aGUgdmFsdWUgYmVpbmcgcGFydCBvZiBhIGNvbW1hIGxpc3RcbiAgICB2YWx1ZSA9IGlzQ29tbWFFeHByZXNzaW9uKHZhbHVlLnBhcmVudCkgPyB2YWx1ZS5wYXJlbnQgOiB2YWx1ZTtcbiAgICAvLyBCZSByZXNpbGllbnQgdG8gdGhlIHZhbHVlIGJlaW5nIGluc2lkZSBwYXJlbnRoZXNlc1xuICAgIHZhbHVlID0gdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbih2YWx1ZS5wYXJlbnQpID8gdmFsdWUucGFyZW50IDogdmFsdWU7XG4gICAgcmV0dXJuICEhdmFsdWUucGFyZW50ICYmIHRzLmlzQ29uZGl0aW9uYWxFeHByZXNzaW9uKHZhbHVlLnBhcmVudCkgJiZcbiAgICAgICAgdmFsdWUucGFyZW50LndoZW5GYWxzZSA9PT0gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzQ29tbWFFeHByZXNzaW9uKHZhbHVlOiB0cy5Ob2RlKTogdmFsdWUgaXMgdHMuQmluYXJ5RXhwcmVzc2lvbiB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24odmFsdWUpICYmIHZhbHVlLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5Db21tYVRva2VuO1xufVxuXG4vKipcbiAqIENvbXB1dGUgYSBnbG9iYWwgaWRlbnRpZmllciBmb3IgdGhlIGdpdmVuIGltcG9ydCAoYGlgKS5cbiAqXG4gKiBUaGUgaWRlbnRpZmllciB1c2VkIHRvIGFjY2VzcyBhIHBhY2thZ2Ugd2hlbiB1c2luZyB0aGUgXCJnbG9iYWxcIiBmb3JtIG9mIGEgVU1EIGJ1bmRsZSB1c3VhbGx5XG4gKiBmb2xsb3dzIGEgc3BlY2lhbCBmb3JtYXQgd2hlcmUgc25ha2UtY2FzZSBpcyBjb252ZXRlZCB0byBjYW1lbENhc2UgYW5kIHBhdGggc2VwYXJhdG9ycyBhcmVcbiAqIGNvbnZlcnRlZCB0byBkb3RzLiBJbiBhZGRpdGlvbiB0aGVyZSBhcmUgc3BlY2lhbCBjYXNlcyBzdWNoIGFzIGBAYW5ndWxhcmAgaXMgbWFwcGVkIHRvIGBuZ2AuXG4gKlxuICogRm9yIGV4YW1wbGVcbiAqXG4gKiAqIGBAbnMvcGFja2FnZS9lbnRyeS1wb2ludGAgPT4gYG5zLnBhY2thZ2UuZW50cnlQb2ludGBcbiAqICogYEBhbmd1bGFyL2NvbW1vbi90ZXN0aW5nYCA9PiBgbmcuY29tbW9uLnRlc3RpbmdgXG4gKiAqIGBAYW5ndWxhci9wbGF0Zm9ybS1icm93c2VyLWR5bmFtaWNgID0+IGBuZy5wbGF0Zm9ybUJyb3dzZXJEeW5hbWljYFxuICpcbiAqIEl0IGlzIHBvc3NpYmxlIGZvciBwYWNrYWdlcyB0byBzcGVjaWZ5IGNvbXBsZXRlbHkgZGlmZmVyZW50IGlkZW50aWZpZXJzIGZvciBhdHRhY2hpbmcgdGhlIHBhY2thZ2VcbiAqIHRvIHRoZSBnbG9iYWwsIGFuZCBzbyB0aGVyZSBpcyBubyBndWFyYW50ZWVkIHdheSB0byBjb21wdXRlIHRoaXMuXG4gKiBDdXJyZW50bHksIHRoaXMgYXBwcm9hY2ggYXBwZWFycyB0byB3b3JrIGZvciB0aGUga25vd24gc2NlbmFyaW9zOyBhbHNvIGl0IGlzIG5vdCBrbm93biBob3cgY29tbW9uXG4gKiBpdCBpcyB0byB1c2UgZ2xvYmFscyBmb3IgaW1wb3J0aW5nIHBhY2thZ2VzLlxuICpcbiAqIElmIGl0IHR1cm5zIG91dCB0aGF0IHRoZXJlIGFyZSBwYWNrYWdlcyB0aGF0IGFyZSBiZWluZyB1c2VkIHZpYSBnbG9iYWxzLCB3aGVyZSB0aGlzIGFwcHJvYWNoXG4gKiBmYWlscywgd2Ugc2hvdWxkIGNvbnNpZGVyIGltcGxlbWVudGluZyBhIGNvbmZpZ3VyYXRpb24gYmFzZWQgc29sdXRpb24sIHNpbWlsYXIgdG8gd2hhdCB3b3VsZCBnb1xuICogaW4gYSByb2xsdXAgY29uZmlndXJhdGlvbiBmb3IgbWFwcGluZyBpbXBvcnQgcGF0aHMgdG8gZ2xvYmFsIGluZGVudGlmaWVycy5cbiAqL1xuZnVuY3Rpb24gZ2V0R2xvYmFsSWRlbnRpZmllcihpOiBJbXBvcnQpOiBzdHJpbmcge1xuICByZXR1cm4gaS5zcGVjaWZpZXIucmVwbGFjZSgvXkBhbmd1bGFyXFwvLywgJ25nLicpXG4gICAgICAucmVwbGFjZSgvXkAvLCAnJylcbiAgICAgIC5yZXBsYWNlKC9cXC8vZywgJy4nKVxuICAgICAgLnJlcGxhY2UoL1stX10rKC4/KS9nLCAoXywgYykgPT4gYy50b1VwcGVyQ2FzZSgpKVxuICAgICAgLnJlcGxhY2UoL14uLywgYyA9PiBjLnRvTG93ZXJDYXNlKCkpO1xufVxuXG5mdW5jdGlvbiBmaW5kPFQ+KG5vZGU6IHRzLk5vZGUsIHRlc3Q6IChub2RlOiB0cy5Ob2RlKSA9PiBub2RlIGlzIHRzLk5vZGUgJiBUKTogVHx1bmRlZmluZWQge1xuICByZXR1cm4gdGVzdChub2RlKSA/IG5vZGUgOiBub2RlLmZvckVhY2hDaGlsZChjaGlsZCA9PiBmaW5kPFQ+KGNoaWxkLCB0ZXN0KSk7XG59XG5cbmZ1bmN0aW9uIG9uZU9mQmluYXJ5Q29uZGl0aW9ucyhcbiAgICBub2RlOiB0cy5CaW5hcnlFeHByZXNzaW9uLCB0ZXN0OiAoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbikgPT4gYm9vbGVhbikge1xuICByZXR1cm4gdGVzdChub2RlLmxlZnQpIHx8IHRlc3Qobm9kZS5yaWdodCk7XG59XG5cbmZ1bmN0aW9uIGlzVHlwZU9mKG5vZGU6IHRzLkV4cHJlc3Npb24sIC4uLnR5cGVzOiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xuICByZXR1cm4gdHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpICYmIHRzLmlzVHlwZU9mRXhwcmVzc2lvbihub2RlLmxlZnQpICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIobm9kZS5sZWZ0LmV4cHJlc3Npb24pICYmIHR5cGVzLmluZGV4T2Yobm9kZS5sZWZ0LmV4cHJlc3Npb24udGV4dCkgIT09IC0xO1xufVxuIl19