# Laravel Command Run

**Run any Laravel Artisan command directly from the file explorer or editor — no terminal typing required.**

Right-click a PHP file, select **Run Laravel Command**, answer a few prompts, and the command runs instantly in the integrated terminal. Supports multi-tenancy, remembers your last inputs, and opens the log file automatically.

---

## Features

- **Right-click on file tabs** — run a command from any open PHP file tab
- **Right-click in Explorer** — trigger directly from the file tree
- **Auto-detects Laravel commands** — reads `$signature` from the PHP class and builds the command for you
- **Parses arguments & options** — prompts you for each argument/option defined in the signature
- **Multi-tenancy support** — optionally runs via `php artisan tenants:run` with a tenant ID
- **Remembers your last inputs** — pre-fills every prompt with values from the previous run
- **Global config** — set tenant ID, tenancy, and log preferences once; never asked again
- **Clear log before run** — optionally wipes `storage/logs/laravel.log` before executing
- **Opens log automatically** — `laravel.log` opens beside your editor after the command runs, scrolled to the bottom

---

## Prerequisites

- **PHP** installed and accessible via `php` in the terminal
- A **Laravel project** with an `artisan` file at the project root
- For multi-tenancy: [stancl/tenancy v3](https://tenancyforlaravel.com/docs/v3/console-commands)

---

## How It Works

### 1. Right-click any PHP Command file

Right-click in the **Explorer panel** or on a **file tab** and select **Run Laravel Command**.

The extension checks whether the PHP class:
- Extends `Illuminate\Console\Command`
- Has a `$signature` or `$name` property

If it is not a Laravel command, a message is shown: `Laravel command not found`.

---

### 2. Answer the prompts

The extension reads your `$signature` and asks for each value:

```php
protected $signature = 'reports:send {from-date} {to-date} {where?} {--queue} {--subject=}';
```

| Prompt | Type | Behaviour |
|---|---|---|
| Use Multi-Tenancy? | Yes / No | Skip with global setting |
| Tenant ID | Text input | Skip with global setting |
| `from-date` | Required argument | Must fill |
| `to-date` | Required argument | Must fill |
| `where` | Optional argument | Press Enter to skip |
| `--queue` | Boolean flag | Yes / No |
| `--subject` | Required option | Must fill |
| Clear log before run? | Yes / No | Skip with global setting |

All inputs are **pre-filled with your last used values** — just press Enter to reuse them.

---

### 3. Command is built and executed

**Without tenancy:**
```
php artisan reports:send 2024-01-01 2024-12-31 --subject="Monthly Report"
```

**With tenancy:**
```
php artisan tenants:run reports:send --tenants=8075a580-... --argument="from-date=2024-01-01" --option="subject=Monthly Report"
```

The command runs in the **Laravel Artisan** terminal panel. The `laravel.log` file opens automatically beside your editor.

---

## Global Configuration

Set these once in your VS Code settings (`Ctrl+,` → search **Laravel Command Run**) to skip prompts entirely:

| Setting | Options | Default | Description |
|---|---|---|---|
| `laravelCommandRun.useTenancy` | `ask` / `yes` / `no` | `ask` | Skip tenancy prompt |
| `laravelCommandRun.tenantId` | any string | `""` | Fixed tenant ID — skips the prompt |
| `laravelCommandRun.clearLog` | `ask` / `yes` / `no` | `ask` | Skip clear-log prompt |

**Example `settings.json`:**
```json
"laravelCommandRun.useTenancy": "yes",
"laravelCommandRun.tenantId": "8075a580-1cb8-11e9-8822-49c5d8f8ff23",
"laravelCommandRun.clearLog": "yes"
```

With this config, running any command skips straight to the argument prompts.

---

## Signature Syntax Reference

| Syntax | Meaning |
|---|---|
| `{name}` | Required argument |
| `{name?}` | Optional argument |
| `{name=default}` | Optional argument with default |
| `{name*}` | Array argument |
| `{--flag}` | Boolean flag (Yes/No) |
| `{--key=}` | Required option value |
| `{--key=default}` | Optional option with default |
| `{--K\|key=value}` | Option with shortcut |

Argument names with hyphens (e.g. `{from-date}`) are fully supported.

---

## Troubleshooting

**"Laravel command not found"**
- Ensure the PHP class `extends Illuminate\Console\Command` (or an alias)
- Ensure it has a `protected $signature` or `protected $name` property

**Command runs in wrong directory**
- The extension walks up the directory tree from the PHP file looking for an `artisan` file
- Ensure your Laravel project has `artisan` at the root

**Log file not opening**
- The log file opens only if `storage/logs/laravel.log` exists in the detected project root
- Run the command once to let Laravel create the file

---

## Changelog

### 0.0.1
- Initial release
- Auto-detect Laravel command classes from PHP files
- Parse `$signature` arguments and options (including hyphenated names and `?` optional syntax)
- Multi-tenancy support via `tenants:run`
- Remember last inputs per command
- Global settings to skip prompts
- Clear log before run
- Auto-open `laravel.log` after command execution

---

## Links

- [GitHub Repository](https://github.com/shyamgarud-mobile/laravel-command-run)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ShyamkumarAshokGarud.laravel-command-run)
- [Report an Issue](https://github.com/shyamgarud-mobile/laravel-command-run/issues)
