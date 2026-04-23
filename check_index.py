with open('apps/api/src/index.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'bodyLimit' in line:
            print("".join(lines[max(0, i-2):min(len(lines), i+3)]))
