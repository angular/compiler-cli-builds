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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/metadata", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.extractClassMetadata = void 0;
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Given a class declaration, generate a call to `setClassMetadata` with the Angular metadata
     * present on the class or its member fields. An ngDevMode guard is used to allow the call to be
     * tree-shaken away, as the `setClassMetadata` invocation is only needed for testing purposes.
     *
     * If no such metadata is present, this function returns `null`. Otherwise, the call is returned
     * as a `Statement` for inclusion along with the class.
     */
    function extractClassMetadata(clazz, reflection, defaultImportRecorder, isCore, annotateForClosureCompiler) {
        if (!reflection.isClass(clazz)) {
            return null;
        }
        var id = reflection.getAdjacentNameOfClass(clazz);
        // Reflect over the class decorators. If none are present, or those that are aren't from
        // Angular, then return null. Otherwise, turn them into metadata.
        var classDecorators = reflection.getDecoratorsOfDeclaration(clazz);
        if (classDecorators === null) {
            return null;
        }
        var ngClassDecorators = classDecorators.filter(function (dec) { return isAngularDecorator(dec, isCore); })
            .map(function (decorator) { return decoratorToMetadata(decorator, annotateForClosureCompiler); })
            // Since the `setClassMetadata` call is intended to be emitted after the class
            // declaration, we have to strip references to the existing identifiers or
            // TypeScript might generate invalid code when it emits to JS. In particular
            // this can break when emitting a class to ES5 which has a custom decorator
            // and is referenced inside of its own metadata (see #39509 for more information).
            .map(function (decorator) { return removeIdentifierReferences(decorator, id.text); });
        if (ngClassDecorators.length === 0) {
            return null;
        }
        var metaDecorators = new compiler_1.WrappedNodeExpr(ts.createArrayLiteral(ngClassDecorators));
        // Convert the constructor parameters to metadata, passing null if none are present.
        var metaCtorParameters = null;
        var classCtorParameters = reflection.getConstructorParameters(clazz);
        if (classCtorParameters !== null) {
            var ctorParameters = classCtorParameters.map(function (param) { return ctorParameterToMetadata(param, defaultImportRecorder, isCore); });
            metaCtorParameters = new compiler_1.FunctionExpr([], [
                new compiler_1.ReturnStatement(new compiler_1.LiteralArrayExpr(ctorParameters)),
            ]);
        }
        // Do the same for property decorators.
        var metaPropDecorators = null;
        var classMembers = reflection.getMembersOfClass(clazz).filter(function (member) { return !member.isStatic && member.decorators !== null && member.decorators.length > 0; });
        var duplicateDecoratedMemberNames = classMembers.map(function (member) { return member.name; }).filter(function (name, i, arr) { return arr.indexOf(name) < i; });
        if (duplicateDecoratedMemberNames.length > 0) {
            // This should theoretically never happen, because the only way to have duplicate instance
            // member names is getter/setter pairs and decorators cannot appear in both a getter and the
            // corresponding setter.
            throw new Error("Duplicate decorated properties found on class '" + clazz.name.text + "': " +
                duplicateDecoratedMemberNames.join(', '));
        }
        var decoratedMembers = classMembers.map(function (member) { var _a; return classMemberToMetadata((_a = member.nameNode) !== null && _a !== void 0 ? _a : member.name, member.decorators, isCore); });
        if (decoratedMembers.length > 0) {
            metaPropDecorators = new compiler_1.WrappedNodeExpr(ts.createObjectLiteral(decoratedMembers));
        }
        return {
            type: new compiler_1.WrappedNodeExpr(id),
            decorators: metaDecorators,
            ctorParameters: metaCtorParameters,
            propDecorators: metaPropDecorators,
        };
    }
    exports.extractClassMetadata = extractClassMetadata;
    /**
     * Convert a reflected constructor parameter to metadata.
     */
    function ctorParameterToMetadata(param, defaultImportRecorder, isCore) {
        // Parameters sometimes have a type that can be referenced. If so, then use it, otherwise
        // its type is undefined.
        var type = param.typeValueReference.kind !== 2 /* UNAVAILABLE */ ?
            util_1.valueReferenceToExpression(param.typeValueReference, defaultImportRecorder) :
            new compiler_1.LiteralExpr(undefined);
        var mapEntries = [
            { key: 'type', value: type, quoted: false },
        ];
        // If the parameter has decorators, include the ones from Angular.
        if (param.decorators !== null) {
            var ngDecorators = param.decorators.filter(function (dec) { return isAngularDecorator(dec, isCore); })
                .map(function (decorator) { return decoratorToMetadata(decorator); });
            var value = new compiler_1.WrappedNodeExpr(ts.createArrayLiteral(ngDecorators));
            mapEntries.push({ key: 'decorators', value: value, quoted: false });
        }
        return compiler_1.literalMap(mapEntries);
    }
    /**
     * Convert a reflected class member to metadata.
     */
    function classMemberToMetadata(name, decorators, isCore) {
        var ngDecorators = decorators.filter(function (dec) { return isAngularDecorator(dec, isCore); })
            .map(function (decorator) { return decoratorToMetadata(decorator); });
        var decoratorMeta = ts.createArrayLiteral(ngDecorators);
        return ts.createPropertyAssignment(name, decoratorMeta);
    }
    /**
     * Convert a reflected decorator to metadata.
     */
    function decoratorToMetadata(decorator, wrapFunctionsInParens) {
        if (decorator.identifier === null) {
            throw new Error('Illegal state: synthesized decorator cannot be emitted in class metadata.');
        }
        // Decorators have a type.
        var properties = [
            ts.createPropertyAssignment('type', ts.getMutableClone(decorator.identifier)),
        ];
        // Sometimes they have arguments.
        if (decorator.args !== null && decorator.args.length > 0) {
            var args = decorator.args.map(function (arg) {
                var expr = ts.getMutableClone(arg);
                return wrapFunctionsInParens ? util_1.wrapFunctionExpressionsInParens(expr) : expr;
            });
            properties.push(ts.createPropertyAssignment('args', ts.createArrayLiteral(args)));
        }
        return ts.createObjectLiteral(properties, true);
    }
    /**
     * Whether a given decorator should be treated as an Angular decorator.
     *
     * Either it's used in @angular/core, or it's imported from there.
     */
    function isAngularDecorator(decorator, isCore) {
        return isCore || (decorator.import !== null && decorator.import.from === '@angular/core');
    }
    /**
     * Recursively recreates all of the `Identifier` descendant nodes with a particular name inside
     * of an AST node, thus removing any references to them. Useful if a particular node has to be t
     * aken from one place any emitted to another one exactly as it has been written.
     */
    function removeIdentifierReferences(node, name) {
        var result = ts.transform(node, [function (context) { return function (root) { return ts.visitNode(root, function walk(current) {
                return ts.isIdentifier(current) && current.text === name ?
                    ts.createIdentifier(current.text) :
                    ts.visitEachChild(current, walk, context);
            }); }; }]);
        return result.transformed[0];
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9tZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBeUo7SUFDekosK0JBQWlDO0lBS2pDLDZFQUFtRjtJQUVuRjs7Ozs7OztPQU9HO0lBQ0gsU0FBZ0Isb0JBQW9CLENBQ2hDLEtBQXNCLEVBQUUsVUFBMEIsRUFDbEQscUJBQTRDLEVBQUUsTUFBZSxFQUM3RCwwQkFBb0M7UUFDdEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDOUIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVwRCx3RkFBd0Y7UUFDeEYsaUVBQWlFO1FBQ2pFLElBQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyRSxJQUFJLGVBQWUsS0FBSyxJQUFJLEVBQUU7WUFDNUIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQU0saUJBQWlCLEdBQ25CLGVBQWUsQ0FBQyxNQUFNLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEVBQS9CLENBQStCLENBQUM7YUFDekQsR0FBRyxDQUFDLFVBQUEsU0FBUyxJQUFJLE9BQUEsbUJBQW1CLENBQUMsU0FBUyxFQUFFLDBCQUEwQixDQUFDLEVBQTFELENBQTBELENBQUM7WUFDN0UsOEVBQThFO1lBQzlFLDBFQUEwRTtZQUMxRSw0RUFBNEU7WUFDNUUsMkVBQTJFO1lBQzNFLGtGQUFrRjthQUNqRixHQUFHLENBQUMsVUFBQSxTQUFTLElB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SUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ25GO1FBQ0QsT0FBTyxFQUFFLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxrQkFBa0IsQ0FBQyxTQUFvQixFQUFFLE1BQWU7UUFDL0QsT0FBTyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxlQUFlLENBQUMsQ0FBQztJQUM1RixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMsMEJBQTBCLENBQW9CLElBQU8sRUFBRSxJQUFZO1FBQzFFLElBQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQ3ZCLElBQUksRUFBRSxDQUFDLFVBQUEsT0FBTyxJQUFJLE9BQUEsVUFBQSxJQUFJLElBQUksT0FBQSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxTQUFTLElBQUksQ0FBQyxPQUFnQjtnQkFDekUsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUM7b0JBQ3RELEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDbkMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ2hELENBQUMsQ0FBQyxFQUp3QixDQUl4QixFQUpnQixDQUloQixDQUFDLENBQUMsQ0FBQztRQUVULE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgRnVuY3Rpb25FeHByLCBMaXRlcmFsQXJyYXlFeHByLCBMaXRlcmFsRXhwciwgbGl0ZXJhbE1hcCwgUjNDbGFzc01ldGFkYXRhLCBSZXR1cm5TdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVmYXVsdEltcG9ydFJlY29yZGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Q3RvclBhcmFtZXRlciwgRGVjbGFyYXRpb25Ob2RlLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0LCBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHt2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbiwgd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVuc30gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiBHaXZlbiBhIGNsYXNzIGRlY2xhcmF0aW9uLCBnZW5lcmF0ZSBhIGNhbGwgdG8gYHNldENsYXNzTWV0YWRhdGFgIHdpdGggdGhlIEFuZ3VsYXIgbWV0YWRhdGFcbiAqIHByZXNlbnQgb24gdGhlIGNsYXNzIG9yIGl0cyBtZW1iZXIgZmllbGRzLiBBbiBuZ0Rldk1vZGUgZ3VhcmQgaXMgdXNlZCB0byBhbGxvdyB0aGUgY2FsbCB0byBiZVxuICogdHJlZS1zaGFrZW4gYXdheSwgYXMgdGhlIGBzZXRDbGFzc01ldGFkYXRhYCBpbnZvY2F0aW9uIGlzIG9ubHkgbmVlZGVkIGZvciB0ZXN0aW5nIHB1cnBvc2VzLlxuICpcbiAqIElmIG5vIHN1Y2ggbWV0YWRhdGEgaXMgcHJlc2VudCwgdGhpcyBmdW5jdGlvbiByZXR1cm5zIGBudWxsYC4gT3RoZXJ3aXNlLCB0aGUgY2FsbCBpcyByZXR1cm5lZFxuICogYXMgYSBgU3RhdGVtZW50YCBmb3IgaW5jbHVzaW9uIGFsb25nIHdpdGggdGhlIGNsYXNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdENsYXNzTWV0YWRhdGEoXG4gICAgY2xheno6IERlY2xhcmF0aW9uTm9kZSwgcmVmbGVjdGlvbjogUmVmbGVjdGlvbkhvc3QsXG4gICAgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZTogYm9vbGVhbixcbiAgICBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcj86IGJvb2xlYW4pOiBSM0NsYXNzTWV0YWRhdGF8bnVsbCB7XG4gIGlmICghcmVmbGVjdGlvbi5pc0NsYXNzKGNsYXp6KSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IGlkID0gcmVmbGVjdGlvbi5nZXRBZGphY2VudE5hbWVPZkNsYXNzKGNsYXp6KTtcblxuICAvLyBSZWZsZWN0IG92ZXIgdGhlIGNsYXNzIGRlY29yYXRvcnMuIElmIG5vbmUgYXJlIHByZXNlbnQsIG9yIHRob3NlIHRoYXQgYXJlIGFyZW4ndCBmcm9tXG4gIC8vIEFuZ3VsYXIsIHRoZW4gcmV0dXJuIG51bGwuIE90aGVyd2lzZSwgdHVybiB0aGVtIGludG8gbWV0YWRhdGEuXG4gIGNvbnN0IGNsYXNzRGVjb3JhdG9ycyA9IHJlZmxlY3Rpb24uZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oY2xhenopO1xuICBpZiAoY2xhc3NEZWNvcmF0b3JzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgbmdDbGFzc0RlY29yYXRvcnMgPVxuICAgICAgY2xhc3NEZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4gaXNBbmd1bGFyRGVjb3JhdG9yKGRlYywgaXNDb3JlKSlcbiAgICAgICAgICAubWFwKGRlY29yYXRvciA9PiBkZWNvcmF0b3JUb01ldGFkYXRhKGRlY29yYXRvciwgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpKVxuICAgICAgICAgIC8vIFNpbmNlIHRoZSBgc2V0Q2xhc3NNZXRhZGF0YWAgY2FsbCBpcyBpbnRlbmRlZCB0byBiZSBlbWl0dGVkIGFmdGVyIHRoZSBjbGFzc1xuICAgICAgICAgIC8vIGRlY2xhcmF0aW9uLCB3ZSBoYXZlIHRvIHN0cmlwIHJlZmVyZW5jZXMgdG8gdGhlIGV4aXN0aW5nIGlkZW50aWZpZXJzIG9yXG4gICAgICAgICAgLy8gVHlwZVNjcmlwdCBtaWdodCBnZW5lcmF0ZSBpbnZhbGlkIGNvZGUgd2hlbiBpdCBlbWl0cyB0byBKUy4gSW4gcGFydGljdWxhclxuICAgICAgICAgIC8vIHRoaXMgY2FuIGJyZWFrIHdoZW4gZW1pdHRpbmcgYSBjbGFzcyB0byBFUzUgd2hpY2ggaGFzIGEgY3VzdG9tIGRlY29yYXRvclxuICAgICAgICAgIC8vIGFuZCBpcyByZWZlcmVuY2VkIGluc2lkZSBvZiBpdHMgb3duIG1ldGFkYXRhIChzZWUgIzM5NTA5IGZvciBtb3JlIGluZm9ybWF0aW9uKS5cbiAgICAgICAgICAubWFwKGRlY29yYXRvciA9PiByZW1vdmVJZGVudGlmaWVyUmVmZXJlbmNlcyhkZWNvcmF0b3IsIGlkLnRleHQpKTtcbiAgaWYgKG5nQ2xhc3NEZWNvcmF0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG1ldGFEZWNvcmF0b3JzID0gbmV3IFdyYXBwZWROb2RlRXhwcih0cy5jcmVhdGVBcnJheUxpdGVyYWwobmdDbGFzc0RlY29yYXRvcnMpKTtcblxuICAvLyBDb252ZXJ0IHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIHRvIG1ldGFkYXRhLCBwYXNzaW5nIG51bGwgaWYgbm9uZSBhcmUgcHJlc2VudC5cbiAgbGV0IG1ldGFDdG9yUGFyYW1ldGVyczogRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgY29uc3QgY2xhc3NDdG9yUGFyYW1ldGVycyA9IHJlZmxlY3Rpb24uZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6KTtcbiAgaWYgKGNsYXNzQ3RvclBhcmFtZXRlcnMgIT09IG51bGwpIHtcbiAgICBjb25zdCBjdG9yUGFyYW1ldGVycyA9IGNsYXNzQ3RvclBhcmFtZXRlcnMubWFwKFxuICAgICAgICBwYXJhbSA9PiBjdG9yUGFyYW1ldGVyVG9NZXRhZGF0YShwYXJhbSwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmUpKTtcbiAgICBtZXRhQ3RvclBhcmFtZXRlcnMgPSBuZXcgRnVuY3Rpb25FeHByKFtdLCBbXG4gICAgICBuZXcgUmV0dXJuU3RhdGVtZW50KG5ldyBMaXRlcmFsQXJyYXlFeHByKGN0b3JQYXJhbWV0ZXJzKSksXG4gICAgXSk7XG4gIH1cblxuICAvLyBEbyB0aGUgc2FtZSBmb3IgcHJvcGVydHkgZGVjb3JhdG9ycy5cbiAgbGV0IG1ldGFQcm9wRGVjb3JhdG9yczogRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgY29uc3QgY2xhc3NNZW1iZXJzID0gcmVmbGVjdGlvbi5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eikuZmlsdGVyKFxuICAgICAgbWVtYmVyID0+ICFtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLmRlY29yYXRvcnMgIT09IG51bGwgJiYgbWVtYmVyLmRlY29yYXRvcnMubGVuZ3RoID4gMCk7XG4gIGNvbnN0IGR1cGxpY2F0ZURlY29yYXRlZE1lbWJlck5hbWVzID1cbiAgICAgIGNsYXNzTWVtYmVycy5tYXAobWVtYmVyID0+IG1lbWJlci5uYW1lKS5maWx0ZXIoKG5hbWUsIGksIGFycikgPT4gYXJyLmluZGV4T2YobmFtZSkgPCBpKTtcbiAgaWYgKGR1cGxpY2F0ZURlY29yYXRlZE1lbWJlck5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAvLyBUaGlzIHNob3VsZCB0aGVvcmV0aWNhbGx5IG5ldmVyIGhhcHBlbiwgYmVjYXVzZSB0aGUgb25seSB3YXkgdG8gaGF2ZSBkdXBsaWNhdGUgaW5zdGFuY2VcbiAgICAvLyBtZW1iZXIgbmFtZXMgaXMgZ2V0dGVyL3NldHRlciBwYWlycyBhbmQgZGVjb3JhdG9ycyBjYW5ub3QgYXBwZWFyIGluIGJvdGggYSBnZXR0ZXIgYW5kIHRoZVxuICAgIC8vIGNvcnJlc3BvbmRpbmcgc2V0dGVyLlxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYER1cGxpY2F0ZSBkZWNvcmF0ZWQgcHJvcGVydGllcyBmb3VuZCBvbiBjbGFzcyAnJHtjbGF6ei5uYW1lLnRleHR9JzogYCArXG4gICAgICAgIGR1cGxpY2F0ZURlY29yYXRlZE1lbWJlck5hbWVzLmpvaW4oJywgJykpO1xuICB9XG4gIGNvbnN0IGRlY29yYXRlZE1lbWJlcnMgPSBjbGFzc01lbWJlcnMubWFwKFxuICAgICAgbWVtYmVyID0+IGNsYXNzTWVtYmVyVG9NZXRhZGF0YShtZW1iZXIubmFtZU5vZGUgPz8gbWVtYmVyLm5hbWUsIG1lbWJlci5kZWNvcmF0b3JzISwgaXNDb3JlKSk7XG4gIGlmIChkZWNvcmF0ZWRNZW1iZXJzLmxlbmd0aCA+IDApIHtcbiAgICBtZXRhUHJvcERlY29yYXRvcnMgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoZGVjb3JhdGVkTWVtYmVycykpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB0eXBlOiBuZXcgV3JhcHBlZE5vZGVFeHByKGlkKSxcbiAgICBkZWNvcmF0b3JzOiBtZXRhRGVjb3JhdG9ycyxcbiAgICBjdG9yUGFyYW1ldGVyczogbWV0YUN0b3JQYXJhbWV0ZXJzLFxuICAgIHByb3BEZWNvcmF0b3JzOiBtZXRhUHJvcERlY29yYXRvcnMsXG4gIH07XG59XG5cbi8qKlxuICogQ29udmVydCBhIHJlZmxlY3RlZCBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgdG8gbWV0YWRhdGEuXG4gKi9cbmZ1bmN0aW9uIGN0b3JQYXJhbWV0ZXJUb01ldGFkYXRhKFxuICAgIHBhcmFtOiBDdG9yUGFyYW1ldGVyLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICBpc0NvcmU6IGJvb2xlYW4pOiBFeHByZXNzaW9uIHtcbiAgLy8gUGFyYW1ldGVycyBzb21ldGltZXMgaGF2ZSBhIHR5cGUgdGhhdCBjYW4gYmUgcmVmZXJlbmNlZC4gSWYgc28sIHRoZW4gdXNlIGl0LCBvdGhlcndpc2VcbiAgLy8gaXRzIHR5cGUgaXMgdW5kZWZpbmVkLlxuICBjb25zdCB0eXBlID0gcGFyYW0udHlwZVZhbHVlUmVmZXJlbmNlLmtpbmQgIT09IFR5cGVWYWx1ZVJlZmVyZW5jZUtpbmQuVU5BVkFJTEFCTEUgP1xuICAgICAgdmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24ocGFyYW0udHlwZVZhbHVlUmVmZXJlbmNlLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIpIDpcbiAgICAgIG5ldyBMaXRlcmFsRXhwcih1bmRlZmluZWQpO1xuXG4gIGNvbnN0IG1hcEVudHJpZXM6IHtrZXk6IHN0cmluZywgdmFsdWU6IEV4cHJlc3Npb24sIHF1b3RlZDogZmFsc2V9W10gPSBbXG4gICAge2tleTogJ3R5cGUnLCB2YWx1ZTogdHlwZSwgcXVvdGVkOiBmYWxzZX0sXG4gIF07XG5cbiAgLy8gSWYgdGhlIHBhcmFtZXRlciBoYXMgZGVjb3JhdG9ycywgaW5jbHVkZSB0aGUgb25lcyBmcm9tIEFuZ3VsYXIuXG4gIGlmIChwYXJhbS5kZWNvcmF0b3JzICE9PSBudWxsKSB7XG4gICAgY29uc3QgbmdEZWNvcmF0b3JzID0gcGFyYW0uZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IGlzQW5ndWxhckRlY29yYXRvcihkZWMsIGlzQ29yZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoKGRlY29yYXRvcjogRGVjb3JhdG9yKSA9PiBkZWNvcmF0b3JUb01ldGFkYXRhKGRlY29yYXRvcikpO1xuICAgIGNvbnN0IHZhbHVlID0gbmV3IFdyYXBwZWROb2RlRXhwcih0cy5jcmVhdGVBcnJheUxpdGVyYWwobmdEZWNvcmF0b3JzKSk7XG4gICAgbWFwRW50cmllcy5wdXNoKHtrZXk6ICdkZWNvcmF0b3JzJywgdmFsdWUsIHF1b3RlZDogZmFsc2V9KTtcbiAgfVxuICByZXR1cm4gbGl0ZXJhbE1hcChtYXBFbnRyaWVzKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgcmVmbGVjdGVkIGNsYXNzIG1lbWJlciB0byBtZXRhZGF0YS5cbiAqL1xuZnVuY3Rpb24gY2xhc3NNZW1iZXJUb01ldGFkYXRhKFxuICAgIG5hbWU6IHRzLlByb3BlcnR5TmFtZXxzdHJpbmcsIGRlY29yYXRvcnM6IERlY29yYXRvcltdLCBpc0NvcmU6IGJvb2xlYW4pOiB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQge1xuICBjb25zdCBuZ0RlY29yYXRvcnMgPSBkZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4gaXNBbmd1bGFyRGVjb3JhdG9yKGRlYywgaXNDb3JlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoKGRlY29yYXRvcjogRGVjb3JhdG9yKSA9PiBkZWNvcmF0b3JUb01ldGFkYXRhKGRlY29yYXRvcikpO1xuICBjb25zdCBkZWNvcmF0b3JNZXRhID0gdHMuY3JlYXRlQXJyYXlMaXRlcmFsKG5nRGVjb3JhdG9ycyk7XG4gIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQobmFtZSwgZGVjb3JhdG9yTWV0YSk7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHJlZmxlY3RlZCBkZWNvcmF0b3IgdG8gbWV0YWRhdGEuXG4gKi9cbmZ1bmN0aW9uIGRlY29yYXRvclRvTWV0YWRhdGEoXG4gICAgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIHdyYXBGdW5jdGlvbnNJblBhcmVucz86IGJvb2xlYW4pOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiB7XG4gIGlmIChkZWNvcmF0b3IuaWRlbnRpZmllciA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSWxsZWdhbCBzdGF0ZTogc3ludGhlc2l6ZWQgZGVjb3JhdG9yIGNhbm5vdCBiZSBlbWl0dGVkIGluIGNsYXNzIG1ldGFkYXRhLicpO1xuICB9XG4gIC8vIERlY29yYXRvcnMgaGF2ZSBhIHR5cGUuXG4gIGNvbnN0IHByb3BlcnRpZXM6IHRzLk9iamVjdExpdGVyYWxFbGVtZW50TGlrZVtdID0gW1xuICAgIHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudCgndHlwZScsIHRzLmdldE11dGFibGVDbG9uZShkZWNvcmF0b3IuaWRlbnRpZmllcikpLFxuICBdO1xuICAvLyBTb21ldGltZXMgdGhleSBoYXZlIGFyZ3VtZW50cy5cbiAgaWYgKGRlY29yYXRvci5hcmdzICE9PSBudWxsICYmIGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBhcmdzID0gZGVjb3JhdG9yLmFyZ3MubWFwKGFyZyA9PiB7XG4gICAgICBjb25zdCBleHByID0gdHMuZ2V0TXV0YWJsZUNsb25lKGFyZyk7XG4gICAgICByZXR1cm4gd3JhcEZ1bmN0aW9uc0luUGFyZW5zID8gd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucyhleHByKSA6IGV4cHI7XG4gICAgfSk7XG4gICAgcHJvcGVydGllcy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudCgnYXJncycsIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChhcmdzKSkpO1xuICB9XG4gIHJldHVybiB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKHByb3BlcnRpZXMsIHRydWUpO1xufVxuXG4vKipcbiAqIFdoZXRoZXIgYSBnaXZlbiBkZWNvcmF0b3Igc2hvdWxkIGJlIHRyZWF0ZWQgYXMgYW4gQW5ndWxhciBkZWNvcmF0b3IuXG4gKlxuICogRWl0aGVyIGl0J3MgdXNlZCBpbiBAYW5ndWxhci9jb3JlLCBvciBpdCdzIGltcG9ydGVkIGZyb20gdGhlcmUuXG4gKi9cbmZ1bmN0aW9uIGlzQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3I6IERlY29yYXRvciwgaXNDb3JlOiBib29sZWFuKTogYm9vbGVhbiB7XG4gIHJldHVybiBpc0NvcmUgfHwgKGRlY29yYXRvci5pbXBvcnQgIT09IG51bGwgJiYgZGVjb3JhdG9yLmltcG9ydC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZScpO1xufVxuXG4vKipcbiAqIFJlY3Vyc2l2ZWx5IHJlY3JlYXRlcyBhbGwgb2YgdGhlIGBJZGVudGlmaWVyYCBkZXNjZW5kYW50IG5vZGVzIHdpdGggYSBwYXJ0aWN1bGFyIG5hbWUgaW5zaWRlXG4gKiBvZiBhbiBBU1Qgbm9kZSwgdGh1cyByZW1vdmluZyBhbnkgcmVmZXJlbmNlcyB0byB0aGVtLiBVc2VmdWwgaWYgYSBwYXJ0aWN1bGFyIG5vZGUgaGFzIHRvIGJlIHRcbiAqIGFrZW4gZnJvbSBvbmUgcGxhY2UgYW55IGVtaXR0ZWQgdG8gYW5vdGhlciBvbmUgZXhhY3RseSBhcyBpdCBoYXMgYmVlbiB3cml0dGVuLlxuICovXG5mdW5jdGlvbiByZW1vdmVJZGVudGlmaWVyUmVmZXJlbmNlczxUIGV4dGVuZHMgdHMuTm9kZT4obm9kZTogVCwgbmFtZTogc3RyaW5nKTogVCB7XG4gIGNvbnN0IHJlc3VsdCA9IHRzLnRyYW5zZm9ybShcbiAgICAgIG5vZGUsIFtjb250ZXh0ID0+IHJvb3QgPT4gdHMudmlzaXROb2RlKHJvb3QsIGZ1bmN0aW9uIHdhbGsoY3VycmVudDogdHMuTm9kZSk6IHRzLk5vZGUge1xuICAgICAgICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKGN1cnJlbnQpICYmIGN1cnJlbnQudGV4dCA9PT0gbmFtZSA/XG4gICAgICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKGN1cnJlbnQudGV4dCkgOlxuICAgICAgICAgICAgdHMudmlzaXRFYWNoQ2hpbGQoY3VycmVudCwgd2FsaywgY29udGV4dCk7XG4gICAgICB9KV0pO1xuXG4gIHJldHVybiByZXN1bHQudHJhbnNmb3JtZWRbMF07XG59XG4iXX0=