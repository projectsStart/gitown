# gitown – Pixel commit village

gitown turns your GitHub repository activity into a tiny pixel village.  
Each **commit** becomes a **house** in the town, and contributors can explore what everyone has shipped just by looking at the map.

## How contributions appear in the town

- **Each commit = one house**
  - The app calls the GitHub API for `projectsStart/gitown` and reads the most recent commits.
  - For every commit, a free grass tile is turned into a house sprite.
  - When the grid is full, new commits simply do not get a new house (you can change the grid size in `App.tsx` if you want more).

- **Author and message**
  - Under each house you will see the **author name** in tiny pixel text.
  - If you click on a house with a commit attached, a panel opens showing:
    - The commit author.
    - The full commit message.
    - A link to open that commit on GitHub.

- **Recent commits panel**
  - On the right side there is a “Recent commits” list.
  - Each entry shows `author · message` and links directly to the commit on GitHub.

## How to contribute

1. **Fork or clone the repo**
   - Fork `projectsStart/gitown` to your own account, or clone it locally:
   - `git clone https://github.com/projectsStart/gitown.git`

2. **Create a branch**
   - Use a descriptive branch name for your change:
   - `git checkout -b feat/add-new-building`

3. **Make a meaningful change**
   - Add features, tweak visuals, improve copy, or fix bugs.
   - Follow conventional-style commit messages if possible, for example:
     - `feat: add river tiles`
     - `fix: center hero video on mobile`
     - `chore: clean up town grid types`

4. **Commit your work**
   - Stage and commit your changes:
   - `git add .`
   - `git commit -m "feat: describe your change here"`

5. **Push and open a pull request**
   - `git push origin your-branch-name`
   - Open a PR against `projectsStart/gitown` with a short explanation of what you built.

Once the PR is merged (or commits land on the default branch), your commits will be picked up by the app and **new houses will appear** in the village.

## Running the project locally

- **Install dependencies**
  - `npm install`

- **Start the dev server**
  - `npm run dev`
  - Open the URL printed in the terminal (usually `http://localhost:5173`).

- **Build for production**
  - `npm run build`

## Customising the mapping from commits to town

- **Grid size and layout**
  - The size of the town grid and the initial layout of paths and starter houses live in `App.tsx`.
  - You can adjust `GRID_SIZE` and the `STARTER_HOUSES` array to shape the town.

- **GitHub repository target**
  - By default the app points to `projectsStart/gitown`.
  - If you want to visualise another repo, change `GITHUB_OWNER` and `GITHUB_REPO` in `App.tsx`.

- **Art assets**
  - The grass and house sprites are in `public/aseets/ground.jpg` and `public/aseets/house.png`.
  - Replacing these files with your own pixel art is the quickest way to reskin the town.

