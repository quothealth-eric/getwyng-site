# Wyng Terminal - Building in Public

Your "building in public" site at [getwyng.co](https://getwyng.co)

## Quick Start

### Deploy to Vercel

1. Push this folder to a GitHub repo (or use your existing one)
2. Connect the repo to Vercel
3. Point `getwyng.co` domain to Vercel
4. Done! Auto-deploys on every push.

### Local Development

```bash
# Just open index.html in a browser
# Or use a local server:
npx serve .
# or
python -m http.server 8000
```

---

## 📁 File Structure

```
getwyng-site/
├── index.html          # Main terminal UI (rarely edit)
├── styles.css          # Styling (rarely edit)
├── app.js              # JavaScript (rarely edit)
├── content/
│   ├── metrics.md      # ← Update monthly
│   ├── milestones.md   # ← Update when big things happen
│   ├── roadmap.md      # ← Update quarterly
│   ├── learnings.md    # ← Add lessons as you learn them
│   ├── updates.json    # ← Manifest of all updates (add entries here)
│   └── updates/
│       ├── 2024-12-11-third-loi.md
│       ├── 2024-11-15-ios-progress.md
│       └── ...         # ← Add new update files here
└── README.md           # This file
```

---

## ✍️ How to Update (The Easy Part)

### Adding a New Update (Bi-weekly)

1. **Create a new markdown file** in `content/updates/`:
   ```bash
   touch content/updates/2025-01-15-your-title.md
   ```

2. **Write your update** using this template:
   ```markdown
   # Your Title Here
   > January 15, 2025

   ---

   ## 🎉 What Happened
   [What you accomplished]

   ## 💡 What I Learned
   [Key insights]

   ## 🚧 What's Blocking Me
   [Current challenges]

   ## 📋 Next 2 Weeks
   - [ ] Task 1
   - [ ] Task 2

   ## 🤔 Honest Reflection
   [Real talk]
   ```

3. **Add entry to `content/updates.json`**:
   ```json
   {
       "date": "2025-01-15",
       "title": "Your Title Here",
       "file": "2025-01-15-your-title.md"
   }
   ```

4. **Push to deploy**:
   ```bash
   git add .
   git commit -m "Update: Your Title Here"
   git push
   ```

### Updating Metrics (Monthly)

Edit `content/metrics.md` and update the numbers. Push.

### Adding a Milestone

Edit `content/milestones.md` and add a new entry. Push.

### Adding a Learning

Edit `content/learnings.md` and add a new section. Push.

---

## 🗓️ Maintenance Schedule

| Frequency | What to Update |
|-----------|----------------|
| **Weekly** | Milestones (if something big happens) |
| **Bi-weekly** | New update in `updates/` |
| **Monthly** | `metrics.md` |
| **Quarterly** | `roadmap.md`, review `learnings.md` |

**Time commitment:** ~30-60 minutes every two weeks

---

## 🎨 Customization

### Update the Pitch Deck Link

In `index.html`, find the download box and update the link:
```html
<a href="https://docsend.com/view/your-deck-link" target="_blank">
```

### Update Contact Links

In `index.html`, find the contact section and update:
- Email
- LinkedIn URL
- Calendly link

### Change Colors

Edit CSS variables in `styles.css`:
```css
:root {
    --wyng-teal: #3fb9a3;  /* Brand color */
    --accent-green: #3fb950;
    /* etc */
}
```

---

## 🚀 Pro Tips

1. **Write updates in your IDE** - VS Code with markdown preview is great

2. **Keep updates honest** - The value is in authenticity, not polish

3. **Include specifics** - Numbers, names (when appropriate), dates

4. **Share blockers** - Investors appreciate transparency about challenges

5. **End with reflection** - What did you actually learn?

---

## 📝 Template: Quick Update

```markdown
# [Month] Update: [One-liner]
> [Date]

---

## TL;DR
[2-3 sentences max]

## Progress
- ✅ Done thing 1
- ✅ Done thing 2
- 🔄 In progress thing

## Metrics
| Metric | Last Month | This Month |
|--------|------------|------------|
| LOIs | 2 | 3 |
| etc | | |

## Challenges
[What's hard right now]

## Next Month
[Top 3 priorities]

---
```

---

## ❓ FAQ

**Q: What if I forget to update for a while?**
A: Just pick back up. Add a "Catching Up" update explaining what happened.

**Q: Should I share bad news?**
A: Yes. Building in public means the real journey, not highlight reels.

**Q: Can I edit old updates?**
A: Ideally no—it's a log, not a wiki. Add corrections as new updates.

---

## 🔗 Links

- Main site: [mywyng.co](https://mywyng.co)
- This site: [getwyng.co](https://getwyng.co)
- Contact: eric@quothealth.com

---

*Built with ☕ and determination.*
