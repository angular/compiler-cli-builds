(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/linker_environment", ["require", "exports", "@angular/compiler-cli/src/ngtsc/sourcemaps", "@angular/compiler-cli/linker/src/file_linker/linker_options", "@angular/compiler-cli/linker/src/file_linker/translator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LinkerEnvironment = void 0;
    var sourcemaps_1 = require("@angular/compiler-cli/src/ngtsc/sourcemaps");
    var linker_options_1 = require("@angular/compiler-cli/linker/src/file_linker/linker_options");
    var translator_1 = require("@angular/compiler-cli/linker/src/file_linker/translator");
    var LinkerEnvironment = /** @class */ (function () {
        function LinkerEnvironment(fileSystem, logger, host, factory, options) {
            this.fileSystem = fileSystem;
            this.logger = logger;
            this.host = host;
            this.factory = factory;
            this.options = options;
            this.translator = new translator_1.Translator(this.factory);
            this.sourceFileLoader = this.options.sourceMapping ? new sourcemaps_1.SourceFileLoader(this.fileSystem, this.logger, {}) : null;
        }
        LinkerEnvironment.create = function (fileSystem, logger, host, factory, options) {
            var _a, _b, _c, _d;
            return new LinkerEnvironment(fileSystem, logger, host, factory, {
                enableI18nLegacyMessageIdFormat: (_a = options.enableI18nLegacyMessageIdFormat) !== null && _a !== void 0 ? _a : linker_options_1.DEFAULT_LINKER_OPTIONS.enableI18nLegacyMessageIdFormat,
                i18nNormalizeLineEndingsInICUs: (_b = options.i18nNormalizeLineEndingsInICUs) !== null && _b !== void 0 ? _b : linker_options_1.DEFAULT_LINKER_OPTIONS.i18nNormalizeLineEndingsInICUs,
                i18nUseExternalIds: (_c = options.i18nUseExternalIds) !== null && _c !== void 0 ? _c : linker_options_1.DEFAULT_LINKER_OPTIONS.i18nUseExternalIds,
                sourceMapping: (_d = options.sourceMapping) !== null && _d !== void 0 ? _d : linker_options_1.DEFAULT_LINKER_OPTIONS.sourceMapping
            });
        };
        return LinkerEnvironment;
    }());
    exports.LinkerEnvironment = LinkerEnvironment;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VyX2Vudmlyb25tZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL2xpbmtlci9zcmMvZmlsZV9saW5rZXIvbGlua2VyX2Vudmlyb25tZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVNBLHlFQUErRDtJQUkvRCw4RkFBdUU7SUFDdkUsc0ZBQXdDO0lBRXhDO1FBS0UsMkJBQ2EsVUFBc0IsRUFBVyxNQUFjLEVBQVcsSUFBMEIsRUFDcEYsT0FBNEMsRUFBVyxPQUFzQjtZQUQ3RSxlQUFVLEdBQVYsVUFBVSxDQUFZO1lBQVcsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUFXLFNBQUksR0FBSixJQUFJLENBQXNCO1lBQ3BGLFlBQU8sR0FBUCxPQUFPLENBQXFDO1lBQVcsWUFBTyxHQUFQLE9BQU8sQ0FBZTtZQU5qRixlQUFVLEdBQUcsSUFBSSx1QkFBVSxDQUEwQixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkUscUJBQWdCLEdBQ3JCLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLDZCQUFnQixDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBSUYsQ0FBQztRQUV2Rix3QkFBTSxHQUFiLFVBQ0ksVUFBc0IsRUFBRSxNQUFjLEVBQUUsSUFBMEIsRUFDbEUsT0FBNEMsRUFDNUMsT0FBK0I7O1lBQ2pDLE9BQU8sSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUU7Z0JBQzlELCtCQUErQixRQUFFLE9BQU8sQ0FBQywrQkFBK0IsbUNBQ3BFLHVDQUFzQixDQUFDLCtCQUErQjtnQkFDMUQsOEJBQThCLFFBQUUsT0FBTyxDQUFDLDhCQUE4QixtQ0FDbEUsdUNBQXNCLENBQUMsOEJBQThCO2dCQUN6RCxrQkFBa0IsUUFBRSxPQUFPLENBQUMsa0JBQWtCLG1DQUFJLHVDQUFzQixDQUFDLGtCQUFrQjtnQkFDM0YsYUFBYSxRQUFFLE9BQU8sQ0FBQyxhQUFhLG1DQUFJLHVDQUFzQixDQUFDLGFBQWE7YUFDN0UsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQXRCRCxJQXNCQztJQXRCWSw4Q0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvbG9nZ2luZyc7XG5pbXBvcnQge1NvdXJjZUZpbGVMb2FkZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9zb3VyY2VtYXBzJztcbmltcG9ydCB7QXN0RmFjdG9yeX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zbGF0b3InO1xuXG5pbXBvcnQge0FzdEhvc3R9IGZyb20gJy4uL2FzdC9hc3RfaG9zdCc7XG5pbXBvcnQge0RFRkFVTFRfTElOS0VSX09QVElPTlMsIExpbmtlck9wdGlvbnN9IGZyb20gJy4vbGlua2VyX29wdGlvbnMnO1xuaW1wb3J0IHtUcmFuc2xhdG9yfSBmcm9tICcuL3RyYW5zbGF0b3InO1xuXG5leHBvcnQgY2xhc3MgTGlua2VyRW52aXJvbm1lbnQ8VFN0YXRlbWVudCwgVEV4cHJlc3Npb24+IHtcbiAgcmVhZG9ubHkgdHJhbnNsYXRvciA9IG5ldyBUcmFuc2xhdG9yPFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPih0aGlzLmZhY3RvcnkpO1xuICByZWFkb25seSBzb3VyY2VGaWxlTG9hZGVyID1cbiAgICAgIHRoaXMub3B0aW9ucy5zb3VyY2VNYXBwaW5nID8gbmV3IFNvdXJjZUZpbGVMb2FkZXIodGhpcy5maWxlU3lzdGVtLCB0aGlzLmxvZ2dlciwge30pIDogbnVsbDtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgZmlsZVN5c3RlbTogRmlsZVN5c3RlbSwgcmVhZG9ubHkgbG9nZ2VyOiBMb2dnZXIsIHJlYWRvbmx5IGhvc3Q6IEFzdEhvc3Q8VEV4cHJlc3Npb24+LFxuICAgICAgcmVhZG9ubHkgZmFjdG9yeTogQXN0RmFjdG9yeTxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4sIHJlYWRvbmx5IG9wdGlvbnM6IExpbmtlck9wdGlvbnMpIHt9XG5cbiAgc3RhdGljIGNyZWF0ZTxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4oXG4gICAgICBmaWxlU3lzdGVtOiBGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgaG9zdDogQXN0SG9zdDxURXhwcmVzc2lvbj4sXG4gICAgICBmYWN0b3J5OiBBc3RGYWN0b3J5PFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPixcbiAgICAgIG9wdGlvbnM6IFBhcnRpYWw8TGlua2VyT3B0aW9ucz4pOiBMaW5rZXJFbnZpcm9ubWVudDxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiBuZXcgTGlua2VyRW52aXJvbm1lbnQoZmlsZVN5c3RlbSwgbG9nZ2VyLCBob3N0LCBmYWN0b3J5LCB7XG4gICAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiBvcHRpb25zLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQgPz9cbiAgICAgICAgICBERUZBVUxUX0xJTktFUl9PUFRJT05TLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgICBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXM6IG9wdGlvbnMuaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzID8/XG4gICAgICAgICAgREVGQVVMVF9MSU5LRVJfT1BUSU9OUy5pMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMsXG4gICAgICBpMThuVXNlRXh0ZXJuYWxJZHM6IG9wdGlvbnMuaTE4blVzZUV4dGVybmFsSWRzID8/IERFRkFVTFRfTElOS0VSX09QVElPTlMuaTE4blVzZUV4dGVybmFsSWRzLFxuICAgICAgc291cmNlTWFwcGluZzogb3B0aW9ucy5zb3VyY2VNYXBwaW5nID8/IERFRkFVTFRfTElOS0VSX09QVElPTlMuc291cmNlTWFwcGluZ1xuICAgIH0pO1xuICB9XG59XG4iXX0=