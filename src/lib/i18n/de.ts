export const de = {
  app: {
    name: 'pendli',
    tagline: 'OeV-Tagesplaner',
  },
  steps: {
    setup: 'Setup',
    import: 'Import',
    plan: 'Berechnung',
    result: 'Tagesplan',
  },
  setup: {
    title: 'Einrichtung',
    description: 'Konfiguriere deine Adressen und Arbeitszeiten.',
    homeLabel: 'Privatadresse',
    homePlaceholder: 'z.B. Zürich Altstetten',
    workLabel: 'Arbeitsadresse',
    workPlaceholder: 'z.B. ETH Zürich',
    workDays: 'Arbeitstage',
    workStart: 'Arbeitsbeginn',
    workEnd: 'Arbeitsende',
    buffer: 'Pufferzeit vor Terminen',
    bufferUnit: 'Min.',
    next: 'Weiter',
    loadDemo: 'Demo laden',
  },
  import: {
    title: 'Termine importieren',
    description: 'Lade deinen Kalender hoch oder füge Termine manuell hinzu.',
    dropzone: 'Kalender-Datei hierher ziehen',
    dropzoneHint: '.ics oder .csv',
    appointmentsFound: (n: number) => `${n} Termin${n !== 1 ? 'e' : ''} erkannt`,
    addManual: '+ Termin manuell hinzufügen',
    titlePlaceholder: 'Titel',
    locationPlaceholder: 'Ort / Adresse',
    add: 'Hinzufügen',
    cancel: 'Abbrechen',
    back: 'Zurück',
    calculate: 'Route berechnen',
  },
  plan: {
    calculating: 'Route wird berechnet...',
  },
  result: {
    newDay: 'Neuen Tag planen',
    toCalendar: 'In Kalender',
    share: 'Teilen',
    exported: 'Exportiert',
    shared: 'Geteilt',
    copied: 'Kopiert',
    noPlan: 'Kein Tagesplan vorhanden.',
    backToStart: 'Zurück zum Start',
  },
  timeline: {
    startHome: 'Start: Zuhause',
    endHome: 'Ende: Zuhause',
    connections: 'Verbindungen',
    appointments: 'Termine',
    noConnection: 'Keine ÖV-Verbindung gefunden',
    walkMinutes: (n: number) => `${n} Min. Fussweg`,
    viewOnSbb: 'Auf SBB ansehen',
  },
  status: {
    ok: 'OK',
    tight: 'Knapp',
    impossible: 'Kritisch',
  },
  days: {
    short: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  },
  footer: {
    dataVia: 'Daten via',
  },
  errors: {
    fileTypeUnsupported: 'Nur .ics und .csv Dateien werden unterstützt.',
    locationNotFound: (loc: string, title: string) =>
      `Ort "${loc}" für "${title}" konnte nicht aufgelöst werden.`,
    connectionImpossible: (title: string) =>
      `Verbindung zu "${title}" ist zeitlich nicht machbar!`,
    appointmentsOverlap: (a: string, b: string) =>
      `Termine ${a} und ${b} überlappen sich`,
  },
} as const;

export type Translations = typeof de;
