export class FileService {
    private targetDirectory: string | null = null;

    /**
     * Checks if the application is running inside NW.js
     */
    public isNW(): boolean {
        return typeof (window as any).nw !== 'undefined';
    }

    /**
     * Resets the target directory for NW.js exports. 
     * Should be called at the start of a multi-file export.
     */
    public clearTargetDirectory(): void {
        this.targetDirectory = null;
    }

    /**
     * NW.js: Opens a directory picker
     */
    public async selectDirectory(): Promise<string | null> {
        return new Promise((resolve) => {
            const selector = document.createElement('input');
            selector.type = 'file';
            selector.setAttribute('nwdirectory', '');
            selector.onchange = () => {
                if (selector.value) {
                    this.targetDirectory = selector.value;
                    resolve(selector.value);
                } else {
                    resolve(null);
                }
            };
            selector.click();
        });
    }

    /**
     * Saves a dataURL as a PNG file. 
     * In NW.js, it writes directly to disk. 
     * In Browser, it triggers a download.
     */
    public async saveImage(dataUrl: string, fileName: string): Promise<void> {
        const fullFileName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;

        if (this.isNW()) {
            if (!this.targetDirectory) {
                const dir = await this.selectDirectory();
                if (!dir) return; // User cancelled
            }

            const fs = (window as any).require('fs');
            const path = (window as any).require('path');
            
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
            const fullPath = path.join(this.targetDirectory, fullFileName);

            return new Promise((resolve, reject) => {
                fs.writeFile(fullPath, base64Data, 'base64', (err: any) => {
                    if (err) {
                        console.error("FileService: Failed to save image", err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } else {
            // Standard Browser Behavior
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = fullFileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            a.remove();
            return Promise.resolve();
        }
    }
}