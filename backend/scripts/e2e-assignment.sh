#!/usr/bin/env bash
# End-to-end coverage of the assignment requirements against a running API.
set -euo pipefail

BASE="${BASE:-http://localhost:4000/api}"
STAMP="$(date +%s)"
TODAY="$(date +%F)"
YEST="$(date -v-1d +%F 2>/dev/null || date -d yesterday +%F)"
WORK="$(mktemp -d)"

PASSWORD='supersecret1'
JSON_HEADER='Content-Type: application/json'

pick() {
  node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const value = process.argv[1]
        .split(".")
        .reduce((acc, key) => acc?.[key], JSON.parse(s));
      if (value === undefined) {
        console.log("");
        return;
      }
      console.log(typeof value === "object" ? JSON.stringify(value) : value);
    });
  ' "$1"
}

json_get() {
  local path="$1"
  local auth="${2:-}"
  if [[ -n "$auth" ]]; then
    curl -s "$BASE$path" -H "$auth"
  else
    curl -s "$BASE$path"
  fi
}

json_post() {
  local path="$1"
  local body="$2"
  local auth="${3:-}"
  if [[ -n "$auth" ]]; then
    curl -s -X POST "$BASE$path" -H "$auth" -H "$JSON_HEADER" -d "$body"
  else
    curl -s -X POST "$BASE$path" -H "$JSON_HEADER" -d "$body"
  fi
}

json_patch() {
  local path="$1"
  local body="$2"
  local auth="$3"
  curl -s -X PATCH "$BASE$path" -H "$auth" -H "$JSON_HEADER" -d "$body"
}

http_delete() {
  local path="$1"
  local auth="$2"
  curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE$path" -H "$auth"
}

signup() {
  local email="$1"
  local name="$2"
  json_post "/auth/signup" "{\"email\":\"$email\",\"password\":\"$PASSWORD\",\"displayName\":\"$name\"}"
}

create_entry() {
  local auth="$1"
  local body="$2"
  curl -s -o /dev/null -X POST "$BASE/entries" -H "$auth" -H "$JSON_HEADER" -d "$body"
}

write_diary_pdf() {
  local out="$1"
  node --input-type=module -e '
    import PDFDocument from "pdfkit";
    import fs from "node:fs";

    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const stream = fs.createWriteStream(process.argv[1]);
    doc.pipe(stream);
    doc.fontSize(12).text("Type of meal | Name of meal | Calories | Protein | Carbs | Fat");
    doc.text("Breakfast | Imported khichdi | 380 | 14 | 58 | 8");
    doc.text("Snack | Imported banana | 105 | 1 | 27 | 0");
    doc.end();
    await new Promise((resolve) => stream.on("finish", resolve));
  ' "$out"
}

inspect_pdf() {
  local file="$1"
  node -e '
    const fs = require("fs");
    const bytes = fs.readFileSync(process.argv[1]);
    const text = bytes.toString("latin1");
    console.log(`  ${bytes.length} bytes, header ${text.slice(0, 8)}, eof ${text.trimEnd().endsWith("%%EOF")}`);
  ' "$file"
}

echo "== health =="
json_get "/health"
echo

echo "== multi-user: two independent accounts =="
A="$(signup "a+$STAMP@example.com" "Alice" | tee "$WORK/a.json" | pick token)"
B="$(signup "b+$STAMP@example.com" "Bob" | tee "$WORK/b.json" | pick token)"
AUTH_A="Authorization: Bearer $A"
AUTH_B="Authorization: Bearer $B"
echo -n "  Alice id: "
pick user.id < "$WORK/a.json"
echo -n "  Bob id:   "
pick user.id < "$WORK/b.json"

echo "== goal setting =="
json_post "/goals" \
  "{\"dailyCalories\":2200,\"proteinGrams\":150,\"carbGrams\":230,\"fatGrams\":70,\"targetWeightKg\":68,\"effectiveFrom\":\"$YEST\"}" \
  "$AUTH_A" > "$WORK/goal.json"
echo -n "  saved dailyCalories: "
pick dailyCalories < "$WORK/goal.json"
echo -n "  current for today:   "
json_get "/goals/current?date=$TODAY" "$AUTH_A" | pick goal.dailyCalories
echo -n "  history pageSize:    "
json_get "/goals?page=1&pageSize=5" "$AUTH_A" | pick meta.pageSize

echo "== meal entry (all meal types, macros, micros) =="
for meal in breakfast lunch dinner snack; do
  create_entry "$AUTH_A" \
    "{\"foodName\":\"$meal item\",\"mealType\":\"$meal\",\"quantity\":1,\"unit\":\"serving\",\"calories\":400,\"proteinGrams\":20,\"carbGrams\":40,\"fatGrams\":12,\"consumedOn\":\"$TODAY\",\"micronutrients\":[{\"nutrient\":\"iron\",\"amount\":2}]}"
done
create_entry "$AUTH_A" \
  "{\"foodName\":\"Yesterday oats\",\"mealType\":\"breakfast\",\"quantity\":1,\"unit\":\"bowl\",\"calories\":350,\"consumedOn\":\"$YEST\"}"
echo -n "  Alice today total items: "
json_get "/entries?from=$TODAY&to=$TODAY&pageSize=1" "$AUTH_A" | pick meta.totalItems
ENTRY_ID="$(json_get "/entries?from=$TODAY&to=$TODAY&search=lunch&pageSize=1" "$AUTH_A" | pick data.0.id)"
echo -n "  patch lunch name: "
json_patch "/entries/$ENTRY_ID" '{"foodName":"lunch item updated"}' "$AUTH_A" | pick foodName
echo -n "  delete lunch: "
http_delete "/entries/$ENTRY_ID" "$AUTH_A"
echo
curl -s -o /dev/null -X POST "$BASE/goals" -H "$AUTH_A" -H "$JSON_HEADER" \
  -d "{\"dailyCalories\":2100,\"proteinGrams\":140,\"carbGrams\":220,\"fatGrams\":65,\"effectiveFrom\":\"$TODAY\"}"
GOAL_OLD="$(json_get "/goals?page=1&pageSize=5" "$AUTH_A" | pick data.1.id)"
echo -n "  delete older goal: "
http_delete "/goals/$GOAL_OLD" "$AUTH_A"
echo

echo "== time-range listing + filters + pagination =="
echo -n "  range yesterday-today: "
json_get "/entries?from=$YEST&to=$TODAY&pageSize=2" "$AUTH_A" | pick meta.totalItems
echo -n "  breakfast only:        "
json_get "/entries?from=$YEST&to=$TODAY&mealType=breakfast&pageSize=20" "$AUTH_A" | pick meta.totalItems
echo -n "  page 1 hasNext:        "
json_get "/entries?from=$YEST&to=$TODAY&page=1&pageSize=2" "$AUTH_A" | pick meta.hasNextPage
echo -n "  page 2 items:          "
json_get "/entries?from=$YEST&to=$TODAY&page=2&pageSize=2" "$AUTH_A" | pick data.length

echo "== isolation: Bob cannot see Alice =="
echo -n "  Bob entries: "
json_get "/entries?from=$YEST&to=$TODAY" "$AUTH_B" | pick meta.totalItems
echo -n "  Bob goals:   "
json_get "/goals/current?date=$TODAY" "$AUTH_B" | pick goal
ALICE_ENTRY="$(json_get "/entries?from=$TODAY&to=$TODAY&pageSize=1" "$AUTH_A" | pick data.0.id)"
echo -n "  Bob fetch Alice entry: "
json_get "/entries/$ALICE_ENTRY" "$AUTH_B" | pick error.code

echo "== nutrition reports =="
echo -n "  daily days:     "
json_get "/reports/daily?from=$YEST&to=$TODAY&pageSize=10" "$AUTH_A" | pick meta.totalItems
echo -n "  weekly weeks:   "
json_get "/reports/weekly?from=$YEST&to=$TODAY&pageSize=10" "$AUTH_A" | pick meta.totalItems
echo -n "  macros protein: "
json_get "/reports/macros?from=$YEST&to=$TODAY" "$AUTH_A" | pick grams.proteinGrams
echo -n "  micros count:   "
json_get "/reports/micronutrients?from=$YEST&to=$TODAY" "$AUTH_A" | pick meta.totalItems
echo -n "  vs goal %:      "
json_get "/reports/goal-comparison?from=$YEST&to=$TODAY" "$AUTH_A" | pick adherence.calories

echo "== downloadable PDF report =="
curl -s -o "$WORK/report.pdf" -D "$WORK/report.headers" \
  "$BASE/reports/pdf?from=$YEST&to=$TODAY" -H "$AUTH_A"
inspect_pdf "$WORK/report.pdf"
echo -n "  content-type: "
grep -i content-type "$WORK/report.headers" | tr -d '\r' | head -1

echo "== bulk PDF import (script) =="
write_diary_pdf "$WORK/diary.pdf"
curl -s -F "file=@$WORK/diary.pdf" -F "today=$TODAY" -F "mode=script" \
  "$BASE/imports/parse" -H "$AUTH_B" > "$WORK/preview.json"
echo -n "  parse method: "
pick method < "$WORK/preview.json"
echo -n "  parse rows:   "
pick rows.length < "$WORK/preview.json"
node -e '
  const preview = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  process.stdout.write(JSON.stringify({ today: process.argv[2], rows: preview.rows }));
' "$WORK/preview.json" "$TODAY" > "$WORK/commit.json"
echo -n "  imported:     "
curl -s -X POST "$BASE/imports/commit" -H "$AUTH_B" -H "$JSON_HEADER" \
  --data-binary @"$WORK/commit.json" | pick imported
echo -n "  Bob entries:  "
json_get "/entries?from=$TODAY&to=$TODAY" "$AUTH_B" | pick meta.totalItems

echo "== AI status + extract guards =="
echo -n "  ai available: "
json_get "/ai/status" "$AUTH_A" | pick available
echo -n "  extract no file: "
curl -s -X POST "$BASE/ai/extract" -H "$AUTH_A" | pick error.message

echo "== chat (one turn: log a meal) =="
json_post "/ai/chat" \
  "{\"today\":\"$TODAY\",\"messages\":[{\"role\":\"user\",\"content\":\"Log a boiled egg for breakfast, about 80 calories\"}]}" \
  "$AUTH_B" > "$WORK/chat.json" || true
echo -n "  reply present: "
node -e '
  const payload = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  console.log(Boolean(payload.reply || payload.error));
' "$WORK/chat.json"
echo -n "  actions:       "
pick actions < "$WORK/chat.json"
echo -n "  Bob entries after chat: "
json_get "/entries?from=$TODAY&to=$TODAY" "$AUTH_B" | pick meta.totalItems

echo
echo "done"
