import fs from 'fs-extra';
import path from 'path';

const src = path.resolve('src/templates');
const dest = path.resolve('dist/templates');

async function copy() {
    try {
        await fs.ensureDir(dest);
        await fs.copy(src, dest);
        console.log('Templates copied successfully.');
    } catch (err) {
        console.error('Error copying templates:', err);
        process.exit(1);
    }
}

copy();
