# Python Course Content Generation Workflow

Complete workflow for generating, reviewing, and approving Python course content drafts.

## Overview

This pipeline generates draft pages for Python course chapters 3-9 (56 pages total). Every page goes through: outline → generation → review → approval before being publishable. Nothing is published automatically.

## Prerequisites

1. **Database**: Run migration to add approval workflow fields:
   ```bash
   cd backend
   alembic upgrade head
   ```

2. **Environment**: Ensure `.env` has real LLM provider credentials (not mock):
   ```bash
   # backend/.env
   OPENAI_API_KEY=sk-...
   # or
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. **Knowledge Base**: Ensure Python course documents are indexed in the knowledge base for citation support.

## Step 1: Outline

Generate chapter outline before any page generation. This proposes structure for owner review.

```bash
cd backend
python scripts/generate_course.py outline --chapter 3
```

**Output**: `docs/outlines/chapter-3-outline.md`

**Review**: Edit the outline file to adjust:
- Page titles and topics
- Learning goals
- Code example ideas
- Prerequisite links

Repeat for chapters 4-9 as needed.

## Step 2: Dry Run (Estimate Usage)

Before generating, check token estimate and daily limits:

```bash
python scripts/generate_course.py generate --chapter 3 --pages all --dry-run
```

**Output**:
```
Dry run for chapter 3:
  Total pages: 8
  Estimated LLM calls: 24 (outline check, generate, verify per page)
  Estimated tokens: ~24,000 (3K per page conservative estimate)
  Current daily usage: 150,000 / 1,000,000
  Remaining budget: 850,000
  Status: ✓ Within budget
```

Adjust `--pages` range if needed (e.g., `--pages 1-4` for first 4 pages).

## Step 3: Generate

Generate draft pages with full pipeline:

```bash
# Generate all pages in chapter 3
python scripts/generate_course.py generate --chapter 3 --pages all

# Or generate specific range
python scripts/generate_course.py generate --chapter 3 --pages 1-4

# Or specific pages
python scripts/generate_course.py generate --chapter 3 --pages 1,3,5
```

**What happens**:
1. Loads STYLE-GUIDE.md and chapter outline
2. For each page:
   - Grounds on knowledge base (with citations)
   - Generates page with Pydantic schema validation
   - Runs repair loop if schema invalid
   - Executes code blocks in sandbox, compares output
   - Validates cue targets and narration word count
   - Stores as `status=draft` in database
   - Writes review file to `backend/review/chapter-3/page-N.md`
3. Records token usage in `llm_usage` table
4. Respects daily token limit (1M default) and per-run page cap (50 default)

**Resume**: If interrupted, re-run same command. Approved pages are never regenerated (unless `--force` is used, which is not recommended).

**Page cap**: Default 50 pages per run. Override with `--limit N`.

## Step 4: Review Output

Review draft pages in `backend/review/<chapter>/page-<N>.md`:

```bash
# List all review files for chapter 3
ls backend/review/chapter-3/

# Open specific review file
cat backend/review/chapter-3/page-1.md
```

Each review file contains:
- **Narration**: Full Tanglish narration text (120-200 words)
- **Segments**: Explanation, code, diagram segments
- **Code blocks**: With verified sandbox output
- **Diagram structure**: Nodes, edges, steps
- **Cues**: All interactive cues with target validation
- **Analogies**: Movie and cricket variants (highlights if missing)
- **Citations**: Knowledge base sources used
- **Checklist**:
  - [ ] Technically correct (Python facts, syntax, output)
  - [ ] Tanglish natural (Tamil flow, English technical terms)
  - [ ] Proper structure (segments, cues, code, analogies)
  - [ ] On-topic (Python only, chapter scope)

**Review commands** at bottom of each file:
```bash
# Approve
python scripts/generate_course.py approve --chapter 3 --page 1

# Reject with reason
python scripts/generate_course.py reject --chapter 3 --page 1 --reason "Analogies not culturally relevant, need more cricket examples"
```

## Step 5: Approve or Reject

### Approve a Page

```bash
# Via CLI (calls admin API internally)
python scripts/generate_course.py approve --chapter 3 --page 1

# Or via admin API directly
curl -X POST http://localhost:8000/api/admin/pages/python/3/1/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Effect**:
- Sets `status=approved`
- Records `approved_by` (user ID) and `approved_at` (timestamp)
- Clears any previous rejection reason
- Page becomes publishable

### Reject a Page

```bash
# Via CLI with reason (min 10 characters)
python scripts/generate_course.py reject --chapter 3 --page 1 \
  --reason "The cricket analogy doesn't fit the variable concept. Use scorecard example instead."

# Or via admin API
curl -X POST http://localhost:8000/api/admin/pages/python/3/1/reject \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Analogies need improvement for Tamil audience"}'
```

**Effect**:
- Sets `status=rejected`
- Records `rejection_reason`, `rejected_by`, `rejected_at`
- Clears any previous approval
- Reason is fed back to next generation attempt

### Regenerate After Rejection

```bash
# Regenerate single rejected page (includes rejection feedback)
python scripts/generate_course.py generate --chapter 3 --pages 1

# The system automatically:
# 1. Fetches rejection reason from database
# 2. Includes it in LLM prompt for next attempt
# 3. Generates improved version as new draft
```

## Step 6: Check Status

Monitor generation and approval progress:

```bash
python scripts/generate_course.py status --chapter 3
```

**Output**:
```
Chapter 3 Status:
  Draft:     5 pages
  Approved:  2 pages
  Rejected:  1 page
  Total:     8 pages

Progress: 2/8 approved (25%)

Rejected pages (need regeneration):
  - Page 3: "Analogies not culturally relevant, need more cricket examples"
```

Check all chapters:
```bash
python scripts/generate_course.py status
```

## Step 7: Usage Monitoring

Check LLM token usage:

```bash
# View recent usage
curl http://localhost:8000/api/admin/pages/usage?days=7 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check daily ledger in database
sqlite3 backend/bookey_dev.db "SELECT date, provider, SUM(tokens_in + tokens_out) as total FROM llm_usage GROUP BY date, provider ORDER BY date DESC LIMIT 10;"
```

**Daily limit**: 1,000,000 tokens (configurable in `backend/app/config.py` → `llm_daily_token_limit`)

**Per-run page cap**: 50 pages (configurable → `llm_page_generation_cap`)

If limit reached:
```
Error: Daily token budget exhausted (1,000,000 / 1,000,000 used)
Try again tomorrow or increase llm_daily_token_limit in config.
```

## Complete Chapter Example

Full workflow for chapter 3 (8 pages):

```bash
cd backend

# 1. Generate outline
python scripts/generate_course.py outline --chapter 3
# Review and edit docs/outlines/chapter-3-outline.md

# 2. Dry run check
python scripts/generate_course.py generate --chapter 3 --pages all --dry-run
# Verify: ✓ Within budget

# 3. Generate drafts (first batch)
python scripts/generate_course.py generate --chapter 3 --pages 1-4
# Wait for completion (writes review files)

# 4. Review drafts
cat review/chapter-3/page-1.md
cat review/chapter-3/page-2.md
# ... check each page

# 5. Approve good pages
python scripts/generate_course.py approve --chapter 3 --page 1
python scripts/generate_course.py approve --chapter 3 --page 2

# 6. Reject page needing work
python scripts/generate_course.py reject --chapter 3 --page 3 \
  --reason "Code example output doesn't match. Sandbox verification failed."

# 7. Regenerate rejected page
python scripts/generate_course.py generate --chapter 3 --pages 3
# Review again, approve if fixed

# 8. Generate remaining pages
python scripts/generate_course.py generate --chapter 3 --pages 5-8

# 9. Check progress
python scripts/generate_course.py status --chapter 3
# Progress: 8/8 approved (100%)

# 10. Move to next chapter
python scripts/generate_course.py outline --chapter 4
# Repeat workflow...
```

## Configuration

Edit `backend/app/config.py` to adjust:

```python
# Token limits
llm_daily_token_limit: int = 1_000_000  # 1M tokens per day
llm_page_generation_cap: int = 50       # Max pages per CLI run

# Style constraints (validated during generation)
page_min_words: int = 60    # Minimum narration word count
page_max_words: int = 250   # Maximum narration word count
min_cues: int = 4           # Minimum interactive cues per page
max_cues: int = 12          # Maximum interactive cues per page
```

## Rollback (Future)

Version history support added to schema but not yet implemented:
- `previous_version_id` field links to old versions
- Status `archived` marks old versions
- Future sprint: Admin can rollback approved pages to previous versions

Current: Regenerate with `--force` to overwrite approved pages (not recommended without backup).

## Troubleshooting

### Schema Validation Failure

```
Error: Schema validation failed after 3 repair attempts
```

**Solution**: Check repair loop logs in `backend/logs/`. LLM may be generating invalid JSON. Retry with `--pages N` for that page.

### Code Sandbox Verification Failed

```
Error: Code output mismatch. Expected '42' but got '43'
```

**Solution**: Reject the page with reason explaining the mismatch. Next generation attempt will fix the code or expected output.

### Missing Cue Target

```
Error: Cue target 'node-xyz' not found in diagram nodes or segments
```

**Solution**: Validation prevents storing invalid cues. Page will be rejected automatically. Regenerate.

### Missing Analogies

Review file highlights:
```
⚠️ Analogies: Missing movie OR cricket analogy
```

**Solution**: Reject with reason: "Add both movie and cricket analogies per style guide."

### Daily Budget Exceeded

```
Error: Daily token budget exhausted
```

**Solution**: 
- Wait until next day (resets at midnight UTC)
- OR increase `llm_daily_token_limit` in config
- OR process fewer pages per day

### Approved Page Won't Regenerate

```
Error: Page 3 is approved. Use --force to regenerate.
```

**Solution**: By design. Either:
- Accept the approved version
- Reject it first, then regenerate
- Use `--force` flag (caution: overwrites approved content)

## API Endpoints

Direct admin API access (alternative to CLI):

```bash
# List pages (filter by status)
GET /api/admin/pages?course_id=python&chapter=3&status=draft

# Get specific page
GET /api/admin/pages/python/3/1

# Approve page
POST /api/admin/pages/python/3/1/approve

# Reject page
POST /api/admin/pages/python/3/1/reject
Body: {"reason": "Needs improvement..."}

# LLM usage stats
GET /api/admin/pages/usage?days=7
```

## Testing

Run tests before production generation:

```bash
cd backend

# All content generation tests
python -m pytest tests/test_outliner.py -v           # 6/6 passing
python -m pytest tests/test_approval.py -v           # 13/13 passing
python -m pytest tests/test_review_writer.py -v      # 10/10 passing
python -m pytest tests/test_admin_approval_api.py -v # 8/8 passing

# Full suite
python -m pytest -v
# Expected: 406+ passing, <10 failures (known test isolation issues)
```

## References

- **Style Guide**: `docs/STYLE-GUIDE.md` (Tanglish patterns, structure rules)
- **Remaining Chapters**: `docs/REMAINING-CHAPTERS.md` (Chapters 3-9 outlines)
- **Example Outline**: `docs/outlines/chapter-3-example.md`
- **Migration**: `backend/alembic/versions/001_add_approval_workflow.py`
- **Schema**: `backend/app/page_gen/schema.py` (GeneratedPage model)
- **Approval Logic**: `backend/app/page_gen/approval.py`
- **Review Writer**: `backend/app/page_gen/review_writer.py`

## Summary

**Workflow**: outline → dry-run → generate → review → approve/reject → status → next chapter

**Safety**:
- Drafts only, manual approval required
- Token budgets enforced
- Approved pages protected from accidental overwrite
- Rejection feedback loop for iterative improvement

**Owner Control**:
- Edit outlines before generation
- Review every draft manually
- Approve/reject with detailed reasons
- Monitor usage and progress
- Resume interrupted generations safely
