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
        define("@angular/compiler-cli/src/ngtsc/metadata/src/util", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    function extractReferencesFromType(checker, def, ngModuleImportedFrom, resolutionContext) {
        if (!ts.isTupleTypeNode(def)) {
            return [];
        }
        return def.elementTypes.map(function (element) {
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
        type.elementTypes.forEach(function (el) {
            if (!ts.isLiteralTypeNode(el) || !ts.isStringLiteral(el.literal)) {
                return;
            }
            res.push(el.literal.text);
        });
        return res;
    }
    exports.readStringArrayType = readStringArrayType;
    function extractDirectiveGuards(node, reflector) {
        var staticMembers = reflector.getMembersOfClass(node).filter(function (member) { return member.isStatic; });
        var ngTemplateGuards = staticMembers.map(extractTemplateGuard)
            .filter(function (guard) { return guard !== null; });
        var hasNgTemplateContextGuard = staticMembers.some(function (member) { return member.kind === reflection_1.ClassMemberKind.Method && member.name === 'ngTemplateContextGuard'; });
        var coercedInputFields = new Set(staticMembers.map(extractCoercedInput)
            .filter(function (inputName) { return inputName !== null; }));
        return { hasNgTemplateContextGuard: hasNgTemplateContextGuard, ngTemplateGuards: ngTemplateGuards, coercedInputFields: coercedInputFields };
    }
    exports.extractDirectiveGuards = extractDirectiveGuards;
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
            var e_1, _a;
            try {
                for (var _b = tslib_1.__values(this.readers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var reader = _c.value;
                    var meta = reader.getDirectiveMetadata(node);
                    if (meta !== null) {
                        return meta;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return null;
        };
        CompoundMetadataReader.prototype.getNgModuleMetadata = function (node) {
            var e_2, _a;
            try {
                for (var _b = tslib_1.__values(this.readers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var reader = _c.value;
                    var meta = reader.getNgModuleMetadata(node);
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
        CompoundMetadataReader.prototype.getPipeMetadata = function (node) {
            var e_3, _a;
            try {
                for (var _b = tslib_1.__values(this.readers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var reader = _c.value;
                    var meta = reader.getPipeMetadata(node);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvbWV0YWRhdGEvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBRWpDLG1FQUF3QztJQUN4Qyx5RUFBeUo7SUFDekosa0ZBQXdEO0lBSXhELFNBQWdCLHlCQUF5QixDQUNyQyxPQUF1QixFQUFFLEdBQWdCLEVBQUUsb0JBQW1DLEVBQzlFLGlCQUF5QjtRQUMzQixJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUM1QixPQUFPLEVBQUUsQ0FBQztTQUNYO1FBQ0QsT0FBTyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxVQUFBLE9BQU87WUFDakMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ2hDLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTJCLDBCQUFhLENBQUMsT0FBTyxDQUFHLENBQUMsQ0FBQzthQUN0RTtZQUNELElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7WUFDeEIsSUFBQSwrREFBNEQsRUFBM0QsY0FBSSxFQUFFLGNBQXFELENBQUM7WUFDbkUsSUFBSSxDQUFDLG9DQUF1QixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFvQywwQkFBYSxDQUFDLElBQUksQ0FBRyxDQUFDLENBQUM7YUFDNUU7WUFDRCxJQUFNLFNBQVMsR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDekYsSUFBSSxT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LG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO29CQUM5QyxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7d0JBQ2pCLE9BQU8sSUFBSSxDQUFDO3FCQUNiO2lCQUNGOzs7Ozs7Ozs7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDRCxnREFBZSxHQUFmLFVBQWdCLElBQWlEOzs7Z0JBQy9ELEtBQXFCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsT0FBTyxDQUFBLGdCQUFBLDRCQUFFO29CQUE5QixJQUFNLE1BQU0sV0FBQTtvQkFDZixJQUFNLElBQUksR0FBRyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMxQyxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7d0JBQ2pCLE9BQU8sSUFBSSxDQUFDO3FCQUNiO2lCQUNGOzs7Ozs7Ozs7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCw2QkFBQztJQUFELENBQUMsQUEvQkQsSUErQkM7SUEvQlksd0RBQXNCO0lBaUNuQyxTQUFTLGVBQWUsQ0FBQyxHQUFXO1FBQ2xDLElBQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0IsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDZCxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWEsR0FBRyxxQkFBa0IsQ0FBQyxDQUFDO1NBQ3JEO1FBQ0QsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kLCBSZWZsZWN0aW9uSG9zdCwgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24sIHJlZmxlY3RUeXBlRW50aXR5VG9EZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge25vZGVEZWJ1Z0luZm99IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RpcmVjdGl2ZU1ldGEsIE1ldGFkYXRhUmVhZGVyLCBOZ01vZHVsZU1ldGEsIFBpcGVNZXRhLCBUZW1wbGF0ZUd1YXJkTWV0YX0gZnJvbSAnLi9hcGknO1xuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShcbiAgICBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgZGVmOiB0cy5UeXBlTm9kZSwgbmdNb2R1bGVJbXBvcnRlZEZyb206IHN0cmluZyB8IG51bGwsXG4gICAgcmVzb2x1dGlvbkNvbnRleHQ6IHN0cmluZyk6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdIHtcbiAgaWYgKCF0cy5pc1R1cGxlVHlwZU5vZGUoZGVmKSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICByZXR1cm4gZGVmLmVsZW1lbnRUeXBlcy5tYXAoZWxlbWVudCA9PiB7XG4gICAgaWYgKCF0cy5pc1R5cGVRdWVyeU5vZGUoZWxlbWVudCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgVHlwZVF1ZXJ5Tm9kZTogJHtub2RlRGVidWdJbmZvKGVsZW1lbnQpfWApO1xuICAgIH1cbiAgICBjb25zdCB0eXBlID0gZWxlbWVudC5leHByTmFtZTtcbiAgICBjb25zdCB7bm9kZSwgZnJvbX0gPSByZWZsZWN0VHlwZUVudGl0eVRvRGVjbGFyYXRpb24odHlwZSwgY2hlY2tlcik7XG4gICAgaWYgKCFpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBuYW1lZCBDbGFzc0RlY2xhcmF0aW9uOiAke25vZGVEZWJ1Z0luZm8obm9kZSl9YCk7XG4gICAgfVxuICAgIGNvbnN0IHNwZWNpZmllciA9IChmcm9tICE9PSBudWxsICYmICFmcm9tLnN0YXJ0c1dpdGgoJy4nKSA/IGZyb20gOiBuZ01vZHVsZUltcG9ydGVkRnJvbSk7XG4gICAgaWYgKHNwZWNpZmllciAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG5ldyBSZWZlcmVuY2Uobm9kZSwge3NwZWNpZmllciwgcmVzb2x1dGlvbkNvbnRleHR9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5ldyBSZWZlcmVuY2Uobm9kZSk7XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTdHJpbmdUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKTogc3RyaW5nfG51bGwge1xuICBpZiAoIXRzLmlzTGl0ZXJhbFR5cGVOb2RlKHR5cGUpIHx8ICF0cy5pc1N0cmluZ0xpdGVyYWwodHlwZS5saXRlcmFsKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiB0eXBlLmxpdGVyYWwudGV4dDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTdHJpbmdNYXBUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKToge1trZXk6IHN0cmluZ106IHN0cmluZ30ge1xuICBpZiAoIXRzLmlzVHlwZUxpdGVyYWxOb2RlKHR5cGUpKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG4gIGNvbnN0IG9iajoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgdHlwZS5tZW1iZXJzLmZvckVhY2gobWVtYmVyID0+IHtcbiAgICBpZiAoIXRzLmlzUHJvcGVydHlTaWduYXR1cmUobWVtYmVyKSB8fCBtZW1iZXIudHlwZSA9PT0gdW5kZWZpbmVkIHx8IG1lbWJlci5uYW1lID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIXRzLmlzU3RyaW5nTGl0ZXJhbChtZW1iZXIubmFtZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdmFsdWUgPSByZWFkU3RyaW5nVHlwZShtZW1iZXIudHlwZSk7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgb2JqW21lbWJlci5uYW1lLnRleHRdID0gdmFsdWU7XG4gIH0pO1xuICByZXR1cm4gb2JqO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN0cmluZ0FycmF5VHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IHN0cmluZ1tdIHtcbiAgaWYgKCF0cy5pc1R1cGxlVHlwZU5vZGUodHlwZSkpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgY29uc3QgcmVzOiBzdHJpbmdbXSA9IFtdO1xuICB0eXBlLmVsZW1lbnRUeXBlcy5mb3JFYWNoKGVsID0+IHtcbiAgICBpZiAoIXRzLmlzTGl0ZXJhbFR5cGVOb2RlKGVsKSB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKGVsLmxpdGVyYWwpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlcy5wdXNoKGVsLmxpdGVyYWwudGV4dCk7XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0RGlyZWN0aXZlR3VhcmRzKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpOiB7XG4gIG5nVGVtcGxhdGVHdWFyZHM6IFRlbXBsYXRlR3VhcmRNZXRhW10sXG4gIGhhc05nVGVtcGxhdGVDb250ZXh0R3VhcmQ6IGJvb2xlYW4sXG4gIGNvZXJjZWRJbnB1dEZpZWxkczogU2V0PHN0cmluZz4sXG59IHtcbiAgY29uc3Qgc3RhdGljTWVtYmVycyA9IHJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhub2RlKS5maWx0ZXIobWVtYmVyID0+IG1lbWJlci5pc1N0YXRpYyk7XG4gIGNvbnN0IG5nVGVtcGxhdGVHdWFyZHMgPSBzdGF0aWNNZW1iZXJzLm1hcChleHRyYWN0VGVtcGxhdGVHdWFyZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKChndWFyZCk6IGd1YXJkIGlzIFRlbXBsYXRlR3VhcmRNZXRhID0+IGd1YXJkICE9PSBudWxsKTtcbiAgY29uc3QgaGFzTmdUZW1wbGF0ZUNvbnRleHRHdWFyZCA9IHN0YXRpY01lbWJlcnMuc29tZShcbiAgICAgIG1lbWJlciA9PiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZCAmJiBtZW1iZXIubmFtZSA9PT0gJ25nVGVtcGxhdGVDb250ZXh0R3VhcmQnKTtcblxuICBjb25zdCBjb2VyY2VkSW5wdXRGaWVsZHMgPVxuICAgICAgbmV3IFNldChzdGF0aWNNZW1iZXJzLm1hcChleHRyYWN0Q29lcmNlZElucHV0KVxuICAgICAgICAgICAgICAgICAgLmZpbHRlcigoaW5wdXROYW1lKTogaW5wdXROYW1lIGlzIHN0cmluZyA9PiBpbnB1dE5hbWUgIT09IG51bGwpKTtcbiAgcmV0dXJuIHtoYXNOZ1RlbXBsYXRlQ29udGV4dEd1YXJkLCBuZ1RlbXBsYXRlR3VhcmRzLCBjb2VyY2VkSW5wdXRGaWVsZHN9O1xufVxuXG5mdW5jdGlvbiBleHRyYWN0VGVtcGxhdGVHdWFyZChtZW1iZXI6IENsYXNzTWVtYmVyKTogVGVtcGxhdGVHdWFyZE1ldGF8bnVsbCB7XG4gIGlmICghbWVtYmVyLm5hbWUuc3RhcnRzV2l0aCgnbmdUZW1wbGF0ZUd1YXJkXycpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgaW5wdXROYW1lID0gYWZ0ZXJVbmRlcnNjb3JlKG1lbWJlci5uYW1lKTtcbiAgaWYgKG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHkpIHtcbiAgICBsZXQgdHlwZTogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGlmIChtZW1iZXIudHlwZSAhPT0gbnVsbCAmJiB0cy5pc0xpdGVyYWxUeXBlTm9kZShtZW1iZXIudHlwZSkgJiZcbiAgICAgICAgdHMuaXNTdHJpbmdMaXRlcmFsKG1lbWJlci50eXBlLmxpdGVyYWwpKSB7XG4gICAgICB0eXBlID0gbWVtYmVyLnR5cGUubGl0ZXJhbC50ZXh0O1xuICAgIH1cblxuICAgIC8vIE9ubHkgcHJvcGVydHkgbWVtYmVycyB3aXRoIHN0cmluZyBsaXRlcmFsIHR5cGUgJ2JpbmRpbmcnIGFyZSBjb25zaWRlcmVkIGFzIHRlbXBsYXRlIGd1YXJkLlxuICAgIGlmICh0eXBlICE9PSAnYmluZGluZycpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge2lucHV0TmFtZSwgdHlwZX07XG4gIH0gZWxzZSBpZiAobWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5NZXRob2QpIHtcbiAgICByZXR1cm4ge2lucHV0TmFtZSwgdHlwZTogJ2ludm9jYXRpb24nfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBleHRyYWN0Q29lcmNlZElucHV0KG1lbWJlcjogQ2xhc3NNZW1iZXIpOiBzdHJpbmd8bnVsbCB7XG4gIGlmIChtZW1iZXIua2luZCAhPT0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5IHx8ICFtZW1iZXIubmFtZS5zdGFydHNXaXRoKCduZ0FjY2VwdElucHV0VHlwZV8nKSkge1xuICAgIHJldHVybiBudWxsICE7XG4gIH1cbiAgcmV0dXJuIGFmdGVyVW5kZXJzY29yZShtZW1iZXIubmFtZSk7XG59XG5cbi8qKlxuICogQSBgTWV0YWRhdGFSZWFkZXJgIHRoYXQgcmVhZHMgZnJvbSBhbiBvcmRlcmVkIHNldCBvZiBjaGlsZCByZWFkZXJzIHVudGlsIGl0IG9idGFpbnMgdGhlIHJlcXVlc3RlZFxuICogbWV0YWRhdGEuXG4gKlxuICogVGhpcyBpcyB1c2VkIHRvIGNvbWJpbmUgYE1ldGFkYXRhUmVhZGVyYHMgdGhhdCByZWFkIGZyb20gZGlmZmVyZW50IHNvdXJjZXMgKGUuZy4gZnJvbSBhIHJlZ2lzdHJ5XG4gKiBhbmQgZnJvbSAuZC50cyBmaWxlcykuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wb3VuZE1ldGFkYXRhUmVhZGVyIGltcGxlbWVudHMgTWV0YWRhdGFSZWFkZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRlcnM6IE1ldGFkYXRhUmVhZGVyW10pIHt9XG5cbiAgZ2V0RGlyZWN0aXZlTWV0YWRhdGEobm9kZTogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuRGVjbGFyYXRpb24+Pik6IERpcmVjdGl2ZU1ldGF8bnVsbCB7XG4gICAgZm9yIChjb25zdCByZWFkZXIgb2YgdGhpcy5yZWFkZXJzKSB7XG4gICAgICBjb25zdCBtZXRhID0gcmVhZGVyLmdldERpcmVjdGl2ZU1ldGFkYXRhKG5vZGUpO1xuICAgICAgaWYgKG1ldGEgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG1ldGE7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZ2V0TmdNb2R1bGVNZXRhZGF0YShub2RlOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5EZWNsYXJhdGlvbj4+KTogTmdNb2R1bGVNZXRhfG51bGwge1xuICAgIGZvciAoY29uc3QgcmVhZGVyIG9mIHRoaXMucmVhZGVycykge1xuICAgICAgY29uc3QgbWV0YSA9IHJlYWRlci5nZXROZ01vZHVsZU1ldGFkYXRhKG5vZGUpO1xuICAgICAgaWYgKG1ldGEgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG1ldGE7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGdldFBpcGVNZXRhZGF0YShub2RlOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5EZWNsYXJhdGlvbj4+KTogUGlwZU1ldGF8bnVsbCB7XG4gICAgZm9yIChjb25zdCByZWFkZXIgb2YgdGhpcy5yZWFkZXJzKSB7XG4gICAgICBjb25zdCBtZXRhID0gcmVhZGVyLmdldFBpcGVNZXRhZGF0YShub2RlKTtcbiAgICAgIGlmIChtZXRhICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBtZXRhO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBhZnRlclVuZGVyc2NvcmUoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBwb3MgPSBzdHIuaW5kZXhPZignXycpO1xuICBpZiAocG9zID09PSAtMSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgJyR7c3RyfScgdG8gY29udGFpbiAnXydgKTtcbiAgfVxuICByZXR1cm4gc3RyLnN1YnN0cihwb3MgKyAxKTtcbn1cbiJdfQ==