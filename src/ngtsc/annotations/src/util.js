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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/util", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/metadata"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
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
                        throw new Error("Unexpected number of arguments to @Inject().");
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
                        throw new Error("Unexpected number of arguments to @Attribute().");
                    }
                    tokenExpr = dec.args[0];
                    resolved = compiler_1.R3ResolvedDependencyType.Attribute;
                }
                else {
                    throw new Error("Unexpected decorator " + dec.name + " on parameter.");
                }
            });
            if (tokenExpr === null) {
                throw new Error("No suitable token for parameter " + (param.name || idx) + " of class " + clazz.name.text);
            }
            if (ts.isIdentifier(tokenExpr)) {
                var importedSymbol = reflector.getImportOfIdentifier(tokenExpr);
                if (importedSymbol !== null && importedSymbol.from === '@angular/core') {
                    switch (importedSymbol.name) {
                        case 'ChangeDetectorRef':
                            resolved = compiler_1.R3ResolvedDependencyType.ChangeDetectorRef;
                            break;
                        case 'ElementRef':
                            resolved = compiler_1.R3ResolvedDependencyType.ElementRef;
                            break;
                        case 'Injector':
                            resolved = compiler_1.R3ResolvedDependencyType.Injector;
                            break;
                        case 'TemplateRef':
                            resolved = compiler_1.R3ResolvedDependencyType.TemplateRef;
                            break;
                        case 'ViewContainerRef':
                            resolved = compiler_1.R3ResolvedDependencyType.ViewContainerRef;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBMkg7SUFDM0gsK0JBQWlDO0lBR2pDLHFFQUF3RTtJQUV4RSxvQ0FDSSxLQUEwQixFQUFFLFNBQXlCLEVBQUUsTUFBZTtRQUV4RSxJQUFNLE9BQU8sR0FBMkIsRUFBRSxDQUFDO1FBQzNDLElBQUksVUFBVSxHQUFHLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzRCxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUU7WUFDdkIsSUFBSSxTQUFTLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNqQyxPQUFPLElBQUksQ0FBQzthQUNiO2lCQUFNO2dCQUNMLFVBQVUsR0FBRyxFQUFFLENBQUM7YUFDakI7U0FDRjtRQUNELFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQyxLQUFLLEVBQUUsR0FBRztZQUM1QixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQzNCLElBQUksUUFBUSxHQUFHLEtBQUssRUFBRSxJQUFJLEdBQUcsS0FBSyxFQUFFLFFBQVEsR0FBRyxLQUFLLEVBQUUsSUFBSSxHQUFHLEtBQUssQ0FBQztZQUNuRSxJQUFJLFFBQVEsR0FBRyxtQ0FBd0IsQ0FBQyxLQUFLLENBQUM7WUFDOUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLE1BQU0sSUFBSSxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQTVCLENBQTRCLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQSxHQUFHO2dCQUM5RSxJQUFJLEdBQUcsQ0FBQyxJQUFJ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SSxLQUFLLGVBQWUsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFlBQVksRUFBRTtZQUM3RSxPQUFPLElBQUksQ0FBQztTQUNiO2FBQU07WUFDTCxPQUFPLElBQUksQ0FBQztTQUNiO0lBQ0gsQ0FBQztJQWZELDRDQWVDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILDRCQUNJLEdBQTJELEVBQzNELElBQXFCO1FBQ3ZCLElBQUksQ0FBQyxDQUFDLEdBQUcsWUFBWSw0QkFBaUIsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxVQUFVLEtBQUssZUFBZTtZQUN6RSxHQUFHLENBQUMsVUFBVSxLQUFLLFlBQVksSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN4RCxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBUkQsZ0RBUUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgUjNEZXBlbmRlbmN5TWV0YWRhdGEsIFIzUmVmZXJlbmNlLCBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vaG9zdCc7XG5pbXBvcnQge0Fic29sdXRlUmVmZXJlbmNlLCBJbXBvcnRNb2RlLCBSZWZlcmVuY2V9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgIGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBpc0NvcmU6IGJvb2xlYW4pOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfFxuICAgIG51bGwge1xuICBjb25zdCB1c2VUeXBlOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdID0gW107XG4gIGxldCBjdG9yUGFyYW1zID0gcmVmbGVjdG9yLmdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhjbGF6eik7XG4gIGlmIChjdG9yUGFyYW1zID09PSBudWxsKSB7XG4gICAgaWYgKHJlZmxlY3Rvci5oYXNCYXNlQ2xhc3MoY2xhenopKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgY3RvclBhcmFtcyA9IFtdO1xuICAgIH1cbiAgfVxuICBjdG9yUGFyYW1zLmZvckVhY2goKHBhcmFtLCBpZHgpID0+IHtcbiAgICBsZXQgdG9rZW5FeHByID0gcGFyYW0udHlwZTtcbiAgICBsZXQgb3B0aW9uYWwgPSBmYWxzZSwgc2VsZiA9IGZhbHNlLCBza2lwU2VsZiA9IGZhbHNlLCBob3N0ID0gZmFsc2U7XG4gICAgbGV0IHJlc29sdmVkID0gUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLlRva2VuO1xuICAgIChwYXJhbS5kZWNvcmF0b3JzIHx8IFtdKS5maWx0ZXIoZGVjID0+IGlzQ29yZSB8fCBpc0FuZ3VsYXJDb3JlKGRlYykpLmZvckVhY2goZGVjID0+IHtcbiAgICAgIGlmIChkZWMubmFtZSA9PT0gJ0luamVjdCcpIHtcbiAgICAgICAgaWYgKGRlYy5hcmdzID09PSBudWxsIHx8IGRlYy5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBJbmplY3QoKS5gKTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbkV4cHIgPSBkZWMuYXJnc1swXTtcbiAgICAgIH0gZWxzZSBpZiAoZGVjLm5hbWUgPT09ICdPcHRpb25hbCcpIHtcbiAgICAgICAgb3B0aW9uYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChkZWMubmFtZSA9PT0gJ1NraXBTZWxmJykge1xuICAgICAgICBza2lwU2VsZiA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGRlYy5uYW1lID09PSAnU2VsZicpIHtcbiAgICAgICAgc2VsZiA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGRlYy5uYW1lID09PSAnSG9zdCcpIHtcbiAgICAgICAgaG9zdCA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGRlYy5uYW1lID09PSAnQXR0cmlidXRlJykge1xuICAgICAgICBpZiAoZGVjLmFyZ3MgPT09IG51bGwgfHwgZGVjLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIG51bWJlciBvZiBhcmd1bWVudHMgdG8gQEF0dHJpYnV0ZSgpLmApO1xuICAgICAgICB9XG4gICAgICAgIHRva2VuRXhwciA9IGRlYy5hcmdzWzBdO1xuICAgICAgICByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5BdHRyaWJ1dGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgZGVjb3JhdG9yICR7ZGVjLm5hbWV9IG9uIHBhcmFtZXRlci5gKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAodG9rZW5FeHByID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYE5vIHN1aXRhYmxlIHRva2VuIGZvciBwYXJhbWV0ZXIgJHtwYXJhbS5uYW1lIHx8IGlkeH0gb2YgY2xhc3MgJHtjbGF6ei5uYW1lIS50ZXh0fWApO1xuICAgIH1cbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKHRva2VuRXhwcikpIHtcbiAgICAgIGNvbnN0IGltcG9ydGVkU3ltYm9sID0gcmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcih0b2tlbkV4cHIpO1xuICAgICAgaWYgKGltcG9ydGVkU3ltYm9sICE9PSBudWxsICYmIGltcG9ydGVkU3ltYm9sLmZyb20gPT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgICBzd2l0Y2ggKGltcG9ydGVkU3ltYm9sLm5hbWUpIHtcbiAgICAgICAgICBjYXNlICdDaGFuZ2VEZXRlY3RvclJlZic6XG4gICAgICAgICAgICByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5DaGFuZ2VEZXRlY3RvclJlZjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ0VsZW1lbnRSZWYnOlxuICAgICAgICAgICAgcmVzb2x2ZWQgPSBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUuRWxlbWVudFJlZjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ0luamVjdG9yJzpcbiAgICAgICAgICAgIHJlc29sdmVkID0gUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLkluamVjdG9yO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnVGVtcGxhdGVSZWYnOlxuICAgICAgICAgICAgcmVzb2x2ZWQgPSBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUuVGVtcGxhdGVSZWY7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdWaWV3Q29udGFpbmVyUmVmJzpcbiAgICAgICAgICAgIHJlc29sdmVkID0gUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLlZpZXdDb250YWluZXJSZWY7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgLy8gTGVhdmUgYXMgYSBUb2tlbiBvciBBdHRyaWJ1dGUuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgdG9rZW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRva2VuRXhwcik7XG4gICAgdXNlVHlwZS5wdXNoKHt0b2tlbiwgb3B0aW9uYWwsIHNlbGYsIHNraXBTZWxmLCBob3N0LCByZXNvbHZlZH0pO1xuICB9KTtcbiAgcmV0dXJuIHVzZVR5cGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1IzUmVmZXJlbmNlKHJlZjogUmVmZXJlbmNlLCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogUjNSZWZlcmVuY2Uge1xuICBjb25zdCB2YWx1ZSA9IHJlZi50b0V4cHJlc3Npb24oY29udGV4dCwgSW1wb3J0TW9kZS5Vc2VFeGlzdGluZ0ltcG9ydCk7XG4gIGNvbnN0IHR5cGUgPSByZWYudG9FeHByZXNzaW9uKGNvbnRleHQsIEltcG9ydE1vZGUuRm9yY2VOZXdJbXBvcnQpO1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdHlwZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlZmVyIHRvICR7dHMuU3ludGF4S2luZFtyZWYubm9kZS5raW5kXX1gKTtcbiAgfVxuICByZXR1cm4ge3ZhbHVlLCB0eXBlfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBib29sZWFuIHtcbiAgcmV0dXJuIGRlY29yYXRvci5pbXBvcnQgIT09IG51bGwgJiYgZGVjb3JhdG9yLmltcG9ydC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZSc7XG59XG5cbi8qKlxuICogVW53cmFwIGEgYHRzLkV4cHJlc3Npb25gLCByZW1vdmluZyBvdXRlciB0eXBlLWNhc3RzIG9yIHBhcmVudGhlc2VzIHVudGlsIHRoZSBleHByZXNzaW9uIGlzIGluIGl0c1xuICogbG93ZXN0IGxldmVsIGZvcm0uXG4gKlxuICogRm9yIGV4YW1wbGUsIHRoZSBleHByZXNzaW9uIFwiKGZvbyBhcyBUeXBlKVwiIHVud3JhcHMgdG8gXCJmb29cIi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVud3JhcEV4cHJlc3Npb24obm9kZTogdHMuRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb24ge1xuICB3aGlsZSAodHMuaXNBc0V4cHJlc3Npb24obm9kZSkgfHwgdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlKSkge1xuICAgIG5vZGUgPSBub2RlLmV4cHJlc3Npb247XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZEZvcndhcmRSZWYoYXJnOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKCF0cy5pc0Fycm93RnVuY3Rpb24oYXJnKSAmJiAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oYXJnKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgYm9keSA9IGFyZy5ib2R5O1xuICAvLyBFaXRoZXIgdGhlIGJvZHkgaXMgYSB0cy5FeHByZXNzaW9uIGRpcmVjdGx5LCBvciBhIGJsb2NrIHdpdGggYSBzaW5nbGUgcmV0dXJuIHN0YXRlbWVudC5cbiAgaWYgKHRzLmlzQmxvY2soYm9keSkpIHtcbiAgICAvLyBCbG9jayBib2R5IC0gbG9vayBmb3IgYSBzaW5nbGUgcmV0dXJuIHN0YXRlbWVudC5cbiAgICBpZiAoYm9keS5zdGF0ZW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHN0bXQgPSBib2R5LnN0YXRlbWVudHNbMF07XG4gICAgaWYgKCF0cy5pc1JldHVyblN0YXRlbWVudChzdG10KSB8fCBzdG10LmV4cHJlc3Npb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzdG10LmV4cHJlc3Npb247XG4gIH0gZWxzZSB7XG4gICAgLy8gU2hvcnRoYW5kIGJvZHkgLSByZXR1cm4gYXMgYW4gZXhwcmVzc2lvbi5cbiAgICByZXR1cm4gYm9keTtcbiAgfVxufVxuXG4vKipcbiAqIFBvc3NpYmx5IHJlc29sdmUgYSBmb3J3YXJkUmVmKCkgZXhwcmVzc2lvbiBpbnRvIHRoZSBpbm5lciB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0gbm9kZSB0aGUgZm9yd2FyZFJlZigpIGV4cHJlc3Npb24gdG8gcmVzb2x2ZVxuICogQHBhcmFtIHJlZmxlY3RvciBhIFJlZmxlY3Rpb25Ib3N0XG4gKiBAcmV0dXJucyB0aGUgcmVzb2x2ZWQgZXhwcmVzc2lvbiwgaWYgdGhlIG9yaWdpbmFsIGV4cHJlc3Npb24gd2FzIGEgZm9yd2FyZFJlZigpLCBvciB0aGUgb3JpZ2luYWxcbiAqIGV4cHJlc3Npb24gb3RoZXJ3aXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bndyYXBGb3J3YXJkUmVmKG5vZGU6IHRzLkV4cHJlc3Npb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpOiB0cy5FeHByZXNzaW9uIHtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpIHx8ICF0cy5pc0lkZW50aWZpZXIobm9kZS5leHByZXNzaW9uKSB8fFxuICAgICAgbm9kZS5hcmd1bWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbiAgY29uc3QgZXhwciA9IGV4cGFuZEZvcndhcmRSZWYobm9kZS5hcmd1bWVudHNbMF0pO1xuICBpZiAoZXhwciA9PT0gbnVsbCkge1xuICAgIHJldHVybiBub2RlO1xuICB9XG4gIGNvbnN0IGltcCA9IHJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIobm9kZS5leHByZXNzaW9uKTtcbiAgaWYgKGltcCA9PT0gbnVsbCB8fCBpbXAuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnIHx8IGltcC5uYW1lICE9PSAnZm9yd2FyZFJlZicpIHtcbiAgICByZXR1cm4gbm9kZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZXhwcjtcbiAgfVxufVxuXG4vKipcbiAqIEEgZm9yZWlnbiBmdW5jdGlvbiByZXNvbHZlciBmb3IgYHN0YXRpY2FsbHlSZXNvbHZlYCB3aGljaCB1bndyYXBzIGZvcndhcmRSZWYoKSBleHByZXNzaW9ucy5cbiAqXG4gKiBAcGFyYW0gcmVmIGEgUmVmZXJlbmNlIHRvIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZnVuY3Rpb24gYmVpbmcgY2FsbGVkICh3aGljaCBtaWdodCBiZVxuICogZm9yd2FyZFJlZilcbiAqIEBwYXJhbSBhcmdzIHRoZSBhcmd1bWVudHMgdG8gdGhlIGludm9jYXRpb24gb2YgdGhlIGZvcndhcmRSZWYgZXhwcmVzc2lvblxuICogQHJldHVybnMgYW4gdW53cmFwcGVkIGFyZ3VtZW50IGlmIGByZWZgIHBvaW50ZWQgdG8gZm9yd2FyZFJlZiwgb3IgbnVsbCBvdGhlcndpc2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcndhcmRSZWZSZXNvbHZlcihcbiAgICByZWY6IFJlZmVyZW5jZTx0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9uPixcbiAgICBhcmdzOiB0cy5FeHByZXNzaW9uW10pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBpZiAoIShyZWYgaW5zdGFuY2VvZiBBYnNvbHV0ZVJlZmVyZW5jZSkgfHwgcmVmLm1vZHVsZU5hbWUgIT09ICdAYW5ndWxhci9jb3JlJyB8fFxuICAgICAgcmVmLnN5bWJvbE5hbWUgIT09ICdmb3J3YXJkUmVmJyB8fCBhcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiBleHBhbmRGb3J3YXJkUmVmKGFyZ3NbMF0pO1xufVxuIl19