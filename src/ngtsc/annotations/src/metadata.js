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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/metadata", ["require", "exports", "@angular/compiler", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    /**
     * Given a class declaration, generate a call to `setClassMetadata` with the Angular metadata
     * present on the class or its member fields.
     *
     * If no such metadata is present, this function returns `null`. Otherwise, the call is returned
     * as a `Statement` for inclusion along with the class.
     */
    function generateSetClassMetadataCall(clazz, reflection, isCore) {
        // Classes come in two flavors, class declarations (ES2015) and variable declarations (ES5).
        // Both must have a declared name to have metadata set on them.
        if ((!ts.isClassDeclaration(clazz) && !ts.isVariableDeclaration(clazz)) ||
            clazz.name === undefined || !ts.isIdentifier(clazz.name)) {
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
        var metaCtorParameters = ts.createNull();
        var classCtorParameters = reflection.getConstructorParameters(clazz);
        if (classCtorParameters !== null) {
            var ctorParameters = ts.createArrayLiteral(classCtorParameters.map(function (param) { return ctorParameterToMetadata(param, isCore); }));
            metaCtorParameters = ts.createFunctionExpression(
            /* modifiers */ undefined, 
            /* asteriskToken */ undefined, 
            /* name */ undefined, 
            /* typeParameters */ undefined, 
            /* parameters */ undefined, 
            /* type */ undefined, ts.createBlock([ts.createReturn(ctorParameters)]));
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
            new compiler_1.WrappedNodeExpr(metaCtorParameters),
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
    function ctorParameterToMetadata(param, isCore) {
        // Parameters sometimes have a type that can be referenced. If so, then use it, otherwise
        // its type is undefined.
        var type = param.typeExpression !== null ? param.typeExpression : ts.createIdentifier('undefined');
        var properties = [
            ts.createPropertyAssignment('type', type),
        ];
        // If the parameter has decorators, include the ones from Angular.
        if (param.decorators !== null) {
            var ngDecorators = param.decorators.filter(function (dec) { return isAngularDecorator(dec, isCore); }).map(decoratorToMetadata);
            properties.push(ts.createPropertyAssignment('decorators', ts.createArrayLiteral(ngDecorators)));
        }
        return ts.createObjectLiteral(properties, true);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiLi4vLi4vLi4vLi4vLi4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9tZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILDhDQUE0RztJQUM1RywrQkFBaUM7SUFJakM7Ozs7OztPQU1HO0lBQ0gsU0FBZ0IsNEJBQTRCLENBQ3hDLEtBQXFCLEVBQUUsVUFBMEIsRUFBRSxNQUFlO1FBQ3BFLDRGQUE0RjtRQUM1RiwrREFBK0Q7UUFDL0QsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25FLEtBQUssQ0FBQyxJQUFJLEtBQUssU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDNUQsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFM0Msd0ZBQXdGO1FBQ3hGLGlFQUFpRTtRQUNqRSxJQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckUsSUFBSSxlQUFlLEtBQUssSUFBSSxFQUFFO1lBQzVCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxJQUFNLGlCQUFpQixHQUNuQixlQUFlLENBQUMsTUFBTSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsa0JBQWtCLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxFQUEvQixDQUErQixDQUFDLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDNUYsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEtB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Q2pDLElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3hELElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsRUFBRSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBdkIsQ0FBdUIsQ0FBQyxDQUFDO1lBQ2hFLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ25GO1FBQ0QsT0FBTyxFQUFFLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxrQkFBa0IsQ0FBQyxTQUFvQixFQUFFLE1BQWU7UUFDL0QsT0FBTyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxlQUFlLENBQUMsQ0FBQztJQUM1RixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4dGVybmFsRXhwciwgSWRlbnRpZmllcnMsIEludm9rZUZ1bmN0aW9uRXhwciwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0N0b3JQYXJhbWV0ZXIsIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL2hvc3QnO1xuXG4vKipcbiAqIEdpdmVuIGEgY2xhc3MgZGVjbGFyYXRpb24sIGdlbmVyYXRlIGEgY2FsbCB0byBgc2V0Q2xhc3NNZXRhZGF0YWAgd2l0aCB0aGUgQW5ndWxhciBtZXRhZGF0YVxuICogcHJlc2VudCBvbiB0aGUgY2xhc3Mgb3IgaXRzIG1lbWJlciBmaWVsZHMuXG4gKlxuICogSWYgbm8gc3VjaCBtZXRhZGF0YSBpcyBwcmVzZW50LCB0aGlzIGZ1bmN0aW9uIHJldHVybnMgYG51bGxgLiBPdGhlcndpc2UsIHRoZSBjYWxsIGlzIHJldHVybmVkXG4gKiBhcyBhIGBTdGF0ZW1lbnRgIGZvciBpbmNsdXNpb24gYWxvbmcgd2l0aCB0aGUgY2xhc3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKFxuICAgIGNsYXp6OiB0cy5EZWNsYXJhdGlvbiwgcmVmbGVjdGlvbjogUmVmbGVjdGlvbkhvc3QsIGlzQ29yZTogYm9vbGVhbik6IFN0YXRlbWVudHxudWxsIHtcbiAgLy8gQ2xhc3NlcyBjb21lIGluIHR3byBmbGF2b3JzLCBjbGFzcyBkZWNsYXJhdGlvbnMgKEVTMjAxNSkgYW5kIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyAoRVM1KS5cbiAgLy8gQm90aCBtdXN0IGhhdmUgYSBkZWNsYXJlZCBuYW1lIHRvIGhhdmUgbWV0YWRhdGEgc2V0IG9uIHRoZW0uXG4gIGlmICgoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihjbGF6eikgJiYgIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihjbGF6eikpIHx8XG4gICAgICBjbGF6ei5uYW1lID09PSB1bmRlZmluZWQgfHwgIXRzLmlzSWRlbnRpZmllcihjbGF6ei5uYW1lKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IGlkID0gdHMudXBkYXRlSWRlbnRpZmllcihjbGF6ei5uYW1lKTtcblxuICAvLyBSZWZsZWN0IG92ZXIgdGhlIGNsYXNzIGRlY29yYXRvcnMuIElmIG5vbmUgYXJlIHByZXNlbnQsIG9yIHRob3NlIHRoYXQgYXJlIGFyZW4ndCBmcm9tXG4gIC8vIEFuZ3VsYXIsIHRoZW4gcmV0dXJuIG51bGwuIE90aGVyd2lzZSwgdHVybiB0aGVtIGludG8gbWV0YWRhdGEuXG4gIGNvbnN0IGNsYXNzRGVjb3JhdG9ycyA9IHJlZmxlY3Rpb24uZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oY2xhenopO1xuICBpZiAoY2xhc3NEZWNvcmF0b3JzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgbmdDbGFzc0RlY29yYXRvcnMgPVxuICAgICAgY2xhc3NEZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4gaXNBbmd1bGFyRGVjb3JhdG9yKGRlYywgaXNDb3JlKSkubWFwKGRlY29yYXRvclRvTWV0YWRhdGEpO1xuICBpZiAobmdDbGFzc0RlY29yYXRvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgbWV0YURlY29yYXRvcnMgPSB0cy5jcmVhdGVBcnJheUxpdGVyYWwobmdDbGFzc0RlY29yYXRvcnMpO1xuXG4gIC8vIENvbnZlcnQgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgdG8gbWV0YWRhdGEsIHBhc3NpbmcgbnVsbCBpZiBub25lIGFyZSBwcmVzZW50LlxuICBsZXQgbWV0YUN0b3JQYXJhbWV0ZXJzOiB0cy5FeHByZXNzaW9uID0gdHMuY3JlYXRlTnVsbCgpO1xuICBjb25zdCBjbGFzc0N0b3JQYXJhbWV0ZXJzID0gcmVmbGVjdGlvbi5nZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xhenopO1xuICBpZiAoY2xhc3NDdG9yUGFyYW1ldGVycyAhPT0gbnVsbCkge1xuICAgIGNvbnN0IGN0b3JQYXJhbWV0ZXJzID0gdHMuY3JlYXRlQXJyYXlMaXRlcmFsKFxuICAgICAgICBjbGFzc0N0b3JQYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiBjdG9yUGFyYW1ldGVyVG9NZXRhZGF0YShwYXJhbSwgaXNDb3JlKSkpO1xuICAgIG1ldGFDdG9yUGFyYW1ldGVycyA9IHRzLmNyZWF0ZUZ1bmN0aW9uRXhwcmVzc2lvbihcbiAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgLyogYXN0ZXJpc2tUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIG5hbWUgKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIHBhcmFtZXRlcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCwgdHMuY3JlYXRlQmxvY2soW3RzLmNyZWF0ZVJldHVybihjdG9yUGFyYW1ldGVycyldKSk7XG4gIH1cblxuICAvLyBEbyB0aGUgc2FtZSBmb3IgcHJvcGVydHkgZGVjb3JhdG9ycy5cbiAgbGV0IG1ldGFQcm9wRGVjb3JhdG9yczogdHMuRXhwcmVzc2lvbiA9IHRzLmNyZWF0ZU51bGwoKTtcbiAgY29uc3QgZGVjb3JhdGVkTWVtYmVycyA9XG4gICAgICByZWZsZWN0aW9uLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KVxuICAgICAgICAgIC5maWx0ZXIobWVtYmVyID0+ICFtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLmRlY29yYXRvcnMgIT09IG51bGwpXG4gICAgICAgICAgLm1hcChtZW1iZXIgPT4gY2xhc3NNZW1iZXJUb01ldGFkYXRhKG1lbWJlci5uYW1lLCBtZW1iZXIuZGVjb3JhdG9ycyAhLCBpc0NvcmUpKTtcbiAgaWYgKGRlY29yYXRlZE1lbWJlcnMubGVuZ3RoID4gMCkge1xuICAgIG1ldGFQcm9wRGVjb3JhdG9ycyA9IHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoZGVjb3JhdGVkTWVtYmVycyk7XG4gIH1cblxuICAvLyBHZW5lcmF0ZSBhIHB1cmUgY2FsbCB0byBzZXRDbGFzc01ldGFkYXRhIHdpdGggdGhlIGNsYXNzIGlkZW50aWZpZXIgYW5kIGl0cyBtZXRhZGF0YS5cbiAgY29uc3Qgc2V0Q2xhc3NNZXRhZGF0YSA9IG5ldyBFeHRlcm5hbEV4cHIoSWRlbnRpZmllcnMuc2V0Q2xhc3NNZXRhZGF0YSk7XG4gIGNvbnN0IGZuQ2FsbCA9IG5ldyBJbnZva2VGdW5jdGlvbkV4cHIoXG4gICAgICAvKiBmbiAqLyBzZXRDbGFzc01ldGFkYXRhLFxuICAgICAgLyogYXJncyAqL1xuICAgICAgW1xuICAgICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKGlkKSxcbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhRGVjb3JhdG9ycyksXG4gICAgICAgIG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YUN0b3JQYXJhbWV0ZXJzKSxcbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhUHJvcERlY29yYXRvcnMpLFxuICAgICAgXSxcbiAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogc291cmNlU3BhbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBwdXJlICovIHRydWUpO1xuICByZXR1cm4gZm5DYWxsLnRvU3RtdCgpO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSByZWZsZWN0ZWQgY29uc3RydWN0b3IgcGFyYW1ldGVyIHRvIG1ldGFkYXRhLlxuICovXG5mdW5jdGlvbiBjdG9yUGFyYW1ldGVyVG9NZXRhZGF0YShwYXJhbTogQ3RvclBhcmFtZXRlciwgaXNDb3JlOiBib29sZWFuKTogdHMuRXhwcmVzc2lvbiB7XG4gIC8vIFBhcmFtZXRlcnMgc29tZXRpbWVzIGhhdmUgYSB0eXBlIHRoYXQgY2FuIGJlIHJlZmVyZW5jZWQuIElmIHNvLCB0aGVuIHVzZSBpdCwgb3RoZXJ3aXNlXG4gIC8vIGl0cyB0eXBlIGlzIHVuZGVmaW5lZC5cbiAgY29uc3QgdHlwZSA9XG4gICAgICBwYXJhbS50eXBlRXhwcmVzc2lvbiAhPT0gbnVsbCA/IHBhcmFtLnR5cGVFeHByZXNzaW9uIDogdHMuY3JlYXRlSWRlbnRpZmllcigndW5kZWZpbmVkJyk7XG4gIGNvbnN0IHByb3BlcnRpZXM6IHRzLk9iamVjdExpdGVyYWxFbGVtZW50TGlrZVtdID0gW1xuICAgIHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudCgndHlwZScsIHR5cGUpLFxuICBdO1xuXG4gIC8vIElmIHRoZSBwYXJhbWV0ZXIgaGFzIGRlY29yYXRvcnMsIGluY2x1ZGUgdGhlIG9uZXMgZnJvbSBBbmd1bGFyLlxuICBpZiAocGFyYW0uZGVjb3JhdG9ycyAhPT0gbnVsbCkge1xuICAgIGNvbnN0IG5nRGVjb3JhdG9ycyA9XG4gICAgICAgIHBhcmFtLmRlY29yYXRvcnMuZmlsdGVyKGRlYyA9PiBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjLCBpc0NvcmUpKS5tYXAoZGVjb3JhdG9yVG9NZXRhZGF0YSk7XG4gICAgcHJvcGVydGllcy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudCgnZGVjb3JhdG9ycycsIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChuZ0RlY29yYXRvcnMpKSk7XG4gIH1cbiAgcmV0dXJuIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwocHJvcGVydGllcywgdHJ1ZSk7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHJlZmxlY3RlZCBjbGFzcyBtZW1iZXIgdG8gbWV0YWRhdGEuXG4gKi9cbmZ1bmN0aW9uIGNsYXNzTWVtYmVyVG9NZXRhZGF0YShcbiAgICBuYW1lOiBzdHJpbmcsIGRlY29yYXRvcnM6IERlY29yYXRvcltdLCBpc0NvcmU6IGJvb2xlYW4pOiB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQge1xuICBjb25zdCBuZ0RlY29yYXRvcnMgPVxuICAgICAgZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IGlzQW5ndWxhckRlY29yYXRvcihkZWMsIGlzQ29yZSkpLm1hcChkZWNvcmF0b3JUb01ldGFkYXRhKTtcbiAgY29uc3QgZGVjb3JhdG9yTWV0YSA9IHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChuZ0RlY29yYXRvcnMpO1xuICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KG5hbWUsIGRlY29yYXRvck1ldGEpO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSByZWZsZWN0ZWQgZGVjb3JhdG9yIHRvIG1ldGFkYXRhLlxuICovXG5mdW5jdGlvbiBkZWNvcmF0b3JUb01ldGFkYXRhKGRlY29yYXRvcjogRGVjb3JhdG9yKTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ge1xuICAvLyBEZWNvcmF0b3JzIGhhdmUgYSB0eXBlLlxuICBjb25zdCBwcm9wZXJ0aWVzOiB0cy5PYmplY3RMaXRlcmFsRWxlbWVudExpa2VbXSA9IFtcbiAgICB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoJ3R5cGUnLCB0cy51cGRhdGVJZGVudGlmaWVyKGRlY29yYXRvci5pZGVudGlmaWVyKSksXG4gIF07XG4gIC8vIFNvbWV0aW1lcyB0aGV5IGhhdmUgYXJndW1lbnRzLlxuICBpZiAoZGVjb3JhdG9yLmFyZ3MgIT09IG51bGwgJiYgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGFyZ3MgPSBkZWNvcmF0b3IuYXJncy5tYXAoYXJnID0+IHRzLmdldE11dGFibGVDbG9uZShhcmcpKTtcbiAgICBwcm9wZXJ0aWVzLnB1c2godHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KCdhcmdzJywgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKGFyZ3MpKSk7XG4gIH1cbiAgcmV0dXJuIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwocHJvcGVydGllcywgdHJ1ZSk7XG59XG5cbi8qKlxuICogV2hldGhlciBhIGdpdmVuIGRlY29yYXRvciBzaG91bGQgYmUgdHJlYXRlZCBhcyBhbiBBbmd1bGFyIGRlY29yYXRvci5cbiAqXG4gKiBFaXRoZXIgaXQncyB1c2VkIGluIEBhbmd1bGFyL2NvcmUsIG9yIGl0J3MgaW1wb3J0ZWQgZnJvbSB0aGVyZS5cbiAqL1xuZnVuY3Rpb24gaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcjogRGVjb3JhdG9yLCBpc0NvcmU6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgcmV0dXJuIGlzQ29yZSB8fCAoZGVjb3JhdG9yLmltcG9ydCAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuaW1wb3J0LmZyb20gPT09ICdAYW5ndWxhci9jb3JlJyk7XG59XG4iXX0=