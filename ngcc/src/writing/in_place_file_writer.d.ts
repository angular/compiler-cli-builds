/// <amd-module name="@angular/compiler-cli/ngcc/src/writing/in_place_file_writer" />
import { FileSystem } from '../file_system/file_system';
import { EntryPoint } from '../packages/entry_point';
import { EntryPointBundle } from '../packages/entry_point_bundle';
import { FileToWrite } from '../rendering/utils';
import { FileWriter } from './file_writer';
/**
 * This FileWriter overwrites the transformed file, in-place, while creating
 * a back-up of the original file with an extra `.bak` extension.
 */
export declare class InPlaceFileWriter implements FileWriter {
    protected fs: FileSystem;
    constructor(fs: FileSystem);
    writeBundle(_entryPoint: EntryPoint, _bundle: EntryPointBundle, transformedFiles: FileToWrite[]): void;
    protected writeFileAndBackup(file: FileToWrite): void;
}
