// Plain-text + word-counting helpers. Single source of truth lives in
// shared/core/text.js (shared with the collab service); re-exported here so
// existing api imports keep working unchanged.
export {
  countSliceTextLength,
  extractNodeText,
  extractPlainText,
  strWordCount,
  round,
  stripTagsAndJsonText,
  countGroupWords,
} from '@am/core';
