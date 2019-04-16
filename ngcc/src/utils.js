(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/utils", ["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
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
        return ts.isIdentifier(declaration.name);
    }
    exports.hasNameIdentifier = hasNameIdentifier;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFFakMsU0FBZ0IsaUJBQWlCLENBQUMsT0FBdUI7UUFDdkQsT0FBTyxVQUFTLE1BQWlCO1lBQy9CLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDekYsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUpELDhDQUlDO0lBRUQsU0FBZ0IsU0FBUyxDQUFJLEtBQTJCO1FBQ3RELE9BQU8sQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUZELDhCQUVDO0lBRUQsU0FBZ0IsV0FBVyxDQUFDLElBQXNDO1FBQ2hFLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM1RixDQUFDO0lBRkQsa0NBRUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLE9BQU8sQ0FBSSxJQUFhLEVBQUUsSUFBNEM7UUFDcEYsSUFBTSxLQUFLLEdBQVEsRUFBRSxDQUFDO1FBQ3RCLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQixPQUFPLEtBQUssQ0FBQztRQUViLFNBQVMsY0FBYyxDQUFDLENBQVU7WUFDaEMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ1gsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNmO2lCQUFNO2dCQUNMLENBQUMsQ0FBQyxZQUFZLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQXJCLENBQXFCLENBQUMsQ0FBQzthQUNoRDtRQUNILENBQUM7SUFDSCxDQUFDO0lBWkQsMEJBWUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsV0FBMkI7UUFFM0QsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFFLFdBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUhELDhDQUdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRPcmlnaW5hbFN5bWJvbChjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6IChzeW1ib2w6IHRzLlN5bWJvbCkgPT4gdHMuU3ltYm9sIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHN5bWJvbDogdHMuU3ltYm9sKSB7XG4gICAgcmV0dXJuIHRzLlN5bWJvbEZsYWdzLkFsaWFzICYgc3ltYm9sLmZsYWdzID8gY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKHN5bWJvbCkgOiBzeW1ib2w7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0RlZmluZWQ8VD4odmFsdWU6IFQgfCB1bmRlZmluZWQgfCBudWxsKTogdmFsdWUgaXMgVCB7XG4gIHJldHVybiAodmFsdWUgIT09IHVuZGVmaW5lZCkgJiYgKHZhbHVlICE9PSBudWxsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE5hbWVUZXh0KG5hbWU6IHRzLlByb3BlcnR5TmFtZSB8IHRzLkJpbmRpbmdOYW1lKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRzLmlzSWRlbnRpZmllcihuYW1lKSB8fCB0cy5pc0xpdGVyYWxFeHByZXNzaW9uKG5hbWUpID8gbmFtZS50ZXh0IDogbmFtZS5nZXRUZXh0KCk7XG59XG5cbi8qKlxuICogUGFyc2UgZG93biB0aGUgQVNUIGFuZCBjYXB0dXJlIGFsbCB0aGUgbm9kZXMgdGhhdCBzYXRpc2Z5IHRoZSB0ZXN0LlxuICogQHBhcmFtIG5vZGUgVGhlIHN0YXJ0IG5vZGUuXG4gKiBAcGFyYW0gdGVzdCBUaGUgZnVuY3Rpb24gdGhhdCB0ZXN0cyB3aGV0aGVyIGEgbm9kZSBzaG91bGQgYmUgaW5jbHVkZWQuXG4gKiBAcmV0dXJucyBhIGNvbGxlY3Rpb24gb2Ygbm9kZXMgdGhhdCBzYXRpc2Z5IHRoZSB0ZXN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZEFsbDxUPihub2RlOiB0cy5Ob2RlLCB0ZXN0OiAobm9kZTogdHMuTm9kZSkgPT4gbm9kZSBpcyB0cy5Ob2RlICYgVCk6IFRbXSB7XG4gIGNvbnN0IG5vZGVzOiBUW10gPSBbXTtcbiAgZmluZEFsbFZpc2l0b3Iobm9kZSk7XG4gIHJldHVybiBub2RlcztcblxuICBmdW5jdGlvbiBmaW5kQWxsVmlzaXRvcihuOiB0cy5Ob2RlKSB7XG4gICAgaWYgKHRlc3QobikpIHtcbiAgICAgIG5vZGVzLnB1c2gobik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG4uZm9yRWFjaENoaWxkKGNoaWxkID0+IGZpbmRBbGxWaXNpdG9yKGNoaWxkKSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRG9lcyB0aGUgZ2l2ZW4gZGVjbGFyYXRpb24gaGF2ZSBhIG5hbWUgd2hpY2ggaXMgYW4gaWRlbnRpZmllcj9cbiAqIEBwYXJhbSBkZWNsYXJhdGlvbiBUaGUgZGVjbGFyYXRpb24gdG8gdGVzdC5cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGRlY2xhcmF0aW9uIGhhcyBhbiBpZGVudGlmaWVyIGZvciBhIG5hbWUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNOYW1lSWRlbnRpZmllcihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBkZWNsYXJhdGlvbiBpcyB0cy5EZWNsYXJhdGlvbiZcbiAgICB7bmFtZTogdHMuSWRlbnRpZmllcn0ge1xuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKChkZWNsYXJhdGlvbiBhcyBhbnkpLm5hbWUpO1xufVxuIl19