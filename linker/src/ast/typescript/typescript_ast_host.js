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
        define("@angular/compiler-cli/linker/src/ast/typescript/typescript_ast_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/linker/src/fatal_linker_error", "@angular/compiler-cli/linker/src/ast/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypeScriptAstHost = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var fatal_linker_error_1 = require("@angular/compiler-cli/linker/src/fatal_linker_error");
    var utils_1 = require("@angular/compiler-cli/linker/src/ast/utils");
    /**
     * This implementation of `AstHost` is able to get information from TypeScript AST nodes.
     *
     * This host is not actually used at runtime in the current code.
     *
     * It is implemented here to ensure that the `AstHost` abstraction is not unfairly skewed towards
     * the Babel implementation. It could also provide a basis for a 3rd TypeScript compiler plugin to
     * do linking in the future.
     */
    var TypeScriptAstHost = /** @class */ (function () {
        function TypeScriptAstHost() {
            this.isStringLiteral = ts.isStringLiteral;
            this.isNumericLiteral = ts.isNumericLiteral;
            this.isArrayLiteral = ts.isArrayLiteralExpression;
            this.isObjectLiteral = ts.isObjectLiteralExpression;
            this.isCallExpression = ts.isCallExpression;
        }
        TypeScriptAstHost.prototype.getSymbolName = function (node) {
            if (ts.isIdentifier(node)) {
                return node.text;
            }
            else if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.name)) {
                return node.name.text;
            }
            else {
                return null;
            }
        };
        TypeScriptAstHost.prototype.parseStringLiteral = function (str) {
            (0, utils_1.assert)(str, this.isStringLiteral, 'a string literal');
            return str.text;
        };
        TypeScriptAstHost.prototype.parseNumericLiteral = function (num) {
            (0, utils_1.assert)(num, this.isNumericLiteral, 'a numeric literal');
            return parseInt(num.text);
        };
        TypeScriptAstHost.prototype.isBooleanLiteral = function (node) {
            return isBooleanLiteral(node) || isMinifiedBooleanLiteral(node);
        };
        TypeScriptAstHost.prototype.parseBooleanLiteral = function (bool) {
            if (isBooleanLiteral(bool)) {
                return bool.kind === ts.SyntaxKind.TrueKeyword;
            }
            else if (isMinifiedBooleanLiteral(bool)) {
                return !(+bool.operand.text);
            }
            else {
                throw new fatal_linker_error_1.FatalLinkerError(bool, 'Unsupported syntax, expected a boolean literal.');
            }
        };
        TypeScriptAstHost.prototype.parseArrayLiteral = function (array) {
            (0, utils_1.assert)(array, this.isArrayLiteral, 'an array literal');
            return array.elements.map(function (element) {
                (0, utils_1.assert)(element, isNotEmptyElement, 'element in array not to be empty');
                (0, utils_1.assert)(element, isNotSpreadElement, 'element in array not to use spread syntax');
                return element;
            });
        };
        TypeScriptAstHost.prototype.parseObjectLiteral = function (obj) {
            var e_1, _a;
            (0, utils_1.assert)(obj, this.isObjectLiteral, 'an object literal');
            var result = new Map();
            try {
                for (var _b = (0, tslib_1.__values)(obj.properties), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var property = _c.value;
                    (0, utils_1.assert)(property, ts.isPropertyAssignment, 'a property assignment');
                    (0, utils_1.assert)(property.name, isPropertyName, 'a property name');
                    result.set(property.name.text, property.initializer);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return result;
        };
        TypeScriptAstHost.prototype.isFunctionExpression = function (node) {
            return ts.isFunctionExpression(node) || ts.isArrowFunction(node);
        };
        TypeScriptAstHost.prototype.parseReturnValue = function (fn) {
            (0, utils_1.assert)(fn, this.isFunctionExpression, 'a function');
            if (!ts.isBlock(fn.body)) {
                // it is a simple array function expression: `(...) => expr`
                return fn.body;
            }
            // it is a function (arrow or normal) with a body. E.g.:
            // * `(...) => { stmt; ... }`
            // * `function(...) { stmt; ... }`
            if (fn.body.statements.length !== 1) {
                throw new fatal_linker_error_1.FatalLinkerError(fn.body, 'Unsupported syntax, expected a function body with a single return statement.');
            }
            var stmt = fn.body.statements[0];
            (0, utils_1.assert)(stmt, ts.isReturnStatement, 'a function body with a single return statement');
            if (stmt.expression === undefined) {
                throw new fatal_linker_error_1.FatalLinkerError(stmt, 'Unsupported syntax, expected function to return a value.');
            }
            return stmt.expression;
        };
        TypeScriptAstHost.prototype.parseCallee = function (call) {
            (0, utils_1.assert)(call, ts.isCallExpression, 'a call expression');
            return call.expression;
        };
        TypeScriptAstHost.prototype.parseArguments = function (call) {
            (0, utils_1.assert)(call, ts.isCallExpression, 'a call expression');
            return call.arguments.map(function (arg) {
                (0, utils_1.assert)(arg, isNotSpreadElement, 'argument not to use spread syntax');
                return arg;
            });
        };
        TypeScriptAstHost.prototype.getRange = function (node) {
            var file = node.getSourceFile();
            if (file === undefined) {
                throw new fatal_linker_error_1.FatalLinkerError(node, 'Unable to read range for node - it is missing parent information.');
            }
            var startPos = node.getStart();
            var endPos = node.getEnd();
            var _a = ts.getLineAndCharacterOfPosition(file, startPos), startLine = _a.line, startCol = _a.character;
            return { startLine: startLine, startCol: startCol, startPos: startPos, endPos: endPos };
        };
        return TypeScriptAstHost;
    }());
    exports.TypeScriptAstHost = TypeScriptAstHost;
    /**
     * Return true if the expression does not represent an empty element in an array literal.
     * For example in `[,foo]` the first element is "empty".
     */
    function isNotEmptyElement(e) {
        return !ts.isOmittedExpression(e);
    }
    /**
     * Return true if the expression is not a spread element of an array literal.
     * For example in `[x, ...rest]` the `...rest` expression is a spread element.
     */
    function isNotSpreadElement(e) {
        return !ts.isSpreadElement(e);
    }
    /**
     * Return true if the expression can be considered a text based property name.
     */
    function isPropertyName(e) {
        return ts.isIdentifier(e) || ts.isStringLiteral(e) || ts.isNumericLiteral(e);
    }
    /**
     * Return true if the node is either `true` or `false` literals.
     */
    function isBooleanLiteral(node) {
        return node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword;
    }
    /**
     * Return true if the node is either `!0` or `!1`.
     */
    function isMinifiedBooleanLiteral(node) {
        return ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken &&
            ts.isNumericLiteral(node.operand) && (node.operand.text === '0' || node.operand.text === '1');
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9hc3RfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9saW5rZXIvc3JjL2FzdC90eXBlc2NyaXB0L3R5cGVzY3JpcHRfYXN0X2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQywwRkFBMEQ7SUFFMUQsb0VBQWdDO0lBR2hDOzs7Ozs7OztPQVFHO0lBQ0g7UUFBQTtZQVdFLG9CQUFlLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQztZQU9yQyxxQkFBZ0IsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUM7WUFxQnZDLG1CQUFjLEdBQUcsRUFBRSxDQUFDLHdCQUF3QixDQUFDO1lBVzdDLG9CQUFlLEdBQUcsRUFBRSxDQUFDLHlCQUF5QixDQUFDO1lBMEMvQyxxQkFBZ0IsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUM7UUEwQnpDLENBQUM7UUFySEMseUNBQWEsR0FBYixVQUFjLElBQW1CO1lBQy9CLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDekIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO2FBQ2xCO2lCQUFNLElBQUksRUFBRSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM1RSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2FBQ3ZCO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDO2FBQ2I7UUFDSCxDQUFDO1FBSUQsOENBQWtCLEdBQWxCLFVBQW1CLEdBQWtCO1lBQ25DLElBQUEsY0FBTSxFQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsZUFBZSxFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFDdEQsT0FB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QUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDO0lBQzdGLENBQUM7SUFJRDs7T0FFRztJQUNILFNBQVMsd0JBQXdCLENBQUMsSUFBbUI7UUFDbkQsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQjtZQUN2RixFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO0lBQ3BHLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RmF0YWxMaW5rZXJFcnJvcn0gZnJvbSAnLi4vLi4vZmF0YWxfbGlua2VyX2Vycm9yJztcbmltcG9ydCB7QXN0SG9zdCwgUmFuZ2V9IGZyb20gJy4uL2FzdF9ob3N0JztcbmltcG9ydCB7YXNzZXJ0fSBmcm9tICcuLi91dGlscyc7XG5cblxuLyoqXG4gKiBUaGlzIGltcGxlbWVudGF0aW9uIG9mIGBBc3RIb3N0YCBpcyBhYmxlIHRvIGdldCBpbmZvcm1hdGlvbiBmcm9tIFR5cGVTY3JpcHQgQVNUIG5vZGVzLlxuICpcbiAqIFRoaXMgaG9zdCBpcyBub3QgYWN0dWFsbHkgdXNlZCBhdCBydW50aW1lIGluIHRoZSBjdXJyZW50IGNvZGUuXG4gKlxuICogSXQgaXMgaW1wbGVtZW50ZWQgaGVyZSB0byBlbnN1cmUgdGhhdCB0aGUgYEFzdEhvc3RgIGFic3RyYWN0aW9uIGlzIG5vdCB1bmZhaXJseSBza2V3ZWQgdG93YXJkc1xuICogdGhlIEJhYmVsIGltcGxlbWVudGF0aW9uLiBJdCBjb3VsZCBhbHNvIHByb3ZpZGUgYSBiYXNpcyBmb3IgYSAzcmQgVHlwZVNjcmlwdCBjb21waWxlciBwbHVnaW4gdG9cbiAqIGRvIGxpbmtpbmcgaW4gdGhlIGZ1dHVyZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFR5cGVTY3JpcHRBc3RIb3N0IGltcGxlbWVudHMgQXN0SG9zdDx0cy5FeHByZXNzaW9uPiB7XG4gIGdldFN5bWJvbE5hbWUobm9kZTogdHMuRXhwcmVzc2lvbik6IHN0cmluZ3xudWxsIHtcbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS50ZXh0O1xuICAgIH0gZWxzZSBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSkgJiYgdHMuaXNJZGVudGlmaWVyKG5vZGUubmFtZSkpIHtcbiAgICAgIHJldHVybiBub2RlLm5hbWUudGV4dDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgaXNTdHJpbmdMaXRlcmFsID0gdHMuaXNTdHJpbmdMaXRlcmFsO1xuXG4gIHBhcnNlU3RyaW5nTGl0ZXJhbChzdHI6IHRzLkV4cHJlc3Npb24pOiBzdHJpbmcge1xuICAgIGFzc2VydChzdHIsIHRoaXMuaXNTdHJpbmdMaXRlcmFsLCAnYSBzdHJpbmcgbGl0ZXJhbCcpO1xuICAgIHJldHVybiBzdHIudGV4dDtcbiAgfVxuXG4gIGlzTnVtZXJpY0xpdGVyYWwgPSB0cy5pc051bWVyaWNMaXRlcmFsO1xuXG4gIHBhcnNlTnVtZXJpY0xpdGVyYWwobnVtOiB0cy5FeHByZXNzaW9uKTogbnVtYmVyIHtcbiAgICBhc3NlcnQobnVtLCB0aGlzLmlzTnVtZXJpY0xpdGVyYWwsICdhIG51bWVyaWMgbGl0ZXJhbCcpO1xuICAgIHJldHVybiBwYXJzZUludChudW0udGV4dCk7XG4gIH1cblxuICBpc0Jvb2xlYW5MaXRlcmFsKG5vZGU6IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgICByZXR1cm4gaXNCb29sZWFuTGl0ZXJhbChub2RlKSB8fCBpc01pbmlmaWVkQm9vbGVhbkxpdGVyYWwobm9kZSk7XG4gIH1cblxuICBwYXJzZUJvb2xlYW5MaXRlcmFsKGJvb2w6IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgICBpZiAoaXNCb29sZWFuTGl0ZXJhbChib29sKSkge1xuICAgICAgcmV0dXJuIGJvb2wua2luZCA9PT0gdHMuU3ludGF4S2luZC5UcnVlS2V5d29yZDtcbiAgICB9IGVsc2UgaWYgKGlzTWluaWZpZWRCb29sZWFuTGl0ZXJhbChib29sKSkge1xuICAgICAgcmV0dXJuICEoK2Jvb2wub3BlcmFuZC50ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IoYm9vbCwgJ1Vuc3VwcG9ydGVkIHN5bnRheCwgZXhwZWN0ZWQgYSBib29sZWFuIGxpdGVyYWwuJyk7XG4gICAgfVxuICB9XG5cbiAgaXNBcnJheUxpdGVyYWwgPSB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb247XG5cbiAgcGFyc2VBcnJheUxpdGVyYWwoYXJyYXk6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uW10ge1xuICAgIGFzc2VydChhcnJheSwgdGhpcy5pc0FycmF5TGl0ZXJhbCwgJ2FuIGFycmF5IGxpdGVyYWwnKTtcbiAgICByZXR1cm4gYXJyYXkuZWxlbWVudHMubWFwKGVsZW1lbnQgPT4ge1xuICAgICAgYXNzZXJ0KGVsZW1lbnQsIGlzTm90RW1wdHlFbGVtZW50LCAnZWxlbWVudCBpbiBhcnJheSBub3QgdG8gYmUgZW1wdHknKTtcbiAgICAgIGFzc2VydChlbGVtZW50LCBpc05vdFNwcmVhZEVsZW1lbnQsICdlbGVtZW50IGluIGFycmF5IG5vdCB0byB1c2Ugc3ByZWFkIHN5bnRheCcpO1xuICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfSk7XG4gIH1cblxuICBpc09iamVjdExpdGVyYWwgPSB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uO1xuXG4gIHBhcnNlT2JqZWN0TGl0ZXJhbChvYmo6IHRzLkV4cHJlc3Npb24pOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiB7XG4gICAgYXNzZXJ0KG9iaiwgdGhpcy5pc09iamVjdExpdGVyYWwsICdhbiBvYmplY3QgbGl0ZXJhbCcpO1xuXG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+KCk7XG4gICAgZm9yIChjb25zdCBwcm9wZXJ0eSBvZiBvYmoucHJvcGVydGllcykge1xuICAgICAgYXNzZXJ0KHByb3BlcnR5LCB0cy5pc1Byb3BlcnR5QXNzaWdubWVudCwgJ2EgcHJvcGVydHkgYXNzaWdubWVudCcpO1xuICAgICAgYXNzZXJ0KHByb3BlcnR5Lm5hbWUsIGlzUHJvcGVydHlOYW1lLCAnYSBwcm9wZXJ0eSBuYW1lJyk7XG4gICAgICByZXN1bHQuc2V0KHByb3BlcnR5Lm5hbWUudGV4dCwgcHJvcGVydHkuaW5pdGlhbGl6ZXIpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgaXNGdW5jdGlvbkV4cHJlc3Npb24obm9kZTogdHMuRXhwcmVzc2lvbik6IG5vZGUgaXMgdHMuRnVuY3Rpb25FeHByZXNzaW9ufHRzLkFycm93RnVuY3Rpb24ge1xuICAgIHJldHVybiB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihub2RlKSB8fCB0cy5pc0Fycm93RnVuY3Rpb24obm9kZSk7XG4gIH1cblxuICBwYXJzZVJldHVyblZhbHVlKGZuOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgYXNzZXJ0KGZuLCB0aGlzLmlzRnVuY3Rpb25FeHByZXNzaW9uLCAnYSBmdW5jdGlvbicpO1xuICAgIGlmICghdHMuaXNCbG9jayhmbi5ib2R5KSkge1xuICAgICAgLy8gaXQgaXMgYSBzaW1wbGUgYXJyYXkgZnVuY3Rpb24gZXhwcmVzc2lvbjogYCguLi4pID0+IGV4cHJgXG4gICAgICByZXR1cm4gZm4uYm9keTtcbiAgICB9XG5cbiAgICAvLyBpdCBpcyBhIGZ1bmN0aW9uIChhcnJvdyBvciBub3JtYWwpIHdpdGggYSBib2R5LiBFLmcuOlxuICAgIC8vICogYCguLi4pID0+IHsgc3RtdDsgLi4uIH1gXG4gICAgLy8gKiBgZnVuY3Rpb24oLi4uKSB7IHN0bXQ7IC4uLiB9YFxuXG4gICAgaWYgKGZuLmJvZHkuc3RhdGVtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICAgIGZuLmJvZHksICdVbnN1cHBvcnRlZCBzeW50YXgsIGV4cGVjdGVkIGEgZnVuY3Rpb24gYm9keSB3aXRoIGEgc2luZ2xlIHJldHVybiBzdGF0ZW1lbnQuJyk7XG4gICAgfVxuICAgIGNvbnN0IHN0bXQgPSBmbi5ib2R5LnN0YXRlbWVudHNbMF07XG4gICAgYXNzZXJ0KHN0bXQsIHRzLmlzUmV0dXJuU3RhdGVtZW50LCAnYSBmdW5jdGlvbiBib2R5IHdpdGggYSBzaW5nbGUgcmV0dXJuIHN0YXRlbWVudCcpO1xuICAgIGlmIChzdG10LmV4cHJlc3Npb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3Ioc3RtdCwgJ1Vuc3VwcG9ydGVkIHN5bnRheCwgZXhwZWN0ZWQgZnVuY3Rpb24gdG8gcmV0dXJuIGEgdmFsdWUuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0bXQuZXhwcmVzc2lvbjtcbiAgfVxuXG4gIGlzQ2FsbEV4cHJlc3Npb24gPSB0cy5pc0NhbGxFeHByZXNzaW9uO1xuXG4gIHBhcnNlQ2FsbGVlKGNhbGw6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uIHtcbiAgICBhc3NlcnQoY2FsbCwgdHMuaXNDYWxsRXhwcmVzc2lvbiwgJ2EgY2FsbCBleHByZXNzaW9uJyk7XG4gICAgcmV0dXJuIGNhbGwuZXhwcmVzc2lvbjtcbiAgfVxuXG4gIHBhcnNlQXJndW1lbnRzKGNhbGw6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uW10ge1xuICAgIGFzc2VydChjYWxsLCB0cy5pc0NhbGxFeHByZXNzaW9uLCAnYSBjYWxsIGV4cHJlc3Npb24nKTtcbiAgICByZXR1cm4gY2FsbC5hcmd1bWVudHMubWFwKGFyZyA9PiB7XG4gICAgICBhc3NlcnQoYXJnLCBpc05vdFNwcmVhZEVsZW1lbnQsICdhcmd1bWVudCBub3QgdG8gdXNlIHNwcmVhZCBzeW50YXgnKTtcbiAgICAgIHJldHVybiBhcmc7XG4gICAgfSk7XG4gIH1cblxuICBnZXRSYW5nZShub2RlOiB0cy5FeHByZXNzaW9uKTogUmFuZ2Uge1xuICAgIGNvbnN0IGZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICBpZiAoZmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgICBub2RlLCAnVW5hYmxlIHRvIHJlYWQgcmFuZ2UgZm9yIG5vZGUgLSBpdCBpcyBtaXNzaW5nIHBhcmVudCBpbmZvcm1hdGlvbi4nKTtcbiAgICB9XG4gICAgY29uc3Qgc3RhcnRQb3MgPSBub2RlLmdldFN0YXJ0KCk7XG4gICAgY29uc3QgZW5kUG9zID0gbm9kZS5nZXRFbmQoKTtcbiAgICBjb25zdCB7bGluZTogc3RhcnRMaW5lLCBjaGFyYWN0ZXI6IHN0YXJ0Q29sfSA9IHRzLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKGZpbGUsIHN0YXJ0UG9zKTtcbiAgICByZXR1cm4ge3N0YXJ0TGluZSwgc3RhcnRDb2wsIHN0YXJ0UG9zLCBlbmRQb3N9O1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gZG9lcyBub3QgcmVwcmVzZW50IGFuIGVtcHR5IGVsZW1lbnQgaW4gYW4gYXJyYXkgbGl0ZXJhbC5cbiAqIEZvciBleGFtcGxlIGluIGBbLGZvb11gIHRoZSBmaXJzdCBlbGVtZW50IGlzIFwiZW1wdHlcIi5cbiAqL1xuZnVuY3Rpb24gaXNOb3RFbXB0eUVsZW1lbnQoZTogdHMuRXhwcmVzc2lvbnx0cy5TcHJlYWRFbGVtZW50fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuT21pdHRlZEV4cHJlc3Npb24pOiBlIGlzIHRzLkV4cHJlc3Npb258dHMuU3ByZWFkRWxlbWVudCB7XG4gIHJldHVybiAhdHMuaXNPbWl0dGVkRXhwcmVzc2lvbihlKTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiB0aGUgZXhwcmVzc2lvbiBpcyBub3QgYSBzcHJlYWQgZWxlbWVudCBvZiBhbiBhcnJheSBsaXRlcmFsLlxuICogRm9yIGV4YW1wbGUgaW4gYFt4LCAuLi5yZXN0XWAgdGhlIGAuLi5yZXN0YCBleHByZXNzaW9uIGlzIGEgc3ByZWFkIGVsZW1lbnQuXG4gKi9cbmZ1bmN0aW9uIGlzTm90U3ByZWFkRWxlbWVudChlOiB0cy5FeHByZXNzaW9ufHRzLlNwcmVhZEVsZW1lbnQpOiBlIGlzIHRzLkV4cHJlc3Npb24ge1xuICByZXR1cm4gIXRzLmlzU3ByZWFkRWxlbWVudChlKTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiB0aGUgZXhwcmVzc2lvbiBjYW4gYmUgY29uc2lkZXJlZCBhIHRleHQgYmFzZWQgcHJvcGVydHkgbmFtZS5cbiAqL1xuZnVuY3Rpb24gaXNQcm9wZXJ0eU5hbWUoZTogdHMuUHJvcGVydHlOYW1lKTogZSBpcyB0cy5JZGVudGlmaWVyfHRzLlN0cmluZ0xpdGVyYWx8dHMuTnVtZXJpY0xpdGVyYWwge1xuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKGUpIHx8IHRzLmlzU3RyaW5nTGl0ZXJhbChlKSB8fCB0cy5pc051bWVyaWNMaXRlcmFsKGUpO1xufVxuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHRoZSBub2RlIGlzIGVpdGhlciBgdHJ1ZWAgb3IgYGZhbHNlYCBsaXRlcmFscy5cbiAqL1xuZnVuY3Rpb24gaXNCb29sZWFuTGl0ZXJhbChub2RlOiB0cy5FeHByZXNzaW9uKTogbm9kZSBpcyB0cy5UcnVlTGl0ZXJhbHx0cy5GYWxzZUxpdGVyYWwge1xuICByZXR1cm4gbm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkIHx8IG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5GYWxzZUtleXdvcmQ7XG59XG5cbnR5cGUgTWluaWZpZWRCb29sZWFuTGl0ZXJhbCA9IHRzLlByZWZpeFVuYXJ5RXhwcmVzc2lvbiZ7b3BlcmFuZDogdHMuTnVtZXJpY0xpdGVyYWx9O1xuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHRoZSBub2RlIGlzIGVpdGhlciBgITBgIG9yIGAhMWAuXG4gKi9cbmZ1bmN0aW9uIGlzTWluaWZpZWRCb29sZWFuTGl0ZXJhbChub2RlOiB0cy5FeHByZXNzaW9uKTogbm9kZSBpcyBNaW5pZmllZEJvb2xlYW5MaXRlcmFsIHtcbiAgcmV0dXJuIHRzLmlzUHJlZml4VW5hcnlFeHByZXNzaW9uKG5vZGUpICYmIG5vZGUub3BlcmF0b3IgPT09IHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25Ub2tlbiAmJlxuICAgICAgdHMuaXNOdW1lcmljTGl0ZXJhbChub2RlLm9wZXJhbmQpICYmIChub2RlLm9wZXJhbmQudGV4dCA9PT0gJzAnIHx8IG5vZGUub3BlcmFuZC50ZXh0ID09PSAnMScpO1xufVxuIl19