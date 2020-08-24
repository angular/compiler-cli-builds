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
        define("@angular/compiler-cli/src/ngtsc/metadata/src/util", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.hasInjectableFields = exports.CompoundMetadataReader = exports.extractDirectiveTypeCheckMeta = exports.readStringArrayType = exports.readStringMapType = exports.readStringType = exports.extractReferencesFromType = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    function extractReferencesFromType(checker, def, ngModuleImportedFrom, resolutionContext) {
        if (!ts.isTupleTypeNode(def)) {
            return [];
        }
        // TODO(alan-agius4): remove `def.elementTypes` and casts when TS 3.9 support is dropped and G3 is
        // using TS 4.0.
        return (def.elements || def.elementTypes)
            .map(function (element) {
            if (!ts.isTypeQueryNode(element)) {
                throw new Error("Expected TypeQueryNode: " + typescript_1.nodeDebugInfo(element));
            }
            var type = element.exprName;
            var _a = reflection_1.reflectTypeEntityToDeclaration(type, checker), node = _a.node, from = _a.from;
            if (!reflection_1.isNamedClassDeclaration(node)) {
                throw new Error("Expected named ClassDeclaration: " + typescript_1.nodeDebugInfo(node));
            }
            var specifier = (from !== null && !from.startsWith('.') ? from : ngModuleImportedFrom);
            if (specifier !== null) {
                return new imports_1.Reference(node, { specifier: specifier, resolutionContext: resolutionContext });
            }
            else {
                return new imports_1.Reference(node);
            }
        });
    }
    exports.extractReferencesFromType = extractReferencesFromType;
    function readStringType(type) {
        if (!ts.isLiteralTypeNode(type) || !ts.isStringLiteral(type.literal)) {
            return null;
        }
        return type.literal.text;
    }
    exports.readStringType = readStringType;
    function readStringMapType(type) {
        if (!ts.isTypeLiteralNode(type)) {
            return {};
        }
        var obj = {};
        type.members.forEach(function (member) {
            if (!ts.isPropertySignature(member) || member.type === undefined || member.name === undefined ||
                !ts.isStringLiteral(member.name)) {
                return;
            }
            var value = readStringType(member.type);
            if (value === null) {
                return null;
            }
            obj[member.name.text] = value;
        });
        return obj;
    }
    exports.readStringMapType = readStringMapType;
    function readStringArrayType(type) {
        if (!ts.isTupleTypeNode(type)) {
            return [];
        }
        var res = [];
        // TODO(alan-agius4): remove `def.elementTypes` and casts when TS 3.9 support is dropped and G3 is
        // using TS 4.0.
        (type.elements || type.elementTypes)
            .forEach(function (el) {
            if (!ts.isLiteralTypeNode(el) || !ts.isStringLiteral(el.literal)) {
                return;
            }
            res.push(el.literal.text);
        });
        return res;
    }
    exports.readStringArrayType = readStringArrayType;
    /**
     * Inspects the class' members and extracts the metadata that is used when type-checking templates
     * that use the directive. This metadata does not contain information from a base class, if any,
     * making this metadata invariant to changes of inherited classes.
     */
    function extractDirectiveTypeCheckMeta(node, inputs, reflector) {
        var e_1, _a;
        var members = reflector.getMembersOfClass(node);
        var staticMembers = members.filter(function (member) { return member.isStatic; });
        var ngTemplateGuards = staticMembers.map(extractTemplateGuard)
            .filter(function (guard) { return guard !== null; });
        var hasNgTemplateContextGuard = staticMembers.some(function (member) { return member.kind === reflection_1.ClassMemberKind.Method && member.name === 'ngTemplateContextGuard'; });
        var coercedInputFields = new Set(staticMembers.map(extractCoercedInput)
            .filter(function (inputName) { return inputName !== null; }));
        var restrictedInputFields = new Set();
        var stringLiteralInputFields = new Set();
        var undeclaredInputFields = new Set();
        var _loop_1 = function (fieldName) {
            var field = members.find(function (member) { return member.name === fieldName; });
            if (field === undefined || field.node === null) {
                undeclaredInputFields.add(fieldName);
                return "continue";
            }
            if (isRestricted(field.node)) {
                restrictedInputFields.add(fieldName);
            }
            if (field.nameNode !== null && ts.isStringLiteral(field.nameNode)) {
                stringLiteralInputFields.add(fieldName);
            }
        };
        try {
            for (var _b = tslib_1.__values(Object.keys(inputs)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var fieldName = _c.value;
                _loop_1(fieldName);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var arity = reflector.getGenericArityOfClass(node);
        return {
            hasNgTemplateContextGuard: hasNgTemplateContextGuard,
            ngTemplateGuards: ngTemplateGuards,
            coercedInputFields: coercedInputFields,
            restrictedInputFields: restrictedInputFields,
            stringLiteralInputFields: stringLiteralInputFields,
            undeclaredInputFields: undeclaredInputFields,
            isGeneric: arity !== null && arity > 0,
        };
    }
    exports.extractDirectiveTypeCheckMeta = extractDirectiveTypeCheckMeta;
    function isRestricted(node) {
        if (node.modifiers === undefined) {
            return false;
        }
        return node.modifiers.some(function (modifier) { return modifier.kind === ts.SyntaxKind.PrivateKeyword ||
            modifier.kind === ts.SyntaxKind.ProtectedKeyword ||
            modifier.kind === ts.SyntaxKind.ReadonlyKeyword; });
    }
    function extractTemplateGuard(member) {
        if (!member.name.startsWith('ngTemplateGuard_')) {
            return null;
        }
        var inputName = afterUnderscore(member.name);
        if (member.kind === reflection_1.ClassMemberKind.Property) {
            var type = null;
            if (member.type !== null && ts.isLiteralTypeNode(member.type) &&
                ts.isStringLiteral(member.type.literal)) {
                type = member.type.literal.text;
            }
            // Only property members with string literal type 'binding' are considered as template guard.
            if (type !== 'binding') {
                return null;
            }
            return { inputName: inputName, type: type };
        }
        else if (member.kind === reflection_1.ClassMemberKind.Method) {
            return { inputName: inputName, type: 'invocation' };
        }
        else {
            return null;
        }
    }
    function extractCoercedInput(member) {
        if (member.kind !== reflection_1.ClassMemberKind.Property || !member.name.startsWith('ngAcceptInputType_')) {
            return null;
        }
        return afterUnderscore(member.name);
    }
    /**
     * A `MetadataReader` that reads from an ordered set of child readers until it obtains the requested
     * metadata.
     *
     * This is used to combine `MetadataReader`s that read from different sources (e.g. from a registry
     * and from .d.ts files).
     */
    var CompoundMetadataReader = /** @class */ (function () {
        function CompoundMetadataReader(readers) {
            this.readers = readers;
        }
        CompoundMetadataReader.prototype.getDirectiveMetadata = function (node) {
            var e_2, _a;
            try {
                for (var _b = tslib_1.__values(this.readers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var reader = _c.value;
                    var meta = reader.getDirectiveMetadata(node);
                    if (meta !== null) {
                        return meta;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return null;
        };
        CompoundMetadataReader.prototype.getNgModuleMetadata = function (node) {
            var e_3, _a;
            try {
                for (var _b = tslib_1.__values(this.readers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var reader = _c.value;
                    var meta = reader.getNgModuleMetadata(node);
                    if (meta !== null) {
                        return meta;
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return null;
        };
        CompoundMetadataReader.prototype.getPipeMetadata = function (node) {
            var e_4, _a;
            try {
                for (var _b = tslib_1.__values(this.readers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var reader = _c.value;
                    var meta = reader.getPipeMetadata(node);
                    if (meta !== null) {
                        return meta;
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
            return null;
        };
        return CompoundMetadataReader;
    }());
    exports.CompoundMetadataReader = CompoundMetadataReader;
    function afterUnderscore(str) {
        var pos = str.indexOf('_');
        if (pos === -1) {
            throw new Error("Expected '" + str + "' to contain '_'");
        }
        return str.substr(pos + 1);
    }
    /** Returns whether a class declaration has the necessary class fields to make it injectable. */
    function hasInjectableFields(clazz, host) {
        var members = host.getMembersOfClass(clazz);
        return members.some(function (_a) {
            var isStatic = _a.isStatic, name = _a.name;
            return isStatic && (name === 'ɵprov' || name === 'ɵfac' || name === 'ɵinj');
        });
    }
    exports.hasInjectableFields = hasInjectableFields;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvbWV0YWRhdGEvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyxtRUFBd0M7SUFDeEMseUVBQXlKO0lBQ3pKLGtGQUF3RDtJQUl4RCxTQUFnQix5QkFBeUIsQ0FDckMsT0FBdUIsRUFBRSxHQUFnQixFQUFFLG9CQUFpQyxFQUM1RSxpQkFBeUI7UUFDM0IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDNUIsT0FBTyxFQUFFLENBQUM7U0FDWDtRQUVELGtHQUFrRztRQUNsRyxnQkFBZ0I7UUFDaEIsT0FBUSxDQUFFLEdBQVcsQ0FBQyxRQUFRLElBQUssR0FBVyxDQUFDLFlBQVksQ0FBK0I7YUFDckYsR0FBRyxDQUFDLFVBQUEsT0FBTztZQUNWLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLDZCQUEyQiwwQkFBYSxDQUFDLE9BQU8sQ0FBRyxDQUFDLENBQUM7YUFDdEU7WUFDRCxJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO1lBQ3hCLElBQUEsS0FBZSwyQ0FBOEIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQTNELElBQUksVUFBQSxFQUFFLElBQUksVUFBaUQsQ0FBQztZQUNuRSxJQUFJLENBQUMsb0NBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQW9DLDBCQUFhLENBQUMsSUFBSSxDQUFHLENBQUMsQ0FBQzthQUM1RTtZQUNELElBQU0sU0FBUyxHQUFHLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxD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QUNELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNILDZCQUFDO0lBQUQsQ0FBQyxBQS9CRCxJQStCQztJQS9CWSx3REFBc0I7SUFpQ25DLFNBQVMsZUFBZSxDQUFDLEdBQVc7UUFDbEMsSUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3QixJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsRUFBRTtZQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBYSxHQUFHLHFCQUFrQixDQUFDLENBQUM7U0FDckQ7UUFDRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxnR0FBZ0c7SUFDaEcsU0FBZ0IsbUJBQW1CLENBQUMsS0FBdUIsRUFBRSxJQUFvQjtRQUMvRSxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUMsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUNmLFVBQUMsRUFBZ0I7Z0JBQWYsUUFBUSxjQUFBLEVBQUUsSUFBSSxVQUFBO1lBQU0sT0FBQSxRQUFRLElBQUksQ0FBQyxJQUFJLEtBQUssT0FBTyxJQUFJLElBQUksS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLE1BQU0sQ0FBQztRQUFwRSxDQUFvRSxDQUFDLENBQUM7SUFDbEcsQ0FBQztJQUpELGtEQUlDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIENsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7bm9kZURlYnVnSW5mb30gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGlyZWN0aXZlTWV0YSwgRGlyZWN0aXZlVHlwZUNoZWNrTWV0YSwgTWV0YWRhdGFSZWFkZXIsIE5nTW9kdWxlTWV0YSwgUGlwZU1ldGEsIFRlbXBsYXRlR3VhcmRNZXRhfSBmcm9tICcuL2FwaSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKFxuICAgIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBkZWY6IHRzLlR5cGVOb2RlLCBuZ01vZHVsZUltcG9ydGVkRnJvbTogc3RyaW5nfG51bGwsXG4gICAgcmVzb2x1dGlvbkNvbnRleHQ6IHN0cmluZyk6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdIHtcbiAgaWYgKCF0cy5pc1R1cGxlVHlwZU5vZGUoZGVmKSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIC8vIFRPRE8oYWxhbi1hZ2l1czQpOiByZW1vdmUgYGRlZi5lbGVtZW50VHlwZXNgIGFuZCBjYXN0cyB3aGVuIFRTIDMuOSBzdXBwb3J0IGlzIGRyb3BwZWQgYW5kIEczIGlzXG4gIC8vIHVzaW5nIFRTIDQuMC5cbiAgcmV0dXJuICgoKGRlZiBhcyBhbnkpLmVsZW1lbnRzIHx8IChkZWYgYXMgYW55KS5lbGVtZW50VHlwZXMpIGFzIHRzLk5vZGVBcnJheTx0cy5UeXBlTm9kZT4pXG4gICAgICAubWFwKGVsZW1lbnQgPT4ge1xuICAgICAgICBpZiAoIXRzLmlzVHlwZVF1ZXJ5Tm9kZShlbGVtZW50KSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgVHlwZVF1ZXJ5Tm9kZTogJHtub2RlRGVidWdJbmZvKGVsZW1lbnQpfWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHR5cGUgPSBlbGVtZW50LmV4cHJOYW1lO1xuICAgICAgICBjb25zdCB7bm9kZSwgZnJvbX0gPSByZWZsZWN0VHlwZUVudGl0eVRvRGVjbGFyYXRpb24odHlwZSwgY2hlY2tlcik7XG4gICAgICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIG5hbWVkIENsYXNzRGVjbGFyYXRpb246ICR7bm9kZURlYnVnSW5mbyhub2RlKX1gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzcGVjaWZpZXIgPSAoZnJvbSAhPT0gbnVsbCAmJiAhZnJvbS5zdGFydHNXaXRoKCcuJykgPyBmcm9tIDogbmdNb2R1bGVJbXBvcnRlZEZyb20pO1xuICAgICAgICBpZiAoc3BlY2lmaWVyICE9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBSZWZlcmVuY2Uobm9kZSwge3NwZWNpZmllciwgcmVzb2x1dGlvbkNvbnRleHR9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gbmV3IFJlZmVyZW5jZShub2RlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkU3RyaW5nVHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IHN0cmluZ3xudWxsIHtcbiAgaWYgKCF0cy5pc0xpdGVyYWxUeXBlTm9kZSh0eXBlKSB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKHR5cGUubGl0ZXJhbCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gdHlwZS5saXRlcmFsLnRleHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkU3RyaW5nTWFwVHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9IHtcbiAgaWYgKCF0cy5pc1R5cGVMaXRlcmFsTm9kZSh0eXBlKSkge1xuICAgIHJldHVybiB7fTtcbiAgfVxuICBjb25zdCBvYmo6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIHR5cGUubWVtYmVycy5mb3JFYWNoKG1lbWJlciA9PiB7XG4gICAgaWYgKCF0cy5pc1Byb3BlcnR5U2lnbmF0dXJlKG1lbWJlcikgfHwgbWVtYmVyLnR5cGUgPT09IHVuZGVmaW5lZCB8fCBtZW1iZXIubmFtZSA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICF0cy5pc1N0cmluZ0xpdGVyYWwobWVtYmVyLm5hbWUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHZhbHVlID0gcmVhZFN0cmluZ1R5cGUobWVtYmVyLnR5cGUpO1xuICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIG9ialttZW1iZXIubmFtZS50ZXh0XSA9IHZhbHVlO1xuICB9KTtcbiAgcmV0dXJuIG9iajtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTdHJpbmdBcnJheVR5cGUodHlwZTogdHMuVHlwZU5vZGUpOiBzdHJpbmdbXSB7XG4gIGlmICghdHMuaXNUdXBsZVR5cGVOb2RlKHR5cGUpKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIGNvbnN0IHJlczogc3RyaW5nW10gPSBbXTtcbiAgLy8gVE9ETyhhbGFuLWFnaXVzNCk6IHJlbW92ZSBgZGVmLmVsZW1lbnRUeXBlc2AgYW5kIGNhc3RzIHdoZW4gVFMgMy45IHN1cHBvcnQgaXMgZHJvcHBlZCBhbmQgRzMgaXNcbiAgLy8gdXNpbmcgVFMgNC4wLlxuICAoKCh0eXBlIGFzIGFueSkuZWxlbWVudHMgfHwgKHR5cGUgYXMgYW55KS5lbGVtZW50VHlwZXMpIGFzIHRzLk5vZGVBcnJheTx0cy5UeXBlTm9kZT4pXG4gICAgICAuZm9yRWFjaChlbCA9PiB7XG4gICAgICAgIGlmICghdHMuaXNMaXRlcmFsVHlwZU5vZGUoZWwpIHx8ICF0cy5pc1N0cmluZ0xpdGVyYWwoZWwubGl0ZXJhbCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmVzLnB1c2goZWwubGl0ZXJhbC50ZXh0KTtcbiAgICAgIH0pO1xuICByZXR1cm4gcmVzO1xufVxuXG4vKipcbiAqIEluc3BlY3RzIHRoZSBjbGFzcycgbWVtYmVycyBhbmQgZXh0cmFjdHMgdGhlIG1ldGFkYXRhIHRoYXQgaXMgdXNlZCB3aGVuIHR5cGUtY2hlY2tpbmcgdGVtcGxhdGVzXG4gKiB0aGF0IHVzZSB0aGUgZGlyZWN0aXZlLiBUaGlzIG1ldGFkYXRhIGRvZXMgbm90IGNvbnRhaW4gaW5mb3JtYXRpb24gZnJvbSBhIGJhc2UgY2xhc3MsIGlmIGFueSxcbiAqIG1ha2luZyB0aGlzIG1ldGFkYXRhIGludmFyaWFudCB0byBjaGFuZ2VzIG9mIGluaGVyaXRlZCBjbGFzc2VzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdERpcmVjdGl2ZVR5cGVDaGVja01ldGEoXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgaW5wdXRzOiB7W2ZpZWxkTmFtZTogc3RyaW5nXTogc3RyaW5nfFtzdHJpbmcsIHN0cmluZ119LFxuICAgIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpOiBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhIHtcbiAgY29uc3QgbWVtYmVycyA9IHJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhub2RlKTtcbiAgY29uc3Qgc3RhdGljTWVtYmVycyA9IG1lbWJlcnMuZmlsdGVyKG1lbWJlciA9PiBtZW1iZXIuaXNTdGF0aWMpO1xuICBjb25zdCBuZ1RlbXBsYXRlR3VhcmRzID0gc3RhdGljTWVtYmVycy5tYXAoZXh0cmFjdFRlbXBsYXRlR3VhcmQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigoZ3VhcmQpOiBndWFyZCBpcyBUZW1wbGF0ZUd1YXJkTWV0YSA9PiBndWFyZCAhPT0gbnVsbCk7XG4gIGNvbnN0IGhhc05nVGVtcGxhdGVDb250ZXh0R3VhcmQgPSBzdGF0aWNNZW1iZXJzLnNvbWUoXG4gICAgICBtZW1iZXIgPT4gbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5NZXRob2QgJiYgbWVtYmVyLm5hbWUgPT09ICduZ1RlbXBsYXRlQ29udGV4dEd1YXJkJyk7XG5cbiAgY29uc3QgY29lcmNlZElucHV0RmllbGRzID1cbiAgICAgIG5ldyBTZXQoc3RhdGljTWVtYmVycy5tYXAoZXh0cmFjdENvZXJjZWRJbnB1dClcbiAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKGlucHV0TmFtZSk6IGlucHV0TmFtZSBpcyBzdHJpbmcgPT4gaW5wdXROYW1lICE9PSBudWxsKSk7XG5cbiAgY29uc3QgcmVzdHJpY3RlZElucHV0RmllbGRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IHN0cmluZ0xpdGVyYWxJbnB1dEZpZWxkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCB1bmRlY2xhcmVkSW5wdXRGaWVsZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICBmb3IgKGNvbnN0IGZpZWxkTmFtZSBvZiBPYmplY3Qua2V5cyhpbnB1dHMpKSB7XG4gICAgY29uc3QgZmllbGQgPSBtZW1iZXJzLmZpbmQobWVtYmVyID0+IG1lbWJlci5uYW1lID09PSBmaWVsZE5hbWUpO1xuICAgIGlmIChmaWVsZCA9PT0gdW5kZWZpbmVkIHx8IGZpZWxkLm5vZGUgPT09IG51bGwpIHtcbiAgICAgIHVuZGVjbGFyZWRJbnB1dEZpZWxkcy5hZGQoZmllbGROYW1lKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoaXNSZXN0cmljdGVkKGZpZWxkLm5vZGUpKSB7XG4gICAgICByZXN0cmljdGVkSW5wdXRGaWVsZHMuYWRkKGZpZWxkTmFtZSk7XG4gICAgfVxuICAgIGlmIChmaWVsZC5uYW1lTm9kZSAhPT0gbnVsbCAmJiB0cy5pc1N0cmluZ0xpdGVyYWwoZmllbGQubmFtZU5vZGUpKSB7XG4gICAgICBzdHJpbmdMaXRlcmFsSW5wdXRGaWVsZHMuYWRkKGZpZWxkTmFtZSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgYXJpdHkgPSByZWZsZWN0b3IuZ2V0R2VuZXJpY0FyaXR5T2ZDbGFzcyhub2RlKTtcblxuICByZXR1cm4ge1xuICAgIGhhc05nVGVtcGxhdGVDb250ZXh0R3VhcmQsXG4gICAgbmdUZW1wbGF0ZUd1YXJkcyxcbiAgICBjb2VyY2VkSW5wdXRGaWVsZHMsXG4gICAgcmVzdHJpY3RlZElucHV0RmllbGRzLFxuICAgIHN0cmluZ0xpdGVyYWxJbnB1dEZpZWxkcyxcbiAgICB1bmRlY2xhcmVkSW5wdXRGaWVsZHMsXG4gICAgaXNHZW5lcmljOiBhcml0eSAhPT0gbnVsbCAmJiBhcml0eSA+IDAsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGlzUmVzdHJpY3RlZChub2RlOiB0cy5Ob2RlKTogYm9vbGVhbiB7XG4gIGlmIChub2RlLm1vZGlmaWVycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIG5vZGUubW9kaWZpZXJzLnNvbWUoXG4gICAgICBtb2RpZmllciA9PiBtb2RpZmllci5raW5kID09PSB0cy5TeW50YXhLaW5kLlByaXZhdGVLZXl3b3JkIHx8XG4gICAgICAgICAgbW9kaWZpZXIua2luZCA9PT0gdHMuU3ludGF4S2luZC5Qcm90ZWN0ZWRLZXl3b3JkIHx8XG4gICAgICAgICAgbW9kaWZpZXIua2luZCA9PT0gdHMuU3ludGF4S2luZC5SZWFkb25seUtleXdvcmQpO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0VGVtcGxhdGVHdWFyZChtZW1iZXI6IENsYXNzTWVtYmVyKTogVGVtcGxhdGVHdWFyZE1ldGF8bnVsbCB7XG4gIGlmICghbWVtYmVyLm5hbWUuc3RhcnRzV2l0aCgnbmdUZW1wbGF0ZUd1YXJkXycpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgaW5wdXROYW1lID0gYWZ0ZXJVbmRlcnNjb3JlKG1lbWJlci5uYW1lKTtcbiAgaWYgKG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHkpIHtcbiAgICBsZXQgdHlwZTogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGlmIChtZW1iZXIudHlwZSAhPT0gbnVsbCAmJiB0cy5pc0xpdGVyYWxUeXBlTm9kZShtZW1iZXIudHlwZSkgJiZcbiAgICAgICAgdHMuaXNTdHJpbmdMaXRlcmFsKG1lbWJlci50eXBlLmxpdGVyYWwpKSB7XG4gICAgICB0eXBlID0gbWVtYmVyLnR5cGUubGl0ZXJhbC50ZXh0O1xuICAgIH1cblxuICAgIC8vIE9ubHkgcHJvcGVydHkgbWVtYmVycyB3aXRoIHN0cmluZyBsaXRlcmFsIHR5cGUgJ2JpbmRpbmcnIGFyZSBjb25zaWRlcmVkIGFzIHRlbXBsYXRlIGd1YXJkLlxuICAgIGlmICh0eXBlICE9PSAnYmluZGluZycpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge2lucHV0TmFtZSwgdHlwZX07XG4gIH0gZWxzZSBpZiAobWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5NZXRob2QpIHtcbiAgICByZXR1cm4ge2lucHV0TmFtZSwgdHlwZTogJ2ludm9jYXRpb24nfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBleHRyYWN0Q29lcmNlZElucHV0KG1lbWJlcjogQ2xhc3NNZW1iZXIpOiBzdHJpbmd8bnVsbCB7XG4gIGlmIChtZW1iZXIua2luZCAhPT0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5IHx8ICFtZW1iZXIubmFtZS5zdGFydHNXaXRoKCduZ0FjY2VwdElucHV0VHlwZV8nKSkge1xuICAgIHJldHVybiBudWxsITtcbiAgfVxuICByZXR1cm4gYWZ0ZXJVbmRlcnNjb3JlKG1lbWJlci5uYW1lKTtcbn1cblxuLyoqXG4gKiBBIGBNZXRhZGF0YVJlYWRlcmAgdGhhdCByZWFkcyBmcm9tIGFuIG9yZGVyZWQgc2V0IG9mIGNoaWxkIHJlYWRlcnMgdW50aWwgaXQgb2J0YWlucyB0aGUgcmVxdWVzdGVkXG4gKiBtZXRhZGF0YS5cbiAqXG4gKiBUaGlzIGlzIHVzZWQgdG8gY29tYmluZSBgTWV0YWRhdGFSZWFkZXJgcyB0aGF0IHJlYWQgZnJvbSBkaWZmZXJlbnQgc291cmNlcyAoZS5nLiBmcm9tIGEgcmVnaXN0cnlcbiAqIGFuZCBmcm9tIC5kLnRzIGZpbGVzKS5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBvdW5kTWV0YWRhdGFSZWFkZXIgaW1wbGVtZW50cyBNZXRhZGF0YVJlYWRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZGVyczogTWV0YWRhdGFSZWFkZXJbXSkge31cblxuICBnZXREaXJlY3RpdmVNZXRhZGF0YShub2RlOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5EZWNsYXJhdGlvbj4+KTogRGlyZWN0aXZlTWV0YXxudWxsIHtcbiAgICBmb3IgKGNvbnN0IHJlYWRlciBvZiB0aGlzLnJlYWRlcnMpIHtcbiAgICAgIGNvbnN0IG1ldGEgPSByZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEobm9kZSk7XG4gICAgICBpZiAobWV0YSAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbWV0YTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBnZXROZ01vZHVsZU1ldGFkYXRhKG5vZGU6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkRlY2xhcmF0aW9uPj4pOiBOZ01vZHVsZU1ldGF8bnVsbCB7XG4gICAgZm9yIChjb25zdCByZWFkZXIgb2YgdGhpcy5yZWFkZXJzKSB7XG4gICAgICBjb25zdCBtZXRhID0gcmVhZGVyLmdldE5nTW9kdWxlTWV0YWRhdGEobm9kZSk7XG4gICAgICBpZiAobWV0YSAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbWV0YTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgZ2V0UGlwZU1ldGFkYXRhKG5vZGU6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkRlY2xhcmF0aW9uPj4pOiBQaXBlTWV0YXxudWxsIHtcbiAgICBmb3IgKGNvbnN0IHJlYWRlciBvZiB0aGlzLnJlYWRlcnMpIHtcbiAgICAgIGNvbnN0IG1ldGEgPSByZWFkZXIuZ2V0UGlwZU1ldGFkYXRhKG5vZGUpO1xuICAgICAgaWYgKG1ldGEgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG1ldGE7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFmdGVyVW5kZXJzY29yZShzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHBvcyA9IHN0ci5pbmRleE9mKCdfJyk7XG4gIGlmIChwb3MgPT09IC0xKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCAnJHtzdHJ9JyB0byBjb250YWluICdfJ2ApO1xuICB9XG4gIHJldHVybiBzdHIuc3Vic3RyKHBvcyArIDEpO1xufVxuXG4vKiogUmV0dXJucyB3aGV0aGVyIGEgY2xhc3MgZGVjbGFyYXRpb24gaGFzIHRoZSBuZWNlc3NhcnkgY2xhc3MgZmllbGRzIHRvIG1ha2UgaXQgaW5qZWN0YWJsZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNJbmplY3RhYmxlRmllbGRzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBob3N0OiBSZWZsZWN0aW9uSG9zdCk6IGJvb2xlYW4ge1xuICBjb25zdCBtZW1iZXJzID0gaG9zdC5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eik7XG4gIHJldHVybiBtZW1iZXJzLnNvbWUoXG4gICAgICAoe2lzU3RhdGljLCBuYW1lfSkgPT4gaXNTdGF0aWMgJiYgKG5hbWUgPT09ICfJtXByb3YnIHx8IG5hbWUgPT09ICfJtWZhYycgfHwgbmFtZSA9PT0gJ8m1aW5qJykpO1xufVxuIl19