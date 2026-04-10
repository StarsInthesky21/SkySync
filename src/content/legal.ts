export type LegalDocumentKey = "privacy" | "terms";

type LegalSection = {
  heading: string;
  body: string[];
};

export type LegalDocument = {
  title: string;
  updated: string;
  sections: LegalSection[];
};

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  privacy: {
    title: "Privacy Policy",
    updated: "April 9, 2026",
    sections: [
      {
        heading: "Overview",
        body: [
          "SkySync is a social stargazing application. This policy explains what data the app stores, how it is used, and what controls you have.",
        ],
      },
      {
        heading: "Data You Provide",
        body: [
          "SkySync stores your display name, room chat messages, shared notes, and custom constellation patterns so the social features work.",
          "You do not need to provide your real name to use the app.",
        ],
      },
      {
        heading: "Data Stored Automatically",
        body: [
          "The app stores profile progress such as XP, discovery counts, streaks, and challenge completions.",
          "If Firebase sync is enabled, anonymous authentication and synced room data may be stored in Google Cloud Firestore.",
        ],
      },
      {
        heading: "Data We Do Not Collect",
        body: [
          "SkySync does not collect precise location, contacts, photos, payment data, advertising IDs, or microphone recordings in the current build.",
        ],
      },
      {
        heading: "Your Controls",
        body: [
          "You can clear app data at any time from Settings.",
          "You can use the app in local-only mode without enabling Firebase sync.",
        ],
      },
      {
        heading: "Third-Party Services",
        body: [
          "If enabled, Firebase is used for authentication and synced room data.",
          "Expo libraries are used for app runtime capabilities such as notifications and speech.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "For privacy questions, contact privacy@skysync.app.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "April 9, 2026",
    sections: [
      {
        heading: "Use of the App",
        body: [
          "SkySync is provided for personal, educational, and entertainment use.",
          "You agree not to misuse the app, interfere with the service, or attempt unauthorized access to synced room data.",
        ],
      },
      {
        heading: "User Content",
        body: [
          "You are responsible for the chat messages, notes, and custom constellation names you share.",
          "Do not post unlawful, abusive, or infringing content.",
        ],
      },
      {
        heading: "Availability",
        body: [
          "Some features may run in local-only mode, preview mode, or require optional backend configuration.",
          "SkySync may change, improve, or remove features over time.",
        ],
      },
      {
        heading: "Astronomy Information",
        body: [
          "Sky and astronomy data in the app may include approximations, computed estimates, or cached public data.",
          "Do not rely on SkySync for safety-critical, navigation, or professional observatory decisions.",
        ],
      },
      {
        heading: "Termination",
        body: [
          "Access may be limited or suspended for abuse or policy violations.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "For support or legal questions, contact hello@skysync.app.",
        ],
      },
    ],
  },
};
