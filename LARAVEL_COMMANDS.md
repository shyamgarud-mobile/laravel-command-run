# Laravel Custom Commands

## How to Identify a Custom Command Class

Look for these three things in a PHP class:

1. **Extends `Illuminate\Console\Command`**
2. **Has `$signature` or `$name` property**
3. **Has a `handle()` method**

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SendDailyReport extends Command   // ✅ extends Command
{
    protected $signature = 'report:send'; // ✅ has signature
    protected $description = 'Send the daily report email';

    public function handle(): int        // ✅ has handle()
    {
        // logic here
        return Command::SUCCESS;
    }
}
```

---

## Where Custom Commands Live

| Scenario | Location |
|---|---|
| Default convention | `app/Console/Commands/` |
| Custom location (Laravel 10 and below) | Anywhere — register in `app/Console/Kernel.php` |
| Custom location (Laravel 11+) | Anywhere — add path to `withCommands()` in `bootstrap/app.php` |

### Laravel 10 — Register manually

```php
// app/Console/Kernel.php
protected $commands = [
    \App\Console\Commands\SendDailyReport::class,
];
```

### Laravel 11+ — Auto-discovery with custom path

```php
// bootstrap/app.php
->withCommands([
    __DIR__.'/../app/Services/Billing/Commands',
])
```

---

## Key Parts of a Command Class

| Part | Purpose |
|---|---|
| `$signature` | Command name, arguments, and options |
| `$description` | Shown in `php artisan list` |
| `handle()` | Entry point — put your logic here |
| Return value | `Command::SUCCESS` (0), `Command::FAILURE` (1), `Command::INVALID` (2) |

---

## Signature Syntax

```php
'email:send {body}'            // required argument
'email:send {name=World}'      // optional argument with default
'email:send {--queue}'         // flag/option (true or false)
'email:send {--type=daily}'    // option with value
'email:send {files*}'          // array argument
```

---

## I/O Methods

```php
$this->info('Success');        // green
$this->error('Failed');        // red
$this->warn('Warning');        // yellow
$this->line('Plain output');

$name = $this->ask('What is your name?');
$pass = $this->secret('Password?');
$confirmed = $this->confirm('Are you sure?');

// Progress bar
$bar = $this->output->createProgressBar(100);
$bar->advance();
$bar->finish();
```

---

## Generating a Command

```bash
php artisan make:command SendDailyReport
```

---

## Running Commands Programmatically

```php
// From a controller or job
Artisan::call('report:send', ['--type' => 'monthly']);

// From within another command
$this->call('cache:clear');
```

---

## Scheduling Commands

```php
// routes/console.php (Laravel 11+)
Schedule::command('report:send')->dailyAt('08:00');
```

---

## Multi-Tenancy (stancl/tenancy v3)

### Run a command for a single tenant

```bash
php artisan tenants:run email:send --tenants=8075a580-1cb8-11e9-8822-49c5d8f8ff23
```

### Run for multiple specific tenants

```bash
php artisan tenants:run email:send --tenants=foo --tenants=bar
```

### Run for all tenants

```bash
php artisan tenants:run email:send
```

---

### Passing Arguments and Options to the Inner Command

`tenants:run` uses `--option` and `--argument` to forward values to your command.

```bash
php artisan tenants:run email:send \
  --tenants=8075a580-1cb8-11e9-8822-49c5d8f8ff23 \
  --option="queue=1" \
  --option="subject=New Feature" \
  --argument="body=We have launched a new feature. ..."
```

| Part | Belongs to | Purpose |
|---|---|---|
| `--tenants=` | `tenants:run` | Which tenant to run for |
| `--option="key=value"` | `tenants:run` | Passes `--key=value` as option to your command |
| `--argument="key=value"` | `tenants:run` | Passes `key` as argument to your command |

---

### Your Command Signature for the Above

```php
protected $signature = 'email:send {body} {--queue=} {--subject=}';
```

### Accessing values in `handle()`

```php
public function handle(): int
{
    $body    = $this->argument('body');    // "We have launched a new feature. ..."
    $queue   = $this->option('queue');     // "1"
    $subject = $this->option('subject');  // "New Feature"

    return Command::SUCCESS;
}
```

---

### Make Your Command Tenant-Aware

Add the command to the `commands` array in `config/tenancy.php`:

```php
'commands' => [
    \App\Console\Commands\SendDailyReport::class,
],
```

---

## Where to See the Output

### Ran directly (no queue)

Output appears **directly in the terminal**. The tenancy package wraps it with the tenant ID:

```
Tenant: 8075a580-1cb8-11e9-8822-49c5d8f8ff23
[output from your command]
```

### Ran via queue (`--option="queue=1"`)

The job is dispatched silently. Check:

- `storage/logs/laravel.log`
- Queue worker terminal: `php artisan queue:work`
- Laravel Horizon dashboard (if installed)

### Output methods and where they appear

| Method | Output location |
|---|---|
| `$this->info()` | Terminal (green) |
| `$this->error()` | Terminal (red) |
| `$this->warn()` | Terminal (yellow) |
| `$this->line()` | Terminal (plain) |
| `Log::info()` | `storage/logs/laravel.log` |
