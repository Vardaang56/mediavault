# Adding media to MediaVault (no login)

This is a public library. Visitors can browse and play files, but there are no upload or delete controls on the website.

## Upload a file
1. Open this repository on GitHub: https://github.com/Vardaang56/mediavault
2. Open one of these folders:
   - `media/sounds` — sound effects (MP3, WAV, OGG, etc.)
   - `media/music` — background music (MP3, WAV, OGG, etc.)
   - `media/broll` — B-roll video (MP4, WebM, etc.)
3. Click **Add file → Upload files**.
4. Select your file(s), wait for upload, then click **Commit changes**.
5. Netlify will redeploy automatically if this repository is connected. The files will appear on the website after deployment finishes.

## Remove a file
Open its folder on GitHub, click the file, use the trash/delete option, and commit the change. Netlify will redeploy.

## Rename a file
Rename it on GitHub and commit. The site reads the folders automatically; you do not need to edit a separate list.

## Important
- Anyone can view and download files placed in this public repository.
- There is no website login and no public upload form.
- Keep filenames simple. Use letters, numbers, hyphens or underscores.
- GitHub has file-size limits. For very large videos, use external video hosting/storage instead of committing them to Git.
