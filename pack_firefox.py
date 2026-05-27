import zipfile, os
src = r'e:\软件源码\NexTab\Page'
out = r'e:\软件源码\NexTab\NexTab-Firefox.zip'
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src):
        for f in files:
            full = os.path.join(root, f)
            arcname = os.path.relpath(full, src).replace(os.sep, '/')
            zf.write(full, arcname)
print('Done!')
