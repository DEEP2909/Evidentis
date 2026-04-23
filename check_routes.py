with open('apps/api/src/routes.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'await data.toBuffer()' in line:
            print("".join(lines[max(0, i-5):min(len(lines), i+10)]))
            break
