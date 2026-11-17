import {encode} from 'html-entities'

// helper methods for handling markdown
// Encode only the HTML special characters, so emoji and other Unicode text
// reach Teams as they are.
export function escapeMarkdown(text: string): string {
  return encode(text, {mode: 'specialChars', level: 'xml'})
}
