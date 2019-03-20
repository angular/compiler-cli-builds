/// <amd-module name="@angular/compiler-cli/ngcc/src/packages/entry_point_finder" />
import { AbsoluteFsPath } from '../../../src/ngtsc/path';
import { DependencyResolver, SortedEntryPointsInfo } from './dependency_resolver';
export declare class EntryPointFinder {
    private resolver;
    constructor(resolver: DependencyResolver);
    /**
     * Search the given directory, and sub-directories, for Angular package entry points.
     * @param sourceDirectory An absolute path to the directory to search for entry points.
     */
    findEntryPoints(sourceDirectory: AbsoluteFsPath, targetEntryPointPath?: AbsoluteFsPath): SortedEntryPointsInfo;
}
