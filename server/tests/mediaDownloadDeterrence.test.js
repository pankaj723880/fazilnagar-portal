import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Set up mock DOM environment before importing mediaProtection
class MockElement {
  constructor(tagName = 'DIV', attributes = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attributes };
    this.classList = {
      _classes: new Set((attributes.class || '').split(/\s+/).filter(Boolean)),
      contains(cls) {
        return this._classes.has(cls);
      },
      add(cls) {
        this._classes.add(cls);
      },
    };
    this.style = {};
    this.parentNode = null;
    this.children = [];
  }

  hasAttribute(name) {
    return name in this.attributes;
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
  }

  closest(selector) {
    let curr = this;
    while (curr) {
      if (selector.includes('.leaflet-pane') && curr.classList.contains('leaflet-pane')) return curr;
      if (selector.includes('.leaflet-tile') && curr.classList.contains('leaflet-tile')) return curr;
      if (selector.includes('.leaflet-container') && curr.classList.contains('leaflet-container')) return curr;
      if (selector.includes('[data-allow-media-save="true"]') && curr.getAttribute('data-allow-media-save') === 'true') return curr;
      if (selector.includes('[data-protected-media]') && curr.hasAttribute('data-protected-media')) return curr;
      if (selector.includes('.protected-media') && curr.classList.contains('protected-media')) return curr;
      if (selector === 'a' && curr.tagName === 'A') return curr;
      curr = curr.parentNode;
    }
    return null;
  }

  querySelector(sel) {
    if (sel.includes('img') && this.children.some(c => c.tagName === 'IMG')) return this.children.find(c => c.tagName === 'IMG');
    if (sel.includes('video') && this.children.some(c => c.tagName === 'VIDEO')) return this.children.find(c => c.tagName === 'VIDEO');
    return null;
  }
}

class MockHTMLImageElement extends MockElement {
  constructor(attributes = {}) {
    super('IMG', attributes);
  }
}

class MockHTMLVideoElement extends MockElement {
  constructor(attributes = {}) {
    super('VIDEO', attributes);
    this.disablePictureInPicture = false;
  }
}

// Attach mocks to globalThis
globalThis.Element = MockElement;
globalThis.HTMLElement = MockElement;
globalThis.HTMLImageElement = MockHTMLImageElement;
globalThis.HTMLVideoElement = MockHTMLVideoElement;
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  body: new MockElement('BODY'),
  querySelectorAll: () => [],
};

const {
  isProtectedMediaTarget,
  isRawMediaUrl,
  enforceVideoProtection,
  enforceImageProtection,
  isExcludedElement,
} = await import('../../client/src/utils/mediaProtection.js');

describe('Media Download Deterrence System', () => {
  it('correctly identifies raw media URLs vs regular links', () => {
    // Media URLs
    assert.equal(isRawMediaUrl('https://example.com/banner.png'), true);
    assert.equal(isRawMediaUrl('/uploads/avatars/user123.jpg'), true);
    assert.equal(isRawMediaUrl('https://portal.com/video.mp4?token=123'), true);
    assert.equal(isRawMediaUrl('/api/google-drive/media/abc123xyz'), true);
    assert.equal(isRawMediaUrl('https://example.com/photo.WEBP'), true);

    // Regular navigation links
    assert.equal(isRawMediaUrl('/news/123'), false);
    assert.equal(isRawMediaUrl('/directory'), false);
    assert.equal(isRawMediaUrl('https://maps.google.com/?q=Fazilnagar'), false);
    assert.equal(isRawMediaUrl('#regional-connectivity-section'), false);
    assert.equal(isRawMediaUrl('tel:+919876543210'), false);
    assert.equal(isRawMediaUrl('mailto:info@fazilnagar.in'), false);
  });

  it('correctly classifies protected media elements', () => {
    const img = new MockHTMLImageElement();
    assert.equal(isProtectedMediaTarget(img), true);

    const video = new MockHTMLVideoElement();
    assert.equal(isProtectedMediaTarget(video), true);

    const customDiv = new MockElement('DIV', { 'data-protected-media': 'true' });
    assert.equal(isProtectedMediaTarget(customDiv), true);

    const styledClassDiv = new MockElement('DIV', { class: 'protected-media' });
    assert.equal(isProtectedMediaTarget(styledClassDiv), true);
  });

  it('preserves native interactions on inputs, forms, and admin text controls', () => {
    const input = new MockElement('INPUT');
    assert.equal(isProtectedMediaTarget(input), false);

    const textarea = new MockElement('TEXTAREA');
    assert.equal(isProtectedMediaTarget(textarea), false);

    const select = new MockElement('SELECT');
    assert.equal(isProtectedMediaTarget(select), false);

    const paragraph = new MockElement('P');
    assert.equal(isProtectedMediaTarget(paragraph), false);
  });

  it('exempts Leaflet map elements to preserve interactive map gestures', () => {
    const mapContainer = new MockElement('DIV', { class: 'leaflet-container' });
    const tilePane = new MockElement('DIV', { class: 'leaflet-tile-pane' });
    tilePane.parentNode = mapContainer;

    const tileImg = new MockHTMLImageElement({ class: 'leaflet-tile' });
    tileImg.parentNode = tilePane;

    assert.equal(isExcludedElement(tileImg), true);
    assert.equal(isProtectedMediaTarget(tileImg), false);
  });

  it('exempts elements with explicit bypass attributes', () => {
    const bypassContainer = new MockElement('DIV', { 'data-allow-media-save': 'true' });
    const img = new MockHTMLImageElement();
    img.parentNode = bypassContainer;

    assert.equal(isExcludedElement(img), true);
    assert.equal(isProtectedMediaTarget(img), false);
  });

  it('enforces video protection attributes (nodownload, disablePictureInPicture, draggable=false)', () => {
    const video = new MockHTMLVideoElement();
    enforceVideoProtection(video);

    assert.equal(video.getAttribute('controlsList').includes('nodownload'), true);
    assert.equal(video.getAttribute('controlsList').includes('noplaybackrate'), true);
    assert.equal(video.disablePictureInPicture, true);
    assert.equal(video.getAttribute('disablePictureInPicture'), 'true');
    assert.equal(video.getAttribute('draggable'), 'false');
    assert.equal(video.getAttribute('data-protected-media'), 'true');
    assert.equal(typeof video.oncontextmenu, 'function');
  });

  it('enforces image protection attributes (draggable=false, user-drag=none)', () => {
    const img = new MockHTMLImageElement();
    enforceImageProtection(img);

    assert.equal(img.getAttribute('draggable'), 'false');
    assert.equal(img.getAttribute('data-protected-media'), 'true');
    assert.equal(img.style.userDrag, 'none');
    assert.equal(img.style.userSelect, 'none');
  });
});
