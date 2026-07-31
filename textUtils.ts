const COMMON_TURKISH_WORDS: Array<[RegExp, string]> = [
  [/\bAIDAT\b/gi, 'AİDAT'],
  [/\bALACAGI\b/gi, 'ALACAĞI'],
  [/\bBAKIYESI\b/gi, 'BAKİYESİ'],
  [/\bBAKIMI\b/gi, 'BAKIMI'],
  [/\bDEPEZITO\b/gi, 'DEPOZİTO'],
  [/\bDEPEZITOSU\b/gi, 'DEPOZİTOSU'],
  [/\bDEPOZITO\b/gi, 'DEPOZİTO'],
  [/\bDEPOZITOSU\b/gi, 'DEPOZİTOSU'],
  [/\bDEVIR\b/gi, 'DEVİR'],
  [/\bELEKTIRIK\b/gi, 'ELEKTRİK'],
  [/\bELEKTRIK\b/gi, 'ELEKTRİK'],
  [/\bGELIRI\b/gi, 'GELİRİ'],
  [/\bGIDERI\b/gi, 'GİDERİ'],
  [/\bICIN\b/gi, 'İÇİN'],
  [/\bICI\b/gi, 'İÇİ'],
  [/\bIADE\b/gi, 'İADE'],
  [/\bKAYNAKLI\b/gi, 'KAYNAKLI'],
  [/\bKOLIDOR\b/gi, 'KORİDOR'],
  [/\bKREDI\b/gi, 'KREDİ'],
  [/\bLAMBA\b/gi, 'LAMBA'],
  [/\bLAMBASI\b/gi, 'LAMBASI'],
  [/\bMEPAS\b/gi, 'MEPAŞ'],
  [/\bNISAN\b/gi, 'NİSAN'],
  [/\bODEME\b/gi, 'ÖDEME'],
  [/\bSENSORLU\b/gi, 'SENSÖRLÜ'],
  [/\bSENSORLÜ\b/gi, 'SENSÖRLÜ'],
  [/\bSUNDURMA\b/gi, 'SUNDURMA'],
  [/\bSONSOR\b/gi, 'SENSÖR'],
  [/\bSÖNSOR\b/gi, 'SENSÖR'],
  [/\bTEMIZLIK\b/gi, 'TEMİZLİK'],
  [/\bYILLIK\b/gi, 'YILLIK'],
  [/\bDEMIR\b/gi, 'DEMİR'],
];

export const fixCommonTurkishText = (value: string) => {
  let fixed = value;
  COMMON_TURKISH_WORDS.forEach(([pattern, replacement]) => {
    fixed = fixed.replace(pattern, replacement);
  });
  return fixed;
};

export const upperTr = (value: string) => fixCommonTurkishText(value.toLocaleUpperCase('tr-TR'));

// Use when text must be interpolated into an HTML string for off-screen reports.
export const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
