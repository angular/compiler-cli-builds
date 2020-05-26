(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/migrations/missing_injectable_migration", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/ngcc/src/migrations/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getAngularCoreDecoratorName = exports.MissingInjectableMigration = void 0;
    var tslib_1 = require("tslib");
    var annotations_1 = require("@angular/compiler-cli/src/ngtsc/annotations");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/migrations/utils");
    /**
     * Ensures that classes that are provided as an Angular service in either `NgModule.providers` or
     * `Directive.providers`/`Component.viewProviders` are decorated with one of the `@Injectable`,
     * `@Directive`, `@Component` or `@Pipe` decorators, adding an `@Injectable()` decorator when none
     * are present.
     *
     * At least one decorator is now mandatory, as otherwise the compiler would not compile an
     * injectable definition for the service. This is unlike View Engine, where having just an unrelated
     * decorator may have been sufficient for the service to become injectable.
     *
     * In essence, this migration operates on classes that are themselves an NgModule, Directive or
     * Component. Their metadata is statically evaluated so that their "providers"/"viewProviders"
     * properties can be analyzed. For any provider that refers to an undecorated class, the class will
     * be migrated to have an `@Injectable()` decorator.
     *
     * This implementation mirrors the "missing-injectable" schematic.
     */
    var MissingInjectableMigration = /** @class */ (function () {
        function MissingInjectableMigration() {
        }
        MissingInjectableMigration.prototype.apply = function (clazz, host) {
            var e_1, _a;
            var decorators = host.reflectionHost.getDecoratorsOfDeclaration(clazz);
            if (decorators === null) {
                return null;
            }
            try {
                for (var decorators_1 = tslib_1.__values(decorators), decorators_1_1 = decorators_1.next(); !decorators_1_1.done; decorators_1_1 = decorators_1.next()) {
                    var decorator = decorators_1_1.value;
                    var name = getAngularCoreDecoratorName(decorator);
                    if (name === 'NgModule') {
                        migrateNgModuleProviders(decorator, host);
                    }
                    else if (name === 'Directive') {
                        migrateDirectiveProviders(decorator, host, /* isComponent */ false);
                    }
                    else if (name === 'Component') {
                        migrateDirectiveProviders(decorator, host, /* isComponent */ true);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (decorators_1_1 && !decorators_1_1.done && (_a = decorators_1.return)) _a.call(decorators_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return null;
        };
        return MissingInjectableMigration;
    }());
    exports.MissingInjectableMigration = MissingInjectableMigration;
    /**
     * Iterates through all `NgModule.providers` and adds the `@Injectable()` decorator to any provider
     * that is not otherwise decorated.
     */
    function migrateNgModuleProviders(decorator, host) {
        if (decorator.args === null || decorator.args.length !== 1) {
            return;
        }
        var metadata = host.evaluator.evaluate(decorator.args[0], annotations_1.forwardRefResolver);
        if (!(metadata instanceof Map)) {
            return;
        }
        migrateProviders(metadata, 'providers', host);
        // TODO(alxhub): we should probably also check for `ModuleWithProviders` here.
    }
    /**
     * Iterates through all `Directive.providers` and if `isComponent` is set to true also
     * `Component.viewProviders` and adds the `@Injectable()` decorator to any provider that is not
     * otherwise decorated.
     */
    function migrateDirectiveProviders(decorator, host, isComponent) {
        if (decorator.args === null || decorator.args.length !== 1) {
            return;
        }
        var metadata = host.evaluator.evaluate(decorator.args[0], annotations_1.forwardRefResolver);
        if (!(metadata instanceof Map)) {
            return;
        }
        migrateProviders(metadata, 'providers', host);
        if (isComponent) {
            migrateProviders(metadata, 'viewProviders', host);
        }
    }
    /**
     * Given an object with decorator metadata, iterates through the list of providers to add
     * `@Injectable()` to any provider that is not otherwise decorated.
     */
    function migrateProviders(metadata, field, host) {
        var e_2, _a;
        if (!metadata.has(field)) {
            return;
        }
        var providers = metadata.get(field);
        if (!Array.isArray(providers)) {
            return;
        }
        try {
            for (var providers_1 = tslib_1.__values(providers), providers_1_1 = providers_1.next(); !providers_1_1.done; providers_1_1 = providers_1.next()) {
                var provider = providers_1_1.value;
                migrateProvider(provider, host);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (providers_1_1 && !providers_1_1.done && (_a = providers_1.return)) _a.call(providers_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    /**
     * Analyzes a single provider entry and determines the class that is required to have an
     * `@Injectable()` decorator.
     */
    function migrateProvider(provider, host) {
        var e_3, _a;
        if (provider instanceof Map) {
            if (!provider.has('provide') || provider.has('useValue') || provider.has('useFactory') ||
                provider.has('useExisting')) {
                return;
            }
            if (provider.has('useClass')) {
                // {provide: ..., useClass: SomeClass, deps: [...]} does not require a decorator on SomeClass,
                // as the provider itself configures 'deps'. Only if 'deps' is missing will this require a
                // factory to exist on SomeClass.
                if (!provider.has('deps')) {
                    migrateProviderClass(provider.get('useClass'), host);
                }
            }
            else {
                migrateProviderClass(provider.get('provide'), host);
            }
        }
        else if (Array.isArray(provider)) {
            try {
                for (var provider_1 = tslib_1.__values(provider), provider_1_1 = provider_1.next(); !provider_1_1.done; provider_1_1 = provider_1.next()) {
                    var v = provider_1_1.value;
                    migrateProvider(v, host);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (provider_1_1 && !provider_1_1.done && (_a = provider_1.return)) _a.call(provider_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
        else {
            migrateProviderClass(provider, host);
        }
    }
    /**
     * Given a provider class, adds the `@Injectable()` decorator if no other relevant Angular decorator
     * is present on the class.
     */
    function migrateProviderClass(provider, host) {
        // Providers that do not refer to a class cannot be migrated.
        if (!(provider instanceof imports_1.Reference)) {
            return;
        }
        var clazz = provider.node;
        if (utils_1.isClassDeclaration(clazz) && host.isInScope(clazz) && needsInjectableDecorator(clazz, host)) {
            host.injectSyntheticDecorator(clazz, utils_1.createInjectableDecorator(clazz));
        }
    }
    var NO_MIGRATE_DECORATORS = new Set(['Injectable', 'Directive', 'Component', 'Pipe']);
    /**
     * Determines if the given class needs to be decorated with `@Injectable()` based on whether it
     * already has an Angular decorator applied.
     */
    function needsInjectableDecorator(clazz, host) {
        var e_4, _a;
        var decorators = host.getAllDecorators(clazz);
        if (decorators === null) {
            return true;
        }
        try {
            for (var decorators_2 = tslib_1.__values(decorators), decorators_2_1 = decorators_2.next(); !decorators_2_1.done; decorators_2_1 = decorators_2.next()) {
                var decorator = decorators_2_1.value;
                var name = getAngularCoreDecoratorName(decorator);
                if (name !== null && NO_MIGRATE_DECORATORS.has(name)) {
                    return false;
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (decorators_2_1 && !decorators_2_1.done && (_a = decorators_2.return)) _a.call(decorators_2);
            }
            finally { if (e_4) throw e_4.error; }
        }
        return true;
    }
    /**
     * Determines the original name of a decorator if it is from '@angular/core'. For other decorators,
     * null is returned.
     */
    function getAngularCoreDecoratorName(decorator) {
        if (decorator.import === null || decorator.import.from !== '@angular/core') {
            return null;
        }
        return decorator.import.name;
    }
    exports.getAngularCoreDecoratorName = getAngularCoreDecoratorName;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzc2luZ19pbmplY3RhYmxlX21pZ3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9taWdyYXRpb25zL21pc3NpbmdfaW5qZWN0YWJsZV9taWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQVNBLDJFQUFrRTtJQUNsRSxtRUFBcUQ7SUFLckQseUVBQXNFO0lBRXRFOzs7Ozs7Ozs7Ozs7Ozs7O09BZ0JHO0lBQ0g7UUFBQTtRQW9CQSxDQUFDO1FBbkJDLDBDQUFLLEdBQUwsVUFBTSxLQUF1QixFQUFFLElBQW1COztZQUNoRCxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3pFLElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDdkIsT0FBTyxJQUFJLENBQUM7YUFDYjs7Z0JBRUQsS0FBd0IsSUFBQSxlQUFBLGlCQUFBLFVBQVUsQ0FBQSxzQ0FBQSw4REFBRTtvQkFBL0IsSUFBTSxTQUFTLHVCQUFBO29CQUNsQixJQUFNLElBQUksR0FBRywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDcEQsSUFBSSxJQUFJLEtBQUssVUFBVSxFQUFFO3dCQUN2Qix3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7cUJBQzNDO3lCQUFNLElBQUksSUFBSSxLQUFLLFdBQVcsRUFBRTt3QkFDL0IseUJBQXlCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztxQkFDckU7eUJBQU0sSUFBSSxJQUFJLEtBQUssV0FBVyxFQUFFO3dCQUMvQix5QkFBeUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUNwRTtpQkFDRjs7Ozs7Ozs7O1lB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QUksVUFBVSxLQUFLLElBQUksRUFBRTtZQUN2QixPQUFPLElBQUksQ0FBQztTQUNiOztZQUVELEtBQXdCLElBQUEsZUFBQSxpQkFBQSxVQUFVLENBQUEsc0NBQUEsOERBQUU7Z0JBQS9CLElBQU0sU0FBUyx1QkFBQTtnQkFDbEIsSUFBTSxJQUFJLEdBQUcsMkJBQTJCLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3BELElBQUksSUFBSSxLQUFLLElBQUksSUFBSSxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ3BELE9BQU8sS0FBSyxDQUFDO2lCQUNkO2FBQ0Y7Ozs7Ozs7OztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7T0FHRztJQUNILFNBQWdCLDJCQUEyQixDQUFDLFNBQW9CO1FBQzlELElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssZUFBZSxFQUFFO1lBQzFFLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQy9CLENBQUM7SUFORCxrRUFNQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2ZvcndhcmRSZWZSZXNvbHZlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2Fubm90YXRpb25zJztcbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge1Jlc29sdmVkVmFsdWUsIFJlc29sdmVkVmFsdWVNYXB9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuXG5pbXBvcnQge01pZ3JhdGlvbiwgTWlncmF0aW9uSG9zdH0gZnJvbSAnLi9taWdyYXRpb24nO1xuaW1wb3J0IHtjcmVhdGVJbmplY3RhYmxlRGVjb3JhdG9yLCBpc0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEVuc3VyZXMgdGhhdCBjbGFzc2VzIHRoYXQgYXJlIHByb3ZpZGVkIGFzIGFuIEFuZ3VsYXIgc2VydmljZSBpbiBlaXRoZXIgYE5nTW9kdWxlLnByb3ZpZGVyc2Agb3JcbiAqIGBEaXJlY3RpdmUucHJvdmlkZXJzYC9gQ29tcG9uZW50LnZpZXdQcm92aWRlcnNgIGFyZSBkZWNvcmF0ZWQgd2l0aCBvbmUgb2YgdGhlIGBASW5qZWN0YWJsZWAsXG4gKiBgQERpcmVjdGl2ZWAsIGBAQ29tcG9uZW50YCBvciBgQFBpcGVgIGRlY29yYXRvcnMsIGFkZGluZyBhbiBgQEluamVjdGFibGUoKWAgZGVjb3JhdG9yIHdoZW4gbm9uZVxuICogYXJlIHByZXNlbnQuXG4gKlxuICogQXQgbGVhc3Qgb25lIGRlY29yYXRvciBpcyBub3cgbWFuZGF0b3J5LCBhcyBvdGhlcndpc2UgdGhlIGNvbXBpbGVyIHdvdWxkIG5vdCBjb21waWxlIGFuXG4gKiBpbmplY3RhYmxlIGRlZmluaXRpb24gZm9yIHRoZSBzZXJ2aWNlLiBUaGlzIGlzIHVubGlrZSBWaWV3IEVuZ2luZSwgd2hlcmUgaGF2aW5nIGp1c3QgYW4gdW5yZWxhdGVkXG4gKiBkZWNvcmF0b3IgbWF5IGhhdmUgYmVlbiBzdWZmaWNpZW50IGZvciB0aGUgc2VydmljZSB0byBiZWNvbWUgaW5qZWN0YWJsZS5cbiAqXG4gKiBJbiBlc3NlbmNlLCB0aGlzIG1pZ3JhdGlvbiBvcGVyYXRlcyBvbiBjbGFzc2VzIHRoYXQgYXJlIHRoZW1zZWx2ZXMgYW4gTmdNb2R1bGUsIERpcmVjdGl2ZSBvclxuICogQ29tcG9uZW50LiBUaGVpciBtZXRhZGF0YSBpcyBzdGF0aWNhbGx5IGV2YWx1YXRlZCBzbyB0aGF0IHRoZWlyIFwicHJvdmlkZXJzXCIvXCJ2aWV3UHJvdmlkZXJzXCJcbiAqIHByb3BlcnRpZXMgY2FuIGJlIGFuYWx5emVkLiBGb3IgYW55IHByb3ZpZGVyIHRoYXQgcmVmZXJzIHRvIGFuIHVuZGVjb3JhdGVkIGNsYXNzLCB0aGUgY2xhc3Mgd2lsbFxuICogYmUgbWlncmF0ZWQgdG8gaGF2ZSBhbiBgQEluamVjdGFibGUoKWAgZGVjb3JhdG9yLlxuICpcbiAqIFRoaXMgaW1wbGVtZW50YXRpb24gbWlycm9ycyB0aGUgXCJtaXNzaW5nLWluamVjdGFibGVcIiBzY2hlbWF0aWMuXG4gKi9cbmV4cG9ydCBjbGFzcyBNaXNzaW5nSW5qZWN0YWJsZU1pZ3JhdGlvbiBpbXBsZW1lbnRzIE1pZ3JhdGlvbiB7XG4gIGFwcGx5KGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBob3N0OiBNaWdyYXRpb25Ib3N0KTogdHMuRGlhZ25vc3RpY3xudWxsIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzID0gaG9zdC5yZWZsZWN0aW9uSG9zdC5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihjbGF6eik7XG4gICAgaWYgKGRlY29yYXRvcnMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgZGVjb3JhdG9yIG9mIGRlY29yYXRvcnMpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBnZXRBbmd1bGFyQ29yZURlY29yYXRvck5hbWUoZGVjb3JhdG9yKTtcbiAgICAgIGlmIChuYW1lID09PSAnTmdNb2R1bGUnKSB7XG4gICAgICAgIG1pZ3JhdGVOZ01vZHVsZVByb3ZpZGVycyhkZWNvcmF0b3IsIGhvc3QpO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnRGlyZWN0aXZlJykge1xuICAgICAgICBtaWdyYXRlRGlyZWN0aXZlUHJvdmlkZXJzKGRlY29yYXRvciwgaG9zdCwgLyogaXNDb21wb25lbnQgKi8gZmFsc2UpO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnQ29tcG9uZW50Jykge1xuICAgICAgICBtaWdyYXRlRGlyZWN0aXZlUHJvdmlkZXJzKGRlY29yYXRvciwgaG9zdCwgLyogaXNDb21wb25lbnQgKi8gdHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBJdGVyYXRlcyB0aHJvdWdoIGFsbCBgTmdNb2R1bGUucHJvdmlkZXJzYCBhbmQgYWRkcyB0aGUgYEBJbmplY3RhYmxlKClgIGRlY29yYXRvciB0byBhbnkgcHJvdmlkZXJcbiAqIHRoYXQgaXMgbm90IG90aGVyd2lzZSBkZWNvcmF0ZWQuXG4gKi9cbmZ1bmN0aW9uIG1pZ3JhdGVOZ01vZHVsZVByb3ZpZGVycyhkZWNvcmF0b3I6IERlY29yYXRvciwgaG9zdDogTWlncmF0aW9uSG9zdCk6IHZvaWQge1xuICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgbWV0YWRhdGEgPSBob3N0LmV2YWx1YXRvci5ldmFsdWF0ZShkZWNvcmF0b3IuYXJnc1swXSwgZm9yd2FyZFJlZlJlc29sdmVyKTtcbiAgaWYgKCEobWV0YWRhdGEgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbWlncmF0ZVByb3ZpZGVycyhtZXRhZGF0YSwgJ3Byb3ZpZGVycycsIGhvc3QpO1xuICAvLyBUT0RPKGFseGh1Yik6IHdlIHNob3VsZCBwcm9iYWJseSBhbHNvIGNoZWNrIGZvciBgTW9kdWxlV2l0aFByb3ZpZGVyc2AgaGVyZS5cbn1cblxuLyoqXG4gKiBJdGVyYXRlcyB0aHJvdWdoIGFsbCBgRGlyZWN0aXZlLnByb3ZpZGVyc2AgYW5kIGlmIGBpc0NvbXBvbmVudGAgaXMgc2V0IHRvIHRydWUgYWxzb1xuICogYENvbXBvbmVudC52aWV3UHJvdmlkZXJzYCBhbmQgYWRkcyB0aGUgYEBJbmplY3RhYmxlKClgIGRlY29yYXRvciB0byBhbnkgcHJvdmlkZXIgdGhhdCBpcyBub3RcbiAqIG90aGVyd2lzZSBkZWNvcmF0ZWQuXG4gKi9cbmZ1bmN0aW9uIG1pZ3JhdGVEaXJlY3RpdmVQcm92aWRlcnMoXG4gICAgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGhvc3Q6IE1pZ3JhdGlvbkhvc3QsIGlzQ29tcG9uZW50OiBib29sZWFuKTogdm9pZCB7XG4gIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBtZXRhZGF0YSA9IGhvc3QuZXZhbHVhdG9yLmV2YWx1YXRlKGRlY29yYXRvci5hcmdzWzBdLCBmb3J3YXJkUmVmUmVzb2x2ZXIpO1xuICBpZiAoIShtZXRhZGF0YSBpbnN0YW5jZW9mIE1hcCkpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBtaWdyYXRlUHJvdmlkZXJzKG1ldGFkYXRhLCAncHJvdmlkZXJzJywgaG9zdCk7XG4gIGlmIChpc0NvbXBvbmVudCkge1xuICAgIG1pZ3JhdGVQcm92aWRlcnMobWV0YWRhdGEsICd2aWV3UHJvdmlkZXJzJywgaG9zdCk7XG4gIH1cbn1cblxuLyoqXG4gKiBHaXZlbiBhbiBvYmplY3Qgd2l0aCBkZWNvcmF0b3IgbWV0YWRhdGEsIGl0ZXJhdGVzIHRocm91Z2ggdGhlIGxpc3Qgb2YgcHJvdmlkZXJzIHRvIGFkZFxuICogYEBJbmplY3RhYmxlKClgIHRvIGFueSBwcm92aWRlciB0aGF0IGlzIG5vdCBvdGhlcndpc2UgZGVjb3JhdGVkLlxuICovXG5mdW5jdGlvbiBtaWdyYXRlUHJvdmlkZXJzKG1ldGFkYXRhOiBSZXNvbHZlZFZhbHVlTWFwLCBmaWVsZDogc3RyaW5nLCBob3N0OiBNaWdyYXRpb25Ib3N0KTogdm9pZCB7XG4gIGlmICghbWV0YWRhdGEuaGFzKGZpZWxkKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBwcm92aWRlcnMgPSBtZXRhZGF0YS5nZXQoZmllbGQpITtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHByb3ZpZGVycykpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBmb3IgKGNvbnN0IHByb3ZpZGVyIG9mIHByb3ZpZGVycykge1xuICAgIG1pZ3JhdGVQcm92aWRlcihwcm92aWRlciwgaG9zdCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBbmFseXplcyBhIHNpbmdsZSBwcm92aWRlciBlbnRyeSBhbmQgZGV0ZXJtaW5lcyB0aGUgY2xhc3MgdGhhdCBpcyByZXF1aXJlZCB0byBoYXZlIGFuXG4gKiBgQEluamVjdGFibGUoKWAgZGVjb3JhdG9yLlxuICovXG5mdW5jdGlvbiBtaWdyYXRlUHJvdmlkZXIocHJvdmlkZXI6IFJlc29sdmVkVmFsdWUsIGhvc3Q6IE1pZ3JhdGlvbkhvc3QpOiB2b2lkIHtcbiAgaWYgKHByb3ZpZGVyIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgaWYgKCFwcm92aWRlci5oYXMoJ3Byb3ZpZGUnKSB8fCBwcm92aWRlci5oYXMoJ3VzZVZhbHVlJykgfHwgcHJvdmlkZXIuaGFzKCd1c2VGYWN0b3J5JykgfHxcbiAgICAgICAgcHJvdmlkZXIuaGFzKCd1c2VFeGlzdGluZycpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChwcm92aWRlci5oYXMoJ3VzZUNsYXNzJykpIHtcbiAgICAgIC8vIHtwcm92aWRlOiAuLi4sIHVzZUNsYXNzOiBTb21lQ2xhc3MsIGRlcHM6IFsuLi5dfSBkb2VzIG5vdCByZXF1aXJlIGEgZGVjb3JhdG9yIG9uIFNvbWVDbGFzcyxcbiAgICAgIC8vIGFzIHRoZSBwcm92aWRlciBpdHNlbGYgY29uZmlndXJlcyAnZGVwcycuIE9ubHkgaWYgJ2RlcHMnIGlzIG1pc3Npbmcgd2lsbCB0aGlzIHJlcXVpcmUgYVxuICAgICAgLy8gZmFjdG9yeSB0byBleGlzdCBvbiBTb21lQ2xhc3MuXG4gICAgICBpZiAoIXByb3ZpZGVyLmhhcygnZGVwcycpKSB7XG4gICAgICAgIG1pZ3JhdGVQcm92aWRlckNsYXNzKHByb3ZpZGVyLmdldCgndXNlQ2xhc3MnKSEsIGhvc3QpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBtaWdyYXRlUHJvdmlkZXJDbGFzcyhwcm92aWRlci5nZXQoJ3Byb3ZpZGUnKSEsIGhvc3QpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHByb3ZpZGVyKSkge1xuICAgIGZvciAoY29uc3QgdiBvZiBwcm92aWRlcikge1xuICAgICAgbWlncmF0ZVByb3ZpZGVyKHYsIGhvc3QpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBtaWdyYXRlUHJvdmlkZXJDbGFzcyhwcm92aWRlciwgaG9zdCk7XG4gIH1cbn1cblxuLyoqXG4gKiBHaXZlbiBhIHByb3ZpZGVyIGNsYXNzLCBhZGRzIHRoZSBgQEluamVjdGFibGUoKWAgZGVjb3JhdG9yIGlmIG5vIG90aGVyIHJlbGV2YW50IEFuZ3VsYXIgZGVjb3JhdG9yXG4gKiBpcyBwcmVzZW50IG9uIHRoZSBjbGFzcy5cbiAqL1xuZnVuY3Rpb24gbWlncmF0ZVByb3ZpZGVyQ2xhc3MocHJvdmlkZXI6IFJlc29sdmVkVmFsdWUsIGhvc3Q6IE1pZ3JhdGlvbkhvc3QpOiB2b2lkIHtcbiAgLy8gUHJvdmlkZXJzIHRoYXQgZG8gbm90IHJlZmVyIHRvIGEgY2xhc3MgY2Fubm90IGJlIG1pZ3JhdGVkLlxuICBpZiAoIShwcm92aWRlciBpbnN0YW5jZW9mIFJlZmVyZW5jZSkpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBjbGF6eiA9IHByb3ZpZGVyLm5vZGUgYXMgdHMuRGVjbGFyYXRpb247XG4gIGlmIChpc0NsYXNzRGVjbGFyYXRpb24oY2xhenopICYmIGhvc3QuaXNJblNjb3BlKGNsYXp6KSAmJiBuZWVkc0luamVjdGFibGVEZWNvcmF0b3IoY2xhenosIGhvc3QpKSB7XG4gICAgaG9zdC5pbmplY3RTeW50aGV0aWNEZWNvcmF0b3IoY2xhenosIGNyZWF0ZUluamVjdGFibGVEZWNvcmF0b3IoY2xhenopKTtcbiAgfVxufVxuXG5jb25zdCBOT19NSUdSQVRFX0RFQ09SQVRPUlMgPSBuZXcgU2V0KFsnSW5qZWN0YWJsZScsICdEaXJlY3RpdmUnLCAnQ29tcG9uZW50JywgJ1BpcGUnXSk7XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiB0aGUgZ2l2ZW4gY2xhc3MgbmVlZHMgdG8gYmUgZGVjb3JhdGVkIHdpdGggYEBJbmplY3RhYmxlKClgIGJhc2VkIG9uIHdoZXRoZXIgaXRcbiAqIGFscmVhZHkgaGFzIGFuIEFuZ3VsYXIgZGVjb3JhdG9yIGFwcGxpZWQuXG4gKi9cbmZ1bmN0aW9uIG5lZWRzSW5qZWN0YWJsZURlY29yYXRvcihjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgaG9zdDogTWlncmF0aW9uSG9zdCk6IGJvb2xlYW4ge1xuICBjb25zdCBkZWNvcmF0b3JzID0gaG9zdC5nZXRBbGxEZWNvcmF0b3JzKGNsYXp6KTtcbiAgaWYgKGRlY29yYXRvcnMgPT09IG51bGwpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGZvciAoY29uc3QgZGVjb3JhdG9yIG9mIGRlY29yYXRvcnMpIHtcbiAgICBjb25zdCBuYW1lID0gZ2V0QW5ndWxhckNvcmVEZWNvcmF0b3JOYW1lKGRlY29yYXRvcik7XG4gICAgaWYgKG5hbWUgIT09IG51bGwgJiYgTk9fTUlHUkFURV9ERUNPUkFUT1JTLmhhcyhuYW1lKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgdGhlIG9yaWdpbmFsIG5hbWUgb2YgYSBkZWNvcmF0b3IgaWYgaXQgaXMgZnJvbSAnQGFuZ3VsYXIvY29yZScuIEZvciBvdGhlciBkZWNvcmF0b3JzLFxuICogbnVsbCBpcyByZXR1cm5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFuZ3VsYXJDb3JlRGVjb3JhdG9yTmFtZShkZWNvcmF0b3I6IERlY29yYXRvcik6IHN0cmluZ3xudWxsIHtcbiAgaWYgKGRlY29yYXRvci5pbXBvcnQgPT09IG51bGwgfHwgZGVjb3JhdG9yLmltcG9ydC5mcm9tICE9PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiBkZWNvcmF0b3IuaW1wb3J0Lm5hbWU7XG59XG4iXX0=