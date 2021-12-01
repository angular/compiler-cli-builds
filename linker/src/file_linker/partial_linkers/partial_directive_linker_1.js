(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1", ["require", "exports", "@angular/compiler", "@angular/compiler-cli/linker/src/fatal_linker_error", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createSourceSpan = exports.toR3DirectiveMeta = exports.PartialDirectiveLinkerVersion1 = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var fatal_linker_error_1 = require("@angular/compiler-cli/linker/src/fatal_linker_error");
    var util_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/util");
    /**
     * A `PartialLinker` that is designed to process `ɵɵngDeclareDirective()` call expressions.
     */
    var PartialDirectiveLinkerVersion1 = /** @class */ (function () {
        function PartialDirectiveLinkerVersion1(sourceUrl, code) {
            this.sourceUrl = sourceUrl;
            this.code = code;
        }
        PartialDirectiveLinkerVersion1.prototype.linkPartialDeclaration = function (constantPool, metaObj) {
            var meta = toR3DirectiveMeta(metaObj, this.code, this.sourceUrl);
            var def = compiler_1.compileDirectiveFromMetadata(meta, constantPool, compiler_1.makeBindingParser());
            return def.expression;
        };
        return PartialDirectiveLinkerVersion1;
    }());
    exports.PartialDirectiveLinkerVersion1 = PartialDirectiveLinkerVersion1;
    /**
     * Derives the `R3DirectiveMetadata` structure from the AST object.
     */
    function toR3DirectiveMeta(metaObj, code, sourceUrl) {
        var typeExpr = metaObj.getValue('type');
        var typeName = typeExpr.getSymbolName();
        if (typeName === null) {
            throw new fatal_linker_error_1.FatalLinkerError(typeExpr.expression, 'Unsupported type, its name could not be determined');
        }
        return {
            typeSourceSpan: createSourceSpan(typeExpr.getRange(), code, sourceUrl),
            type: util_1.wrapReference(typeExpr.getOpaque()),
            typeArgumentCount: 0,
            internalType: metaObj.getOpaque('type'),
            deps: null,
            host: toHostMetadata(metaObj),
            inputs: metaObj.has('inputs') ? metaObj.getObject('inputs').toLiteral(toInputMapping) : {},
            outputs: metaObj.has('outputs') ?
                metaObj.getObject('outputs').toLiteral(function (value) { return value.getString(); }) :
                {},
            queries: metaObj.has('queries') ?
                metaObj.getArray('queries').map(function (entry) { return toQueryMetadata(entry.getObject()); }) :
                [],
            viewQueries: metaObj.has('viewQueries') ?
                metaObj.getArray('viewQueries').map(function (entry) { return toQueryMetadata(entry.getObject()); }) :
                [],
            providers: metaObj.has('providers') ? metaObj.getOpaque('providers') : null,
            fullInheritance: false,
            selector: metaObj.has('selector') ? metaObj.getString('selector') : null,
            exportAs: metaObj.has('exportAs') ?
                metaObj.getArray('exportAs').map(function (entry) { return entry.getString(); }) :
                null,
            lifecycle: {
                usesOnChanges: metaObj.has('usesOnChanges') ? metaObj.getBoolean('usesOnChanges') : false,
            },
            name: typeName,
            usesInheritance: metaObj.has('usesInheritance') ? metaObj.getBoolean('usesInheritance') : false,
        };
    }
    exports.toR3DirectiveMeta = toR3DirectiveMeta;
    /**
     * Decodes the AST value for a single input to its representation as used in the metadata.
     */
    function toInputMapping(value) {
        if (value.isString()) {
            return value.getString();
        }
        var values = value.getArray().map(function (innerValue) { return innerValue.getString(); });
        if (values.length !== 2) {
            throw new fatal_linker_error_1.FatalLinkerError(value.expression, 'Unsupported input, expected a string or an array containing exactly two strings');
        }
        return values;
    }
    /**
     * Extracts the host metadata configuration from the AST metadata object.
     */
    function toHostMetadata(metaObj) {
        if (!metaObj.has('host')) {
            return {
                attributes: {},
                listeners: {},
                properties: {},
                specialAttributes: {},
            };
        }
        var host = metaObj.getObject('host');
        var specialAttributes = {};
        if (host.has('styleAttribute')) {
            specialAttributes.styleAttr = host.getString('styleAttribute');
        }
        if (host.has('classAttribute')) {
            specialAttributes.classAttr = host.getString('classAttribute');
        }
        return {
            attributes: host.has('attributes') ?
                host.getObject('attributes').toLiteral(function (value) { return value.getOpaque(); }) :
                {},
            listeners: host.has('listeners') ?
                host.getObject('listeners').toLiteral(function (value) { return value.getString(); }) :
                {},
            properties: host.has('properties') ?
                host.getObject('properties').toLiteral(function (value) { return value.getString(); }) :
                {},
            specialAttributes: specialAttributes,
        };
    }
    /**
     * Extracts the metadata for a single query from an AST object.
     */
    function toQueryMetadata(obj) {
        var predicate;
        var predicateExpr = obj.getValue('predicate');
        if (predicateExpr.isArray()) {
            predicate = predicateExpr.getArray().map(function (entry) { return entry.getString(); });
        }
        else {
            predicate = util_1.extractForwardRef(predicateExpr);
        }
        return {
            propertyName: obj.getString('propertyName'),
            first: obj.has('first') ? obj.getBoolean('first') : false,
            predicate: predicate,
            descendants: obj.has('descendants') ? obj.getBoolean('descendants') : false,
            emitDistinctChangesOnly: obj.has('emitDistinctChangesOnly') ? obj.getBoolean('emitDistinctChangesOnly') : true,
            read: obj.has('read') ? obj.getOpaque('read') : null,
            static: obj.has('static') ? obj.getBoolean('static') : false,
        };
    }
    function createSourceSpan(range, code, sourceUrl) {
        var sourceFile = new compiler_1.ParseSourceFile(code, sourceUrl);
        var startLocation = new compiler_1.ParseLocation(sourceFile, range.startPos, range.startLine, range.startCol);
        return new compiler_1.ParseSourceSpan(startLocation, startLocation.moveBy(range.endPos - range.startPos));
    }
    exports.createSourceSpan = createSourceSpan;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9kaXJlY3RpdmVfbGlua2VyXzEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9kaXJlY3RpdmVfbGlua2VyXzEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsOENBQWlSO0lBTWpSLDBGQUEwRDtJQUcxRCwwRkFBd0Q7SUFFeEQ7O09BRUc7SUFDSDtRQUNFLHdDQUFvQixTQUF5QixFQUFVLElBQVk7WUFBL0MsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQUcsQ0FBQztRQUV2RSwrREFBc0IsR0FBdEIsVUFDSSxZQUEwQixFQUMxQixPQUFxRDtZQUN2RCxJQUFNLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbkUsSUFBTSxHQUFHLEdBQUcsdUNBQTRCLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSw0QkFBaUIsRUFBRSxDQUFDLENBQUM7WUFDbEYsT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDO1FBQ3hCLENBQUM7UUFDSCxxQ0FBQztJQUFELENBQUMsQUFWRCxJQVVDO0lBVlksd0VBQThCO0lBWTNDOztPQUVHO0lBQ0gsU0FBZ0IsaUJBQWlCLENBQzdCLE9BQTJELEVBQUUsSUFBWSxFQUN6RSxTQUF5QjtRQUMzQixJQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFDLElBQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMxQyxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7WUFDckIsTUFBTSxJQUFJLHFD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Q0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ2pHLENBQUM7SUFMRCw0Q0FLQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtjb21waWxlRGlyZWN0aXZlRnJvbU1ldGFkYXRhLCBDb25zdGFudFBvb2wsIG1ha2VCaW5kaW5nUGFyc2VyLCBQYXJzZUxvY2F0aW9uLCBQYXJzZVNvdXJjZUZpbGUsIFBhcnNlU291cmNlU3BhbiwgUjNEZWNsYXJlRGlyZWN0aXZlTWV0YWRhdGEsIFIzRGVjbGFyZVF1ZXJ5TWV0YWRhdGEsIFIzRGlyZWN0aXZlTWV0YWRhdGEsIFIzSG9zdE1ldGFkYXRhLCBSM1BhcnRpYWxEZWNsYXJhdGlvbiwgUjNRdWVyeU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBvIGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9vdXRwdXQvb3V0cHV0X2FzdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1JhbmdlfSBmcm9tICcuLi8uLi9hc3QvYXN0X2hvc3QnO1xuaW1wb3J0IHtBc3RPYmplY3QsIEFzdFZhbHVlfSBmcm9tICcuLi8uLi9hc3QvYXN0X3ZhbHVlJztcbmltcG9ydCB7RmF0YWxMaW5rZXJFcnJvcn0gZnJvbSAnLi4vLi4vZmF0YWxfbGlua2VyX2Vycm9yJztcblxuaW1wb3J0IHtQYXJ0aWFsTGlua2VyfSBmcm9tICcuL3BhcnRpYWxfbGlua2VyJztcbmltcG9ydCB7ZXh0cmFjdEZvcndhcmRSZWYsIHdyYXBSZWZlcmVuY2V9IGZyb20gJy4vdXRpbCc7XG5cbi8qKlxuICogQSBgUGFydGlhbExpbmtlcmAgdGhhdCBpcyBkZXNpZ25lZCB0byBwcm9jZXNzIGDJtcm1bmdEZWNsYXJlRGlyZWN0aXZlKClgIGNhbGwgZXhwcmVzc2lvbnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBQYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjE8VEV4cHJlc3Npb24+IGltcGxlbWVudHMgUGFydGlhbExpbmtlcjxURXhwcmVzc2lvbj4ge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHNvdXJjZVVybDogQWJzb2x1dGVGc1BhdGgsIHByaXZhdGUgY29kZTogc3RyaW5nKSB7fVxuXG4gIGxpbmtQYXJ0aWFsRGVjbGFyYXRpb24oXG4gICAgICBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCxcbiAgICAgIG1ldGFPYmo6IEFzdE9iamVjdDxSM1BhcnRpYWxEZWNsYXJhdGlvbiwgVEV4cHJlc3Npb24+KTogby5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBtZXRhID0gdG9SM0RpcmVjdGl2ZU1ldGEobWV0YU9iaiwgdGhpcy5jb2RlLCB0aGlzLnNvdXJjZVVybCk7XG4gICAgY29uc3QgZGVmID0gY29tcGlsZURpcmVjdGl2ZUZyb21NZXRhZGF0YShtZXRhLCBjb25zdGFudFBvb2wsIG1ha2VCaW5kaW5nUGFyc2VyKCkpO1xuICAgIHJldHVybiBkZWYuZXhwcmVzc2lvbjtcbiAgfVxufVxuXG4vKipcbiAqIERlcml2ZXMgdGhlIGBSM0RpcmVjdGl2ZU1ldGFkYXRhYCBzdHJ1Y3R1cmUgZnJvbSB0aGUgQVNUIG9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvUjNEaXJlY3RpdmVNZXRhPFRFeHByZXNzaW9uPihcbiAgICBtZXRhT2JqOiBBc3RPYmplY3Q8UjNEZWNsYXJlRGlyZWN0aXZlTWV0YWRhdGEsIFRFeHByZXNzaW9uPiwgY29kZTogc3RyaW5nLFxuICAgIHNvdXJjZVVybDogQWJzb2x1dGVGc1BhdGgpOiBSM0RpcmVjdGl2ZU1ldGFkYXRhIHtcbiAgY29uc3QgdHlwZUV4cHIgPSBtZXRhT2JqLmdldFZhbHVlKCd0eXBlJyk7XG4gIGNvbnN0IHR5cGVOYW1lID0gdHlwZUV4cHIuZ2V0U3ltYm9sTmFtZSgpO1xuICBpZiAodHlwZU5hbWUgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgdHlwZUV4cHIuZXhwcmVzc2lvbiwgJ1Vuc3VwcG9ydGVkIHR5cGUsIGl0cyBuYW1lIGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkJyk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHR5cGVTb3VyY2VTcGFuOiBjcmVhdGVTb3VyY2VTcGFuKHR5cGVFeHByLmdldFJhbmdlKCksIGNvZGUsIHNvdXJjZVVybCksXG4gICAgdHlwZTogd3JhcFJlZmVyZW5jZSh0eXBlRXhwci5nZXRPcGFxdWUoKSksXG4gICAgdHlwZUFyZ3VtZW50Q291bnQ6IDAsXG4gICAgaW50ZXJuYWxUeXBlOiBtZXRhT2JqLmdldE9wYXF1ZSgndHlwZScpLFxuICAgIGRlcHM6IG51bGwsXG4gICAgaG9zdDogdG9Ib3N0TWV0YWRhdGEobWV0YU9iaiksXG4gICAgaW5wdXRzOiBtZXRhT2JqLmhhcygnaW5wdXRzJykgPyBtZXRhT2JqLmdldE9iamVjdCgnaW5wdXRzJykudG9MaXRlcmFsKHRvSW5wdXRNYXBwaW5nKSA6IHt9LFxuICAgIG91dHB1dHM6IG1ldGFPYmouaGFzKCdvdXRwdXRzJykgP1xuICAgICAgICBtZXRhT2JqLmdldE9iamVjdCgnb3V0cHV0cycpLnRvTGl0ZXJhbCh2YWx1ZSA9PiB2YWx1ZS5nZXRTdHJpbmcoKSkgOlxuICAgICAgICB7fSxcbiAgICBxdWVyaWVzOiBtZXRhT2JqLmhhcygncXVlcmllcycpID9cbiAgICAgICAgbWV0YU9iai5nZXRBcnJheSgncXVlcmllcycpLm1hcChlbnRyeSA9PiB0b1F1ZXJ5TWV0YWRhdGEoZW50cnkuZ2V0T2JqZWN0KCkpKSA6XG4gICAgICAgIFtdLFxuICAgIHZpZXdRdWVyaWVzOiBtZXRhT2JqLmhhcygndmlld1F1ZXJpZXMnKSA/XG4gICAgICAgIG1ldGFPYmouZ2V0QXJyYXkoJ3ZpZXdRdWVyaWVzJykubWFwKGVudHJ5ID0+IHRvUXVlcnlNZXRhZGF0YShlbnRyeS5nZXRPYmplY3QoKSkpIDpcbiAgICAgICAgW10sXG4gICAgcHJvdmlkZXJzOiBtZXRhT2JqLmhhcygncHJvdmlkZXJzJykgPyBtZXRhT2JqLmdldE9wYXF1ZSgncHJvdmlkZXJzJykgOiBudWxsLFxuICAgIGZ1bGxJbmhlcml0YW5jZTogZmFsc2UsXG4gICAgc2VsZWN0b3I6IG1ldGFPYmouaGFzKCdzZWxlY3RvcicpID8gbWV0YU9iai5nZXRTdHJpbmcoJ3NlbGVjdG9yJykgOiBudWxsLFxuICAgIGV4cG9ydEFzOiBtZXRhT2JqLmhhcygnZXhwb3J0QXMnKSA/XG4gICAgICAgIG1ldGFPYmouZ2V0QXJyYXkoJ2V4cG9ydEFzJykubWFwKGVudHJ5ID0+IGVudHJ5LmdldFN0cmluZygpKSA6XG4gICAgICAgIG51bGwsXG4gICAgbGlmZWN5Y2xlOiB7XG4gICAgICB1c2VzT25DaGFuZ2VzOiBtZXRhT2JqLmhhcygndXNlc09uQ2hhbmdlcycpID8gbWV0YU9iai5nZXRCb29sZWFuKCd1c2VzT25DaGFuZ2VzJykgOiBmYWxzZSxcbiAgICB9LFxuICAgIG5hbWU6IHR5cGVOYW1lLFxuICAgIHVzZXNJbmhlcml0YW5jZTogbWV0YU9iai5oYXMoJ3VzZXNJbmhlcml0YW5jZScpID8gbWV0YU9iai5nZXRCb29sZWFuKCd1c2VzSW5oZXJpdGFuY2UnKSA6IGZhbHNlLFxuICB9O1xufVxuXG4vKipcbiAqIERlY29kZXMgdGhlIEFTVCB2YWx1ZSBmb3IgYSBzaW5nbGUgaW5wdXQgdG8gaXRzIHJlcHJlc2VudGF0aW9uIGFzIHVzZWQgaW4gdGhlIG1ldGFkYXRhLlxuICovXG5mdW5jdGlvbiB0b0lucHV0TWFwcGluZzxURXhwcmVzc2lvbj4odmFsdWU6IEFzdFZhbHVlPHN0cmluZ3xbc3RyaW5nLCBzdHJpbmddLCBURXhwcmVzc2lvbj4pOlxuICAgIHN0cmluZ3xbc3RyaW5nLCBzdHJpbmddIHtcbiAgaWYgKHZhbHVlLmlzU3RyaW5nKCkpIHtcbiAgICByZXR1cm4gdmFsdWUuZ2V0U3RyaW5nKCk7XG4gIH1cblxuICBjb25zdCB2YWx1ZXMgPSB2YWx1ZS5nZXRBcnJheSgpLm1hcChpbm5lclZhbHVlID0+IGlubmVyVmFsdWUuZ2V0U3RyaW5nKCkpO1xuICBpZiAodmFsdWVzLmxlbmd0aCAhPT0gMikge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICB2YWx1ZS5leHByZXNzaW9uLFxuICAgICAgICAnVW5zdXBwb3J0ZWQgaW5wdXQsIGV4cGVjdGVkIGEgc3RyaW5nIG9yIGFuIGFycmF5IGNvbnRhaW5pbmcgZXhhY3RseSB0d28gc3RyaW5ncycpO1xuICB9XG4gIHJldHVybiB2YWx1ZXMgYXMgW3N0cmluZywgc3RyaW5nXTtcbn1cblxuLyoqXG4gKiBFeHRyYWN0cyB0aGUgaG9zdCBtZXRhZGF0YSBjb25maWd1cmF0aW9uIGZyb20gdGhlIEFTVCBtZXRhZGF0YSBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHRvSG9zdE1ldGFkYXRhPFRFeHByZXNzaW9uPihtZXRhT2JqOiBBc3RPYmplY3Q8UjNEZWNsYXJlRGlyZWN0aXZlTWV0YWRhdGEsIFRFeHByZXNzaW9uPik6XG4gICAgUjNIb3N0TWV0YWRhdGEge1xuICBpZiAoIW1ldGFPYmouaGFzKCdob3N0JykpIHtcbiAgICByZXR1cm4ge1xuICAgICAgYXR0cmlidXRlczoge30sXG4gICAgICBsaXN0ZW5lcnM6IHt9LFxuICAgICAgcHJvcGVydGllczoge30sXG4gICAgICBzcGVjaWFsQXR0cmlidXRlczoge30sXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGhvc3QgPSBtZXRhT2JqLmdldE9iamVjdCgnaG9zdCcpO1xuXG4gIGNvbnN0IHNwZWNpYWxBdHRyaWJ1dGVzOiBSM0hvc3RNZXRhZGF0YVsnc3BlY2lhbEF0dHJpYnV0ZXMnXSA9IHt9O1xuICBpZiAoaG9zdC5oYXMoJ3N0eWxlQXR0cmlidXRlJykpIHtcbiAgICBzcGVjaWFsQXR0cmlidXRlcy5zdHlsZUF0dHIgPSBob3N0LmdldFN0cmluZygnc3R5bGVBdHRyaWJ1dGUnKTtcbiAgfVxuICBpZiAoaG9zdC5oYXMoJ2NsYXNzQXR0cmlidXRlJykpIHtcbiAgICBzcGVjaWFsQXR0cmlidXRlcy5jbGFzc0F0dHIgPSBob3N0LmdldFN0cmluZygnY2xhc3NBdHRyaWJ1dGUnKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYXR0cmlidXRlczogaG9zdC5oYXMoJ2F0dHJpYnV0ZXMnKSA/XG4gICAgICAgIGhvc3QuZ2V0T2JqZWN0KCdhdHRyaWJ1dGVzJykudG9MaXRlcmFsKHZhbHVlID0+IHZhbHVlLmdldE9wYXF1ZSgpKSA6XG4gICAgICAgIHt9LFxuICAgIGxpc3RlbmVyczogaG9zdC5oYXMoJ2xpc3RlbmVycycpID9cbiAgICAgICAgaG9zdC5nZXRPYmplY3QoJ2xpc3RlbmVycycpLnRvTGl0ZXJhbCh2YWx1ZSA9PiB2YWx1ZS5nZXRTdHJpbmcoKSkgOlxuICAgICAgICB7fSxcbiAgICBwcm9wZXJ0aWVzOiBob3N0LmhhcygncHJvcGVydGllcycpID9cbiAgICAgICAgaG9zdC5nZXRPYmplY3QoJ3Byb3BlcnRpZXMnKS50b0xpdGVyYWwodmFsdWUgPT4gdmFsdWUuZ2V0U3RyaW5nKCkpIDpcbiAgICAgICAge30sXG4gICAgc3BlY2lhbEF0dHJpYnV0ZXMsXG4gIH07XG59XG5cbi8qKlxuICogRXh0cmFjdHMgdGhlIG1ldGFkYXRhIGZvciBhIHNpbmdsZSBxdWVyeSBmcm9tIGFuIEFTVCBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHRvUXVlcnlNZXRhZGF0YTxURXhwcmVzc2lvbj4ob2JqOiBBc3RPYmplY3Q8UjNEZWNsYXJlUXVlcnlNZXRhZGF0YSwgVEV4cHJlc3Npb24+KTpcbiAgICBSM1F1ZXJ5TWV0YWRhdGEge1xuICBsZXQgcHJlZGljYXRlOiBSM1F1ZXJ5TWV0YWRhdGFbJ3ByZWRpY2F0ZSddO1xuICBjb25zdCBwcmVkaWNhdGVFeHByID0gb2JqLmdldFZhbHVlKCdwcmVkaWNhdGUnKTtcbiAgaWYgKHByZWRpY2F0ZUV4cHIuaXNBcnJheSgpKSB7XG4gICAgcHJlZGljYXRlID0gcHJlZGljYXRlRXhwci5nZXRBcnJheSgpLm1hcChlbnRyeSA9PiBlbnRyeS5nZXRTdHJpbmcoKSk7XG4gIH0gZWxzZSB7XG4gICAgcHJlZGljYXRlID0gZXh0cmFjdEZvcndhcmRSZWYocHJlZGljYXRlRXhwcik7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBwcm9wZXJ0eU5hbWU6IG9iai5nZXRTdHJpbmcoJ3Byb3BlcnR5TmFtZScpLFxuICAgIGZpcnN0OiBvYmouaGFzKCdmaXJzdCcpID8gb2JqLmdldEJvb2xlYW4oJ2ZpcnN0JykgOiBmYWxzZSxcbiAgICBwcmVkaWNhdGUsXG4gICAgZGVzY2VuZGFudHM6IG9iai5oYXMoJ2Rlc2NlbmRhbnRzJykgPyBvYmouZ2V0Qm9vbGVhbignZGVzY2VuZGFudHMnKSA6IGZhbHNlLFxuICAgIGVtaXREaXN0aW5jdENoYW5nZXNPbmx5OlxuICAgICAgICBvYmouaGFzKCdlbWl0RGlzdGluY3RDaGFuZ2VzT25seScpID8gb2JqLmdldEJvb2xlYW4oJ2VtaXREaXN0aW5jdENoYW5nZXNPbmx5JykgOiB0cnVlLFxuICAgIHJlYWQ6IG9iai5oYXMoJ3JlYWQnKSA/IG9iai5nZXRPcGFxdWUoJ3JlYWQnKSA6IG51bGwsXG4gICAgc3RhdGljOiBvYmouaGFzKCdzdGF0aWMnKSA/IG9iai5nZXRCb29sZWFuKCdzdGF0aWMnKSA6IGZhbHNlLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU291cmNlU3BhbihyYW5nZTogUmFuZ2UsIGNvZGU6IHN0cmluZywgc291cmNlVXJsOiBzdHJpbmcpOiBQYXJzZVNvdXJjZVNwYW4ge1xuICBjb25zdCBzb3VyY2VGaWxlID0gbmV3IFBhcnNlU291cmNlRmlsZShjb2RlLCBzb3VyY2VVcmwpO1xuICBjb25zdCBzdGFydExvY2F0aW9uID1cbiAgICAgIG5ldyBQYXJzZUxvY2F0aW9uKHNvdXJjZUZpbGUsIHJhbmdlLnN0YXJ0UG9zLCByYW5nZS5zdGFydExpbmUsIHJhbmdlLnN0YXJ0Q29sKTtcbiAgcmV0dXJuIG5ldyBQYXJzZVNvdXJjZVNwYW4oc3RhcnRMb2NhdGlvbiwgc3RhcnRMb2NhdGlvbi5tb3ZlQnkocmFuZ2UuZW5kUG9zIC0gcmFuZ2Uuc3RhcnRQb3MpKTtcbn1cbiJdfQ==