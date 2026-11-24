MAIDAN CAKES — ONE-TIME DEPLOY (developer does this once; owner never touches it)

1. Put index.html, app.js, package.json in one GitHub repo.
2. On a free Node host (Render.com -> New Web Service): Build = (empty), Start = node app.js
3. Add a Persistent Disk (or any volume) and set env DATA_FILE=/data/data.json
   (without a disk, free hosts erase data on restart).
4. Open the host's link. That is the shop. Share that link with customers.

Owner: open the same link -> Owner login -> PIN 1234 -> change PIN -> edit -> "Publish changes".
Everyone sees it in a few seconds. No backend link, no uploading files, ever.