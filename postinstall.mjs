import fs from 'fs';
import path from 'path';

function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
}

const filesToCopy = [
  { src: '.env.example', dest: '.env' },
  { src: '.env.example', dest: path.join('app', '.env') },
];

filesToCopy.forEach(({ src, dest }) => {
  try {
    copyFile(src, dest);
  } catch (error) {
    console.error(`Error copying ${src} to ${dest}:`, error.message);
  }
});
