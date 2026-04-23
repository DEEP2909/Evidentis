import re

file_path = 'apps/web/app/dashboard/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

indices = [m.start() for m in re.finditer('const teamActivity =', content)]
print(f"Found {len(indices)} occurrences of 'const teamActivity ='")
for idx in indices:
    print(f"Occurrence at index {idx}")
