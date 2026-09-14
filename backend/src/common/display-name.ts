/** The part of a display name to greet someone by. Empty when they set none. */
export function firstNameOf(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? '';
}
