(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/utils", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/reflection"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.stripExtension = exports.stripDollarSuffix = exports.getTsHelperFnFromIdentifier = exports.getTsHelperFnFromDeclaration = exports.resolveFileWithPostfixes = exports.FactoryMap = exports.isRelativePath = exports.hasNameIdentifier = exports.findAll = exports.getNameText = exports.isDefined = exports.getOriginalSymbol = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    function getOriginalSymbol(checker) {
        return function (symbol) {
            return ts.SymbolFlags.Alias & symbol.flags ? checker.getAliasedSymbol(symbol) : symbol;
        };
    }
    exports.getOriginalSymbol = getOriginalSymbol;
    function isDefined(value) {
        return (value !== undefined) && (value !== null);
    }
    exports.isDefined = isDefined;
    function getNameText(name) {
        return ts.isIdentifier(name) || ts.isLiteralExpression(name) ? name.text : name.getText();
    }
    exports.getNameText = getNameText;
    /**
     * Parse down the AST and capture all the nodes that satisfy the test.
     * @param node The start node.
     * @param test The function that tests whether a node should be included.
     * @returns a collection of nodes that satisfy the test.
     */
    function findAll(node, test) {
        var nodes = [];
        findAllVisitor(node);
        return nodes;
        function findAllVisitor(n) {
            if (test(n)) {
                nodes.push(n);
            }
            else {
                n.forEachChild(function (child) { return findAllVisitor(child); });
            }
        }
    }
    exports.findAll = findAll;
    /**
     * Does the given declaration have a name which is an identifier?
     * @param declaration The declaration to test.
     * @returns true if the declaration has an identifier for a name.
     */
    function hasNameIdentifier(declaration) {
        var namedDeclaration = declaration;
        return namedDeclaration.name !== undefined && ts.isIdentifier(namedDeclaration.name);
    }
    exports.hasNameIdentifier = hasNameIdentifier;
    /**
     * Test whether a path is "relative".
     *
     * Relative paths start with `/`, `./` or `../` (or the Windows equivalents); or are simply `.` or
     * `..`.
     */
    function isRelativePath(path) {
        return file_system_1.isRooted(path) || /^\.\.?(\/|\\|$)/.test(path);
    }
    exports.isRelativePath = isRelativePath;
    /**
     * A `Map`-like object that can compute and memoize a missing value for any key.
     *
     * The computed values are memoized, so the factory function is not called more than once per key.
     * This is useful for storing values that are expensive to compute and may be used multiple times.
     */
    // NOTE:
    // Ideally, this class should extend `Map`, but that causes errors in ES5 transpiled code:
    // `TypeError: Constructor Map requires 'new'`
    var FactoryMap = /** @class */ (function () {
        function FactoryMap(factory, entries) {
            this.factory = factory;
            this.internalMap = new Map(entries);
        }
        FactoryMap.prototype.get = function (key) {
            if (!this.internalMap.has(key)) {
                this.internalMap.set(key, this.factory(key));
            }
            return this.internalMap.get(key);
        };
        FactoryMap.prototype.set = function (key, value) {
            this.internalMap.set(key, value);
        };
        return FactoryMap;
    }());
    exports.FactoryMap = FactoryMap;
    /**
     * Attempt to resolve a `path` to a file by appending the provided `postFixes`
     * to the `path` and checking if the file exists on disk.
     * @returns An absolute path to the first matching existing file, or `null` if none exist.
     */
    function resolveFileWithPostfixes(fs, path, postFixes) {
        var e_1, _a;
        try {
            for (var postFixes_1 = tslib_1.__values(postFixes), postFixes_1_1 = postFixes_1.next(); !postFixes_1_1.done; postFixes_1_1 = postFixes_1.next()) {
                var postFix = postFixes_1_1.value;
                var testPath = file_system_1.absoluteFrom(path + postFix);
                if (fs.exists(testPath) && fs.stat(testPath).isFile()) {
                    return testPath;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (postFixes_1_1 && !postFixes_1_1.done && (_a = postFixes_1.return)) _a.call(postFixes_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return null;
    }
    exports.resolveFileWithPostfixes = resolveFileWithPostfixes;
    /**
     * Determine whether a function declaration corresponds with a TypeScript helper function, returning
     * its kind if so or null if the declaration does not seem to correspond with such a helper.
     */
    function getTsHelperFnFromDeclaration(decl) {
        if (!ts.isFunctionDeclaration(decl) && !ts.isVariableDeclaration(decl)) {
            return null;
        }
        if (decl.name === undefined || !ts.isIdentifier(decl.name)) {
            return null;
        }
        return getTsHelperFnFromIdentifier(decl.name);
    }
    exports.getTsHelperFnFromDeclaration = getTsHelperFnFromDeclaration;
    /**
     * Determine whether an identifier corresponds with a TypeScript helper function (based on its
     * name), returning its kind if so or null if the identifier does not seem to correspond with such a
     * helper.
     */
    function getTsHelperFnFromIdentifier(id) {
        switch (stripDollarSuffix(id.text)) {
            case '__assign':
                return reflection_1.KnownDeclaration.TsHelperAssign;
            case '__spread':
                return reflection_1.KnownDeclaration.TsHelperSpread;
            case '__spreadArrays':
                return reflection_1.KnownDeclaration.TsHelperSpreadArrays;
            default:
                return null;
        }
    }
    exports.getTsHelperFnFromIdentifier = getTsHelperFnFromIdentifier;
    /**
     * An identifier may become repeated when bundling multiple source files into a single bundle, so
     * bundlers have a strategy of suffixing non-unique identifiers with a suffix like $2. This function
     * strips off such suffixes, so that ngcc deals with the canonical name of an identifier.
     * @param value The value to strip any suffix of, if applicable.
     * @returns The canonical representation of the value, without any suffix.
     */
    function stripDollarSuffix(value) {
        return value.replace(/\$\d+$/, '');
    }
    exports.stripDollarSuffix = stripDollarSuffix;
    function stripExtension(fileName) {
        return fileName.replace(/\..+$/, '');
    }
    exports.stripExtension = stripExtension;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUVqQywyRUFBK0Y7SUFDL0YseUVBQTREO0lBd0I1RCxTQUFnQixpQkFBaUIsQ0FBQyxPQUF1QjtRQUN2RCxPQUFPLFVBQVMsTUFBaUI7WUFDL0IsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUN6RixDQUFDLENBQUM7SUFDSixDQUFDO0lBSkQsOENBSUM7SUFFRCxTQUFnQixTQUFTLENBQUksS0FBdUI7UUFDbEQsT0FBTyxDQUFDLEtBQUssS0FBSyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRkQsOEJBRUM7SUFFRCxTQUFnQixXQUFXLENBQUMsSUFBb0M7UUFDOUQsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzVGLENBQUM7SUFGRCxrQ0FFQztJQUVEOzs7OztPQUtHO0lBQ0gsU0FBZ0IsT0FBTyxDQUFJLElBQWEsRUFBRSxJQUE0QztRQUNwRixJQUFNLEtBQUssR0FBUSxFQUFFLENBQUM7UUFDdEIsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JCLE9BQU8sS0FBSyxDQUFDO1FBRWIsU0FBUyxjQUFjLENBQUMs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LENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQVZELG9FQVVDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQWdCLDJCQUEyQixDQUFDLEVBQWlCO1FBQzNELFFBQVEsaUJBQWlCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2xDLEtBQUssVUFBVTtnQkFDYixPQUFPLDZCQUFnQixDQUFDLGNBQWMsQ0FBQztZQUN6QyxLQUFLLFVBQVU7Z0JBQ2IsT0FBTyw2QkFBZ0IsQ0FBQyxjQUFjLENBQUM7WUFDekMsS0FBSyxnQkFBZ0I7Z0JBQ25CLE9BQU8sNkJBQWdCLENBQUMsb0JBQW9CLENBQUM7WUFDL0M7Z0JBQ0UsT0FBTyxJQUFJLENBQUM7U0FDZjtJQUNILENBQUM7SUFYRCxrRUFXQztJQUVEOzs7Ozs7T0FNRztJQUNILFNBQWdCLGlCQUFpQixDQUFDLEtBQWE7UUFDN0MsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRkQsOENBRUM7SUFFRCxTQUFnQixjQUFjLENBQUMsUUFBZ0I7UUFDN0MsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRkQsd0NBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb20sIEFic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBpc1Jvb3RlZH0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7S25vd25EZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuXG4vKipcbiAqIEEgbGlzdCAoYEFycmF5YCkgb2YgcGFydGlhbGx5IG9yZGVyZWQgYFRgIGl0ZW1zLlxuICpcbiAqIFRoZSBpdGVtcyBpbiB0aGUgbGlzdCBhcmUgcGFydGlhbGx5IG9yZGVyZWQgaW4gdGhlIHNlbnNlIHRoYXQgYW55IGVsZW1lbnQgaGFzIGVpdGhlciB0aGUgc2FtZSBvclxuICogaGlnaGVyIHByZWNlZGVuY2UgdGhhbiBhbnkgZWxlbWVudCB3aGljaCBhcHBlYXJzIGxhdGVyIGluIHRoZSBsaXN0LiBXaGF0IFwiaGlnaGVyIHByZWNlZGVuY2VcIlxuICogbWVhbnMgYW5kIGhvdyBpdCBpcyBkZXRlcm1pbmVkIGlzIGltcGxlbWVudGF0aW9uLWRlcGVuZGVudC5cbiAqXG4gKiBTZWUgW1BhcnRpYWxseU9yZGVyZWRTZXRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1BhcnRpYWxseV9vcmRlcmVkX3NldCkgZm9yIG1vcmUgZGV0YWlscy5cbiAqIChSZWZyYWluaW5nIGZyb20gdXNpbmcgdGhlIHRlcm0gXCJzZXRcIiBoZXJlLCB0byBhdm9pZCBjb25mdXNpb24gd2l0aCBKYXZhU2NyaXB0J3NcbiAqIFtTZXRdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL1NldCkuKVxuICpcbiAqIE5PVEU6IEEgcGxhaW4gYEFycmF5PFQ+YCBpcyBub3QgYXNzaWduYWJsZSB0byBhIGBQYXJ0aWFsbHlPcmRlcmVkTGlzdDxUPmAsIGJ1dCBhXG4gKiAgICAgICBgUGFydGlhbGx5T3JkZXJlZExpc3Q8VD5gIGlzIGFzc2lnbmFibGUgdG8gYW4gYEFycmF5PFQ+YC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJ0aWFsbHlPcmRlcmVkTGlzdDxUPiBleHRlbmRzIEFycmF5PFQ+IHtcbiAgX3BhcnRpYWxseU9yZGVyZWQ6IHRydWU7XG5cbiAgbWFwPFU+KGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFBhcnRpYWxseU9yZGVyZWRMaXN0PFQ+KSA9PiBVLCB0aGlzQXJnPzogYW55KTpcbiAgICAgIFBhcnRpYWxseU9yZGVyZWRMaXN0PFU+O1xuICBzbGljZSguLi5hcmdzOiBQYXJhbWV0ZXJzPEFycmF5PFQ+WydzbGljZSddPik6IFBhcnRpYWxseU9yZGVyZWRMaXN0PFQ+O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0T3JpZ2luYWxTeW1ib2woY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiAoc3ltYm9sOiB0cy5TeW1ib2wpID0+IHRzLlN5bWJvbCB7XG4gIHJldHVybiBmdW5jdGlvbihzeW1ib2w6IHRzLlN5bWJvbCkge1xuICAgIHJldHVybiB0cy5TeW1ib2xGbGFncy5BbGlhcyAmIHN5bWJvbC5mbGFncyA/IGNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChzeW1ib2wpIDogc3ltYm9sO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNEZWZpbmVkPFQ+KHZhbHVlOiBUfHVuZGVmaW5lZHxudWxsKTogdmFsdWUgaXMgVCB7XG4gIHJldHVybiAodmFsdWUgIT09IHVuZGVmaW5lZCkgJiYgKHZhbHVlICE9PSBudWxsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE5hbWVUZXh0KG5hbWU6IHRzLlByb3BlcnR5TmFtZXx0cy5CaW5kaW5nTmFtZSk6IHN0cmluZyB7XG4gIHJldHVybiB0cy5pc0lkZW50aWZpZXIobmFtZSkgfHwgdHMuaXNMaXRlcmFsRXhwcmVzc2lvbihuYW1lKSA/IG5hbWUudGV4dCA6IG5hbWUuZ2V0VGV4dCgpO1xufVxuXG4vKipcbiAqIFBhcnNlIGRvd24gdGhlIEFTVCBhbmQgY2FwdHVyZSBhbGwgdGhlIG5vZGVzIHRoYXQgc2F0aXNmeSB0aGUgdGVzdC5cbiAqIEBwYXJhbSBub2RlIFRoZSBzdGFydCBub2RlLlxuICogQHBhcmFtIHRlc3QgVGhlIGZ1bmN0aW9uIHRoYXQgdGVzdHMgd2hldGhlciBhIG5vZGUgc2hvdWxkIGJlIGluY2x1ZGVkLlxuICogQHJldHVybnMgYSBjb2xsZWN0aW9uIG9mIG5vZGVzIHRoYXQgc2F0aXNmeSB0aGUgdGVzdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGw8VD4obm9kZTogdHMuTm9kZSwgdGVzdDogKG5vZGU6IHRzLk5vZGUpID0+IG5vZGUgaXMgdHMuTm9kZSAmIFQpOiBUW10ge1xuICBjb25zdCBub2RlczogVFtdID0gW107XG4gIGZpbmRBbGxWaXNpdG9yKG5vZGUpO1xuICByZXR1cm4gbm9kZXM7XG5cbiAgZnVuY3Rpb24gZmluZEFsbFZpc2l0b3IobjogdHMuTm9kZSkge1xuICAgIGlmICh0ZXN0KG4pKSB7XG4gICAgICBub2Rlcy5wdXNoKG4pO1xuICAgIH0gZWxzZSB7XG4gICAgICBuLmZvckVhY2hDaGlsZChjaGlsZCA9PiBmaW5kQWxsVmlzaXRvcihjaGlsZCkpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIERvZXMgdGhlIGdpdmVuIGRlY2xhcmF0aW9uIGhhdmUgYSBuYW1lIHdoaWNoIGlzIGFuIGlkZW50aWZpZXI/XG4gKiBAcGFyYW0gZGVjbGFyYXRpb24gVGhlIGRlY2xhcmF0aW9uIHRvIHRlc3QuXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBkZWNsYXJhdGlvbiBoYXMgYW4gaWRlbnRpZmllciBmb3IgYSBuYW1lLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzTmFtZUlkZW50aWZpZXIoZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogZGVjbGFyYXRpb24gaXMgdHMuRGVjbGFyYXRpb24mXG4gICAge25hbWU6IHRzLklkZW50aWZpZXJ9IHtcbiAgY29uc3QgbmFtZWREZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24me25hbWU/OiB0cy5Ob2RlfSA9IGRlY2xhcmF0aW9uO1xuICByZXR1cm4gbmFtZWREZWNsYXJhdGlvbi5uYW1lICE9PSB1bmRlZmluZWQgJiYgdHMuaXNJZGVudGlmaWVyKG5hbWVkRGVjbGFyYXRpb24ubmFtZSk7XG59XG5cbi8qKlxuICogVGVzdCB3aGV0aGVyIGEgcGF0aCBpcyBcInJlbGF0aXZlXCIuXG4gKlxuICogUmVsYXRpdmUgcGF0aHMgc3RhcnQgd2l0aCBgL2AsIGAuL2Agb3IgYC4uL2AgKG9yIHRoZSBXaW5kb3dzIGVxdWl2YWxlbnRzKTsgb3IgYXJlIHNpbXBseSBgLmAgb3JcbiAqIGAuLmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1JlbGF0aXZlUGF0aChwYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGlzUm9vdGVkKHBhdGgpIHx8IC9eXFwuXFwuPyhcXC98XFxcXHwkKS8udGVzdChwYXRoKTtcbn1cblxuLyoqXG4gKiBBIGBNYXBgLWxpa2Ugb2JqZWN0IHRoYXQgY2FuIGNvbXB1dGUgYW5kIG1lbW9pemUgYSBtaXNzaW5nIHZhbHVlIGZvciBhbnkga2V5LlxuICpcbiAqIFRoZSBjb21wdXRlZCB2YWx1ZXMgYXJlIG1lbW9pemVkLCBzbyB0aGUgZmFjdG9yeSBmdW5jdGlvbiBpcyBub3QgY2FsbGVkIG1vcmUgdGhhbiBvbmNlIHBlciBrZXkuXG4gKiBUaGlzIGlzIHVzZWZ1bCBmb3Igc3RvcmluZyB2YWx1ZXMgdGhhdCBhcmUgZXhwZW5zaXZlIHRvIGNvbXB1dGUgYW5kIG1heSBiZSB1c2VkIG11bHRpcGxlIHRpbWVzLlxuICovXG4vLyBOT1RFOlxuLy8gSWRlYWxseSwgdGhpcyBjbGFzcyBzaG91bGQgZXh0ZW5kIGBNYXBgLCBidXQgdGhhdCBjYXVzZXMgZXJyb3JzIGluIEVTNSB0cmFuc3BpbGVkIGNvZGU6XG4vLyBgVHlwZUVycm9yOiBDb25zdHJ1Y3RvciBNYXAgcmVxdWlyZXMgJ25ldydgXG5leHBvcnQgY2xhc3MgRmFjdG9yeU1hcDxLLCBWPiB7XG4gIHByaXZhdGUgaW50ZXJuYWxNYXA6IE1hcDxLLCBWPjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZhY3Rvcnk6IChrZXk6IEspID0+IFYsIGVudHJpZXM/OiByZWFkb25seShyZWFkb25seVtLLCBWXSlbXXxudWxsKSB7XG4gICAgdGhpcy5pbnRlcm5hbE1hcCA9IG5ldyBNYXAoZW50cmllcyk7XG4gIH1cblxuICBnZXQoa2V5OiBLKTogViB7XG4gICAgaWYgKCF0aGlzLmludGVybmFsTWFwLmhhcyhrZXkpKSB7XG4gICAgICB0aGlzLmludGVybmFsTWFwLnNldChrZXksIHRoaXMuZmFjdG9yeShrZXkpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5pbnRlcm5hbE1hcC5nZXQoa2V5KSE7XG4gIH1cblxuICBzZXQoa2V5OiBLLCB2YWx1ZTogVik6IHZvaWQge1xuICAgIHRoaXMuaW50ZXJuYWxNYXAuc2V0KGtleSwgdmFsdWUpO1xuICB9XG59XG5cbi8qKlxuICogQXR0ZW1wdCB0byByZXNvbHZlIGEgYHBhdGhgIHRvIGEgZmlsZSBieSBhcHBlbmRpbmcgdGhlIHByb3ZpZGVkIGBwb3N0Rml4ZXNgXG4gKiB0byB0aGUgYHBhdGhgIGFuZCBjaGVja2luZyBpZiB0aGUgZmlsZSBleGlzdHMgb24gZGlzay5cbiAqIEByZXR1cm5zIEFuIGFic29sdXRlIHBhdGggdG8gdGhlIGZpcnN0IG1hdGNoaW5nIGV4aXN0aW5nIGZpbGUsIG9yIGBudWxsYCBpZiBub25lIGV4aXN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUZpbGVXaXRoUG9zdGZpeGVzKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcG9zdEZpeGVzOiBzdHJpbmdbXSk6IEFic29sdXRlRnNQYXRofG51bGwge1xuICBmb3IgKGNvbnN0IHBvc3RGaXggb2YgcG9zdEZpeGVzKSB7XG4gICAgY29uc3QgdGVzdFBhdGggPSBhYnNvbHV0ZUZyb20ocGF0aCArIHBvc3RGaXgpO1xuICAgIGlmIChmcy5leGlzdHModGVzdFBhdGgpICYmIGZzLnN0YXQodGVzdFBhdGgpLmlzRmlsZSgpKSB7XG4gICAgICByZXR1cm4gdGVzdFBhdGg7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIERldGVybWluZSB3aGV0aGVyIGEgZnVuY3Rpb24gZGVjbGFyYXRpb24gY29ycmVzcG9uZHMgd2l0aCBhIFR5cGVTY3JpcHQgaGVscGVyIGZ1bmN0aW9uLCByZXR1cm5pbmdcbiAqIGl0cyBraW5kIGlmIHNvIG9yIG51bGwgaWYgdGhlIGRlY2xhcmF0aW9uIGRvZXMgbm90IHNlZW0gdG8gY29ycmVzcG9uZCB3aXRoIHN1Y2ggYSBoZWxwZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUc0hlbHBlckZuRnJvbURlY2xhcmF0aW9uKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogS25vd25EZWNsYXJhdGlvbnxudWxsIHtcbiAgaWYgKCF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oZGVjbCkgJiYgIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgaWYgKGRlY2wubmFtZSA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIGdldFRzSGVscGVyRm5Gcm9tSWRlbnRpZmllcihkZWNsLm5hbWUpO1xufVxuXG4vKipcbiAqIERldGVybWluZSB3aGV0aGVyIGFuIGlkZW50aWZpZXIgY29ycmVzcG9uZHMgd2l0aCBhIFR5cGVTY3JpcHQgaGVscGVyIGZ1bmN0aW9uIChiYXNlZCBvbiBpdHNcbiAqIG5hbWUpLCByZXR1cm5pbmcgaXRzIGtpbmQgaWYgc28gb3IgbnVsbCBpZiB0aGUgaWRlbnRpZmllciBkb2VzIG5vdCBzZWVtIHRvIGNvcnJlc3BvbmQgd2l0aCBzdWNoIGFcbiAqIGhlbHBlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRzSGVscGVyRm5Gcm9tSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IEtub3duRGVjbGFyYXRpb258bnVsbCB7XG4gIHN3aXRjaCAoc3RyaXBEb2xsYXJTdWZmaXgoaWQudGV4dCkpIHtcbiAgICBjYXNlICdfX2Fzc2lnbic6XG4gICAgICByZXR1cm4gS25vd25EZWNsYXJhdGlvbi5Uc0hlbHBlckFzc2lnbjtcbiAgICBjYXNlICdfX3NwcmVhZCc6XG4gICAgICByZXR1cm4gS25vd25EZWNsYXJhdGlvbi5Uc0hlbHBlclNwcmVhZDtcbiAgICBjYXNlICdfX3NwcmVhZEFycmF5cyc6XG4gICAgICByZXR1cm4gS25vd25EZWNsYXJhdGlvbi5Uc0hlbHBlclNwcmVhZEFycmF5cztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBpZGVudGlmaWVyIG1heSBiZWNvbWUgcmVwZWF0ZWQgd2hlbiBidW5kbGluZyBtdWx0aXBsZSBzb3VyY2UgZmlsZXMgaW50byBhIHNpbmdsZSBidW5kbGUsIHNvXG4gKiBidW5kbGVycyBoYXZlIGEgc3RyYXRlZ3kgb2Ygc3VmZml4aW5nIG5vbi11bmlxdWUgaWRlbnRpZmllcnMgd2l0aCBhIHN1ZmZpeCBsaWtlICQyLiBUaGlzIGZ1bmN0aW9uXG4gKiBzdHJpcHMgb2ZmIHN1Y2ggc3VmZml4ZXMsIHNvIHRoYXQgbmdjYyBkZWFscyB3aXRoIHRoZSBjYW5vbmljYWwgbmFtZSBvZiBhbiBpZGVudGlmaWVyLlxuICogQHBhcmFtIHZhbHVlIFRoZSB2YWx1ZSB0byBzdHJpcCBhbnkgc3VmZml4IG9mLCBpZiBhcHBsaWNhYmxlLlxuICogQHJldHVybnMgVGhlIGNhbm9uaWNhbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgdmFsdWUsIHdpdGhvdXQgYW55IHN1ZmZpeC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwRG9sbGFyU3VmZml4KHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWUucmVwbGFjZSgvXFwkXFxkKyQvLCAnJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcEV4dGVuc2lvbihmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGZpbGVOYW1lLnJlcGxhY2UoL1xcLi4rJC8sICcnKTtcbn1cbiJdfQ==