# StudyOS 0.0.22

Open `StudyOS_0.0.22.html` in a desktop browser. Scripts, styles, icons and the existing logo are embedded; the application needs no installation or runtime packages.

The verified original is retained as `StudyOS_0.0.21.html` and in checkpoint commit `c2d9cad`. No data storage keys or schemas were changed. Export a backup from the old version before changing browser, file location or device; browser storage may be separated by origin or local-file URL.

## Development

The original embedded blocks were recovered into `source/` and reproduced byte for byte before editing. Build the new standalone file with:

```sh
python3 scripts/build.py
```

The current header and More disclosure are implemented in `source/navigation.js`; the final layout, guide, Review and Planner integration are in `source/ui-v4.js`. Task rows, shared goals and study activity are in `source/today.js`; state labels are in `source/ui-text.js`. Their styles live in `product.css`, `today.css` and `icons.css`. Historical code for unaffected features is retained.

`scripts/extract.py` and `scripts/clean_components.py` document one-time baseline recovery/cleanup; do not rerun them over edited sources.

For internal testing, serve this directory on port 8880 with Python's HTTP server. The tests use Playwright and `/usr/bin/chromium`, which are provided in the validated cloud environment. They create independent browser contexts and never read a user's browser profile.

```sh
python3 -m http.server 8880 --bind 127.0.0.1
```

In another terminal:

```sh
node tests/round1.cjs
node tests/round2.cjs
node tests/round3.cjs
node tests/round4.cjs
node tests/round5.cjs
node tests/workflow.cjs
node tests/layout.cjs
node tests/preservation.cjs
node tests/schedule.cjs
node tests/interactions.cjs
```

See `VERIFICATION.md` for actual results and limits. Screenshots use isolated fixtures and do not seed the delivered application.
