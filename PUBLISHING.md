# Publishing the site and the forum images

The `docs/` folder is a small website, published for free by GitHub Pages at
**https://pdxlife.github.io/warlight-muli-script/**. Its main job is to host the images for forum
posts about the script: war.app's forum doesn't store images, it only shows images that live
somewhere else.

**The rule that came out of testing:** images in a forum post are **PNG** (or JPG), and motion is an
**animated PNG (APNG)**. war.app's phone app shows no GIFs at all, animated or still, whichever tool
made them. An APNG moves in browsers, and the app shows its first frame as a still, so each APNG's
first frame has to make sense on its own. The script is for desktop browsers anyway.

## Part 1: Turn on GitHub Pages (once)

`docs/` must already be on `main` (it is once the `docs/site` branch is merged).

1. Open https://github.com/pdxLife/warlight-muli-script and click **Settings** (top right of the repo, not your account settings).
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment**:
   - **Source:** choose **Deploy from a branch**.
   - **Branch:** choose **main**, and next to it the folder **/docs**. Click **Save**.
4. Wait a minute or two, then reload the Pages settings page. At the top it says **"Your site is live at https://pdxlife.github.io/warlight-muli-script/"**, with a **Visit site** button.

The same in one command, if you prefer the terminal:

```bash
gh api -X POST repos/pdxLife/warlight-muli-script/pages -f "source[branch]=main" -f "source[path]=/docs"
```

## Part 2: Check the site

Open these in your browser. Each should load:

| Address | What you should see |
|---|---|
| https://pdxlife.github.io/warlight-muli-script/ | The home page, with the green **Install** button |
| https://pdxlife.github.io/warlight-muli-script/media/test/test.png | The Community ladders & leagues panel |
| https://pdxlife.github.io/warlight-muli-script/media/test/test.gif | A grey card where a blue box, then a gold box, appear, on a loop |

If one shows GitHub's 404 page, wait a few minutes (the first publish can take up to 10) and reload.

## Part 3: Test the images on war.app's forum (browser)

This checks that war.app shows images from the site. Nothing gets posted.

1. Open any forum thread on war.app, for example the [script's thread](https://war.app/Forum/106092).
2. Paste this into the reply box:

   ```
   PNG test:
   [img]https://pdxlife.github.io/warlight-muli-script/media/test/test.png[/img]
   GIF test:
   [img]https://pdxlife.github.io/warlight-muli-script/media/test/test.gif[/img]
   ```

3. Click **Preview**, not Submit. Both images should appear, and the GIF should animate.
4. Clear the reply box.

## Part 4: Test in war.app's phone app

The app draws posts itself, so it needs a real post to look at. Any of these works:

- **Your clan forum:** post the same text there, open it in the app, then delete the post.
- **A mail to a clan mate or friend** who agreed to it: send the text, and both of you check it in the app.
- **Wait for the real forum post:** post it, open it in the app, and edit the post if an image doesn't show.

What to check: the PNG shows, the GIF shows, and whether the GIF moves. A GIF that shows only its first frame is acceptable, but then each GIF's first frame should make sense on its own.

**Tell me what you saw**, and I'll make the real images to match.

### Which GIFs the app shows

The first test GIF (`test.gif`) was written by a small hand-made encoder, and the app didn't show it, though browsers did. These four tell apart "the app shows no GIFs" from "the app doesn't show that one":

```
A, animated GIF from gifski:
[img]https://pdxlife.github.io/warlight-muli-script/media/test/test-gifski.gif[/img]
B, animated GIF from ffmpeg:
[img]https://pdxlife.github.io/warlight-muli-script/media/test/test-ffmpeg.gif[/img]
C, GIF with a single frame:
[img]https://pdxlife.github.io/warlight-muli-script/media/test/test-still.gif[/img]
D, JPG:
[img]https://pdxlife.github.io/warlight-muli-script/media/test/test.jpg[/img]
```

A and B show the Ladders panel, where a blue box and then a gold box appear. C and D show it without the boxes.

**Result (October 2026): only D, the JPG, showed.** The app shows no GIFs, so posts use PNG, JPG and APNG.

| Result in the app | What it means |
|---|---|
| A or B show and move | The app plays GIFs; the real GIFs will be made with that tool. |
| A or B show only the panel, without the boxes appearing | The app shows a GIF's first frame only; each GIF's first frame must make sense alone. |
| Only C shows | The app shows still GIFs only; animations go to PNG step strips in the post, with the GIFs on the site. |
| None of A–C show | The app shows no GIFs; the post uses PNG (and JPG if D shows), with the GIFs linked on the site. |

### Animated PNG (APNG)

An APNG is a PNG file with extra frames inside. Browsers play it; image viewers that don't know
APNG show its first frame as a plain PNG. If war.app's app does the latter, posts can use APNGs:
moving in browsers, a still in the app.

```
E, animated PNG:
[img]https://pdxlife.github.io/warlight-muli-script/media/test/test-apng.png[/img]
```

It's the Ladders panel where a blue box, then a gold box, appear (1.2 seconds per step), then it
starts over.

**Result (October 2026): it moves in the browser preview, and the app shows it as a still.** So
APNG is the format for motion in posts.

Check two things:

| Where | Expected |
|---|---|
| Forum **Preview** in the browser | It moves. |
| war.app's phone app (a real post) | It shows, at least as the panel without the boxes. |

## The guide

`docs/guide.html` is the site's how-to page: one section per area, saying where each feature is, how to use it and which setting controls it, with the images from `docs/media/`. When a feature is added, changed or removed, update its section there too; setting names are written as they appear in the settings menu.

## The forum thread

The script's thread is https://war.app/Forum/897130-mulis-userscript-update, and the text of its posts is kept in `forum/`:

| Post | File |
|---|---|
| First post: install and features up to Idle | `forum/first-post.txt` |
| Second post (reply 1, kept as a spare): forum, mail and more, settings, privacy, feedback | `forum/second-post.txt` |
| Update since October 14 (reply 6) | `forum/update-2026-10-19.txt` |

**A forum post has a character limit**, counted on the text with its BBCode tags and image URLs. A post of about 8,900 characters fits; the 10,900-character first post didn't, so it was split at "Forum, mail and more" and the rest went into the spare second post. Keep each post under about 8,500 characters, check the length before posting (`wc -m forum/first-post.txt`), and when a post grows past that, move whole sections to the second post. Each `[img]` line costs about 80 characters.

## Adding images later

1. Put the file in `docs/media/` (not `test/`), with a lowercase name made of words and dashes, e.g. `ladders-panel.png` or `open-games-filter.png` (an APNG keeps the `.png` ending).

   To make an APNG from same-size PNG frames (8-bit RGB or RGBA, as screenshots are), with no other tools:

   ```bash
   python3 tools/make_apng.py docs/media/open-games-filter.png 1500 frame1.png frame2.png frame3.png
   ```

   The number is how long each frame shows, in milliseconds. The first frame is what war.app's phone app shows.
2. Commit and push to `main`. GitHub publishes it about a minute later.
3. Use it in a post as `[img]https://pdxlife.github.io/warlight-muli-script/media/ladders-panel.png[/img]`.

Size: about 700px wide, so images fit the forum column and stay readable in the app. Keep each image under about 1 MB, and each APNG under about 3 MB.

**Never rename or delete a file that a post uses.** The post would show a broken image from then on. To change an image in a post, either replace the file under the same name, which changes it in every post that uses it, or add a new file and edit the post.

## How it works

**GitHub Pages.** Pages is free static hosting for public repositories. With the source set to `main` and `/docs`, every push to `main` starts a small job on GitHub ("pages build and deployment", listed under the repo's **Actions** tab). It copies the files in `docs/` to GitHub's web servers, unchanged. The empty `docs/.nojekyll` file tells GitHub not to run its Jekyll site builder over them, so they're served exactly as committed. The address is always `https://<owner>.github.io/<repo>/` followed by the file's path inside `docs/`. GitHub's servers let browsers keep a file for up to 10 minutes, so a replaced image can take that long to show its new version. A new file name shows right away.

**Images in forum posts.** war.app stores only the text of a post. A `[img]…[/img]` tag in that text becomes an image element pointing at the address. Each reader's browser, or the app, fetches the image straight from GitHub at the moment they open the thread. war.app never copies it. That's why an image keeps working only as long as it stays at its address.

**Why Muli's images broke.** His thread is from 2015. Its images were on imgur and postimg, and most no longer load: those sites deleted old uploads, and some links start with `http://`, which browsers now refuse to load inside an `https://` page. Files in this repo stay as long as the repo does, and Pages serves them over `https`.

**Formats.** war.app's forum can't play video in a post, and its phone app shows neither SVG nor GIF images (a single-frame GIF fails too, so it's the format, not the animation). PNG and JPG are what every browser and the app can show. An APNG is a PNG with extra frames: browsers play them, and the app, which doesn't know APNG, shows the first frame like any PNG.

**Limits.** A Pages site can be up to 1 GB, and GitHub asks that it stay under about 100 GB of traffic a month. A 2 MB GIF opened 10,000 times is 20 GB, so a forum post is far from either.

**The Install button.** It links to the raw `.user.js` file in this repo. Tampermonkey recognizes addresses ending in `.user.js` and opens its install screen. It's the same address Tampermonkey checks for updates, and the one the script's "Update to …" link opens.
