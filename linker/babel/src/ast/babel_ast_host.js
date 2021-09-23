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
        define("@angular/compiler-cli/linker/babel/src/ast/babel_ast_host", ["require", "exports", "tslib", "@babel/types", "@angular/compiler-cli/linker"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BabelAstHost = void 0;
    var tslib_1 = require("tslib");
    var t = require("@babel/types");
    var linker_1 = require("@angular/compiler-cli/linker");
    /**
     * This implementation of `AstHost` is able to get information from Babel AST nodes.
     */
    var BabelAstHost = /** @class */ (function () {
        function BabelAstHost() {
            this.isStringLiteral = t.isStringLiteral;
            this.isNumericLiteral = t.isNumericLiteral;
            this.isArrayLiteral = t.isArrayExpression;
            this.isObjectLiteral = t.isObjectExpression;
            this.isCallExpression = t.isCallExpression;
        }
        BabelAstHost.prototype.getSymbolName = function (node) {
            if (t.isIdentifier(node)) {
                return node.name;
            }
            else if (t.isMemberExpression(node) && t.isIdentifier(node.property)) {
                return node.property.name;
            }
            else {
                return null;
            }
        };
        BabelAstHost.prototype.parseStringLiteral = function (str) {
            (0, linker_1.assert)(str, t.isStringLiteral, 'a string literal');
            return str.value;
        };
        BabelAstHost.prototype.parseNumericLiteral = function (num) {
            (0, linker_1.assert)(num, t.isNumericLiteral, 'a numeric literal');
            return num.value;
        };
        BabelAstHost.prototype.isBooleanLiteral = function (bool) {
            return t.isBooleanLiteral(bool) || isMinifiedBooleanLiteral(bool);
        };
        BabelAstHost.prototype.parseBooleanLiteral = function (bool) {
            if (t.isBooleanLiteral(bool)) {
                return bool.value;
            }
            else if (isMinifiedBooleanLiteral(bool)) {
                return !bool.argument.value;
            }
            else {
                throw new linker_1.FatalLinkerError(bool, 'Unsupported syntax, expected a boolean literal.');
            }
        };
        BabelAstHost.prototype.parseArrayLiteral = function (array) {
            (0, linker_1.assert)(array, t.isArrayExpression, 'an array literal');
            return array.elements.map(function (element) {
                (0, linker_1.assert)(element, isNotEmptyElement, 'element in array not to be empty');
                (0, linker_1.assert)(element, isNotSpreadElement, 'element in array not to use spread syntax');
                return element;
            });
        };
        BabelAstHost.prototype.parseObjectLiteral = function (obj) {
            var e_1, _a;
            (0, linker_1.assert)(obj, t.isObjectExpression, 'an object literal');
            var result = new Map();
            try {
                for (var _b = (0, tslib_1.__values)(obj.properties), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var property = _c.value;
                    (0, linker_1.assert)(property, t.isObjectProperty, 'a property assignment');
                    (0, linker_1.assert)(property.value, t.isExpression, 'an expression');
                    (0, linker_1.assert)(property.key, isPropertyName, 'a property name');
                    var key = t.isIdentifier(property.key) ? property.key.name : property.key.value;
                    result.set(key, property.value);
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
        BabelAstHost.prototype.isFunctionExpression = function (node) {
            return t.isFunction(node);
        };
        BabelAstHost.prototype.parseReturnValue = function (fn) {
            (0, linker_1.assert)(fn, this.isFunctionExpression, 'a function');
            if (!t.isBlockStatement(fn.body)) {
                // it is a simple array function expression: `(...) => expr`
                return fn.body;
            }
            // it is a function (arrow or normal) with a body. E.g.:
            // * `(...) => { stmt; ... }`
            // * `function(...) { stmt; ... }`
            if (fn.body.body.length !== 1) {
                throw new linker_1.FatalLinkerError(fn.body, 'Unsupported syntax, expected a function body with a single return statement.');
            }
            var stmt = fn.body.body[0];
            (0, linker_1.assert)(stmt, t.isReturnStatement, 'a function body with a single return statement');
            if (stmt.argument === null) {
                throw new linker_1.FatalLinkerError(stmt, 'Unsupported syntax, expected function to return a value.');
            }
            return stmt.argument;
        };
        BabelAstHost.prototype.parseCallee = function (call) {
            (0, linker_1.assert)(call, t.isCallExpression, 'a call expression');
            (0, linker_1.assert)(call.callee, t.isExpression, 'an expression');
            return call.callee;
        };
        BabelAstHost.prototype.parseArguments = function (call) {
            (0, linker_1.assert)(call, t.isCallExpression, 'a call expression');
            return call.arguments.map(function (arg) {
                (0, linker_1.assert)(arg, isNotSpreadArgument, 'argument not to use spread syntax');
                (0, linker_1.assert)(arg, t.isExpression, 'argument to be an expression');
                return arg;
            });
        };
        BabelAstHost.prototype.getRange = function (node) {
            if (node.loc == null || node.start === null || node.end === null) {
                throw new linker_1.FatalLinkerError(node, 'Unable to read range for node - it is missing location information.');
            }
            return {
                startLine: node.loc.start.line - 1,
                startCol: node.loc.start.column,
                startPos: node.start,
                endPos: node.end,
            };
        };
        return BabelAstHost;
    }());
    exports.BabelAstHost = BabelAstHost;
    /**
     * Return true if the expression does not represent an empty element in an array literal.
     * For example in `[,foo]` the first element is "empty".
     */
    function isNotEmptyElement(e) {
        return e !== null;
    }
    /**
     * Return true if the expression is not a spread element of an array literal.
     * For example in `[x, ...rest]` the `...rest` expression is a spread element.
     */
    function isNotSpreadElement(e) {
        return !t.isSpreadElement(e);
    }
    /**
     * Return true if the expression can be considered a text based property name.
     */
    function isPropertyName(e) {
        return t.isIdentifier(e) || t.isStringLiteral(e) || t.isNumericLiteral(e);
    }
    /**
     * Return true if the argument is not a spread element.
     */
    function isNotSpreadArgument(arg) {
        return !t.isSpreadElement(arg);
    }
    /**
     * Return true if the node is either `!0` or `!1`.
     */
    function isMinifiedBooleanLiteral(node) {
        return t.isUnaryExpression(node) && node.prefix && node.operator === '!' &&
            t.isNumericLiteral(node.argument) && (node.argument.value === 0 || node.argument.value === 1);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFiZWxfYXN0X2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL2JhYmVsL3NyYy9hc3QvYmFiZWxfYXN0X2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILGdDQUFrQztJQUVsQyx1REFBNEU7SUFFNUU7O09BRUc7SUFDSDtRQUFBO1lBV0Usb0JBQWUsR0FBRyxDQUFDLENBQUMsZUFBZSxDQUFDO1lBT3BDLHFCQUFnQixHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztZQXFCdEMsbUJBQWMsR0FBRyxDQUFDLENBQUMsaUJBQWlCLENBQUM7WUFXckMsb0JBQWUsR0FBRyxDQUFDLENBQUMsa0JBQWtCLENBQUM7WUE0Q3ZDLHFCQUFnQixHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztRQTJCeEMsQ0FBQztRQXhIQyxvQ0FBYSxHQUFiLFVBQWMsSUFBa0I7WUFDOUIsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN4QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7YUFDbEI7aUJBQU0sSUFBSSxDQUFDLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ3RFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7YUFDM0I7aUJBQU07Z0JBQ0wsT0FBTyxJQUFJLENBQUM7YUFDYjtRQUNILENBQUM7UUFJRCx5Q0FBa0IsR0FBbEIsVUFBbUIsR0FBaUI7WUFDbEMsSUFBQSxlQUFNLEVBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxlQUFlLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUNuRCxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFDbkIsQ0FBQztR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QUFDLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFPRDs7T0FFRztJQUNILFNBQVMsbUJBQW1CLENBQUMsR0FBaUI7UUFDNUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUlEOztPQUVHO0lBQ0gsU0FBUyx3QkFBd0IsQ0FBQyxJQUFrQjtRQUNsRCxPQUFPLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssR0FBRztZQUNwRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3BHLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdCBmcm9tICdAYmFiZWwvdHlwZXMnO1xuXG5pbXBvcnQge2Fzc2VydCwgQXN0SG9zdCwgRmF0YWxMaW5rZXJFcnJvciwgUmFuZ2V9IGZyb20gJy4uLy4uLy4uLy4uL2xpbmtlcic7XG5cbi8qKlxuICogVGhpcyBpbXBsZW1lbnRhdGlvbiBvZiBgQXN0SG9zdGAgaXMgYWJsZSB0byBnZXQgaW5mb3JtYXRpb24gZnJvbSBCYWJlbCBBU1Qgbm9kZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBCYWJlbEFzdEhvc3QgaW1wbGVtZW50cyBBc3RIb3N0PHQuRXhwcmVzc2lvbj4ge1xuICBnZXRTeW1ib2xOYW1lKG5vZGU6IHQuRXhwcmVzc2lvbik6IHN0cmluZ3xudWxsIHtcbiAgICBpZiAodC5pc0lkZW50aWZpZXIobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLm5hbWU7XG4gICAgfSBlbHNlIGlmICh0LmlzTWVtYmVyRXhwcmVzc2lvbihub2RlKSAmJiB0LmlzSWRlbnRpZmllcihub2RlLnByb3BlcnR5KSkge1xuICAgICAgcmV0dXJuIG5vZGUucHJvcGVydHkubmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgaXNTdHJpbmdMaXRlcmFsID0gdC5pc1N0cmluZ0xpdGVyYWw7XG5cbiAgcGFyc2VTdHJpbmdMaXRlcmFsKHN0cjogdC5FeHByZXNzaW9uKTogc3RyaW5nIHtcbiAgICBhc3NlcnQoc3RyLCB0LmlzU3RyaW5nTGl0ZXJhbCwgJ2Egc3RyaW5nIGxpdGVyYWwnKTtcbiAgICByZXR1cm4gc3RyLnZhbHVlO1xuICB9XG5cbiAgaXNOdW1lcmljTGl0ZXJhbCA9IHQuaXNOdW1lcmljTGl0ZXJhbDtcblxuICBwYXJzZU51bWVyaWNMaXRlcmFsKG51bTogdC5FeHByZXNzaW9uKTogbnVtYmVyIHtcbiAgICBhc3NlcnQobnVtLCB0LmlzTnVtZXJpY0xpdGVyYWwsICdhIG51bWVyaWMgbGl0ZXJhbCcpO1xuICAgIHJldHVybiBudW0udmFsdWU7XG4gIH1cblxuICBpc0Jvb2xlYW5MaXRlcmFsKGJvb2w6IHQuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0LmlzQm9vbGVhbkxpdGVyYWwoYm9vbCkgfHwgaXNNaW5pZmllZEJvb2xlYW5MaXRlcmFsKGJvb2wpO1xuICB9XG5cbiAgcGFyc2VCb29sZWFuTGl0ZXJhbChib29sOiB0LkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgICBpZiAodC5pc0Jvb2xlYW5MaXRlcmFsKGJvb2wpKSB7XG4gICAgICByZXR1cm4gYm9vbC52YWx1ZTtcbiAgICB9IGVsc2UgaWYgKGlzTWluaWZpZWRCb29sZWFuTGl0ZXJhbChib29sKSkge1xuICAgICAgcmV0dXJuICFib29sLmFyZ3VtZW50LnZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihib29sLCAnVW5zdXBwb3J0ZWQgc3ludGF4LCBleHBlY3RlZCBhIGJvb2xlYW4gbGl0ZXJhbC4nKTtcbiAgICB9XG4gIH1cblxuICBpc0FycmF5TGl0ZXJhbCA9IHQuaXNBcnJheUV4cHJlc3Npb247XG5cbiAgcGFyc2VBcnJheUxpdGVyYWwoYXJyYXk6IHQuRXhwcmVzc2lvbik6IHQuRXhwcmVzc2lvbltdIHtcbiAgICBhc3NlcnQoYXJyYXksIHQuaXNBcnJheUV4cHJlc3Npb24sICdhbiBhcnJheSBsaXRlcmFsJyk7XG4gICAgcmV0dXJuIGFycmF5LmVsZW1lbnRzLm1hcChlbGVtZW50ID0+IHtcbiAgICAgIGFzc2VydChlbGVtZW50LCBpc05vdEVtcHR5RWxlbWVudCwgJ2VsZW1lbnQgaW4gYXJyYXkgbm90IHRvIGJlIGVtcHR5Jyk7XG4gICAgICBhc3NlcnQoZWxlbWVudCwgaXNOb3RTcHJlYWRFbGVtZW50LCAnZWxlbWVudCBpbiBhcnJheSBub3QgdG8gdXNlIHNwcmVhZCBzeW50YXgnKTtcbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH0pO1xuICB9XG5cbiAgaXNPYmplY3RMaXRlcmFsID0gdC5pc09iamVjdEV4cHJlc3Npb247XG5cbiAgcGFyc2VPYmplY3RMaXRlcmFsKG9iajogdC5FeHByZXNzaW9uKTogTWFwPHN0cmluZywgdC5FeHByZXNzaW9uPiB7XG4gICAgYXNzZXJ0KG9iaiwgdC5pc09iamVjdEV4cHJlc3Npb24sICdhbiBvYmplY3QgbGl0ZXJhbCcpO1xuXG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcDxzdHJpbmcsIHQuRXhwcmVzc2lvbj4oKTtcbiAgICBmb3IgKGNvbnN0IHByb3BlcnR5IG9mIG9iai5wcm9wZXJ0aWVzKSB7XG4gICAgICBhc3NlcnQocHJvcGVydHksIHQuaXNPYmplY3RQcm9wZXJ0eSwgJ2EgcHJvcGVydHkgYXNzaWdubWVudCcpO1xuICAgICAgYXNzZXJ0KHByb3BlcnR5LnZhbHVlLCB0LmlzRXhwcmVzc2lvbiwgJ2FuIGV4cHJlc3Npb24nKTtcbiAgICAgIGFzc2VydChwcm9wZXJ0eS5rZXksIGlzUHJvcGVydHlOYW1lLCAnYSBwcm9wZXJ0eSBuYW1lJyk7XG4gICAgICBjb25zdCBrZXkgPSB0LmlzSWRlbnRpZmllcihwcm9wZXJ0eS5rZXkpID8gcHJvcGVydHkua2V5Lm5hbWUgOiBwcm9wZXJ0eS5rZXkudmFsdWU7XG4gICAgICByZXN1bHQuc2V0KGtleSwgcHJvcGVydHkudmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgaXNGdW5jdGlvbkV4cHJlc3Npb24obm9kZTogdC5FeHByZXNzaW9uKTogbm9kZSBpcyBFeHRyYWN0PHQuRnVuY3Rpb24sIHQuRXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiB0LmlzRnVuY3Rpb24obm9kZSk7XG4gIH1cblxuICBwYXJzZVJldHVyblZhbHVlKGZuOiB0LkV4cHJlc3Npb24pOiB0LkV4cHJlc3Npb24ge1xuICAgIGFzc2VydChmbiwgdGhpcy5pc0Z1bmN0aW9uRXhwcmVzc2lvbiwgJ2EgZnVuY3Rpb24nKTtcbiAgICBpZiAoIXQuaXNCbG9ja1N0YXRlbWVudChmbi5ib2R5KSkge1xuICAgICAgLy8gaXQgaXMgYSBzaW1wbGUgYXJyYXkgZnVuY3Rpb24gZXhwcmVzc2lvbjogYCguLi4pID0+IGV4cHJgXG4gICAgICByZXR1cm4gZm4uYm9keTtcbiAgICB9XG5cbiAgICAvLyBpdCBpcyBhIGZ1bmN0aW9uIChhcnJvdyBvciBub3JtYWwpIHdpdGggYSBib2R5LiBFLmcuOlxuICAgIC8vICogYCguLi4pID0+IHsgc3RtdDsgLi4uIH1gXG4gICAgLy8gKiBgZnVuY3Rpb24oLi4uKSB7IHN0bXQ7IC4uLiB9YFxuXG4gICAgaWYgKGZuLmJvZHkuYm9keS5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICAgIGZuLmJvZHksICdVbnN1cHBvcnRlZCBzeW50YXgsIGV4cGVjdGVkIGEgZnVuY3Rpb24gYm9keSB3aXRoIGEgc2luZ2xlIHJldHVybiBzdGF0ZW1lbnQuJyk7XG4gICAgfVxuICAgIGNvbnN0IHN0bXQgPSBmbi5ib2R5LmJvZHlbMF07XG4gICAgYXNzZXJ0KHN0bXQsIHQuaXNSZXR1cm5TdGF0ZW1lbnQsICdhIGZ1bmN0aW9uIGJvZHkgd2l0aCBhIHNpbmdsZSByZXR1cm4gc3RhdGVtZW50Jyk7XG4gICAgaWYgKHN0bXQuYXJndW1lbnQgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKHN0bXQsICdVbnN1cHBvcnRlZCBzeW50YXgsIGV4cGVjdGVkIGZ1bmN0aW9uIHRvIHJldHVybiBhIHZhbHVlLicpO1xuICAgIH1cblxuICAgIHJldHVybiBzdG10LmFyZ3VtZW50O1xuICB9XG5cbiAgaXNDYWxsRXhwcmVzc2lvbiA9IHQuaXNDYWxsRXhwcmVzc2lvbjtcbiAgcGFyc2VDYWxsZWUoY2FsbDogdC5FeHByZXNzaW9uKTogdC5FeHByZXNzaW9uIHtcbiAgICBhc3NlcnQoY2FsbCwgdC5pc0NhbGxFeHByZXNzaW9uLCAnYSBjYWxsIGV4cHJlc3Npb24nKTtcbiAgICBhc3NlcnQoY2FsbC5jYWxsZWUsIHQuaXNFeHByZXNzaW9uLCAnYW4gZXhwcmVzc2lvbicpO1xuICAgIHJldHVybiBjYWxsLmNhbGxlZTtcbiAgfVxuICBwYXJzZUFyZ3VtZW50cyhjYWxsOiB0LkV4cHJlc3Npb24pOiB0LkV4cHJlc3Npb25bXSB7XG4gICAgYXNzZXJ0KGNhbGwsIHQuaXNDYWxsRXhwcmVzc2lvbiwgJ2EgY2FsbCBleHByZXNzaW9uJyk7XG4gICAgcmV0dXJuIGNhbGwuYXJndW1lbnRzLm1hcChhcmcgPT4ge1xuICAgICAgYXNzZXJ0KGFyZywgaXNOb3RTcHJlYWRBcmd1bWVudCwgJ2FyZ3VtZW50IG5vdCB0byB1c2Ugc3ByZWFkIHN5bnRheCcpO1xuICAgICAgYXNzZXJ0KGFyZywgdC5pc0V4cHJlc3Npb24sICdhcmd1bWVudCB0byBiZSBhbiBleHByZXNzaW9uJyk7XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0UmFuZ2Uobm9kZTogdC5FeHByZXNzaW9uKTogUmFuZ2Uge1xuICAgIGlmIChub2RlLmxvYyA9PSBudWxsIHx8IG5vZGUuc3RhcnQgPT09IG51bGwgfHwgbm9kZS5lbmQgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICAgIG5vZGUsICdVbmFibGUgdG8gcmVhZCByYW5nZSBmb3Igbm9kZSAtIGl0IGlzIG1pc3NpbmcgbG9jYXRpb24gaW5mb3JtYXRpb24uJyk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBzdGFydExpbmU6IG5vZGUubG9jLnN0YXJ0LmxpbmUgLSAxLCAgLy8gQmFiZWwgbGluZXMgYXJlIDEtYmFzZWRcbiAgICAgIHN0YXJ0Q29sOiBub2RlLmxvYy5zdGFydC5jb2x1bW4sXG4gICAgICBzdGFydFBvczogbm9kZS5zdGFydCxcbiAgICAgIGVuZFBvczogbm9kZS5lbmQsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHRoZSBleHByZXNzaW9uIGRvZXMgbm90IHJlcHJlc2VudCBhbiBlbXB0eSBlbGVtZW50IGluIGFuIGFycmF5IGxpdGVyYWwuXG4gKiBGb3IgZXhhbXBsZSBpbiBgWyxmb29dYCB0aGUgZmlyc3QgZWxlbWVudCBpcyBcImVtcHR5XCIuXG4gKi9cbmZ1bmN0aW9uIGlzTm90RW1wdHlFbGVtZW50KGU6IHQuRXhwcmVzc2lvbnx0LlNwcmVhZEVsZW1lbnR8bnVsbCk6IGUgaXMgdC5FeHByZXNzaW9ufFxuICAgIHQuU3ByZWFkRWxlbWVudCB7XG4gIHJldHVybiBlICE9PSBudWxsO1xufVxuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHRoZSBleHByZXNzaW9uIGlzIG5vdCBhIHNwcmVhZCBlbGVtZW50IG9mIGFuIGFycmF5IGxpdGVyYWwuXG4gKiBGb3IgZXhhbXBsZSBpbiBgW3gsIC4uLnJlc3RdYCB0aGUgYC4uLnJlc3RgIGV4cHJlc3Npb24gaXMgYSBzcHJlYWQgZWxlbWVudC5cbiAqL1xuZnVuY3Rpb24gaXNOb3RTcHJlYWRFbGVtZW50KGU6IHQuRXhwcmVzc2lvbnx0LlNwcmVhZEVsZW1lbnQpOiBlIGlzIHQuRXhwcmVzc2lvbiB7XG4gIHJldHVybiAhdC5pc1NwcmVhZEVsZW1lbnQoZSk7XG59XG5cblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiB0aGUgZXhwcmVzc2lvbiBjYW4gYmUgY29uc2lkZXJlZCBhIHRleHQgYmFzZWQgcHJvcGVydHkgbmFtZS5cbiAqL1xuZnVuY3Rpb24gaXNQcm9wZXJ0eU5hbWUoZTogdC5FeHByZXNzaW9uKTogZSBpcyB0LklkZW50aWZpZXJ8dC5TdHJpbmdMaXRlcmFsfHQuTnVtZXJpY0xpdGVyYWwge1xuICByZXR1cm4gdC5pc0lkZW50aWZpZXIoZSkgfHwgdC5pc1N0cmluZ0xpdGVyYWwoZSkgfHwgdC5pc051bWVyaWNMaXRlcmFsKGUpO1xufVxuXG4vKipcbiAqIFRoZSBkZWNsYXJlZCB0eXBlIG9mIGFuIGFyZ3VtZW50IHRvIGEgY2FsbCBleHByZXNzaW9uLlxuICovXG50eXBlIEFyZ3VtZW50VHlwZSA9IHQuQ2FsbEV4cHJlc3Npb25bJ2FyZ3VtZW50cyddW251bWJlcl07XG5cbi8qKlxuICogUmV0dXJuIHRydWUgaWYgdGhlIGFyZ3VtZW50IGlzIG5vdCBhIHNwcmVhZCBlbGVtZW50LlxuICovXG5mdW5jdGlvbiBpc05vdFNwcmVhZEFyZ3VtZW50KGFyZzogQXJndW1lbnRUeXBlKTogYXJnIGlzIEV4Y2x1ZGU8QXJndW1lbnRUeXBlLCB0LlNwcmVhZEVsZW1lbnQ+IHtcbiAgcmV0dXJuICF0LmlzU3ByZWFkRWxlbWVudChhcmcpO1xufVxuXG50eXBlIE1pbmlmaWVkQm9vbGVhbkxpdGVyYWwgPSB0LkV4cHJlc3Npb24mdC5VbmFyeUV4cHJlc3Npb24me2FyZ3VtZW50OiB0Lk51bWVyaWNMaXRlcmFsfTtcblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiB0aGUgbm9kZSBpcyBlaXRoZXIgYCEwYCBvciBgITFgLlxuICovXG5mdW5jdGlvbiBpc01pbmlmaWVkQm9vbGVhbkxpdGVyYWwobm9kZTogdC5FeHByZXNzaW9uKTogbm9kZSBpcyBNaW5pZmllZEJvb2xlYW5MaXRlcmFsIHtcbiAgcmV0dXJuIHQuaXNVbmFyeUV4cHJlc3Npb24obm9kZSkgJiYgbm9kZS5wcmVmaXggJiYgbm9kZS5vcGVyYXRvciA9PT0gJyEnICYmXG4gICAgICB0LmlzTnVtZXJpY0xpdGVyYWwobm9kZS5hcmd1bWVudCkgJiYgKG5vZGUuYXJndW1lbnQudmFsdWUgPT09IDAgfHwgbm9kZS5hcmd1bWVudC52YWx1ZSA9PT0gMSk7XG59XG4iXX0=