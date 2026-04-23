import re

file_path = 'apps/web/app/dashboard/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The mess is between line 290 and 500 roughly.
# Let's just find the first occurrence of the duplicate code and remove it.

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We have two 'const teamActivity =' and two 'return ( \n <AppShell'
# We want to keep everything before the first 'const teamActivity ='
# and everything after the second 'return ( \n <AppShell' (but with only one copy).

# Actually, the previous tool merged them in a weird way.
# Let's just restore the file to a sane state and re-apply the fix.

# I'll look for the part where it repeats.
# '                  <span className=\"shrink-0 text-xs text-white/35\">{item.time}</span>\n                </motion.div>\n              ))}\n\n  const teamActivity = ['

# Find the index of the first 'const teamActivity ='
first_team_idx = content.find('const teamActivity = [')
# Find the index of the second 'const teamActivity ='
second_team_idx = content.find('const teamActivity = [', first_team_idx + 1)

if second_team_idx != -1:
    # Keep up to the first one, skip to the second one.
    new_content = content[:first_team_idx] + content[second_team_idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully removed duplicate block.")
else:
    print("No duplicate block found.")
