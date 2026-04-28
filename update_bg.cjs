const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components');

const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

let changedCount = 0;

files.forEach(file => {
    const filePath = path.join(componentsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    let newContent = content;
    
    // Yarı saydam arkaplanlar (header vb.)
    newContent = newContent.replace(/bg-\[#030712\]\/90/g, 'bg-slate-900/90');
    newContent = newContent.replace(/bg-\[#030712\]\/80/g, 'bg-slate-900/80');
    
    // Düz arkaplanlar (sayfa root vb.)
    newContent = newContent.replace(/bg-\[#030712\]/g, 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900');
    
    // Ayrıca bg-slate-950 veya benzeri karanlık sınıflar varsa onları da hafifletebiliriz ama şimdilik sadece 030712
    
    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        changedCount++;
        console.log('Updated:', file);
    }
});

console.log(`Updated ${changedCount} files.`);
