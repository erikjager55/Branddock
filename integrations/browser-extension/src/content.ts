// =============================================================
// Content-script: selectie-capture + resultaat-overlay (Shadow DOM).
//
// Wordt on-demand geïnjecteerd door de service-worker (niet via manifest),
// vandaar de idempotentie-guard. Het paneel leeft in een shadow-root zodat
// pagina-CSS er niet in lekt. "Vervang selectie" werkt alleen wanneer de
// capture in een bewerkbaar element zat (textarea/input/contenteditable).
// =============================================================

import type { ContentMessage, CaptureResponse } from './messages';

type CapturedTarget =
  | { kind: 'field'; el: HTMLTextAreaElement | HTMLInputElement; start: number; end: number }
  | { kind: 'range'; range: Range }
  | null;

declare global {
  interface Window {
    __branddockContentLoaded?: boolean;
  }
}

if (!window.__branddockContentLoaded) {
  window.__branddockContentLoaded = true;
  initBranddockContent();
}

function initBranddockContent(): void {
  let captured: CapturedTarget = null;
  let host: HTMLDivElement | null = null;
  let shadow: ShadowRoot | null = null;

  chrome.runtime.onMessage.addListener((message: ContentMessage, _sender, sendResponse) => {
    switch (message.type) {
      case 'branddock:ping':
        sendResponse({ ok: true });
        break;
      case 'branddock:capture':
        sendResponse(captureSelection());
        break;
      case 'branddock:loading':
        renderPanel({ state: 'loading', label: message.label });
        break;
      case 'branddock:result':
        renderPanel({
          state: 'result',
          title: message.title,
          text: message.text,
          model: message.model,
          canReplace: message.canReplace,
        });
        break;
      case 'branddock:error':
        renderPanel({ state: 'error', message: message.message });
        break;
    }
    // Alle antwoorden zijn synchroon — geen `return true` nodig.
  });

  function isTextField(el: Element | null): el is HTMLTextAreaElement | HTMLInputElement {
    if (el instanceof HTMLTextAreaElement) return true;
    if (el instanceof HTMLInputElement) {
      return ['text', 'search', 'email', 'url'].includes(el.type);
    }
    return false;
  }

  function inContentEditable(node: Node): boolean {
    const el = node instanceof Element ? node : node.parentElement;
    return Boolean(el?.closest('[contenteditable]:not([contenteditable="false"])'));
  }

  function captureSelection(): CaptureResponse {
    captured = null;
    const active = document.activeElement;
    if (isTextField(active)) {
      const start = active.selectionStart;
      const end = active.selectionEnd;
      if (start !== null && end !== null && end > start) {
        captured = { kind: 'field', el: active, start, end };
        return { text: active.value.slice(start, end), editable: true };
      }
    }
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0).cloneRange();
      const editable = inContentEditable(range.commonAncestorContainer);
      if (editable) captured = { kind: 'range', range };
      return { text: selection.toString(), editable };
    }
    return { text: '', editable: false };
  }

  function replaceCaptured(text: string): boolean {
    if (!captured) return false;
    if (captured.kind === 'field') {
      const { el, start, end } = captured;
      if (!el.isConnected) return false;
      el.setRangeText(text, start, end, 'end');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.focus();
      return true;
    }
    const { range } = captured;
    if (!range.startContainer.isConnected) return false;
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    const hostEl =
      range.startContainer instanceof Element
        ? range.startContainer
        : range.startContainer.parentElement;
    hostEl
      ?.closest('[contenteditable]:not([contenteditable="false"])')
      ?.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      return ok;
    }
  }

  const PANEL_CSS = `
    :host { all: initial; }
    .panel {
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
      width: 380px; max-width: calc(100vw - 32px); box-sizing: border-box;
      background: #ffffff; color: #1a2b2b;
      border: 1px solid #d8e2e0; border-radius: 10px;
      box-shadow: 0 8px 28px rgba(10, 40, 38, 0.18);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px; line-height: 1.45;
    }
    .head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; border-bottom: 1px solid #e8efee;
    }
    .brand { font-weight: 700; color: #0c7f6c; font-size: 12px; letter-spacing: 0.02em; }
    .close {
      border: 0; background: none; cursor: pointer; color: #6b7d7a;
      font-size: 15px; line-height: 1; padding: 2px 4px;
    }
    .close:hover { color: #1a2b2b; }
    .body { padding: 12px 14px; max-height: 45vh; overflow-y: auto; }
    .title { font-weight: 600; margin: 0 0 6px; font-size: 13px; }
    .text { white-space: pre-wrap; word-wrap: break-word; margin: 0; }
    .muted { color: #6b7d7a; font-size: 11px; margin-top: 8px; }
    .error { color: #b3423a; margin: 0; }
    .actions { display: flex; gap: 8px; padding: 10px 14px; border-top: 1px solid #e8efee; }
    .btn {
      border: 1px solid #c6d4d1; background: #f6faf9; color: #1a2b2b;
      border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer;
      font-family: inherit;
    }
    .btn:hover { background: #ecf4f2; }
    .btn.primary { background: #1FD1B2; border-color: #1FD1B2; color: #04343a; font-weight: 600; }
    .btn.primary:hover { background: #19bda1; }
    .spinner {
      display: inline-block; width: 12px; height: 12px; margin-right: 8px;
      border: 2px solid #c6d4d1; border-top-color: #1FD1B2; border-radius: 50%;
      animation: bd-spin 0.8s linear infinite; vertical-align: -2px;
    }
    @keyframes bd-spin { to { transform: rotate(360deg); } }
  `;

  type PanelState =
    | { state: 'loading'; label: string }
    | { state: 'result'; title: string; text: string; model: string; canReplace: boolean }
    | { state: 'error'; message: string };

  function ensurePanel(): ShadowRoot {
    if (host && shadow && host.isConnected) return shadow;
    host = document.createElement('div');
    host.setAttribute('data-branddock-overlay', '');
    shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = PANEL_CSS;
    shadow.appendChild(style);
    document.documentElement.appendChild(host);
    return shadow;
  }

  function closePanel(): void {
    host?.remove();
    host = null;
    shadow = null;
  }

  function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    textContent?: string,
  ): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.className = className;
    if (textContent !== undefined) node.textContent = textContent;
    return node;
  }

  function renderPanel(state: PanelState): void {
    const root = ensurePanel();
    root.querySelector('.panel')?.remove();

    const panel = el('div', 'panel');
    const head = el('div', 'head');
    head.appendChild(el('span', 'brand', 'Branddock'));
    const close = el('button', 'close', '×');
    close.setAttribute('aria-label', 'Sluiten');
    close.addEventListener('click', closePanel);
    head.appendChild(close);
    panel.appendChild(head);

    const body = el('div', 'body');

    if (state.state === 'loading') {
      const line = el('p', 'text');
      line.appendChild(el('span', 'spinner'));
      line.appendChild(document.createTextNode(state.label));
      body.appendChild(line);
      body.appendChild(el('p', 'muted', 'Dit kan tot twee minuten duren.'));
      panel.appendChild(body);
    } else if (state.state === 'error') {
      body.appendChild(el('p', 'error', state.message));
      panel.appendChild(body);
    } else {
      body.appendChild(el('p', 'title', state.title));
      body.appendChild(el('p', 'text', state.text));
      body.appendChild(el('p', 'muted', `Model: ${state.model}`));
      panel.appendChild(body);

      const actions = el('div', 'actions');
      const copyBtn = el('button', 'btn primary', 'Kopieer');
      copyBtn.addEventListener('click', () => {
        void copyText(state.text).then((ok) => {
          copyBtn.textContent = ok ? 'Gekopieerd' : 'Kopiëren mislukt';
        });
      });
      actions.appendChild(copyBtn);
      if (state.canReplace) {
        const replaceBtn = el('button', 'btn', 'Vervang selectie');
        replaceBtn.addEventListener('click', () => {
          if (replaceCaptured(state.text)) {
            closePanel();
          } else {
            replaceBtn.textContent = 'Vervangen mislukt — kopieer';
            replaceBtn.disabled = true;
          }
        });
        actions.appendChild(replaceBtn);
      }
      panel.appendChild(actions);
    }

    root.appendChild(panel);
  }
}
