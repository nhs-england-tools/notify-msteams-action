import {encode} from 'html-entities';

// helper methods for handling markdown
export function escapeMarkdown(text: string): string {
  return encode(text, {mode: 'nonAsciiPrintable', level: 'xml'})
}
