import { supabase } from './supabaseClient';
import { AppState, ProjectFile } from '../types';

const BUCKET_NAME = 'project-files';

/**
 * Fetches all projects for the current user from the Supabase database.
 * @param userId The UUID of the logged-in user.
 * @returns A Map of project IDs to their AppState.
 */
export const fetchProjects = async (userId: string): Promise<Map<string, AppState>> => {
    const { data, error } = await supabase
        .from('projects')
        .select('id, app_state')
        .eq('user_id', userId);

    if (error) {
        console.error("Supabase fetch error:", error);
        throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    const projectsMap = new Map<string, AppState>();
    if (data) {
        for (const record of data) {
            // The `app_state` column is of type jsonb
            const projectState = record.app_state as any as AppState;
            projectsMap.set(record.id, projectState);
        }
    }
    return projectsMap;
};

/**
 * Saves (upserts) a single project's state to the Supabase database.
 * @param projectState The complete AppState object for the project.
 */
export const saveProject = async (projectState: AppState): Promise<void> => {
    if (!projectState.currentUser) {
        throw new Error("Cannot save project without a logged-in user.");
    }
    
    const { data, error } = await supabase
        .from('projects')
        .upsert({
            id: projectState.projectId,
            user_id: projectState.currentUser.id,
            project_name: projectState.projectName,
            last_modified: new Date(projectState.lastModified || Date.now()).toISOString(),
            app_state: projectState as any, // Cast to any to satisfy jsonb type
        });
        
    if (error) {
        console.error("Supabase save error:", error);
        throw new Error(`Failed to save project: ${error.message}`);
    }
};

/**
 * Uploads a file to Supabase Storage and returns its metadata, including the storage path.
 * @param userId The user's ID.
 * @param projectId The project's ID.
 * @param file The file to upload.
 * @returns A ProjectFile object with the path.
 */
export const uploadFile = async (userId: string, projectId: string, file: File): Promise<ProjectFile> => {
    const path = `${userId}/${projectId}/${file.name}`;
    
    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true, // Overwrite if exists, useful for re-uploads
        });
        
    if (error) {
        console.error("Supabase upload error:", error);
        throw new Error(`Failed to upload file "${file.name}": ${error.message}`);
    }
    
    return {
        name: file.name,
        type: file.type,
        size: file.size,
        path: path,
    };
};

/**
 * Downloads a file from Supabase Storage and returns it as a File object.
 * @param path The full path to the file in the storage bucket.
 * @returns A promise that resolves to a File object.
 */
export const downloadFile = async (path: string): Promise<File> => {
    const { data: blob, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(path);
        
    if (error) {
        console.error("Supabase download error:", error);
        throw new Error(`Failed to download file at path "${path}": ${error.message}`);
    }

    if (!blob) {
        throw new Error(`No file data found at path "${path}".`);
    }

    // The filename is the last part of the path
    const filename = path.substring(path.lastIndexOf('/') + 1);
    
    return new File([blob], filename, { type: blob.type });
};

/**
 * Deletes a project and all its associated files from Supabase.
 * @param userId The user's ID.
 * @param projectId The project's ID.
 */
export const deleteProject = async (userId: string, projectId: string): Promise<void> => {
    // Step 1: List and delete all files in the project's storage folder.
    const folderPath = `${userId}/${projectId}`;
    const { data: files, error: listError } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folderPath);

    if (listError) {
        console.error("Supabase list files error:", listError);
        throw new Error(`Failed to list files for project deletion: ${listError.message}`);
    }

    if (files && files.length > 0) {
        const filePaths = files.map(file => `${folderPath}/${file.name}`);
        const { error: removeError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove(filePaths);
        
        if (removeError) {
            console.error("Supabase remove files error:", removeError);
            throw new Error(`Failed to remove project files: ${removeError.message}`);
        }
    }

    // Step 2: Delete the project record from the database.
    const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

    if (deleteError) {
        console.error("Supabase delete project error:", deleteError);
        throw new Error(`Failed to delete project record: ${deleteError.message}`);
    }
};