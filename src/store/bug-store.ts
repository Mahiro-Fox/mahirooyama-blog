import fs from 'fs/promises';
import { BUGS_FILE } from '@/constant';
import { ensureFileInitialized } from '@/utils/file-utils';

export type BugStatus = 'pending' | 'resolved';

export interface BugReport {
  id: string;
  createdAt: string;
  content: string;
  status: BugStatus;
  contact?: string;
  userAgent?: string;
  url?: string;
}

export const bugStore = {
  async getBugs(): Promise<BugReport[]> {
    await ensureFileInitialized(BUGS_FILE);
    const content = await fs.readFile(BUGS_FILE, 'utf-8');
    return JSON.parse(content);
  },

  async saveBugs(bugs: BugReport[]): Promise<void> {
    await fs.writeFile(BUGS_FILE, JSON.stringify(bugs, null, 2), 'utf-8');
  },

  async getAll(): Promise<BugReport[]> {
    return this.getBugs();
  },

  async create(input: {
    content: string;
    contact?: string;
    userAgent?: string;
    url?: string;
  }): Promise<BugReport> {
    const bugs = await this.getBugs();
    const newBug: BugReport = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      content: input.content,
      status: 'pending',
      contact: input.contact,
      userAgent: input.userAgent,
      url: input.url,
    };
    bugs.push(newBug);
    await this.saveBugs(bugs);
    return newBug;
  },

  async updateStatus(id: string, status: BugStatus): Promise<boolean> {
    const bugs = await this.getBugs();
    const index = bugs.findIndex((b) => b.id === id);
    if (index === -1) return false;
    bugs[index].status = status;
    await this.saveBugs(bugs);
    return true;
  },

  async delete(id: string): Promise<boolean> {
    const bugs = await this.getBugs();
    const filtered = bugs.filter((b) => b.id !== id);
    if (filtered.length === bugs.length) return false;
    await this.saveBugs(filtered);
    return true;
  },
};
