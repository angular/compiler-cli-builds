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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/util", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
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
            var token = valueReferenceToExpression(param.typeValueReference);
            var optional = false, self = false, skipSelf = false, host = false;
            var resolved = compiler_1.R3ResolvedDependencyType.Token;
            (param.decorators || []).filter(function (dec) { return isCore || isAngularCore(dec); }).forEach(function (dec) {
                var name = isCore || dec.import === null ? dec.name : dec.import.name;
                if (name === 'Inject') {
                    if (dec.args === null || dec.args.length !== 1) {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, dec.node, "Unexpected number of arguments to @Inject().");
                    }
                    token = new compiler_1.WrappedNodeExpr(dec.args[0]);
                }
                else if (name === 'Optional') {
                    optional = true;
                }
                else if (name === 'SkipSelf') {
                    skipSelf = true;
                }
                else if (name === 'Self') {
                    self = true;
                }
                else if (name === 'Host') {
                    host = true;
                }
                else if (name === 'Attribute') {
                    if (dec.args === null || dec.args.length !== 1) {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, dec.node, "Unexpected number of arguments to @Attribute().");
                    }
                    token = new compiler_1.WrappedNodeExpr(dec.args[0]);
                    resolved = compiler_1.R3ResolvedDependencyType.Attribute;
                }
                else {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_UNEXPECTED, dec.node, "Unexpected decorator " + name + " on parameter.");
                }
            });
            if (token === null) {
                errors.push({
                    index: idx,
                    kind: ConstructorDepErrorKind.NO_SUITABLE_TOKEN, param: param,
                });
            }
            else {
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
    function valueReferenceToExpression(valueRef) {
        if (valueRef === null) {
            return null;
        }
        else if (valueRef.local) {
            return new compiler_1.WrappedNodeExpr(valueRef.expression);
        }
        else {
            // TODO(alxhub): this cast is necessary because the g3 typescript version doesn't narrow here.
            return new compiler_1.ExternalExpr(valueRef);
        }
    }
    exports.valueReferenceToExpression = valueReferenceToExpression;
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
    /**
     * Combines an array of resolver functions into a one.
     * @param resolvers Resolvers to be combined.
     */
    function combineResolvers(resolvers) {
        return function (ref, args) {
            var e_1, _a;
            try {
                for (var resolvers_1 = tslib_1.__values(resolvers), resolvers_1_1 = resolvers_1.next(); !resolvers_1_1.done; resolvers_1_1 = resolvers_1.next()) {
                    var resolver = resolvers_1_1.value;
                    var resolved = resolver(ref, args);
                    if (resolved !== null) {
                        return resolved;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (resolvers_1_1 && !resolvers_1_1.done && (_a = resolvers_1.return)) _a.call(resolvers_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return null;
        };
    }
    exports.combineResolvers = combineResolvers;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXlJO0lBQ3pJLCtCQUFpQztJQUVqQywyRUFBa0U7SUFDbEUsbUVBQXNFO0lBSXRFLElBQVksdUJBRVg7SUFGRCxXQUFZLHVCQUF1QjtRQUNqQywrRkFBaUIsQ0FBQTtJQUNuQixDQUFDLEVBRlcsdUJBQXVCLEdBQXZCLCtCQUF1QixLQUF2QiwrQkFBdUIsUUFFbEM7SUFnQkQsU0FBZ0IsMEJBQTBCLENBQ3RDLEtBQTBCLEVBQUUsU0FBeUIsRUFBRSxNQUFlO1FBQ3hFLElBQU0sSUFBSSxHQUEyQixFQUFFLENBQUM7UUFDeEMsSUFBTSxNQUFNLEdBQTBCLEVBQUUsQ0FBQztRQUN6QyxJQUFJLFVBQVUsR0FBRyxTQUFTLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0QsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO1lBQ3ZCLElBQUksU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDakMsT0FBTyxJQUFJLENBQUM7YUFDYjtpQkFBTTtnQkFDTCxVQUFVLEdBQUcsRUFBRSxDQUFDO2FBQ2pCO1NBQ0Y7UUFDRCxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQUMsS0FBSyxFQUFFLEdBQUc7WUFDNUIsSUFBSSxLQUFLLEdBQUcsMEJBQTBCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDakUsSUFBSSxRQUFRLEdBQUcsS0FBSyxFQUFFLElBQUksR0FBRyxLQUFLLEVBQUUsUUFBUSxHQUFHLEtBQUssRUFBRSxJQUFJLEdBQUcsS0FBSyxDQUFDO1lBQ25FLElBQUksUUFBUSxHQUFHLG1DQUF3QixDQUFD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IEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBSM0RlcGVuZGVuY3lNZXRhZGF0YSwgUjNSZWZlcmVuY2UsIFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZSwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0ltcG9ydE1vZGUsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0ZvcmVpZ25GdW5jdGlvblJlc29sdmVyfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzTWVtYmVyS2luZCwgQ3RvclBhcmFtZXRlciwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgVHlwZVZhbHVlUmVmZXJlbmNlfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuZXhwb3J0IGVudW0gQ29uc3RydWN0b3JEZXBFcnJvcktpbmQge1xuICBOT19TVUlUQUJMRV9UT0tFTixcbn1cblxuZXhwb3J0IHR5cGUgQ29uc3RydWN0b3JEZXBzID0ge1xuICBkZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdO1xufSB8XG57XG4gIGRlcHM6IG51bGw7XG4gIGVycm9yczogQ29uc3RydWN0b3JEZXBFcnJvcltdO1xufTtcblxuZXhwb3J0IGludGVyZmFjZSBDb25zdHJ1Y3RvckRlcEVycm9yIHtcbiAgaW5kZXg6IG51bWJlcjtcbiAgcGFyYW06IEN0b3JQYXJhbWV0ZXI7XG4gIGtpbmQ6IENvbnN0cnVjdG9yRGVwRXJyb3JLaW5kO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgY2xheno6IHRzLkNsYXNzRGVjbGFyYXRpb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIGlzQ29yZTogYm9vbGVhbik6IENvbnN0cnVjdG9yRGVwc3xudWxsIHtcbiAgY29uc3QgZGVwczogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXSA9IFtdO1xuICBjb25zdCBlcnJvcnM6IENvbnN0cnVjdG9yRGVwRXJyb3JbXSA9IFtdO1xuICBsZXQgY3RvclBhcmFtcyA9IHJlZmxlY3Rvci5nZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xhenopO1xuICBpZiAoY3RvclBhcmFtcyA9PT0gbnVsbCkge1xuICAgIGlmIChyZWZsZWN0b3IuaGFzQmFzZUNsYXNzKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN0b3JQYXJhbXMgPSBbXTtcbiAgICB9XG4gIH1cbiAgY3RvclBhcmFtcy5mb3JFYWNoKChwYXJhbSwgaWR4KSA9PiB7XG4gICAgbGV0IHRva2VuID0gdmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24ocGFyYW0udHlwZVZhbHVlUmVmZXJlbmNlKTtcbiAgICBsZXQgb3B0aW9uYWwgPSBmYWxzZSwgc2VsZiA9IGZhbHNlLCBza2lwU2VsZiA9IGZhbHNlLCBob3N0ID0gZmFsc2U7XG4gICAgbGV0IHJlc29sdmVkID0gUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLlRva2VuO1xuICAgIChwYXJhbS5kZWNvcmF0b3JzIHx8IFtdKS5maWx0ZXIoZGVjID0+IGlzQ29yZSB8fCBpc0FuZ3VsYXJDb3JlKGRlYykpLmZvckVhY2goZGVjID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSBpc0NvcmUgfHwgZGVjLmltcG9ydCA9PT0gbnVsbCA/IGRlYy5uYW1lIDogZGVjLmltcG9ydCAhLm5hbWU7XG4gICAgICBpZiAobmFtZSA9PT0gJ0luamVjdCcpIHtcbiAgICAgICAgaWYgKGRlYy5hcmdzID09PSBudWxsIHx8IGRlYy5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjLm5vZGUsXG4gICAgICAgICAgICAgIGBVbmV4cGVjdGVkIG51bWJlciBvZiBhcmd1bWVudHMgdG8gQEluamVjdCgpLmApO1xuICAgICAgICB9XG4gICAgICAgIHRva2VuID0gbmV3IFdyYXBwZWROb2RlRXhwcihkZWMuYXJnc1swXSk7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdPcHRpb25hbCcpIHtcbiAgICAgICAgb3B0aW9uYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnU2tpcFNlbGYnKSB7XG4gICAgICAgIHNraXBTZWxmID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gJ1NlbGYnKSB7XG4gICAgICAgIHNlbGYgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnSG9zdCcpIHtcbiAgICAgICAgaG9zdCA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdBdHRyaWJ1dGUnKSB7XG4gICAgICAgIGlmIChkZWMuYXJncyA9PT0gbnVsbCB8fCBkZWMuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlYy5ub2RlLFxuICAgICAgICAgICAgICBgVW5leHBlY3RlZCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBBdHRyaWJ1dGUoKS5gKTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbiA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoZGVjLmFyZ3NbMF0pO1xuICAgICAgICByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5BdHRyaWJ1dGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX1VORVhQRUNURUQsIGRlYy5ub2RlLCBgVW5leHBlY3RlZCBkZWNvcmF0b3IgJHtuYW1lfSBvbiBwYXJhbWV0ZXIuYCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHRva2VuID09PSBudWxsKSB7XG4gICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgIGluZGV4OiBpZHgsXG4gICAgICAgIGtpbmQ6IENvbnN0cnVjdG9yRGVwRXJyb3JLaW5kLk5PX1NVSVRBQkxFX1RPS0VOLCBwYXJhbSxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZXBzLnB1c2goe3Rva2VuLCBvcHRpb25hbCwgc2VsZiwgc2tpcFNlbGYsIGhvc3QsIHJlc29sdmVkfSk7XG4gICAgfVxuICB9KTtcbiAgaWYgKGVycm9ycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4ge2RlcHN9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7ZGVwczogbnVsbCwgZXJyb3JzfTtcbiAgfVxufVxuXG4vKipcbiAqIENvbnZlcnQgYSBgVHlwZVZhbHVlUmVmZXJlbmNlYCB0byBhbiBgRXhwcmVzc2lvbmAgd2hpY2ggcmVmZXJzIHRvIHRoZSB0eXBlIGFzIGEgdmFsdWUuXG4gKlxuICogTG9jYWwgcmVmZXJlbmNlcyBhcmUgY29udmVydGVkIHRvIGEgYFdyYXBwZWROb2RlRXhwcmAgb2YgdGhlIFR5cGVTY3JpcHQgZXhwcmVzc2lvbiwgYW5kIG5vbi1sb2NhbFxuICogcmVmZXJlbmNlcyBhcmUgY29udmVydGVkIHRvIGFuIGBFeHRlcm5hbEV4cHJgLiBOb3RlIHRoYXQgdGhpcyBpcyBvbmx5IHZhbGlkIGluIHRoZSBjb250ZXh0IG9mIHRoZVxuICogZmlsZSBpbiB3aGljaCB0aGUgYFR5cGVWYWx1ZVJlZmVyZW5jZWAgb3JpZ2luYXRlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9uKHZhbHVlUmVmOiBUeXBlVmFsdWVSZWZlcmVuY2UpOiBFeHByZXNzaW9uO1xuZXhwb3J0IGZ1bmN0aW9uIHZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9uKHZhbHVlUmVmOiBudWxsKTogbnVsbDtcbmV4cG9ydCBmdW5jdGlvbiB2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbih2YWx1ZVJlZjogVHlwZVZhbHVlUmVmZXJlbmNlIHwgbnVsbCk6IEV4cHJlc3Npb258bnVsbDtcbmV4cG9ydCBmdW5jdGlvbiB2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbih2YWx1ZVJlZjogVHlwZVZhbHVlUmVmZXJlbmNlIHwgbnVsbCk6IEV4cHJlc3Npb258bnVsbCB7XG4gIGlmICh2YWx1ZVJlZiA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKHZhbHVlUmVmLmxvY2FsKSB7XG4gICAgcmV0dXJuIG5ldyBXcmFwcGVkTm9kZUV4cHIodmFsdWVSZWYuZXhwcmVzc2lvbik7XG4gIH0gZWxzZSB7XG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNhc3QgaXMgbmVjZXNzYXJ5IGJlY2F1c2UgdGhlIGczIHR5cGVzY3JpcHQgdmVyc2lvbiBkb2Vzbid0IG5hcnJvdyBoZXJlLlxuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxFeHByKHZhbHVlUmVmIGFze21vZHVsZU5hbWU6IHN0cmluZywgbmFtZTogc3RyaW5nfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgY2xheno6IHRzLkNsYXNzRGVjbGFyYXRpb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIGlzQ29yZTogYm9vbGVhbik6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW118XG4gICAgbnVsbCB7XG4gIHJldHVybiB2YWxpZGF0ZUNvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgICAgY2xhenosIGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByZWZsZWN0b3IsIGlzQ29yZSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICBjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVwczogQ29uc3RydWN0b3JEZXBzIHwgbnVsbCk6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW118bnVsbCB7XG4gIGlmIChkZXBzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSBpZiAoZGVwcy5kZXBzICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIGRlcHMuZGVwcztcbiAgfSBlbHNlIHtcbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY2FzdCBpcyBuZWNlc3NhcnkgYmVjYXVzZSB0aGUgZzMgdHlwZXNjcmlwdCB2ZXJzaW9uIGRvZXNuJ3QgbmFycm93IGhlcmUuXG4gICAgY29uc3Qge3BhcmFtLCBpbmRleH0gPSAoZGVwcyBhc3tlcnJvcnM6IENvbnN0cnVjdG9yRGVwRXJyb3JbXX0pLmVycm9yc1swXTtcbiAgICAvLyBUaGVyZSBpcyBhdCBsZWFzdCBvbmUgZXJyb3IuXG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuUEFSQU1fTUlTU0lOR19UT0tFTiwgcGFyYW0ubmFtZU5vZGUsXG4gICAgICAgIGBObyBzdWl0YWJsZSBpbmplY3Rpb24gdG9rZW4gZm9yIHBhcmFtZXRlciAnJHtwYXJhbS5uYW1lIHx8IGluZGV4fScgb2YgY2xhc3MgJyR7Y2xhenoubmFtZSEudGV4dH0nLiBGb3VuZDogJHtwYXJhbS50eXBlTm9kZSEuZ2V0VGV4dCgpfWApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1IzUmVmZXJlbmNlKFxuICAgIHZhbHVlUmVmOiBSZWZlcmVuY2UsIHR5cGVSZWY6IFJlZmVyZW5jZSwgdmFsdWVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlLFxuICAgIHR5cGVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyKTogUjNSZWZlcmVuY2Uge1xuICBjb25zdCB2YWx1ZSA9IHJlZkVtaXR0ZXIuZW1pdCh2YWx1ZVJlZiwgdmFsdWVDb250ZXh0LCBJbXBvcnRNb2RlLlVzZUV4aXN0aW5nSW1wb3J0KTtcbiAgY29uc3QgdHlwZSA9IHJlZkVtaXR0ZXIuZW1pdCh0eXBlUmVmLCB0eXBlQ29udGV4dCwgSW1wb3J0TW9kZS5Gb3JjZU5ld0ltcG9ydCk7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB0eXBlID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcmVmZXIgdG8gJHt0cy5TeW50YXhLaW5kW3ZhbHVlUmVmLm5vZGUua2luZF19YCk7XG4gIH1cbiAgcmV0dXJuIHt2YWx1ZSwgdHlwZX07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FuZ3VsYXJDb3JlKGRlY29yYXRvcjogRGVjb3JhdG9yKTogYm9vbGVhbiB7XG4gIHJldHVybiBkZWNvcmF0b3IuaW1wb3J0ICE9PSBudWxsICYmIGRlY29yYXRvci5pbXBvcnQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBbmd1bGFyQ29yZVJlZmVyZW5jZShyZWZlcmVuY2U6IFJlZmVyZW5jZSwgc3ltYm9sTmFtZTogc3RyaW5nKSB7XG4gIHJldHVybiByZWZlcmVuY2Uub3duZWRCeU1vZHVsZUd1ZXNzID09PSAnQGFuZ3VsYXIvY29yZScgJiYgcmVmZXJlbmNlLmRlYnVnTmFtZSA9PT0gc3ltYm9sTmFtZTtcbn1cblxuLyoqXG4gKiBVbndyYXAgYSBgdHMuRXhwcmVzc2lvbmAsIHJlbW92aW5nIG91dGVyIHR5cGUtY2FzdHMgb3IgcGFyZW50aGVzZXMgdW50aWwgdGhlIGV4cHJlc3Npb24gaXMgaW4gaXRzXG4gKiBsb3dlc3QgbGV2ZWwgZm9ybS5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGV4cHJlc3Npb24gXCIoZm9vIGFzIFR5cGUpXCIgdW53cmFwcyB0byBcImZvb1wiLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdW53cmFwRXhwcmVzc2lvbihub2RlOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gIHdoaWxlICh0cy5pc0FzRXhwcmVzc2lvbihub2RlKSB8fCB0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgbm9kZSA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgfVxuICByZXR1cm4gbm9kZTtcbn1cblxuZnVuY3Rpb24gZXhwYW5kRm9yd2FyZFJlZihhcmc6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBpZiAoIXRzLmlzQXJyb3dGdW5jdGlvbihhcmcpICYmICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihhcmcpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBib2R5ID0gYXJnLmJvZHk7XG4gIC8vIEVpdGhlciB0aGUgYm9keSBpcyBhIHRzLkV4cHJlc3Npb24gZGlyZWN0bHksIG9yIGEgYmxvY2sgd2l0aCBhIHNpbmdsZSByZXR1cm4gc3RhdGVtZW50LlxuICBpZiAodHMuaXNCbG9jayhib2R5KSkge1xuICAgIC8vIEJsb2NrIGJvZHkgLSBsb29rIGZvciBhIHNpbmdsZSByZXR1cm4gc3RhdGVtZW50LlxuICAgIGlmIChib2R5LnN0YXRlbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgc3RtdCA9IGJvZHkuc3RhdGVtZW50c1swXTtcbiAgICBpZiAoIXRzLmlzUmV0dXJuU3RhdGVtZW50KHN0bXQpIHx8IHN0bXQuZXhwcmVzc2lvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHN0bXQuZXhwcmVzc2lvbjtcbiAgfSBlbHNlIHtcbiAgICAvLyBTaG9ydGhhbmQgYm9keSAtIHJldHVybiBhcyBhbiBleHByZXNzaW9uLlxuICAgIHJldHVybiBib2R5O1xuICB9XG59XG5cbi8qKlxuICogUG9zc2libHkgcmVzb2x2ZSBhIGZvcndhcmRSZWYoKSBleHByZXNzaW9uIGludG8gdGhlIGlubmVyIHZhbHVlLlxuICpcbiAqIEBwYXJhbSBub2RlIHRoZSBmb3J3YXJkUmVmKCkgZXhwcmVzc2lvbiB0byByZXNvbHZlXG4gKiBAcGFyYW0gcmVmbGVjdG9yIGEgUmVmbGVjdGlvbkhvc3RcbiAqIEByZXR1cm5zIHRoZSByZXNvbHZlZCBleHByZXNzaW9uLCBpZiB0aGUgb3JpZ2luYWwgZXhwcmVzc2lvbiB3YXMgYSBmb3J3YXJkUmVmKCksIG9yIHRoZSBvcmlnaW5hbFxuICogZXhwcmVzc2lvbiBvdGhlcndpc2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVud3JhcEZvcndhcmRSZWYobm9kZTogdHMuRXhwcmVzc2lvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCk6IHRzLkV4cHJlc3Npb24ge1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkgfHwgIXRzLmlzSWRlbnRpZmllcihub2RlLmV4cHJlc3Npb24pIHx8XG4gICAgICBub2RlLmFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuICBjb25zdCBleHByID0gZXhwYW5kRm9yd2FyZFJlZihub2RlLmFyZ3VtZW50c1swXSk7XG4gIGlmIChleHByID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbiAgY29uc3QgaW1wID0gcmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcihub2RlLmV4cHJlc3Npb24pO1xuICBpZiAoaW1wID09PSBudWxsIHx8IGltcC5mcm9tICE9PSAnQGFuZ3VsYXIvY29yZScgfHwgaW1wLm5hbWUgIT09ICdmb3J3YXJkUmVmJykge1xuICAgIHJldHVybiBub2RlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBleHByO1xuICB9XG59XG5cbi8qKlxuICogQSBmb3JlaWduIGZ1bmN0aW9uIHJlc29sdmVyIGZvciBgc3RhdGljYWxseVJlc29sdmVgIHdoaWNoIHVud3JhcHMgZm9yd2FyZFJlZigpIGV4cHJlc3Npb25zLlxuICpcbiAqIEBwYXJhbSByZWYgYSBSZWZlcmVuY2UgdG8gdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBmdW5jdGlvbiBiZWluZyBjYWxsZWQgKHdoaWNoIG1pZ2h0IGJlXG4gKiBmb3J3YXJkUmVmKVxuICogQHBhcmFtIGFyZ3MgdGhlIGFyZ3VtZW50cyB0byB0aGUgaW52b2NhdGlvbiBvZiB0aGUgZm9yd2FyZFJlZiBleHByZXNzaW9uXG4gKiBAcmV0dXJucyBhbiB1bndyYXBwZWQgYXJndW1lbnQgaWYgYHJlZmAgcG9pbnRlZCB0byBmb3J3YXJkUmVmLCBvciBudWxsIG90aGVyd2lzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9yd2FyZFJlZlJlc29sdmVyKFxuICAgIHJlZjogUmVmZXJlbmNlPHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb24+LFxuICAgIGFyZ3M6IHRzLkV4cHJlc3Npb25bXSk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gIGlmICghaXNBbmd1bGFyQ29yZVJlZmVyZW5jZShyZWYsICdmb3J3YXJkUmVmJykgfHwgYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gZXhwYW5kRm9yd2FyZFJlZihhcmdzWzBdKTtcbn1cblxuLyoqXG4gKiBDb21iaW5lcyBhbiBhcnJheSBvZiByZXNvbHZlciBmdW5jdGlvbnMgaW50byBhIG9uZS5cbiAqIEBwYXJhbSByZXNvbHZlcnMgUmVzb2x2ZXJzIHRvIGJlIGNvbWJpbmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tYmluZVJlc29sdmVycyhyZXNvbHZlcnM6IEZvcmVpZ25GdW5jdGlvblJlc29sdmVyW10pOiBGb3JlaWduRnVuY3Rpb25SZXNvbHZlciB7XG4gIHJldHVybiAocmVmOiBSZWZlcmVuY2U8dHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5NZXRob2REZWNsYXJhdGlvbj4sXG4gICAgICAgICAgYXJnczogdHMuRXhwcmVzc2lvbltdKTogdHMuRXhwcmVzc2lvbiB8XG4gICAgICBudWxsID0+IHtcbiAgICBmb3IgKGNvbnN0IHJlc29sdmVyIG9mIHJlc29sdmVycykge1xuICAgICAgY29uc3QgcmVzb2x2ZWQgPSByZXNvbHZlcihyZWYsIGFyZ3MpO1xuICAgICAgaWYgKHJlc29sdmVkICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG59XG4iXX0=