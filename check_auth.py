with open('apps/api/src/auth.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'export async function createRefreshToken(' in line:
            print("".join(lines[max(0, i-2):min(len(lines), i+15)]))
            break
