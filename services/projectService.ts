
import { supabase } from './supabaseClient';
import { AppState, ProjectFile } from '../types';

/**
 * CONFIGURATION:
 * Ensure you have a bucket named 'project-files' in your Supabase Storage.
 * It should be set to 'Public' for this application to work correctly.
 */
const BUCKET_NAME = 'project-files';

/**
 * Fetches all projects for the current user.
 * FAIL-SAFE: If cloud is unreachable (TypeError: Failed to fetch), returns an empty map silently.
 */
export const fetchProjects = async (userId: string): Promise<Map<string, AppState>> => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('id, app_state')
            .eq('user_id', userId);

        // If the table doesn't exist or request fails, treat as "no projects"
        if (error || !data) {
            if (error?.message?.includes('relation "projects" does not exist')) {
                console.warn("Supabase: 'projects' table not found. Please run the SQL setup script.");
            }
            return new Map();
        }

        const projectsMap = new Map<string, AppState>();
        for (const record of data) {
            const projectState = record.app_state as any as AppState;
            projectsMap.set(record.id, projectState);
        }
        return projectsMap;
    } catch (err: any) {
        console.debug("Cloud sync skipped:", err.message);
        return new Map();
    }
};

/**
 * Saves project state. Fails silently to prevent interrupting user work.
 */
export const saveProject = async (projectState: AppState): Promise<void> => {
    if (!projectState.currentUser || projectState.currentUser.id.startsWith('guest-')) {
        return;
    }

    try {
        await supabase
            .from('projects')
            .upsert({
                id: projectState.projectId,
                user_id: projectState.currentUser.id,
                project_name: projectState.projectName,
                last_modified: new Date(projectState.lastModified || Date.now()).toISOString(),
                app_state: projectState as any,
            });
    } catch (err) {
        // Silent
    }
};

export const uploadFile = async (userId: string, projectId: string, file: File): Promise<ProjectFile> => {
    const path = `${userId}/${projectId}/${file.name}`;
    
    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file, { upsert: true });
    
    if (error) {
        if (error.message.includes('Bucket not found')) {
            throw new Error(`STORAGE_CONFIG_ERROR: The bucket '${BUCKET_NAME}' does not exist in your Supabase project. 1) Go to Supabase Dashboard -> Storage. 2) Create a NEW bucket named '${BUCKET_NAME}'. 3) Set it to 'Public'.`);
        }
        throw new Error(`Upload Failed: ${error.message}`);
    }
    
    return { name: file.name, type: file.type, size: file.size, path: path };
};

export const downloadFile = async (path: string): Promise<File> => {
    if (path.startsWith('local/')) throw new Error(`LOCAL_ONLY`);
    const { data: blob, error } = await supabase.storage.from(BUCKET_NAME).download(path);
    if (error || !blob) throw new Error(`Download Failed`);
    const filename = path.substring(path.lastIndexOf('/') + 1);
    return new File([blob], filename, { type: blob.type });
};

export const deleteProject = async (userId: string, projectId: string): Promise<void> => {
    try {
        const folderPath = `${userId}/${projectId}`;
        const { data: files } = await supabase.storage.from(BUCKET_NAME).list(folderPath);
        if (files && files.length > 0) {
            await supabase.storage.from(BUCKET_NAME).remove(files.map(f => `${folderPath}/${f.name}`));
        }
        await supabase.from('projects').delete().eq('id', projectId);
    } catch (err) {}
};
