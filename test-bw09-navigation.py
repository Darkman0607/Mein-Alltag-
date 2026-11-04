"""BW09-HF01: integrated UI navigation test using the real application module graph.

Chromium in this sandbox blocks all real network/local HTTP URLs. This harness
loads the *real* app.js and all its static dependencies into a same-document
import map (data URLs), retaining actual route, click, render, and IndexedDB
code. It is more integrated than the previous isolated calendar-only test, but
it does NOT claim to test Android PWA, service-worker caching, or live GitHub Pages.
"""
from __future__ import annotations
import base64
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
IMPORT = re.compile(r'''(?m)(\bimport\s+(?:[^\n;]+?\s+from\s*)?["'])(\.[^"']+)(["'])''')


def build_importmap():
    mapping = {}
    sources = {}
    visiting = set()
    def visit(path):
        path = path.resolve()
        if path in sources or path in visiting:
            return
        visiting.add(path)
        original = path.read_text(encoding='utf8')
        def update(match):
            source = match.group(2)
            target = (path.parent / source).resolve()
            if target.suffix == '': target = target.with_suffix('.js')
            assert target.is_relative_to(ROOT), target
            assert target.is_file(), target
            visit(target)
            return match.group(1) + 'appmodule:' + target.relative_to(ROOT).as_posix() + match.group(3)
        transformed = IMPORT.sub(update, original)
        sources[path] = transformed
        visiting.remove(path)
    visit(ROOT / 'assets/app.js')
    for p,source in sources.items():
        alias = 'appmodule:' + p.relative_to(ROOT).as_posix()
        mapping[alias] = 'data:text/javascript;base64,' + base64.b64encode(source.encode('utf8')).decode()
    assert len(mapping) >= 45, len(mapping)
    return mapping


def build_page():
    markup = (ROOT / 'index.html').read_text(encoding='utf8')
    markup = re.sub(r'<link\s+[^>]*rel="stylesheet"[^>]*>', '', markup)
    markup = markup.replace('<script type="module" src="./assets/app.js"></script>',
                            '<script type="module">import "appmodule:assets/app.js";</script>')
    importmap = '<script type="importmap">' + json.dumps({'imports':build_importmap()}) + '</script>'
    markup = markup.replace('</head>', importmap + '</head>')
    return markup


def main():
    assert "'belohnungskalender'" in (ROOT/'assets/app.js').read_text().split('function hashRoute()')[1].split('export function navigate')[0]
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                                    args=['--no-sandbox','--disable-dev-shm-usage'])
        for width in (320,390,412):
            context = browser.new_context(viewport={'width':width,'height':830},is_mobile=True,has_touch=True)
            page = context.new_page()
            errors = []
            page.on('pageerror',lambda e: errors.append(str(e)))
            page.set_content(build_page(),wait_until='domcontentloaded')
            page.locator('[data-open="belohnungswelt"]').wait_for(state='visible',timeout=12000)
            page.locator('[data-open="belohnungswelt"]').click()
            page.wait_for_function("location.hash === '#/reward' || location.hash === '#/reward/start'",timeout=4000)
            page.locator('button[data-reward="belohnungskalender"]').first.click()
            page.wait_for_function("location.hash === '#/reward/belohnungskalender'",timeout=4000)
            page.locator('#bw09Calendar').wait_for(state='visible',timeout=10000)
            assert page.locator('#view').get_by_text('Jeder Tag zählt').is_visible()
            # Navigation is tested with real app modules. About:blank blocks IndexedDB,
            # so calendar data/activation is verified in separate isolated BW09 tests.
            assert page.locator('#bw09Body').count()==1
            page.locator('button.bw-reward-back').click()
            page.wait_for_function("location.hash === '#/home'",timeout=4000)
            # Direct deep link, not just the home shortcut.
            page.evaluate("location.hash='#/reward/belohnungskalender'")
            page.locator('#bw09Calendar').wait_for(state='visible',timeout=5000)
            assert page.locator('#bw09Body').count()==1
            # Access through More inside the reward area.
            page.locator('.bottom-nav [data-reward="more"]').click()
            page.locator('#view button[data-reward="belohnungskalender"]').click()
            page.locator('#bw09Calendar').wait_for(state='visible',timeout=5000)
            assert not errors, errors
            # Integrated layout may be wider than isolated calendar; test only for obvious overflow.
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'),f'{width}px overflow'
            print(f'PASS {width}px real app module graph: main shortcut, direct deep link and More shortcut')
            context.close()
        browser.close()

if __name__ == '__main__': main()
