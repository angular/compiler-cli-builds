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
    exports.generateSetClassMetadataCall = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9tZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBNk07SUFDN00sK0JBQWlDO0lBS2pDLDZFQUFtRjtJQUduRjs7Ozs7O09BTUc7SUFDSCxTQUFnQiw0QkFBNEIsQ0FDeEMsS0FBcUIsRUFBRSxVQUEwQixFQUFFLHFCQUE0QyxFQUMvRixNQUFlLEVBQUUsMEJBQW9DO1FBQ3ZELElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQzlCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxJQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFekUsd0ZBQXdGO1FBQ3hGLGlFQUFpRTtRQUNqRSxJQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckUsSUFBSSxlQUFlLEtBQUssSUFBSSxFQUFFO1lBQzVCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxJQUFNLGlCQUFpQixHQUNuQixlQUFlLENBQUMsTUFBTSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsa0JBQWtCLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxFQUEvQixDQUErQixDQUFDO2FBQ3pELEdBQUcsQ0FDQSxVQUFDLFNBQW9CLElBQUssT0FBQSxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsMEJBQTBCLENBQUMsRUFBMUQsQ0FBMEQsQ0FBQyxDQUFDO1FBQ2xHLElBQUksaUJBQWlCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNsQyxPQUFPLElBQUksQ0FB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QUFHLENBQUMsVUFBQSxHQUFHO2dCQUNqQyxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNyQyxPQUFPLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxzQ0FBK0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzlFLENBQUMsQ0FBQyxDQUFDO1lBQ0gsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbkY7UUFDRCxPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLGtCQUFrQixDQUFDLFNBQW9CLEVBQUUsTUFBZTtRQUMvRCxPQUFPLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssSUFBSSxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLGVBQWUsQ0FBQyxDQUFDO0lBQzVGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBGdW5jdGlvbkV4cHIsIElkZW50aWZpZXJzLCBJbnZva2VGdW5jdGlvbkV4cHIsIExpdGVyYWxBcnJheUV4cHIsIExpdGVyYWxFeHByLCBsaXRlcmFsTWFwLCBOT05FX1RZUEUsIFJldHVyblN0YXRlbWVudCwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0N0b3JQYXJhbWV0ZXIsIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG5pbXBvcnQge3ZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9uLCB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zfSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogR2l2ZW4gYSBjbGFzcyBkZWNsYXJhdGlvbiwgZ2VuZXJhdGUgYSBjYWxsIHRvIGBzZXRDbGFzc01ldGFkYXRhYCB3aXRoIHRoZSBBbmd1bGFyIG1ldGFkYXRhXG4gKiBwcmVzZW50IG9uIHRoZSBjbGFzcyBvciBpdHMgbWVtYmVyIGZpZWxkcy5cbiAqXG4gKiBJZiBubyBzdWNoIG1ldGFkYXRhIGlzIHByZXNlbnQsIHRoaXMgZnVuY3Rpb24gcmV0dXJucyBgbnVsbGAuIE90aGVyd2lzZSwgdGhlIGNhbGwgaXMgcmV0dXJuZWRcbiAqIGFzIGEgYFN0YXRlbWVudGAgZm9yIGluY2x1c2lvbiBhbG9uZyB3aXRoIHRoZSBjbGFzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwoXG4gICAgY2xheno6IHRzLkRlY2xhcmF0aW9uLCByZWZsZWN0aW9uOiBSZWZsZWN0aW9uSG9zdCwgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsXG4gICAgaXNDb3JlOiBib29sZWFuLCBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcj86IGJvb2xlYW4pOiBTdGF0ZW1lbnR8bnVsbCB7XG4gIGlmICghcmVmbGVjdGlvbi5pc0NsYXNzKGNsYXp6KSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IGlkID0gdHMudXBkYXRlSWRlbnRpZmllcihyZWZsZWN0aW9uLmdldEFkamFjZW50TmFtZU9mQ2xhc3MoY2xhenopKTtcblxuICAvLyBSZWZsZWN0IG92ZXIgdGhlIGNsYXNzIGRlY29yYXRvcnMuIElmIG5vbmUgYXJlIHByZXNlbnQsIG9yIHRob3NlIHRoYXQgYXJlIGFyZW4ndCBmcm9tXG4gIC8vIEFuZ3VsYXIsIHRoZW4gcmV0dXJuIG51bGwuIE90aGVyd2lzZSwgdHVybiB0aGVtIGludG8gbWV0YWRhdGEuXG4gIGNvbnN0IGNsYXNzRGVjb3JhdG9ycyA9IHJlZmxlY3Rpb24uZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oY2xhenopO1xuICBpZiAoY2xhc3NEZWNvcmF0b3JzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgbmdDbGFzc0RlY29yYXRvcnMgPVxuICAgICAgY2xhc3NEZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4gaXNBbmd1bGFyRGVjb3JhdG9yKGRlYywgaXNDb3JlKSlcbiAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAoZGVjb3JhdG9yOiBEZWNvcmF0b3IpID0+IGRlY29yYXRvclRvTWV0YWRhdGEoZGVjb3JhdG9yLCBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcikpO1xuICBpZiAobmdDbGFzc0RlY29yYXRvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgbWV0YURlY29yYXRvcnMgPSB0cy5jcmVhdGVBcnJheUxpdGVyYWwobmdDbGFzc0RlY29yYXRvcnMpO1xuXG4gIC8vIENvbnZlcnQgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgdG8gbWV0YWRhdGEsIHBhc3NpbmcgbnVsbCBpZiBub25lIGFyZSBwcmVzZW50LlxuICBsZXQgbWV0YUN0b3JQYXJhbWV0ZXJzOiBFeHByZXNzaW9uID0gbmV3IExpdGVyYWxFeHByKG51bGwpO1xuICBjb25zdCBjbGFzc0N0b3JQYXJhbWV0ZXJzID0gcmVmbGVjdGlvbi5nZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xhenopO1xuICBpZiAoY2xhc3NDdG9yUGFyYW1ldGVycyAhPT0gbnVsbCkge1xuICAgIGNvbnN0IGN0b3JQYXJhbWV0ZXJzID0gY2xhc3NDdG9yUGFyYW1ldGVycy5tYXAoXG4gICAgICAgIHBhcmFtID0+IGN0b3JQYXJhbWV0ZXJUb01ldGFkYXRhKHBhcmFtLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZSkpO1xuICAgIG1ldGFDdG9yUGFyYW1ldGVycyA9IG5ldyBGdW5jdGlvbkV4cHIoW10sIFtcbiAgICAgIG5ldyBSZXR1cm5TdGF0ZW1lbnQobmV3IExpdGVyYWxBcnJheUV4cHIoY3RvclBhcmFtZXRlcnMpKSxcbiAgICBdKTtcbiAgfVxuXG4gIC8vIERvIHRoZSBzYW1lIGZvciBwcm9wZXJ0eSBkZWNvcmF0b3JzLlxuICBsZXQgbWV0YVByb3BEZWNvcmF0b3JzOiB0cy5FeHByZXNzaW9uID0gdHMuY3JlYXRlTnVsbCgpO1xuICBjb25zdCBjbGFzc01lbWJlcnMgPSByZWZsZWN0aW9uLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KS5maWx0ZXIoXG4gICAgICBtZW1iZXIgPT4gIW1lbWJlci5pc1N0YXRpYyAmJiBtZW1iZXIuZGVjb3JhdG9ycyAhPT0gbnVsbCAmJiBtZW1iZXIuZGVjb3JhdG9ycy5sZW5ndGggPiAwKTtcbiAgY29uc3QgZHVwbGljYXRlRGVjb3JhdGVkTWVtYmVyTmFtZXMgPVxuICAgICAgY2xhc3NNZW1iZXJzLm1hcChtZW1iZXIgPT4gbWVtYmVyLm5hbWUpLmZpbHRlcigobmFtZSwgaSwgYXJyKSA9PiBhcnIuaW5kZXhPZihuYW1lKSA8IGkpO1xuICBpZiAoZHVwbGljYXRlRGVjb3JhdGVkTWVtYmVyTmFtZXMubGVuZ3RoID4gMCkge1xuICAgIC8vIFRoaXMgc2hvdWxkIHRoZW9yZXRpY2FsbHkgbmV2ZXIgaGFwcGVuLCBiZWNhdXNlIHRoZSBvbmx5IHdheSB0byBoYXZlIGR1cGxpY2F0ZSBpbnN0YW5jZVxuICAgIC8vIG1lbWJlciBuYW1lcyBpcyBnZXR0ZXIvc2V0dGVyIHBhaXJzIGFuZCBkZWNvcmF0b3JzIGNhbm5vdCBhcHBlYXIgaW4gYm90aCBhIGdldHRlciBhbmQgdGhlXG4gICAgLy8gY29ycmVzcG9uZGluZyBzZXR0ZXIuXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgRHVwbGljYXRlIGRlY29yYXRlZCBwcm9wZXJ0aWVzIGZvdW5kIG9uIGNsYXNzICcke2NsYXp6Lm5hbWUudGV4dH0nOiBgICtcbiAgICAgICAgZHVwbGljYXRlRGVjb3JhdGVkTWVtYmVyTmFtZXMuam9pbignLCAnKSk7XG4gIH1cbiAgY29uc3QgZGVjb3JhdGVkTWVtYmVycyA9XG4gICAgICBjbGFzc01lbWJlcnMubWFwKG1lbWJlciA9PiBjbGFzc01lbWJlclRvTWV0YWRhdGEobWVtYmVyLm5hbWUsIG1lbWJlci5kZWNvcmF0b3JzISwgaXNDb3JlKSk7XG4gIGlmIChkZWNvcmF0ZWRNZW1iZXJzLmxlbmd0aCA+IDApIHtcbiAgICBtZXRhUHJvcERlY29yYXRvcnMgPSB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKGRlY29yYXRlZE1lbWJlcnMpO1xuICB9XG5cbiAgLy8gR2VuZXJhdGUgYSBwdXJlIGNhbGwgdG8gc2V0Q2xhc3NNZXRhZGF0YSB3aXRoIHRoZSBjbGFzcyBpZGVudGlmaWVyIGFuZCBpdHMgbWV0YWRhdGEuXG4gIGNvbnN0IHNldENsYXNzTWV0YWRhdGEgPSBuZXcgRXh0ZXJuYWxFeHByKElkZW50aWZpZXJzLnNldENsYXNzTWV0YWRhdGEpO1xuICBjb25zdCBmbkNhbGwgPSBuZXcgSW52b2tlRnVuY3Rpb25FeHByKFxuICAgICAgLyogZm4gKi8gc2V0Q2xhc3NNZXRhZGF0YSxcbiAgICAgIC8qIGFyZ3MgKi9cbiAgICAgIFtcbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihpZCksXG4gICAgICAgIG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YURlY29yYXRvcnMpLFxuICAgICAgICBtZXRhQ3RvclBhcmFtZXRlcnMsXG4gICAgICAgIG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YVByb3BEZWNvcmF0b3JzKSxcbiAgICAgIF0pO1xuICBjb25zdCBpaWZlRm4gPSBuZXcgRnVuY3Rpb25FeHByKFtdLCBbZm5DYWxsLnRvU3RtdCgpXSwgTk9ORV9UWVBFKTtcbiAgY29uc3QgaWlmZSA9IG5ldyBJbnZva2VGdW5jdGlvbkV4cHIoXG4gICAgICAvKiBmbiAqLyBpaWZlRm4sXG4gICAgICAvKiBhcmdzICovW10sXG4gICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHNvdXJjZVNwYW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogcHVyZSAqLyB0cnVlKTtcbiAgcmV0dXJuIGlpZmUudG9TdG10KCk7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHJlZmxlY3RlZCBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgdG8gbWV0YWRhdGEuXG4gKi9cbmZ1bmN0aW9uIGN0b3JQYXJhbWV0ZXJUb01ldGFkYXRhKFxuICAgIHBhcmFtOiBDdG9yUGFyYW1ldGVyLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICBpc0NvcmU6IGJvb2xlYW4pOiBFeHByZXNzaW9uIHtcbiAgLy8gUGFyYW1ldGVycyBzb21ldGltZXMgaGF2ZSBhIHR5cGUgdGhhdCBjYW4gYmUgcmVmZXJlbmNlZC4gSWYgc28sIHRoZW4gdXNlIGl0LCBvdGhlcndpc2VcbiAgLy8gaXRzIHR5cGUgaXMgdW5kZWZpbmVkLlxuICBjb25zdCB0eXBlID0gcGFyYW0udHlwZVZhbHVlUmVmZXJlbmNlICE9PSBudWxsID9cbiAgICAgIHZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9uKHBhcmFtLnR5cGVWYWx1ZVJlZmVyZW5jZSwgZGVmYXVsdEltcG9ydFJlY29yZGVyKSA6XG4gICAgICBuZXcgTGl0ZXJhbEV4cHIodW5kZWZpbmVkKTtcblxuICBjb25zdCBtYXBFbnRyaWVzOiB7a2V5OiBzdHJpbmcsIHZhbHVlOiBFeHByZXNzaW9uLCBxdW90ZWQ6IGZhbHNlfVtdID0gW1xuICAgIHtrZXk6ICd0eXBlJywgdmFsdWU6IHR5cGUsIHF1b3RlZDogZmFsc2V9LFxuICBdO1xuXG4gIC8vIElmIHRoZSBwYXJhbWV0ZXIgaGFzIGRlY29yYXRvcnMsIGluY2x1ZGUgdGhlIG9uZXMgZnJvbSBBbmd1bGFyLlxuICBpZiAocGFyYW0uZGVjb3JhdG9ycyAhPT0gbnVsbCkge1xuICAgIGNvbnN0IG5nRGVjb3JhdG9ycyA9IHBhcmFtLmRlY29yYXRvcnMuZmlsdGVyKGRlYyA9PiBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjLCBpc0NvcmUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKChkZWNvcmF0b3I6IERlY29yYXRvcikgPT4gZGVjb3JhdG9yVG9NZXRhZGF0YShkZWNvcmF0b3IpKTtcbiAgICBjb25zdCB2YWx1ZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodHMuY3JlYXRlQXJyYXlMaXRlcmFsKG5nRGVjb3JhdG9ycykpO1xuICAgIG1hcEVudHJpZXMucHVzaCh7a2V5OiAnZGVjb3JhdG9ycycsIHZhbHVlLCBxdW90ZWQ6IGZhbHNlfSk7XG4gIH1cbiAgcmV0dXJuIGxpdGVyYWxNYXAobWFwRW50cmllcyk7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHJlZmxlY3RlZCBjbGFzcyBtZW1iZXIgdG8gbWV0YWRhdGEuXG4gKi9cbmZ1bmN0aW9uIGNsYXNzTWVtYmVyVG9NZXRhZGF0YShcbiAgICBuYW1lOiBzdHJpbmcsIGRlY29yYXRvcnM6IERlY29yYXRvcltdLCBpc0NvcmU6IGJvb2xlYW4pOiB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQge1xuICBjb25zdCBuZ0RlY29yYXRvcnMgPSBkZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4gaXNBbmd1bGFyRGVjb3JhdG9yKGRlYywgaXNDb3JlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoKGRlY29yYXRvcjogRGVjb3JhdG9yKSA9PiBkZWNvcmF0b3JUb01ldGFkYXRhKGRlY29yYXRvcikpO1xuICBjb25zdCBkZWNvcmF0b3JNZXRhID0gdHMuY3JlYXRlQXJyYXlMaXRlcmFsKG5nRGVjb3JhdG9ycyk7XG4gIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQobmFtZSwgZGVjb3JhdG9yTWV0YSk7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHJlZmxlY3RlZCBkZWNvcmF0b3IgdG8gbWV0YWRhdGEuXG4gKi9cbmZ1bmN0aW9uIGRlY29yYXRvclRvTWV0YWRhdGEoXG4gICAgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIHdyYXBGdW5jdGlvbnNJblBhcmVucz86IGJvb2xlYW4pOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiB7XG4gIGlmIChkZWNvcmF0b3IuaWRlbnRpZmllciA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSWxsZWdhbCBzdGF0ZTogc3ludGhlc2l6ZWQgZGVjb3JhdG9yIGNhbm5vdCBiZSBlbWl0dGVkIGluIGNsYXNzIG1ldGFkYXRhLicpO1xuICB9XG4gIC8vIERlY29yYXRvcnMgaGF2ZSBhIHR5cGUuXG4gIGNvbnN0IHByb3BlcnRpZXM6IHRzLk9iamVjdExpdGVyYWxFbGVtZW50TGlrZVtdID0gW1xuICAgIHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudCgndHlwZScsIHRzLmdldE11dGFibGVDbG9uZShkZWNvcmF0b3IuaWRlbnRpZmllcikpLFxuICBdO1xuICAvLyBTb21ldGltZXMgdGhleSBoYXZlIGFyZ3VtZW50cy5cbiAgaWYgKGRlY29yYXRvci5hcmdzICE9PSBudWxsICYmIGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBhcmdzID0gZGVjb3JhdG9yLmFyZ3MubWFwKGFyZyA9PiB7XG4gICAgICBjb25zdCBleHByID0gdHMuZ2V0TXV0YWJsZUNsb25lKGFyZyk7XG4gICAgICByZXR1cm4gd3JhcEZ1bmN0aW9uc0luUGFyZW5zID8gd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucyhleHByKSA6IGV4cHI7XG4gICAgfSk7XG4gICAgcHJvcGVydGllcy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudCgnYXJncycsIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChhcmdzKSkpO1xuICB9XG4gIHJldHVybiB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKHByb3BlcnRpZXMsIHRydWUpO1xufVxuXG4vKipcbiAqIFdoZXRoZXIgYSBnaXZlbiBkZWNvcmF0b3Igc2hvdWxkIGJlIHRyZWF0ZWQgYXMgYW4gQW5ndWxhciBkZWNvcmF0b3IuXG4gKlxuICogRWl0aGVyIGl0J3MgdXNlZCBpbiBAYW5ndWxhci9jb3JlLCBvciBpdCdzIGltcG9ydGVkIGZyb20gdGhlcmUuXG4gKi9cbmZ1bmN0aW9uIGlzQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3I6IERlY29yYXRvciwgaXNDb3JlOiBib29sZWFuKTogYm9vbGVhbiB7XG4gIHJldHVybiBpc0NvcmUgfHwgKGRlY29yYXRvci5pbXBvcnQgIT09IG51bGwgJiYgZGVjb3JhdG9yLmltcG9ydC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZScpO1xufVxuIl19