const fs = require('fs');
let code = fs.readFileSync('d:\\Galata Aidat Takip\\components\\SettingsView.tsx', 'utf8');

const target1 = `            <button
              onClick={handleSave}
              disabled={isSaving}`;

const target2 = `            <button\r
              onClick={handleSave}\r
              disabled={isSaving}`;

const replacement = `            {/* Banka Bilgisi */}
            <div className="bg-black/20 p-4 rounded-3xl border border-white/5 space-y-4 mb-5">
              <div className="flex flex-col">
                <p className="text-[12px] font-black uppercase tracking-wider text-white/90">Banka Bilgisi</p>
                <p className="text-[8px] font-bold text-white/30 uppercase mt-0.5">Aidat ödemeleri için kullanılacak banka hesabı</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">IBAN</label>
                  <input
                    type="text"
                    value={st.iban || ''}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\\s+/g, '').toUpperCase();
                      if (!val.startsWith('TR')) {
                        val = 'TR' + val.replace(/[^0-9]/g, '');
                      } else {
                        val = 'TR' + val.substring(2).replace(/[^0-9]/g, '');
                      }
                      val = val.substring(0, 26);
                      let formatted = val.match(/.{1,4}/g)?.join(' ') || '';
                      setSt({ ...st, iban: formatted });
                    }}
                    className="bg-black/40 outline-none font-black text-sm w-full text-white border border-white/5 rounded-2xl p-3 focus:border-blue-500/50 transition-colors tracking-widest placeholder:opacity-30"
                    placeholder="TR__ ____ ____ ____ ____ ____ __"
                  />
                </div>
                
                <div>
                  <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">ALICI ADI SOYADI</label>
                  <input
                    type="text"
                    value={st.ibanReceiver || ''}
                    onChange={e => setSt({ ...st, ibanReceiver: e.target.value.toUpperCase() })}
                    className="bg-black/40 outline-none font-black text-sm w-full text-white border border-white/5 rounded-2xl p-3 focus:border-blue-500/50 transition-colors placeholder:opacity-30"
                    placeholder="AD SOYAD"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}`;

code = code.replace(target1, replacement).replace(target2, replacement);
fs.writeFileSync('d:\\Galata Aidat Takip\\components\\SettingsView.tsx', code);
