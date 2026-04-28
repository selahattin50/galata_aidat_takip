const fs = require('fs');
let code = fs.readFileSync('components/SettingsView.tsx', 'utf8');

// Add IBAN to state init
code = code.split('lastAutoDuesMonth: buildingInfo?.lastAutoDuesMonth || ""\n  });').join('lastAutoDuesMonth: buildingInfo?.lastAutoDuesMonth || "",\n    iban: buildingInfo?.iban || "",\n    ibanReceiver: buildingInfo?.ibanReceiver || ""\n  });');
code = code.split('lastAutoDuesMonth: buildingInfo?.lastAutoDuesMonth || ""\r\n  });').join('lastAutoDuesMonth: buildingInfo?.lastAutoDuesMonth || "",\r\n    iban: buildingInfo?.iban || "",\r\n    ibanReceiver: buildingInfo?.ibanReceiver || ""\r\n  });');

// Add IBAN to handleSave update
code = code.split('lastAutoDuesMonth: st.lastAutoDuesMonth\n    });').join('lastAutoDuesMonth: st.lastAutoDuesMonth,\n      iban: st.iban,\n      ibanReceiver: st.ibanReceiver\n    });');
code = code.split('lastAutoDuesMonth: st.lastAutoDuesMonth\r\n    });').join('lastAutoDuesMonth: st.lastAutoDuesMonth,\r\n      iban: st.iban,\r\n      ibanReceiver: st.ibanReceiver\r\n    });');

// Remove duplicate Save button
code = code.replace(/className=\"w-full bg-blue-600 rounded-2xl py-3 flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-xl shadow-blue-900\/20\"\r?\n\s+disabled=\{isSaving\}\r?\n\s+className=\"w-full bg-blue-600 rounded-2xl py-3 flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-xl shadow-blue-900\/20\"/g, 'className=\"w-full bg-blue-600 rounded-2xl py-3 flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-xl shadow-blue-900/20\"');

fs.writeFileSync('components/SettingsView.tsx', code);
console.log('Done fixing SettingsView.tsx');
