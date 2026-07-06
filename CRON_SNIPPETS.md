Scheduled Worker / Cron Snippets

Supabase CLI (recommended)

1. Add a `cron` schedule using Supabase's platform (if supported) or run the worker via a lightweight scheduler that calls the worker HTTP endpoint.

Example: GitHub Actions scheduled job that triggers the worker endpoint every 5 minutes:

```yaml
# .github/workflows/cron-bulk-worker.yml
name: Run Bulk Worker
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  trigger-worker:
    runs-on: ubuntu-latest
    steps:
      - name: Call worker
        run: |
          curl -X POST "${{ secrets.WORKER_URL }}" \
            -H "Authorization: Bearer ${{ secrets.WORKER_TRIGGER_TOKEN }}" \
            -H "Content-Type: application/json" -d '{}'
```

Supabase Platform Scheduled Functions

If you're using Supabase's scheduled functions (managed by Supabase), set up a new schedule in the Supabase dashboard or using `supabase` CLI (if supported) and point it to the deployed function URL `supabase-functions-bulk-worker`.

Example (manual via `curl` as a cronjob on a VM):

```bash
# Run every 5 minutes via crontab
*/5 * * * * curl -X POST 'https://your-project.functions.supabase.co/bulk-worker' -H "Authorization: Bearer <YOUR_INTERNAL_TRIGGER_SECRET>"
```

Notes

- Prefer invoking the worker using a short-lived or static internal trigger token stored in secrets (e.g., `WORKER_TRIGGER_TOKEN`).
- Don't expose `SUPABASE_SERVICE_ROLE_KEY` to public clients; keep it only in function envs.
- For high reliability, use provider-native scheduled functions if available.
