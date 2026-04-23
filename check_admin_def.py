import re

file_path = 'apps/web/app/dashboard/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_admin = content.find('function AdminDashboard()')
end_admin = content.find('function SeniorAdvocateDashboard()')

print(f"AdminDashboard starts at {start_admin} and ends at {end_admin}")
