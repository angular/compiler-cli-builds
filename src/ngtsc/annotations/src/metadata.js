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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/metadata", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Given a class declaration, generate a call to `setClassMetadata` with the Angular metadata
     * present on the class or its member fields.
     *
     * If no such metadata is present, this function returns `null`. Otherwise, the call is returned
     * as a `Statement` for inclusion along with the class.
     */
    function generateSetClassMetadataCall(clazz, reflection, defaultImportRecorder, isCore) {
        if (!reflection.isClass(clazz) || clazz.name === undefined || !ts.isIdentifier(clazz.name)) {
            return null;
        }
        var id = ts.updateIdentifier(clazz.name);
        // Reflect over the class decorators. If none are present, or those that are aren't from
        // Angular, then return null. Otherwise, turn them into metadata.
        var classDecorators = reflection.getDecoratorsOfDeclaration(clazz);
        if (classDecorators === null) {
            return null;
        }
        var ngClassDecorators = classDecorators.filter(function (dec) { return isAngularDecorator(dec, isCore); }).map(decoratorToMetadata);
        if (ngClassDecorators.length === 0) {
            return null;
        }
        var metaDecorators = ts.createArrayLiteral(ngClassDecorators);
        // Convert the constructor parameters to metadata, passing null if none are present.
        var metaCtorParameters = new compiler_1.LiteralExpr(null);
        var classCtorParameters = reflection.getConstructorParameters(clazz);
        if (classCtorParameters !== null) {
            var ctorParameters = classCtorParameters.map(function (param) { return ctorParameterToMetadata(param, defaultImportRecorder, isCore); });
            metaCtorParameters = new compiler_1.FunctionExpr([], [
                new compiler_1.ReturnStatement(new compiler_1.LiteralArrayExpr(ctorParameters)),
            ]);
        }
        // Do the same for property decorators.
        var metaPropDecorators = ts.createNull();
        var decoratedMembers = reflection.getMembersOfClass(clazz)
            .filter(function (member) { return !member.isStatic && member.decorators !== null; })
            .map(function (member) { return classMemberToMetadata(member.name, member.decorators, isCore); });
        if (decoratedMembers.length > 0) {
            metaPropDecorators = ts.createObjectLiteral(decoratedMembers);
        }
        // Generate a pure call to setClassMetadata with the class identifier and its metadata.
        var setClassMetadata = new compiler_1.ExternalExpr(compiler_1.Identifiers.setClassMetadata);
        var fnCall = new compiler_1.InvokeFunctionExpr(
        /* fn */ setClassMetadata, 
        /* args */
        [
            new compiler_1.WrappedNodeExpr(id),
            new compiler_1.WrappedNodeExpr(metaDecorators),
            metaCtorParameters,
            new compiler_1.WrappedNodeExpr(metaPropDecorators),
        ], 
        /* type */ undefined, 
        /* sourceSpan */ undefined, 
        /* pure */ true);
        return fnCall.toStmt();
    }
    exports.generateSetClassMetadataCall = generateSetClassMetadataCall;
    /**
     * Convert a reflected constructor parameter to metadata.
     */
    function ctorParameterToMetadata(param, defaultImportRecorder, isCore) {
        // Parameters sometimes have a type that can be referenced. If so, then use it, otherwise
        // its type is undefined.
        var type = param.typeValueReference !== null ?
            util_1.valueReferenceToExpression(param.typeValueReference, defaultImportRecorder) :
            new compiler_1.LiteralExpr(undefined);
        var mapEntries = [
            { key: 'type', value: type, quoted: false },
        ];
        // If the parameter has decorators, include the ones from Angular.
        if (param.decorators !== null) {
            var ngDecorators = param.decorators.filter(function (dec) { return isAngularDecorator(dec, isCore); }).map(decoratorToMetadata);
            var value = new compiler_1.WrappedNodeExpr(ts.createArrayLiteral(ngDecorators));
            mapEntries.push({ key: 'decorators', value: value, quoted: false });
        }
        return compiler_1.literalMap(mapEntries);
    }
    /**
     * Convert a reflected class member to metadata.
     */
    function classMemberToMetadata(name, decorators, isCore) {
        var ngDecorators = decorators.filter(function (dec) { return isAngularDecorator(dec, isCore); }).map(decoratorToMetadata);
        var decoratorMeta = ts.createArrayLiteral(ngDecorators);
        return ts.createPropertyAssignment(name, decoratorMeta);
    }
    /**
     * Convert a reflected decorator to metadata.
     */
    function decoratorToMetadata(decorator) {
        // Decorators have a type.
        var properties = [
            ts.createPropertyAssignment('type', ts.updateIdentifier(decorator.identifier)),
        ];
        // Sometimes they have arguments.
        if (decorator.args !== null && decorator.args.length > 0) {
            var args = decorator.args.map(function (arg) { return ts.getMutableClone(arg); });
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9tZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILDhDQUFrTTtJQUNsTSwrQkFBaUM7SUFLakMsNkVBQWtEO0lBR2xEOzs7Ozs7T0FNRztJQUNILFNBQWdCLDRCQUE0QixDQUN4QyxLQUFxQixFQUFFLFVBQTBCLEVBQUUscUJBQTRDLEVBQy9GLE1BQWU7UUFDakIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxTQUFTLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMxRixPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsSUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUzQyx3RkFBd0Y7UUFDeEYsaUVBQWlFO1FBQ2pFLElBQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyRSxJQUFJLGVBQWUsS0FBSyxJQUFJLEVBQUU7WUFDNUIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQU0saUJBQWlCLEdBQ25CLGVBQWUsQ0FBQyxNQUFNLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEVBQS9CLENBQStCLENBQUMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUM1RixJQUFJLGlCQUFpQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDbEMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNE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QUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEVBQUUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQXZCLENBQXVCLENBQUMsQ0FBQztZQUNoRSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuRjtRQUNELE9BQU8sRUFBRSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMsa0JBQWtCLENBQUMsU0FBb0IsRUFBRSxNQUFlO1FBQy9ELE9BQU8sTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssZUFBZSxDQUFDLENBQUM7SUFDNUYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIEZ1bmN0aW9uRXhwciwgSWRlbnRpZmllcnMsIEludm9rZUZ1bmN0aW9uRXhwciwgTGl0ZXJhbEFycmF5RXhwciwgTGl0ZXJhbEV4cHIsIFJldHVyblN0YXRlbWVudCwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIGxpdGVyYWxNYXB9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0N0b3JQYXJhbWV0ZXIsIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG5pbXBvcnQge3ZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9ufSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogR2l2ZW4gYSBjbGFzcyBkZWNsYXJhdGlvbiwgZ2VuZXJhdGUgYSBjYWxsIHRvIGBzZXRDbGFzc01ldGFkYXRhYCB3aXRoIHRoZSBBbmd1bGFyIG1ldGFkYXRhXG4gKiBwcmVzZW50IG9uIHRoZSBjbGFzcyBvciBpdHMgbWVtYmVyIGZpZWxkcy5cbiAqXG4gKiBJZiBubyBzdWNoIG1ldGFkYXRhIGlzIHByZXNlbnQsIHRoaXMgZnVuY3Rpb24gcmV0dXJucyBgbnVsbGAuIE90aGVyd2lzZSwgdGhlIGNhbGwgaXMgcmV0dXJuZWRcbiAqIGFzIGEgYFN0YXRlbWVudGAgZm9yIGluY2x1c2lvbiBhbG9uZyB3aXRoIHRoZSBjbGFzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwoXG4gICAgY2xheno6IHRzLkRlY2xhcmF0aW9uLCByZWZsZWN0aW9uOiBSZWZsZWN0aW9uSG9zdCwgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsXG4gICAgaXNDb3JlOiBib29sZWFuKTogU3RhdGVtZW50fG51bGwge1xuICBpZiAoIXJlZmxlY3Rpb24uaXNDbGFzcyhjbGF6eikgfHwgY2xhenoubmFtZSA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0lkZW50aWZpZXIoY2xhenoubmFtZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBpZCA9IHRzLnVwZGF0ZUlkZW50aWZpZXIoY2xhenoubmFtZSk7XG5cbiAgLy8gUmVmbGVjdCBvdmVyIHRoZSBjbGFzcyBkZWNvcmF0b3JzLiBJZiBub25lIGFyZSBwcmVzZW50LCBvciB0aG9zZSB0aGF0IGFyZSBhcmVuJ3QgZnJvbVxuICAvLyBBbmd1bGFyLCB0aGVuIHJldHVybiBudWxsLiBPdGhlcndpc2UsIHR1cm4gdGhlbSBpbnRvIG1ldGFkYXRhLlxuICBjb25zdCBjbGFzc0RlY29yYXRvcnMgPSByZWZsZWN0aW9uLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGNsYXp6KTtcbiAgaWYgKGNsYXNzRGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG5nQ2xhc3NEZWNvcmF0b3JzID1cbiAgICAgIGNsYXNzRGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IGlzQW5ndWxhckRlY29yYXRvcihkZWMsIGlzQ29yZSkpLm1hcChkZWNvcmF0b3JUb01ldGFkYXRhKTtcbiAgaWYgKG5nQ2xhc3NEZWNvcmF0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG1ldGFEZWNvcmF0b3JzID0gdHMuY3JlYXRlQXJyYXlMaXRlcmFsKG5nQ2xhc3NEZWNvcmF0b3JzKTtcblxuICAvLyBDb252ZXJ0IHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIHRvIG1ldGFkYXRhLCBwYXNzaW5nIG51bGwgaWYgbm9uZSBhcmUgcHJlc2VudC5cbiAgbGV0IG1ldGFDdG9yUGFyYW1ldGVyczogRXhwcmVzc2lvbiA9IG5ldyBMaXRlcmFsRXhwcihudWxsKTtcbiAgY29uc3QgY2xhc3NDdG9yUGFyYW1ldGVycyA9IHJlZmxlY3Rpb24uZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6KTtcbiAgaWYgKGNsYXNzQ3RvclBhcmFtZXRlcnMgIT09IG51bGwpIHtcbiAgICBjb25zdCBjdG9yUGFyYW1ldGVycyA9IGNsYXNzQ3RvclBhcmFtZXRlcnMubWFwKFxuICAgICAgICBwYXJhbSA9PiBjdG9yUGFyYW1ldGVyVG9NZXRhZGF0YShwYXJhbSwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmUpKTtcbiAgICBtZXRhQ3RvclBhcmFtZXRlcnMgPSBuZXcgRnVuY3Rpb25FeHByKFtdLCBbXG4gICAgICBuZXcgUmV0dXJuU3RhdGVtZW50KG5ldyBMaXRlcmFsQXJyYXlFeHByKGN0b3JQYXJhbWV0ZXJzKSksXG4gICAgXSk7XG4gIH1cblxuICAvLyBEbyB0aGUgc2FtZSBmb3IgcHJvcGVydHkgZGVjb3JhdG9ycy5cbiAgbGV0IG1ldGFQcm9wRGVjb3JhdG9yczogdHMuRXhwcmVzc2lvbiA9IHRzLmNyZWF0ZU51bGwoKTtcbiAgY29uc3QgZGVjb3JhdGVkTWVtYmVycyA9XG4gICAgICByZWZsZWN0aW9uLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KVxuICAgICAgICAgIC5maWx0ZXIobWVtYmVyID0+ICFtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLmRlY29yYXRvcnMgIT09IG51bGwpXG4gICAgICAgICAgLm1hcChtZW1iZXIgPT4gY2xhc3NNZW1iZXJUb01ldGFkYXRhKG1lbWJlci5uYW1lLCBtZW1iZXIuZGVjb3JhdG9ycyAhLCBpc0NvcmUpKTtcbiAgaWYgKGRlY29yYXRlZE1lbWJlcnMubGVuZ3RoID4gMCkge1xuICAgIG1ldGFQcm9wRGVjb3JhdG9ycyA9IHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoZGVjb3JhdGVkTWVtYmVycyk7XG4gIH1cblxuICAvLyBHZW5lcmF0ZSBhIHB1cmUgY2FsbCB0byBzZXRDbGFzc01ldGFkYXRhIHdpdGggdGhlIGNsYXNzIGlkZW50aWZpZXIgYW5kIGl0cyBtZXRhZGF0YS5cbiAgY29uc3Qgc2V0Q2xhc3NNZXRhZGF0YSA9IG5ldyBFeHRlcm5hbEV4cHIoSWRlbnRpZmllcnMuc2V0Q2xhc3NNZXRhZGF0YSk7XG4gIGNvbnN0IGZuQ2FsbCA9IG5ldyBJbnZva2VGdW5jdGlvbkV4cHIoXG4gICAgICAvKiBmbiAqLyBzZXRDbGFzc01ldGFkYXRhLFxuICAgICAgLyogYXJncyAqL1xuICAgICAgW1xuICAgICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKGlkKSxcbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhRGVjb3JhdG9ycyksXG4gICAgICAgIG1ldGFDdG9yUGFyYW1ldGVycyxcbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhUHJvcERlY29yYXRvcnMpLFxuICAgICAgXSxcbiAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogc291cmNlU3BhbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBwdXJlICovIHRydWUpO1xuICByZXR1cm4gZm5DYWxsLnRvU3RtdCgpO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSByZWZsZWN0ZWQgY29uc3RydWN0b3IgcGFyYW1ldGVyIHRvIG1ldGFkYXRhLlxuICovXG5mdW5jdGlvbiBjdG9yUGFyYW1ldGVyVG9NZXRhZGF0YShcbiAgICBwYXJhbTogQ3RvclBhcmFtZXRlciwgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsXG4gICAgaXNDb3JlOiBib29sZWFuKTogRXhwcmVzc2lvbiB7XG4gIC8vIFBhcmFtZXRlcnMgc29tZXRpbWVzIGhhdmUgYSB0eXBlIHRoYXQgY2FuIGJlIHJlZmVyZW5jZWQuIElmIHNvLCB0aGVuIHVzZSBpdCwgb3RoZXJ3aXNlXG4gIC8vIGl0cyB0eXBlIGlzIHVuZGVmaW5lZC5cbiAgY29uc3QgdHlwZSA9IHBhcmFtLnR5cGVWYWx1ZVJlZmVyZW5jZSAhPT0gbnVsbCA/XG4gICAgICB2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbihwYXJhbS50eXBlVmFsdWVSZWZlcmVuY2UsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcikgOlxuICAgICAgbmV3IExpdGVyYWxFeHByKHVuZGVmaW5lZCk7XG5cbiAgY29uc3QgbWFwRW50cmllczoge2tleTogc3RyaW5nLCB2YWx1ZTogRXhwcmVzc2lvbiwgcXVvdGVkOiBmYWxzZX1bXSA9IFtcbiAgICB7a2V5OiAndHlwZScsIHZhbHVlOiB0eXBlLCBxdW90ZWQ6IGZhbHNlfSxcbiAgXTtcblxuICAvLyBJZiB0aGUgcGFyYW1ldGVyIGhhcyBkZWNvcmF0b3JzLCBpbmNsdWRlIHRoZSBvbmVzIGZyb20gQW5ndWxhci5cbiAgaWYgKHBhcmFtLmRlY29yYXRvcnMgIT09IG51bGwpIHtcbiAgICBjb25zdCBuZ0RlY29yYXRvcnMgPVxuICAgICAgICBwYXJhbS5kZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4gaXNBbmd1bGFyRGVjb3JhdG9yKGRlYywgaXNDb3JlKSkubWFwKGRlY29yYXRvclRvTWV0YWRhdGEpO1xuICAgIGNvbnN0IHZhbHVlID0gbmV3IFdyYXBwZWROb2RlRXhwcih0cy5jcmVhdGVBcnJheUxpdGVyYWwobmdEZWNvcmF0b3JzKSk7XG4gICAgbWFwRW50cmllcy5wdXNoKHtrZXk6ICdkZWNvcmF0b3JzJywgdmFsdWUsIHF1b3RlZDogZmFsc2V9KTtcbiAgfVxuICByZXR1cm4gbGl0ZXJhbE1hcChtYXBFbnRyaWVzKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgcmVmbGVjdGVkIGNsYXNzIG1lbWJlciB0byBtZXRhZGF0YS5cbiAqL1xuZnVuY3Rpb24gY2xhc3NNZW1iZXJUb01ldGFkYXRhKFxuICAgIG5hbWU6IHN0cmluZywgZGVjb3JhdG9yczogRGVjb3JhdG9yW10sIGlzQ29yZTogYm9vbGVhbik6IHRzLlByb3BlcnR5QXNzaWdubWVudCB7XG4gIGNvbnN0IG5nRGVjb3JhdG9ycyA9XG4gICAgICBkZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4gaXNBbmd1bGFyRGVjb3JhdG9yKGRlYywgaXNDb3JlKSkubWFwKGRlY29yYXRvclRvTWV0YWRhdGEpO1xuICBjb25zdCBkZWNvcmF0b3JNZXRhID0gdHMuY3JlYXRlQXJyYXlMaXRlcmFsKG5nRGVjb3JhdG9ycyk7XG4gIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQobmFtZSwgZGVjb3JhdG9yTWV0YSk7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHJlZmxlY3RlZCBkZWNvcmF0b3IgdG8gbWV0YWRhdGEuXG4gKi9cbmZ1bmN0aW9uIGRlY29yYXRvclRvTWV0YWRhdGEoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiB7XG4gIC8vIERlY29yYXRvcnMgaGF2ZSBhIHR5cGUuXG4gIGNvbnN0IHByb3BlcnRpZXM6IHRzLk9iamVjdExpdGVyYWxFbGVtZW50TGlrZVtdID0gW1xuICAgIHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudCgndHlwZScsIHRzLnVwZGF0ZUlkZW50aWZpZXIoZGVjb3JhdG9yLmlkZW50aWZpZXIpKSxcbiAgXTtcbiAgLy8gU29tZXRpbWVzIHRoZXkgaGF2ZSBhcmd1bWVudHMuXG4gIGlmIChkZWNvcmF0b3IuYXJncyAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgYXJncyA9IGRlY29yYXRvci5hcmdzLm1hcChhcmcgPT4gdHMuZ2V0TXV0YWJsZUNsb25lKGFyZykpO1xuICAgIHByb3BlcnRpZXMucHVzaCh0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoJ2FyZ3MnLCB0cy5jcmVhdGVBcnJheUxpdGVyYWwoYXJncykpKTtcbiAgfVxuICByZXR1cm4gdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChwcm9wZXJ0aWVzLCB0cnVlKTtcbn1cblxuLyoqXG4gKiBXaGV0aGVyIGEgZ2l2ZW4gZGVjb3JhdG9yIHNob3VsZCBiZSB0cmVhdGVkIGFzIGFuIEFuZ3VsYXIgZGVjb3JhdG9yLlxuICpcbiAqIEVpdGhlciBpdCdzIHVzZWQgaW4gQGFuZ3VsYXIvY29yZSwgb3IgaXQncyBpbXBvcnRlZCBmcm9tIHRoZXJlLlxuICovXG5mdW5jdGlvbiBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGlzQ29yZTogYm9vbGVhbik6IGJvb2xlYW4ge1xuICByZXR1cm4gaXNDb3JlIHx8IChkZWNvcmF0b3IuaW1wb3J0ICE9PSBudWxsICYmIGRlY29yYXRvci5pbXBvcnQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnKTtcbn1cbiJdfQ==