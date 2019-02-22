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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/util", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var ConstructorDepErrorKind;
    (function (ConstructorDepErrorKind) {
        ConstructorDepErrorKind[ConstructorDepErrorKind["NO_SUITABLE_TOKEN"] = 0] = "NO_SUITABLE_TOKEN";
    })(ConstructorDepErrorKind = exports.ConstructorDepErrorKind || (exports.ConstructorDepErrorKind = {}));
    function getConstructorDependencies(clazz, reflector, isCore) {
        var deps = [];
        var errors = [];
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
            var tokenExpr = param.typeExpression;
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
                errors.push({
                    index: idx,
                    kind: ConstructorDepErrorKind.NO_SUITABLE_TOKEN, param: param,
                });
            }
            else {
                var token = new compiler_1.WrappedNodeExpr(tokenExpr);
                deps.push({ token: token, optional: optional, self: self, skipSelf: skipSelf, host: host, resolved: resolved });
            }
        });
        if (errors.length === 0) {
            return { deps: deps };
        }
        else {
            return { deps: null, errors: errors };
        }
    }
    exports.getConstructorDependencies = getConstructorDependencies;
    function getValidConstructorDependencies(clazz, reflector, isCore) {
        return validateConstructorDependencies(clazz, getConstructorDependencies(clazz, reflector, isCore));
    }
    exports.getValidConstructorDependencies = getValidConstructorDependencies;
    function validateConstructorDependencies(clazz, deps) {
        if (deps === null) {
            return null;
        }
        else if (deps.deps !== null) {
            return deps.deps;
        }
        else {
            // TODO(alxhub): this cast is necessary because the g3 typescript version doesn't narrow here.
            var _a = deps.errors[0], param = _a.param, index = _a.index;
            // There is at least one error.
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.PARAM_MISSING_TOKEN, param.nameNode, "No suitable injection token for parameter '" + (param.name || index) + "' of class '" + clazz.name.text + "'. Found: " + param.typeNode.getText());
        }
    }
    exports.validateConstructorDependencies = validateConstructorDependencies;
    function toR3Reference(valueRef, typeRef, valueContext, typeContext, refEmitter) {
        var value = refEmitter.emit(valueRef, valueContext, imports_1.ImportMode.UseExistingImport);
        var type = refEmitter.emit(typeRef, typeContext, imports_1.ImportMode.ForceNewImport);
        if (value === null || type === null) {
            throw new Error("Could not refer to " + ts.SyntaxKind[valueRef.node.kind]);
        }
        return { value: value, type: type };
    }
    exports.toR3Reference = toR3Reference;
    function isAngularCore(decorator) {
        return decorator.import !== null && decorator.import.from === '@angular/core';
    }
    exports.isAngularCore = isAngularCore;
    function isAngularCoreReference(reference, symbolName) {
        return reference.ownedByModuleGuess === '@angular/core' && reference.debugName === symbolName;
    }
    exports.isAngularCoreReference = isAngularCoreReference;
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
        if (!isAngularCoreReference(ref, 'forwardRef') || args.length !== 1) {
            return null;
        }
        return expandForwardRef(args[0]);
    }
    exports.forwardRefResolver = forwardRefResolver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0c7SUFDL0csK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUNsRSxtRUFBc0U7SUFHdEUsSUFBWSx1QkFFWDtJQUZELFdBQVksdUJBQXVCO1FBQ2pDLCtGQUFpQixDQUFBO0lBQ25CLENBQUMsRUFGVyx1QkFBdUIsR0FBdkIsK0JBQXVCLEtBQXZCLCtCQUF1QixRQUVsQztJQWdCRCxTQUFnQiwwQkFBMEIsQ0FDdEMsS0FBMEIsRUFBRSxTQUF5QixFQUFFLE1BQWU7UUFDeEUsSUFBTSxJQUFJLEdBQTJCLEVBQUUsQ0FBQztRQUN4QyxJQUFNLE1BQU0sR0FBMEIsRUFBRSxDQUFDO1FBQ3pDLElBQUksVUFBVSxHQUFHLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzRCxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUU7WUFDdkIsSUFBSSxTQUFTLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNqQyxPQUFPLElBQUksQ0FBQzthQUNiO2lCQUFNO2dCQUNMLFVBQVUsR0FBRyxFQUFFLENBQUM7YUFDakI7U0FDRjtRQUNELFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQyxLQUFLLEVBQUUsR0FBRztZQUM1QixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDO1lBQ3JDLElBQUksUUFBUSxHQUFHLEtBQUssRUFBRSxJQUFJLEdBQUcsS0FBSyxFQUFFLFFBQVEsR0FBRyxLQUFLLEVBQUUsSUFBSSxHQUFHLEtBQUssQ0FBQztZQUNuRSxJQUFJLFFBQVEsR0FBRyxtQ0FBd0IsQ0FBQyxLQUFLLENBQUM7WUFDOUMsQ0FB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QixHQUEyRCxFQUMzRCxJQUFxQjtRQUN2QixJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ25FLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxPQUFPLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFQRCxnREFPQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtSM0RlcGVuZGVuY3lNZXRhZGF0YSwgUjNSZWZlcmVuY2UsIFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZSwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0ltcG9ydE1vZGUsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzTWVtYmVyS2luZCwgQ3RvclBhcmFtZXRlciwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmV4cG9ydCBlbnVtIENvbnN0cnVjdG9yRGVwRXJyb3JLaW5kIHtcbiAgTk9fU1VJVEFCTEVfVE9LRU4sXG59XG5cbmV4cG9ydCB0eXBlIENvbnN0cnVjdG9yRGVwcyA9IHtcbiAgZGVwczogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXTtcbn0gfFxue1xuICBkZXBzOiBudWxsO1xuICBlcnJvcnM6IENvbnN0cnVjdG9yRGVwRXJyb3JbXTtcbn07XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uc3RydWN0b3JEZXBFcnJvciB7XG4gIGluZGV4OiBudW1iZXI7XG4gIHBhcmFtOiBDdG9yUGFyYW1ldGVyO1xuICBraW5kOiBDb25zdHJ1Y3RvckRlcEVycm9yS2luZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgIGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBpc0NvcmU6IGJvb2xlYW4pOiBDb25zdHJ1Y3RvckRlcHN8bnVsbCB7XG4gIGNvbnN0IGRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW10gPSBbXTtcbiAgY29uc3QgZXJyb3JzOiBDb25zdHJ1Y3RvckRlcEVycm9yW10gPSBbXTtcbiAgbGV0IGN0b3JQYXJhbXMgPSByZWZsZWN0b3IuZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6KTtcbiAgaWYgKGN0b3JQYXJhbXMgPT09IG51bGwpIHtcbiAgICBpZiAocmVmbGVjdG9yLmhhc0Jhc2VDbGFzcyhjbGF6eikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBjdG9yUGFyYW1zID0gW107XG4gICAgfVxuICB9XG4gIGN0b3JQYXJhbXMuZm9yRWFjaCgocGFyYW0sIGlkeCkgPT4ge1xuICAgIGxldCB0b2tlbkV4cHIgPSBwYXJhbS50eXBlRXhwcmVzc2lvbjtcbiAgICBsZXQgb3B0aW9uYWwgPSBmYWxzZSwgc2VsZiA9IGZhbHNlLCBza2lwU2VsZiA9IGZhbHNlLCBob3N0ID0gZmFsc2U7XG4gICAgbGV0IHJlc29sdmVkID0gUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLlRva2VuO1xuICAgIChwYXJhbS5kZWNvcmF0b3JzIHx8IFtdKS5maWx0ZXIoZGVjID0+IGlzQ29yZSB8fCBpc0FuZ3VsYXJDb3JlKGRlYykpLmZvckVhY2goZGVjID0+IHtcbiAgICAgIGlmIChkZWMubmFtZSA9PT0gJ0luamVjdCcpIHtcbiAgICAgICAgaWYgKGRlYy5hcmdzID09PSBudWxsIHx8IGRlYy5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjLm5vZGUsXG4gICAgICAgICAgICAgIGBVbmV4cGVjdGVkIG51bWJlciBvZiBhcmd1bWVudHMgdG8gQEluamVjdCgpLmApO1xuICAgICAgICB9XG4gICAgICAgIHRva2VuRXhwciA9IGRlYy5hcmdzWzBdO1xuICAgICAgfSBlbHNlIGlmIChkZWMubmFtZSA9PT0gJ09wdGlvbmFsJykge1xuICAgICAgICBvcHRpb25hbCA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGRlYy5uYW1lID09PSAnU2tpcFNlbGYnKSB7XG4gICAgICAgIHNraXBTZWxmID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZGVjLm5hbWUgPT09ICdTZWxmJykge1xuICAgICAgICBzZWxmID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZGVjLm5hbWUgPT09ICdIb3N0Jykge1xuICAgICAgICBob3N0ID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZGVjLm5hbWUgPT09ICdBdHRyaWJ1dGUnKSB7XG4gICAgICAgIGlmIChkZWMuYXJncyA9PT0gbnVsbCB8fCBkZWMuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlYy5ub2RlLFxuICAgICAgICAgICAgICBgVW5leHBlY3RlZCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBBdHRyaWJ1dGUoKS5gKTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbkV4cHIgPSBkZWMuYXJnc1swXTtcbiAgICAgICAgcmVzb2x2ZWQgPSBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUuQXR0cmlidXRlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9VTkVYUEVDVEVELCBkZWMubm9kZSxcbiAgICAgICAgICAgIGBVbmV4cGVjdGVkIGRlY29yYXRvciAke2RlYy5uYW1lfSBvbiBwYXJhbWV0ZXIuYCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHRva2VuRXhwciA9PT0gbnVsbCkge1xuICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICBpbmRleDogaWR4LFxuICAgICAgICBraW5kOiBDb25zdHJ1Y3RvckRlcEVycm9yS2luZC5OT19TVUlUQUJMRV9UT0tFTiwgcGFyYW0sXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdG9rZW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRva2VuRXhwcik7XG4gICAgICBkZXBzLnB1c2goe3Rva2VuLCBvcHRpb25hbCwgc2VsZiwgc2tpcFNlbGYsIGhvc3QsIHJlc29sdmVkfSk7XG4gICAgfVxuICB9KTtcbiAgaWYgKGVycm9ycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4ge2RlcHN9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7ZGVwczogbnVsbCwgZXJyb3JzfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICBjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuKTogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXXxcbiAgICBudWxsIHtcbiAgcmV0dXJuIHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgICBjbGF6eiwgZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJlZmxlY3RvciwgaXNDb3JlKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgIGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZXBzOiBDb25zdHJ1Y3RvckRlcHMgfCBudWxsKTogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXXxudWxsIHtcbiAgaWYgKGRlcHMgPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIGlmIChkZXBzLmRlcHMgIT09IG51bGwpIHtcbiAgICByZXR1cm4gZGVwcy5kZXBzO1xuICB9IGVsc2Uge1xuICAgIC8vIFRPRE8oYWx4aHViKTogdGhpcyBjYXN0IGlzIG5lY2Vzc2FyeSBiZWNhdXNlIHRoZSBnMyB0eXBlc2NyaXB0IHZlcnNpb24gZG9lc24ndCBuYXJyb3cgaGVyZS5cbiAgICBjb25zdCB7cGFyYW0sIGluZGV4fSA9IChkZXBzIGFze2Vycm9yczogQ29uc3RydWN0b3JEZXBFcnJvcltdfSkuZXJyb3JzWzBdO1xuICAgIC8vIFRoZXJlIGlzIGF0IGxlYXN0IG9uZSBlcnJvci5cbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5QQVJBTV9NSVNTSU5HX1RPS0VOLCBwYXJhbS5uYW1lTm9kZSxcbiAgICAgICAgYE5vIHN1aXRhYmxlIGluamVjdGlvbiB0b2tlbiBmb3IgcGFyYW1ldGVyICcke3BhcmFtLm5hbWUgfHwgaW5kZXh9JyBvZiBjbGFzcyAnJHtjbGF6ei5uYW1lIS50ZXh0fScuIEZvdW5kOiAke3BhcmFtLnR5cGVOb2RlIS5nZXRUZXh0KCl9YCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvUjNSZWZlcmVuY2UoXG4gICAgdmFsdWVSZWY6IFJlZmVyZW5jZSwgdHlwZVJlZjogUmVmZXJlbmNlLCB2YWx1ZUNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsXG4gICAgdHlwZUNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIpOiBSM1JlZmVyZW5jZSB7XG4gIGNvbnN0IHZhbHVlID0gcmVmRW1pdHRlci5lbWl0KHZhbHVlUmVmLCB2YWx1ZUNvbnRleHQsIEltcG9ydE1vZGUuVXNlRXhpc3RpbmdJbXBvcnQpO1xuICBjb25zdCB0eXBlID0gcmVmRW1pdHRlci5lbWl0KHR5cGVSZWYsIHR5cGVDb250ZXh0LCBJbXBvcnRNb2RlLkZvcmNlTmV3SW1wb3J0KTtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHR5cGUgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZWZlciB0byAke3RzLlN5bnRheEtpbmRbdmFsdWVSZWYubm9kZS5raW5kXX1gKTtcbiAgfVxuICByZXR1cm4ge3ZhbHVlLCB0eXBlfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBib29sZWFuIHtcbiAgcmV0dXJuIGRlY29yYXRvci5pbXBvcnQgIT09IG51bGwgJiYgZGVjb3JhdG9yLmltcG9ydC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZSc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlKHJlZmVyZW5jZTogUmVmZXJlbmNlLCBzeW1ib2xOYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHJlZmVyZW5jZS5vd25lZEJ5TW9kdWxlR3Vlc3MgPT09ICdAYW5ndWxhci9jb3JlJyAmJiByZWZlcmVuY2UuZGVidWdOYW1lID09PSBzeW1ib2xOYW1lO1xufVxuXG4vKipcbiAqIFVud3JhcCBhIGB0cy5FeHByZXNzaW9uYCwgcmVtb3Zpbmcgb3V0ZXIgdHlwZS1jYXN0cyBvciBwYXJlbnRoZXNlcyB1bnRpbCB0aGUgZXhwcmVzc2lvbiBpcyBpbiBpdHNcbiAqIGxvd2VzdCBsZXZlbCBmb3JtLlxuICpcbiAqIEZvciBleGFtcGxlLCB0aGUgZXhwcmVzc2lvbiBcIihmb28gYXMgVHlwZSlcIiB1bndyYXBzIHRvIFwiZm9vXCIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bndyYXBFeHByZXNzaW9uKG5vZGU6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uIHtcbiAgd2hpbGUgKHRzLmlzQXNFeHByZXNzaW9uKG5vZGUpIHx8IHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICBub2RlID0gbm9kZS5leHByZXNzaW9uO1xuICB9XG4gIHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBleHBhbmRGb3J3YXJkUmVmKGFyZzogdHMuRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gIGlmICghdHMuaXNBcnJvd0Z1bmN0aW9uKGFyZykgJiYgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGFyZykpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGJvZHkgPSBhcmcuYm9keTtcbiAgLy8gRWl0aGVyIHRoZSBib2R5IGlzIGEgdHMuRXhwcmVzc2lvbiBkaXJlY3RseSwgb3IgYSBibG9jayB3aXRoIGEgc2luZ2xlIHJldHVybiBzdGF0ZW1lbnQuXG4gIGlmICh0cy5pc0Jsb2NrKGJvZHkpKSB7XG4gICAgLy8gQmxvY2sgYm9keSAtIGxvb2sgZm9yIGEgc2luZ2xlIHJldHVybiBzdGF0ZW1lbnQuXG4gICAgaWYgKGJvZHkuc3RhdGVtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzdG10ID0gYm9keS5zdGF0ZW1lbnRzWzBdO1xuICAgIGlmICghdHMuaXNSZXR1cm5TdGF0ZW1lbnQoc3RtdCkgfHwgc3RtdC5leHByZXNzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gc3RtdC5leHByZXNzaW9uO1xuICB9IGVsc2Uge1xuICAgIC8vIFNob3J0aGFuZCBib2R5IC0gcmV0dXJuIGFzIGFuIGV4cHJlc3Npb24uXG4gICAgcmV0dXJuIGJvZHk7XG4gIH1cbn1cblxuLyoqXG4gKiBQb3NzaWJseSByZXNvbHZlIGEgZm9yd2FyZFJlZigpIGV4cHJlc3Npb24gaW50byB0aGUgaW5uZXIgdmFsdWUuXG4gKlxuICogQHBhcmFtIG5vZGUgdGhlIGZvcndhcmRSZWYoKSBleHByZXNzaW9uIHRvIHJlc29sdmVcbiAqIEBwYXJhbSByZWZsZWN0b3IgYSBSZWZsZWN0aW9uSG9zdFxuICogQHJldHVybnMgdGhlIHJlc29sdmVkIGV4cHJlc3Npb24sIGlmIHRoZSBvcmlnaW5hbCBleHByZXNzaW9uIHdhcyBhIGZvcndhcmRSZWYoKSwgb3IgdGhlIG9yaWdpbmFsXG4gKiBleHByZXNzaW9uIG90aGVyd2lzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdW53cmFwRm9yd2FyZFJlZihub2RlOiB0cy5FeHByZXNzaW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KTogdHMuRXhwcmVzc2lvbiB7XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSB8fCAhdHMuaXNJZGVudGlmaWVyKG5vZGUuZXhwcmVzc2lvbikgfHxcbiAgICAgIG5vZGUuYXJndW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgIHJldHVybiBub2RlO1xuICB9XG4gIGNvbnN0IGV4cHIgPSBleHBhbmRGb3J3YXJkUmVmKG5vZGUuYXJndW1lbnRzWzBdKTtcbiAgaWYgKGV4cHIgPT09IG51bGwpIHtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuICBjb25zdCBpbXAgPSByZWZsZWN0b3IuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKG5vZGUuZXhwcmVzc2lvbik7XG4gIGlmIChpbXAgPT09IG51bGwgfHwgaW1wLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJyB8fCBpbXAubmFtZSAhPT0gJ2ZvcndhcmRSZWYnKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGV4cHI7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGZvcmVpZ24gZnVuY3Rpb24gcmVzb2x2ZXIgZm9yIGBzdGF0aWNhbGx5UmVzb2x2ZWAgd2hpY2ggdW53cmFwcyBmb3J3YXJkUmVmKCkgZXhwcmVzc2lvbnMuXG4gKlxuICogQHBhcmFtIHJlZiBhIFJlZmVyZW5jZSB0byB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGZ1bmN0aW9uIGJlaW5nIGNhbGxlZCAod2hpY2ggbWlnaHQgYmVcbiAqIGZvcndhcmRSZWYpXG4gKiBAcGFyYW0gYXJncyB0aGUgYXJndW1lbnRzIHRvIHRoZSBpbnZvY2F0aW9uIG9mIHRoZSBmb3J3YXJkUmVmIGV4cHJlc3Npb25cbiAqIEByZXR1cm5zIGFuIHVud3JhcHBlZCBhcmd1bWVudCBpZiBgcmVmYCBwb2ludGVkIHRvIGZvcndhcmRSZWYsIG9yIG51bGwgb3RoZXJ3aXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3J3YXJkUmVmUmVzb2x2ZXIoXG4gICAgcmVmOiBSZWZlcmVuY2U8dHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5NZXRob2REZWNsYXJhdGlvbj4sXG4gICAgYXJnczogdHMuRXhwcmVzc2lvbltdKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKCFpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlKHJlZiwgJ2ZvcndhcmRSZWYnKSB8fCBhcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiBleHBhbmRGb3J3YXJkUmVmKGFyZ3NbMF0pO1xufVxuIl19