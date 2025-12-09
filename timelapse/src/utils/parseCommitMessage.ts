export interface ParsedCommitMessage {
  classe: string;
  name: string;
  content: string;
}

/**
 * Parse commit message in format: "CLASSE - NOM Prenom - Content"
 * Returns default values if parsing fails
 */
export function parseCommitMessage(message: string): ParsedCommitMessage {
  const parts = message.split(" - ");

  if (parts.length >= 3) {
    return {
      classe: parts[0].trim() || "Classe",
      name: parts[1].trim() || "Prenom NOM",
      content: parts.slice(2).join(" - ").trim() || "Update",
    };
  } else if (parts.length === 2) {
    return {
      classe: parts[0].trim() || "Classe",
      name: "Prenom NOM",
      content: parts[1].trim() || "Update",
    };
  }

  return {
    classe: "Classe",
    name: "Prenom NOM",
    content: message || "Update",
  };
}
