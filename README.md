
# 🧠 LifeOS Core

> The open-source, self-hosted implementation of the LifeOS Protocol.

**LifeOS Core** is your personal life-data operating system — a local-first, extensible app that stores, links, and visualizes your life's moments using the [LifeOS Protocol](https://github.com/Angelguirao/lifeOS-protocol).

---

## 🚀 Features

- ✅ Implements the LifeOS Protocol
- 🔐 100% local storage (JSON, SQLite, or file-based)
- 🔌 Manual plugin system (CRON, CLI, scripts)
- 📂 Supports import/export of life events

- 🗃️ Visual timeline and event viewer
- 🛠️ Plugin SDK for developers (JS & Python)
- 🔍 Basic semantic search (tags, time, type)
- 🧠 Developer Mode (inspect events, test schemas)

---

## 📦 Use Cases

- Track your life offline and securely
- Build your own plugins (Spotify, calendar, mood tracker)
- Link events using `life://` URIs in your notes
- Run AI tools or GPTs on top of your life graph
- Integrate with Obsidian, Notion, or other journaling tools via plugins

---

## 📂 Folder Structure

```
lifeos-core/
├── public/            # Static assets (if any)
├── src/
│   ├── server/        # API and event processing
│   ├── ui/            # Timeline viewer and event management
│   ├── plugins/       # Manual plugins (CLI or daemon)
│   ├── lib/           # LifeEvent helpers, URI resolver
├── schema/            # JSON schemas and protocol adapters
├── .env               # Config (paths, ports, plugin dirs)
```

---

## 🧪 Developer Quick Start

```bash
git clone https://github.com/yourname/lifeos-core.git
cd lifeos-core
npm install
npm run dev
```

Your self-hosted LifeOS will be available at `http://localhost:3456`

---

## 🔌 Plugin System (Manual)

Use the open Plugin SDK to build and run your own plugins manually:

```bash
node plugins/spotify-plugin/index.js --token $SPOTIFY_TOKEN
```

Or set up scheduled runs with:

```bash
crontab -e
# Run plugin every hour
0 * * * * node /path/to/lifeos-core/plugins/calendar-sync.js
```

---

## 🔐 Privacy & Philosophy

LifeOS Core is **local-first**, **open-source**, and **fully transparent**.

- Your data stays on your machine
- You own your life graph
- All plugins and processing run in your environment

We believe in empowering developers, tinkerers, and privacy-conscious users to build a life stack on their own terms.

---

## 📚 Learn More

- 📄 [LifeOS Protocol](https://github.com/Angelguirao/lifeOS-protocol)
- 🔌 Plugin SDK Docs (coming soon)
- 🧠 Developer Notes + Design Decisions

---

## 💡 Want More?

- For auto-sync, premium dashboards, and GPT assistant → check out [LifeOS Premium](https://lifeos.dev) (coming soon)

---

## ⚖️ License

Apache 2.0 — freedom to build, fork, and run your life.
