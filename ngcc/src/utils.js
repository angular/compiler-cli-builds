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
        FactoryMap.prototype.set = function (key, value) { this.internalMap.set(key, value); };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLDJFQUErRjtJQUMvRix5RUFBNEQ7SUF5QjVELFNBQWdCLGlCQUFpQixDQUFDLE9BQXVCO1FBQ3ZELE9BQU8sVUFBUyxNQUFpQjtZQUMvQixPQUFPLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ3pGLENBQUMsQ0FBQztJQUNKLENBQUM7SUFKRCw4Q0FJQztJQUVELFNBQWdCLFNBQVMsQ0FBSSxLQUEyQjtRQUN0RCxPQUFPLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFGRCw4QkFFQztJQUVELFNBQWdCLFdBQVcsQ0FBQyxJQUFzQztRQUNoRSxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDNUYsQ0FBQztJQUZELGtDQUVDO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFnQixPQUFPLENBQUksSUFBYSxFQUFFLElBQTRDO1FBQ3BGLElBQU0sS0FBSyxHQUFRLEVBQUUsQ0FBQztRQUN0QixjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckIsT0FBTyxLQUFLLENBQUM7UUFFYixTQUFTLGNBQWMsQ0FBQyxD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QUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFWRCxvRUFVQztJQUVEOzs7O09BSUc7SUFDSCxTQUFnQiwyQkFBMkIsQ0FBQyxFQUFpQjtRQUMzRCxRQUFRLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNsQyxLQUFLLFVBQVU7Z0JBQ2IsT0FBTyw2QkFBZ0IsQ0FBQyxjQUFjLENBQUM7WUFDekMsS0FBSyxVQUFVO2dCQUNiLE9BQU8sNkJBQWdCLENBQUMsY0FBYyxDQUFDO1lBQ3pDLEtBQUssZ0JBQWdCO2dCQUNuQixPQUFPLDZCQUFnQixDQUFDLG9CQUFvQixDQUFDO1lBQy9DO2dCQUNFLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7SUFDSCxDQUFDO0lBWEQsa0VBV0M7SUFFRDs7Ozs7O09BTUc7SUFDSCxTQUFnQixpQkFBaUIsQ0FBQyxLQUFhO1FBQzdDLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUZELDhDQUVDO0lBRUQsU0FBZ0IsY0FBYyxDQUFDLFFBQWdCO1FBQzdDLE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUZELHdDQUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGFic29sdXRlRnJvbSwgaXNSb290ZWR9IGZyb20gJy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0tub3duRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcblxuXG4vKipcbiAqIEEgbGlzdCAoYEFycmF5YCkgb2YgcGFydGlhbGx5IG9yZGVyZWQgYFRgIGl0ZW1zLlxuICpcbiAqIFRoZSBpdGVtcyBpbiB0aGUgbGlzdCBhcmUgcGFydGlhbGx5IG9yZGVyZWQgaW4gdGhlIHNlbnNlIHRoYXQgYW55IGVsZW1lbnQgaGFzIGVpdGhlciB0aGUgc2FtZSBvclxuICogaGlnaGVyIHByZWNlZGVuY2UgdGhhbiBhbnkgZWxlbWVudCB3aGljaCBhcHBlYXJzIGxhdGVyIGluIHRoZSBsaXN0LiBXaGF0IFwiaGlnaGVyIHByZWNlZGVuY2VcIlxuICogbWVhbnMgYW5kIGhvdyBpdCBpcyBkZXRlcm1pbmVkIGlzIGltcGxlbWVudGF0aW9uLWRlcGVuZGVudC5cbiAqXG4gKiBTZWUgW1BhcnRpYWxseU9yZGVyZWRTZXRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1BhcnRpYWxseV9vcmRlcmVkX3NldCkgZm9yIG1vcmUgZGV0YWlscy5cbiAqIChSZWZyYWluaW5nIGZyb20gdXNpbmcgdGhlIHRlcm0gXCJzZXRcIiBoZXJlLCB0byBhdm9pZCBjb25mdXNpb24gd2l0aCBKYXZhU2NyaXB0J3NcbiAqIFtTZXRdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL1NldCkuKVxuICpcbiAqIE5PVEU6IEEgcGxhaW4gYEFycmF5PFQ+YCBpcyBub3QgYXNzaWduYWJsZSB0byBhIGBQYXJ0aWFsbHlPcmRlcmVkTGlzdDxUPmAsIGJ1dCBhXG4gKiAgICAgICBgUGFydGlhbGx5T3JkZXJlZExpc3Q8VD5gIGlzIGFzc2lnbmFibGUgdG8gYW4gYEFycmF5PFQ+YC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJ0aWFsbHlPcmRlcmVkTGlzdDxUPiBleHRlbmRzIEFycmF5PFQ+IHtcbiAgX3BhcnRpYWxseU9yZGVyZWQ6IHRydWU7XG5cbiAgbWFwPFU+KGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFBhcnRpYWxseU9yZGVyZWRMaXN0PFQ+KSA9PiBVLCB0aGlzQXJnPzogYW55KTpcbiAgICAgIFBhcnRpYWxseU9yZGVyZWRMaXN0PFU+O1xuICBzbGljZSguLi5hcmdzOiBQYXJhbWV0ZXJzPEFycmF5PFQ+WydzbGljZSddPik6IFBhcnRpYWxseU9yZGVyZWRMaXN0PFQ+O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0T3JpZ2luYWxTeW1ib2woY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiAoc3ltYm9sOiB0cy5TeW1ib2wpID0+IHRzLlN5bWJvbCB7XG4gIHJldHVybiBmdW5jdGlvbihzeW1ib2w6IHRzLlN5bWJvbCkge1xuICAgIHJldHVybiB0cy5TeW1ib2xGbGFncy5BbGlhcyAmIHN5bWJvbC5mbGFncyA/IGNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChzeW1ib2wpIDogc3ltYm9sO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNEZWZpbmVkPFQ+KHZhbHVlOiBUIHwgdW5kZWZpbmVkIHwgbnVsbCk6IHZhbHVlIGlzIFQge1xuICByZXR1cm4gKHZhbHVlICE9PSB1bmRlZmluZWQpICYmICh2YWx1ZSAhPT0gbnVsbCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXROYW1lVGV4dChuYW1lOiB0cy5Qcm9wZXJ0eU5hbWUgfCB0cy5CaW5kaW5nTmFtZSk6IHN0cmluZyB7XG4gIHJldHVybiB0cy5pc0lkZW50aWZpZXIobmFtZSkgfHwgdHMuaXNMaXRlcmFsRXhwcmVzc2lvbihuYW1lKSA/IG5hbWUudGV4dCA6IG5hbWUuZ2V0VGV4dCgpO1xufVxuXG4vKipcbiAqIFBhcnNlIGRvd24gdGhlIEFTVCBhbmQgY2FwdHVyZSBhbGwgdGhlIG5vZGVzIHRoYXQgc2F0aXNmeSB0aGUgdGVzdC5cbiAqIEBwYXJhbSBub2RlIFRoZSBzdGFydCBub2RlLlxuICogQHBhcmFtIHRlc3QgVGhlIGZ1bmN0aW9uIHRoYXQgdGVzdHMgd2hldGhlciBhIG5vZGUgc2hvdWxkIGJlIGluY2x1ZGVkLlxuICogQHJldHVybnMgYSBjb2xsZWN0aW9uIG9mIG5vZGVzIHRoYXQgc2F0aXNmeSB0aGUgdGVzdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGw8VD4obm9kZTogdHMuTm9kZSwgdGVzdDogKG5vZGU6IHRzLk5vZGUpID0+IG5vZGUgaXMgdHMuTm9kZSAmIFQpOiBUW10ge1xuICBjb25zdCBub2RlczogVFtdID0gW107XG4gIGZpbmRBbGxWaXNpdG9yKG5vZGUpO1xuICByZXR1cm4gbm9kZXM7XG5cbiAgZnVuY3Rpb24gZmluZEFsbFZpc2l0b3IobjogdHMuTm9kZSkge1xuICAgIGlmICh0ZXN0KG4pKSB7XG4gICAgICBub2Rlcy5wdXNoKG4pO1xuICAgIH0gZWxzZSB7XG4gICAgICBuLmZvckVhY2hDaGlsZChjaGlsZCA9PiBmaW5kQWxsVmlzaXRvcihjaGlsZCkpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIERvZXMgdGhlIGdpdmVuIGRlY2xhcmF0aW9uIGhhdmUgYSBuYW1lIHdoaWNoIGlzIGFuIGlkZW50aWZpZXI/XG4gKiBAcGFyYW0gZGVjbGFyYXRpb24gVGhlIGRlY2xhcmF0aW9uIHRvIHRlc3QuXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBkZWNsYXJhdGlvbiBoYXMgYW4gaWRlbnRpZmllciBmb3IgYSBuYW1lLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzTmFtZUlkZW50aWZpZXIoZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogZGVjbGFyYXRpb24gaXMgdHMuRGVjbGFyYXRpb24mXG4gICAge25hbWU6IHRzLklkZW50aWZpZXJ9IHtcbiAgY29uc3QgbmFtZWREZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24me25hbWU/OiB0cy5Ob2RlfSA9IGRlY2xhcmF0aW9uO1xuICByZXR1cm4gbmFtZWREZWNsYXJhdGlvbi5uYW1lICE9PSB1bmRlZmluZWQgJiYgdHMuaXNJZGVudGlmaWVyKG5hbWVkRGVjbGFyYXRpb24ubmFtZSk7XG59XG5cbmV4cG9ydCB0eXBlIFBhdGhNYXBwaW5ncyA9IHtcbiAgYmFzZVVybDogc3RyaW5nLFxuICBwYXRoczoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfVxufTtcblxuLyoqXG4gKiBUZXN0IHdoZXRoZXIgYSBwYXRoIGlzIFwicmVsYXRpdmVcIi5cbiAqXG4gKiBSZWxhdGl2ZSBwYXRocyBzdGFydCB3aXRoIGAvYCwgYC4vYCBvciBgLi4vYCAob3IgdGhlIFdpbmRvd3MgZXF1aXZhbGVudHMpOyBvciBhcmUgc2ltcGx5IGAuYCBvclxuICogYC4uYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVsYXRpdmVQYXRoKHBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gaXNSb290ZWQocGF0aCkgfHwgL15cXC5cXC4/KFxcL3xcXFxcfCQpLy50ZXN0KHBhdGgpO1xufVxuXG4vKipcbiAqIEEgYE1hcGAtbGlrZSBvYmplY3QgdGhhdCBjYW4gY29tcHV0ZSBhbmQgbWVtb2l6ZSBhIG1pc3NpbmcgdmFsdWUgZm9yIGFueSBrZXkuXG4gKlxuICogVGhlIGNvbXB1dGVkIHZhbHVlcyBhcmUgbWVtb2l6ZWQsIHNvIHRoZSBmYWN0b3J5IGZ1bmN0aW9uIGlzIG5vdCBjYWxsZWQgbW9yZSB0aGFuIG9uY2UgcGVyIGtleS5cbiAqIFRoaXMgaXMgdXNlZnVsIGZvciBzdG9yaW5nIHZhbHVlcyB0aGF0IGFyZSBleHBlbnNpdmUgdG8gY29tcHV0ZSBhbmQgbWF5IGJlIHVzZWQgbXVsdGlwbGUgdGltZXMuXG4gKi9cbi8vIE5PVEU6XG4vLyBJZGVhbGx5LCB0aGlzIGNsYXNzIHNob3VsZCBleHRlbmQgYE1hcGAsIGJ1dCB0aGF0IGNhdXNlcyBlcnJvcnMgaW4gRVM1IHRyYW5zcGlsZWQgY29kZTpcbi8vIGBUeXBlRXJyb3I6IENvbnN0cnVjdG9yIE1hcCByZXF1aXJlcyAnbmV3J2BcbmV4cG9ydCBjbGFzcyBGYWN0b3J5TWFwPEssIFY+IHtcbiAgcHJpdmF0ZSBpbnRlcm5hbE1hcDogTWFwPEssIFY+O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZmFjdG9yeTogKGtleTogSykgPT4gViwgZW50cmllcz86IHJlYWRvbmx5KHJlYWRvbmx5W0ssIFZdKVtdfG51bGwpIHtcbiAgICB0aGlzLmludGVybmFsTWFwID0gbmV3IE1hcChlbnRyaWVzKTtcbiAgfVxuXG4gIGdldChrZXk6IEspOiBWIHtcbiAgICBpZiAoIXRoaXMuaW50ZXJuYWxNYXAuaGFzKGtleSkpIHtcbiAgICAgIHRoaXMuaW50ZXJuYWxNYXAuc2V0KGtleSwgdGhpcy5mYWN0b3J5KGtleSkpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmludGVybmFsTWFwLmdldChrZXkpICE7XG4gIH1cblxuICBzZXQoa2V5OiBLLCB2YWx1ZTogVik6IHZvaWQgeyB0aGlzLmludGVybmFsTWFwLnNldChrZXksIHZhbHVlKTsgfVxufVxuXG4vKipcbiAqIEF0dGVtcHQgdG8gcmVzb2x2ZSBhIGBwYXRoYCB0byBhIGZpbGUgYnkgYXBwZW5kaW5nIHRoZSBwcm92aWRlZCBgcG9zdEZpeGVzYFxuICogdG8gdGhlIGBwYXRoYCBhbmQgY2hlY2tpbmcgaWYgdGhlIGZpbGUgZXhpc3RzIG9uIGRpc2suXG4gKiBAcmV0dXJucyBBbiBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBmaXJzdCBtYXRjaGluZyBleGlzdGluZyBmaWxlLCBvciBgbnVsbGAgaWYgbm9uZSBleGlzdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVGaWxlV2l0aFBvc3RmaXhlcyhcbiAgICBmczogRmlsZVN5c3RlbSwgcGF0aDogQWJzb2x1dGVGc1BhdGgsIHBvc3RGaXhlczogc3RyaW5nW10pOiBBYnNvbHV0ZUZzUGF0aHxudWxsIHtcbiAgZm9yIChjb25zdCBwb3N0Rml4IG9mIHBvc3RGaXhlcykge1xuICAgIGNvbnN0IHRlc3RQYXRoID0gYWJzb2x1dGVGcm9tKHBhdGggKyBwb3N0Rml4KTtcbiAgICBpZiAoZnMuZXhpc3RzKHRlc3RQYXRoKSAmJiBmcy5zdGF0KHRlc3RQYXRoKS5pc0ZpbGUoKSkge1xuICAgICAgcmV0dXJuIHRlc3RQYXRoO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgd2hldGhlciBhIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIGNvcnJlc3BvbmRzIHdpdGggYSBUeXBlU2NyaXB0IGhlbHBlciBmdW5jdGlvbiwgcmV0dXJuaW5nXG4gKiBpdHMga2luZCBpZiBzbyBvciBudWxsIGlmIHRoZSBkZWNsYXJhdGlvbiBkb2VzIG5vdCBzZWVtIHRvIGNvcnJlc3BvbmQgd2l0aCBzdWNoIGEgaGVscGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHNIZWxwZXJGbkZyb21EZWNsYXJhdGlvbihkZWNsOiB0cy5EZWNsYXJhdGlvbik6IEtub3duRGVjbGFyYXRpb258bnVsbCB7XG4gIGlmICghdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKGRlY2wpICYmICF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlmIChkZWNsLm5hbWUgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiBnZXRUc0hlbHBlckZuRnJvbUlkZW50aWZpZXIoZGVjbC5uYW1lKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgd2hldGhlciBhbiBpZGVudGlmaWVyIGNvcnJlc3BvbmRzIHdpdGggYSBUeXBlU2NyaXB0IGhlbHBlciBmdW5jdGlvbiAoYmFzZWQgb24gaXRzXG4gKiBuYW1lKSwgcmV0dXJuaW5nIGl0cyBraW5kIGlmIHNvIG9yIG51bGwgaWYgdGhlIGlkZW50aWZpZXIgZG9lcyBub3Qgc2VlbSB0byBjb3JyZXNwb25kIHdpdGggc3VjaCBhXG4gKiBoZWxwZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUc0hlbHBlckZuRnJvbUlkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBLbm93bkRlY2xhcmF0aW9ufG51bGwge1xuICBzd2l0Y2ggKHN0cmlwRG9sbGFyU3VmZml4KGlkLnRleHQpKSB7XG4gICAgY2FzZSAnX19hc3NpZ24nOlxuICAgICAgcmV0dXJuIEtub3duRGVjbGFyYXRpb24uVHNIZWxwZXJBc3NpZ247XG4gICAgY2FzZSAnX19zcHJlYWQnOlxuICAgICAgcmV0dXJuIEtub3duRGVjbGFyYXRpb24uVHNIZWxwZXJTcHJlYWQ7XG4gICAgY2FzZSAnX19zcHJlYWRBcnJheXMnOlxuICAgICAgcmV0dXJuIEtub3duRGVjbGFyYXRpb24uVHNIZWxwZXJTcHJlYWRBcnJheXM7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQW4gaWRlbnRpZmllciBtYXkgYmVjb21lIHJlcGVhdGVkIHdoZW4gYnVuZGxpbmcgbXVsdGlwbGUgc291cmNlIGZpbGVzIGludG8gYSBzaW5nbGUgYnVuZGxlLCBzb1xuICogYnVuZGxlcnMgaGF2ZSBhIHN0cmF0ZWd5IG9mIHN1ZmZpeGluZyBub24tdW5pcXVlIGlkZW50aWZpZXJzIHdpdGggYSBzdWZmaXggbGlrZSAkMi4gVGhpcyBmdW5jdGlvblxuICogc3RyaXBzIG9mZiBzdWNoIHN1ZmZpeGVzLCBzbyB0aGF0IG5nY2MgZGVhbHMgd2l0aCB0aGUgY2Fub25pY2FsIG5hbWUgb2YgYW4gaWRlbnRpZmllci5cbiAqIEBwYXJhbSB2YWx1ZSBUaGUgdmFsdWUgdG8gc3RyaXAgYW55IHN1ZmZpeCBvZiwgaWYgYXBwbGljYWJsZS5cbiAqIEByZXR1cm5zIFRoZSBjYW5vbmljYWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIHZhbHVlLCB3aXRob3V0IGFueSBzdWZmaXguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcERvbGxhclN1ZmZpeCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoL1xcJFxcZCskLywgJycpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBFeHRlbnNpb24oZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBmaWxlTmFtZS5yZXBsYWNlKC9cXC4uKyQvLCAnJyk7XG59XG4iXX0=