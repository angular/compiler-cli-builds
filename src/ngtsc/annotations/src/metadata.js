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
    function generateSetClassMetadataCall(clazz, reflection, isCore) {
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
            var ctorParameters = classCtorParameters.map(function (param) { return ctorParameterToMetadata(param, isCore); });
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
    function ctorParameterToMetadata(param, isCore) {
        // Parameters sometimes have a type that can be referenced. If so, then use it, otherwise
        // its type is undefined.
        var type = param.typeValueReference !== null ?
            util_1.valueReferenceToExpression(param.typeValueReference) :
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9tZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILDhDQUFrTTtJQUNsTSwrQkFBaUM7SUFJakMsNkVBQWtEO0lBRWxEOzs7Ozs7T0FNRztJQUNILFNBQWdCLDRCQUE0QixDQUN4QyxLQUFxQixFQUFFLFVBQTBCLEVBQUUsTUFBZTtRQUNwRSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFNBQVMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzFGLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxJQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTNDLHdGQUF3RjtRQUN4RixpRUFBaUU7UUFDakUsSUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JFLElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtZQUM1QixPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsSUFBTSxpQkFBaUIsR0FDbkIsZUFBZSxDQUFDLE1BQU0sQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsRUFBL0IsQ0FBK0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzVGLElBQUksaUJBQWlCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNsQyxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsSUFBTSxjQUFjLEdB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LE9BQUEsRUFBRSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBdkIsQ0FBdUIsQ0FBQyxDQUFDO1lBQ2hFLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ25GO1FBQ0QsT0FBTyxFQUFFLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxrQkFBa0IsQ0FBQyxTQUFvQixFQUFFLE1BQWU7UUFDL0QsT0FBTyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxlQUFlLENBQUMsQ0FBQztJQUM1RixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgRnVuY3Rpb25FeHByLCBJZGVudGlmaWVycywgSW52b2tlRnVuY3Rpb25FeHByLCBMaXRlcmFsQXJyYXlFeHByLCBMaXRlcmFsRXhwciwgUmV0dXJuU3RhdGVtZW50LCBTdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwciwgbGl0ZXJhbE1hcH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q3RvclBhcmFtZXRlciwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmltcG9ydCB7dmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb259IGZyb20gJy4vdXRpbCc7XG5cbi8qKlxuICogR2l2ZW4gYSBjbGFzcyBkZWNsYXJhdGlvbiwgZ2VuZXJhdGUgYSBjYWxsIHRvIGBzZXRDbGFzc01ldGFkYXRhYCB3aXRoIHRoZSBBbmd1bGFyIG1ldGFkYXRhXG4gKiBwcmVzZW50IG9uIHRoZSBjbGFzcyBvciBpdHMgbWVtYmVyIGZpZWxkcy5cbiAqXG4gKiBJZiBubyBzdWNoIG1ldGFkYXRhIGlzIHByZXNlbnQsIHRoaXMgZnVuY3Rpb24gcmV0dXJucyBgbnVsbGAuIE90aGVyd2lzZSwgdGhlIGNhbGwgaXMgcmV0dXJuZWRcbiAqIGFzIGEgYFN0YXRlbWVudGAgZm9yIGluY2x1c2lvbiBhbG9uZyB3aXRoIHRoZSBjbGFzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwoXG4gICAgY2xheno6IHRzLkRlY2xhcmF0aW9uLCByZWZsZWN0aW9uOiBSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuKTogU3RhdGVtZW50fG51bGwge1xuICBpZiAoIXJlZmxlY3Rpb24uaXNDbGFzcyhjbGF6eikgfHwgY2xhenoubmFtZSA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0lkZW50aWZpZXIoY2xhenoubmFtZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBpZCA9IHRzLnVwZGF0ZUlkZW50aWZpZXIoY2xhenoubmFtZSk7XG5cbiAgLy8gUmVmbGVjdCBvdmVyIHRoZSBjbGFzcyBkZWNvcmF0b3JzLiBJZiBub25lIGFyZSBwcmVzZW50LCBvciB0aG9zZSB0aGF0IGFyZSBhcmVuJ3QgZnJvbVxuICAvLyBBbmd1bGFyLCB0aGVuIHJldHVybiBudWxsLiBPdGhlcndpc2UsIHR1cm4gdGhlbSBpbnRvIG1ldGFkYXRhLlxuICBjb25zdCBjbGFzc0RlY29yYXRvcnMgPSByZWZsZWN0aW9uLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGNsYXp6KTtcbiAgaWYgKGNsYXNzRGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG5nQ2xhc3NEZWNvcmF0b3JzID1cbiAgICAgIGNsYXNzRGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IGlzQW5ndWxhckRlY29yYXRvcihkZWMsIGlzQ29yZSkpLm1hcChkZWNvcmF0b3JUb01ldGFkYXRhKTtcbiAgaWYgKG5nQ2xhc3NEZWNvcmF0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG1ldGFEZWNvcmF0b3JzID0gdHMuY3JlYXRlQXJyYXlMaXRlcmFsKG5nQ2xhc3NEZWNvcmF0b3JzKTtcblxuICAvLyBDb252ZXJ0IHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIHRvIG1ldGFkYXRhLCBwYXNzaW5nIG51bGwgaWYgbm9uZSBhcmUgcHJlc2VudC5cbiAgbGV0IG1ldGFDdG9yUGFyYW1ldGVyczogRXhwcmVzc2lvbiA9IG5ldyBMaXRlcmFsRXhwcihudWxsKTtcbiAgY29uc3QgY2xhc3NDdG9yUGFyYW1ldGVycyA9IHJlZmxlY3Rpb24uZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6KTtcbiAgaWYgKGNsYXNzQ3RvclBhcmFtZXRlcnMgIT09IG51bGwpIHtcbiAgICBjb25zdCBjdG9yUGFyYW1ldGVycyA9IGNsYXNzQ3RvclBhcmFtZXRlcnMubWFwKHBhcmFtID0+IGN0b3JQYXJhbWV0ZXJUb01ldGFkYXRhKHBhcmFtLCBpc0NvcmUpKTtcbiAgICBtZXRhQ3RvclBhcmFtZXRlcnMgPSBuZXcgRnVuY3Rpb25FeHByKFtdLCBbXG4gICAgICBuZXcgUmV0dXJuU3RhdGVtZW50KG5ldyBMaXRlcmFsQXJyYXlFeHByKGN0b3JQYXJhbWV0ZXJzKSksXG4gICAgXSk7XG4gIH1cblxuICAvLyBEbyB0aGUgc2FtZSBmb3IgcHJvcGVydHkgZGVjb3JhdG9ycy5cbiAgbGV0IG1ldGFQcm9wRGVjb3JhdG9yczogdHMuRXhwcmVzc2lvbiA9IHRzLmNyZWF0ZU51bGwoKTtcbiAgY29uc3QgZGVjb3JhdGVkTWVtYmVycyA9XG4gICAgICByZWZsZWN0aW9uLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KVxuICAgICAgICAgIC5maWx0ZXIobWVtYmVyID0+ICFtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLmRlY29yYXRvcnMgIT09IG51bGwpXG4gICAgICAgICAgLm1hcChtZW1iZXIgPT4gY2xhc3NNZW1iZXJUb01ldGFkYXRhKG1lbWJlci5uYW1lLCBtZW1iZXIuZGVjb3JhdG9ycyAhLCBpc0NvcmUpKTtcbiAgaWYgKGRlY29yYXRlZE1lbWJlcnMubGVuZ3RoID4gMCkge1xuICAgIG1ldGFQcm9wRGVjb3JhdG9ycyA9IHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoZGVjb3JhdGVkTWVtYmVycyk7XG4gIH1cblxuICAvLyBHZW5lcmF0ZSBhIHB1cmUgY2FsbCB0byBzZXRDbGFzc01ldGFkYXRhIHdpdGggdGhlIGNsYXNzIGlkZW50aWZpZXIgYW5kIGl0cyBtZXRhZGF0YS5cbiAgY29uc3Qgc2V0Q2xhc3NNZXRhZGF0YSA9IG5ldyBFeHRlcm5hbEV4cHIoSWRlbnRpZmllcnMuc2V0Q2xhc3NNZXRhZGF0YSk7XG4gIGNvbnN0IGZuQ2FsbCA9IG5ldyBJbnZva2VGdW5jdGlvbkV4cHIoXG4gICAgICAvKiBmbiAqLyBzZXRDbGFzc01ldGFkYXRhLFxuICAgICAgLyogYXJncyAqL1xuICAgICAgW1xuICAgICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKGlkKSxcbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhRGVjb3JhdG9ycyksXG4gICAgICAgIG1ldGFDdG9yUGFyYW1ldGVycyxcbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhUHJvcERlY29yYXRvcnMpLFxuICAgICAgXSxcbiAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogc291cmNlU3BhbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBwdXJlICovIHRydWUpO1xuICByZXR1cm4gZm5DYWxsLnRvU3RtdCgpO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSByZWZsZWN0ZWQgY29uc3RydWN0b3IgcGFyYW1ldGVyIHRvIG1ldGFkYXRhLlxuICovXG5mdW5jdGlvbiBjdG9yUGFyYW1ldGVyVG9NZXRhZGF0YShwYXJhbTogQ3RvclBhcmFtZXRlciwgaXNDb3JlOiBib29sZWFuKTogRXhwcmVzc2lvbiB7XG4gIC8vIFBhcmFtZXRlcnMgc29tZXRpbWVzIGhhdmUgYSB0eXBlIHRoYXQgY2FuIGJlIHJlZmVyZW5jZWQuIElmIHNvLCB0aGVuIHVzZSBpdCwgb3RoZXJ3aXNlXG4gIC8vIGl0cyB0eXBlIGlzIHVuZGVmaW5lZC5cbiAgY29uc3QgdHlwZSA9IHBhcmFtLnR5cGVWYWx1ZVJlZmVyZW5jZSAhPT0gbnVsbCA/XG4gICAgICB2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbihwYXJhbS50eXBlVmFsdWVSZWZlcmVuY2UpIDpcbiAgICAgIG5ldyBMaXRlcmFsRXhwcih1bmRlZmluZWQpO1xuXG4gIGNvbnN0IG1hcEVudHJpZXM6IHtrZXk6IHN0cmluZywgdmFsdWU6IEV4cHJlc3Npb24sIHF1b3RlZDogZmFsc2V9W10gPSBbXG4gICAge2tleTogJ3R5cGUnLCB2YWx1ZTogdHlwZSwgcXVvdGVkOiBmYWxzZX0sXG4gIF07XG5cbiAgLy8gSWYgdGhlIHBhcmFtZXRlciBoYXMgZGVjb3JhdG9ycywgaW5jbHVkZSB0aGUgb25lcyBmcm9tIEFuZ3VsYXIuXG4gIGlmIChwYXJhbS5kZWNvcmF0b3JzICE9PSBudWxsKSB7XG4gICAgY29uc3QgbmdEZWNvcmF0b3JzID1cbiAgICAgICAgcGFyYW0uZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IGlzQW5ndWxhckRlY29yYXRvcihkZWMsIGlzQ29yZSkpLm1hcChkZWNvcmF0b3JUb01ldGFkYXRhKTtcbiAgICBjb25zdCB2YWx1ZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodHMuY3JlYXRlQXJyYXlMaXRlcmFsKG5nRGVjb3JhdG9ycykpO1xuICAgIG1hcEVudHJpZXMucHVzaCh7a2V5OiAnZGVjb3JhdG9ycycsIHZhbHVlLCBxdW90ZWQ6IGZhbHNlfSk7XG4gIH1cbiAgcmV0dXJuIGxpdGVyYWxNYXAobWFwRW50cmllcyk7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHJlZmxlY3RlZCBjbGFzcyBtZW1iZXIgdG8gbWV0YWRhdGEuXG4gKi9cbmZ1bmN0aW9uIGNsYXNzTWVtYmVyVG9NZXRhZGF0YShcbiAgICBuYW1lOiBzdHJpbmcsIGRlY29yYXRvcnM6IERlY29yYXRvcltdLCBpc0NvcmU6IGJvb2xlYW4pOiB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQge1xuICBjb25zdCBuZ0RlY29yYXRvcnMgPVxuICAgICAgZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IGlzQW5ndWxhckRlY29yYXRvcihkZWMsIGlzQ29yZSkpLm1hcChkZWNvcmF0b3JUb01ldGFkYXRhKTtcbiAgY29uc3QgZGVjb3JhdG9yTWV0YSA9IHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChuZ0RlY29yYXRvcnMpO1xuICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KG5hbWUsIGRlY29yYXRvck1ldGEpO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSByZWZsZWN0ZWQgZGVjb3JhdG9yIHRvIG1ldGFkYXRhLlxuICovXG5mdW5jdGlvbiBkZWNvcmF0b3JUb01ldGFkYXRhKGRlY29yYXRvcjogRGVjb3JhdG9yKTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ge1xuICAvLyBEZWNvcmF0b3JzIGhhdmUgYSB0eXBlLlxuICBjb25zdCBwcm9wZXJ0aWVzOiB0cy5PYmplY3RMaXRlcmFsRWxlbWVudExpa2VbXSA9IFtcbiAgICB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoJ3R5cGUnLCB0cy51cGRhdGVJZGVudGlmaWVyKGRlY29yYXRvci5pZGVudGlmaWVyKSksXG4gIF07XG4gIC8vIFNvbWV0aW1lcyB0aGV5IGhhdmUgYXJndW1lbnRzLlxuICBpZiAoZGVjb3JhdG9yLmFyZ3MgIT09IG51bGwgJiYgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGFyZ3MgPSBkZWNvcmF0b3IuYXJncy5tYXAoYXJnID0+IHRzLmdldE11dGFibGVDbG9uZShhcmcpKTtcbiAgICBwcm9wZXJ0aWVzLnB1c2godHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KCdhcmdzJywgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKGFyZ3MpKSk7XG4gIH1cbiAgcmV0dXJuIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwocHJvcGVydGllcywgdHJ1ZSk7XG59XG5cbi8qKlxuICogV2hldGhlciBhIGdpdmVuIGRlY29yYXRvciBzaG91bGQgYmUgdHJlYXRlZCBhcyBhbiBBbmd1bGFyIGRlY29yYXRvci5cbiAqXG4gKiBFaXRoZXIgaXQncyB1c2VkIGluIEBhbmd1bGFyL2NvcmUsIG9yIGl0J3MgaW1wb3J0ZWQgZnJvbSB0aGVyZS5cbiAqL1xuZnVuY3Rpb24gaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcjogRGVjb3JhdG9yLCBpc0NvcmU6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgcmV0dXJuIGlzQ29yZSB8fCAoZGVjb3JhdG9yLmltcG9ydCAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuaW1wb3J0LmZyb20gPT09ICdAYW5ndWxhci9jb3JlJyk7XG59XG4iXX0=