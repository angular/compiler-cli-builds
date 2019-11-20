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
        if (decorator.identifier === null) {
            throw new Error('Illegal state: synthesized decorator cannot be emitted in class metadata.');
        }
        // Decorators have a type.
        var properties = [
            ts.createPropertyAssignment('type', ts.getMutableClone(decorator.identifier)),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9tZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILDhDQUE2TTtJQUM3TSwrQkFBaUM7SUFLakMsNkVBQWtEO0lBR2xEOzs7Ozs7T0FNRztJQUNILFNBQWdCLDRCQUE0QixDQUN4QyxLQUFxQixFQUFFLFVBQTBCLEVBQUUscUJBQTRDLEVBQy9GLE1BQWU7UUFDakIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDOUIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUV6RSx3RkFBd0Y7UUFDeEYsaUVBQWlFO1FBQ2pFLElBQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyRSxJQUFJLGVBQWUsS0FBSyxJQUFJLEVBQUU7WUFDNUIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQU0saUJBQWlCLEdBQ25CLGVBQWUsQ0FBQyxNQUFNLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEVBQS9CLENBQStCLENBQUMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUM1RixJQUFJLGlCQUFpQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDbEMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBRWhFLG9G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U0FDbkY7UUFDRCxPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLGtCQUFrQixDQUFDLFNBQW9CLEVBQUUsTUFBZTtRQUMvRCxPQUFPLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssSUFBSSxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLGVBQWUsQ0FBQyxDQUFDO0lBQzVGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBGdW5jdGlvbkV4cHIsIElkZW50aWZpZXJzLCBJbnZva2VGdW5jdGlvbkV4cHIsIExpdGVyYWxBcnJheUV4cHIsIExpdGVyYWxFeHByLCBOT05FX1RZUEUsIFJldHVyblN0YXRlbWVudCwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIGxpdGVyYWxNYXB9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0N0b3JQYXJhbWV0ZXIsIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG5pbXBvcnQge3ZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9ufSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogR2l2ZW4gYSBjbGFzcyBkZWNsYXJhdGlvbiwgZ2VuZXJhdGUgYSBjYWxsIHRvIGBzZXRDbGFzc01ldGFkYXRhYCB3aXRoIHRoZSBBbmd1bGFyIG1ldGFkYXRhXG4gKiBwcmVzZW50IG9uIHRoZSBjbGFzcyBvciBpdHMgbWVtYmVyIGZpZWxkcy5cbiAqXG4gKiBJZiBubyBzdWNoIG1ldGFkYXRhIGlzIHByZXNlbnQsIHRoaXMgZnVuY3Rpb24gcmV0dXJucyBgbnVsbGAuIE90aGVyd2lzZSwgdGhlIGNhbGwgaXMgcmV0dXJuZWRcbiAqIGFzIGEgYFN0YXRlbWVudGAgZm9yIGluY2x1c2lvbiBhbG9uZyB3aXRoIHRoZSBjbGFzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwoXG4gICAgY2xheno6IHRzLkRlY2xhcmF0aW9uLCByZWZsZWN0aW9uOiBSZWZsZWN0aW9uSG9zdCwgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsXG4gICAgaXNDb3JlOiBib29sZWFuKTogU3RhdGVtZW50fG51bGwge1xuICBpZiAoIXJlZmxlY3Rpb24uaXNDbGFzcyhjbGF6eikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBpZCA9IHRzLnVwZGF0ZUlkZW50aWZpZXIocmVmbGVjdGlvbi5nZXRBZGphY2VudE5hbWVPZkNsYXNzKGNsYXp6KSk7XG5cbiAgLy8gUmVmbGVjdCBvdmVyIHRoZSBjbGFzcyBkZWNvcmF0b3JzLiBJZiBub25lIGFyZSBwcmVzZW50LCBvciB0aG9zZSB0aGF0IGFyZSBhcmVuJ3QgZnJvbVxuICAvLyBBbmd1bGFyLCB0aGVuIHJldHVybiBudWxsLiBPdGhlcndpc2UsIHR1cm4gdGhlbSBpbnRvIG1ldGFkYXRhLlxuICBjb25zdCBjbGFzc0RlY29yYXRvcnMgPSByZWZsZWN0aW9uLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGNsYXp6KTtcbiAgaWYgKGNsYXNzRGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG5nQ2xhc3NEZWNvcmF0b3JzID1cbiAgICAgIGNsYXNzRGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IGlzQW5ndWxhckRlY29yYXRvcihkZWMsIGlzQ29yZSkpLm1hcChkZWNvcmF0b3JUb01ldGFkYXRhKTtcbiAgaWYgKG5nQ2xhc3NEZWNvcmF0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG1ldGFEZWNvcmF0b3JzID0gdHMuY3JlYXRlQXJyYXlMaXRlcmFsKG5nQ2xhc3NEZWNvcmF0b3JzKTtcblxuICAvLyBDb252ZXJ0IHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIHRvIG1ldGFkYXRhLCBwYXNzaW5nIG51bGwgaWYgbm9uZSBhcmUgcHJlc2VudC5cbiAgbGV0IG1ldGFDdG9yUGFyYW1ldGVyczogRXhwcmVzc2lvbiA9IG5ldyBMaXRlcmFsRXhwcihudWxsKTtcbiAgY29uc3QgY2xhc3NDdG9yUGFyYW1ldGVycyA9IHJlZmxlY3Rpb24uZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6KTtcbiAgaWYgKGNsYXNzQ3RvclBhcmFtZXRlcnMgIT09IG51bGwpIHtcbiAgICBjb25zdCBjdG9yUGFyYW1ldGVycyA9IGNsYXNzQ3RvclBhcmFtZXRlcnMubWFwKFxuICAgICAgICBwYXJhbSA9PiBjdG9yUGFyYW1ldGVyVG9NZXRhZGF0YShwYXJhbSwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmUpKTtcbiAgICBtZXRhQ3RvclBhcmFtZXRlcnMgPSBuZXcgRnVuY3Rpb25FeHByKFtdLCBbXG4gICAgICBuZXcgUmV0dXJuU3RhdGVtZW50KG5ldyBMaXRlcmFsQXJyYXlFeHByKGN0b3JQYXJhbWV0ZXJzKSksXG4gICAgXSk7XG4gIH1cblxuICAvLyBEbyB0aGUgc2FtZSBmb3IgcHJvcGVydHkgZGVjb3JhdG9ycy5cbiAgbGV0IG1ldGFQcm9wRGVjb3JhdG9yczogdHMuRXhwcmVzc2lvbiA9IHRzLmNyZWF0ZU51bGwoKTtcbiAgY29uc3QgY2xhc3NNZW1iZXJzID0gcmVmbGVjdGlvbi5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eikuZmlsdGVyKFxuICAgICAgbWVtYmVyID0+ICFtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLmRlY29yYXRvcnMgIT09IG51bGwgJiYgbWVtYmVyLmRlY29yYXRvcnMubGVuZ3RoID4gMCk7XG4gIGNvbnN0IGR1cGxpY2F0ZURlY29yYXRlZE1lbWJlck5hbWVzID1cbiAgICAgIGNsYXNzTWVtYmVycy5tYXAobWVtYmVyID0+IG1lbWJlci5uYW1lKS5maWx0ZXIoKG5hbWUsIGksIGFycikgPT4gYXJyLmluZGV4T2YobmFtZSkgPCBpKTtcbiAgaWYgKGR1cGxpY2F0ZURlY29yYXRlZE1lbWJlck5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAvLyBUaGlzIHNob3VsZCB0aGVvcmV0aWNhbGx5IG5ldmVyIGhhcHBlbiwgYmVjYXVzZSB0aGUgb25seSB3YXkgdG8gaGF2ZSBkdXBsaWNhdGUgaW5zdGFuY2VcbiAgICAvLyBtZW1iZXIgbmFtZXMgaXMgZ2V0dGVyL3NldHRlciBwYWlycyBhbmQgZGVjb3JhdG9ycyBjYW5ub3QgYXBwZWFyIGluIGJvdGggYSBnZXR0ZXIgYW5kIHRoZVxuICAgIC8vIGNvcnJlc3BvbmRpbmcgc2V0dGVyLlxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYER1cGxpY2F0ZSBkZWNvcmF0ZWQgcHJvcGVydGllcyBmb3VuZCBvbiBjbGFzcyAnJHtjbGF6ei5uYW1lLnRleHR9JzogYCArXG4gICAgICAgIGR1cGxpY2F0ZURlY29yYXRlZE1lbWJlck5hbWVzLmpvaW4oJywgJykpO1xuICB9XG4gIGNvbnN0IGRlY29yYXRlZE1lbWJlcnMgPVxuICAgICAgY2xhc3NNZW1iZXJzLm1hcChtZW1iZXIgPT4gY2xhc3NNZW1iZXJUb01ldGFkYXRhKG1lbWJlci5uYW1lLCBtZW1iZXIuZGVjb3JhdG9ycyAhLCBpc0NvcmUpKTtcbiAgaWYgKGRlY29yYXRlZE1lbWJlcnMubGVuZ3RoID4gMCkge1xuICAgIG1ldGFQcm9wRGVjb3JhdG9ycyA9IHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoZGVjb3JhdGVkTWVtYmVycyk7XG4gIH1cblxuICAvLyBHZW5lcmF0ZSBhIHB1cmUgY2FsbCB0byBzZXRDbGFzc01ldGFkYXRhIHdpdGggdGhlIGNsYXNzIGlkZW50aWZpZXIgYW5kIGl0cyBtZXRhZGF0YS5cbiAgY29uc3Qgc2V0Q2xhc3NNZXRhZGF0YSA9IG5ldyBFeHRlcm5hbEV4cHIoSWRlbnRpZmllcnMuc2V0Q2xhc3NNZXRhZGF0YSk7XG4gIGNvbnN0IGZuQ2FsbCA9IG5ldyBJbnZva2VGdW5jdGlvbkV4cHIoXG4gICAgICAvKiBmbiAqLyBzZXRDbGFzc01ldGFkYXRhLFxuICAgICAgLyogYXJncyAqL1xuICAgICAgW1xuICAgICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKGlkKSxcbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhRGVjb3JhdG9ycyksXG4gICAgICAgIG1ldGFDdG9yUGFyYW1ldGVycyxcbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhUHJvcERlY29yYXRvcnMpLFxuICAgICAgXSk7XG4gIGNvbnN0IGlpZmVGbiA9IG5ldyBGdW5jdGlvbkV4cHIoW10sIFtmbkNhbGwudG9TdG10KCldLCBOT05FX1RZUEUpO1xuICBjb25zdCBpaWZlID0gbmV3IEludm9rZUZ1bmN0aW9uRXhwcihcbiAgICAgIC8qIGZuICovIGlpZmVGbixcbiAgICAgIC8qIGFyZ3MgKi9bXSxcbiAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogc291cmNlU3BhbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBwdXJlICovIHRydWUpO1xuICByZXR1cm4gaWlmZS50b1N0bXQoKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgcmVmbGVjdGVkIGNvbnN0cnVjdG9yIHBhcmFtZXRlciB0byBtZXRhZGF0YS5cbiAqL1xuZnVuY3Rpb24gY3RvclBhcmFtZXRlclRvTWV0YWRhdGEoXG4gICAgcGFyYW06IEN0b3JQYXJhbWV0ZXIsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgIGlzQ29yZTogYm9vbGVhbik6IEV4cHJlc3Npb24ge1xuICAvLyBQYXJhbWV0ZXJzIHNvbWV0aW1lcyBoYXZlIGEgdHlwZSB0aGF0IGNhbiBiZSByZWZlcmVuY2VkLiBJZiBzbywgdGhlbiB1c2UgaXQsIG90aGVyd2lzZVxuICAvLyBpdHMgdHlwZSBpcyB1bmRlZmluZWQuXG4gIGNvbnN0IHR5cGUgPSBwYXJhbS50eXBlVmFsdWVSZWZlcmVuY2UgIT09IG51bGwgP1xuICAgICAgdmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24ocGFyYW0udHlwZVZhbHVlUmVmZXJlbmNlLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIpIDpcbiAgICAgIG5ldyBMaXRlcmFsRXhwcih1bmRlZmluZWQpO1xuXG4gIGNvbnN0IG1hcEVudHJpZXM6IHtrZXk6IHN0cmluZywgdmFsdWU6IEV4cHJlc3Npb24sIHF1b3RlZDogZmFsc2V9W10gPSBbXG4gICAge2tleTogJ3R5cGUnLCB2YWx1ZTogdHlwZSwgcXVvdGVkOiBmYWxzZX0sXG4gIF07XG5cbiAgLy8gSWYgdGhlIHBhcmFtZXRlciBoYXMgZGVjb3JhdG9ycywgaW5jbHVkZSB0aGUgb25lcyBmcm9tIEFuZ3VsYXIuXG4gIGlmIChwYXJhbS5kZWNvcmF0b3JzICE9PSBudWxsKSB7XG4gICAgY29uc3QgbmdEZWNvcmF0b3JzID1cbiAgICAgICAgcGFyYW0uZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IGlzQW5ndWxhckRlY29yYXRvcihkZWMsIGlzQ29yZSkpLm1hcChkZWNvcmF0b3JUb01ldGFkYXRhKTtcbiAgICBjb25zdCB2YWx1ZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodHMuY3JlYXRlQXJyYXlMaXRlcmFsKG5nRGVjb3JhdG9ycykpO1xuICAgIG1hcEVudHJpZXMucHVzaCh7a2V5OiAnZGVjb3JhdG9ycycsIHZhbHVlLCBxdW90ZWQ6IGZhbHNlfSk7XG4gIH1cbiAgcmV0dXJuIGxpdGVyYWxNYXAobWFwRW50cmllcyk7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHJlZmxlY3RlZCBjbGFzcyBtZW1iZXIgdG8gbWV0YWRhdGEuXG4gKi9cbmZ1bmN0aW9uIGNsYXNzTWVtYmVyVG9NZXRhZGF0YShcbiAgICBuYW1lOiBzdHJpbmcsIGRlY29yYXRvcnM6IERlY29yYXRvcltdLCBpc0NvcmU6IGJvb2xlYW4pOiB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQge1xuICBjb25zdCBuZ0RlY29yYXRvcnMgPVxuICAgICAgZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IGlzQW5ndWxhckRlY29yYXRvcihkZWMsIGlzQ29yZSkpLm1hcChkZWNvcmF0b3JUb01ldGFkYXRhKTtcbiAgY29uc3QgZGVjb3JhdG9yTWV0YSA9IHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChuZ0RlY29yYXRvcnMpO1xuICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KG5hbWUsIGRlY29yYXRvck1ldGEpO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSByZWZsZWN0ZWQgZGVjb3JhdG9yIHRvIG1ldGFkYXRhLlxuICovXG5mdW5jdGlvbiBkZWNvcmF0b3JUb01ldGFkYXRhKGRlY29yYXRvcjogRGVjb3JhdG9yKTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ge1xuICBpZiAoZGVjb3JhdG9yLmlkZW50aWZpZXIgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0lsbGVnYWwgc3RhdGU6IHN5bnRoZXNpemVkIGRlY29yYXRvciBjYW5ub3QgYmUgZW1pdHRlZCBpbiBjbGFzcyBtZXRhZGF0YS4nKTtcbiAgfVxuICAvLyBEZWNvcmF0b3JzIGhhdmUgYSB0eXBlLlxuICBjb25zdCBwcm9wZXJ0aWVzOiB0cy5PYmplY3RMaXRlcmFsRWxlbWVudExpa2VbXSA9IFtcbiAgICB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoJ3R5cGUnLCB0cy5nZXRNdXRhYmxlQ2xvbmUoZGVjb3JhdG9yLmlkZW50aWZpZXIpKSxcbiAgXTtcbiAgLy8gU29tZXRpbWVzIHRoZXkgaGF2ZSBhcmd1bWVudHMuXG4gIGlmIChkZWNvcmF0b3IuYXJncyAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgYXJncyA9IGRlY29yYXRvci5hcmdzLm1hcChhcmcgPT4gdHMuZ2V0TXV0YWJsZUNsb25lKGFyZykpO1xuICAgIHByb3BlcnRpZXMucHVzaCh0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoJ2FyZ3MnLCB0cy5jcmVhdGVBcnJheUxpdGVyYWwoYXJncykpKTtcbiAgfVxuICByZXR1cm4gdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChwcm9wZXJ0aWVzLCB0cnVlKTtcbn1cblxuLyoqXG4gKiBXaGV0aGVyIGEgZ2l2ZW4gZGVjb3JhdG9yIHNob3VsZCBiZSB0cmVhdGVkIGFzIGFuIEFuZ3VsYXIgZGVjb3JhdG9yLlxuICpcbiAqIEVpdGhlciBpdCdzIHVzZWQgaW4gQGFuZ3VsYXIvY29yZSwgb3IgaXQncyBpbXBvcnRlZCBmcm9tIHRoZXJlLlxuICovXG5mdW5jdGlvbiBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGlzQ29yZTogYm9vbGVhbik6IGJvb2xlYW4ge1xuICByZXR1cm4gaXNDb3JlIHx8IChkZWNvcmF0b3IuaW1wb3J0ICE9PSBudWxsICYmIGRlY29yYXRvci5pbXBvcnQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnKTtcbn1cbiJdfQ==