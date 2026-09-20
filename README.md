# fun

Personal grab-bag repo — random projects, notes and experiments, kept here so I can
pull them down on any machine or server.

```bash
git clone https://github.com/rche3/fun.git
```

## Contents

| Path | What it is | Status |
| --- | --- | --- |
| [`archive/nfc-loyalty/`](archive/nfc-loyalty/) | NFC / Apple Wallet loyalty-card server (Node + SQLite) | Archived |
| [`archive/nfc-loyalty-wallet-plan.md`](archive/nfc-loyalty-wallet-plan.md) | Design notes for the above | Archived |
| [`shanghai/`](shanghai/) | Shanghai recommendations | Notes |

## Conventions

- One top-level directory per project; notes can live as loose `.md` files.
- Projects that are done or parked move under `archive/` and get an `ARCHIVED.md`.
- Secrets never get committed — `.env`, certs, keys and `*.db` files are gitignored
  at the root. Each project ships a `.env.example` instead.
- Dependency directories (`node_modules/`, `venv/`) are gitignored; run the
  project's own install step after cloning.
