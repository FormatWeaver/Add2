
import { supabase } from './supabaseClient';
import { AppState, ProjectFile, User } from '../types';

const BUCKET_NAME = 'project-files';

export const fetchProjects = async (userId: string): Promise<Map<string, AppState>> => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('id, app_state')
            .eq('user_id', userId);

        if (error || !data) {
            return new Map();
        }

        const projectsMap = new Map<string, AppState>();
        for (const record of data) {
            const projectState = record.app_state as any as AppState;
            projectsMap.set(record.id, projectState);
        }
        return projectsMap;
    } catch (err: any) {
        return new Map();
    }
};

export const fetchAllProjectsGlobal = async (): Promise<Map<string, AppState>> => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('id, app_state, user_id, project_name');

        if (error || !data) return new Map();

        const projectsMap = new Map<string, AppState>();
        for (const record of data) {
            const projectState = record.app_state as any as AppState;
            projectsMap.set(record.id, { ...projectState, projectId: record.id });
        }
        return projectsMap;
    } catch (err) {
        return new Map();
    }
}

/**
 * FIXED: Admin method to fetch ALL users.
 * Performs a broad 'Identity Discovery' by looking at both explicit profiles
 * and individual user metadata stored within global project states.
 */
export const fetchAllUsersGlobal = async (): Promise<User[]> => {
    try {
        const uniqueUsers = new Map<string, User>();

        // 1. Primary Source: Profiles table
        const { data: profiles } = await supabase.from('profiles').select('*');
        if (profiles) {
            profiles.forEach((d: any) => {
                uniqueUsers.set(d.id, {
                    id: d.id,
                    email: d.email,
                    name: d.name || d.email.split('@')[0],
                    role: d.role,
                    efficiencyScore: d.efficiency_score,
                    platformRank: d.platform_rank,
                    avatarUrl: d.avatar_url,
                    jobTitle: d.job_title,
                    company: d.company
                });
            });
        }

        // 2. Secondary Discovery: Projects table (scrapes identities from projects if profiles are missing)
        const { data: projects } = await supabase.from('projects').select('user_id, app_state');
        if (projects) {
            projects.forEach(p => {
                const state = p.app_state as any as AppState;
                if (state.currentUser && !uniqueUsers.has(state.currentUser.id)) {
                    uniqueUsers.set(state.currentUser.id, state.currentUser);
                } else if (p.user_id && !uniqueUsers.has(p.user_id)) {
                    // Fallback for cases where we only have a raw ID
                    uniqueUsers.set(p.user_id, {
                        id: p.user_id,
                        email: 'discovered-identity@platform.local',
                        name: 'Discovered Estimator',
                        role: 'user'
                    });
                }
            });
        }

        return Array.from(uniqueUsers.values());
    } catch (err) {
        console.error("Platform directory discovery failed:", err);
        return [];
    }
};

export const updateUserRank = async (userId: string, score: number, rank: string): Promise<void> => {
    try {
        await supabase
            .from('profiles')
            .upsert({
                id: userId,
                efficiency_score: score,
                platform_rank: rank,
                updated_at: new Date().toISOString()
            });
    } catch (err) {
        console.error("Failed to update user rank:", err);
    }
};

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
    
    if (error) throw new Error(`Upload Failed: ${error.message}`);
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
