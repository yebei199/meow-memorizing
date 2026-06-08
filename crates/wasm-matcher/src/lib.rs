//! WASM boundary for the page word matcher.
//!
//! Exposes a thin, stateful API: `set_words` (re)builds the cached automata,
//! `find_matches` / `find_deleted_matches` scan a single text-node string.
//! State lives in a `thread_local` so the automata persist across calls
//! within the (single-threaded) wasm instance. All heavy logic is in
//! [`matcher`]; DOM work stays in JS.

mod matcher;

use std::cell::RefCell;

use matcher::Matcher;
use wasm_bindgen::prelude::*;

thread_local! {
    static MATCHER: RefCell<Matcher> =
        RefCell::new(Matcher::default());
}

/// Route Rust panics to the browser console for debuggable failures.
#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

/// Rebuild the cached active/deleted automata. Call only when the word set
/// changes; scanning reuses the cached state.
#[wasm_bindgen]
pub fn set_words(
    active: Vec<String>,
    deleted: Vec<String>,
) {
    MATCHER.with(|m| {
        m.borrow_mut().set_words(&active, &deleted);
    });
}

/// Return active-word matches in `text` as `{ index, word, end }[]`
/// (UTF-16 offsets).
#[wasm_bindgen]
pub fn find_matches(
    text: &str,
) -> Result<JsValue, JsValue> {
    MATCHER.with(|m| {
        let matches = m.borrow().find_active(text);
        serde_wasm_bindgen::to_value(&matches)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    })
}

/// Return deleted-word matches in `text` as `{ index, word, end }[]`
/// (UTF-16 offsets).
#[wasm_bindgen]
pub fn find_deleted_matches(
    text: &str,
) -> Result<JsValue, JsValue> {
    MATCHER.with(|m| {
        let matches = m.borrow().find_deleted(text);
        serde_wasm_bindgen::to_value(&matches)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    })
}
