//! Aho-Corasick word-matching core.
//!
//! Replaces the legacy `O(text × words)` `indexOf` loop with a single-pass
//! automaton scan. Two automata (active + deleted word lists) are cached and
//! rebuilt only when the word set changes. Match semantics mirror
//! `src/content-scripts/wordMatcher.ts`: leftmost-longest, non-overlapping,
//! ASCII case-insensitive, both flanks non-`[a-zA-Z]`, returned `word`
//! preserves source casing.
//!
//! Offsets are reported as UTF-16 code-unit indices, not UTF-8 byte offsets,
//! so the JS caller can slice the text node directly (JS strings index by
//! UTF-16 units). This matters whenever non-ASCII text precedes a match.

use aho_corasick::{AhoCorasick, MatchKind};
use serde::Serialize;

/// One match in UTF-16 code-unit offsets, mirroring the JS
/// `{ index, word, end }` contract.
#[derive(Serialize, Debug, PartialEq, Eq)]
pub struct Match {
    pub index: usize,
    pub word: String,
    pub end: usize,
}

/// Caches the active and deleted automata across calls.
#[derive(Default)]
pub struct Matcher {
    active: Option<AhoCorasick>,
    deleted: Option<AhoCorasick>,
}

impl Matcher {
    /// Rebuild both automata. Call only when the word set changes.
    pub fn set_words(
        &mut self,
        active: &[String],
        deleted: &[String],
    ) {
        self.active = build(active);
        self.deleted = build(deleted);
    }

    /// Matches against the active word list.
    pub fn find_active(&self, text: &str) -> Vec<Match> {
        find(self.active.as_ref(), text)
    }

    /// Matches against the deleted word list.
    pub fn find_deleted(&self, text: &str) -> Vec<Match> {
        find(self.deleted.as_ref(), text)
    }
}

/// Build an automaton, or `None` for an empty word list.
fn build(words: &[String]) -> Option<AhoCorasick> {
    if words.is_empty() {
        return None;
    }
    AhoCorasick::builder()
        .match_kind(MatchKind::LeftmostLongest)
        .ascii_case_insensitive(true)
        .build(words)
        .ok()
}

/// Scan `text` with `ac`, keeping only matches on word boundaries and
/// converting byte offsets to UTF-16 code-unit offsets.
fn find(
    ac: Option<&AhoCorasick>,
    text: &str,
) -> Vec<Match> {
    let Some(ac) = ac else {
        return Vec::new();
    };
    let bytes = text.as_bytes();
    let mut out = Vec::new();
    for m in ac.find_iter(text) {
        let (start, end) = (m.start(), m.end());
        if !is_word_boundary(bytes, start, end) {
            continue;
        }
        let index = text[..start].encode_utf16().count();
        let word = text[start..end].to_string();
        let len16 = word.encode_utf16().count();
        out.push(Match {
            index,
            word,
            end: index + len16,
        });
    }
    out
}

/// A match sits on a word boundary when neither flank is an ASCII letter.
/// Out-of-range flanks (string edges) count as boundaries, matching the JS
/// `index > 0 ? text[index-1] : ' '` convention. Multi-byte UTF-8 flank
/// bytes are `>= 0x80`, hence non-alphabetic — consistent with the JS
/// `[^a-zA-Z]` test for non-ASCII neighbours.
fn is_word_boundary(
    bytes: &[u8],
    start: usize,
    end: usize,
) -> bool {
    let before_ok = start == 0
        || !bytes[start - 1].is_ascii_alphabetic();
    let after_ok = end >= bytes.len()
        || !bytes[end].is_ascii_alphabetic();
    before_ok && after_ok
}

#[cfg(test)]
mod tests {
    use super::*;

    fn matcher(active: &[&str]) -> Matcher {
        let mut m = Matcher::default();
        let active: Vec<String> =
            active.iter().map(|s| s.to_string()).collect();
        m.set_words(&active, &[]);
        m
    }

    #[test]
    fn matches_whole_word_case_insensitive() {
        let m = matcher(&["cat"]);
        let got = m.find_active("A Cat sat");
        assert_eq!(
            got,
            vec![Match {
                index: 2,
                word: "Cat".into(),
                end: 5
            }]
        );
    }

    #[test]
    fn rejects_substring_without_boundary() {
        let m = matcher(&["at"]);
        assert!(m.find_active("cat").is_empty());
    }

    #[test]
    fn skips_embedded_keeps_standalone() {
        let m = matcher(&["able"]);
        let got = m.find_active("able cable");
        assert_eq!(got.len(), 1);
        assert_eq!(got[0].index, 0);
    }

    #[test]
    fn prefers_longest_overlap() {
        let m = matcher(&["cat", "cats"]);
        let got = m.find_active("the cats");
        assert_eq!(got.len(), 1);
        assert_eq!(got[0].word, "cats");
    }

    #[test]
    fn reports_utf16_offsets_after_non_ascii() {
        // "你好 cat": three chars before the space, then "cat".
        let m = matcher(&["cat"]);
        let got = m.find_active("你好 cat");
        assert_eq!(got[0].index, 3);
        assert_eq!(got[0].end, 6);
        assert_eq!(got[0].word, "cat");
    }

    #[test]
    fn deleted_list_is_separate() {
        let mut m = Matcher::default();
        m.set_words(&["keep".into()], &["gone".into()]);
        assert!(m.find_active("a gone word").is_empty());
        assert_eq!(m.find_deleted("a gone word").len(), 1);
    }

    #[test]
    fn empty_word_list_matches_nothing() {
        let m = Matcher::default();
        assert!(m.find_active("anything here").is_empty());
    }
}
