/**
 * Utility for formatting and normalizing audio URLs across the application.
 * Automatically resolves migrated or legacy media paths to working storage locations.
 */

export function formatAudioUrl(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Handle legacy/defunct Supabase project media URLs
  if (trimmed.includes("squqwkxgsxqojhqmdvbo.supabase.co")) {
    const filename = trimmed.split("/").pop() || "";
    // Remove prepended timestamp and question identifiers: e.g. 1779349402913_Q1_file.mp3 -> file.mp3
    const cleanFilename = filename.replace(/^\d+_Q\d+_/, "");
    if (cleanFilename) {
      return `https://storage.googleapis.com/comaiphuong-edu-media/sound/${cleanFilename}`;
    }
  }

  return trimmed;
}
