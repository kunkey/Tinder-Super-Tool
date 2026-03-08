import fs from 'fs';
import path from 'path';

export function readConfig(filename: string): any {
    const filePath = path.join(process.cwd(), 'config', filename);
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}

export function writeConfig(filename: string, data: any): boolean {
    try {
        const filePath = path.join(process.cwd(), 'config', filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Lỗi ghi file ${filename}:`, error);
        return false;
    }
}
