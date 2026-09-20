# fun

Personal grab-bag repo — random projects, notes and experiments, kept here so I can
pull them down on any machine or server.

```bash
git clone https://github.com/rche3/fun.git
```

## Contents

| Path | What it is | Status |
| --- | --- | --- |
| [`nfc-loyalty/`](nfc-loyalty/) | NFC / Apple Wallet loyalty-card server (Node + SQLite) | Archived |
| [`nfc-loyalty-wallet-plan.md`](nfc-loyalty-wallet-plan.md) | Design notes for the above | Archived |
| [`shanghai/`](shanghai/) | Shanghai recommendations | Notes |

## Conventions

- One top-level directory per project; notes can live as loose `.md` files.
- Secrets never get committed — `.env`, certs, keys and `*.db` files are gitignored
  at the root. Each project ships a `.env.example` instead.
- Dependency directories (`node_modules/`, `venv/`) are gitignored; run the
  project's own install step after cloning.
