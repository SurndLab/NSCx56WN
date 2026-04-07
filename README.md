# NSCx56WN

> National Skills Competition 56th Website Design - Node.js Backend Module

## Module C Project

This folder now contains a runnable Node.js project for the content-driven exhibition website described in `docs/plan.md`.

### Stack

- Node.js 18+
- Express 4
- Cheerio for HTML parsing and image path rewriting

### Run locally

```bash
npm install
npm run dev
```

The server starts on `http://127.0.0.1:3000/56_module_c/` by default.

### Configuration

- `PORT`: server port, default `3000`
- `DEFAULT_MODULE_NAME`: local redirect target for `/`, default `56_module_c`

The app accepts any route prefix matching `*_module_c`, so the evaluation path can still be served even if the workstation number changes.

### Content source

Put competition content files inside either:

- `contentpages/`
- `content-pages/`

The application will use the first existing folder. Images are served from the nested `images/` directory.
