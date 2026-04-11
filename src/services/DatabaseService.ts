import localforage from "localforage";
import type { TProjectData } from "../models/TProjectData";

export class DatabaseService {
    private store: LocalForage;
    private readonly LAST_SESSION_KEY = 'last_session';

    constructor() {
        this.store = localforage.createInstance({
            name: 'AnimationFrameBuilder',
            storeName: 'projects',
            description: 'Store project data'
        });
    }

    /**
     * Saves project data and updates the last session name.
     */
    public async saveProject(name: string, data: TProjectData): Promise<void> {
        await this.store.setItem(name, data);
        await this.setLastProjectName(name);
    }

    public async getProject(name: string): Promise<TProjectData | null> {
        return await this.store.getItem<TProjectData>(name);
    }

    public async deleteProject(name: string): Promise<void> {
        await this.store.removeItem(name);
    }

    /**
     * Returns all saved project names (excluding internal keys).
     */
    public async getAllProjectNames(): Promise<string[]> {
        const keys = await this.store.keys();
        return keys.filter(key => key !== this.LAST_SESSION_KEY);
    }

    /**
     * Session management
     */
    public async getLastProjectName(): Promise<string | null> {
        return await this.store.getItem<string>(this.LAST_SESSION_KEY);
    }

    public async setLastProjectName(name: string): Promise<void> {
        await this.store.setItem(this.LAST_SESSION_KEY, name);
    }
}