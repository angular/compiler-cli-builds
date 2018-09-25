/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/util", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/metadata"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    function getConstructorDependencies(clazz, reflector, isCore) {
        var useType = [];
        var ctorParams = reflector.getConstructorParameters(clazz);
        if (ctorParams === null) {
            if (reflector.hasBaseClass(clazz)) {
                return null;
            }
            else {
                ctorParams = [];
            }
        }
        ctorParams.forEach(function (param, idx) {
            var tokenExpr = param.type;
            var optional = false, self = false, skipSelf = false, host = false;
            var resolved = compiler_1.R3ResolvedDependencyType.Token;
            (param.decorators || []).filter(function (dec) { return isCore || isAngularCore(dec); }).forEach(function (dec) {
                if (dec.name === 'Inject') {
                    if (dec.args === null || dec.args.length !== 1) {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, dec.node, "Unexpected number of arguments to @Inject().");
                    }
                    tokenExpr = dec.args[0];
                }
                else if (dec.name === 'Optional') {
                    optional = true;
                }
                else if (dec.name === 'SkipSelf') {
                    skipSelf = true;
                }
                else if (dec.name === 'Self') {
                    self = true;
                }
                else if (dec.name === 'Host') {
                    host = true;
                }
                else if (dec.name === 'Attribute') {
                    if (dec.args === null || dec.args.length !== 1) {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, dec.node, "Unexpected number of arguments to @Attribute().");
                    }
                    tokenExpr = dec.args[0];
                    resolved = compiler_1.R3ResolvedDependencyType.Attribute;
                }
                else {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_UNEXPECTED, dec.node, "Unexpected decorator " + dec.name + " on parameter.");
                }
            });
            if (tokenExpr === null) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.PARAM_MISSING_TOKEN, param.nameNode, "No suitable token for parameter " + (param.name || idx) + " of class " + clazz.name.text);
            }
            if (ts.isIdentifier(tokenExpr)) {
                var importedSymbol = reflector.getImportOfIdentifier(tokenExpr);
                if (importedSymbol !== null && importedSymbol.from === '@angular/core') {
                    switch (importedSymbol.name) {
                        case 'Injector':
                            resolved = compiler_1.R3ResolvedDependencyType.Injector;
                            break;
                        case 'Renderer2':
                            resolved = compiler_1.R3ResolvedDependencyType.Renderer2;
                            break;
                        default:
                        // Leave as a Token or Attribute.
                    }
                }
            }
            var token = new compiler_1.WrappedNodeExpr(tokenExpr);
            useType.push({ token: token, optional: optional, self: self, skipSelf: skipSelf, host: host, resolved: resolved });
        });
        return useType;
    }
    exports.getConstructorDependencies = getConstructorDependencies;
    function toR3Reference(ref, context) {
        var value = ref.toExpression(context, metadata_1.ImportMode.UseExistingImport);
        var type = ref.toExpression(context, metadata_1.ImportMode.ForceNewImport);
        if (value === null || type === null) {
            throw new Error("Could not refer to " + ts.SyntaxKind[ref.node.kind]);
        }
        return { value: value, type: type };
    }
    exports.toR3Reference = toR3Reference;
    function isAngularCore(decorator) {
        return decorator.import !== null && decorator.import.from === '@angular/core';
    }
    exports.isAngularCore = isAngularCore;
    /**
     * Unwrap a `ts.Expression`, removing outer type-casts or parentheses until the expression is in its
     * lowest level form.
     *
     * For example, the expression "(foo as Type)" unwraps to "foo".
     */
    function unwrapExpression(node) {
        while (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) {
            node = node.expression;
        }
        return node;
    }
    exports.unwrapExpression = unwrapExpression;
    function expandForwardRef(arg) {
        if (!ts.isArrowFunction(arg) && !ts.isFunctionExpression(arg)) {
            return null;
        }
        var body = arg.body;
        // Either the body is a ts.Expression directly, or a block with a single return statement.
        if (ts.isBlock(body)) {
            // Block body - look for a single return statement.
            if (body.statements.length !== 1) {
                return null;
            }
            var stmt = body.statements[0];
            if (!ts.isReturnStatement(stmt) || stmt.expression === undefined) {
                return null;
            }
            return stmt.expression;
        }
        else {
            // Shorthand body - return as an expression.
            return body;
        }
    }
    /**
     * Possibly resolve a forwardRef() expression into the inner value.
     *
     * @param node the forwardRef() expression to resolve
     * @param reflector a ReflectionHost
     * @returns the resolved expression, if the original expression was a forwardRef(), or the original
     * expression otherwise
     */
    function unwrapForwardRef(node, reflector) {
        if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) ||
            node.arguments.length !== 1) {
            return node;
        }
        var expr = expandForwardRef(node.arguments[0]);
        if (expr === null) {
            return node;
        }
        var imp = reflector.getImportOfIdentifier(node.expression);
        if (imp === null || imp.from !== '@angular/core' || imp.name !== 'forwardRef') {
            return node;
        }
        else {
            return expr;
        }
    }
    exports.unwrapForwardRef = unwrapForwardRef;
    /**
     * A foreign function resolver for `staticallyResolve` which unwraps forwardRef() expressions.
     *
     * @param ref a Reference to the declaration of the function being called (which might be
     * forwardRef)
     * @param args the arguments to the invocation of the forwardRef expression
     * @returns an unwrapped argument if `ref` pointed to forwardRef, or null otherwise
     */
    function forwardRefResolver(ref, args) {
        if (!(ref instanceof metadata_1.AbsoluteReference) || ref.moduleName !== '@angular/core' ||
            ref.symbolName !== 'forwardRef' || args.length !== 1) {
            return null;
        }
        return expandForwardRef(args[0]);
    }
    exports.forwardRefResolver = forwardRefResolver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBMkg7SUFDM0gsK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUVsRSxxRUFBd0U7SUFFeEUsU0FBZ0IsMEJBQTBCLENBQ3RDLEtBQTBCLEVBQUUsU0FBeUIsRUFBRSxNQUFlO1FBRXhFLElBQU0sT0FBTyxHQUEyQixFQUFFLENBQUM7UUFDM0MsSUFBSSxVQUFVLEdBQUcsU0FBUyxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNELElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtZQUN2QixJQUFJLFNBQVMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2pDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7aUJBQU07Z0JBQ0wsVUFBVSxHQUFHLEVBQUUsQ0FBQzthQUNqQjtTQUNGO1FBQ0QsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFDLEtBQUssRUFBRSxHQUFHO1lBQzVCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDM0IsSUFBSSxRQUFRLEdBQUcsS0FBSyxFQUFFLElBQUksR0FBRyxLQUFLLEVBQUUsUUFBUSxHQUFHLEtBQUssRUFBRSxJQUFJLEdBQUcsS0FBSyxDQUFDO1lBQ25FLElBQUksUUFBUSxHQUFHLG1DQUF3QixDQUFDLEtBQUssQ0FBQztZQUM5QyxDQUFDLEtBQUssQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsTUFBTSxJQUFJLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBNUIsQ0FBNEIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEdBQUc7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LENBQUMsQ0FBQztRQUM3RCxJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxlQUFlLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxZQUFZLEVBQUU7WUFDN0UsT0FBTyxJQUFJLENBQUM7U0FDYjthQUFNO1lBQ0wsT0FBTyxJQUFJLENBQUM7U0FDYjtJQUNILENBQUM7SUFmRCw0Q0FlQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxTQUFnQixrQkFBa0IsQ0FDOUIsR0FBMkQsRUFDM0QsSUFBcUI7UUFDdkIsSUFBSSxDQUFDLENBQUMsR0FBRyxZQUFZLDRCQUFpQixDQUFDLElBQUksR0FBRyxDQUFDLFVBQVUsS0FBSyxlQUFlO1lBQ3pFLEdBQUcsQ0FBQyxVQUFVLEtBQUssWUFBWSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3hELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxPQUFPLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFSRCxnREFRQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBSM0RlcGVuZGVuY3lNZXRhZGF0YSwgUjNSZWZlcmVuY2UsIFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZSwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL2hvc3QnO1xuaW1wb3J0IHtBYnNvbHV0ZVJlZmVyZW5jZSwgSW1wb3J0TW9kZSwgUmVmZXJlbmNlfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICBjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuKTogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXXxcbiAgICBudWxsIHtcbiAgY29uc3QgdXNlVHlwZTogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXSA9IFtdO1xuICBsZXQgY3RvclBhcmFtcyA9IHJlZmxlY3Rvci5nZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xhenopO1xuICBpZiAoY3RvclBhcmFtcyA9PT0gbnVsbCkge1xuICAgIGlmIChyZWZsZWN0b3IuaGFzQmFzZUNsYXNzKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN0b3JQYXJhbXMgPSBbXTtcbiAgICB9XG4gIH1cbiAgY3RvclBhcmFtcy5mb3JFYWNoKChwYXJhbSwgaWR4KSA9PiB7XG4gICAgbGV0IHRva2VuRXhwciA9IHBhcmFtLnR5cGU7XG4gICAgbGV0IG9wdGlvbmFsID0gZmFsc2UsIHNlbGYgPSBmYWxzZSwgc2tpcFNlbGYgPSBmYWxzZSwgaG9zdCA9IGZhbHNlO1xuICAgIGxldCByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5Ub2tlbjtcbiAgICAocGFyYW0uZGVjb3JhdG9ycyB8fCBbXSkuZmlsdGVyKGRlYyA9PiBpc0NvcmUgfHwgaXNBbmd1bGFyQ29yZShkZWMpKS5mb3JFYWNoKGRlYyA9PiB7XG4gICAgICBpZiAoZGVjLm5hbWUgPT09ICdJbmplY3QnKSB7XG4gICAgICAgIGlmIChkZWMuYXJncyA9PT0gbnVsbCB8fCBkZWMuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlYy5ub2RlLFxuICAgICAgICAgICAgICBgVW5leHBlY3RlZCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBJbmplY3QoKS5gKTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbkV4cHIgPSBkZWMuYXJnc1swXTtcbiAgICAgIH0gZWxzZSBpZiAoZGVjLm5hbWUgPT09ICdPcHRpb25hbCcpIHtcbiAgICAgICAgb3B0aW9uYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChkZWMubmFtZSA9PT0gJ1NraXBTZWxmJykge1xuICAgICAgICBza2lwU2VsZiA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGRlYy5uYW1lID09PSAnU2VsZicpIHtcbiAgICAgICAgc2VsZiA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGRlYy5uYW1lID09PSAnSG9zdCcpIHtcbiAgICAgICAgaG9zdCA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGRlYy5uYW1lID09PSAnQXR0cmlidXRlJykge1xuICAgICAgICBpZiAoZGVjLmFyZ3MgPT09IG51bGwgfHwgZGVjLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBkZWMubm9kZSxcbiAgICAgICAgICAgICAgYFVuZXhwZWN0ZWQgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAQXR0cmlidXRlKCkuYCk7XG4gICAgICAgIH1cbiAgICAgICAgdG9rZW5FeHByID0gZGVjLmFyZ3NbMF07XG4gICAgICAgIHJlc29sdmVkID0gUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLkF0dHJpYnV0ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfVU5FWFBFQ1RFRCwgZGVjLm5vZGUsXG4gICAgICAgICAgICBgVW5leHBlY3RlZCBkZWNvcmF0b3IgJHtkZWMubmFtZX0gb24gcGFyYW1ldGVyLmApO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICh0b2tlbkV4cHIgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuUEFSQU1fTUlTU0lOR19UT0tFTiwgcGFyYW0ubmFtZU5vZGUsXG4gICAgICAgICAgYE5vIHN1aXRhYmxlIHRva2VuIGZvciBwYXJhbWV0ZXIgJHtwYXJhbS5uYW1lIHx8IGlkeH0gb2YgY2xhc3MgJHtjbGF6ei5uYW1lIS50ZXh0fWApO1xuICAgIH1cbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKHRva2VuRXhwcikpIHtcbiAgICAgIGNvbnN0IGltcG9ydGVkU3ltYm9sID0gcmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcih0b2tlbkV4cHIpO1xuICAgICAgaWYgKGltcG9ydGVkU3ltYm9sICE9PSBudWxsICYmIGltcG9ydGVkU3ltYm9sLmZyb20gPT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgICBzd2l0Y2ggKGltcG9ydGVkU3ltYm9sLm5hbWUpIHtcbiAgICAgICAgICBjYXNlICdJbmplY3Rvcic6XG4gICAgICAgICAgICByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5JbmplY3RvcjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ1JlbmRlcmVyMic6XG4gICAgICAgICAgICByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5SZW5kZXJlcjI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgLy8gTGVhdmUgYXMgYSBUb2tlbiBvciBBdHRyaWJ1dGUuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgdG9rZW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRva2VuRXhwcik7XG4gICAgdXNlVHlwZS5wdXNoKHt0b2tlbiwgb3B0aW9uYWwsIHNlbGYsIHNraXBTZWxmLCBob3N0LCByZXNvbHZlZH0pO1xuICB9KTtcbiAgcmV0dXJuIHVzZVR5cGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1IzUmVmZXJlbmNlKHJlZjogUmVmZXJlbmNlLCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogUjNSZWZlcmVuY2Uge1xuICBjb25zdCB2YWx1ZSA9IHJlZi50b0V4cHJlc3Npb24oY29udGV4dCwgSW1wb3J0TW9kZS5Vc2VFeGlzdGluZ0ltcG9ydCk7XG4gIGNvbnN0IHR5cGUgPSByZWYudG9FeHByZXNzaW9uKGNvbnRleHQsIEltcG9ydE1vZGUuRm9yY2VOZXdJbXBvcnQpO1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdHlwZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlZmVyIHRvICR7dHMuU3ludGF4S2luZFtyZWYubm9kZS5raW5kXX1gKTtcbiAgfVxuICByZXR1cm4ge3ZhbHVlLCB0eXBlfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBib29sZWFuIHtcbiAgcmV0dXJuIGRlY29yYXRvci5pbXBvcnQgIT09IG51bGwgJiYgZGVjb3JhdG9yLmltcG9ydC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZSc7XG59XG5cbi8qKlxuICogVW53cmFwIGEgYHRzLkV4cHJlc3Npb25gLCByZW1vdmluZyBvdXRlciB0eXBlLWNhc3RzIG9yIHBhcmVudGhlc2VzIHVudGlsIHRoZSBleHByZXNzaW9uIGlzIGluIGl0c1xuICogbG93ZXN0IGxldmVsIGZvcm0uXG4gKlxuICogRm9yIGV4YW1wbGUsIHRoZSBleHByZXNzaW9uIFwiKGZvbyBhcyBUeXBlKVwiIHVud3JhcHMgdG8gXCJmb29cIi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVud3JhcEV4cHJlc3Npb24obm9kZTogdHMuRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb24ge1xuICB3aGlsZSAodHMuaXNBc0V4cHJlc3Npb24obm9kZSkgfHwgdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlKSkge1xuICAgIG5vZGUgPSBub2RlLmV4cHJlc3Npb247XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZEZvcndhcmRSZWYoYXJnOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKCF0cy5pc0Fycm93RnVuY3Rpb24oYXJnKSAmJiAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oYXJnKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgYm9keSA9IGFyZy5ib2R5O1xuICAvLyBFaXRoZXIgdGhlIGJvZHkgaXMgYSB0cy5FeHByZXNzaW9uIGRpcmVjdGx5LCBvciBhIGJsb2NrIHdpdGggYSBzaW5nbGUgcmV0dXJuIHN0YXRlbWVudC5cbiAgaWYgKHRzLmlzQmxvY2soYm9keSkpIHtcbiAgICAvLyBCbG9jayBib2R5IC0gbG9vayBmb3IgYSBzaW5nbGUgcmV0dXJuIHN0YXRlbWVudC5cbiAgICBpZiAoYm9keS5zdGF0ZW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHN0bXQgPSBib2R5LnN0YXRlbWVudHNbMF07XG4gICAgaWYgKCF0cy5pc1JldHVyblN0YXRlbWVudChzdG10KSB8fCBzdG10LmV4cHJlc3Npb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzdG10LmV4cHJlc3Npb247XG4gIH0gZWxzZSB7XG4gICAgLy8gU2hvcnRoYW5kIGJvZHkgLSByZXR1cm4gYXMgYW4gZXhwcmVzc2lvbi5cbiAgICByZXR1cm4gYm9keTtcbiAgfVxufVxuXG4vKipcbiAqIFBvc3NpYmx5IHJlc29sdmUgYSBmb3J3YXJkUmVmKCkgZXhwcmVzc2lvbiBpbnRvIHRoZSBpbm5lciB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0gbm9kZSB0aGUgZm9yd2FyZFJlZigpIGV4cHJlc3Npb24gdG8gcmVzb2x2ZVxuICogQHBhcmFtIHJlZmxlY3RvciBhIFJlZmxlY3Rpb25Ib3N0XG4gKiBAcmV0dXJucyB0aGUgcmVzb2x2ZWQgZXhwcmVzc2lvbiwgaWYgdGhlIG9yaWdpbmFsIGV4cHJlc3Npb24gd2FzIGEgZm9yd2FyZFJlZigpLCBvciB0aGUgb3JpZ2luYWxcbiAqIGV4cHJlc3Npb24gb3RoZXJ3aXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bndyYXBGb3J3YXJkUmVmKG5vZGU6IHRzLkV4cHJlc3Npb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpOiB0cy5FeHByZXNzaW9uIHtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpIHx8ICF0cy5pc0lkZW50aWZpZXIobm9kZS5leHByZXNzaW9uKSB8fFxuICAgICAgbm9kZS5hcmd1bWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbiAgY29uc3QgZXhwciA9IGV4cGFuZEZvcndhcmRSZWYobm9kZS5hcmd1bWVudHNbMF0pO1xuICBpZiAoZXhwciA9PT0gbnVsbCkge1xuICAgIHJldHVybiBub2RlO1xuICB9XG4gIGNvbnN0IGltcCA9IHJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIobm9kZS5leHByZXNzaW9uKTtcbiAgaWYgKGltcCA9PT0gbnVsbCB8fCBpbXAuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnIHx8IGltcC5uYW1lICE9PSAnZm9yd2FyZFJlZicpIHtcbiAgICByZXR1cm4gbm9kZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZXhwcjtcbiAgfVxufVxuXG4vKipcbiAqIEEgZm9yZWlnbiBmdW5jdGlvbiByZXNvbHZlciBmb3IgYHN0YXRpY2FsbHlSZXNvbHZlYCB3aGljaCB1bndyYXBzIGZvcndhcmRSZWYoKSBleHByZXNzaW9ucy5cbiAqXG4gKiBAcGFyYW0gcmVmIGEgUmVmZXJlbmNlIHRvIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZnVuY3Rpb24gYmVpbmcgY2FsbGVkICh3aGljaCBtaWdodCBiZVxuICogZm9yd2FyZFJlZilcbiAqIEBwYXJhbSBhcmdzIHRoZSBhcmd1bWVudHMgdG8gdGhlIGludm9jYXRpb24gb2YgdGhlIGZvcndhcmRSZWYgZXhwcmVzc2lvblxuICogQHJldHVybnMgYW4gdW53cmFwcGVkIGFyZ3VtZW50IGlmIGByZWZgIHBvaW50ZWQgdG8gZm9yd2FyZFJlZiwgb3IgbnVsbCBvdGhlcndpc2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcndhcmRSZWZSZXNvbHZlcihcbiAgICByZWY6IFJlZmVyZW5jZTx0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9uPixcbiAgICBhcmdzOiB0cy5FeHByZXNzaW9uW10pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBpZiAoIShyZWYgaW5zdGFuY2VvZiBBYnNvbHV0ZVJlZmVyZW5jZSkgfHwgcmVmLm1vZHVsZU5hbWUgIT09ICdAYW5ndWxhci9jb3JlJyB8fFxuICAgICAgcmVmLnN5bWJvbE5hbWUgIT09ICdmb3J3YXJkUmVmJyB8fCBhcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiBleHBhbmRGb3J3YXJkUmVmKGFyZ3NbMF0pO1xufVxuIl19