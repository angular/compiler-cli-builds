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
    function generateSetClassMetadataCall(clazz, reflection, defaultImportRecorder, isCore, annotateForClosureCompiler) {
        if (!reflection.isClass(clazz)) {
            return null;
        }
        var id = ts.updateIdentifier(reflection.getAdjacentNameOfClass(clazz));
        // Reflect over the class decorators. If none are present, or those that are aren't from
        // Angular, then return null. Otherwise, turn them into metadata.
        var classDecorators = reflection.getDecoratorsOfDeclaration(clazz);
        if (classDecorators === null) {
            return null;
        }
        var ngClassDecorators = classDecorators.filter(function (dec) { return isAngularDecorator(dec, isCore); })
            .map(function (decorator) { return decoratorToMetadata(decorator, annotateForClosureCompiler); });
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
        var classMembers = reflection.getMembersOfClass(clazz).filter(function (member) { return !member.isStatic && member.decorators !== null && member.decorators.length > 0; });
        var duplicateDecoratedMemberNames = classMembers.map(function (member) { return member.name; }).filter(function (name, i, arr) { return arr.indexOf(name) < i; });
        if (duplicateDecoratedMemberNames.length > 0) {
            // This should theoretically never happen, because the only way to have duplicate instance
            // member names is getter/setter pairs and decorators cannot appear in both a getter and the
            // corresponding setter.
            throw new Error("Duplicate decorated properties found on class '" + clazz.name.text + "': " +
                duplicateDecoratedMemberNames.join(', '));
        }
        var decoratedMembers = classMembers.map(function (member) { return classMemberToMetadata(member.name, member.decorators, isCore); });
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
        ]);
        var iifeFn = new compiler_1.FunctionExpr([], [fnCall.toStmt()], compiler_1.NONE_TYPE);
        var iife = new compiler_1.InvokeFunctionExpr(
        /* fn */ iifeFn, 
        /* args */ [], 
        /* type */ undefined, 
        /* sourceSpan */ undefined, 
        /* pure */ true);
        return iife.toStmt();
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9tZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILDhDQUE2TTtJQUM3TSwrQkFBaUM7SUFLakMsNkVBQW1GO0lBSW5GOzs7Ozs7T0FNRztJQUNILFNBQWdCLDRCQUE0QixDQUN4QyxLQUFxQixFQUFFLFVBQTBCLEVBQUUscUJBQTRDLEVBQy9GLE1BQWUsRUFBRSwwQkFBb0M7UUFDdkQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDOUIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUV6RSx3RkFBd0Y7UUFDeEYsaUVBQWlFO1FBQ2pFLElBQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyRSxJQUFJLGVBQWUsS0FBSyxJQUFJLEVBQUU7WUFDNUIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQU0saUJBQWlCLEdBQ25CLGVBQWUsQ0FBQyxNQUFNLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEVBQS9CLENBQStCLENBQUM7YUFDekQsR0FBRyxDQUNBLFVBQUMsU0FBb0IsSUFBSyxPQUFBLG1CQUFtQixDQUFDLFNBQVMsRUFBRSwwQkFBMEIsQ0FBQyxFQUExRCxDQUEwRCxDQUFDLENBQUM7UUFDbEcsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ2xDLE9BQU8sSUFBSSxDQUFD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QUcsQ0FBQyxVQUFBLEdBQUc7Z0JBQ2pDLElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3JDLE9BQU8scUJBQXFCLENBQUMsQ0FBQyxDQUFDLHNDQUErQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDOUUsQ0FBQyxDQUFDLENBQUM7WUFDSCxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuRjtRQUNELE9BQU8sRUFBRSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMsa0JBQWtCLENBQUMsU0FBb0IsRUFBRSxNQUFlO1FBQy9ELE9BQU8sTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssZUFBZSxDQUFDLENBQUM7SUFDNUYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIEZ1bmN0aW9uRXhwciwgSWRlbnRpZmllcnMsIEludm9rZUZ1bmN0aW9uRXhwciwgTGl0ZXJhbEFycmF5RXhwciwgTGl0ZXJhbEV4cHIsIE5PTkVfVFlQRSwgUmV0dXJuU3RhdGVtZW50LCBTdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwciwgbGl0ZXJhbE1hcH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVmYXVsdEltcG9ydFJlY29yZGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Q3RvclBhcmFtZXRlciwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmltcG9ydCB7dmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24sIHdyYXBGdW5jdGlvbkV4cHJlc3Npb25zSW5QYXJlbnN9IGZyb20gJy4vdXRpbCc7XG5cblxuXG4vKipcbiAqIEdpdmVuIGEgY2xhc3MgZGVjbGFyYXRpb24sIGdlbmVyYXRlIGEgY2FsbCB0byBgc2V0Q2xhc3NNZXRhZGF0YWAgd2l0aCB0aGUgQW5ndWxhciBtZXRhZGF0YVxuICogcHJlc2VudCBvbiB0aGUgY2xhc3Mgb3IgaXRzIG1lbWJlciBmaWVsZHMuXG4gKlxuICogSWYgbm8gc3VjaCBtZXRhZGF0YSBpcyBwcmVzZW50LCB0aGlzIGZ1bmN0aW9uIHJldHVybnMgYG51bGxgLiBPdGhlcndpc2UsIHRoZSBjYWxsIGlzIHJldHVybmVkXG4gKiBhcyBhIGBTdGF0ZW1lbnRgIGZvciBpbmNsdXNpb24gYWxvbmcgd2l0aCB0aGUgY2xhc3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKFxuICAgIGNsYXp6OiB0cy5EZWNsYXJhdGlvbiwgcmVmbGVjdGlvbjogUmVmbGVjdGlvbkhvc3QsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgIGlzQ29yZTogYm9vbGVhbiwgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI/OiBib29sZWFuKTogU3RhdGVtZW50fG51bGwge1xuICBpZiAoIXJlZmxlY3Rpb24uaXNDbGFzcyhjbGF6eikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBpZCA9IHRzLnVwZGF0ZUlkZW50aWZpZXIocmVmbGVjdGlvbi5nZXRBZGphY2VudE5hbWVPZkNsYXNzKGNsYXp6KSk7XG5cbiAgLy8gUmVmbGVjdCBvdmVyIHRoZSBjbGFzcyBkZWNvcmF0b3JzLiBJZiBub25lIGFyZSBwcmVzZW50LCBvciB0aG9zZSB0aGF0IGFyZSBhcmVuJ3QgZnJvbVxuICAvLyBBbmd1bGFyLCB0aGVuIHJldHVybiBudWxsLiBPdGhlcndpc2UsIHR1cm4gdGhlbSBpbnRvIG1ldGFkYXRhLlxuICBjb25zdCBjbGFzc0RlY29yYXRvcnMgPSByZWZsZWN0aW9uLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGNsYXp6KTtcbiAgaWYgKGNsYXNzRGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG5nQ2xhc3NEZWNvcmF0b3JzID1cbiAgICAgIGNsYXNzRGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IGlzQW5ndWxhckRlY29yYXRvcihkZWMsIGlzQ29yZSkpXG4gICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgKGRlY29yYXRvcjogRGVjb3JhdG9yKSA9PiBkZWNvcmF0b3JUb01ldGFkYXRhKGRlY29yYXRvciwgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpKTtcbiAgaWYgKG5nQ2xhc3NEZWNvcmF0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG1ldGFEZWNvcmF0b3JzID0gdHMuY3JlYXRlQXJyYXlMaXRlcmFsKG5nQ2xhc3NEZWNvcmF0b3JzKTtcblxuICAvLyBDb252ZXJ0IHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIHRvIG1ldGFkYXRhLCBwYXNzaW5nIG51bGwgaWYgbm9uZSBhcmUgcHJlc2VudC5cbiAgbGV0IG1ldGFDdG9yUGFyYW1ldGVyczogRXhwcmVzc2lvbiA9IG5ldyBMaXRlcmFsRXhwcihudWxsKTtcbiAgY29uc3QgY2xhc3NDdG9yUGFyYW1ldGVycyA9IHJlZmxlY3Rpb24uZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6KTtcbiAgaWYgKGNsYXNzQ3RvclBhcmFtZXRlcnMgIT09IG51bGwpIHtcbiAgICBjb25zdCBjdG9yUGFyYW1ldGVycyA9IGNsYXNzQ3RvclBhcmFtZXRlcnMubWFwKFxuICAgICAgICBwYXJhbSA9PiBjdG9yUGFyYW1ldGVyVG9NZXRhZGF0YShwYXJhbSwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmUpKTtcbiAgICBtZXRhQ3RvclBhcmFtZXRlcnMgPSBuZXcgRnVuY3Rpb25FeHByKFtdLCBbXG4gICAgICBuZXcgUmV0dXJuU3RhdGVtZW50KG5ldyBMaXRlcmFsQXJyYXlFeHByKGN0b3JQYXJhbWV0ZXJzKSksXG4gICAgXSk7XG4gIH1cblxuICAvLyBEbyB0aGUgc2FtZSBmb3IgcHJvcGVydHkgZGVjb3JhdG9ycy5cbiAgbGV0IG1ldGFQcm9wRGVjb3JhdG9yczogdHMuRXhwcmVzc2lvbiA9IHRzLmNyZWF0ZU51bGwoKTtcbiAgY29uc3QgY2xhc3NNZW1iZXJzID0gcmVmbGVjdGlvbi5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eikuZmlsdGVyKFxuICAgICAgbWVtYmVyID0+ICFtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLmRlY29yYXRvcnMgIT09IG51bGwgJiYgbWVtYmVyLmRlY29yYXRvcnMubGVuZ3RoID4gMCk7XG4gIGNvbnN0IGR1cGxpY2F0ZURlY29yYXRlZE1lbWJlck5hbWVzID1cbiAgICAgIGNsYXNzTWVtYmVycy5tYXAobWVtYmVyID0+IG1lbWJlci5uYW1lKS5maWx0ZXIoKG5hbWUsIGksIGFycikgPT4gYXJyLmluZGV4T2YobmFtZSkgPCBpKTtcbiAgaWYgKGR1cGxpY2F0ZURlY29yYXRlZE1lbWJlck5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAvLyBUaGlzIHNob3VsZCB0aGVvcmV0aWNhbGx5IG5ldmVyIGhhcHBlbiwgYmVjYXVzZSB0aGUgb25seSB3YXkgdG8gaGF2ZSBkdXBsaWNhdGUgaW5zdGFuY2VcbiAgICAvLyBtZW1iZXIgbmFtZXMgaXMgZ2V0dGVyL3NldHRlciBwYWlycyBhbmQgZGVjb3JhdG9ycyBjYW5ub3QgYXBwZWFyIGluIGJvdGggYSBnZXR0ZXIgYW5kIHRoZVxuICAgIC8vIGNvcnJlc3BvbmRpbmcgc2V0dGVyLlxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYER1cGxpY2F0ZSBkZWNvcmF0ZWQgcHJvcGVydGllcyBmb3VuZCBvbiBjbGFzcyAnJHtjbGF6ei5uYW1lLnRleHR9JzogYCArXG4gICAgICAgIGR1cGxpY2F0ZURlY29yYXRlZE1lbWJlck5hbWVzLmpvaW4oJywgJykpO1xuICB9XG4gIGNvbnN0IGRlY29yYXRlZE1lbWJlcnMgPVxuICAgICAgY2xhc3NNZW1iZXJzLm1hcChtZW1iZXIgPT4gY2xhc3NNZW1iZXJUb01ldGFkYXRhKG1lbWJlci5uYW1lLCBtZW1iZXIuZGVjb3JhdG9ycyAhLCBpc0NvcmUpKTtcbiAgaWYgKGRlY29yYXRlZE1lbWJlcnMubGVuZ3RoID4gMCkge1xuICAgIG1ldGFQcm9wRGVjb3JhdG9ycyA9IHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoZGVjb3JhdGVkTWVtYmVycyk7XG4gIH1cblxuICAvLyBHZW5lcmF0ZSBhIHB1cmUgY2FsbCB0byBzZXRDbGFzc01ldGFkYXRhIHdpdGggdGhlIGNsYXNzIGlkZW50aWZpZXIgYW5kIGl0cyBtZXRhZGF0YS5cbiAgY29uc3Qgc2V0Q2xhc3NNZXRhZGF0YSA9IG5ldyBFeHRlcm5hbEV4cHIoSWRlbnRpZmllcnMuc2V0Q2xhc3NNZXRhZGF0YSk7XG4gIGNvbnN0IGZuQ2FsbCA9IG5ldyBJbnZva2VGdW5jdGlvbkV4cHIoXG4gICAgICAvKiBmbiAqLyBzZXRDbGFzc01ldGFkYXRhLFxuICAgICAgLyogYXJncyAqL1xuICAgICAgW1xuICAgICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKGlkKSxcbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhRGVjb3JhdG9ycyksXG4gICAgICAgIG1ldGFDdG9yUGFyYW1ldGVycyxcbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhUHJvcERlY29yYXRvcnMpLFxuICAgICAgXSk7XG4gIGNvbnN0IGlpZmVGbiA9IG5ldyBGdW5jdGlvbkV4cHIoW10sIFtmbkNhbGwudG9TdG10KCldLCBOT05FX1RZUEUpO1xuICBjb25zdCBpaWZlID0gbmV3IEludm9rZUZ1bmN0aW9uRXhwcihcbiAgICAgIC8qIGZuICovIGlpZmVGbixcbiAgICAgIC8qIGFyZ3MgKi9bXSxcbiAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogc291cmNlU3BhbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBwdXJlICovIHRydWUpO1xuICByZXR1cm4gaWlmZS50b1N0bXQoKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgcmVmbGVjdGVkIGNvbnN0cnVjdG9yIHBhcmFtZXRlciB0byBtZXRhZGF0YS5cbiAqL1xuZnVuY3Rpb24gY3RvclBhcmFtZXRlclRvTWV0YWRhdGEoXG4gICAgcGFyYW06IEN0b3JQYXJhbWV0ZXIsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgIGlzQ29yZTogYm9vbGVhbik6IEV4cHJlc3Npb24ge1xuICAvLyBQYXJhbWV0ZXJzIHNvbWV0aW1lcyBoYXZlIGEgdHlwZSB0aGF0IGNhbiBiZSByZWZlcmVuY2VkLiBJZiBzbywgdGhlbiB1c2UgaXQsIG90aGVyd2lzZVxuICAvLyBpdHMgdHlwZSBpcyB1bmRlZmluZWQuXG4gIGNvbnN0IHR5cGUgPSBwYXJhbS50eXBlVmFsdWVSZWZlcmVuY2UgIT09IG51bGwgP1xuICAgICAgdmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24ocGFyYW0udHlwZVZhbHVlUmVmZXJlbmNlLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIpIDpcbiAgICAgIG5ldyBMaXRlcmFsRXhwcih1bmRlZmluZWQpO1xuXG4gIGNvbnN0IG1hcEVudHJpZXM6IHtrZXk6IHN0cmluZywgdmFsdWU6IEV4cHJlc3Npb24sIHF1b3RlZDogZmFsc2V9W10gPSBbXG4gICAge2tleTogJ3R5cGUnLCB2YWx1ZTogdHlwZSwgcXVvdGVkOiBmYWxzZX0sXG4gIF07XG5cbiAgLy8gSWYgdGhlIHBhcmFtZXRlciBoYXMgZGVjb3JhdG9ycywgaW5jbHVkZSB0aGUgb25lcyBmcm9tIEFuZ3VsYXIuXG4gIGlmIChwYXJhbS5kZWNvcmF0b3JzICE9PSBudWxsKSB7XG4gICAgY29uc3QgbmdEZWNvcmF0b3JzID0gcGFyYW0uZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IGlzQW5ndWxhckRlY29yYXRvcihkZWMsIGlzQ29yZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoKGRlY29yYXRvcjogRGVjb3JhdG9yKSA9PiBkZWNvcmF0b3JUb01ldGFkYXRhKGRlY29yYXRvcikpO1xuICAgIGNvbnN0IHZhbHVlID0gbmV3IFdyYXBwZWROb2RlRXhwcih0cy5jcmVhdGVBcnJheUxpdGVyYWwobmdEZWNvcmF0b3JzKSk7XG4gICAgbWFwRW50cmllcy5wdXNoKHtrZXk6ICdkZWNvcmF0b3JzJywgdmFsdWUsIHF1b3RlZDogZmFsc2V9KTtcbiAgfVxuICByZXR1cm4gbGl0ZXJhbE1hcChtYXBFbnRyaWVzKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgcmVmbGVjdGVkIGNsYXNzIG1lbWJlciB0byBtZXRhZGF0YS5cbiAqL1xuZnVuY3Rpb24gY2xhc3NNZW1iZXJUb01ldGFkYXRhKFxuICAgIG5hbWU6IHN0cmluZywgZGVjb3JhdG9yczogRGVjb3JhdG9yW10sIGlzQ29yZTogYm9vbGVhbik6IHRzLlByb3BlcnR5QXNzaWdubWVudCB7XG4gIGNvbnN0IG5nRGVjb3JhdG9ycyA9IGRlY29yYXRvcnMuZmlsdGVyKGRlYyA9PiBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjLCBpc0NvcmUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCgoZGVjb3JhdG9yOiBEZWNvcmF0b3IpID0+IGRlY29yYXRvclRvTWV0YWRhdGEoZGVjb3JhdG9yKSk7XG4gIGNvbnN0IGRlY29yYXRvck1ldGEgPSB0cy5jcmVhdGVBcnJheUxpdGVyYWwobmdEZWNvcmF0b3JzKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChuYW1lLCBkZWNvcmF0b3JNZXRhKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgcmVmbGVjdGVkIGRlY29yYXRvciB0byBtZXRhZGF0YS5cbiAqL1xuZnVuY3Rpb24gZGVjb3JhdG9yVG9NZXRhZGF0YShcbiAgICBkZWNvcmF0b3I6IERlY29yYXRvciwgd3JhcEZ1bmN0aW9uc0luUGFyZW5zPzogYm9vbGVhbik6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uIHtcbiAgaWYgKGRlY29yYXRvci5pZGVudGlmaWVyID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbGxlZ2FsIHN0YXRlOiBzeW50aGVzaXplZCBkZWNvcmF0b3IgY2Fubm90IGJlIGVtaXR0ZWQgaW4gY2xhc3MgbWV0YWRhdGEuJyk7XG4gIH1cbiAgLy8gRGVjb3JhdG9ycyBoYXZlIGEgdHlwZS5cbiAgY29uc3QgcHJvcGVydGllczogdHMuT2JqZWN0TGl0ZXJhbEVsZW1lbnRMaWtlW10gPSBbXG4gICAgdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KCd0eXBlJywgdHMuZ2V0TXV0YWJsZUNsb25lKGRlY29yYXRvci5pZGVudGlmaWVyKSksXG4gIF07XG4gIC8vIFNvbWV0aW1lcyB0aGV5IGhhdmUgYXJndW1lbnRzLlxuICBpZiAoZGVjb3JhdG9yLmFyZ3MgIT09IG51bGwgJiYgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGFyZ3MgPSBkZWNvcmF0b3IuYXJncy5tYXAoYXJnID0+IHtcbiAgICAgIGNvbnN0IGV4cHIgPSB0cy5nZXRNdXRhYmxlQ2xvbmUoYXJnKTtcbiAgICAgIHJldHVybiB3cmFwRnVuY3Rpb25zSW5QYXJlbnMgPyB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zKGV4cHIpIDogZXhwcjtcbiAgICB9KTtcbiAgICBwcm9wZXJ0aWVzLnB1c2godHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KCdhcmdzJywgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKGFyZ3MpKSk7XG4gIH1cbiAgcmV0dXJuIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwocHJvcGVydGllcywgdHJ1ZSk7XG59XG5cbi8qKlxuICogV2hldGhlciBhIGdpdmVuIGRlY29yYXRvciBzaG91bGQgYmUgdHJlYXRlZCBhcyBhbiBBbmd1bGFyIGRlY29yYXRvci5cbiAqXG4gKiBFaXRoZXIgaXQncyB1c2VkIGluIEBhbmd1bGFyL2NvcmUsIG9yIGl0J3MgaW1wb3J0ZWQgZnJvbSB0aGVyZS5cbiAqL1xuZnVuY3Rpb24gaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcjogRGVjb3JhdG9yLCBpc0NvcmU6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgcmV0dXJuIGlzQ29yZSB8fCAoZGVjb3JhdG9yLmltcG9ydCAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuaW1wb3J0LmZyb20gPT09ICdAYW5ndWxhci9jb3JlJyk7XG59XG4iXX0=