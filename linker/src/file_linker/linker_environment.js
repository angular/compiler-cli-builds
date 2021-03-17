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
            var _a, _b, _c, _d, _e;
            return new LinkerEnvironment(fileSystem, logger, host, factory, {
                enableI18nLegacyMessageIdFormat: (_a = options.enableI18nLegacyMessageIdFormat) !== null && _a !== void 0 ? _a : linker_options_1.DEFAULT_LINKER_OPTIONS.enableI18nLegacyMessageIdFormat,
                i18nNormalizeLineEndingsInICUs: (_b = options.i18nNormalizeLineEndingsInICUs) !== null && _b !== void 0 ? _b : linker_options_1.DEFAULT_LINKER_OPTIONS.i18nNormalizeLineEndingsInICUs,
                i18nUseExternalIds: (_c = options.i18nUseExternalIds) !== null && _c !== void 0 ? _c : linker_options_1.DEFAULT_LINKER_OPTIONS.i18nUseExternalIds,
                sourceMapping: (_d = options.sourceMapping) !== null && _d !== void 0 ? _d : linker_options_1.DEFAULT_LINKER_OPTIONS.sourceMapping,
                linkerJitMode: (_e = options.linkerJitMode) !== null && _e !== void 0 ? _e : linker_options_1.DEFAULT_LINKER_OPTIONS.linkerJitMode,
            });
        };
        return LinkerEnvironment;
    }());
    exports.LinkerEnvironment = LinkerEnvironment;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VyX2Vudmlyb25tZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL2xpbmtlci9zcmMvZmlsZV9saW5rZXIvbGlua2VyX2Vudmlyb25tZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVNBLHlFQUErRDtJQUkvRCw4RkFBdUU7SUFDdkUsc0ZBQXdDO0lBRXhDO1FBS0UsMkJBQ2EsVUFBOEIsRUFBVyxNQUFjLEVBQ3ZELElBQTBCLEVBQVcsT0FBNEMsRUFDakYsT0FBc0I7WUFGdEIsZUFBVSxHQUFWLFVBQVUsQ0FBb0I7WUFBVyxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQ3ZELFNBQUksR0FBSixJQUFJLENBQXNCO1lBQVcsWUFBTyxHQUFQLE9BQU8sQ0FBcUM7WUFDakYsWUFBTyxHQUFQLE9BQU8sQ0FBZTtZQVAxQixlQUFVLEdBQUcsSUFBSSx1QkFBVSxDQUEwQixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkUscUJBQWdCLEdBQ3JCLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLDZCQUFnQixDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBS3pELENBQUM7UUFFaEMsd0JBQU0sR0FBYixVQUNJLFVBQThCLEVBQUUsTUFBYyxFQUFFLElBQTBCLEVBQzFFLE9BQTRDLEVBQzVDLE9BQStCOztZQUNqQyxPQUFPLElBQUksaUJBQWlCLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFO2dCQUM5RCwrQkFBK0IsRUFBRSxNQUFBLE9BQU8sQ0FBQywrQkFBK0IsbUNBQ3BFLHVDQUFzQixDQUFDLCtCQUErQjtnQkFDMUQsOEJBQThCLEVBQUUsTUFBQSxPQUFPLENBQUMsOEJBQThCLG1DQUNsRSx1Q0FBc0IsQ0FBQyw4QkFBOEI7Z0JBQ3pELGtCQUFrQixFQUFFLE1BQUEsT0FBTyxDQUFDLGtCQUFrQixtQ0FBSSx1Q0FBc0IsQ0FBQyxrQkFBa0I7Z0JBQzNGLGFBQWEsRUFBRSxNQUFBLE9BQU8sQ0FBQyxhQUFhLG1DQUFJLHVDQUFzQixDQUFDLGFBQWE7Z0JBQzVFLGFBQWEsRUFBRSxNQUFBLE9BQU8sQ0FBQyxhQUFhLG1DQUFJLHVDQUFzQixDQUFDLGFBQWE7YUFDN0UsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQXhCRCxJQXdCQztJQXhCWSw4Q0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7UmVhZG9ubHlGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9sb2dnaW5nJztcbmltcG9ydCB7U291cmNlRmlsZUxvYWRlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3NvdXJjZW1hcHMnO1xuaW1wb3J0IHtBc3RGYWN0b3J5fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNsYXRvcic7XG5cbmltcG9ydCB7QXN0SG9zdH0gZnJvbSAnLi4vYXN0L2FzdF9ob3N0JztcbmltcG9ydCB7REVGQVVMVF9MSU5LRVJfT1BUSU9OUywgTGlua2VyT3B0aW9uc30gZnJvbSAnLi9saW5rZXJfb3B0aW9ucyc7XG5pbXBvcnQge1RyYW5zbGF0b3J9IGZyb20gJy4vdHJhbnNsYXRvcic7XG5cbmV4cG9ydCBjbGFzcyBMaW5rZXJFbnZpcm9ubWVudDxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4ge1xuICByZWFkb25seSB0cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3I8VFN0YXRlbWVudCwgVEV4cHJlc3Npb24+KHRoaXMuZmFjdG9yeSk7XG4gIHJlYWRvbmx5IHNvdXJjZUZpbGVMb2FkZXIgPVxuICAgICAgdGhpcy5vcHRpb25zLnNvdXJjZU1hcHBpbmcgPyBuZXcgU291cmNlRmlsZUxvYWRlcih0aGlzLmZpbGVTeXN0ZW0sIHRoaXMubG9nZ2VyLCB7fSkgOiBudWxsO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBmaWxlU3lzdGVtOiBSZWFkb25seUZpbGVTeXN0ZW0sIHJlYWRvbmx5IGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgcmVhZG9ubHkgaG9zdDogQXN0SG9zdDxURXhwcmVzc2lvbj4sIHJlYWRvbmx5IGZhY3Rvcnk6IEFzdEZhY3Rvcnk8VFN0YXRlbWVudCwgVEV4cHJlc3Npb24+LFxuICAgICAgcmVhZG9ubHkgb3B0aW9uczogTGlua2VyT3B0aW9ucykge31cblxuICBzdGF0aWMgY3JlYXRlPFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPihcbiAgICAgIGZpbGVTeXN0ZW06IFJlYWRvbmx5RmlsZVN5c3RlbSwgbG9nZ2VyOiBMb2dnZXIsIGhvc3Q6IEFzdEhvc3Q8VEV4cHJlc3Npb24+LFxuICAgICAgZmFjdG9yeTogQXN0RmFjdG9yeTxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4sXG4gICAgICBvcHRpb25zOiBQYXJ0aWFsPExpbmtlck9wdGlvbnM+KTogTGlua2VyRW52aXJvbm1lbnQ8VFN0YXRlbWVudCwgVEV4cHJlc3Npb24+IHtcbiAgICByZXR1cm4gbmV3IExpbmtlckVudmlyb25tZW50KGZpbGVTeXN0ZW0sIGxvZ2dlciwgaG9zdCwgZmFjdG9yeSwge1xuICAgICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdDogb3B0aW9ucy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ID8/XG4gICAgICAgICAgREVGQVVMVF9MSU5LRVJfT1BUSU9OUy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0LFxuICAgICAgaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzOiBvcHRpb25zLmkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcyA/P1xuICAgICAgICAgIERFRkFVTFRfTElOS0VSX09QVElPTlMuaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzLFxuICAgICAgaTE4blVzZUV4dGVybmFsSWRzOiBvcHRpb25zLmkxOG5Vc2VFeHRlcm5hbElkcyA/PyBERUZBVUxUX0xJTktFUl9PUFRJT05TLmkxOG5Vc2VFeHRlcm5hbElkcyxcbiAgICAgIHNvdXJjZU1hcHBpbmc6IG9wdGlvbnMuc291cmNlTWFwcGluZyA/PyBERUZBVUxUX0xJTktFUl9PUFRJT05TLnNvdXJjZU1hcHBpbmcsXG4gICAgICBsaW5rZXJKaXRNb2RlOiBvcHRpb25zLmxpbmtlckppdE1vZGUgPz8gREVGQVVMVF9MSU5LRVJfT1BUSU9OUy5saW5rZXJKaXRNb2RlLFxuICAgIH0pO1xuICB9XG59XG4iXX0=