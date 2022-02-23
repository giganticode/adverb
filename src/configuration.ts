import { workspace, Uri } from "vscode";
import { TextDecoder, TextEncoder } from "util";
import { AdverbConfiguration, RenamingType, RenamingConfiguration, FileConfiguration } from "./models";
import { GlobalConfiguration } from "./models/GlobalConfiguration";

const DIRECTORY = ".vscode";
const FILENAME = "adverb.config.json";
const PATH = `${DIRECTORY}/${FILENAME}`;

const _getUri = () => {
    const folders = workspace.workspaceFolders;
    if (!folders || folders.length === 0)
        return undefined;
    const result = Uri.joinPath(folders[0].uri, PATH);
    return result;
};

const _readConfiguration = async (): Promise<AdverbConfiguration | undefined> => {
    try {
        const uri = _getUri();
        if (!uri)
            return undefined;
        const data = await workspace.fs.readFile(uri);
        const json = new TextDecoder().decode(data);
        return JSON.parse(json) as AdverbConfiguration;
    } catch (err) {
        // console.log(err);
        return undefined;
    }
};

const _saveConfiguration = async (uri: Uri, data: AdverbConfiguration) => {
    try {
        const json = JSON.stringify(data);
        const uint8array = new TextEncoder().encode(json);
        await workspace.fs.writeFile(uri, uint8array);
        return true;
    } catch {
        return false;
    }
};

const _getKey = (uri: Uri): string => {
    return uri.toString();
};

const getGlobalConfiguration = async (): Promise<GlobalConfiguration | undefined> => {
    const data = await _readConfiguration();
    if (!data)
        return undefined;
    return data.global;
};

const getLocalConfiguration = async (uri: Uri): Promise<FileConfiguration | undefined> => {
    const data = await _readConfiguration();
    if (!data || !data.files)
        return undefined;
    const key = _getKey(uri);
    return data.files[key];
};

const getMergedConfigurationForCurrentFile = async (uri: Uri): Promise<FileConfiguration | undefined> => {
    const data = await _readConfiguration();
    if (!data)
        return undefined;

    const key = _getKey(uri);
    const fileConfiguration = data.files ? data.files[key] : undefined;
    const configuration = new FileConfiguration();
    configuration.fileRenaming = fileConfiguration?.fileRenaming ? fileConfiguration.fileRenaming : data.global?.fileRenaming;
    configuration.renamings = (data.global?.renamings && fileConfiguration?.renamings) ? Object.assign({}, data.global?.renamings, fileConfiguration?.renamings) : (data.global?.renamings ? data.global?.renamings : fileConfiguration?.renamings);
    return configuration;
};

const getGlobalRenaming = async (key: string): Promise<RenamingConfiguration | undefined> => {
    const config = await getGlobalConfiguration();
    if (!config || !config.renamings)
        return undefined;
    return config.renamings[key];
};

const getRenaming = async (uri: Uri, key: string): Promise<RenamingConfiguration | undefined> => {
    const config = await getMergedConfigurationForCurrentFile(uri);
    if (!config || !config.renamings)
        return undefined;
    return config.renamings[key];
};

const updateGlobalRenaming = async (key: string, renamingConfiguration: RenamingConfiguration): Promise<boolean> => {
    try {
        const settingsUri = _getUri();
        if (!settingsUri)
            return false;
        let data: AdverbConfiguration | undefined = await _readConfiguration();
        if (!data)
            data = new AdverbConfiguration();
        if (!data.global)
            data.global = new GlobalConfiguration();
        if (!data.global.renamings)
            data.global.renamings = {};
        data.global.renamings[key] = renamingConfiguration;
        return await _saveConfiguration(settingsUri, data);
    } catch (err) {
        console.log(err);
        return false;
    }
};

const updateLocalRenaming = async (uri: Uri, key: string, renamingConfiguration: RenamingConfiguration): Promise<boolean> => {
    try {
        const settingsUri = _getUri();
        if (!settingsUri)
            return false;
        let data: AdverbConfiguration | undefined = await _readConfiguration();
        const fileKey = _getKey(uri);
        if (!data)
            data = new AdverbConfiguration();
        if (!data.files)
            data.files = {};
        if (!data.files[fileKey])
            data.files[fileKey] = new FileConfiguration();
        if (!data.files[fileKey].renamings)
            data.files[fileKey].renamings = {};
        data.files[fileKey].renamings![key] = renamingConfiguration;
        return await _saveConfiguration(settingsUri, data);
    } catch (err) {
        console.log(err);
        return false;
    }
};

const updateGlobalFileRenaming = async (renamingType: RenamingType | undefined): Promise<boolean> => {
    try {
        const settingsUri = _getUri();
        if (!settingsUri)
            return false;
        let data: AdverbConfiguration | undefined = await _readConfiguration();
        if (!data)
            data = new AdverbConfiguration();
        if (!data.global)
            data.global = new GlobalConfiguration();
        data.global.fileRenaming = renamingType?.id;
        return await _saveConfiguration(settingsUri, data);
    } catch (err) {
        console.log(err);
        return false;
    }
};

const updateLocalFileRenaming = async (uri: Uri, renamingType: RenamingType | undefined): Promise<boolean> => {
    try {
        const settingsUri = _getUri();
        if (!settingsUri)
            return false;
        let data: AdverbConfiguration | undefined = await _readConfiguration();
        const fileKey = _getKey(uri);
        if (!data)
            data = new AdverbConfiguration();
        if (!data.files)
            data.files = {};
        if (!data.files[fileKey])
            data.files[fileKey] = new FileConfiguration();
        data.files[fileKey].fileRenaming = renamingType?.id;
        return await _saveConfiguration(settingsUri, data);
    } catch (err) {
        console.log(err);
        return false;
    }
};

const removeGlobalRenaming = async (renamingConfiguration: RenamingConfiguration): Promise<boolean> => {
    try {
        const settingsUri = _getUri();
        if (!settingsUri)
            return false;
        let data: AdverbConfiguration | undefined = await _readConfiguration();
        if (!data?.global?.renamings)
            return false;
        delete data.global.renamings[renamingConfiguration.originalName];
        if ((!data.global.renamings || Object.keys(data.global.renamings).length === 0))
            delete data.global.renamings;
        return await _saveConfiguration(settingsUri, data);
    } catch (err) {
        console.log(err);
        return false;
    }
};

const removeLocalRenaming = async (uri: Uri, renamingConfiguration: RenamingConfiguration): Promise<boolean> => {
    try {
        const settingsUri = _getUri();
        if (!settingsUri)
            return false;
        let data: AdverbConfiguration | undefined = await _readConfiguration();
        const fileKey = _getKey(uri);
        if (!data?.files || !data.files[fileKey] || !data.files[fileKey].renamings)
            return false;
        delete data.files[fileKey].renamings![renamingConfiguration.originalName];
        if ((!data.files[fileKey].renamings || Object.keys(data.files[fileKey].renamings!).length === 0) && !data.files[fileKey].fileRenaming)
            delete data.files[fileKey];
        return await _saveConfiguration(settingsUri, data);
    } catch (err) {
        console.log(err);
        return false;
    }
};

export default {
    getGlobalConfiguration,
    getLocalConfiguration,
    getMergedConfigurationForCurrentFile,
    getGlobalRenaming,
    getRenaming,
    updateGlobalRenaming,
    updateLocalRenaming,
    updateGlobalFileRenaming,
    updateLocalFileRenaming,
    removeGlobalRenaming,
    removeLocalRenaming
};