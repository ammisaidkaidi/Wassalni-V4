#!/usr/bin/env python3
"""Apply an ordered list of literal (not regex) string replacements to a file.
Used during Task 15.1/15.2 i18n migration to swap hardcoded French strings
for t('key') calls without dozens of individual edit_file round-trips.

Usage: python3 apply_replacements.py <file> <replacements.json>
replacements.json: [[old, new], [old, new], ...] applied in order, each
exactly once (first occurrence). Raises if an "old" string is not found,
so typos are caught immediately instead of silently no-op'ing.
"""
import sys
import json

def main():
    path, repl_path = sys.argv[1], sys.argv[2]
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    with open(repl_path, 'r', encoding='utf-8') as f:
        replacements = json.load(f)
    for old, new in replacements:
        if old not in content:
            print(f"NOT FOUND: {old!r}", file=sys.stderr)
            sys.exit(1)
        content = content.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"OK: {len(replacements)} replacements applied to {path}")

if __name__ == '__main__':
    main()
