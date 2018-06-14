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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/util", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/metadata/src/reflector"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var reflector_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/reflector");
    function getConstructorDependencies(clazz, checker) {
        var useType = [];
        var ctorParams = (metadata_1.reflectConstructorParameters(clazz, checker) || []);
        ctorParams.forEach(function (param) {
            var tokenExpr = param.typeValueExpr;
            var optional = false, self = false, skipSelf = false, host = false;
            var resolved = compiler_1.R3ResolvedDependencyType.Token;
            param.decorators.filter(function (dec) { return dec.from === '@angular/core'; }).forEach(function (dec) {
                if (dec.name === 'Inject') {
                    if (dec.args.length !== 1) {
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
                    if (dec.args.length !== 1) {
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
                throw new Error("No suitable token for parameter " + param.name.text + " of class " + clazz.name.text + " with decorators " + param.decorators.map(function (dec) { return dec.from + '#' + dec.name; }).join(','));
            }
            if (ts.isIdentifier(tokenExpr)) {
                var importedSymbol = reflector_1.reflectImportedIdentifier(tokenExpr, checker);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBOEc7SUFDOUcsK0JBQWlDO0lBRWpDLHFFQUF1RTtJQUN2RSxvRkFBdUU7SUFFdkUsb0NBQ0ksS0FBMEIsRUFBRSxPQUF1QjtRQUNyRCxJQUFNLE9BQU8sR0FBMkIsRUFBRSxDQUFDO1FBQzNDLElBQU0sVUFBVSxHQUFHLENBQUMsdUNBQTRCLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3hFLFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQSxLQUFLO1lBQ3RCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUM7WUFDcEMsSUFBSSxRQUFRLEdBQUcsS0FBSyxFQUFFLElBQUksR0FBRyxLQUFLLEVBQUUsUUFBUSxHQUFHLEtBQUssRUFBRSxJQUFJLEdBQUcsS0FBSyxDQUFDO1lBQ25FLElBQUksUUFBUSxHQUFHLG1DQUF3QixDQUFDLEtBQUssQ0FBQztZQUM5QyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEdBQUcsQ0FBQyxJQUFJLEtBQUssZUFBZSxFQUE1QixDQUE0QixDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRztnQkFDdEUsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtvQkFDekIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7d0JBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsOENBQThDLENBQUMsQ0FBQztxQkFDakU7b0JBQ0QsU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FB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SUFBSSxFQUFFO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXNCLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDO1NBQ3ZFO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBTkQsc0RBTUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgUjNEZXBlbmRlbmN5TWV0YWRhdGEsIFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZSwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2UsIHJlZmxlY3RDb25zdHJ1Y3RvclBhcmFtZXRlcnN9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7cmVmbGVjdEltcG9ydGVkSWRlbnRpZmllcn0gZnJvbSAnLi4vLi4vbWV0YWRhdGEvc3JjL3JlZmxlY3Rvcic7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICBjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdIHtcbiAgY29uc3QgdXNlVHlwZTogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXSA9IFtdO1xuICBjb25zdCBjdG9yUGFyYW1zID0gKHJlZmxlY3RDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xhenosIGNoZWNrZXIpIHx8IFtdKTtcbiAgY3RvclBhcmFtcy5mb3JFYWNoKHBhcmFtID0+IHtcbiAgICBsZXQgdG9rZW5FeHByID0gcGFyYW0udHlwZVZhbHVlRXhwcjtcbiAgICBsZXQgb3B0aW9uYWwgPSBmYWxzZSwgc2VsZiA9IGZhbHNlLCBza2lwU2VsZiA9IGZhbHNlLCBob3N0ID0gZmFsc2U7XG4gICAgbGV0IHJlc29sdmVkID0gUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLlRva2VuO1xuICAgIHBhcmFtLmRlY29yYXRvcnMuZmlsdGVyKGRlYyA9PiBkZWMuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnKS5mb3JFYWNoKGRlYyA9PiB7XG4gICAgICBpZiAoZGVjLm5hbWUgPT09ICdJbmplY3QnKSB7XG4gICAgICAgIGlmIChkZWMuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBASW5qZWN0KCkuYCk7XG4gICAgICAgIH1cbiAgICAgICAgdG9rZW5FeHByID0gZGVjLmFyZ3NbMF07XG4gICAgICB9IGVsc2UgaWYgKGRlYy5uYW1lID09PSAnT3B0aW9uYWwnKSB7XG4gICAgICAgIG9wdGlvbmFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZGVjLm5hbWUgPT09ICdTa2lwU2VsZicpIHtcbiAgICAgICAgc2tpcFNlbGYgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChkZWMubmFtZSA9PT0gJ1NlbGYnKSB7XG4gICAgICAgIHNlbGYgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChkZWMubmFtZSA9PT0gJ0hvc3QnKSB7XG4gICAgICAgIGhvc3QgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChkZWMubmFtZSA9PT0gJ0F0dHJpYnV0ZScpIHtcbiAgICAgICAgaWYgKGRlYy5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBBdHRyaWJ1dGUoKS5gKTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbkV4cHIgPSBkZWMuYXJnc1swXTtcbiAgICAgICAgcmVzb2x2ZWQgPSBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUuQXR0cmlidXRlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIGRlY29yYXRvciAke2RlYy5uYW1lfSBvbiBwYXJhbWV0ZXIuYCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHRva2VuRXhwciA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBObyBzdWl0YWJsZSB0b2tlbiBmb3IgcGFyYW1ldGVyICR7KHBhcmFtLm5hbWUgYXMgdHMuSWRlbnRpZmllcikudGV4dH0gb2YgY2xhc3MgJHtjbGF6ei5uYW1lIS50ZXh0fSB3aXRoIGRlY29yYXRvcnMgJHtwYXJhbS5kZWNvcmF0b3JzLm1hcChkZWMgPT4gZGVjLmZyb20gKyAnIycgKyBkZWMubmFtZSkuam9pbignLCcpfWApO1xuICAgIH1cbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKHRva2VuRXhwcikpIHtcbiAgICAgIGNvbnN0IGltcG9ydGVkU3ltYm9sID0gcmVmbGVjdEltcG9ydGVkSWRlbnRpZmllcih0b2tlbkV4cHIsIGNoZWNrZXIpO1xuICAgICAgaWYgKGltcG9ydGVkU3ltYm9sICE9PSBudWxsICYmIGltcG9ydGVkU3ltYm9sLmZyb20gPT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgICBzd2l0Y2ggKGltcG9ydGVkU3ltYm9sLm5hbWUpIHtcbiAgICAgICAgICBjYXNlICdFbGVtZW50UmVmJzpcbiAgICAgICAgICAgIHJlc29sdmVkID0gUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLkVsZW1lbnRSZWY7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdJbmplY3Rvcic6XG4gICAgICAgICAgICByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5JbmplY3RvcjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ1RlbXBsYXRlUmVmJzpcbiAgICAgICAgICAgIHJlc29sdmVkID0gUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLlRlbXBsYXRlUmVmO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnVmlld0NvbnRhaW5lclJlZic6XG4gICAgICAgICAgICByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5WaWV3Q29udGFpbmVyUmVmO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vIExlYXZlIGFzIGEgVG9rZW4gb3IgQXR0cmlidXRlLlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHRva2VuID0gbmV3IFdyYXBwZWROb2RlRXhwcih0b2tlbkV4cHIpO1xuICAgIHVzZVR5cGUucHVzaCh7dG9rZW4sIG9wdGlvbmFsLCBzZWxmLCBza2lwU2VsZiwgaG9zdCwgcmVzb2x2ZWR9KTtcbiAgfSk7XG4gIHJldHVybiB1c2VUeXBlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmZXJlbmNlVG9FeHByZXNzaW9uKHJlZjogUmVmZXJlbmNlLCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogRXhwcmVzc2lvbiB7XG4gIGNvbnN0IGV4cCA9IHJlZi50b0V4cHJlc3Npb24oY29udGV4dCk7XG4gIGlmIChleHAgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZWZlciB0byAke3RzLlN5bnRheEtpbmRbcmVmLm5vZGUua2luZF19YCk7XG4gIH1cbiAgcmV0dXJuIGV4cDtcbn1cbiJdfQ==