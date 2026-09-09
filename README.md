# Johnny Chan — Engineering Portfolio

Personal website for Johnny Chan (Zhe Chen), a Computer Science PhD researcher at Universiti Malaya with interests in robotics solutions, UAV autonomy, and AI-assisted engineering.

**Website:** [jc8426.github.io](https://jc8426.github.io/)

**RCAP case study:** [Humanoid Robot Soccer — Beijing 2026](https://jc8426.github.io/rcap-2026.html)

## What is here

- Bilingual English / Chinese portfolio with light and dark themes.
- Project in Loop: eight linked case studies, a horizontal project browser, and a searchable bilingual index.
- Interactive five-UAV Hero with cinematic Follow-to-Swarm opening and glacier/lunar themes.
- UAV simulation, robotics coordination, and selected software projects.
- Software and data case study: an anonymized Python/SQLite workflow prototype and retrospective log analysis.
- RCAP Beijing 2026 field experience: GameController interface analysis, goalkeeper behavior review, and exploratory research.
- Downloadable English and Chinese robotics solutions resumes.

## Run locally

The published website is static HTML, CSS, and JavaScript. No Node dependencies or compilation are required.

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open [localhost:8080](http://localhost:8080). Run this command from the repository root. The server is for local preview only.

## Repository structure

```text
index.html              Main portfolio, including styles and interactions
rcap-2026.html           Bilingual RCAP case study
software-data.html       Software implementation and data-analysis case study
assets/                 Images, videos, icons, and public resume PDFs
assets/rcap-2026/        Selected competition photos
scripts/check-site.py   Static-page and asset validation
```

## Editing and verification

1. Edit the relevant static HTML page; shared project metadata lives in `assets/project-data.js`.
2. Keep both language variants up to date (`data-lang-en` / `data-lang-zh` on the homepage; `data-en` / `data-zh` on the case study).
3. Store public assets under `assets/` and use relative links.
4. Run `python3 scripts/check-site.py` and `node --test tests/*.test.mjs`.
5. Preview desktop and mobile layouts; check language switching, navigation, and PDF links.
6. Review `git diff` and stage the intended public files before committing.

GitHub Pages serves the root of the `main` branch. A push to `main` updates the published site through GitHub Pages. There is no application backend or required secret configuration.

Some local workspaces may contain experimental framework previews, generated documents, or raw assets. Those are not required for the GitHub Pages website and are not part of the published source workflow.

## Reproduce the data figures

`assets/data-analysis/log-summary.json` contains anonymous run IDs, aggregate counts and elapsed-state observations. The original team logs are not distributed. Install Matplotlib in an isolated Python environment and run `python3 scripts/plot_log_analysis.py` to rebuild the two PNG/SVG figures and CSV. This summary supports record counts and internal-state timelines, not packet-loss or latency estimates. The analysis was prepared on 8 September 2026 from archived August logs.

## Content and attribution

Project pages distinguish personal contributions, team context, analysis, prototypes, and validated results. Research directions are not listed as publications before they are published. The RCAP page summarizes engineering analysis; it does not claim match deployment or measured performance gains.

Team robot source code, internal logs, private correspondence, and unpublished manuscript files are not distributed by this website. Competition photos provide context and do not imply endorsement by the organizations pictured. No license to reuse personal photos or third-party marks is granted by this repository.

## Experimental revision notes

See [revision 7](docs/site-revision7.md) for design and validation, and the [copy review](docs/copy-review-revision7.md) for editorial decisions.
