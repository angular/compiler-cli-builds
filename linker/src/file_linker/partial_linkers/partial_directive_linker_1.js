(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1", ["require", "exports", "@angular/compiler", "@angular/compiler-cli/linker/src/fatal_linker_error"], factory);
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
    /**
     * A `PartialLinker` that is designed to process `ɵɵngDeclareDirective()` call expressions.
     */
    var PartialDirectiveLinkerVersion1 = /** @class */ (function () {
        function PartialDirectiveLinkerVersion1() {
        }
        PartialDirectiveLinkerVersion1.prototype.linkPartialDeclaration = function (sourceUrl, code, constantPool, metaObj) {
            var meta = toR3DirectiveMeta(metaObj, code, sourceUrl);
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
            type: wrapReference(typeExpr.getOpaque()),
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
            predicate = predicateExpr.getOpaque();
        }
        return {
            propertyName: obj.getString('propertyName'),
            first: obj.has('first') ? obj.getBoolean('first') : false,
            predicate: predicate,
            descendants: obj.has('descendants') ? obj.getBoolean('descendants') : false,
            read: obj.has('read') ? obj.getOpaque('read') : null,
            static: obj.has('static') ? obj.getBoolean('static') : false,
        };
    }
    function wrapReference(wrapped) {
        return { value: wrapped, type: wrapped };
    }
    function createSourceSpan(range, code, sourceUrl) {
        var sourceFile = new compiler_1.ParseSourceFile(code, sourceUrl);
        var startLocation = new compiler_1.ParseLocation(sourceFile, range.startPos, range.startLine, range.startCol);
        return new compiler_1.ParseSourceSpan(startLocation, startLocation.moveBy(range.endPos - range.startPos));
    }
    exports.createSourceSpan = createSourceSpan;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9kaXJlY3RpdmVfbGlua2VyXzEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9kaXJlY3RpdmVfbGlua2VyXzEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsOENBQThSO0lBSzlSLDBGQUEwRDtJQUkxRDs7T0FFRztJQUNIO1FBQUE7UUFRQSxDQUFDO1FBUEMsK0RBQXNCLEdBQXRCLFVBQ0ksU0FBaUIsRUFBRSxJQUFZLEVBQUUsWUFBMEIsRUFDM0QsT0FBcUQ7WUFDdkQsSUFBTSxJQUFJLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN6RCxJQUFNLEdBQUcsR0FBRyx1Q0FBNEIsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLDRCQUFpQixFQUFFLENBQUMsQ0FBQztZQUNsRixPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUM7UUFDeEIsQ0FBQztRQUNILHFDQUFDO0lBQUQsQ0FBQyxBQVJELElBUUM7SUFSWSx3RUFBOEI7SUFVM0M7O09BRUc7SUFDSCxTQUFnQixpQkFBaUIsQ0FDN0IsT0FBMkQsRUFBRSxJQUFZLEVBQ3pFLFNBQWlCO1FBQ25CLElBQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUMsSUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzFDLElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtZQUNyQixNQUFNLElBQUkscUNBQWdCLENBQ3RCLFFBQVEsQ0FBQyxVQUFVLEVBQUUsb0RBQW9ELENBQUMsQ0FBQztTQUNoRjtRQUVELE9BQU87WUFDTCxjQUFjLEVBQUUsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUM7WUFDdEUsSUFBSSxFQUFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDekMsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixZQUFZLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDdkMsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsY0FBYyxDQUFDLE9BQU8sQ0FBQztZQUM3QixNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDMUYsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDN0IsT0FBTyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQWpCLENBQWlCLENBQUMsQ0FBQyxDQUFDO2dCQUNwRSxFQUFFO1lBQ04sT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDN0IsT0FBTyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxlQUFlLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQWxDLENBQWtDLENBQUMsQ0FBQyxDQUFDO2dCQUM5RSxFQUFFO1lBQ04sV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDckMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxlQUFlLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQWxDLENBQWtDLENBQUMsQ0FBQyxDQUFDO2dCQUNsRixFQUFFO1lBQ04sU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7WUFDM0UsZUFBZSxFQUFFLEtBQUs7WUFDdEIsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7WUFDeEUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDL0IsT0FBTyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQWpCLENBQWlCLENBQUMsQ0FBQyxDQUFDO2dCQUM5RCxJQUFJO1lBQ1IsU0FBUyxFQUFFO2dCQUNULGFBQWEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO2FBQzFGO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxlQUFlLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7U0FDaEcsQ0FBQztJQUNKLENBQUM7SUF2Q0QsOENBdUNDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLGNBQWMsQ0FBYyxLQUFxRDtRQUV4RixJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUNwQixPQUFPLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztTQUMxQjtRQUVELElBQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxVQUFVLElBQUksT0FBQSxVQUFVLENBQUMsU0FBUyxFQUFFLEVBQXRCLENBQXNCLENBQUMsQ0FBQztRQUMxRSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3ZCLE1BQU0sSUFBSSxxQ0FBZ0IsQ0FDdEIsS0FBSyxDQUFDLFVBQVUsRUFDaEIsaUZBQWlGLENBQUMsQ0FBQztTQUN4RjtRQUNELE9BQU8sTUFBMEIsQ0FBQztJQUNwQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLGNBQWMsQ0FBYyxPQUEyRDtRQUU5RixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN4QixPQUFPO2dCQUNMLFVBQVUsRUFBRSxFQUFFO2dCQUNkLFNBQVMsRUFBRSxFQUFFO2dCQUNiLFVBQVUsRUFBRSxFQUFFO2dCQUNkLGlCQUFpQixFQUFFLEVBQUU7YUFDdEIsQ0FBQztTQUNIO1FBRUQsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUV2QyxJQUFNLGlCQUFpQixHQUF3QyxFQUFFLENBQUM7UUFDbEUsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUU7WUFDOUIsaUJBQWlCLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztTQUNoRTtRQUNELElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQzlCLGlCQUFpQixDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7U0FDaEU7UUFFRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQWpCLENBQWlCLENBQUMsQ0FBQyxDQUFDO2dCQUNwRSxFQUFFO1lBQ04sU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQWpCLENBQWlCLENBQUMsQ0FBQyxDQUFDO2dCQUNuRSxFQUFFO1lBQ04sVUFBVSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQWpCLENBQWlCLENBQUMsQ0FBQyxDQUFDO2dCQUNwRSxFQUFFO1lBQ04saUJBQWlCLG1CQUFBO1NBQ2xCLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLGVBQWUsQ0FBYyxHQUFtRDtRQUV2RixJQUFJLFNBQXVDLENBQUM7UUFDNUMsSUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNoRCxJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUMzQixTQUFTLEdBQUcsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEtBQUssSUFBSSxPQUFBLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBakIsQ0FBaUIsQ0FBQyxDQUFDO1NBQ3RFO2FBQU07WUFDTCxTQUFTLEdBQUcsYUFBYSxDQUFDLFNBQVMsRUFBRSxDQUFDO1NBQ3ZDO1FBQ0QsT0FBTztZQUNMLFlBQVksRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQztZQUMzQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztZQUN6RCxTQUFTLFdBQUE7WUFDVCxXQUFXLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztZQUMzRSxJQUFJLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtZQUNwRCxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztTQUM3RCxDQUFDO0lBQ0osQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFjLE9BQXVDO1FBQ3pFLE9BQU8sRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQsU0FBZ0IsZ0JBQWdCLENBQUMsS0FBWSxFQUFFLElBQVksRUFBRSxTQUFpQjtRQUM1RSxJQUFNLFVBQVUsR0FBRyxJQUFJLDBCQUFlLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3hELElBQU0sYUFBYSxHQUNmLElBQUksd0JBQWEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRixPQUFPLElBQUksMEJBQWUsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ2pHLENBQUM7SUFMRCw0Q0FLQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtjb21waWxlRGlyZWN0aXZlRnJvbU1ldGFkYXRhLCBDb25zdGFudFBvb2wsIG1ha2VCaW5kaW5nUGFyc2VyLCBQYXJzZUxvY2F0aW9uLCBQYXJzZVNvdXJjZUZpbGUsIFBhcnNlU291cmNlU3BhbiwgUjNEZWNsYXJlRGlyZWN0aXZlTWV0YWRhdGEsIFIzRGVjbGFyZVF1ZXJ5TWV0YWRhdGEsIFIzRGlyZWN0aXZlTWV0YWRhdGEsIFIzSG9zdE1ldGFkYXRhLCBSM1BhcnRpYWxEZWNsYXJhdGlvbiwgUjNRdWVyeU1ldGFkYXRhLCBSM1JlZmVyZW5jZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgbyBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvb3V0cHV0L291dHB1dF9hc3QnO1xuXG5pbXBvcnQge1JhbmdlfSBmcm9tICcuLi8uLi9hc3QvYXN0X2hvc3QnO1xuaW1wb3J0IHtBc3RPYmplY3QsIEFzdFZhbHVlfSBmcm9tICcuLi8uLi9hc3QvYXN0X3ZhbHVlJztcbmltcG9ydCB7RmF0YWxMaW5rZXJFcnJvcn0gZnJvbSAnLi4vLi4vZmF0YWxfbGlua2VyX2Vycm9yJztcblxuaW1wb3J0IHtQYXJ0aWFsTGlua2VyfSBmcm9tICcuL3BhcnRpYWxfbGlua2VyJztcblxuLyoqXG4gKiBBIGBQYXJ0aWFsTGlua2VyYCB0aGF0IGlzIGRlc2lnbmVkIHRvIHByb2Nlc3MgYMm1ybVuZ0RlY2xhcmVEaXJlY3RpdmUoKWAgY2FsbCBleHByZXNzaW9ucy5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhcnRpYWxEaXJlY3RpdmVMaW5rZXJWZXJzaW9uMTxURXhwcmVzc2lvbj4gaW1wbGVtZW50cyBQYXJ0aWFsTGlua2VyPFRFeHByZXNzaW9uPiB7XG4gIGxpbmtQYXJ0aWFsRGVjbGFyYXRpb24oXG4gICAgICBzb3VyY2VVcmw6IHN0cmluZywgY29kZTogc3RyaW5nLCBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCxcbiAgICAgIG1ldGFPYmo6IEFzdE9iamVjdDxSM1BhcnRpYWxEZWNsYXJhdGlvbiwgVEV4cHJlc3Npb24+KTogby5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBtZXRhID0gdG9SM0RpcmVjdGl2ZU1ldGEobWV0YU9iaiwgY29kZSwgc291cmNlVXJsKTtcbiAgICBjb25zdCBkZWYgPSBjb21waWxlRGlyZWN0aXZlRnJvbU1ldGFkYXRhKG1ldGEsIGNvbnN0YW50UG9vbCwgbWFrZUJpbmRpbmdQYXJzZXIoKSk7XG4gICAgcmV0dXJuIGRlZi5leHByZXNzaW9uO1xuICB9XG59XG5cbi8qKlxuICogRGVyaXZlcyB0aGUgYFIzRGlyZWN0aXZlTWV0YWRhdGFgIHN0cnVjdHVyZSBmcm9tIHRoZSBBU1Qgb2JqZWN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9SM0RpcmVjdGl2ZU1ldGE8VEV4cHJlc3Npb24+KFxuICAgIG1ldGFPYmo6IEFzdE9iamVjdDxSM0RlY2xhcmVEaXJlY3RpdmVNZXRhZGF0YSwgVEV4cHJlc3Npb24+LCBjb2RlOiBzdHJpbmcsXG4gICAgc291cmNlVXJsOiBzdHJpbmcpOiBSM0RpcmVjdGl2ZU1ldGFkYXRhIHtcbiAgY29uc3QgdHlwZUV4cHIgPSBtZXRhT2JqLmdldFZhbHVlKCd0eXBlJyk7XG4gIGNvbnN0IHR5cGVOYW1lID0gdHlwZUV4cHIuZ2V0U3ltYm9sTmFtZSgpO1xuICBpZiAodHlwZU5hbWUgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgdHlwZUV4cHIuZXhwcmVzc2lvbiwgJ1Vuc3VwcG9ydGVkIHR5cGUsIGl0cyBuYW1lIGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkJyk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHR5cGVTb3VyY2VTcGFuOiBjcmVhdGVTb3VyY2VTcGFuKHR5cGVFeHByLmdldFJhbmdlKCksIGNvZGUsIHNvdXJjZVVybCksXG4gICAgdHlwZTogd3JhcFJlZmVyZW5jZSh0eXBlRXhwci5nZXRPcGFxdWUoKSksXG4gICAgdHlwZUFyZ3VtZW50Q291bnQ6IDAsXG4gICAgaW50ZXJuYWxUeXBlOiBtZXRhT2JqLmdldE9wYXF1ZSgndHlwZScpLFxuICAgIGRlcHM6IG51bGwsXG4gICAgaG9zdDogdG9Ib3N0TWV0YWRhdGEobWV0YU9iaiksXG4gICAgaW5wdXRzOiBtZXRhT2JqLmhhcygnaW5wdXRzJykgPyBtZXRhT2JqLmdldE9iamVjdCgnaW5wdXRzJykudG9MaXRlcmFsKHRvSW5wdXRNYXBwaW5nKSA6IHt9LFxuICAgIG91dHB1dHM6IG1ldGFPYmouaGFzKCdvdXRwdXRzJykgP1xuICAgICAgICBtZXRhT2JqLmdldE9iamVjdCgnb3V0cHV0cycpLnRvTGl0ZXJhbCh2YWx1ZSA9PiB2YWx1ZS5nZXRTdHJpbmcoKSkgOlxuICAgICAgICB7fSxcbiAgICBxdWVyaWVzOiBtZXRhT2JqLmhhcygncXVlcmllcycpID9cbiAgICAgICAgbWV0YU9iai5nZXRBcnJheSgncXVlcmllcycpLm1hcChlbnRyeSA9PiB0b1F1ZXJ5TWV0YWRhdGEoZW50cnkuZ2V0T2JqZWN0KCkpKSA6XG4gICAgICAgIFtdLFxuICAgIHZpZXdRdWVyaWVzOiBtZXRhT2JqLmhhcygndmlld1F1ZXJpZXMnKSA/XG4gICAgICAgIG1ldGFPYmouZ2V0QXJyYXkoJ3ZpZXdRdWVyaWVzJykubWFwKGVudHJ5ID0+IHRvUXVlcnlNZXRhZGF0YShlbnRyeS5nZXRPYmplY3QoKSkpIDpcbiAgICAgICAgW10sXG4gICAgcHJvdmlkZXJzOiBtZXRhT2JqLmhhcygncHJvdmlkZXJzJykgPyBtZXRhT2JqLmdldE9wYXF1ZSgncHJvdmlkZXJzJykgOiBudWxsLFxuICAgIGZ1bGxJbmhlcml0YW5jZTogZmFsc2UsXG4gICAgc2VsZWN0b3I6IG1ldGFPYmouaGFzKCdzZWxlY3RvcicpID8gbWV0YU9iai5nZXRTdHJpbmcoJ3NlbGVjdG9yJykgOiBudWxsLFxuICAgIGV4cG9ydEFzOiBtZXRhT2JqLmhhcygnZXhwb3J0QXMnKSA/XG4gICAgICAgIG1ldGFPYmouZ2V0QXJyYXkoJ2V4cG9ydEFzJykubWFwKGVudHJ5ID0+IGVudHJ5LmdldFN0cmluZygpKSA6XG4gICAgICAgIG51bGwsXG4gICAgbGlmZWN5Y2xlOiB7XG4gICAgICB1c2VzT25DaGFuZ2VzOiBtZXRhT2JqLmhhcygndXNlc09uQ2hhbmdlcycpID8gbWV0YU9iai5nZXRCb29sZWFuKCd1c2VzT25DaGFuZ2VzJykgOiBmYWxzZSxcbiAgICB9LFxuICAgIG5hbWU6IHR5cGVOYW1lLFxuICAgIHVzZXNJbmhlcml0YW5jZTogbWV0YU9iai5oYXMoJ3VzZXNJbmhlcml0YW5jZScpID8gbWV0YU9iai5nZXRCb29sZWFuKCd1c2VzSW5oZXJpdGFuY2UnKSA6IGZhbHNlLFxuICB9O1xufVxuXG4vKipcbiAqIERlY29kZXMgdGhlIEFTVCB2YWx1ZSBmb3IgYSBzaW5nbGUgaW5wdXQgdG8gaXRzIHJlcHJlc2VudGF0aW9uIGFzIHVzZWQgaW4gdGhlIG1ldGFkYXRhLlxuICovXG5mdW5jdGlvbiB0b0lucHV0TWFwcGluZzxURXhwcmVzc2lvbj4odmFsdWU6IEFzdFZhbHVlPHN0cmluZ3xbc3RyaW5nLCBzdHJpbmddLCBURXhwcmVzc2lvbj4pOlxuICAgIHN0cmluZ3xbc3RyaW5nLCBzdHJpbmddIHtcbiAgaWYgKHZhbHVlLmlzU3RyaW5nKCkpIHtcbiAgICByZXR1cm4gdmFsdWUuZ2V0U3RyaW5nKCk7XG4gIH1cblxuICBjb25zdCB2YWx1ZXMgPSB2YWx1ZS5nZXRBcnJheSgpLm1hcChpbm5lclZhbHVlID0+IGlubmVyVmFsdWUuZ2V0U3RyaW5nKCkpO1xuICBpZiAodmFsdWVzLmxlbmd0aCAhPT0gMikge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICB2YWx1ZS5leHByZXNzaW9uLFxuICAgICAgICAnVW5zdXBwb3J0ZWQgaW5wdXQsIGV4cGVjdGVkIGEgc3RyaW5nIG9yIGFuIGFycmF5IGNvbnRhaW5pbmcgZXhhY3RseSB0d28gc3RyaW5ncycpO1xuICB9XG4gIHJldHVybiB2YWx1ZXMgYXMgW3N0cmluZywgc3RyaW5nXTtcbn1cblxuLyoqXG4gKiBFeHRyYWN0cyB0aGUgaG9zdCBtZXRhZGF0YSBjb25maWd1cmF0aW9uIGZyb20gdGhlIEFTVCBtZXRhZGF0YSBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHRvSG9zdE1ldGFkYXRhPFRFeHByZXNzaW9uPihtZXRhT2JqOiBBc3RPYmplY3Q8UjNEZWNsYXJlRGlyZWN0aXZlTWV0YWRhdGEsIFRFeHByZXNzaW9uPik6XG4gICAgUjNIb3N0TWV0YWRhdGEge1xuICBpZiAoIW1ldGFPYmouaGFzKCdob3N0JykpIHtcbiAgICByZXR1cm4ge1xuICAgICAgYXR0cmlidXRlczoge30sXG4gICAgICBsaXN0ZW5lcnM6IHt9LFxuICAgICAgcHJvcGVydGllczoge30sXG4gICAgICBzcGVjaWFsQXR0cmlidXRlczoge30sXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGhvc3QgPSBtZXRhT2JqLmdldE9iamVjdCgnaG9zdCcpO1xuXG4gIGNvbnN0IHNwZWNpYWxBdHRyaWJ1dGVzOiBSM0hvc3RNZXRhZGF0YVsnc3BlY2lhbEF0dHJpYnV0ZXMnXSA9IHt9O1xuICBpZiAoaG9zdC5oYXMoJ3N0eWxlQXR0cmlidXRlJykpIHtcbiAgICBzcGVjaWFsQXR0cmlidXRlcy5zdHlsZUF0dHIgPSBob3N0LmdldFN0cmluZygnc3R5bGVBdHRyaWJ1dGUnKTtcbiAgfVxuICBpZiAoaG9zdC5oYXMoJ2NsYXNzQXR0cmlidXRlJykpIHtcbiAgICBzcGVjaWFsQXR0cmlidXRlcy5jbGFzc0F0dHIgPSBob3N0LmdldFN0cmluZygnY2xhc3NBdHRyaWJ1dGUnKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYXR0cmlidXRlczogaG9zdC5oYXMoJ2F0dHJpYnV0ZXMnKSA/XG4gICAgICAgIGhvc3QuZ2V0T2JqZWN0KCdhdHRyaWJ1dGVzJykudG9MaXRlcmFsKHZhbHVlID0+IHZhbHVlLmdldE9wYXF1ZSgpKSA6XG4gICAgICAgIHt9LFxuICAgIGxpc3RlbmVyczogaG9zdC5oYXMoJ2xpc3RlbmVycycpID9cbiAgICAgICAgaG9zdC5nZXRPYmplY3QoJ2xpc3RlbmVycycpLnRvTGl0ZXJhbCh2YWx1ZSA9PiB2YWx1ZS5nZXRTdHJpbmcoKSkgOlxuICAgICAgICB7fSxcbiAgICBwcm9wZXJ0aWVzOiBob3N0LmhhcygncHJvcGVydGllcycpID9cbiAgICAgICAgaG9zdC5nZXRPYmplY3QoJ3Byb3BlcnRpZXMnKS50b0xpdGVyYWwodmFsdWUgPT4gdmFsdWUuZ2V0U3RyaW5nKCkpIDpcbiAgICAgICAge30sXG4gICAgc3BlY2lhbEF0dHJpYnV0ZXMsXG4gIH07XG59XG5cbi8qKlxuICogRXh0cmFjdHMgdGhlIG1ldGFkYXRhIGZvciBhIHNpbmdsZSBxdWVyeSBmcm9tIGFuIEFTVCBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHRvUXVlcnlNZXRhZGF0YTxURXhwcmVzc2lvbj4ob2JqOiBBc3RPYmplY3Q8UjNEZWNsYXJlUXVlcnlNZXRhZGF0YSwgVEV4cHJlc3Npb24+KTpcbiAgICBSM1F1ZXJ5TWV0YWRhdGEge1xuICBsZXQgcHJlZGljYXRlOiBSM1F1ZXJ5TWV0YWRhdGFbJ3ByZWRpY2F0ZSddO1xuICBjb25zdCBwcmVkaWNhdGVFeHByID0gb2JqLmdldFZhbHVlKCdwcmVkaWNhdGUnKTtcbiAgaWYgKHByZWRpY2F0ZUV4cHIuaXNBcnJheSgpKSB7XG4gICAgcHJlZGljYXRlID0gcHJlZGljYXRlRXhwci5nZXRBcnJheSgpLm1hcChlbnRyeSA9PiBlbnRyeS5nZXRTdHJpbmcoKSk7XG4gIH0gZWxzZSB7XG4gICAgcHJlZGljYXRlID0gcHJlZGljYXRlRXhwci5nZXRPcGFxdWUoKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIHByb3BlcnR5TmFtZTogb2JqLmdldFN0cmluZygncHJvcGVydHlOYW1lJyksXG4gICAgZmlyc3Q6IG9iai5oYXMoJ2ZpcnN0JykgPyBvYmouZ2V0Qm9vbGVhbignZmlyc3QnKSA6IGZhbHNlLFxuICAgIHByZWRpY2F0ZSxcbiAgICBkZXNjZW5kYW50czogb2JqLmhhcygnZGVzY2VuZGFudHMnKSA/IG9iai5nZXRCb29sZWFuKCdkZXNjZW5kYW50cycpIDogZmFsc2UsXG4gICAgcmVhZDogb2JqLmhhcygncmVhZCcpID8gb2JqLmdldE9wYXF1ZSgncmVhZCcpIDogbnVsbCxcbiAgICBzdGF0aWM6IG9iai5oYXMoJ3N0YXRpYycpID8gb2JqLmdldEJvb2xlYW4oJ3N0YXRpYycpIDogZmFsc2UsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHdyYXBSZWZlcmVuY2U8VEV4cHJlc3Npb24+KHdyYXBwZWQ6IG8uV3JhcHBlZE5vZGVFeHByPFRFeHByZXNzaW9uPik6IFIzUmVmZXJlbmNlIHtcbiAgcmV0dXJuIHt2YWx1ZTogd3JhcHBlZCwgdHlwZTogd3JhcHBlZH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTb3VyY2VTcGFuKHJhbmdlOiBSYW5nZSwgY29kZTogc3RyaW5nLCBzb3VyY2VVcmw6IHN0cmluZyk6IFBhcnNlU291cmNlU3BhbiB7XG4gIGNvbnN0IHNvdXJjZUZpbGUgPSBuZXcgUGFyc2VTb3VyY2VGaWxlKGNvZGUsIHNvdXJjZVVybCk7XG4gIGNvbnN0IHN0YXJ0TG9jYXRpb24gPVxuICAgICAgbmV3IFBhcnNlTG9jYXRpb24oc291cmNlRmlsZSwgcmFuZ2Uuc3RhcnRQb3MsIHJhbmdlLnN0YXJ0TGluZSwgcmFuZ2Uuc3RhcnRDb2wpO1xuICByZXR1cm4gbmV3IFBhcnNlU291cmNlU3BhbihzdGFydExvY2F0aW9uLCBzdGFydExvY2F0aW9uLm1vdmVCeShyYW5nZS5lbmRQb3MgLSByYW5nZS5zdGFydFBvcykpO1xufVxuIl19