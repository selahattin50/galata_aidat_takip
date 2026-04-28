const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components');

const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

let changedCount = 0;

files.forEach(file => {
    const filePath = path.join(componentsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    let newContent = content;
    
    // Replace `-mx-4 ` with empty string or `-mx-4` at the end
    newContent = newContent.replace(/-mx-4\s+/g, '');
    newContent = newContent.replace(/\s+-mx-4/g, '');
    
    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        changedCount++;
        console.log('Removed -mx-4 from:', file);
    }
});

console.log(`Updated ${changedCount} files.`);
