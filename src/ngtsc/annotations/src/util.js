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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/util", ["require", "exports", "@angular/compiler", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    function getConstructorDependencies(clazz, reflector, isCore) {
        var useType = [];
        var ctorParams = reflector.getConstructorParameters(clazz) || [];
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
    function referenceToExpression(ref, context) {
        var exp = ref.toExpression(context);
        if (exp === null) {
            throw new Error("Could not refer to " + ts.SyntaxKind[ref.node.kind]);
        }
        return exp;
    }
    exports.referenceToExpression = referenceToExpression;
    function isAngularCore(decorator) {
        return decorator.import !== null && decorator.import.from === '@angular/core';
    }
    exports.isAngularCore = isAngularCore;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBOEc7SUFDOUcsK0JBQWlDO0lBS2pDLG9DQUNJLEtBQTBCLEVBQUUsU0FBeUIsRUFDckQsTUFBZTtRQUNqQixJQUFNLE9BQU8sR0FBMkIsRUFBRSxDQUFDO1FBQzNDLElBQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFDLEtBQUssRUFBRSxHQUFHO1lBQzVCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDM0IsSUFBSSxRQUFRLEdBQUcsS0FBSyxFQUFFLElBQUksR0FBRyxLQUFLLEVBQUUsUUFBUSxHQUFHLEtBQUssRUFBRSxJQUFJLEdBQUcsS0FBSyxDQUFDO1lBQ25FLElBQUksUUFBUSxHQUFHLG1DQUF3QixDQUFDLEtBQUssQ0FBQztZQUM5QyxDQUFDLEtBQUssQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsTUFBTSxJQUFJLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBNUIsQ0FBNEIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEdBQUc7Z0JBQzlFLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUU7b0JBQ3pCLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO3dCQUM5QyxNQUFNLElBQUksS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7cUJBQ2pF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QUksQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDO1NBQ3ZFO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBTkQsc0RBTUM7SUFFRCx1QkFBOEIsU0FBb0I7UUFDaEQsT0FBTyxTQUFTLENBQUMsTUFBTSxLQUFLLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxlQUFlLENBQUM7SUFDaEYsQ0FBQztJQUZELHNDQUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIFIzRGVwZW5kZW5jeU1ldGFkYXRhLCBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vaG9zdCc7XG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgY2xheno6IHRzLkNsYXNzRGVjbGFyYXRpb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgaXNDb3JlOiBib29sZWFuKTogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXSB7XG4gIGNvbnN0IHVzZVR5cGU6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW10gPSBbXTtcbiAgY29uc3QgY3RvclBhcmFtcyA9IHJlZmxlY3Rvci5nZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xhenopIHx8IFtdO1xuICBjdG9yUGFyYW1zLmZvckVhY2goKHBhcmFtLCBpZHgpID0+IHtcbiAgICBsZXQgdG9rZW5FeHByID0gcGFyYW0udHlwZTtcbiAgICBsZXQgb3B0aW9uYWwgPSBmYWxzZSwgc2VsZiA9IGZhbHNlLCBza2lwU2VsZiA9IGZhbHNlLCBob3N0ID0gZmFsc2U7XG4gICAgbGV0IHJlc29sdmVkID0gUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLlRva2VuO1xuICAgIChwYXJhbS5kZWNvcmF0b3JzIHx8IFtdKS5maWx0ZXIoZGVjID0+IGlzQ29yZSB8fCBpc0FuZ3VsYXJDb3JlKGRlYykpLmZvckVhY2goZGVjID0+IHtcbiAgICAgIGlmIChkZWMubmFtZSA9PT0gJ0luamVjdCcpIHtcbiAgICAgICAgaWYgKGRlYy5hcmdzID09PSBudWxsIHx8IGRlYy5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBJbmplY3QoKS5gKTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbkV4cHIgPSBkZWMuYXJnc1swXTtcbiAgICAgIH0gZWxzZSBpZiAoZGVjLm5hbWUgPT09ICdPcHRpb25hbCcpIHtcbiAgICAgICAgb3B0aW9uYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChkZWMubmFtZSA9PT0gJ1NraXBTZWxmJykge1xuICAgICAgICBza2lwU2VsZiA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGRlYy5uYW1lID09PSAnU2VsZicpIHtcbiAgICAgICAgc2VsZiA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGRlYy5uYW1lID09PSAnSG9zdCcpIHtcbiAgICAgICAgaG9zdCA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGRlYy5uYW1lID09PSAnQXR0cmlidXRlJykge1xuICAgICAgICBpZiAoZGVjLmFyZ3MgPT09IG51bGwgfHwgZGVjLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIG51bWJlciBvZiBhcmd1bWVudHMgdG8gQEF0dHJpYnV0ZSgpLmApO1xuICAgICAgICB9XG4gICAgICAgIHRva2VuRXhwciA9IGRlYy5hcmdzWzBdO1xuICAgICAgICByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5BdHRyaWJ1dGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgZGVjb3JhdG9yICR7ZGVjLm5hbWV9IG9uIHBhcmFtZXRlci5gKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAodG9rZW5FeHByID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYE5vIHN1aXRhYmxlIHRva2VuIGZvciBwYXJhbWV0ZXIgJHtwYXJhbS5uYW1lIHx8IGlkeH0gb2YgY2xhc3MgJHtjbGF6ei5uYW1lIS50ZXh0fWApO1xuICAgIH1cbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKHRva2VuRXhwcikpIHtcbiAgICAgIGNvbnN0IGltcG9ydGVkU3ltYm9sID0gcmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcih0b2tlbkV4cHIpO1xuICAgICAgaWYgKGltcG9ydGVkU3ltYm9sICE9PSBudWxsICYmIGltcG9ydGVkU3ltYm9sLmZyb20gPT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgICBzd2l0Y2ggKGltcG9ydGVkU3ltYm9sLm5hbWUpIHtcbiAgICAgICAgICBjYXNlICdFbGVtZW50UmVmJzpcbiAgICAgICAgICAgIHJlc29sdmVkID0gUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLkVsZW1lbnRSZWY7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdJbmplY3Rvcic6XG4gICAgICAgICAgICByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5JbmplY3RvcjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ1RlbXBsYXRlUmVmJzpcbiAgICAgICAgICAgIHJlc29sdmVkID0gUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLlRlbXBsYXRlUmVmO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnVmlld0NvbnRhaW5lclJlZic6XG4gICAgICAgICAgICByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5WaWV3Q29udGFpbmVyUmVmO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vIExlYXZlIGFzIGEgVG9rZW4gb3IgQXR0cmlidXRlLlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHRva2VuID0gbmV3IFdyYXBwZWROb2RlRXhwcih0b2tlbkV4cHIpO1xuICAgIHVzZVR5cGUucHVzaCh7dG9rZW4sIG9wdGlvbmFsLCBzZWxmLCBza2lwU2VsZiwgaG9zdCwgcmVzb2x2ZWR9KTtcbiAgfSk7XG4gIHJldHVybiB1c2VUeXBlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmZXJlbmNlVG9FeHByZXNzaW9uKHJlZjogUmVmZXJlbmNlLCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogRXhwcmVzc2lvbiB7XG4gIGNvbnN0IGV4cCA9IHJlZi50b0V4cHJlc3Npb24oY29udGV4dCk7XG4gIGlmIChleHAgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZWZlciB0byAke3RzLlN5bnRheEtpbmRbcmVmLm5vZGUua2luZF19YCk7XG4gIH1cbiAgcmV0dXJuIGV4cDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBib29sZWFuIHtcbiAgcmV0dXJuIGRlY29yYXRvci5pbXBvcnQgIT09IG51bGwgJiYgZGVjb3JhdG9yLmltcG9ydC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZSc7XG59XG4iXX0=