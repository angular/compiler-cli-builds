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
    function extractClassMetadata(clazz, reflection, isCore, annotateForClosureCompiler, angularDecoratorTransform) {
        if (angularDecoratorTransform === void 0) { angularDecoratorTransform = function (dec) { return dec; }; }
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
            .map(function (decorator) { return decoratorToMetadata(angularDecoratorTransform(decorator), annotateForClosureCompiler); })
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
            var ctorParameters = classCtorParameters.map(function (param) { return ctorParameterToMetadata(param, isCore); });
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
    function ctorParameterToMetadata(param, isCore) {
        // Parameters sometimes have a type that can be referenced. If so, then use it, otherwise
        // its type is undefined.
        var type = param.typeValueReference.kind !== 2 /* UNAVAILABLE */ ?
            util_1.valueReferenceToExpression(param.typeValueReference) :
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
     * of an AST node, thus removing any references to them. Useful if a particular node has to be
     * taken from one place any emitted to another one exactly as it has been written.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9tZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBeUo7SUFDekosK0JBQWlDO0lBSWpDLDZFQUFtRjtJQUVuRjs7Ozs7OztPQU9HO0lBQ0gsU0FBZ0Isb0JBQW9CLENBQ2hDLEtBQXNCLEVBQUUsVUFBMEIsRUFBRSxNQUFlLEVBQ25FLDBCQUFvQyxFQUNwQyx5QkFBcUU7UUFBckUsMENBQUEsRUFBQSxzQ0FBMkQsR0FBRyxJQUFJLE9BQUEsR0FBRyxFQUFILENBQUc7UUFDdkUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDOUIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVwRCx3RkFBd0Y7UUFDeEYsaUVBQWlFO1FBQ2pFLElBQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyRSxJQUFJLGVBQWUsS0FBSyxJQUFJLEVBQUU7WUFDNUIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQU0saUJBQWlCLEdBQ25CLGVBQWUsQ0FBQyxNQUFNLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEVBQS9CLENBQStCLENBQUM7YUFDekQsR0FBRyxDQUNBLFVBQUEsU0FBUyxJQUFJLE9BQUEsbUJBQW1CLENBQzVCLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxFQUFFLDBCQUEwQixDQUFDLEVBRHhELENBQ3dELENBQUM7WUFDMUUsOEVBQThFO1lBQzlFLDBF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LE1BQU0sRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ25GO1FBQ0QsT0FBTyxFQUFFLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxrQkFBa0IsQ0FBQyxTQUFvQixFQUFFLE1BQWU7UUFDL0QsT0FBTyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxlQUFlLENBQUMsQ0FBQztJQUM1RixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMsMEJBQTBCLENBQW9CLElBQU8sRUFBRSxJQUFZO1FBQzFFLElBQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQ3ZCLElBQUksRUFBRSxDQUFDLFVBQUEsT0FBTyxJQUFJLE9BQUEsVUFBQSxJQUFJLElBQUksT0FBQSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxTQUFTLElBQUksQ0FBQyxPQUFnQjtnQkFDekUsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUM7b0JBQ3RELEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDbkMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ2hELENBQUMsQ0FBQyxFQUp3QixDQUl4QixFQUpnQixDQUloQixDQUFDLENBQUMsQ0FBQztRQUVULE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgRnVuY3Rpb25FeHByLCBMaXRlcmFsQXJyYXlFeHByLCBMaXRlcmFsRXhwciwgbGl0ZXJhbE1hcCwgUjNDbGFzc01ldGFkYXRhLCBSZXR1cm5TdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q3RvclBhcmFtZXRlciwgRGVjbGFyYXRpb25Ob2RlLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0LCBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHt2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbiwgd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVuc30gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiBHaXZlbiBhIGNsYXNzIGRlY2xhcmF0aW9uLCBnZW5lcmF0ZSBhIGNhbGwgdG8gYHNldENsYXNzTWV0YWRhdGFgIHdpdGggdGhlIEFuZ3VsYXIgbWV0YWRhdGFcbiAqIHByZXNlbnQgb24gdGhlIGNsYXNzIG9yIGl0cyBtZW1iZXIgZmllbGRzLiBBbiBuZ0Rldk1vZGUgZ3VhcmQgaXMgdXNlZCB0byBhbGxvdyB0aGUgY2FsbCB0byBiZVxuICogdHJlZS1zaGFrZW4gYXdheSwgYXMgdGhlIGBzZXRDbGFzc01ldGFkYXRhYCBpbnZvY2F0aW9uIGlzIG9ubHkgbmVlZGVkIGZvciB0ZXN0aW5nIHB1cnBvc2VzLlxuICpcbiAqIElmIG5vIHN1Y2ggbWV0YWRhdGEgaXMgcHJlc2VudCwgdGhpcyBmdW5jdGlvbiByZXR1cm5zIGBudWxsYC4gT3RoZXJ3aXNlLCB0aGUgY2FsbCBpcyByZXR1cm5lZFxuICogYXMgYSBgU3RhdGVtZW50YCBmb3IgaW5jbHVzaW9uIGFsb25nIHdpdGggdGhlIGNsYXNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdENsYXNzTWV0YWRhdGEoXG4gICAgY2xheno6IERlY2xhcmF0aW9uTm9kZSwgcmVmbGVjdGlvbjogUmVmbGVjdGlvbkhvc3QsIGlzQ29yZTogYm9vbGVhbixcbiAgICBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcj86IGJvb2xlYW4sXG4gICAgYW5ndWxhckRlY29yYXRvclRyYW5zZm9ybTogKGRlYzogRGVjb3JhdG9yKSA9PiBEZWNvcmF0b3IgPSBkZWMgPT4gZGVjKTogUjNDbGFzc01ldGFkYXRhfG51bGwge1xuICBpZiAoIXJlZmxlY3Rpb24uaXNDbGFzcyhjbGF6eikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBpZCA9IHJlZmxlY3Rpb24uZ2V0QWRqYWNlbnROYW1lT2ZDbGFzcyhjbGF6eik7XG5cbiAgLy8gUmVmbGVjdCBvdmVyIHRoZSBjbGFzcyBkZWNvcmF0b3JzLiBJZiBub25lIGFyZSBwcmVzZW50LCBvciB0aG9zZSB0aGF0IGFyZSBhcmVuJ3QgZnJvbVxuICAvLyBBbmd1bGFyLCB0aGVuIHJldHVybiBudWxsLiBPdGhlcndpc2UsIHR1cm4gdGhlbSBpbnRvIG1ldGFkYXRhLlxuICBjb25zdCBjbGFzc0RlY29yYXRvcnMgPSByZWZsZWN0aW9uLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGNsYXp6KTtcbiAgaWYgKGNsYXNzRGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG5nQ2xhc3NEZWNvcmF0b3JzID1cbiAgICAgIGNsYXNzRGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IGlzQW5ndWxhckRlY29yYXRvcihkZWMsIGlzQ29yZSkpXG4gICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgZGVjb3JhdG9yID0+IGRlY29yYXRvclRvTWV0YWRhdGEoXG4gICAgICAgICAgICAgICAgICBhbmd1bGFyRGVjb3JhdG9yVHJhbnNmb3JtKGRlY29yYXRvciksIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKSlcbiAgICAgICAgICAvLyBTaW5jZSB0aGUgYHNldENsYXNzTWV0YWRhdGFgIGNhbGwgaXMgaW50ZW5kZWQgdG8gYmUgZW1pdHRlZCBhZnRlciB0aGUgY2xhc3NcbiAgICAgICAgICAvLyBkZWNsYXJhdGlvbiwgd2UgaGF2ZSB0byBzdHJpcCByZWZlcmVuY2VzIHRvIHRoZSBleGlzdGluZyBpZGVudGlmaWVycyBvclxuICAgICAgICAgIC8vIFR5cGVTY3JpcHQgbWlnaHQgZ2VuZXJhdGUgaW52YWxpZCBjb2RlIHdoZW4gaXQgZW1pdHMgdG8gSlMuIEluIHBhcnRpY3VsYXJcbiAgICAgICAgICAvLyB0aGlzIGNhbiBicmVhayB3aGVuIGVtaXR0aW5nIGEgY2xhc3MgdG8gRVM1IHdoaWNoIGhhcyBhIGN1c3RvbSBkZWNvcmF0b3JcbiAgICAgICAgICAvLyBhbmQgaXMgcmVmZXJlbmNlZCBpbnNpZGUgb2YgaXRzIG93biBtZXRhZGF0YSAoc2VlICMzOTUwOSBmb3IgbW9yZSBpbmZvcm1hdGlvbikuXG4gICAgICAgICAgLm1hcChkZWNvcmF0b3IgPT4gcmVtb3ZlSWRlbnRpZmllclJlZmVyZW5jZXMoZGVjb3JhdG9yLCBpZC50ZXh0KSk7XG4gIGlmIChuZ0NsYXNzRGVjb3JhdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBtZXRhRGVjb3JhdG9ycyA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodHMuY3JlYXRlQXJyYXlMaXRlcmFsKG5nQ2xhc3NEZWNvcmF0b3JzKSk7XG5cbiAgLy8gQ29udmVydCB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyB0byBtZXRhZGF0YSwgcGFzc2luZyBudWxsIGlmIG5vbmUgYXJlIHByZXNlbnQuXG4gIGxldCBtZXRhQ3RvclBhcmFtZXRlcnM6IEV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gIGNvbnN0IGNsYXNzQ3RvclBhcmFtZXRlcnMgPSByZWZsZWN0aW9uLmdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhjbGF6eik7XG4gIGlmIChjbGFzc0N0b3JQYXJhbWV0ZXJzICE9PSBudWxsKSB7XG4gICAgY29uc3QgY3RvclBhcmFtZXRlcnMgPSBjbGFzc0N0b3JQYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiBjdG9yUGFyYW1ldGVyVG9NZXRhZGF0YShwYXJhbSwgaXNDb3JlKSk7XG4gICAgbWV0YUN0b3JQYXJhbWV0ZXJzID0gbmV3IEZ1bmN0aW9uRXhwcihbXSwgW1xuICAgICAgbmV3IFJldHVyblN0YXRlbWVudChuZXcgTGl0ZXJhbEFycmF5RXhwcihjdG9yUGFyYW1ldGVycykpLFxuICAgIF0pO1xuICB9XG5cbiAgLy8gRG8gdGhlIHNhbWUgZm9yIHByb3BlcnR5IGRlY29yYXRvcnMuXG4gIGxldCBtZXRhUHJvcERlY29yYXRvcnM6IEV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gIGNvbnN0IGNsYXNzTWVtYmVycyA9IHJlZmxlY3Rpb24uZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbHRlcihcbiAgICAgIG1lbWJlciA9PiAhbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5kZWNvcmF0b3JzICE9PSBudWxsICYmIG1lbWJlci5kZWNvcmF0b3JzLmxlbmd0aCA+IDApO1xuICBjb25zdCBkdXBsaWNhdGVEZWNvcmF0ZWRNZW1iZXJOYW1lcyA9XG4gICAgICBjbGFzc01lbWJlcnMubWFwKG1lbWJlciA9PiBtZW1iZXIubmFtZSkuZmlsdGVyKChuYW1lLCBpLCBhcnIpID0+IGFyci5pbmRleE9mKG5hbWUpIDwgaSk7XG4gIGlmIChkdXBsaWNhdGVEZWNvcmF0ZWRNZW1iZXJOYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgLy8gVGhpcyBzaG91bGQgdGhlb3JldGljYWxseSBuZXZlciBoYXBwZW4sIGJlY2F1c2UgdGhlIG9ubHkgd2F5IHRvIGhhdmUgZHVwbGljYXRlIGluc3RhbmNlXG4gICAgLy8gbWVtYmVyIG5hbWVzIGlzIGdldHRlci9zZXR0ZXIgcGFpcnMgYW5kIGRlY29yYXRvcnMgY2Fubm90IGFwcGVhciBpbiBib3RoIGEgZ2V0dGVyIGFuZCB0aGVcbiAgICAvLyBjb3JyZXNwb25kaW5nIHNldHRlci5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBEdXBsaWNhdGUgZGVjb3JhdGVkIHByb3BlcnRpZXMgZm91bmQgb24gY2xhc3MgJyR7Y2xhenoubmFtZS50ZXh0fSc6IGAgK1xuICAgICAgICBkdXBsaWNhdGVEZWNvcmF0ZWRNZW1iZXJOYW1lcy5qb2luKCcsICcpKTtcbiAgfVxuICBjb25zdCBkZWNvcmF0ZWRNZW1iZXJzID0gY2xhc3NNZW1iZXJzLm1hcChcbiAgICAgIG1lbWJlciA9PiBjbGFzc01lbWJlclRvTWV0YWRhdGEobWVtYmVyLm5hbWVOb2RlID8/IG1lbWJlci5uYW1lLCBtZW1iZXIuZGVjb3JhdG9ycyEsIGlzQ29yZSkpO1xuICBpZiAoZGVjb3JhdGVkTWVtYmVycy5sZW5ndGggPiAwKSB7XG4gICAgbWV0YVByb3BEZWNvcmF0b3JzID0gbmV3IFdyYXBwZWROb2RlRXhwcih0cy5jcmVhdGVPYmplY3RMaXRlcmFsKGRlY29yYXRlZE1lbWJlcnMpKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdHlwZTogbmV3IFdyYXBwZWROb2RlRXhwcihpZCksXG4gICAgZGVjb3JhdG9yczogbWV0YURlY29yYXRvcnMsXG4gICAgY3RvclBhcmFtZXRlcnM6IG1ldGFDdG9yUGFyYW1ldGVycyxcbiAgICBwcm9wRGVjb3JhdG9yczogbWV0YVByb3BEZWNvcmF0b3JzLFxuICB9O1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSByZWZsZWN0ZWQgY29uc3RydWN0b3IgcGFyYW1ldGVyIHRvIG1ldGFkYXRhLlxuICovXG5mdW5jdGlvbiBjdG9yUGFyYW1ldGVyVG9NZXRhZGF0YShwYXJhbTogQ3RvclBhcmFtZXRlciwgaXNDb3JlOiBib29sZWFuKTogRXhwcmVzc2lvbiB7XG4gIC8vIFBhcmFtZXRlcnMgc29tZXRpbWVzIGhhdmUgYSB0eXBlIHRoYXQgY2FuIGJlIHJlZmVyZW5jZWQuIElmIHNvLCB0aGVuIHVzZSBpdCwgb3RoZXJ3aXNlXG4gIC8vIGl0cyB0eXBlIGlzIHVuZGVmaW5lZC5cbiAgY29uc3QgdHlwZSA9IHBhcmFtLnR5cGVWYWx1ZVJlZmVyZW5jZS5raW5kICE9PSBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLlVOQVZBSUxBQkxFID9cbiAgICAgIHZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9uKHBhcmFtLnR5cGVWYWx1ZVJlZmVyZW5jZSkgOlxuICAgICAgbmV3IExpdGVyYWxFeHByKHVuZGVmaW5lZCk7XG5cbiAgY29uc3QgbWFwRW50cmllczoge2tleTogc3RyaW5nLCB2YWx1ZTogRXhwcmVzc2lvbiwgcXVvdGVkOiBmYWxzZX1bXSA9IFtcbiAgICB7a2V5OiAndHlwZScsIHZhbHVlOiB0eXBlLCBxdW90ZWQ6IGZhbHNlfSxcbiAgXTtcblxuICAvLyBJZiB0aGUgcGFyYW1ldGVyIGhhcyBkZWNvcmF0b3JzLCBpbmNsdWRlIHRoZSBvbmVzIGZyb20gQW5ndWxhci5cbiAgaWYgKHBhcmFtLmRlY29yYXRvcnMgIT09IG51bGwpIHtcbiAgICBjb25zdCBuZ0RlY29yYXRvcnMgPSBwYXJhbS5kZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4gaXNBbmd1bGFyRGVjb3JhdG9yKGRlYywgaXNDb3JlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCgoZGVjb3JhdG9yOiBEZWNvcmF0b3IpID0+IGRlY29yYXRvclRvTWV0YWRhdGEoZGVjb3JhdG9yKSk7XG4gICAgY29uc3QgdmFsdWUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChuZ0RlY29yYXRvcnMpKTtcbiAgICBtYXBFbnRyaWVzLnB1c2goe2tleTogJ2RlY29yYXRvcnMnLCB2YWx1ZSwgcXVvdGVkOiBmYWxzZX0pO1xuICB9XG4gIHJldHVybiBsaXRlcmFsTWFwKG1hcEVudHJpZXMpO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSByZWZsZWN0ZWQgY2xhc3MgbWVtYmVyIHRvIG1ldGFkYXRhLlxuICovXG5mdW5jdGlvbiBjbGFzc01lbWJlclRvTWV0YWRhdGEoXG4gICAgbmFtZTogdHMuUHJvcGVydHlOYW1lfHN0cmluZywgZGVjb3JhdG9yczogRGVjb3JhdG9yW10sIGlzQ29yZTogYm9vbGVhbik6IHRzLlByb3BlcnR5QXNzaWdubWVudCB7XG4gIGNvbnN0IG5nRGVjb3JhdG9ycyA9IGRlY29yYXRvcnMuZmlsdGVyKGRlYyA9PiBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjLCBpc0NvcmUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCgoZGVjb3JhdG9yOiBEZWNvcmF0b3IpID0+IGRlY29yYXRvclRvTWV0YWRhdGEoZGVjb3JhdG9yKSk7XG4gIGNvbnN0IGRlY29yYXRvck1ldGEgPSB0cy5jcmVhdGVBcnJheUxpdGVyYWwobmdEZWNvcmF0b3JzKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChuYW1lLCBkZWNvcmF0b3JNZXRhKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgcmVmbGVjdGVkIGRlY29yYXRvciB0byBtZXRhZGF0YS5cbiAqL1xuZnVuY3Rpb24gZGVjb3JhdG9yVG9NZXRhZGF0YShcbiAgICBkZWNvcmF0b3I6IERlY29yYXRvciwgd3JhcEZ1bmN0aW9uc0luUGFyZW5zPzogYm9vbGVhbik6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uIHtcbiAgaWYgKGRlY29yYXRvci5pZGVudGlmaWVyID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbGxlZ2FsIHN0YXRlOiBzeW50aGVzaXplZCBkZWNvcmF0b3IgY2Fubm90IGJlIGVtaXR0ZWQgaW4gY2xhc3MgbWV0YWRhdGEuJyk7XG4gIH1cbiAgLy8gRGVjb3JhdG9ycyBoYXZlIGEgdHlwZS5cbiAgY29uc3QgcHJvcGVydGllczogdHMuT2JqZWN0TGl0ZXJhbEVsZW1lbnRMaWtlW10gPSBbXG4gICAgdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KCd0eXBlJywgdHMuZ2V0TXV0YWJsZUNsb25lKGRlY29yYXRvci5pZGVudGlmaWVyKSksXG4gIF07XG4gIC8vIFNvbWV0aW1lcyB0aGV5IGhhdmUgYXJndW1lbnRzLlxuICBpZiAoZGVjb3JhdG9yLmFyZ3MgIT09IG51bGwgJiYgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGFyZ3MgPSBkZWNvcmF0b3IuYXJncy5tYXAoYXJnID0+IHtcbiAgICAgIGNvbnN0IGV4cHIgPSB0cy5nZXRNdXRhYmxlQ2xvbmUoYXJnKTtcbiAgICAgIHJldHVybiB3cmFwRnVuY3Rpb25zSW5QYXJlbnMgPyB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zKGV4cHIpIDogZXhwcjtcbiAgICB9KTtcbiAgICBwcm9wZXJ0aWVzLnB1c2godHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KCdhcmdzJywgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKGFyZ3MpKSk7XG4gIH1cbiAgcmV0dXJuIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwocHJvcGVydGllcywgdHJ1ZSk7XG59XG5cbi8qKlxuICogV2hldGhlciBhIGdpdmVuIGRlY29yYXRvciBzaG91bGQgYmUgdHJlYXRlZCBhcyBhbiBBbmd1bGFyIGRlY29yYXRvci5cbiAqXG4gKiBFaXRoZXIgaXQncyB1c2VkIGluIEBhbmd1bGFyL2NvcmUsIG9yIGl0J3MgaW1wb3J0ZWQgZnJvbSB0aGVyZS5cbiAqL1xuZnVuY3Rpb24gaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcjogRGVjb3JhdG9yLCBpc0NvcmU6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgcmV0dXJuIGlzQ29yZSB8fCAoZGVjb3JhdG9yLmltcG9ydCAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuaW1wb3J0LmZyb20gPT09ICdAYW5ndWxhci9jb3JlJyk7XG59XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgcmVjcmVhdGVzIGFsbCBvZiB0aGUgYElkZW50aWZpZXJgIGRlc2NlbmRhbnQgbm9kZXMgd2l0aCBhIHBhcnRpY3VsYXIgbmFtZSBpbnNpZGVcbiAqIG9mIGFuIEFTVCBub2RlLCB0aHVzIHJlbW92aW5nIGFueSByZWZlcmVuY2VzIHRvIHRoZW0uIFVzZWZ1bCBpZiBhIHBhcnRpY3VsYXIgbm9kZSBoYXMgdG8gYmVcbiAqIHRha2VuIGZyb20gb25lIHBsYWNlIGFueSBlbWl0dGVkIHRvIGFub3RoZXIgb25lIGV4YWN0bHkgYXMgaXQgaGFzIGJlZW4gd3JpdHRlbi5cbiAqL1xuZnVuY3Rpb24gcmVtb3ZlSWRlbnRpZmllclJlZmVyZW5jZXM8VCBleHRlbmRzIHRzLk5vZGU+KG5vZGU6IFQsIG5hbWU6IHN0cmluZyk6IFQge1xuICBjb25zdCByZXN1bHQgPSB0cy50cmFuc2Zvcm0oXG4gICAgICBub2RlLCBbY29udGV4dCA9PiByb290ID0+IHRzLnZpc2l0Tm9kZShyb290LCBmdW5jdGlvbiB3YWxrKGN1cnJlbnQ6IHRzLk5vZGUpOiB0cy5Ob2RlIHtcbiAgICAgICAgcmV0dXJuIHRzLmlzSWRlbnRpZmllcihjdXJyZW50KSAmJiBjdXJyZW50LnRleHQgPT09IG5hbWUgP1xuICAgICAgICAgICAgdHMuY3JlYXRlSWRlbnRpZmllcihjdXJyZW50LnRleHQpIDpcbiAgICAgICAgICAgIHRzLnZpc2l0RWFjaENoaWxkKGN1cnJlbnQsIHdhbGssIGNvbnRleHQpO1xuICAgICAgfSldKTtcblxuICByZXR1cm4gcmVzdWx0LnRyYW5zZm9ybWVkWzBdO1xufVxuIl19